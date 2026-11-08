import * as THREE from 'three';
import { makeScene, room, door, spot, sign, cushion, clickable, floorSeat, mat, rbox, add, block, rect } from './kit.js';
import { canvasTexture, woodTexture } from '../engine/materials.js';
import { WISHES } from '../data/phrases.js';
import { candlePrayer } from './candles.js';

const VIRTUAL = '학교의 실제 시설이 아닌 가상 기원 공간이에요';

function virtualSign(G, x, z, ry = 0) {
  sign(G, ['가상 기원 공간', '학교의 실제 시설이 아니에요'], { w: 2.4, h: 0.7, x, y: 2.1, z, ry, bg: '#f2e2b8', fg: '#6b4e12', size: 64, tw: 760 });
}


const GOLD = { metalness: 0.55, roughness: 0.32 };
/** 부처님 좌상(연꽃 대좌 위). 단순한 형태로 공손하게 표현한다. */
function buddha(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const gold = mat(0xd8b25a, GOLD), goldDeep = mat(0xb8913f, GOLD);
  add(g, new THREE.CylinderGeometry(0.62, 0.7, 0.22, 24), goldDeep, 0, 0.11, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = add(g, new THREE.SphereGeometry(0.2, 12, 8), mat(i % 2 ? 0xf2b8c6 : 0xe9a0b4, { roughness: 0.6 }), Math.cos(a) * 0.62, 0.26, Math.sin(a) * 0.62, { cast: false });
    p.scale.set(0.9, 0.55, 0.45); p.rotation.y = -a; p.rotation.z = 0.5;
  }
  const legs = add(g, new THREE.SphereGeometry(0.5, 20, 12), gold, 0, 0.42, 0.05); legs.scale.set(1.15, 0.38, 0.8);
  const body = add(g, new THREE.SphereGeometry(0.36, 20, 14), gold, 0, 0.86, 0); body.scale.set(1.0, 1.25, 0.8);
  const robe = add(g, new THREE.CylinderGeometry(0.2, 0.42, 0.7, 18, 1, true), goldDeep, 0, 0.78, 0, { cast: false }); robe.scale.set(1, 1, 0.82);
  for (const sx of [-1, 1]) { const arm = add(g, new THREE.CapsuleGeometry(0.08, 0.36, 4, 8), gold, sx * 0.3, 0.72, 0.12); arm.rotation.set(0.9, 0, sx * 0.5); }
  add(g, new THREE.SphereGeometry(0.11, 12, 8), gold, 0, 0.56, 0.3).scale.set(1.4, 0.6, 0.9);
  add(g, new THREE.SphereGeometry(0.24, 22, 16), gold, 0, 1.42, 0.02);
  add(g, new THREE.SphereGeometry(0.11, 14, 10), goldDeep, 0, 1.66, 0);
  for (const sx of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.04, 0.16, 4, 6), gold, sx * 0.24, 1.38, 0.02, { cast: false });
  add(g, new THREE.CircleGeometry(0.62, 40), new THREE.MeshStandardMaterial({ color: 0xf2d68a, emissive: 0xffd27a, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 1.3, -0.28, { cast: false });
  add(g, new THREE.TorusGeometry(0.62, 0.025, 8, 48), goldDeep, 0, 1.3, -0.27, { cast: false });
  parent.add(g);
  return g;
}
/** 구슬 고리 (염주·묵주) */
function beadRing(parent, { x, y, z, n = 36, r = 0.22, bead = 0.022, color = 0x7a4a2a, rx = -Math.PI / 2, pendant = null }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx;
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(bead, 8, 6), mat(color, { roughness: 0.4 }), n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; d.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.9, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  g.add(im);
  if (pendant === 'cross') { add(g, new THREE.BoxGeometry(0.012, 0.08, 0.01), mat(0xc9a050, GOLD), 0, -r * 0.9 - 0.06, 0, { cast: false }); add(g, new THREE.BoxGeometry(0.05, 0.012, 0.01), mat(0xc9a050, GOLD), 0, -r * 0.9 - 0.045, 0, { cast: false }); }
  if (pendant === 'tassel') add(g, new THREE.ConeGeometry(0.03, 0.09, 8), mat(0xc2412d), 0, -r * 0.9 - 0.06, 0, { cast: false, rz: Math.PI });
  parent.add(g);
  return g;
}
/** 성모 마리아상 (흰 옷·파란 망토·모은 손·후광) */
function mary(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  add(g, new THREE.CylinderGeometry(0.38, 0.44, 0.9, 16), mat(0xe9e4da), 0, 0.45, 0);
  add(g, new THREE.CylinderGeometry(0.14, 0.34, 1.3, 20), mat(0xfbfaf6, { roughness: 0.7 }), 0, 1.55, 0);
  add(g, new THREE.CylinderGeometry(0.2, 0.38, 1.25, 20, 1, true, Math.PI * 0.62, Math.PI * 1.76), new THREE.MeshStandardMaterial({ color: 0x5b7fc4, roughness: 0.6, side: THREE.DoubleSide }), 0, 1.6, 0);
  add(g, new THREE.SphereGeometry(0.15, 18, 14), mat(0xf6e6da, { roughness: 0.6 }), 0, 2.36, 0.02);
  const veil = add(g, new THREE.SphereGeometry(0.18, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x5b7fc4, roughness: 0.6, side: THREE.DoubleSide }), 0, 2.38, -0.01); veil.rotation.x = -0.35;
  add(g, new THREE.SphereGeometry(0.06, 10, 8), mat(0xf6e6da), 0, 1.92, 0.2).scale.set(1, 1.5, 0.8);
  add(g, new THREE.TorusGeometry(0.22, 0.016, 8, 32), new THREE.MeshStandardMaterial({ color: 0xf2d68a, emissive: 0xffd27a, emissiveIntensity: 0.9 }), 0, 2.5, -0.12, { cast: false });
  for (let i = 0; i < 4; i++) { const f = add(g, new THREE.SphereGeometry(0.06, 8, 6), mat([0xffffff, 0xf4b6c2, 0xffffff, 0xffd9a0][i]), -0.25 + i * 0.17, 0.95, 0.32, { cast: false }); f.scale.y = 0.6; }
  parent.add(g);
  return g;
}
/** 구슬 세기 창 (염주 108·묵주 59) */
function beadPanel(api, { title, sub, total, every, doneText, key, color }) {
  let n = 0;
  api.hold('pray');
  api.hud.openPanel({
    title, sub, onClose: () => api.hold(null),
    render(body) {
      const cx = 150, cy = 150, R = 128;
      let svg = `<svg viewBox="0 0 300 300"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#c9b48a" stroke-width="1.5"/>`;
      const br = total > 80 ? 3.3 : 6;
      for (let i = 0; i < total; i++) { const a = -Math.PI / 2 + (i / total) * Math.PI * 2; svg += `<circle data-b="${i}" cx="${cx + Math.cos(a) * R}" cy="${cy + Math.sin(a) * R}" r="${(i + 1) % every === 0 ? br * 1.5 : br}" fill="#efe7d6" stroke="#8a7a60" stroke-width="1"/>`; }
      svg += '</svg>';
      body.innerHTML = `<div class="rosary">${svg}<div class="count"><div><b>0</b><span>/ ${total}알</span></div></div></div><div class="row-btns"><button class="btn primary nx">한 알 돌리기</button><button class="btn rs">처음부터</button></div><p class="src">${VIRTUAL}.</p>`;
      const paint = () => { body.querySelectorAll('circle[data-b]').forEach((c) => c.setAttribute('fill', +c.dataset.b < n ? color : '#efe7d6')); body.querySelector('.count b').textContent = n; };
      const next = () => {
        n = Math.min(total, n + 1); paint();
        if (n === total) { api.audio.play('beadDecade'); api.say(doneText, { kicker: `${total}알 끝` }); api.count(key); }
        else if (n % every === 0) { api.audio.play('beadDecade'); api.say(key === 'mala' ? 'temple' : 'cathedral', { kicker: `${n}알` }); }
        else api.audio.play('bead');
      };
      body.querySelector('.nx').addEventListener('click', next);
      body.querySelector('.rosary').addEventListener('click', next);
      body.querySelector('.rs').addEventListener('click', () => { n = 0; paint(); });
    },
  });
}

