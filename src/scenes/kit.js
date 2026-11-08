import * as THREE from 'three';
import { mat, basic, rbox, add, block, textTexture, woodTexture, tileTexture, C } from '../engine/materials.js';
import { rect } from '../engine/player.js';

/** 장면 하나의 빈 틀 */
export function makeScene(extra = {}) {
  return {
    group: new THREE.Group(),
    colliders: [], ground: [], clickables: [], spots: [], seats: [], spawns: {},
    tickers: [], peerHandlers: [], // 여러 모듈이 함께 쓰는 매 프레임 함수 · 친구 동작 처리
    outdoor: false, offs: [],
    ...extra,
  };
}

/** 걸을 수 있는 바닥 (윗면 y) */
export function floor(S, w, d, x, z, material, y = 0, { visible = true } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.visible = visible;
  S.group.add(m);
  S.ground.push(m);
  return m;
}

export function solid(S, x, z, w, d, pad = 0) { S.colliders.push(rect(x, z, w, d, pad)); }

export function clickable(S, obj, fn) {
  obj.userData.onClick = fn;
  S.clickables.push(obj);
  return obj;
}

/** 공간 안 표시: 이름표를 누르면 걸어가서 실행 */
export function spot(S, { id, label, pos, at, face, onUse, kind = '', r, show, instant }) {
  const s = { id, label, pos: new THREE.Vector3(...pos), at: at ? { x: at[0], z: at[1] } : { x: pos[0], z: pos[2] + 1.2 }, face, onUse, kind, r, show, instant };
  S.spots.push(s);
  return s;
}

/** 간판(평면 글자) */
export function sign(parent, lines, { w = 2, h = 0.7, x = 0, y = 0, z = 0, ry = 0, bg = '#22305a', fg = '#ffffff', size, tw = 512, th, sub, border, emissive = 0 } = {}) {
  const texH = th || Math.round(tw * h / w);
  const tex = textTexture(lines, { w: tw, h: texH, bg, fg, size: size || Math.round(texH * 0.42), sub, border, radius: Math.round(texH * 0.12) });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, emissive: emissive ? new THREE.Color('#ffffff') : new THREE.Color('#000000'), emissiveMap: emissive ? tex : null, emissiveIntensity: emissive }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

// ── 나무 ── (같은 종류는 한 번에 그리는 InstancedMesh)
const crownGeo = new THREE.IcosahedronGeometry(1, 1);
const pineGeo = new THREE.ConeGeometry(1, 2.2, 7, 1);
const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1, 6);
const dummy = new THREE.Object3D();

/**
 * items: [{x,z,y?,s?,kind?}] — kind: round|pine|ginkgo|maple|autumn|shrub
 */
export function forest(parent, items, { shadows = true } = {}) {
  const kinds = {
    round: { colors: ['#7fae5b', '#6d9f4f', '#8dbb62', '#5f9147'] },
    pine: { colors: ['#3f6f45', '#4b7a4c', '#36613e'] },
    ginkgo: { colors: ['#f2c230', '#f5cf4a', '#e8b422'] },
    maple: { colors: ['#e0603a', '#d24b30', '#ec7a3e', '#c2412d'] },
    autumn: { colors: ['#e9a23b', '#d9772f', '#b9a03a', '#e0603a'] },
    shrub: { colors: ['#5f9147', '#6d9f4f', '#4f8243'] },
  };
  const byKind = {};
  for (const it of items) (byKind[it.kind || 'round'] ||= []).push(it);
  const trunks = items.filter((i) => i.kind !== 'shrub');
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, mat(C.trunk), trunks.length || 1);
  trunkMesh.castShadow = shadows; trunkMesh.receiveShadow = true;
  trunks.forEach((t, i) => {
    const s = t.s || 1;
    const th = (t.kind === 'pine' ? 1.1 : 1.5) * s;
    dummy.position.set(t.x, (t.y || 0) + th / 2, t.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, th, s); dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
  });
  trunkMesh.count = trunks.length;
  parent.add(trunkMesh);
  const col = new THREE.Color();
  for (const [kind, list] of Object.entries(byKind)) {
    const pine = kind === 'pine';
    const geo = pine ? pineGeo : crownGeo;
    const m = new THREE.InstancedMesh(geo, mat(0xffffff, { flatShading: true, roughness: 0.92 }), list.length * (pine ? 2 : kind === 'shrub' ? 1 : 3));
    m.castShadow = shadows; m.receiveShadow = true;
    let idx = 0;
    list.forEach((t, i) => {
      const s = t.s || 1;
      const base = t.y || 0;
      const c = kinds[kind].colors[i % kinds[kind].colors.length];
      if (pine) {
        for (let k = 0; k < 2; k++) {
          dummy.position.set(t.x, base + (1.6 + k * 1.1) * s, t.z); dummy.rotation.set(0, i, 0);
          dummy.scale.set((1.3 - k * 0.35) * s, (1 - k * 0.15) * s, (1.3 - k * 0.35) * s); dummy.updateMatrix();
          m.setMatrixAt(idx, dummy.matrix); m.setColorAt(idx, col.set(c)); idx++;
        }
      } else if (kind === 'shrub') {
        dummy.position.set(t.x, base + 0.45 * s, t.z); dummy.rotation.set(0, i * 1.3, 0); dummy.scale.set(0.8 * s, 0.55 * s, 0.8 * s); dummy.updateMatrix();
        m.setMatrixAt(idx, dummy.matrix); m.setColorAt(idx, col.set(c)); idx++;
      } else {
        // 큰 덩어리 하나 + 작은 덩어리 둘로 풍성하게
        const sy = kind === 'ginkgo' ? 1.3 : 1.0;
        const blobs = [[0, 2.35, 0, 1.25], [0.75, 2.0, 0.35, 0.8], [-0.6, 2.75, -0.3, 0.78]];
        const cc = new THREE.Color(c);
        blobs.forEach(([bx, by, bz, bs], k) => {
          const a = i * 1.7 + k;
          dummy.position.set(t.x + (bx * Math.cos(a) - bz * Math.sin(a)) * s, base + by * s * sy, t.z + (bx * Math.sin(a) + bz * Math.cos(a)) * s);
          dummy.rotation.set(i * 0.7 + k, i * 1.1 + k, 0); dummy.scale.set(bs * 1.1 * s, bs * s * sy, bs * 1.1 * s); dummy.updateMatrix();
          m.setMatrixAt(idx, dummy.matrix); m.setColorAt(idx, col.copy(cc).offsetHSL(0, 0, k === 2 ? 0.05 : k === 1 ? -0.03 : 0)); idx++;
        });
      }
    });
    m.count = idx;
    m.instanceColor.needsUpdate = true;
    parent.add(m);
  }
}

