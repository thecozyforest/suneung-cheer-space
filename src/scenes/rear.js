import * as THREE from 'three';
import { makeScene, floor, solid, spot, sign, forest, bench, lieMat, lamp, mat, rbox, add, block, C, rect } from './kit.js';
import { brickTexture, grassTexture, woodTexture, canvasTexture } from '../engine/materials.js';
import { createFalling } from '../engine/fx.js';
import { SCHOOL } from '../data/school.js';

/**
 * 뒤뜰: 본관 뒤 오르막을 따라 강당(목재 데크) → 농구장 → 별관(아치 현관·붉은 차양).
 * 서쪽 산기슭에는 숲길과 벤치. 별관 앞에는 벤치와 단풍·은행나무, 낙엽이 내린다.
 * 학교마다 건물 배치가 다르다. 여기 좌표를 고쳐 자기 학교 모양으로 만든다(실측 아님).
 */
const L1 = 0, L2 = 1.2, L3 = 2.6; // 강당 앞 · 농구장 · 별관 앞 높이

export function heightAt(x, z) {
  // 숲길(서쪽 산기슭)은 같은 단을 따르되 서쪽으로 갈수록 조금씩 오른다
  return mainH(z) + Math.max(0, Math.min(1.4, (-16 - x) * 0.07));
}
function mainH(z) {
  if (z > -6) return L1;
  if (z > -9) return L1 + (L2 - L1) * ((-6 - z) / 3);
  if (z > -30) return L2;
  if (z > -34) return L2 + (L3 - L2) * ((-30 - z) / 4);
  return L3;
}

