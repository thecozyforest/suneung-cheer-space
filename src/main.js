import './style.css';
import * as THREE from 'three';
import { createCore } from './engine/core.js';
import { CameraRig } from './engine/camera-rig.js';
import { createInput, createJoystick } from './engine/input.js';
import { createAvatar, lookFromSeed } from './engine/avatar.js';
import { Player } from './engine/player.js';
import { createSky, skyAt } from './engine/sky.js';
import { createFx } from './engine/fx.js';
import { disposeTree } from './engine/materials.js';
import * as audio from './engine/audio.js';
import { createLabels } from './ui/labels.js';
import { createHud, createEntry } from './ui/hud.js';
import { watchUiScale } from './ui/scale.js';
import { SCHOOL } from './data/school.js';
import { seoulParts, dDayLabel, daysUntil, setTimeOverride, DOW_KO } from './data/time.js';
import { randomNickname, isValidNickname } from './data/nicknames.js';
import { todayPool, phraseOfDay, nextPhrase, ROOM_POOLS } from './data/phrases.js';
import { SPACES, spaceById } from './scenes/registry.js';
import { SCENES } from './scenes/index.js';
import { createPresence } from './net/presence.js';

const params = new URLSearchParams(location.search);
if (params.get('time')) setTimeOverride(params.get('time'));

document.title = SCHOOL.appName;
document.querySelector('meta[name="description"]')?.setAttribute('content', `${SCHOOL.name}의 수능을 응원하는 3D 공간. 로그인 없이 별명으로 들어와 기원하고, 부수고, 쉬어 가요.`);

// ── 저장된 별명·모습 ──
const store = {
  get(k, d) { try { const v = localStorage.getItem(`cheer.${k}`); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`cheer.${k}`, v); } catch { /* 저장 안 돼도 동작 */ } },
};
let nickname = store.get('nick', '');
if (!isValidNickname(nickname) || params.has('fresh')) { nickname = randomNickname(); store.set('nick', nickname); }
let lookSeed = store.get('look', '');
if (!lookSeed || params.has('fresh')) { lookSeed = Math.random().toString(36).slice(2, 10); store.set('look', lookSeed); }

// ── 엔진 ──
const canvas = document.getElementById('scene');
const core = createCore(canvas);
const { renderer, scene, camera } = core;
const rig = new CameraRig(camera);
const fx = createFx(scene);
const labels = createLabels(document.getElementById('labels'));
const uiRoot = document.getElementById('ui');
const fade = document.getElementById('fade');
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
watchUiScale(); // 데스크톱 큰 화면에서 UI 키우기 (--ui-k)

const sky = createSky();
scene.add(sky.group);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7d6a, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(core.lowEnd ? 1024 : 2048, core.lowEnd ? 1024 : 2048);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const SUN_OFFSET = new THREE.Vector3(-28, 52, 34);

// ── 내 캐릭터 ──
const me = createAvatar(lookFromSeed(lookSeed));
scene.add(me.root);
const player = new Player(me);

// ── 함께 접속 ──
const presence = createPresence({ nickname, look: lookSeed });
const peerViews = new Map();
let seatsTaken = {};

// ── 화면 ──
const hud = createHud(uiRoot, {
  onGo: (id) => go(id),
  onTime: (t) => {
    if (t.id === 'now') setTimeOverride(null);
    else setTimeOverride(`${t.date || seoulParts(Date.now()).iso}T${t.hm}`);
    lastTimeTick = 0;
    hud.toast(t.id === 'now' ? '지금 서울 시간으로 돌아왔어요.' : `${t.label}(${t.sub})로 바꿨어요. 내 화면에서만 바뀌어요.`, { kicker: '시간대', ms: 2600 });
  },
  onVolume: (v) => { audio.setVolume(v); audio.setMuted(v === 0); store.set('vol', String(v)); },
});
const savedVol = +store.get('vol', '0.7');
audio.setVolume(savedVol);

// ── 지금 장면 ──
let current = null; // {space, sceneId, built}
let buildingOffs = null;
let entered = false, switching = false;
let lastSay = '';
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function today() { return seoulParts(); }
function examDays() { return daysUntil(SCHOOL.examDate); }