/** 나무 벤치. 앉을 자리 2개를 돌려준다(ry: 앉은 사람이 바라보는 방향) */
export function bench(S, x, z, ry = 0, { y = 0, idPrefix = 'b', color = C.wood } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  const wood = mat(color), iron = mat(0x4a4a52, { metalness: 0.3, roughness: 0.6 });
  for (let i = 0; i < 3; i++) add(g, rbox(1.8, 0.05, 0.12, 0.02), wood, 0, 0.44, -0.12 + i * 0.13);
  for (let i = 0; i < 2; i++) { const b = add(g, rbox(1.8, 0.09, 0.04, 0.02), wood, 0, 0.66 + i * 0.13, -0.24); b.rotation.x = -0.12; }
  for (const sx of [-0.78, 0.78]) { add(g, rbox(0.06, 0.44, 0.42, 0.02), iron, sx, 0.22, -0.04); add(g, rbox(0.05, 0.4, 0.05, 0.02), iron, sx, 0.62, -0.25); }
  S.group.add(g);
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const local = (lx, lz) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  const seats = [-0.45, 0.45].map((lx, i) => { const p = local(lx, -0.02); return { id: `${idPrefix}${i}`, x: p.x, z: p.z, y, ry, h: 0.45 }; });
  S.seats.push(...seats);
  // 충돌: 벤치 몸체
  const c = local(0, -0.08);
  const w = Math.abs(cos) * 1.9 + Math.abs(sin) * 0.55, d = Math.abs(sin) * 1.9 + Math.abs(cos) * 0.55;
  S.colliders.push(rect(c.x, c.z, w, d, -0.05));
  return { group: g, seats };
}

/**
 * 돗자리: 누워 쉬는 자리 하나. 머리는 ry의 반대쪽(-z 방향)에 둔다. 누우면 하늘이 보인다.
 * 반환: 자리 정보 {id,x,z,y,ry,h,lie}
 */
export function lieMat(S, x, z, { y = 0, ry = 0, id, color = 0xf4b6c2, stripe = 0xffffff } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  add(g, rbox(0.95, 0.05, 1.95, 0.02), mat(color, { roughness: 1 }), 0, 0.03, 0, { cast: false });
  for (const sx of [-0.3, 0, 0.3]) add(g, rbox(0.07, 0.056, 1.95, 0.01), mat(stripe, { roughness: 1 }), sx, 0.03, 0, { cast: false });
  add(g, rbox(0.46, 0.14, 0.3, 0.06), mat(0xfffbf4, { roughness: 1 }), 0, 0.1, -0.7, { cast: false });
  S.group.add(g);
  const seat = { id: id || `lm${S.seats.length}`, x, z, y, ry, h: 0.36, lie: true };
  S.seats.push(seat);
  return seat;
}

/** 바닥 방석 + 앉을 자리 하나(바닥에 앉는 자세) */
export function floorSeat(S, x, z, { y = 0, ry = 0, id, color = 0xb5762f, r = 0.4 } = {}) {
  const c = add(S.group, new THREE.CylinderGeometry(r, r * 1.05, 0.14, 18), mat(color, { roughness: 0.95 }), x, y + 0.07, z);
  const seat = { id: id || `fs${S.seats.length}`, x, z, y: y - 0.29, ry, h: 0.45 };
  S.seats.push(seat);
  return { mesh: c, seat };
}