// ───────────────────────── 법당 ─────────────────────────
export function buildTemple(api) {
  const S = makeScene({ env: { bg: '#2b2420', hemi: 1.0, sun: 1.2, hemiSky: '#ffe9cf', hemiGround: '#6b4a2f', sunColor: '#ffe0b8' }, ambient: 'temple' });
  const G = S.group;
  const wt = woodTexture().clone(); wt.needsUpdate = true;
  const floorMat = new THREE.MeshStandardMaterial({ map: wt, color: 0xe0b98a, roughness: 0.7 });
  room(S, { w: 14, d: 10, h: 4.0, floorMat, wallColor: 0xf1e4cc, lowerColor: 0x9c6a3f, trimColor: 0x5a3a22 });
  door(S, { x: -5.6, z: -5, label: '복도로', to: 'hall', api, color: 0x8a5a36 });
  virtualSign(G, 5, -4.98);
  // 단청 들보
  const dancheong = canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = '#2f7a5f'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = '#c2412d'; g.fillRect(x + 4, 8, 22, h - 16); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x + 44, h / 2, 12, 0, 6.3); g.fill(); g.fillStyle = '#3a6fb5'; g.beginPath(); g.arc(x + 44, h / 2, 6, 0, 6.3); g.fill(); }
    g.fillStyle = '#f7efe0'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
  }, { repeat: [4, 1] });
  add(G, new THREE.BoxGeometry(14.2, 0.45, 0.3), new THREE.MeshStandardMaterial({ map: dancheong }), 0, 3.75, -4.9, { cast: false });
  for (const x of [-6.9, 6.9]) add(G, new THREE.BoxGeometry(0.3, 0.45, 10), new THREE.MeshStandardMaterial({ map: dancheong }), x, 3.75, 0, { cast: false });
  // 창호지 문(뒷벽)
  const hanji = canvasTexture(256, 256, (g, w, h) => { g.fillStyle = '#fbf3e2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a5a36'; g.lineWidth = 6; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, { repeat: [1, 1] });
  for (const x of [-2.4, 0, 2.4]) add(G, new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshStandardMaterial({ map: hanji, emissive: 0xffe7b8, emissiveIntensity: 0.25 }), x, 1.6, -4.98, { cast: false });
  // 낮은 단 · 연등 · 향
  block(G, 5, 0.6, 1.2, 0, 0, 0, -4.1, { material: mat(0x8a5a36) });
  S.colliders.push(rect(0, -4.1, 5.2, 1.4));
  const lanternColors = [0xff8fa3, 0xffd65a, 0x7fc8ff, 0xa6e3a1, 0xff9f6b, 0xc6a8ff];
  const lanterns = [];
  for (let i = 0; i < 18; i++) {
    const x = -6 + (i % 6) * 2.4, z = -3 + Math.floor(i / 6) * 2.6;
    const c = lanternColors[i % lanternColors.length];
    const l = add(G, new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.6 }), x, 3.2, z, { cast: false });
    l.scale.set(1, 1.15, 1);
    add(G, new THREE.CylinderGeometry(0.005, 0.005, 0.6, 3), mat(0x5a3a22), x, 3.65, z, { cast: false });
    lanterns.push(l);
  }
  for (const x of [-1.6, 1.6]) { add(G, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), mat(0xfff6e0, { emissive: 0xffc070, emissiveIntensity: 0.6 }), x, 0.8, -3.75); }
  buddha(G, 0, 0.6, -4.25, 1.05);
  add(G, new THREE.CylinderGeometry(0.16, 0.12, 0.16, 16), mat(0x8a7a50, GOLD), 0, 0.68, -3.62);
  beadRing(G, { x: 1.0, y: 0.615, z: -3.7, n: 54, r: 0.2, bead: 0.018, color: 0x6b3f22, pendant: 'tassel' });
  const glow = new THREE.PointLight(0xffc98a, 10, 12, 1.8); glow.position.set(0, 2.6, -2); G.add(glow);
  // 방석 (절하는 자리)
  for (let i = 0; i < 8; i++) {
    const x = -4.2 + (i % 4) * 2.8, z = -0.8 + Math.floor(i / 4) * 2.4;
    cushion(G, x, z, i % 2 ? 0x8c2f3a : 0xb5762f, { r: 0.42, h: 0.12 });
    S.seats.push({ id: `m${i}`, x, z, y: -0.29, h: 0.45, ry: Math.PI });
  }
  // 범종
  const bell = new THREE.Group(); bell.position.set(5.4, 0, 2.6);
  for (const bx of [-0.9, 0.9]) add(bell, new THREE.BoxGeometry(0.18, 3.2, 0.18), mat(0x6b4226), bx, 1.6, 0);
  add(bell, new THREE.BoxGeometry(2.2, 0.22, 0.24), mat(0x6b4226), 0, 3.2, 0);
  const bellBody = new THREE.Group(); bellBody.position.set(0, 3.05, 0); bell.add(bellBody);
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.35 + 0.28 * t * t + 0.05 * Math.sin(t * 3), -t * 1.5)); }
  add(bellBody, new THREE.LatheGeometry(pts, 24), mat(0x6f6a4a, { metalness: 0.65, roughness: 0.35 }), 0, 0, 0);
  const striker = new THREE.Group(); striker.position.set(-1.5, 2.2, 0); bell.add(striker);
  add(striker, new THREE.CylinderGeometry(0.13, 0.13, 1.2, 10), mat(0x9c6f47), 0, 0, 0, { rz: Math.PI / 2 });
  G.add(bell);
  S.colliders.push(rect(5.4, 2.6, 2.4, 0.6));
  // 풍경 (창가)
  const chime = new THREE.Group(); chime.position.set(-6.2, 3.0, 2.4);
  add(chime, new THREE.ConeGeometry(0.16, 0.26, 10, 1, true), mat(0x6f6a4a, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), 0, 0, 0);
  const fish = add(chime, new THREE.BoxGeometry(0.16, 0.08, 0.02), mat(0xc9a050, { metalness: 0.6 }), 0, -0.45, 0);
  G.add(chime);

  let bows = 0, bellAnim = 0, strikeAnim = 0, chimeAnim = 0;
  function bow() {
    if (api.player.seat) { /* 방석 위에서 절 */ }
    api.act('bow');
    api.audio.play('bow');
    bows++;
    api.count('bow');
    api.hud.updateAction('bow', { badge: `${bows}/108` });
    if (bows === 108) { api.say('108배를 다 했어요. 마음이 한결 가벼워졌기를.', { kicker: '108배 완료' }); api.audio.play('templeBell'); bellAnim = 1; }
    else if (bows % 10 === 0) api.say('temple', { kicker: `${bows}배` });
  }
  function ring() { strikeAnim = 1; setTimeout(() => { api.audio.play('templeBell'); bellAnim = 1; api.count('bell'); }, 260); api.say('temple', { kicker: '범종이 울려요' }); }
  function windChime() { chimeAnim = 1; api.audio.play('chime'); }
  spot(S, { id: 'bell', label: '범종 치기', pos: [5.4, 4.0, 2.6], at: [3.6, 3.2], onUse: () => { api.act('pull'); ring(); } });
  spot(S, { id: 'chime', label: '풍경 울리기', pos: [-6.2, 3.6, 2.4], at: [-5.4, 3.2], onUse: windChime });
  // 초 켜고 기도 (불단 오른쪽 촛대) — 오늘 켜진 초는 모두가 함께 본다
  const tc = candlePrayer(S, api, { key: 'tcandle', x: 4.4, z: -3.9, ry: 0, pool: 'temple', label: '초 공양 · 기도', note: `${VIRTUAL}.` });
  spot(S, { id: 'buddha', label: '부처님께 합장', pos: [0, 2.7, -4.25], at: [0, -2.4], face: Math.PI, onUse: () => { api.hold('pray'); api.say('temple', { kicker: '합장' }); api.audio.play('chime'); setTimeout(() => api.hold(null), 4000); } });
  const mala = () => beadPanel(api, { title: '염주 108알', sub: '한 알씩 넘기며 마음을 고요히. 열여덟 알마다 맑은 소리가 나요.', total: 108, every: 18, doneText: '108알을 다 돌렸어요. 마음이 한결 가벼워졌기를.', key: 'mala', color: '#8a5a36' });
  S.actions = () => [
    { id: 'bow', label: '절하기', icon: 'lotus', primary: true, badge: `${bows}/108`, onClick: bow },
    { id: 'mala', label: '염주 돌리기', icon: 'sparkle', onClick: mala },
    { id: 'tcandle', label: '초 켜고 기도', icon: 'candle', onClick: () => tc.start() },
    { id: 'ring', label: '범종', icon: 'bell', onClick: ring },
    { id: 'chime', label: '풍경', icon: 'wind', onClick: windChime },
  ];
  let total = 0;
  api.watchCount('bow', (v) => { total = v; });
  S.update = (dt, t) => {
    lanterns.forEach((l, i) => { l.position.y = 3.2 + Math.sin(t * 0.9 + i) * 0.04; });
    if (bellAnim > 0) { bellAnim = Math.max(0, bellAnim - dt * 0.25); bellBody.rotation.z = Math.sin(t * 6) * 0.06 * bellAnim; }
    if (strikeAnim > 0) { strikeAnim = Math.max(0, strikeAnim - dt * 2); striker.position.x = -1.5 + Math.sin((1 - strikeAnim) * Math.PI) * 0.9; }
    if (chimeAnim > 0) { chimeAnim = Math.max(0, chimeAnim - dt * 0.5); fish.rotation.z = Math.sin(t * 9) * 0.6 * chimeAnim; chime.rotation.z = Math.sin(t * 5) * 0.1 * chimeAnim; }
    else fish.rotation.z = Math.sin(t * 1.5) * 0.08;
    glow.intensity = 9 + Math.sin(t * 2.3) * 1.2;
  };
  S.onEnter = () => setTimeout(() => api.say('temple', { kicker: VIRTUAL, ms: 4200 }), 500);
  S.spawns = { main: { x: -3, z: 3.4, ry: Math.PI } };
  S.camera = { yaw: 0.12, pitch: 0.68, dist: 13, minDist: 5, maxDist: 18, yawRange: 0.8 };
  S.hint = '절하기를 누를 때마다 한 배씩 세요 · 다른 친구에게도 절하는 모습이 보여요';
  return S;
}

