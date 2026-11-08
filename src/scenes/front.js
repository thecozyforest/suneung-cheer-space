import * as THREE from 'three';
import { makeScene, floor, solid, spot, sign, forest, lamp, bench, lieMat, mat, rbox, add, block, C, rect } from './kit.js';
import { brickTexture, sandTexture, grassTexture, canvasTexture, roundRect } from '../engine/materials.js';
import { SCHOOL } from '../data/school.js';
import { dDayLabel, parseSeoulLocal, seoulParts, DOW_KO } from '../data/time.js';
import { WISHES } from '../data/phrases.js';

/**
 * 앞마당: 정문 → 동쪽 경사로 → 계단식 앞마당 → 붉은 벽돌 L자 본관, 남쪽 넓은 흙 운동장과 서쪽 물결 차양 관람석.
 * 배치는 개략 표현이다. 거리·높이는 줄여서 그렸다. 자기 학교 모양으로 좌표를 고쳐 쓴다.
 */
/** '2026-11-19' → '2026. 11. 19.(목)' */
function examDateLabel() {
  const p = seoulParts(parseSeoulLocal(`${SCHOOL.examDate}T09:00`));
  return `${p.y}. ${p.mo}. ${p.d}.(${DOW_KO[p.dow]})`;
}

const TOP = 1.6;           // 앞마당 높이
const STAIRS = [-22, 0, 22];
const RAMP = { x0: 38, x1: 42, zTop: -4, zBot: 10 };

export function heightAt(x, z) {
  if (z <= -4) return TOP;
  for (const sx of STAIRS) if (Math.abs(x - sx) <= 2.25 && z < -1) return TOP * (-1 - z) / 3;
  if (x >= RAMP.x0 && x <= RAMP.x1 && z < RAMP.zBot) return TOP * (RAMP.zBot - z) / (RAMP.zBot - RAMP.zTop);
  return 0;
}