/** 가로등 */
export function lamp(parent, x, z, { y = 0, h = 3.4 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  add(g, new THREE.CylinderGeometry(0.06, 0.08, h, 8), mat(0x3d4250, { metalness: 0.4, roughness: 0.5 }), 0, h / 2, 0);
  const bulb = add(g, new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff3d1, emissive: 0xffd98a, emissiveIntensity: 0.2 }), 0, h + 0.1, 0, { cast: false });
  add(g, new THREE.ConeGeometry(0.3, 0.2, 10), mat(0x3d4250), 0, h + 0.32, 0);
  parent.add(g);
  return bulb;
}

/**
 * 실내 방 틀. 카메라 쪽(남쪽, +z) 벽은 낮게 잘라 인형의 집처럼 들여다본다.
 * 반환: {floorMesh, wallMat}
 */
export function room(S, { w = 14, d = 10, h = 3.4, floorMat, wallColor = 0xf3ede2, lowerColor = 0xd9d1c3, trimColor = 0x6b5b4b, cut = 0.9, ceiling = false, backWall = true, sideWalls = true } = {}) {
  const fm = floorMat || new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.75 });
  if (fm.map) { fm.map = fm.map.clone(); fm.map.needsUpdate = true; fm.map.repeat.set(w / 4, d / 4); }
  floor(S, w, d, 0, 0, fm);
  const wallM = mat(wallColor, { roughness: 0.95 });
  const lowM = mat(lowerColor, { roughness: 0.9 });
  const trimM = mat(trimColor);
  const T = 0.2;
  const wall = (x, z, ww, dd, hh) => {
    block(S.group, ww, hh, dd, 0, x, 0, z, { material: wallM });
    // 아래쪽 띠
    block(S.group, ww + (dd > ww ? 0.02 : 0), Math.min(1.0, hh), dd + (ww > dd ? 0.02 : 0), 0, x, 0, z, { material: lowM, cast: false });
    block(S.group, ww + 0.03, 0.12, dd + 0.03, 0, x, 0, z, { material: trimM, cast: false });
  };
  if (backWall) wall(0, -d / 2 - T / 2, w + T * 2, T, h);
  if (sideWalls) { wall(-w / 2 - T / 2, 0, T, d, h); wall(w / 2 + T / 2, 0, T, d, h); }
  // 앞쪽 낮은 벽
  if (cut > 0) wall(0, d / 2 + T / 2, w + T * 2, T, cut);
  S.colliders.push(rect(0, -d / 2 - T / 2, w + 2, T), rect(-w / 2 - T / 2, 0, T, d + 2), rect(w / 2 + T / 2, 0, T, d + 2), rect(0, d / 2 + T / 2, w + 2, T));
  S.bounds = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
  if (ceiling) block(S.group, w + 0.4, 0.15, d + 0.4, 0, 0, h, 0, { material: mat(0xfaf6ef), cast: false });
  return { wallM, floorMat: fm };
}

/** 벽에 붙은 문 (복도로 돌아가기 등). side: back|left|right */
export function door(S, { x = 0, z = 0, ry = 0, label = '복도로', to = 'hall', color = 0x8a6a4f, w = 1.3, h = 2.3, spotId, api, approach = 1.3, sign: signText }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  add(g, rbox(w + 0.24, h + 0.14, 0.12, 0.03), mat(0xf7f3ea), 0, (h + 0.14) / 2, 0.02);
  add(g, rbox(w, h, 0.08, 0.03), mat(color), 0, h / 2, 0.08);
  add(g, new THREE.SphereGeometry(0.05, 8, 6), mat(0xd9b45a, { metalness: 0.6, roughness: 0.3 }), w * 0.36, h * 0.48, 0.15);
  add(g, rbox(w * 0.5, h * 0.28, 0.02, 0.02), mat(0xbfd6de, { roughness: 0.2 }), 0, h * 0.72, 0.13, { cast: false });
  if (signText) sign(g, signText, { w: Math.max(1.4, w + 0.3), h: 0.42, y: h + 0.42, z: 0.09, bg: '#22305a', size: 96, tw: 640 });
  S.group.add(g);
  const ax = x + Math.sin(ry) * approach, az = z + Math.cos(ry) * approach;
  spot(S, { id: spotId || `door-${to}`, label, kind: 'door', pos: [x, h + 0.9, z], at: [ax, az], onUse: () => { api.audio.play('door'); api.go(to); } });
  return g;
}

/** 뒤로 기대는 쿠션·방석 */
export function cushion(parent, x, z, color, { y = 0, r = 0.42, h = 0.14 } = {}) {
  const m = add(parent, new THREE.CylinderGeometry(r, r * 1.05, h, 18), mat(color, { roughness: 0.95 }), x, y + h / 2, z);
  return m;
}

export { mat, basic, rbox, add, block, C, rect, tileTexture, woodTexture };