const api = {
  THREE, fx, audio, hud, labels, player, rig, scene, camera, presence,
  get spaceId() { return current?.space.id; },
  time: today,
  examDays,
  /** 문구 띄우기: 문자열 또는 방 이름(ROOM_POOLS 키) */
  say(textOrPool, opts = {}) {
    let text = textOrPool;
    if (ROOM_POOLS[textOrPool]) text = nextPhrase(ROOM_POOLS[textOrPool], lastSay);
    else if (textOrPool === 'day') { const p = today(); text = nextPhrase(todayPool(p.dow, examDays()).lines, lastSay); }
    lastSay = text;
    hud.toast(text, opts);
    return text;
  },
  dayLine(salt = '') { const p = today(); const pool = todayPool(p.dow, examDays()); return { name: pool.name, text: phraseOfDay(pool.lines, p.ymd, salt) }; },
  act(name, dur) { if (player.seat && !['wave', 'clap', 'nod', 'cheer'].includes(name)) { /* 앉아서도 되는 동작만 */ } me.play(name, dur); presence.action(name); },
  hold(name) { me.setHold(name); presence.hold(name); },
  count(key) { presence.count(key, today().ymd); },
  watchCount(key, cb) { const off = presence.watchCount(key, today().ymd, cb); (buildingOffs || current?.offs)?.push(off); return off; },
  go: (id) => go(id),
  walkTo(x, z, cb) { player.walkTo(x, z, cb); sendMove(true); },
  /** 앉기: 빈자리만 */
  async sit(seat) {
    if (seatsTaken[seat.id] && seatsTaken[seat.id] !== presence.uid) { hud.toast('누군가 앉아 있는 자리예요. 다른 자리를 골라 볼까요?', { ms: 2400 }); return false; }
    const ok = await presence.claimSeat(seat.id);
    if (!ok) { hud.toast('방금 누가 앉았어요. 다른 자리를 골라 볼까요?', { ms: 2400 }); return false; }
    // 누울 자리는 발쪽 끝에서 올라간다(몸이 길다)
    const reach = seat.lie ? 1.3 : 0.7;
    const ax = seat.x + Math.sin(seat.ry || 0) * reach, az = seat.z + Math.cos(seat.ry || 0) * reach;
    player.walkTo(ax, az, () => {
      player.sitAt(seat);
      presence.move({ x: seat.x, z: seat.z, r: seat.ry || 0 });
      current?.built.onSit?.(seat);
      refreshDock();
    });
    sendMove(true);
    return true;
  },
  standUp() {
    if (!player.seat) return;
    const s = player.standUp();
    presence.releaseSeat();
    me.setHold(null); presence.hold('');
    current?.built.onStand?.(s);
    sendMove(true);
    refreshDock();
  },
  freeSeat(near = player.pos) {
    const seats = current?.built.seats || [];
    let best = null, bd = Infinity;
    for (const s of seats) {
      if (seatsTaken[s.id] && seatsTaken[s.id] !== presence.uid) continue;
      if ([...peerViews.values()].some((p) => p.data.s === s.id)) continue;
      const d = Math.hypot(s.x - near.x, s.z - near.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  },
  refreshDock: () => refreshDock(),
  get night() { return skyState.night; },
};

// ── 하늘·빛 ──
let skyState = skyAt(12);
function applyLighting(force = false) {
  const b = current?.built;
  if (!b) return;
  const p = today();
  if (b.outdoor) {
    const hour = b.fixedHour ?? p.hour;
    skyState = skyAt(hour);
    sky.group.visible = true;
    sky.apply(skyState, hour);
    hemi.color.copy(skyState.top).lerp(new THREE.Color('#ffffff'), 0.55);
    hemi.groundColor.copy(skyState.ground);
    hemi.intensity = skyState.hemi * 1.1;
    sun.color.copy(skyState.sun);
    sun.intensity = skyState.sunI;
    if (!scene.fog) scene.fog = new THREE.Fog(0xffffff, 60, 260);
    scene.fog.color.copy(skyState.bottom);
    scene.fog.near = b.fog?.[0] ?? 70; scene.fog.far = b.fog?.[1] ?? 280;
    scene.background = null;
    renderer.toneMappingExposure = 1.0 + skyState.night * 0.08;
  } else {
    const e = b.env || {};
    skyState = { night: e.night ?? 0 };
    sky.group.visible = !!e.sky;
    if (e.sky) sky.apply(skyAt(e.skyHour ?? 23), e.skyHour ?? 23);
    scene.background = e.sky ? null : new THREE.Color(e.bg || '#efe6d6');
    hemi.color.set(e.hemiSky || '#fff6ea'); hemi.groundColor.set(e.hemiGround || '#a8977f'); hemi.intensity = e.hemi ?? 1.2;
    sun.color.set(e.sunColor || '#fff1dc'); sun.intensity = e.sun ?? 1.6;
    if (e.fog) { scene.fog = new THREE.Fog(e.fog[2] || e.bg || '#efe6d6', e.fog[0], e.fog[1]); } else scene.fog = null;
    renderer.toneMappingExposure = e.exposure ?? 1.0;
  }
  b.onTime?.(p, skyState, force);
}

// ── 공간 이동 ──
async function go(spaceId, { instant = false } = {}) {
  const space = spaceById(spaceId) || SPACES[0];
  if (switching) return;
  if (current && current.space.id === space.id) { placeAtSpawn(space); return; }
  switching = true;
  if (!instant) { fade.classList.add('on'); await wait(330); }
  hud.closePanel();
  const sameScene = current && current.sceneId === space.scene;
  if (!sameScene) {
    if (current) {
      current.offs.forEach((f) => f());
      current.built.dispose?.();
      me.clearProps(); // 손에 든 컵·초 등은 방에 두고 나간다
      scene.remove(current.built.group);
      disposeTree(current.built.group);
      fx.clear();
      labels.clear('spot:');
      labels.clear('deco:');
    }
    const offs = [];
    buildingOffs = offs;
    let built;
    try { built = SCENES[space.scene](api); } finally { buildingOffs = null; }
    // Firebase 경로에 못 쓰는 글자(. # $ [ ])가 자리 이름에 들어가지 않게
    for (const st of built.seats || []) st.id = String(st.id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 16);
    scene.add(built.group);
    current = { space, sceneId: space.scene, built, offs };
    seatsTaken = {};
    presence.join(space.scene).catch(() => {});
    audio.setAmbient(built.ambient || null);
  } else {
    current.space = space;
  }
  applyLighting(true);
  placeAtSpawn(space);
  hud.setPlace(space);
  refreshDock();
  hud.setHint(current.built.hint || (isTouch ? '바닥을 눌러 걷기 · 끌어서 둘러보기' : '바닥을 눌러 걷기 · WASD · 끌어서 둘러보기 · 휠로 확대'));
  current.built.onEnter?.(space);
  try { history.replaceState(null, '', `?space=${space.id}${params.get('time') ? `&time=${params.get('time')}` : ''}${params.has('solo') ? '&solo' : ''}`); } catch { /* 무시 */ } // solo(혼자 보기 시험)도 주소에 남긴다
  if (!instant) { await wait(60); fade.classList.remove('on'); }
  switching = false;
}
function placeAtSpawn(space) {
  const b = current.built;
  const sp = b.spawns?.[space.spawn] || b.spawns?.main || { x: 0, z: 0, ry: 0 };
  player.place(sp.x, sp.z, sp.ry || 0, b.heightAt ? b.heightAt(sp.x, sp.z) : 0);
  presence.releaseSeat();
  const cam = { ...(b.camera || {}), ...(sp.camera || {}) };
  rig.configure(cam);
  rig.snap(player.pos);
  sendMove(true);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function refreshDock() {
  const b = current?.built;
  if (!b) return;
  const acts = [...(b.actions?.() || b.actionList || [])];
  const common = [];
  if (b.seats?.length) {
    common.push(player.seat
      ? { id: 'stand', label: '일어나기', icon: 'stand', onClick: () => api.standUp() }
      : { id: 'sit', label: '빈자리 앉기', icon: 'sit', onClick: () => { const s = api.freeSeat(); if (s) api.sit(s); else hud.toast('지금은 빈자리가 없어요.', { ms: 2000 }); } });
  }
  common.push({ id: 'wave', label: '인사', icon: 'wave', onClick: () => { api.act('wave'); } });
  hud.setActions(acts.length ? [...acts, { sep: true }, ...common] : common);
}

// ── 입력 ──
const input = createInput(canvas, {
  onTap(x, y) {
    if (!current || switching) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const b = current.built;
    if (b.clickables?.length) {
      const hit = ray.intersectObjects(b.clickables, true)[0];
      if (hit) {
        let o = hit.object;
        while (o && !o.userData.onClick) o = o.parent;
        if (o?.userData.onClick) { o.userData.onClick(hit); return; }
      }
    }
    const g = ray.intersectObjects(b.ground || [], true)[0];
    if (g) {
      if (player.seat) api.standUp();
      player.walkTo(g.point.x, g.point.z);
      sendMove(true);
      marker(g.point);
    }
  },
  onDrag(dx, dy) { rig.rotate(dx, dy); },
  onZoom(f) { rig.zoom(f); },
});
if (isTouch) createJoystick(uiRoot, input.joy);

// 클릭한 곳 표시
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 28), ringMat);
ringMesh.rotation.x = -Math.PI / 2; ringMesh.visible = false;
scene.add(ringMesh);
let ringT = 0;
function marker(p) { ringMesh.position.set(p.x, p.y + 0.03, p.z); ringMesh.visible = true; ringT = 0; }

// ── 보내기 (아껴서) ──
let lastSend = 0, wasMoving = false;
function sendMove(force = false) {
  const now = performance.now();
  const t = player.target;
  if (!force && now - lastSend < 800) return;
  lastSend = now;
  presence.move({ x: player.pos.x, z: player.pos.z, tx: t ? t.x : player.pos.x, tz: t ? t.y : player.pos.z, r: player.facing });
}

// ── 다른 사람 ──
presence.onSeats((v) => { seatsTaken = v; });
presence.onPeers((peers) => {
  for (const [uid, view] of peerViews) {
    if (!peers.has(uid)) { view.avatar.dispose(); labels.remove(`peer:${uid}`); peerViews.delete(uid); }
  }
  for (const [uid, data] of peers) {
    let view = peerViews.get(uid);
    if (!view) {
      const avatar = createAvatar(lookFromSeed(data.l || uid));
      scene.add(avatar.root);
      view = { avatar, x: data.x, z: data.z, r: data.r || 0, k: data.k, h: '', data, moving: 0 };
      avatar.root.position.set(data.x, 0, data.z);
      peerViews.set(uid, view);
    }
    if (view.k !== data.k && data.a) {
      if (AVATAR_ACTIONS.has(data.a)) view.avatar.play(data.a);
      current?.built.onPeerAction?.(view.avatar.root.position, data.a, uid);
      for (const h of current?.built.peerHandlers || []) h(view.avatar.root.position, data.a, uid);
    }
    view.k = data.k;
    if ((data.h || '') !== view.h) { view.h = data.h || ''; view.avatar.setHold(view.h || null); }
    // 멀리 떨어진 위치는 바로 옮긴다
    if (Math.hypot(data.x - view.x, data.z - view.z) > 6) { view.x = data.x; view.z = data.z; }
    view.data = data;
    const nick = isValidNickname(data.n) ? data.n : '익명 친구';
    labels.set(`peer:${uid}`, { text: nick, cls: 'nick', getPos: (v) => v.copy(view.avatar.root.position).add(NICK_OFFSET) });
  }
  updatePeopleCount();
});
presence.onStatus(() => updatePeopleCount());
function updatePeopleCount() {
  const online = presence.mode === 'online';
  hud.setPeople(peerViews.size + 1, online);
}
const NICK_OFFSET = new THREE.Vector3(0, 1.85, 0);
const AVATAR_ACTIONS = new Set(['bow', 'wave', 'cheer', 'clap', 'stretch', 'nod', 'pat', 'jump', 'pull', 'throw', 'stab', 'shout', 'reach', 'sip']);

function updatePeers(dt) {
  const b = current?.built;
  for (const view of peerViews.values()) {
    const d = view.data;
    const seat = d.s && b?.seats?.find((s) => s.id === d.s);
    if (seat) {
      view.x = seat.x; view.z = seat.z; view.r = seat.ry || 0;
      const want = seat.lie ? 'lie' : 'sit';
      if (view.avatar.pose !== want) { if (seat.lie) view.avatar.lie(seat.h ?? 0.3); else view.avatar.sit(seat.h ?? 0.45); }
      view.avatar.root.position.set(seat.x, seat.y || 0, seat.z);
      view.avatar.root.rotation.y = view.r;
      view.avatar.update(dt, 0);
      continue;
    }
    if (view.avatar.pose === 'sit' || view.avatar.pose === 'lie') { view.avatar.stand(); if (view.h) view.avatar.setHold(view.h); }
    const dx = d.tx - view.x, dz = d.tz - view.z;
    const dist = Math.hypot(dx, dz);
    let moving = 0;
    if (dist > 0.12) {
      const step = Math.min(dist, 4.2 * dt);
      view.x += dx / dist * step; view.z += dz / dist * step;
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - view.r), Math.cos(want - view.r));
      view.r += diff * (1 - Math.exp(-dt * 10));
      moving = 1;
    } else {
      let diff = Math.atan2(Math.sin((d.r || 0) - view.r), Math.cos((d.r || 0) - view.r));
      view.r += diff * (1 - Math.exp(-dt * 6));
    }
    const y = b?.heightAt ? b.heightAt(view.x, view.z) : 0;
    view.avatar.root.position.set(view.x, y, view.z);
    view.avatar.root.rotation.y = view.r;
    view.avatar.update(dt, moving);
  }
}

