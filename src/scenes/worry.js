import * as THREE from 'three';
import { spot, sign, mat, add, rect } from './kit.js';

/**
 * 마음 털기 종이공.
 * 걱정 하나를 고르면 종이에 적힌 걱정을 손으로 구겨 공으로 만들고, 휴지통에 던져 넣는다.
 * 들어가면 그 걱정에 맞는 위로 한마디. 오늘 털어 낸 마음 수는 모두가 함께 보고(counts/오늘/worry),
 * 통 안에 종이공이 쌓인다. 같은 방 친구가 던지면 내 화면에서도 공이 날아간다(presence 동작 wr숫자).
 * 글 입력창은 만들지 않는다(고르기만).
 */
export const WORRIES = [
  ['실수할까 봐 무서워', '실수해도 괜찮아. 한 문제가 너를 정하지 않아.'],
  ['점수가 안 나올까 봐', '점수는 숫자일 뿐, 네가 버틴 시간은 진짜야.'],
  ['자꾸 남들이랑 비교돼', '비교는 여기 버리고, 어제의 나랑만 겨루자.'],
  ['잠이 잘 안 와', '눈만 감고 있어도 쉬는 거래. 오늘은 그걸로 충분해.'],
  ['기대가 너무 부담돼', '기대는 내려놓고, 너답게만 하면 돼.'],
  ['시간이 모자란 것 같아', '남은 시간도 충분히 길어. 하나씩 하면 돼.'],
  ['다 포기하고 싶어', '여기까지 온 것만으로 대단해. 잠깐 쉬어도 돼.'],
  ['머리에 아무것도 안 들어와', '그런 날도 있어. 오늘은 한 줄만 읽어도 성공.'],
  ['몸이 너무 지쳤어', '몸이 먼저야. 물 한 잔, 기지개 한 번.'],
  ['그냥 다 불안해', '불안한 건 그만큼 진심이라서야. 털어 버리고 가자.'],
];

let paperTex = null;
function paperTexture() {
  if (paperTex) return paperTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 64, 80);
  g.strokeStyle = 'rgba(80,110,180,.45)'; g.lineWidth = 1;
  for (let y = 14; y < 80; y += 9) { g.beginPath(); g.moveTo(5, y); g.lineTo(59, y); g.stroke(); }
  g.strokeStyle = 'rgba(40,40,60,.6)'; g.lineWidth = 2;
  for (let y = 14; y < 50; y += 9) { g.beginPath(); g.moveTo(8, y - 3); g.lineTo(8 + 20 + Math.random() * 28, y - 3); g.stroke(); }
  paperTex = new THREE.CanvasTexture(c); paperTex.colorSpace = THREE.SRGBColorSpace;
  return paperTex;
}
const ballGeo = new THREE.IcosahedronGeometry(0.075, 0);

