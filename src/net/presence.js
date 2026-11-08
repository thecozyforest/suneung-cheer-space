/**
 * 함께 접속. Firebase Realtime Database + 익명 로그인.
 * 설정이 없거나 연결이 안 되면 '혼자 보기'로 그대로 동작한다.
 *
 * 무료 한도(하루 내려받기 360MB)를 아끼려고:
 *  - 같은 방에 있는 사람만 구독한다.
 *  - 클릭 이동은 목적지(tx,tz)만 한 번 보내고, 받는 쪽이 걸어가게 한다.
 *  - 키보드·조이스틱 이동은 0.8초에 한 번만 보낸다.
 */
import { firebaseConfig } from '../firebase-config.js';

const ROOM_RE = /^[a-z]{2,12}$/;
const STALE_MS = 120000;

export function createPresence({ nickname, look }) {
  const listeners = { peers: new Set(), status: new Set(), seats: new Set() };
  const counters = new Map(); // key -> {value, cbs:Set}
  const state = { mode: 'connecting', uid: null, room: null, nickname, look, k: 0, last: {}, offset: 0 };
  let fb = null; // {db, ref, set, update, remove, onDisconnect, onChildAdded..., serverTimestamp, increment, runTransaction}
  let roomUnsubs = [], userRef = null, seatRef = null, heartbeat = null;
  const peers = new Map();

  const emitPeers = () => listeners.peers.forEach((cb) => cb(peers));
  const emitStatus = () => listeners.status.forEach((cb) => cb(state.mode));

  async function connect() {
    const params = new URLSearchParams(location.search);
    if (!firebaseConfig || !firebaseConfig.databaseURL || params.has('solo')) { state.mode = 'solo'; emitStatus(); return; }
    try {
      const [{ initializeApp }, auth, db] = await Promise.all([
        import('firebase/app'), import('firebase/auth'), import('firebase/database'),
      ]);
      const app = initializeApp(firebaseConfig);
      const a = auth.getAuth(app);
      // 탭마다 다른 익명 사용자 → 같은 기기에서 창 두 개로도 시험할 수 있다
      await auth.setPersistence(a, auth.browserSessionPersistence);
      // 느린 네트워크: 12초가 지나면 '혼자 보기'로 표시하되, 로그인이 늦게라도 끝나면 그대로 함께 접속으로 이어 간다
      const slow = setTimeout(() => { if (!state.uid) { state.mode = 'solo'; emitStatus(); } }, 12000);
      const cred = await auth.signInAnonymously(a);
      clearTimeout(slow);
      state.uid = cred.user.uid;
      const database = db.getDatabase(app);
      fb = { ...db, database };
      db.onValue(db.ref(database, '.info/serverTimeOffset'), (s) => { state.offset = s.val() || 0; });
      db.onValue(db.ref(database, '.info/connected'), (s) => {
        const was = state.mode;
        state.mode = s.val() ? 'online' : (was === 'online' ? 'offline' : state.mode);
        if (s.val() && state.room && was !== 'online') rejoin();
        emitStatus();
      });
      if (state.room) rejoin();
    } catch (e) {
      console.warn('[presence] 혼자 보기로 전환:', e?.message || e);
      state.mode = 'solo';
      emitStatus();
    }
  }

  function payload(extra = {}) {
    return { n: state.nickname, l: state.look, x: 0, z: 0, tx: 0, tz: 0, r: 0, a: '', k: state.k, h: '', s: '', ...state.last, ...extra, t: fb.serverTimestamp() };
  }

  function clearRoom() {
    roomUnsubs.forEach((u) => u());
    roomUnsubs = [];
    clearInterval(heartbeat);
    peers.clear();
    emitPeers();
  }

  async function rejoin() {
    if (!fb || !state.room) return;
    clearRoom();
    const { database, ref, set, onDisconnect, onChildAdded, onChildChanged, onChildRemoved, update, onValue } = fb;
    const room = state.room;
    userRef = ref(database, `rooms/${room}/u/${state.uid}`);
    try {
      await onDisconnect(userRef).remove();
      await set(userRef, payload());
    } catch (e) { console.warn('[presence] 입장 실패', e?.message); return; }
    const listRef = ref(database, `rooms/${room}/u`);
    const upsert = (snap) => {
      if (snap.key === state.uid) return;
      const v = snap.val();
      if (!v || typeof v.x !== 'number') return;
      if (typeof v.t === 'number' && Date.now() + state.offset - v.t > STALE_MS) { peers.delete(snap.key); emitPeers(); return; }
      peers.set(snap.key, v);
      emitPeers();
    };
    roomUnsubs.push(onChildAdded(listRef, upsert));
    roomUnsubs.push(onChildChanged(listRef, upsert));
    roomUnsubs.push(onChildRemoved(listRef, (snap) => { peers.delete(snap.key); emitPeers(); }));
    roomUnsubs.push(onValue(ref(database, `seats/${room}`), (snap) => {
      const v = snap.val() || {};
      listeners.seats.forEach((cb) => cb(v));
    }));
    heartbeat = setInterval(() => { if (userRef) update(userRef, { t: fb.serverTimestamp() }).catch(() => {}); }, 30000);
  }

  return {
    get mode() { return state.mode; },
    get uid() { return state.uid; },
    get peers() { return peers; },
    connect,
    setNickname(n) { state.nickname = n; if (fb && userRef) fb.update(userRef, { n }).catch(() => {}); },
    async join(room) {
      if (!ROOM_RE.test(room)) throw new Error(`room ${room}`);
      if (state.room === room) return;
      await this.releaseSeat();
      if (fb && userRef) { const old = userRef; userRef = null; fb.remove(old).catch(() => {}); fb.onDisconnect(old).cancel().catch(() => {}); }
      state.room = room;
      // 위치는 남기고(방 전환 직후 보낸 시작 위치), 자리·동작만 비운다
      state.last = { ...state.last, s: '', h: '', a: '' };
      if (fb) rejoin(); else { clearRoom(); }
    },
    /** 위치·목적지 보내기 */
    move({ x, z, tx = x, tz = z, r = 0 }) {
      const q = (v) => Math.round(v * 100) / 100;
      state.last = { ...state.last, x: q(x), z: q(z), tx: q(tx), tz: q(tz), r: q(r) };
      if (fb && userRef) fb.update(userRef, { x: state.last.x, z: state.last.z, tx: state.last.tx, tz: state.last.tz, r: state.last.r, t: fb.serverTimestamp() }).catch(() => {});
    },
    action(name) {
      state.k = (state.k + 1) % 999999;
      state.last = { ...state.last, a: name, k: state.k };
      if (fb && userRef) fb.update(userRef, { a: name, k: state.k }).catch(() => {});
    },
    hold(name) {
      state.last = { ...state.last, h: name || '' };
      if (fb && userRef) fb.update(userRef, { h: name || '' }).catch(() => {});
    },
    /** 빈자리면 차지하고 true */
    async claimSeat(seatId) {
      if (!fb || !state.room) { state.last = { ...state.last, s: seatId }; return true; }
      const { database, ref, runTransaction, onDisconnect, update } = fb;
      const r = ref(database, `seats/${state.room}/${seatId}`);
      try {
        const res = await runTransaction(r, (cur) => (cur && cur !== state.uid ? undefined : state.uid), { applyLocally: false });
        if (!res.committed) return false;
        await this.releaseSeat(seatId);
        seatRef = r;
        onDisconnect(r).remove().catch(() => {});
        state.last = { ...state.last, s: seatId };
        if (userRef) update(userRef, { s: seatId }).catch(() => {});
        return true;
      } catch (e) { return false; }
    },
    async releaseSeat(keep) {
      state.last = { ...state.last, s: '' };
      if (!fb) return;
      if (seatRef && seatRef.key !== keep) {
        const r = seatRef; seatRef = null;
        fb.remove(r).catch(() => {}); fb.onDisconnect(r).cancel().catch(() => {});
      }
      if (userRef && keep == null) fb.update(userRef, { s: '' }).catch(() => {});
    },
    /** 오늘 누적 수 +1 (모두가 함께 보는 숫자) */
    count(key, ymd) {
      if (!/^[a-z]{2,16}$/.test(key)) return;
      const c = counters.get(key);
      if (c) { c.value += 1; c.cbs.forEach((cb) => cb(c.value)); }
      if (fb) fb.set(fb.ref(fb.database, `counts/${ymd}/${key}`), fb.increment(1)).catch(() => {});
    },
    watchCount(key, ymd, cb) {
      let c = counters.get(key);
      if (!c) { c = { value: 0, cbs: new Set(), unsub: null }; counters.set(key, c); }
      c.cbs.add(cb);
      cb(c.value);
      if (fb && !c.unsub) c.unsub = fb.onValue(fb.ref(fb.database, `counts/${ymd}/${key}`), (s) => { c.value = s.val() || 0; c.cbs.forEach((f) => f(c.value)); });
      return () => { c.cbs.delete(cb); if (!c.cbs.size) { c.unsub?.(); counters.delete(key); } };
    },
    onPeers(cb) { listeners.peers.add(cb); return () => listeners.peers.delete(cb); },
    onStatus(cb) { listeners.status.add(cb); cb(state.mode); return () => listeners.status.delete(cb); },
    onSeats(cb) { listeners.seats.add(cb); return () => listeners.seats.delete(cb); },
  };
}