// ── 공간 안 표시(문·활동) ──
const spotPos = new THREE.Vector3();
function updateSpots() {
  const b = current?.built;
  if (!b?.spots) return;
  for (const s of b.spots) {
    const d = Math.hypot(s.at.x - player.pos.x, s.at.z - player.pos.z);
    const show = d < (s.show ?? 40);
    const id = `spot:${s.id}`;
    if (!show) { if (labels.has(id)) labels.remove(id); continue; }
    labels.set(id, {
      html: `<i></i>${hud.esc(s.label)}`,
      cls: `spot ${s.kind || ''} ${d > 12 ? 'far' : ''}`,
      getPos: (v) => v.set(s.pos.x, s.pos.y, s.pos.z),
      onClick: () => useSpot(s),
    });
  }
}
function useSpot(s) {
  if (s.instant) { s.onUse(); return; }
  if (player.seat) api.standUp();
  const d = Math.hypot(s.at.x - player.pos.x, s.at.z - player.pos.z);
  if (d < (s.r ?? 1.2)) { faceTo(s); s.onUse(); return; }
  player.walkTo(s.at.x, s.at.z, () => { faceTo(s); s.onUse(); });
  sendMove(true);
}
function faceTo(s) {
  if (s.face == null && !s.pos) return;
  player.facing = s.face ?? Math.atan2(s.pos.x - player.pos.x, s.pos.z - player.pos.z);
  player.sync();
  presence.move({ x: player.pos.x, z: player.pos.z, r: player.facing });
}