export function worryBin(S, api, { x, z, ry = 0, key = 'worry', dist = 2.2 }) {
  const G = S.group;
  const bin = new THREE.Group(); bin.position.set(x, 0, z); bin.rotation.y = ry; G.add(bin);
  const binM = new THREE.MeshStandardMaterial({ color: 0xf4b6c2, roughness: 0.8, side: THREE.DoubleSide });
  add(bin, new THREE.CylinderGeometry(0.34, 0.27, 0.62, 20, 1, true), binM, 0, 0.31, 0);
  add(bin, new THREE.CircleGeometry(0.27, 20), mat(0xe9a0b4), 0, 0.02, 0, { rx: -Math.PI / 2, cast: false });
  const rim = add(bin, new THREE.TorusGeometry(0.34, 0.025, 8, 28), mat(0xffffff, { roughness: 0.5 }), 0, 0.62, 0, { rx: Math.PI / 2 });
  // 바닥 과녁(던지는 자리 표시)
  const tx = Math.sin(ry) * dist, tz = Math.cos(ry) * dist;
  add(G, new THREE.RingGeometry(0.3, 0.38, 28), mat(0xf4b6c2, { roughness: 1 }), x + tx, 0.012, z + tz, { rx: -Math.PI / 2, cast: false });
  sign(bin, '마음 털기 통', { w: 0.7, h: 0.2, y: 0.36, z: 0.345, bg: '#c2577a', fg: '#ffffff', size: 90, tw: 520 });
  S.colliders.push(rect(x, z, 0.7, 0.7));

  const paperM = new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.9, side: THREE.DoubleSide });
  const ballM = mat(0xfffaf0, { roughness: 0.95, flatShading: true });
  // 통 안에 쌓이는 종이공 (오늘 수만큼, 최대 22개)
  const pile = [];
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.18, layer = Math.floor(i / 6);
    const b = add(bin, ballGeo, ballM, Math.cos(a) * r, 0.1 + layer * 0.12 + rnd() * 0.04, Math.sin(a) * r, { rx: rnd() * 6, ry: rnd() * 6, cast: false });
    b.userData.keepGeo = true; b.visible = false; pile.push(b);
  }
  const top = () => bin.localToWorld(new THREE.Vector3(0, 0.75, 0));

  const ax = x + tx, az = z + tz;
  const sp = spot(S, { id: `worry-${key}`, label: '마음 털기', pos: [x, 1.6, z], at: [ax, az], face: ry + Math.PI, onUse: () => openPanel() });
  let server = 0, mine = 0;
  function refresh() {
    const n = Math.max(server, mine);
    pile.forEach((b, i) => { b.visible = i < n; });
    sp.label = n ? `마음 털기 · 오늘 ${n}개` : '마음 털기';
  }
  api.watchCount(key, (v) => { server = v; refresh(); });

  const alive = () => !!S.group.parent;
  const flying = [];
  function fly(from, bounce, onIn) {
    const m = add(G, ballGeo, ballM, from.x, from.y, from.z, { cast: false });
    m.userData.keepGeo = true;
    const end = top();
    const legs = [];
    if (bounce) {
      const rimP = bin.localToWorld(new THREE.Vector3(0.3, 0.66, 0.05));
      legs.push({ from: from.clone(), to: rimP, h: 0.9, dur: 0.6 }, { from: rimP, to: end.clone().setY(end.y - 0.2), h: 0.35, dur: 0.35, tap: true });
    } else legs.push({ from: from.clone(), to: end.clone().setY(end.y - 0.2), h: 0.9, dur: 0.65 });
    flying.push({ m, legs, k: 0, t: 0, onIn });
  }

  let busy = false;
  function openPanel() {
    if (busy) return;
    api.hud.openPanel({
      title: '마음 털기',
      sub: '지금 마음에 걸리는 걸 하나 골라요. 종이에 적어 꾹 구긴 다음 통에 던져 버려요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${WORRIES.map(([w], i) => `<button class="choice" data-i="${i}">📄 ${w}</button>`).join('')}</div><p class="src">고른 걱정은 저장하지 않아요. 털어 낸 개수만 함께 세요.</p>`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { api.hud.closePanel(); toss(+b.dataset.i); }));
      },
    });
  }

  function toss(wi) {
    busy = true;
    const [worry, comfort] = WORRIES[wi];
    const av = api.player.avatar;
    api.player.facing = ry + Math.PI; api.player.sync();
    // 1) 종이를 들고 읽는다
    const hand = new THREE.Group();
    const paper = add(hand, new THREE.PlaneGeometry(0.26, 0.32), paperM, -0.08, 0.12, 0.05, { cast: false });
    const ball = add(hand, ballGeo, ballM, 0, 0, 0.02, { cast: false });
    ball.userData.keepGeo = true; ball.scale.setScalar(0.001);
    hand.userData.upright = true;
    av.attach(hand, 1); hand.position.set(-0.05, -0.3, 0.12);
    const id = `deco:wr${Date.now()}`;
    api.labels.set(id, { text: worry, cls: 'bubble', getPos: (v) => v.copy(api.player.pos).add(new THREE.Vector3(0, 2.25, 0)) });
    api.audio.play('rustle');
    // 1-1) 종이를 두 손으로 들고 읽는다(가슴 앞)
    api.act('reach', 0.7);
    // 2) 꾹 구긴다
    setTimeout(() => { api.act('clap', 1.0); }, 800);
    [800, 1050, 1300].forEach((ms, i) => setTimeout(() => {
      api.audio.play('rustle');
      const k = (i + 1) / 3;
      paper.scale.set(1 - k * 0.95, 1 - k * 0.95, 1); paper.rotation.z = k * 2;
      ball.scale.setScalar(Math.max(0.001, k));
    }, ms));
    // 3) 던진다
    setTimeout(() => { api.labels.remove(id); api.act('throw'); }, 1750);
    setTimeout(() => {
      const from = ball.getWorldPosition(new THREE.Vector3());
      av.detach(hand); paper.geometry.dispose();
      if (!alive()) { busy = false; return; }
      api.audio.play('rustle');
      const bounce = Math.random() < 0.25;
      fly(from, bounce, () => {
        mine = Math.max(server, mine) + 1; refresh();
        api.count(key);
        api.audio.play('pop'); api.audio.play('soft');
        api.fx.burst({ origin: top(), count: 18, shape: 'heart', size: 0.1, colors: ['#ff8fa3', '#ffb3c6', '#ffffff'], speed: [0.4, 1.2], up: 1.6, gravity: -0.4, life: [1.2, 2.0], spin: 2 });
        rimHop = 1;
        api.say(comfort, { kicker: bounce ? '통! 튕기고 쏙 · 마음 털기' : '쏙! 마음 털기', ms: 5200 });
        api.act('nod');
        busy = false;
      });
      api.presence.action(`wr${wi}`);
    }, 2050);
    setTimeout(() => { busy = false; }, 6000);
  }

  // 친구가 던진 종이공도 날아온다
  S.peerHandlers.push((pos, name) => {
    if (!name.startsWith('wr') || !alive()) return;
    fly(pos.clone().add(new THREE.Vector3(0, 1.3, 0)), false, () => { api.audio.play('pop'); rimHop = 1; });
  });

  let rimHop = 0;
  S.tickers.push((dt) => {
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      const L = f.legs[f.k];
      f.t += dt / L.dur;
      const k = Math.min(1, f.t);
      f.m.position.lerpVectors(L.from, L.to, k); f.m.position.y += Math.sin(k * Math.PI) * L.h;
      f.m.rotation.x += dt * 9; f.m.rotation.z += dt * 6;
      if (f.t >= 1) {
        if (L.tap) { /* 들어감 */ }
        if (f.k < f.legs.length - 1) { f.k++; f.t = 0; if (f.legs[f.k].tap) { api.audio.play('stick'); rimHop = 0.6; } continue; }
        G.remove(f.m); flying.splice(i, 1); f.onIn?.();
      }
    }
    if (rimHop > 0) { rimHop = Math.max(0, rimHop - dt * 3); bin.scale.set(1 + rimHop * 0.06, 1 - rimHop * 0.08, 1 + rimHop * 0.06); rim.rotation.y = Math.sin(rimHop * 20) * 0.05; }
  });

  return { start() { api.walkTo(ax, az, () => { api.player.facing = ry + Math.PI; api.player.sync(); openPanel(); }); } };
}