// ───────────────────────── 성당 ─────────────────────────
function stainedTexture(seed) {
  return canvasTexture(256, 512, (g, w, h) => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const cols = ['#3a6fb5', '#c2412d', '#f2c230', '#2f7a5f', '#7a3b8c', '#e9788f', '#7fc8ff'];
    for (let y = 0; y < h; y += 40) for (let x = 0; x < w; x += 40) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.moveTo(x + r() * 10, y); g.lineTo(x + 40, y + r() * 10); g.lineTo(x + 40 - r() * 10, y + 40); g.lineTo(x, y + 40 - r() * 10); g.fill(); }
    g.strokeStyle = '#1d1a20'; g.lineWidth = 5;
    for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 6); g.stroke(); }
    for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, h); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(w / 2, 120, 56, 0, 6.3); g.fill();
  }, { repeat: [1, 1] });
}

export function buildCathedral(api) {
  const S = makeScene({ env: { bg: '#1f2236', hemi: 0.95, sun: 1.1, hemiSky: '#e6e8ff', hemiGround: '#4a4660', sunColor: '#fff2dd' } });
  const G = S.group;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.6 });
  room(S, { w: 14, d: 12, h: 5.2, floorMat, wallColor: 0xe9e4da, lowerColor: 0xbdb6aa, trimColor: 0x6b6458 });
  door(S, { x: -5.6, z: -6, label: '복도로', to: 'hall', api, color: 0x6b4e3a });
  virtualSign(G, -5.2, 5.95, Math.PI);
  // 스테인드글라스 세 장
  const panes = [];
  for (const [x, s] of [[-3.2, 3], [0, 7], [3.2, 13]]) {
    const tex = stainedTexture(s);
    const m = add(G, new THREE.PlaneGeometry(1.8, 3.4), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75 }), x, 3.0, -5.97, { cast: false });
    add(G, new THREE.CircleGeometry(0.9, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.75 }), x, 4.7, -5.965, { cast: false });
    panes.push(m);
  }
  // 빛 기둥 (색)
  for (const [x, c] of [[-3.2, 0x7fa8ff], [0, 0xffd27a], [3.2, 0xff9fb0]]) add(G, new THREE.BoxGeometry(1.5, 0.02, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, depthWrite: false }), x, 0.02, -2.2, { cast: false });
  // 제대 · 흰 천
  block(G, 3.2, 1.0, 1.0, 0, 0, 0, -4.6, { material: mat(0xf4efe6) });
  add(G, new THREE.BoxGeometry(3.3, 0.04, 1.1), mat(0xffffff), 0, 1.02, -4.6);
  S.colliders.push(rect(0, -4.6, 3.4, 1.2));
  // 십자가 (제대 뒤)
  const crossM = mat(0x7a5236), trimM = mat(0xc9a050, GOLD);
  add(G, new THREE.BoxGeometry(0.16, 2.1, 0.1), crossM, 0, 2.15, -5.82);
  add(G, new THREE.BoxGeometry(1.1, 0.16, 0.1), crossM, 0, 2.7, -5.82);
  add(G, new THREE.BoxGeometry(0.02, 2.1, 0.11), trimM, 0, 2.15, -5.81, { cast: false });
  add(G, new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), mat(0xefe2cc), 0, 2.38, -5.75, { cast: false });
  for (const sx of [-1, 1]) { const arm = add(G, new THREE.CapsuleGeometry(0.025, 0.36, 4, 6), mat(0xefe2cc), sx * 0.22, 2.66, -5.75, { cast: false }); arm.rotation.z = sx * 1.35; }
  add(G, new THREE.SphereGeometry(0.06, 10, 8), mat(0xefe2cc), 0, 2.74, -5.74, { cast: false });
  // 제대 위 묵주 · 초
  beadRing(G, { x: 0.8, y: 1.05, z: -4.45, n: 40, r: 0.2, bead: 0.018, color: 0x5b6fb5, pendant: 'cross' });
  for (const x of [-1.3, 1.3]) { add(G, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), mat(0xfff8ea), x, 1.29, -4.6); add(G, new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc35a, toneMapped: false }), x, 1.6, -4.6, { cast: false }).scale.y = 1.7; }
  // 성모 마리아상 (왼쪽 앞, 꽃과 함께)
  mary(G, -5.6, -3.9, 0.5);
  S.colliders.push(rect(-5.6, -3.9, 1.0, 1.0));
  spot(S, { id: 'mary', label: '성모상 앞에서 기도', pos: [-5.6, 3.2, -3.9], at: [-4.6, -2.8], face: -2.4, onUse: () => { api.hold('pray'); api.say('cathedral', { kicker: '성모상 앞에서' }); api.audio.play('soft'); setTimeout(() => api.hold(null), 4500); } });
  // 장의자 (자리 16)
  const pewM = mat(0x8a5f3f);
  for (let r = 0; r < 4; r++) for (const side of [-1, 1]) {
    const x = side * 3.0, z = -1.6 + r * 1.9;
    block(G, 3.6, 0.45, 0.5, 0, x, 0, z, { material: pewM });
    block(G, 3.6, 0.3, 0.1, 0, x, 0.45, z + 0.25, { material: pewM });
    S.colliders.push(rect(x, z + 0.05, 3.7, 0.5));
    for (const sx of [-0.9, 0.9]) S.seats.push({ id: `p${r}${side}${sx}`, x: x + sx, z: z - 0.05, y: 0, h: 0.45, ry: Math.PI });
  }
  // 초 켜고 기도 (오른쪽 앞 촛대)
  const cc = candlePrayer(S, api, { key: 'candle', x: 5.2, z: -3.6, ry: 0, pool: 'cathedral', note: `${VIRTUAL}.` });

  // 묵주 59알
  let bead = 0;
  function rosaryPanel() {
    api.hold('pray');
    api.hud.openPanel({
      title: '묵주 59알', sub: '한 알씩 누르며 마음을 모아요. 열 알마다 맑은 소리가 나요.',
      onClose: () => api.hold(null),
      render(body) {
        const R = 120, cx = 150, cy = 138;
        // 큰 고리 54알 + 아래 5알
        let svg = `<svg viewBox="0 0 300 330">`;
        const pos = [];
        for (let i = 0; i < 5; i++) pos.push([cx, 318 - i * 18, i === 1 || i === 4 ? 9 : 6.5]);
        for (let i = 0; i < 54; i++) { const a = Math.PI / 2 + (i / 54) * Math.PI * 2; pos.push([cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R, (i % 11 === 10) ? 9 : 6.5]); }
        svg += `<path d="M${cx} 318 L${cx} 258" stroke="#c9b48a" stroke-width="2"/><ellipse cx="${cx}" cy="${cy}" rx="${R * 0.96}" ry="${R}" fill="none" stroke="#c9b48a" stroke-width="2"/>`;
        svg += `<path d="M${cx - 9} 326 h18 M${cx} 316 v20" stroke="#8a6a3a" stroke-width="4" stroke-linecap="round"/>`;
        pos.forEach(([x, y, r], i) => { svg += `<circle data-b="${i}" cx="${x}" cy="${y}" r="${r}" fill="${i < bead ? '#5b6fb5' : '#efe7d6'}" stroke="#8a7a60" stroke-width="1.4"/>`; });
        svg += '</svg>';
        body.innerHTML = `<div class="rosary">${svg}<div class="count"><div><b>${bead}</b><span>/ 59알</span></div></div></div><div class="row-btns"><button class="btn primary nx">한 알 돌리기</button><button class="btn rs">처음부터</button></div><p class="src">${VIRTUAL}.</p>`;
        const paint = () => { body.querySelectorAll('circle[data-b]').forEach((c) => c.setAttribute('fill', +c.dataset.b < bead ? '#5b6fb5' : '#efe7d6')); body.querySelector('.count b').textContent = bead; };
        const next = () => {
          bead = Math.min(59, bead + 1); paint();
          if (bead === 59) { api.audio.play('beadDecade'); api.say('59알을 모두 돌렸어요. 평화가 함께하기를.', { kicker: '묵주 기도 끝' }); api.count('rosary'); }
          else if (bead % 10 === 0) { api.audio.play('beadDecade'); api.say('cathedral', { kicker: `${bead}알` }); }
          else api.audio.play('bead');
        };
        body.querySelector('.nx').addEventListener('click', next);
        body.querySelector('.rosary').addEventListener('click', next);
        body.querySelector('.rs').addEventListener('click', () => { bead = 0; paint(); });
      },
    });
  }
  S.actions = () => [
    { id: 'rosary', label: '묵주 돌리기', icon: 'sparkle', primary: true, onClick: () => beadPanel(api, { title: '묵주 59알', sub: '한 알씩 누르며 마음을 모아요. 열 알마다 맑은 소리가 나요.', total: 59, every: 10, doneText: '59알을 모두 돌렸어요. 평화가 함께하기를.', key: 'rosary', color: '#5b6fb5' }) },
    { id: 'candle', label: '초 켜고 기도', icon: 'candle', onClick: () => cc.start() },
    { id: 'pray', label: '손 모으기', icon: 'pray', onClick: () => { api.hold('pray'); api.say('cathedral', { kicker: '조용히' }); setTimeout(() => api.hold(null), 5000); } },
  ];
  S.onSit = () => api.hold('pray');
  S.onEnter = () => setTimeout(() => api.say('cathedral', { kicker: VIRTUAL, ms: 4200 }), 500);
  S.spawns = { main: { x: 0, z: 4.6, ry: Math.PI } };
  S.camera = { yaw: 0, pitch: 0.6, dist: 14, minDist: 5, maxDist: 19, yawRange: 0.8, lookHeight: 1.4 };
  S.hint = '장의자에 앉아 묵주를 돌리거나, 촛대에서 초를 켜고 기도해요';
  return S;
}