// ── 시간 ──
let lastTimeTick = 0;
function tickTime(now) {
  if (now - lastTimeTick < 1000) return;
  lastTimeTick = now;
  const d = dDayLabel(SCHOOL.examDate);
  const p = today();
  hud.setDday(d.text, d.phase === 'after' ? `${SCHOOL.short}의 모든 학년 응원` : `${SCHOOL.examLabel} · ${p.mo}/${p.d}(${DOW_KO[p.dow]}) ${p.hm}`);
  applyLighting();
}

// ── 그리기 ──
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  const now = performance.now();
  core.measure(dt * 1000);
  tickTime(now);
  if (current) {
    const b = current.built;
    const world = { colliders: b.colliders || [], bounds: b.bounds, heightAt: b.heightAt };
    const axis = entered && !hud.panelOpen ? input.axis() : { x: 0, y: 0 };
    const manual = Math.hypot(axis.x, axis.y) > 0.05;
    const moving = player.update(dt, axis, rig.basis(), world);
    if (manual) sendMove(false);
    if (wasMoving && moving < 0.05 && !player.target) sendMove(true);
    wasMoving = moving > 0.05;
    if (!entered) { rig.goalYaw += dt * 0.05; }
    rig.update(dt, player.pos);
    b.update?.(dt, elapsed);
    for (const f of b.tickers || []) f(dt, elapsed);
    updatePeers(dt);
    updateSpots();
    // 그림자 상자가 캐릭터를 따라오게
    sun.position.copy(player.pos).add(SUN_OFFSET);
    sun.target.position.copy(player.pos);
    if (ringMesh.visible) { ringT += dt; ringMat.opacity = Math.max(0, 0.9 - ringT * 1.2); ringMesh.scale.setScalar(1 + ringT * 0.8); if (ringT > 0.8) ringMesh.visible = false; }
  }
  fx.update(dt);
  labels.update(camera, window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

// ── 시작 ──
labels.set('me', { text: nickname, cls: 'nick me', getPos: (v) => v.copy(me.root.position).add(NICK_OFFSET) });
const startSpace = spaceById(params.get('space')) ? params.get('space') : 'gate';
go(startSpace, { instant: true }).then(() => {
  frame();
  const d = dDayLabel(SCHOOL.examDate);
  createEntry(uiRoot, {
    appName: SCHOOL.appName, school: SCHOOL.name, dday: d.text, nickname,
    onReroll: () => { nickname = randomNickname(); store.set('nick', nickname); labels.set('me', { text: nickname, cls: 'nick me', getPos: (v) => v.copy(me.root.position).add(NICK_OFFSET) }); presence.setNickname(nickname); return nickname; },
    onEnter: () => {
      entered = true;
      audio.initAudio();
      audio.play('soft');
      presence.connect();
      const line = api.dayLine(current.space.id);
      setTimeout(() => hud.toast(line.text, { kicker: `${nickname}님, 반가워요 · ${line.name}`, ms: 5200 }), 500);
    },
  });
});
window.__cheer = { api, go, player, presence, camera, rig, core, get current() { return current; } };