function hipRoof(w, d, h) {
  const hw = w / 2, hd = d / 2, r = Math.max(0, hw - hd);
  const V = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [-r, h, 0], [r, h, 0]];
  const F = [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [2, 1, 5], [0, 3, 4]];
  const pos = [];
  for (const f of F) for (const i of f) pos.push(...V[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** 붉은 벽돌 건물: 벽·층 띠·창문(밤에 불 켜짐)·지붕 */
function brickBuilding(S, { x, z, w, d, floors = 5, fh = 2.1, base = TOP, faces = ['s'], winStep = 2.2, roofH = 2.6, glassLit, glassDark, frames, rng }) {
  const H = floors * fh + 0.6;
  const tex = brickTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(w / 3.2, H / 2.2);
  const wallM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  const body = add(S.group, new THREE.BoxGeometry(w, H, d), wallM, x, base + H / 2, z);
  body.userData.keepGeo = false;
  // 층 띠 (밝은 돌)
  const bandM = mat(0xe6d8c3);
  for (let f = 1; f <= floors; f++) block(S.group, w + 0.12, 0.12, d + 0.12, 0, x, base + f * fh + 0.25, z, { material: bandM, cast: false });
  block(S.group, w + 0.3, 0.35, d + 0.3, 0, x, base + H - 0.1, z, { material: mat(0xd9c8b0) });
  // 기단
  block(S.group, w + 0.2, 0.5, d + 0.2, 0, x, base, z, { material: mat(0x9c8f80) });
  // 지붕
  const roof = add(S.group, hipRoof(w + 1.0, d + 1.0, roofH), mat(C.roof, { flatShading: true, roughness: 0.8 }), x, base + H + 0.25, z);
  roof.userData.keepGeo = false;
  // 창문 자리
  const dummy = new THREE.Object3D();
  const put = (px, py, pz, ry) => {
    dummy.position.set(px, py, pz); dummy.rotation.set(0, ry, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    frames.list.push(dummy.matrix.clone());
    (rng() < 0.72 ? glassLit : glassDark).list.push(dummy.matrix.clone());
  };
  for (const f of faces) {
    const along = f === 's' || f === 'n' ? w : d;
    const n = Math.floor((along - 1.2) / winStep);
    const start = -((n - 1) * winStep) / 2;
    for (let fl = 0; fl < floors; fl++) {
      const py = base + 0.6 + fl * fh + 0.95;
      for (let i = 0; i < n; i++) {
        const o = start + i * winStep;
        if (f === 's') put(x + o, py, z + d / 2 + 0.02, 0);
        if (f === 'n') put(x - o, py, z - d / 2 - 0.02, Math.PI);
        if (f === 'e') put(x + w / 2 + 0.02, py, z - o, Math.PI / 2);
        if (f === 'w') put(x - w / 2 - 0.02, py, z + o, -Math.PI / 2);
      }
    }
  }
  solid(S, x, z, w, d, 0.1);
  return { H };
}

function ddayTexture(d, night) {
  return canvasTexture(1024, 400, (g, w, h) => {
    g.fillStyle = '#1d2a50'; roundRect(g, 0, 0, w, h, 34); g.fill();
    g.strokeStyle = 'rgba(233,180,76,.55)'; g.lineWidth = 6; roundRect(g, 18, 18, w - 36, h - 36, 24); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#e9b44c';
    g.font = `900 ${d.phase === 'after' ? 120 : 190}px Pretendard, 'Malgun Gothic', sans-serif`;
    g.fillText(d.text, 64, h / 2 + 8);
    g.textAlign = 'right';
    g.fillStyle = '#ffffff';
    g.font = `800 62px Pretendard, 'Malgun Gothic', sans-serif`;
    g.fillText(d.phase === 'after' ? `${SCHOOL.short}, 모두 수고했어요` : `${SCHOOL.short} 3학년`, w - 64, h / 2 - 50);
    g.font = `800 62px Pretendard, 'Malgun Gothic', sans-serif`;
    g.fillText(d.phase === 'after' ? '다음 계절도 너답게' : '수능 대박!', w - 64, h / 2 + 30);
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.font = `600 30px Pretendard, 'Malgun Gothic', sans-serif`;
    g.fillText(`${SCHOOL.examLabel} · ${examDateLabel()}`, w - 64, h / 2 + 104);
  }, { repeat: [1, 1] });
}

export function buildFront(api) {
  const S = makeScene({ outdoor: true, heightAt, ambient: 'field' });
  const G = S.group;
  let seed = 11;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── 땅 ──
  const gt = grassTexture().clone(); gt.needsUpdate = true; gt.repeat.set(40, 40);
  floor(S, 320, 320, 0, 0, new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }), -0.02);
  const st = sandTexture().clone(); st.needsUpdate = true; st.repeat.set(10, 5);
  floor(S, 66, 31, 1, 14.5, new THREE.MeshStandardMaterial({ map: st, roughness: 1 }), 0.005);
  // 운동장 선
  const lineM = mat(0xffffff, { roughness: 0.6 });
  const line = (x, z, w, d) => add(G, new THREE.BoxGeometry(w, 0.02, d), lineM, x, 0.015, z, { cast: false });
  line(1, 1.5, 62, 0.14); line(1, 27.5, 62, 0.14); line(-30, 14.5, 0.14, 26); line(32, 14.5, 0.14, 26); line(1, 14.5, 0.14, 26);
  const circle = add(G, new THREE.RingGeometry(4, 4.14, 48), lineM, 1, 0.016, 14.5, { cast: false }); circle.rotation.x = -Math.PI / 2;
  for (const gx of [-30, 32]) {
    const side = gx < 0 ? -1 : 1;
    line(gx - side * 3, 14.5, 0.12, 9); line(gx - side * 1.5, 10, 3, 0.12); line(gx - side * 1.5, 19, 3, 0.12);
    // 골대
    const postM = mat(0xffffff, { roughness: 0.4 });
    for (const pz of [11.8, 17.2]) { add(G, new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), postM, gx, 1.1, pz); solid(S, gx, pz, 0.3, 0.3); }
    add(G, new THREE.CylinderGeometry(0.07, 0.07, 5.4, 8), postM, gx, 2.2, 14.5, { rx: Math.PI / 2 });
    const net = add(G, new THREE.PlaneGeometry(5.4, 2.2, 12, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 }), gx + side * 0.9, 1.1, 14.5, { ry: Math.PI / 2, cast: false });
    net.rotation.z = side * 0.25;
  }

  // ── 앞마당 단·옹벽·계단·경사로 ──
  const pave = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,105,90,.22)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    for (let j = 0; j <= h; j += 64) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
  }, { repeat: [24, 12] });
  floor(S, 96, 40, -4, -24, new THREE.MeshStandardMaterial({ map: pave, roughness: 0.95 }), TOP);
  block(G, 96, TOP - 0.02, 40, 0, -4, 0, -24, { material: mat(0xbdb4a5), cast: false });
  // 옹벽 앞면 돌
  block(G, 96, TOP, 0.3, 0, -4, 0, -3.95, { material: mat(0xa79c8c) });
  // 난간
  const railM = mat(0xf4f1ea, { roughness: 0.5 });
  const rails = [];
  let xs = -52;
  const gaps = [...STAIRS.map((s) => [s - 2.3, s + 2.3]), [RAMP.x0 - 0.2, RAMP.x1 + 0.2]].sort((a, b) => a[0] - b[0]);
  for (const [a, b] of gaps) { if (a > xs) rails.push([xs, a]); xs = b; }
  if (xs < 44) rails.push([xs, 44]);
  for (const [a, b] of rails) {
    const w = b - a, cx = (a + b) / 2;
    add(G, new THREE.BoxGeometry(w, 0.07, 0.07), railM, cx, TOP + 1.0, -4.15);
    add(G, new THREE.BoxGeometry(w, 0.05, 0.05), railM, cx, TOP + 0.55, -4.15, { cast: false });
    for (let px = a + 0.2; px < b; px += 1.6) add(G, new THREE.BoxGeometry(0.06, 1.0, 0.06), railM, px, TOP + 0.5, -4.15, { cast: false });
    S.colliders.push(rect(cx, -4.0, w, 0.6));
  }
  // 계단
  const stepM = mat(0xe1dace);
  for (const sx of STAIRS) {
    for (let i = 0; i < 8; i++) {
      const zz = -4 + (i + 0.5) * (3 / 8);
      const hh = TOP * (1 - (i + 1) / 8);
      block(G, 4.5, hh + 0.001, 3 / 8, 0, sx, 0, zz, { material: stepM, cast: false });
    }
    for (const side of [-1, 1]) { block(G, 0.3, TOP + 0.1, 3, 0, sx + side * 2.4, 0, -2.5, { material: mat(0xa79c8c) }); S.colliders.push(rect(sx + side * 2.4, -2.5, 0.4, 3)); }
    const ramp = new THREE.Mesh(new THREE.PlaneGeometry(4.5, Math.hypot(3, TOP)), new THREE.MeshBasicMaterial({ visible: false }));
    ramp.position.set(sx, TOP / 2, -2.5);
    ramp.rotation.set(-Math.PI / 2 + Math.atan(TOP / 3), 0, 0);
    G.add(ramp); S.ground.push(ramp);
  }
  // 동쪽 경사로
  {
    const len = Math.hypot(RAMP.zBot - RAMP.zTop, TOP);
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(RAMP.x1 - RAMP.x0, len), mat(0xc9c2b6, { roughness: 1 }));
    rm.position.set((RAMP.x0 + RAMP.x1) / 2, TOP / 2 + 0.01, (RAMP.zTop + RAMP.zBot) / 2);
    rm.rotation.set(-Math.PI / 2 + Math.atan(TOP / (RAMP.zBot - RAMP.zTop)), 0, 0);
    rm.receiveShadow = true;
    G.add(rm); S.ground.push(rm);
    for (const side of [RAMP.x0 - 0.25, RAMP.x1 + 0.25]) {
      const wall = add(G, new THREE.BoxGeometry(0.3, 0.9, len), railM, side, TOP / 2 + 0.45, (RAMP.zTop + RAMP.zBot) / 2);
      wall.rotation.x = Math.atan(TOP / (RAMP.zBot - RAMP.zTop));
      S.colliders.push(rect(side, 1.5, 0.45, 11));
    }
    // 정문까지 길
    floor(S, 6, 32, 40, 26, mat(0xcfc8bb, { roughness: 1 }), 0.008);
  }

  // ── 본관 (L자) ──
  const winGeo = new THREE.BoxGeometry(1.05, 1.25, 0.08);
  const frameGeo = new THREE.BoxGeometry(1.3, 1.5, 0.05);
  const glassLit = { list: [], m: new THREE.MeshStandardMaterial({ color: 0x41606f, roughness: 0.25, metalness: 0.1, emissive: 0xffd28a, emissiveIntensity: 0 }) };
  const glassDark = { list: [], m: new THREE.MeshStandardMaterial({ color: 0x3a5664, roughness: 0.25, metalness: 0.1 }) };
  const frames = { list: [], m: mat(0xf1e9dc) };
  brickBuilding(S, { x: 0, z: -21.5, w: 68, d: 11, faces: ['s', 'e', 'n'], glassLit, glassDark, frames, rng });
  brickBuilding(S, { x: -40, z: -16, w: 12, d: 22, faces: ['e', 's', 'w'], glassLit, glassDark, frames, rng, roofH: 2.4 });
  for (const grp of [glassLit, glassDark, frames]) {
    const geo = grp === frames ? frameGeo : winGeo;
    const im = new THREE.InstancedMesh(geo, grp.m, grp.list.length);
    grp.list.forEach((m, i) => {
      if (grp === frames) { const mm = m.clone(); const o = new THREE.Vector3(0, 0, -0.025).applyMatrix4(new THREE.Matrix4().extractRotation(m)); mm.elements[12] += o.x; mm.elements[13] += o.y; mm.elements[14] += o.z; im.setMatrixAt(i, mm); } else im.setMatrixAt(i, m);
    });
    im.castShadow = false; im.receiveShadow = true;
    G.add(im);
  }
  // 학교 이름 판
  sign(G, SCHOOL.name, { w: 9, h: 1.2, x: 2, y: TOP + 11.2, z: -15.88, bg: '#f7f1e6', fg: '#22305a', size: 150, tw: 1400 });
  // 현관 차양
  {
    const px = 2, pz = -14.2;
    add(G, rbox(7, 0.35, 4, 0.05), mat(0xfbfaf6), px, TOP + 3.3, pz);
    for (const cx of [-3, 3]) for (const cz of [-1.6, 1.6]) { add(G, new THREE.CylinderGeometry(0.16, 0.16, 3.2, 12), mat(0xfbfaf6), px + cx, TOP + 1.6, pz + cz); if (cz > 0) solid(S, px + cx, pz + cz, 0.4, 0.4); }
    add(G, rbox(4, 2.6, 0.12, 0.04), mat(0x7fa4b3, { roughness: 0.15, metalness: 0.2 }), px, TOP + 1.3, -15.95);
    add(G, new THREE.BoxGeometry(0.06, 2.6, 0.14), mat(0x6b6f78), px, TOP + 1.3, -15.9);
    spot(S, { id: 'enter-main', label: '본관 들어가기', kind: 'door', pos: [px, TOP + 4.4, pz], at: [px, -12.6], onUse: () => { api.audio.play('door'); api.go('hall'); } });
  }

  // ── D-day 전광판 ──
  const board = new THREE.Group();
  board.position.set(-12, TOP, -6.6);
  for (const bx of [-3.2, 3.2]) add(board, new THREE.CylinderGeometry(0.1, 0.12, 3.9, 10), mat(0x3d4250, { metalness: 0.4 }), bx, 1.95, -0.05);
  add(board, rbox(7.3, 2.95, 0.22, 0.08), mat(0x141c36), 0, 2.55, -0.1);
  let dd = dDayLabel(SCHOOL.examDate);
  const boardTex = ddayTexture(dd);
  const boardM = new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.25, roughness: 0.6 });
  add(board, new THREE.PlaneGeometry(6.9, 2.7), boardM, 0, 2.55, 0.02, { cast: false });
  // 테두리 전구
  const bulbs = [];
  const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const per = 2 * (6.9 + 2.7);
  const NB = 44;
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffffff, emissiveIntensity: 0.2, toneMapped: false }), NB);
  const dm = new THREE.Object3D();
  for (let i = 0; i < NB; i++) {
    let t = (i / NB) * per, px, py;
    if (t < 6.9) { px = -3.45 + t; py = 3.95; } else if ((t -= 6.9) < 2.7) { px = 3.45; py = 3.95 - t; } else if ((t -= 2.7) < 6.9) { px = 3.45 - t; py = 1.2; } else { t -= 6.9; px = -3.45; py = 1.2 + t; }
    dm.position.set(px, py, 0.06); dm.updateMatrix(); bulbMesh.setMatrixAt(i, dm.matrix); bulbMesh.setColorAt(i, new THREE.Color(0x553f1a));
    bulbs.push(i);
  }
  bulbMesh.instanceColor.needsUpdate = true;
  board.add(bulbMesh);
  G.add(board);
  S.colliders.push(rect(-12, -6.65, 7.2, 0.5));
  spot(S, { id: 'board', label: `전광판 ${dd.text}`, pos: [-12, TOP + 4.6, -6.6], at: [-12, -5.2], face: Math.PI, onUse: () => { const l = api.dayLine('board'); api.say(l.text, { kicker: `${l.name} · 오늘의 응원` }); api.audio.play('sparkle'); } });

  // ── 물결 차양 관람석 (운동장 서쪽) ──
  {
    const baseX = -33.4;
    const tierM = mat(0xd8d2c6), seatM = mat(0x5f8fc9, { roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      block(G, 0.85, 0.45 * (i + 1), 22, 0, baseX - 0.45 - i * 0.85, 0, 14, { material: tierM });
      if (i < 2) for (let k = 0; k < 9; k++) add(G, rbox(0.55, 0.08, 1.6, 0.03), seatM, baseX - 0.45 - i * 0.85, 0.45 * (i + 1) + 0.04, 5.5 + k * 2.1, { cast: false });
    }
    S.colliders.push(rect(baseX - 1.3, 14, 2.8, 22));
    // 물결 지붕
    const roofGeo = new THREE.PlaneGeometry(26, 6.2, 52, 4);
    const p = roofGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin(u * 0.75) * 0.32 + v * 0.08); }
    roofGeo.computeVertexNormals();
    const canopy = add(G, roofGeo, new THREE.MeshStandardMaterial({ color: 0xfbfaf6, side: THREE.DoubleSide, roughness: 0.5 }), baseX - 2.0, 4.6, 14, { rx: -Math.PI / 2, rz: Math.PI / 2 });
    canopy.rotation.set(-Math.PI / 2 + 0.12, 0, Math.PI / 2);
    for (let k = 0; k < 7; k++) { add(G, new THREE.CylinderGeometry(0.09, 0.09, 4.6, 8), mat(0xe8e4dc), baseX - 4.4, 2.3, 3 + k * 3.7); }
    // 앉을 자리 (관람석 1·2단)
    for (let i = 0; i < 2; i++) for (let k = 0; k < 6; k++) {
      const topY = 0.45 * (i + 1);
      S.seats.push({ id: `bl${i}${k}`, x: baseX - 0.4 - i * 0.85, z: 6.5 + k * 3.0 + i * 1.5, y: topY - 0.45, h: 0.47, ry: Math.PI / 2, look: true });
    }
    spot(S, { id: 'bleacher', label: '물결 차양 관람석', pos: [baseX - 1, 5.6, 14], at: [baseX + 1.4, 14], onUse: () => { const s = api.freeSeat({ x: baseX, z: 14 }); if (s) api.sit(s); } });
    sign(G, '물결 차양 관람석', { w: 3.2, h: 0.5, x: baseX + 0.05, y: 1.7, z: 2.7, ry: Math.PI / 2, bg: '#22305a', size: 110, tw: 900 });
  }

  // ── 정문 · 담장 ──
  {
    const pillarM = new THREE.MeshStandardMaterial({ map: (() => { const t = brickTexture().clone(); t.needsUpdate = true; t.repeat.set(0.6, 1.2); return t; })(), roughness: 0.9 });
    for (const gx of [36.4, 43.6]) { block(G, 1.3, 3.2, 1.3, 0, gx, 0, 41, { material: pillarM }); block(G, 1.5, 0.25, 1.5, 0, gx, 3.2, 41, { material: mat(0xd9c8b0) }); solid(S, gx, 41, 1.4, 1.4); }
    const wallM = mat(0xcfc6b6);
    block(G, 40, 1.1, 0.5, 0, 15.6, 0, 41, { material: wallM }); S.colliders.push(rect(15.6, 41, 40, 0.6));
    block(G, 40, 1.1, 0.5, 0, 64.4, 0, 41, { material: wallM }); S.colliders.push(rect(64.4, 41, 40, 0.6));
    const fenceM = mat(0x3f4a55, { metalness: 0.3 });
    for (let fx = -4; fx < 35.6; fx += 0.6) add(G, new THREE.BoxGeometry(0.04, 1.0, 0.04), fenceM, fx, 1.6, 41, { cast: false });
    add(G, new THREE.BoxGeometry(39.6, 0.05, 0.05), fenceM, 15.8, 2.05, 41, { cast: false });
    sign(G, SCHOOL.name, { w: 6.4, h: 0.9, x: 31.5, y: 0.62, z: 41.27, bg: '#f2ebdd', fg: '#2b2a33', size: 150, tw: 1300 });
    sign(G, SCHOOL.short, { w: 1.0, h: 0.4, x: 36.4, y: 2.4, z: 41.67, bg: '#22305a', size: 130, tw: 420 });
  }

  // ── 뒤뜰 가는 길 ──
  floor(S, 5, 20, 39.5, -22, mat(0xcfc8bb, { roughness: 1 }), TOP + 0.01);
  sign(G, ['뒤뜰 가는 길', `숲길 · 강당 · ${SCHOOL.campus.annex}`], { w: 2.6, h: 1.2, x: 37.6, y: TOP + 2.0, z: -27, ry: -0.4, bg: '#3f6b4a', size: 90, tw: 700 });
  add(G, new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), mat(0x5a4636), 37.6, TOP + 1.1, -27.15);
  spot(S, { id: 'to-rear', label: '뒤뜰로 가기', kind: 'door', pos: [39.5, TOP + 3.6, -29], at: [39.5, -27.5], onUse: () => api.go('forest') });

  // ── 나무 ──
  const trees = [];
  for (let x = -30; x <= 36; x += 5.5) if (!STAIRS.some((s) => Math.abs(x - s) < 3.5)) trees.push({ x, z: -5.6, y: TOP, s: 0.75, kind: 'round' });
  for (let x = -31; x <= 36; x += 2.2) if (!STAIRS.some((s) => Math.abs(x - s) < 3.2)) trees.push({ x: x + 1, z: -4.9, y: TOP, s: 0.7, kind: 'shrub' });
  for (let z = -2; z < 24; z += 4.5) trees.push({ x: 35.6 + rng() * 0.6, z, s: 0.95 + rng() * 0.3, kind: 'round' });
  for (let z = -2; z < 16; z += 5) trees.push({ x: 46 + rng(), z: z + 2, s: 1 + rng() * 0.3, kind: rng() > 0.5 ? 'round' : 'pine' });
  for (let x = -40; x < 34; x += 4.2) trees.push({ x, z: 35 + rng() * 1.5, s: 0.9 + rng() * 0.4, kind: rng() > 0.45 ? 'pine' : 'round' });
  for (let z = 2; z < 36; z += 4) trees.push({ x: -45 - rng() * 3, z, s: 1 + rng() * 0.4, kind: 'round' });
  // 뒷산 숲
  for (let i = 0; i < 260; i++) {
    const x = -90 + rng() * 180, z = -36 - rng() * 70;
    trees.push({ x, z, y: TOP + Math.max(0, (-36 - z) * 0.32) + Math.sin(x * 0.07) * 2, s: 1.1 + rng() * 0.9, kind: rng() > 0.4 ? 'round' : 'pine' });
  }
  forest(G, trees);
  // 뒷산 언덕
  const hillM = mat(0x7da35b, { flatShading: true, roughness: 1 });
  for (const [hx, hz, hs, hy] of [[-60, -95, 50, 22], [10, -110, 70, 30], [70, -95, 48, 20], [-20, -80, 40, 14], [45, -70, 32, 10]]) {
    const hill = add(G, new THREE.IcosahedronGeometry(1, 2), hillM, hx, TOP - hs * 0.25, hz, { cast: false });
    hill.scale.set(hs, hy, hs * 0.7);
  }
  // 가로등
  const lampBulbs = [];
  for (const [lx, lz, ly] of [[34, 2, 0], [34, 22, 0], [-26, -6.2, TOP], [26, -6.2, TOP], [43, 30, 0], [-36, 1, 0]]) lampBulbs.push(lamp(G, lx, lz, { y: ly }));

  S.spawns = {
    gate: { x: 40, z: 37.5, ry: Math.PI + 0.5, camera: { yaw: 0.42, pitch: 0.5, dist: 26 } },
    field: { x: 0, z: 12, ry: Math.PI, camera: { yaw: 0.0, pitch: 0.42, dist: 20 } },
    main: { x: 2, z: -9, ry: 0 },
  };
  S.camera = { yaw: 0, pitch: 0.4, dist: 14, minDist: 5, maxDist: 46, minPitch: 0.1, maxPitch: 1.3, lookHeight: 1.0 };
  S.bounds = { minX: -60, maxX: 66, minZ: -34, maxZ: 40.4 };
  S.colliders.push(rect(-40, -16, 12.2, 22.2));

  // ── 활동 ──
  const balloons = [];
  function launchBalloon(wish) {
    const g = new THREE.Group();
    const colors = [0xff8fa3, 0x7fc8ff, 0xffd65a, 0xa6e3a1, 0xc6a8ff];
    const b = add(g, new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.35 }), 0, 0, 0);
    b.scale.set(1, 1.18, 1);
    add(g, new THREE.ConeGeometry(0.07, 0.12, 8), b.material, 0, -0.52, 0, { rx: Math.PI });
    add(g, new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), mat(0xffffff), 0, -1.35, 0, { cast: false });
    g.position.copy(api.player.pos).add(new THREE.Vector3(0.3, 2.6, 0));
    G.add(g);
    const id = `deco:balloon${Date.now()}`;
    api.labels.set(id, { text: wish, cls: 'bubble', getPos: (v) => v.copy(g.position).add(new THREE.Vector3(0, 0.9, 0)) });
    balloons.push({ g, t: 0, id, ph: Math.random() * 6 });
  }

  S.actions = () => [
    { id: 'cheer', label: '다 같이 화이팅', icon: 'sparkle', primary: true, onClick: () => { api.act('cheer'); api.audio.play('sparkle'); api.count('cheer'); api.fx.burst({ origin: api.player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), count: 40, speed: [1.5, 3.5], up: 4, gravity: 6 }); api.say('field', { kicker: '화이팅!' }); } },
    { id: 'balloon', label: '소원 풍선', icon: 'balloon', onClick: () => openWish() },
    { id: 'stretch', label: '스트레칭', icon: 'stretch', onClick: () => { api.act('stretch'); api.say('field', { kicker: '쭉쭉' }); } },
    { id: 'firework', label: '폭죽', icon: 'firework', onClick: () => { for (let i = 0; i < 3; i++) setTimeout(() => { api.fx.firework(new THREE.Vector3(-10 + Math.random() * 24, 0, 8 + Math.random() * 12)); api.audio.play('whistle'); setTimeout(() => api.audio.play('firework'), 900); }, i * 380); api.count('firework'); } },
  ];
  function openWish() {
    api.hud.openPanel({
      title: '소원 풍선', sub: '하나 고르면 풍선에 실어 하늘로 보내요. 같은 공간 친구들에게도 풍선이 보여요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${WISHES.map((w, i) => `<button class="choice" data-i="${i}">${w}</button>`).join('')}</div>`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
          api.hud.closePanel();
          const w = WISHES[+b.dataset.i];
          api.act('throw');
          launchBalloon(w);
          api.presence.action(`bl${b.dataset.i}`);
          api.audio.play('balloon');
          api.count('balloon');
          api.say('field', { kicker: `풍선에 실었어요 · ${w}` });
        }));
      },
    });
  }
  S.launchBalloon = launchBalloon;

  // 운동장 남쪽 잔디: 벤치와 돗자리 (앉거나 누워서 하늘 보기)
  [-20, -10, 0, 10, 20].forEach((bx, i) => bench(S, bx, 31.5, Math.PI, { idPrefix: `fb${i}`, color: 0xa77b52 }));
  {
    const cols = [0xf4b6c2, 0xa8d8ff, 0xffd9a0, 0xc6a8ff, 0xb8e6c1];
    let i = 0;
    for (const mx of [-18, -16.5, -8, -6.5, 2, 3.5, 12, 13.5]) { const m = lieMat(S, mx, 33.6, { id: `fl${i}`, ry: 0, color: cols[i % 5] }); m.look = true; i++; }
  }
  S.onSit = (seat) => {
    if (seat.look) {
      if (!seat.lie) api.hold('look');
      api.rig.goalLookUp = seat.lie ? 3.2 : 5; api.rig.goalPitch = seat.lie ? 0.2 : 0.12; api.rig.goalDist = 7;
      api.say('field', { kicker: '하늘 보기' });
    }
  };
  S.onStand = () => { api.rig.goalLookUp = 0; api.rig.goalPitch = 0.34; api.rig.goalDist = 13; };

  // ── 시간 ──
  let fwT = 3, nightNow = 0, chase = 0;
  S.onTime = (p, sky) => {
    nightNow = sky.night;
    glassLit.m.emissiveIntensity = Math.max(0, (sky.night - 0.25)) * 1.6;
    boardM.emissiveIntensity = 0.25 + sky.night * 0.9;
    for (const b of lampBulbs) b.material.emissiveIntensity = 0.2 + sky.night * 2.2;
    const nd = dDayLabel(SCHOOL.examDate);
    if (nd.text !== dd.text) { dd = nd; const t = ddayTexture(dd); boardM.map.dispose(); boardM.map = t; boardM.emissiveMap = t; boardM.needsUpdate = true; }
  };
  const col = new THREE.Color();
  S.update = (dt, t) => {
    // 밤: 전구가 돌고 운동장에 폭죽
    chase += dt * (nightNow > 0.5 ? 9 : 2.5);
    for (let i = 0; i < NB; i++) {
      const on = nightNow > 0.5 ? ((i + Math.floor(chase)) % 4 === 0) : ((i + Math.floor(chase)) % 11 === 0);
      bulbMesh.setColorAt(i, on ? col.set(0xffe08a) : col.set(nightNow > 0.5 ? 0x8a6a2a : 0x6b5530));
    }
    bulbMesh.material.emissiveIntensity = nightNow > 0.5 ? 2.2 : 0.6;
    bulbMesh.instanceColor.needsUpdate = true;
    if (nightNow > 0.6) {
      fwT -= dt;
      if (fwT <= 0) { fwT = 4 + Math.random() * 5; api.fx.firework(new THREE.Vector3(-14 + Math.random() * 30, 0, 6 + Math.random() * 16)); if (api.spaceId === 'field' || Math.hypot(api.player.pos.x, api.player.pos.z - 14) < 40) setTimeout(() => api.audio.play('firework'), 900); }
    }
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i]; b.t += dt;
      b.g.position.y += dt * (1.2 + b.t * 0.15);
      b.g.position.x += Math.sin(t * 1.3 + b.ph) * dt * 0.4;
      b.g.rotation.z = Math.sin(t * 1.7 + b.ph) * 0.12;
      if (b.t > 4.5) api.labels.remove(b.id);
      if (b.t > 14) { G.remove(b.g); b.g.traverse((o) => { o.geometry?.dispose(); }); balloons.splice(i, 1); }
    }
  };
  // 다른 사람이 보낸 풍선
  S.onPeerAction = (peerPos, name) => {
    if (name.startsWith('bl')) {
      const w = WISHES[+name.slice(2)] || '';
      const g = new THREE.Group();
      const b = add(g, new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd65a, roughness: 0.35 }), 0, 0, 0); b.scale.set(1, 1.18, 1);
      add(g, new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), mat(0xffffff), 0, -1.35, 0, { cast: false });
      g.position.copy(peerPos).add(new THREE.Vector3(0.3, 2.6, 0));
      G.add(g);
      const id = `deco:balloon${Date.now()}${Math.random()}`;
      api.labels.set(id, { text: w, cls: 'bubble', getPos: (v) => v.copy(g.position).add(new THREE.Vector3(0, 0.9, 0)) });
      balloons.push({ g, t: 0, id, ph: Math.random() * 6 });
    }
  };
  S.dispose = () => { for (const b of balloons) api.labels.remove(b.id); };
  S.hint = null;
  return S;
}