// ───────────────────────── 교회 ─────────────────────────
export function buildChurch(api) {
  const S = makeScene({ env: { bg: '#e8e2d4', hemi: 1.25, sun: 1.4, hemiSky: '#fff8ec', hemiGround: '#a8977f' } });
  const G = S.group;
  const wt = woodTexture().clone(); wt.needsUpdate = true;
  room(S, { w: 14, d: 11, h: 5.0, floorMat: new THREE.MeshStandardMaterial({ map: wt, roughness: 0.75 }), wallColor: 0xfbf8f1, lowerColor: 0xd8cbb4, trimColor: 0x7a6248 });
  door(S, { x: -5.6, z: -5.5, label: '복도로', to: 'hall', api, color: 0x7a5a3f });
  virtualSign(G, -5.2, 5.45, Math.PI);
  // 나무 십자가 · 강대상 · 창
  add(G, new THREE.BoxGeometry(0.32, 2.6, 0.14), mat(0x8a5f3f), 0, 3.0, -5.45);
  add(G, new THREE.BoxGeometry(1.5, 0.32, 0.14), mat(0x8a5f3f), 0, 3.6, -5.45);
  block(G, 1.4, 1.15, 0.8, 0, 0, 0, -4.2, { material: mat(0x9c6f47) });
  S.colliders.push(rect(0, -4.2, 1.6, 1));
  for (const x of [-4, 4]) { add(G, rbox(1.4, 2.6, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: 0xcfe6f2, emissive: 0xeaf6ff, emissiveIntensity: 0.6 }), x, 2.8, -5.46, { cast: false }); }
  // 장의자 (자리 12)
  const pewM = mat(0xa77b52);
  for (let r = 0; r < 3; r++) for (const side of [-1, 1]) {
    const x = side * 3.0, z = -1.4 + r * 2.0;
    block(G, 3.6, 0.45, 0.5, 0, x, 0, z, { material: pewM });
    block(G, 3.6, 0.3, 0.1, 0, x, 0.45, z + 0.25, { material: pewM });
    S.colliders.push(rect(x, z + 0.05, 3.7, 0.5));
    for (const sx of [-0.9, 0.9]) S.seats.push({ id: `q${r}${side}${sx}`, x: x + sx, z: z - 0.05, y: 0, h: 0.45, ry: Math.PI });
  }
  // 종탑: 천장 구멍 위로 종, 줄이 내려온다
  const towerX = 5.6, towerZ = 3.4;
  block(G, 2.0, 0.3, 2.0, 0, towerX, 4.9, towerZ, { material: mat(0xd8cbb4) });
  const bellG = new THREE.Group(); bellG.position.set(towerX, 6.0, towerZ); G.add(bellG);
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.2 + 0.3 * t * t, -t * 0.8)); }
  add(bellG, new THREE.LatheGeometry(pts, 20), mat(0xc9a050, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0);
  add(bellG, new THREE.BoxGeometry(1.6, 0.12, 0.12), mat(0x6b4226), 0, 0.12, 0);
  const rope = add(G, new THREE.CylinderGeometry(0.035, 0.035, 4.2, 6), mat(0xd9c49a), towerX, 2.9, towerZ, { cast: false });
  const handle = add(G, new THREE.TorusGeometry(0.12, 0.04, 8, 14), mat(0xc2412d), towerX, 0.95, towerZ, { cast: false });
  S.colliders.push(rect(towerX, towerZ, 0.3, 0.3));
  let pull = 0, swing = 0;
  function ringBell() {
    pull = 1; swing = 1;
    api.act('pull');
    setTimeout(() => api.audio.play('churchBell'), 300);
    api.count('bell');
    api.say('church', { kicker: '종이 울려요' });
  }
  clickable(S, rope, () => api.walkTo(towerX - 0.6, towerZ + 0.4, ringBell));
  clickable(S, handle, () => api.walkTo(towerX - 0.6, towerZ + 0.4, ringBell));
  const chc = candlePrayer(S, api, { key: 'ccandle', x: 3.4, z: -4.6, ry: 0, pool: 'church', note: `${VIRTUAL}.` });
  spot(S, { id: 'rope', label: '종탑 줄 당기기', pos: [towerX, 2.6, towerZ], at: [towerX - 0.6, towerZ + 0.4], face: Math.PI / 2, onUse: ringBell });
  S.actions = () => [
    { id: 'ring', label: '종 울리기', icon: 'bell', primary: true, onClick: () => api.walkTo(towerX - 0.6, towerZ + 0.4, ringBell) },
    { id: 'candle', label: '초 켜고 기도', icon: 'candle', onClick: () => chc.start() },
    { id: 'pray', label: '손 모으기', icon: 'pray', onClick: () => { api.hold('pray'); api.say('church', { kicker: '조용히 손 모으고' }); api.audio.play('soft'); setTimeout(() => api.hold(null), 5000); } },
  ];
  S.update = (dt, t) => {
    if (pull > 0) { pull = Math.max(0, pull - dt * 1.6); const d = Math.sin((1 - pull) * Math.PI) * 0.45; rope.position.y = 2.9 - d; handle.position.y = 0.95 - d; }
    if (swing > 0) { swing = Math.max(0, swing - dt * 0.35); bellG.rotation.z = Math.sin(t * 5) * 0.5 * swing; }
  };
  S.onSit = () => api.hold('pray');
  S.onEnter = () => setTimeout(() => api.say('church', { kicker: VIRTUAL, ms: 4200 }), 500);
  S.spawns = { main: { x: 0, z: 4.2, ry: Math.PI } };
  S.camera = { yaw: -0.12, pitch: 0.6, dist: 14, minDist: 5, maxDist: 19, yawRange: 0.8, lookHeight: 1.5 };
  S.hint = '종탑 줄을 당겨 종을 울리거나, 촛대에서 초를 켜고 기도해요';
  return S;
}