export function buildRear(api) {
  const S = makeScene({ outdoor: true, heightAt, ambient: 'annex', fog: [50, 200] });
  const G = S.group;
  let seed = 23;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── 땅: 높이를 따르는 잔디 ──
  const gt = grassTexture().clone(); gt.needsUpdate = true; gt.repeat.set(26, 26);
  const groundGeo = new THREE.PlaneGeometry(150, 150, 120, 120);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)) - 0.03 + (gp.getX(i) < -16 ? 0 : 0));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.receiveShadow = true; G.add(ground); S.ground.push(ground);

  // 포장된 길과 단
  const paveM = mat(0xd6cec0, { roughness: 1 });
  block(G, 40, 0.06, 14, 0, 2, L1 - 0.03, 1, { material: paveM, cast: false });
  block(G, 30, L2, 21, 0, 2, 0, -19.5, { material: mat(0xbdb4a5), cast: false });
  block(G, 34, L3, 26, 0, 2, 0, -47, { material: mat(0xbdb4a5), cast: false });
  // 계단 두 곳 (보이는 것만, 걷기는 높이 함수)
  const stepM = mat(0xe1dace);
  for (let i = 0; i < 6; i++) block(G, 8, L1 + (L2 - L1) * (i + 1) / 6, 0.5, 0, 2, 0, -6.25 - i * 0.5, { material: stepM, cast: false });
  for (let i = 0; i < 8; i++) block(G, 8, L2 + (L3 - L2) * (i + 1) / 8, 0.5, 0, 2, 0, -30.25 - i * 0.5, { material: stepM, cast: false });
  // 단 옆면은 막는다(계단만 통과)
  for (const [z0, z1] of [[-6, -9], [-30, -34]]) for (const side of [-1, 1]) {
    S.colliders.push(rect(2 + side * 4.4 + side * 6, (z0 + z1) / 2, 12, Math.abs(z1 - z0)));
  }

  // ── 강당 (본관과 이어진 큰 건물, 목재 데크) ──
  {
    const hall = new THREE.Group();
    const tex = brickTexture().clone(); tex.needsUpdate = true; tex.repeat.set(9, 3);
    block(hall, 30, 7, 14, 0, 2, L1, 14, { material: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }) });
    const roof = add(hall, new THREE.BoxGeometry(31, 1, 15), mat(0x5f9ea0, { roughness: 0.7 }), 2, L1 + 7.5, 14);
    roof.scale.y = 0.6;
    // 창
    for (let i = 0; i < 10; i++) add(hall, rbox(1.6, 2.2, 0.1, 0.05), mat(0x41606f, { roughness: 0.25 }), -11.5 + i * 3, L1 + 4.2, 6.97, { cast: false });
    // 목재 데크
    const woodM = new THREE.MeshStandardMaterial({ map: (() => { const t = woodTexture().clone(); t.needsUpdate = true; t.repeat.set(5, 1); return t; })(), roughness: 0.8 });
    block(hall, 18, 0.35, 3.2, 0, 2, L1, 5.4, { material: woodM });
    add(hall, rbox(3.4, 2.6, 0.12, 0.04), mat(0x7fa4b3, { roughness: 0.15 }), 2, L1 + 1.65, 6.98);
    sign(hall, '강당', { w: 2.4, h: 0.7, x: 2, y: L1 + 3.6, z: 7.02, bg: '#22305a', size: 120, tw: 600 });
    G.add(hall);
    S.colliders.push(rect(2, 14, 30.4, 14.4));
    spot(S, { id: 'to-stage', label: '강당 무대로', kind: 'door', pos: [2, L1 + 5, 6.6], at: [2, 4.6], onUse: () => { api.audio.play('door'); api.go('stage'); } });
  }

  // ── 농구장 ──
  {
    const court = add(G, new THREE.PlaneGeometry(22, 15), mat(0x5d8a77, { roughness: 0.9 }), 2, L2 + 0.012, -19.5, { rx: -Math.PI / 2, cast: false });
    court.receiveShadow = true;
    const lineM = mat(0xffffff);
    const ln = (x, z, w, d) => add(G, new THREE.BoxGeometry(w, 0.01, d), lineM, x, L2 + 0.02, z, { cast: false });
    ln(2, -12.2, 21, 0.1); ln(2, -26.8, 21, 0.1); ln(-8.5, -19.5, 0.1, 14.6); ln(12.5, -19.5, 0.1, 14.6); ln(2, -19.5, 0.1, 14.6);
    for (const hx of [-8, 12]) {
      const side = hx < 2 ? -1 : 1;
      add(G, new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8), mat(0x3d4250), hx + side * 1.3, L2 + 1.6, -19.5);
      add(G, new THREE.BoxGeometry(0.08, 1.1, 1.8), mat(0xffffff), hx + side * 0.9, L2 + 3.0, -19.5);
      const rim = add(G, new THREE.TorusGeometry(0.24, 0.025, 6, 18), mat(0xe0603a), hx + side * 0.55, L2 + 2.75, -19.5, { cast: false });
      rim.rotation.x = Math.PI / 2;
      solid(S, hx + side * 1.3, -19.5, 0.4, 0.4);
    }
    // 울타리
    const fenceM = new THREE.MeshBasicMaterial({ color: 0x3f4a55, wireframe: true, transparent: true, opacity: 0.35 });
    add(G, new THREE.PlaneGeometry(22, 3, 22, 3), fenceM, 2, L2 + 1.5, -27.4, { cast: false });
  }

  // ── 별관(설정: SCHOOL.campus.annex) ──
  {
    const annex = new THREE.Group();
    const tex = brickTexture().clone(); tex.needsUpdate = true; tex.repeat.set(7, 2.2);
    const wallM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
    block(annex, 24, 6.4, 10, 0, 2, L3, -52, { material: wallM });
    add(annex, new THREE.BoxGeometry(25, 0.5, 11), mat(0xd9c8b0), 2, L3 + 6.6, -52);
    // 아치 창
    for (let f = 0; f < 2; f++) for (let i = 0; i < 8; i++) {
      const wx = -8.5 + i * 3, wy = L3 + 1.6 + f * 3;
      add(annex, rbox(1.3, 1.6, 0.08, 0.04), mat(0x41606f, { roughness: 0.25, emissive: 0xffd28a, emissiveIntensity: 0 }), wx, wy, -46.97, { cast: false, name: 'annexwin' });
      const arch = add(annex, new THREE.CircleGeometry(0.65, 16, 0, Math.PI), mat(0x41606f, { roughness: 0.25 }), wx, wy + 0.8, -46.96, { cast: false });
    }
    // 아치 현관과 붉은 차양
    add(annex, rbox(3.6, 3.2, 0.3, 0.05), mat(0xe8dcc8), 2, L3 + 1.6, -46.8);
    add(annex, rbox(2.4, 2.4, 0.1, 0.05), mat(0x6f5a48), 2, L3 + 1.2, -46.62);
    const awn = add(annex, new THREE.CylinderGeometry(2.2, 2.2, 4.4, 20, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xb8433a, side: THREE.DoubleSide, roughness: 0.7 }), 2, L3 + 3.3, -45.2);
    awn.rotation.set(0, 0, Math.PI / 2); awn.scale.set(0.42, 1, 0.8);
    sign(annex, SCHOOL.campus.annex, { w: 3.2, h: 0.8, x: 2, y: L3 + 5.2, z: -46.9, bg: '#f2ebdd', fg: '#2b2a33', size: 130, tw: 760 });
    G.add(annex);
    S.colliders.push(rect(2, -52, 24.4, 10.4));
  }

  // ── 별관 앞 낙엽 마당: 벤치·은행나무·단풍나무 ──
  const benches = [];
  for (const [bx, bz, ry] of [[-6, -38.5, 0], [-1.5, -38.5, 0], [5.5, -38.5, 0], [10, -38.5, 0]]) benches.push(bench(S, bx, bz, ry, { y: L3, idPrefix: `an${bx}` }));
  // 낙엽 카펫 (바닥에 깔린 잎)
  {
    const leafGeo = new THREE.PlaneGeometry(0.22, 0.15);
    const n = 900;
    const im = new THREE.InstancedMesh(leafGeo, mat(0xffffff, { side: THREE.DoubleSide, roughness: 1 }), n);
    const d = new THREE.Object3D(), c = new THREE.Color();
    const cols = ['#f2c230', '#e8b422', '#e0603a', '#d24b30', '#ec7a3e', '#c9a03a'];
    for (let i = 0; i < n; i++) {
      const x = -14 + rng() * 32, z = -45.5 + rng() * 11;
      d.position.set(x, L3 + 0.015 + rng() * 0.01, z); d.rotation.set(-Math.PI / 2, 0, rng() * 6); d.updateMatrix();
      im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(cols[i % cols.length]));
    }
    im.instanceColor.needsUpdate = true; im.receiveShadow = true;
    G.add(im);
  }
  const autumn = [];
  for (let i = 0; i < 7; i++) autumn.push({ x: -12 + i * 4.4, z: -42.5 + (i % 2) * 1.2, y: L3, s: 1.05 + rng() * 0.2, kind: i % 2 ? 'maple' : 'ginkgo' });
  autumn.push({ x: -15, z: -36, y: L3, s: 1.2, kind: 'ginkgo' }, { x: 18, z: -36, y: L3, s: 1.2, kind: 'maple' }, { x: 17, z: -41, y: L3, s: 1.0, kind: 'autumn' });
  forest(G, autumn);
  autumn.forEach((t) => solid(S, t.x, t.z, 0.6, 0.6));
  const falling = createFalling(G, {
    count: 170, colors: ['#f2c230', '#f5cf4a', '#e0603a', '#ec7a3e', '#d24b30'],
    area: { minX: -14, maxX: 18, minZ: -46, maxZ: -33, top: L3 + 6.5, bottom: L3 },
    heightAt, size: 0.2, speed: 0.7, sway: 1.3,
  });
  for (const [lx, lz] of [[-9, -36], [13, -36]]) lamp(G, lx, lz, { y: L3 });
  // 낙엽 이불: 돗자리 여덟 장 (누워서 떨어지는 잎 보기)
  {
    const cols = [0xe0603a, 0xf2c230, 0xc2412d, 0xe9a23b];
    let i = 0;
    for (const mx of [-12.5, -11.0, -4, -2.5, 2.5, 4, 7.5, 9]) { lieMat(S, mx, -36.6, { y: L3, id: `dm${i}`, ry: 0, color: cols[i % 4], stripe: 0xfff4d6 }); i++; }
  }
  sign(G, [`${SCHOOL.campus.annex} 앞`, '낙엽 벤치'], { w: 2.4, h: 1.0, x: -13, y: L3 + 1.6, z: -34.6, bg: '#b8433a', size: 84, tw: 600 });
  add(G, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mat(0x5a4636), -13, L3 + 0.8, -34.7);

  // ── 서쪽 숲길 ──
  const path = [];
  for (let t = 0; t <= 1.0001; t += 0.02) path.push({ x: -21 - Math.sin(t * Math.PI * 2) * 3.2, z: 16 - t * 58 });
  const pathM = mat(0xcbb89a, { roughness: 1 });
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const seg = add(G, new THREE.PlaneGeometry(2.4, len + 0.2), pathM, (a.x + b.x) / 2, heightAt((a.x + b.x) / 2, (a.z + b.z) / 2) + 0.02, (a.z + b.z) / 2, { cast: false });
    seg.rotation.set(-Math.PI / 2, 0, Math.atan2(b.x - a.x, b.z - a.z));
    seg.rotation.order = 'YXZ'; seg.rotation.set(-Math.PI / 2 + Math.atan2(heightAt(b.x, b.z) - heightAt(a.x, a.z), len), Math.atan2(b.x - a.x, b.z - a.z) + Math.PI, 0);
  }
  const woods = [];
  for (let i = 0; i < 150; i++) {
    const t = rng();
    const p = path[Math.floor(t * (path.length - 1))];
    const side = rng() > 0.5 ? 1 : -1;
    const off = 2.2 + rng() * 9;
    const x = p.x + side * off, z = p.z + (rng() - 0.5) * 2;
    if (x > -15.5) continue;
    woods.push({ x, z, y: heightAt(x, z), s: 0.9 + rng() * 0.7, kind: rng() > 0.35 ? 'round' : 'pine' });
  }
  for (let i = 0; i < 120; i++) { const x = -40 - rng() * 30, z = 20 - rng() * 80; woods.push({ x, z, y: heightAt(x, z), s: 1 + rng() * 0.8, kind: rng() > 0.4 ? 'round' : 'pine' }); }
  for (let i = 0; i < 70; i++) { const x = -20 + rng() * 60, z = -60 - rng() * 30; woods.push({ x, z, y: L3 + 1 + rng() * 3, s: 1.1 + rng() * 0.8, kind: 'round' }); }
  for (let i = 0; i < 50; i++) { const x = 22 + rng() * 30, z = 20 - rng() * 80; woods.push({ x, z, y: heightAt(x, z), s: 1 + rng() * 0.7, kind: rng() > 0.5 ? 'round' : 'pine' }); }
  forest(G, woods);
  woods.filter((w) => w.x > -32 && w.x < -10).forEach((w) => solid(S, w.x, w.z, 0.5, 0.5));
  // 숲 벤치 (공터)
  const forestBench = bench(S, -26.2, -12, Math.PI / 2, { y: heightAt(-26.2, -12), idPrefix: 'fo', color: 0xa77b52 });
  bench(S, -18.6, 6, -Math.PI / 2, { y: heightAt(-18.6, 6), idPrefix: 'fp', color: 0xa77b52 });
  // 숲길 쉼터: 벤치 더, 풀밭 돗자리(누워서 나뭇잎 사이 하늘 보기)
  for (const [bx, bz, bry, id] of [[-26.4, -4, Math.PI / 2, 'fq'], [-16.0, -20, -Math.PI / 2, 'fr'], [-20.9, -30, Math.PI / 2, 'fs']]) bench(S, bx, bz, bry, { y: heightAt(bx, bz), idPrefix: id, color: 0xa77b52 });
  {
    const cols = [0x8fbf7a, 0xb8d98a, 0xf2c8a0, 0xa8c8e8];
    let i = 0;
    for (const [mx, mz] of [[-24.4, -9.2], [-24.4, -12.8], [-25.4, -16.4], [-23.6, 1.5], [-23.6, 4.0], [-23.6, 9.0], [-18.4, -9.0], [-18.4, -12.6]]) {
      lieMat(S, mx, mz, { y: heightAt(mx, mz), id: `fm${i}`, ry: 0, color: cols[i % 4], stripe: 0xfffbe8 }); i++;
    }
  }
  sign(G, ['본관 뒤 숲길', '천천히 걸어요'], { w: 2.4, h: 1.0, x: -18, y: heightAt(-18, 14) + 1.5, z: 14, ry: 0.4, bg: '#3f6b4a', size: 84, tw: 600 });
  // 반짝이는 잎 (줍기)
  const glowLeaves = [];
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.16); leafShape.quadraticCurveTo(0.14, 0, 0, 0.16); leafShape.quadraticCurveTo(-0.14, 0, 0, -0.16);
  const glowGeo = new THREE.ShapeGeometry(leafShape);
  for (let i = 0; i < 6; i++) {
    const p = path[6 + i * 7];
    const m = add(G, glowGeo, new THREE.MeshStandardMaterial({ color: 0x9be07a, emissive: 0x7fdc6a, emissiveIntensity: 0.8, side: THREE.DoubleSide }), p.x + 0.6, heightAt(p.x, p.z) + 0.9, p.z, { cast: false });
    m.userData.base = m.position.y;
    m.scale.setScalar(2);
    glowLeaves.push(m);
    spot(S, { id: `leaf${i}`, label: '반짝이는 잎', pos: [p.x + 0.6, heightAt(p.x, p.z) + 1.5, p.z], at: [p.x, p.z], show: 14, onUse: () => {
      m.visible = false; api.audio.play('rustle'); api.audio.play('sparkle'); api.act('nod');
      api.say('forest', { kicker: '잎에 적힌 말' });
      S.spots = S.spots.filter((s) => s.id !== `leaf${i}`);
      api.labels.remove(`spot:leaf${i}`);
      setTimeout(() => { m.visible = true; S.spots.push(sp); }, 40000);
    } });
    const sp = S.spots[S.spots.length - 1];
  }

  // 본관 뒷면(남쪽 끝)
  {
    const tex = brickTexture().clone(); tex.needsUpdate = true; tex.repeat.set(16, 3);
    block(G, 70, 9, 3, 0, 0, 0, 30, { material: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }) });
    S.colliders.push(rect(0, 30, 70, 3.2));
    sign(G, ['앞마당으로', '본관 · 운동장'], { w: 2.6, h: 1.0, x: 18, y: 1.6, z: 27.6, bg: '#22305a', size: 84, tw: 640 });
    spot(S, { id: 'to-front', label: '앞마당으로', kind: 'door', pos: [18, 3.4, 27], at: [18, 25.4], onUse: () => api.go('field') });
  }

  S.spawns = {
    forest: { x: -20.5, z: 12, ry: Math.PI, camera: { yaw: -0.35, pitch: 0.42, dist: 11 } },
    annex: { x: 2, z: -36.5, ry: Math.PI, camera: { yaw: 0.25, pitch: 0.4, dist: 13 } },
    main: { x: 18, z: 24, ry: Math.PI },
  };
  S.camera = { yaw: 0, pitch: 0.38, dist: 11, minDist: 4, maxDist: 34, minPitch: 0.08, maxPitch: 1.25, lookHeight: 1.0 };
  S.bounds = { minX: -34, maxX: 26, minZ: -46.2, maxZ: 27.6 };

  // ── 활동 ──
  let breathing = null;
  function breathe() {
    if (breathing) return;
    const el = document.createElement('div');
    el.className = 'breath on';
    el.innerHTML = '<i></i><b>들이쉬고</b><small>20초 숲 호흡</small>';
    document.body.appendChild(el);
    const ring = el.querySelector('i'), word = el.querySelector('b'), small = el.querySelector('small');
    const t0 = performance.now();
    api.hold('rest');
    breathing = { el, t0 };
    const steps = [[0, 4, '들이쉬고', 'in'], [4, 6, '잠깐 멈추고', 'hold'], [6, 10, '천천히 내쉬고', 'out'], [10, 14, '들이쉬고', 'in'], [14, 16, '잠깐 멈추고', 'hold'], [16, 20, '천천히 내쉬고', 'out']];
    let last = -1;
    const tick = () => {
      if (!breathing) return;
      const s = (performance.now() - t0) / 1000;
      const i = steps.findIndex(([a, b]) => s >= a && s < b);
      if (i !== last && i >= 0) { last = i; if (steps[i][3] === 'in') api.audio.play('breathIn'); if (steps[i][3] === 'out') api.audio.play('breathOut'); }
      if (i < 0) { endBreath(true); return; }
      const [a, b, w, k] = steps[i];
      const f = (s - a) / (b - a);
      const scale = k === 'in' ? 0.55 + 0.45 * f : k === 'out' ? 1 - 0.45 * f : 1;
      ring.style.transform = `scale(${scale})`;
      word.textContent = w;
      small.textContent = `${Math.ceil(20 - s)}초`;
      requestAnimationFrame(tick);
    };
    tick();
  }
  function endBreath(done) {
    if (!breathing) return;
    breathing.el.classList.remove('on');
    const el = breathing.el; setTimeout(() => el.remove(), 500);
    breathing = null;
    api.hold(api.player.seat ? null : null);
    if (done) { api.count('breath'); api.say('forest', { kicker: '20초 숲 호흡 끝 · 잘했어요' }); api.audio.play('soft'); }
  }

  S.actions = () => {
    const nearForest = api.player.pos.x < -14;
    const list = [];
    if (nearForest) {
      list.push({ id: 'breath', label: '20초 숲 호흡', icon: 'wind', primary: true, onClick: () => { const s = api.freeSeat({ x: -26, z: -12 }); if (s && !api.player.seat && Math.hypot(api.player.pos.x - s.x, api.player.pos.z - s.z) < 30) { api.sit(s); setTimeout(breathe, 1800); } else breathe(); } });
      list.push({ id: 'treesay', label: '나무에게 듣기', icon: 'tree', onClick: () => { api.audio.play('bird'); api.say('forest', { kicker: '숲이 하는 말' }); } });
      list.push({ id: 'go-annex', label: `${SCHOOL.campus.annex} 앞으로`, icon: 'leaf', onClick: () => api.walkTo(2, -36.5) });
    } else {
      list.push({ id: 'leafwatch', label: '벤치에서 낙엽 보기', icon: 'leaf', primary: true, onClick: () => { const s = api.freeSeat({ x: 2, z: -38.5 }); if (s) api.sit(s); else api.say('annex'); } });
      list.push({ id: 'catch', label: '낙엽 잡기', icon: 'sparkle', onClick: () => catchLeaf() });
      list.push({ id: 'go-forest', label: '숲길로', icon: 'tree', onClick: () => api.walkTo(-21, 6) });
    }
    return list;
  };
  let caught = 0;
  function catchLeaf() {
    // 캐릭터 가까이 떨어지는 잎 하나를 잡는다
    const v = new THREE.Vector3();
    let best = -1, bd = Infinity;
    for (let i = 0; i < 170; i++) {
      falling.positionOf(i, v);
      const d = Math.hypot(v.x - api.player.pos.x, v.z - api.player.pos.z) + Math.abs(v.y - (api.player.pos.y + 1.6)) * 0.5;
      if (v.y > L3 + 0.2 && d < bd) { bd = d; best = i; }
    }
    api.act('jump');
    if (best < 0 || bd > 9) { api.say('낙엽이 손끝을 스쳐 갔어요. 한 번 더!', { kicker: '아깝다' }); api.audio.play('rustle'); return; }
    falling.positionOf(best, v);
    api.fx.burst({ origin: v.clone(), count: 18, speed: [0.6, 1.6], up: 1.4, gravity: 2, colors: ['#f2c230', '#e0603a', '#ffffff'], size: 0.09, life: [0.8, 1.4] });
    falling.respawn(best);
    caught++;
    api.audio.play('sparkle'); api.audio.play('rustle');
    api.count('leaf');
    api.say('annex', { kicker: `낙엽 ${caught}장 잡았어요` });
  }

  S.onSit = (seat) => {
    if (seat.id.startsWith('an') || seat.id.startsWith('dm')) {
      falling.intensity = 2.2;
      api.hold('rest');
      api.rig.goalPitch = seat.lie ? 0.2 : 0.16; api.rig.goalLookUp = seat.lie ? 3 : 1.6; api.rig.goalDist = 7.5;
      api.say('annex', { kicker: seat.lie ? '누워서 낙엽 보기' : '낙엽 보기' });
    } else if (seat.id.startsWith('f')) {
      api.hold('rest');
      api.rig.goalPitch = seat.lie ? 0.2 : 0.22; api.rig.goalLookUp = seat.lie ? 3 : 0; api.rig.goalDist = 8;
    }
  };
  S.onStand = () => { falling.intensity = 1; endBreath(false); api.rig.goalLookUp = 0; api.rig.goalPitch = 0.36; api.rig.goalDist = 11; };

  let lastZone = null, stepT = 0;
  const annexWins = [];
  G.traverse((o) => { if (o.name === 'annexwin') annexWins.push(o); });
  S.onTime = (p, sky) => { for (const w of annexWins) w.material.emissiveIntensity = Math.max(0, sky.night - 0.3) * 1.4; };
  S.update = (dt, t) => {
    falling.update(dt, t);
    for (const m of glowLeaves) { m.position.y = m.userData.base + Math.sin(t * 2 + m.position.x) * 0.12; m.rotation.y = t * 1.2; }
    const zone = api.player.pos.x < -14 ? 'forest' : 'annex';
    if (zone !== lastZone) { lastZone = zone; api.refreshDock(); api.audio.setAmbient(zone); }
    // 낙엽 마당을 걸으면 바스락
    if (api.player.moving > 0.3 && api.player.pos.z < -33 && api.player.pos.z > -46) { stepT -= dt; if (stepT <= 0) { stepT = 0.32; api.audio.play('leafStep'); } }
  };
  S.dispose = () => { endBreath(false); falling.dispose(); api.audio.setAmbient(null); };
  return S;
}