// ───────────────────────── 다 빌어 보는 방 ─────────────────────────
export function buildAllWish(api) {
  const S = makeScene({ env: { bg: '#efe2f3', hemi: 1.3, sun: 1.3, hemiSky: '#fff4ff', hemiGround: '#b59ac2' } });
  const G = S.group;
  room(S, { w: 15, d: 11, h: 4.0, floorMat: new THREE.MeshStandardMaterial({ color: 0xe9dcef, roughness: 0.9 }), wallColor: 0xf7effa, lowerColor: 0xdac8e6, trimColor: 0x9a6bb5 });
  door(S, { x: -6.2, z: -5.5, label: '복도로', to: 'hall', api, color: 0x8a6aa0 });
  sign(G, ['다 빌어 보는 방', '종교와 상관없이, 뭐든 다 빌어 봐요'], { w: 4.6, h: 1.1, x: 0.5, y: 3.0, z: -5.48, bg: '#ffffff', fg: '#7a3b8c', size: 76, tw: 1100, border: '#c6a8ff' });
  virtualSign(G, 4.6, 5.45, Math.PI);

  let alive = true;
  const flying = []; // 날아가는 엿
  const meAv = () => api.player.avatar;
  const fwd = (d) => new THREE.Vector3(Math.sin(api.player.facing) * d, 0, Math.cos(api.player.facing) * d);
  // 1. 합격 엿 붙이기 — 던지면 날아가 벽에 찰싹 붙는다
  const yeotWall = new THREE.Group(); yeotWall.position.set(-5.2, 0, -5.38); G.add(yeotWall);
  add(yeotWall, rbox(2.6, 1.8, 0.06, 0.06), mat(0xf2e2b8), 0, 1.9, 0, { cast: false });
  const yeotMat = mat(0xb5762f, { roughness: 0.35 });
  const stuck = [];
  let yeots = 0;
  let throwing = false;
  function throwYeot() {
    if (throwing) return; throwing = true;
    // 엿을 손에 세워 쥐었다가 던진다
    const av = meAv();
    const held = new THREE.Mesh(rbox(0.08, 0.34, 0.035, 0.025), yeotMat);
    held.userData.upright = true; held.userData.tilt = new THREE.Euler(0.25, 0, 0);
    av.attach(held, 1); held.position.set(0, -0.3, 0.05);
    api.audio.play('rustle');
    setTimeout(() => { if (alive) api.act('throw'); }, 450);
    setTimeout(() => {
      const from = held.getWorldPosition(new THREE.Vector3());
      av.detach(held); // rbox 모양은 공유(캐시)라 지우지 않는다
      throwing = false;
      if (!alive) return;
      const m = add(G, rbox(0.1, 0.42, 0.04, 0.03), yeotMat, 0, 0, 0, { cast: false });
      const to = new THREE.Vector3(yeotWall.position.x - 1.1 + Math.random() * 2.2, 1.2 + Math.random() * 1.4, yeotWall.position.z + 0.07);
      m.position.copy(from);
      flying.push({ m, from, to, t: 0, rz: (Math.random() - 0.5) * 1.2 });
      api.audio.play('rustle');
    }, 450 + 420);
  }
  function landYeot(f) {
    f.m.position.copy(f.to); f.m.rotation.set(0, 0, f.rz);
    stuck.push(f.m);
    if (stuck.length > 36) { const o = stuck.shift(); G.remove(o); }
    yeots++;
    api.audio.play('stick'); api.count('yeot');
    api.fx.burst({ origin: f.to.clone().add(new THREE.Vector3(0, 0, 0.2)), count: 14, shape: 'spark', size: 0.045, colors: ['#ffd65a', '#fff4c2', '#ffffff'], speed: [0.6, 1.6], up: 0.8, gravity: 3, life: [0.5, 0.9] });
    api.say(yeots % 10 === 0 ? `엿 ${yeots}개째! 합격에 단단히 붙었다.` : '찰싹! 엿처럼 합격에 딱 붙어라.', { kicker: '합격 엿' });
  }
  const stations = [];
  const station = (id, label, x, z, build, onUse, info) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    // 책상은 캐릭터 허리 높이(0.62). 위에 놓는 물건은 inner(0.28 내림)에 놓는다
    block(g, 1.6, 0.62, 1.0, 0, 0, 0, 0, { material: mat(0xffffff), r: 0.06 });
    const inner = new THREE.Group(); inner.position.y = -0.28; g.add(inner);
    build(inner, g);
    S.colliders.push(rect(x, z, 1.7, 1.1));
    spot(S, { id, label, pos: [x, 2.0, z], at: [x, z + 0.88], face: Math.PI, onUse });
    stations.push({ id, g, info });
    sign(G, info, { w: 1.6, h: 0.3, x, y: 0.36, z: z + 0.51, bg: '#7a3b8c', size: 70, tw: 640 });
    return g;
  };
  station('yeot', '합격 엿 던지기', -5.2, -3.6, (g) => { for (let i = 0; i < 5; i++) add(g, rbox(0.12, 0.06, 0.4, 0.03), mat(0xb5762f, { roughness: 0.4 }), -0.4 + i * 0.2, 0.93, 0, { ry: 0.3 }); }, throwYeot, '엿 · 찰싹 붙어라');

  // 2. 찹쌀떡 — 손에 들고 한 입씩 먹는다
  const cakes = [];
  let eating = false;
  station('rice', '찹쌀떡 먹기', -1.8, -3.6, (g) => {
    for (let i = 0; i < 4; i++) { const c = add(g, new THREE.SphereGeometry(0.13, 12, 8), mat(0xfaf6ee), -0.3 + i * 0.2, 0.98, 0, { cast: false }); c.scale.set(1, 0.6, 1); cakes.push(c); }
    add(g, new THREE.CylinderGeometry(0.5, 0.45, 0.04, 20), mat(0x7fc8ff), 0, 0.92, 0);
  }, () => {
    if (eating) return; eating = true;
    const av = meAv();
    // 접시에서 떡 하나를 집는다
    api.act('reach');
    const cake = cakes.find((c) => c.visible);
    setTimeout(() => { if (!alive) return; if (cake) cake.visible = false; api.hold('mochi'); api.audio.play('rustle'); }, 600);
    // 세 입: 떡을 입으로 가져와 한 입, 떡이 작아지고 가루가 날린다
    [1300, 2500, 3700].forEach((ms, i) => {
      setTimeout(() => { if (alive && av.hold === 'mochi') api.act('bite'); }, ms);
      setTimeout(() => {
        if (!alive || av.hold !== 'mochi' || !av.holdProp) return;
        av.holdProp.scale.setScalar(1 - (i + 1) * 0.27);
        api.audio.play('pop');
        const p = av.holdProp.getWorldPosition(new THREE.Vector3());
        api.fx.burst({ origin: p.add(new THREE.Vector3(0, 0.06, 0)), count: 10, shape: 'spark', size: 0.02, colors: ['#ffffff', '#f6efe2'], speed: [0.2, 0.6], up: 0.6, gravity: 1.5, life: [0.5, 0.9] });
        if (i === 1) api.say('쫀득쫀득… 합격에 착 붙자!', { kicker: '찹쌀떡' });
      }, ms + 450);
    });
    setTimeout(() => {
      if (alive) { if (av.hold === 'mochi') api.hold(api.player.seat ? 'pray' : null); if (cake) cake.visible = true; api.audio.play('sparkle'); api.count('rice'); api.say('찹쌀떡처럼 착 붙자!', { kicker: '찹쌀떡 다 먹었다' }); }
      eating = false;
    }, 4800);
  }, '찹쌀떡 · 척 붙어라');

  // 3. 포크 — 답안지에 콕콕 찍힌다
  const card = document.createElement('canvas'); card.width = 256; card.height = 192;
  const cctx = card.getContext('2d');
  const marks = [];
  function drawCard() {
    const g = cctx;
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#7a3b8c'; g.font = '800 18px Pretendard, Malgun Gothic, sans-serif'; g.textAlign = 'left'; g.fillText('답안지', 12, 24);
    for (let r = 0; r < 5; r++) {
      g.fillStyle = '#6b6878'; g.font = '700 14px Pretendard, Malgun Gothic, sans-serif'; g.fillText(`${r + 1}`, 14, 59 + r * 28);
      for (let c = 0; c < 5; c++) {
        const x = 62 + c * 36, y = 54 + r * 28;
        g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.lineWidth = 1.6; g.strokeStyle = '#9a97a6'; g.stroke();
        if (marks[r] === c) { g.beginPath(); g.arc(x, y, 8.5, 0, Math.PI * 2); g.fillStyle = '#1d1b22'; g.fill(); }
      }
    }
  }
  drawCard();
  const cardTex = new THREE.CanvasTexture(card); cardTex.colorSpace = THREE.SRGBColorSpace;
  let stabbing = false;
  station('fork', '포크로 잘 찍기', 1.6, -3.6, (g) => {
    const cardMesh = add(g, new THREE.PlaneGeometry(0.86, 0.645), new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 }), 0, 0.915, 0.17, { rx: -Math.PI / 2, cast: false });
    cardMesh.userData.keepGeo = true;
  }, () => {
    if (stabbing) return; stabbing = true;
    const av = meAv();
    const fork = new THREE.Group();
    // 잘 보이게 크고 밝은 포크(손잡이 0.3 + 갈래 0.13)
    const steel = mat(0xe4e8ef, { metalness: 0.25, roughness: 0.3 });
    add(fork, new THREE.CylinderGeometry(0.02, 0.024, 0.3, 8), steel, 0, 0.1, 0, { cast: false });
    add(fork, new THREE.BoxGeometry(0.11, 0.03, 0.018), steel, 0, 0.26, 0, { cast: false });
    for (const sx of [-0.045, -0.015, 0.015, 0.045]) add(fork, new THREE.CylinderGeometry(0.008, 0.006, 0.13, 6), steel, sx, 0.34, 0, { cast: false });
    // 손잡이는 주먹 안, 포크 끝은 팔이 뻗는 방향(찍을 때 책상 위 답안지로 내려간다)
    av.attach(fork, 1); fork.position.set(0, -0.28, 0.04); fork.rotation.set(Math.PI, 0, 0);
    api.act('stab');
    [380, 1080].forEach((ms) => setTimeout(() => {
      if (!alive) return;
      let r = marks.length; if (r >= 5) { marks.length = 0; r = 0; }
      marks[r] = Math.floor(Math.random() * 5); drawCard(); cardTex.needsUpdate = true;
      api.audio.play('stick');
      api.fx.burst({ origin: new THREE.Vector3(1.6, 0.68, -3.43), count: 8, shape: 'spark', size: 0.035, colors: ['#ffffff', '#ffd65a'], speed: [0.4, 1.0], up: 0.9, gravity: 4, life: [0.4, 0.7] });
    }, ms));
    setTimeout(() => {
      av.detach(fork);
      if (alive) { api.count('fork'); api.say(marks.length >= 5 ? '답안지 끝! 포크처럼 콕콕 정답만 찍혀라.' : '모르는 문제도 포크처럼 콕! 잘 찍어라.', { kicker: '포크' }); }
      stabbing = false;
    }, 1650);
  }, '포크 · 잘 찍어라');

  // 4. 휴지 — 당기면 길게 풀려 바닥까지 내려온다
  const roll = { m: null, hang: null, pool: null, len: 0, goal: 0 };
  station('tissue', '휴지 풀기', 5.0, -3.6, (g, outer) => {
    roll.m = add(g, new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16), mat(0xffffff), 0, 1.1, 0, { rz: Math.PI / 2 });
    const hg = new THREE.PlaneGeometry(0.28, 1); hg.translate(0, -0.5, 0);
    roll.hang = new THREE.Mesh(hg, mat(0xffffff, { side: THREE.DoubleSide })); roll.hang.position.set(0, 0.92, 0.52); roll.hang.scale.y = 0.001; g.add(roll.hang);
    const pg = new THREE.PlaneGeometry(0.28, 1); pg.translate(0, 0.5, 0);
    roll.pool = new THREE.Mesh(pg, mat(0xffffff, { side: THREE.DoubleSide })); roll.pool.rotation.x = Math.PI / 2; roll.pool.position.set(0, 0.012, 0.52); roll.pool.scale.y = 0.001; outer.add(roll.pool);
  }, () => {
    api.act('pull'); api.audio.play('rustle'); api.count('tissue');
    setTimeout(() => { if (alive) api.audio.play('rustle'); }, 260);
    if (roll.goal >= 1.9) { roll.goal = 0; roll.len = 0.4; api.say('한 롤 다 풀었어요! 문제도 술술 풀린다.', { kicker: '휴지' }); return; }
    roll.goal = Math.min(1.9, roll.goal + 0.5);
    api.say('휴지처럼 술술~ 문제가 잘 풀려라.', { kicker: '휴지' });
  }, '휴지 · 잘 풀어라');
  // 5. 거울
  const mirror = add(G, new THREE.CircleGeometry(0.8, 32), new THREE.MeshStandardMaterial({ color: 0xdfe8ee, metalness: 0.9, roughness: 0.08 }), -7.38, 1.7, 1.6, { ry: Math.PI / 2, cast: false });
  add(G, new THREE.TorusGeometry(0.82, 0.06, 8, 32), mat(0xd9b45a, { metalness: 0.6 }), -7.36, 1.7, 1.6, { ry: Math.PI / 2 });
  spot(S, { id: 'mirror', label: '거울 보기', pos: [-7.2, 2.8, 1.6], at: [-6.1, 1.6], face: -Math.PI / 2, onUse: () => { api.act('wave'); api.audio.play('sparkle'); api.count('mirror'); api.fx.burst({ origin: new THREE.Vector3(-7.1, 1.7, 1.6), count: 20, speed: [0.5, 1.5], up: 1, gravity: 0.5, size: 0.08 }); api.say('거울처럼 문제가 또렷이 잘 보여라.', { kicker: '거울' }); } });
  // 6. 돌탑
  const tower = new THREE.Group(); tower.position.set(5.6, 0, 2.6); G.add(tower);
  S.colliders.push(rect(5.6, 2.6, 1.4, 1.4));
  let stones = 0;
  const stoneCols = [0xb9b1a2, 0xa79c8c, 0xcfc8bb, 0x9c8f80];
  function addStone(silent) {
    const r = 0.5 - Math.min(0.32, stones * 0.025);
    const s = add(tower, new THREE.SphereGeometry(r, 12, 8), mat(stoneCols[stones % 4], { flatShading: true }), (Math.random() - 0.5) * 0.06, 0, 0);
    s.scale.set(1, 0.45, 0.9);
    s.position.y = (tower.userData.h || 0) + r * 0.45;
    tower.userData.h = s.position.y + r * 0.45;
    s.rotation.y = Math.random() * 6;
    stones++;
    if (!silent) { api.audio.play('stack'); api.count('stone'); api.act('throw'); api.say(stones % 5 === 0 ? `돌탑 ${stones}층! 정성이 쌓이는 중.` : '돌 하나에 소원 하나.', { kicker: '돌탑 쌓기' }); }
    if (stones > 14) { tower.clear(); tower.userData.h = 0; stones = 0; for (let i = 0; i < 3; i++) addStone(true); }
  }
  for (let i = 0; i < 3; i++) addStone(true);
  spot(S, { id: 'stone', label: '돌탑 쌓기', pos: [5.6, 2.6, 2.6], at: [4.4, 3.6], onUse: () => addStone(false) });

  const wc = candlePrayer(S, api, { key: 'wcandle', x: 6.6, z: -0.8, ry: -Math.PI / 2, pool: 'allwish', note: `${VIRTUAL}.` });
  // 방석(앉아서 손 모으는 자리)
  const cushCols = [0xc6a8ff, 0xf4b6c2, 0xa8d8ff, 0xffd9a0];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    floorSeat(S, -3.9 + c * 2.0, -0.4 + r * 1.8, { id: `w${r}${c}`, ry: Math.PI, color: cushCols[(r + c) % 4] });
  }
  S.onSit = () => { api.hold('pray'); api.say('allwish', { kicker: '앉아서 손 모으기' }); };

  function openPrayer() {
    api.hud.openPanel({
      title: '기도하기', sub: '소원 하나를 고르고 조용히 손을 모아요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${WISHES.map((w, i) => `<button class="choice" data-i="${i}">${w}</button>`).join('')}</div><p class="src">${VIRTUAL}.</p>`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
          api.hud.closePanel();
          const w = WISHES[+b.dataset.i];
          api.hold('pray'); api.audio.play('soft'); api.count('prayer');
          api.fx.burst({ origin: api.player.pos.clone().add(new THREE.Vector3(0, 1.9, 0)), count: 26, shape: 'spark', size: 0.07, colors: ['#fff4c2', '#c6a8ff', '#ffd65a', '#ffffff'], speed: [0.2, 0.8], up: 2.2, gravity: -0.5, life: [2.4, 3.4], emissive: 1.6 });
          api.say(w, { kicker: '기도하는 중', ms: 4500 });
          setTimeout(() => { if (alive) api.hold(api.player.seat ? 'pray' : null); }, 5000);
        }));
      },
    });
  }
  S.actions = () => [
    { id: 'all', label: '한꺼번에 다 빌기', icon: 'stones', primary: true, onClick: () => { api.act('cheer'); api.audio.play('sparkle'); api.count('allwish'); api.fx.burst({ origin: api.player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), count: 50, speed: [1.5, 4], up: 4, gravity: 5, colors: ['#c6a8ff', '#ffd65a', '#ff8fa3', '#ffffff'] }); api.say('찰싹 붙고, 잘 찍고, 술술 풀리고, 또렷이 보여라!', { kicker: '다 빌었다!' }); } },
    { id: 'candle', label: '초 켜고 기도', icon: 'candle', onClick: () => wc.start() },
    { id: 'prayer', label: '기도하기', icon: 'pray', onClick: openPrayer },
    { id: 'pray', label: '손 모으기', icon: 'pray', onClick: () => { api.hold('pray'); api.say('allwish', { kicker: '마음 모으기' }); setTimeout(() => api.hold(api.player.seat ? 'pray' : null), 4000); } },
    { id: 'bow', label: '절하기', icon: 'bow', onClick: () => { api.act('bow'); api.audio.play('soft'); api.count('allbow'); api.say('allwish', { kicker: '고개 숙여 감사' }); } },
  ];
  S.update = (dt, t) => {
    mirror.material.color.setHSL(0.55, 0.15, 0.88 + Math.sin(t * 2) * 0.03);
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]; f.t += dt / 0.55;
      const k = Math.min(1, f.t);
      f.m.position.lerpVectors(f.from, f.to, k); f.m.position.y += Math.sin(k * Math.PI) * 0.7;
      f.m.rotation.z += dt * 14; f.m.rotation.x += dt * 5;
      if (f.t >= 1) { flying.splice(i, 1); landYeot(f); }
    }
    if (roll.hang) {
      roll.len += (roll.goal - roll.len) * (1 - Math.exp(-dt * 5));
      const hang = Math.min(roll.len, 0.62), pool = Math.max(0, roll.len - 0.62);
      roll.hang.scale.y = Math.max(0.001, hang); roll.pool.scale.y = Math.max(0.001, pool);
      roll.hang.rotation.x = Math.sin(t * 2.4) * 0.04 * Math.min(1, roll.len);
      roll.m.rotation.x += (roll.goal - roll.len) * dt * 9;
    }
  };
  S.dispose = () => { alive = false; cardTex.dispose(); };
  S.onEnter = () => setTimeout(() => api.say('allwish', { kicker: VIRTUAL, ms: 4200 }), 500);
  S.spawns = { main: { x: -1, z: 3.6, ry: Math.PI } };
  S.camera = { yaw: 0.08, pitch: 0.68, dist: 14, minDist: 5, maxDist: 19, yawRange: 0.8 };
  S.hint = '엿 던지기·찹쌀떡 먹기·포크 찍기·휴지 풀기 — 이름표를 눌러 하나씩 · 방석에 앉아 손 모으기';
  return S;
}
