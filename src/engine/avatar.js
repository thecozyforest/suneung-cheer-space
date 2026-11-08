import * as THREE from 'three';
import { rbox, mat, canvasTexture } from './materials.js';
import { makeCup, makeMochi, disposeCup } from './props.js';

/**
 * 2등신 학생 캐릭터. 교복(남색 재킷·코발트 리본·남색 체크 치마)을 단순화했다.
 * 색은 이 파일 위쪽 상수에서 바꾼다.
 * 실제 학생 얼굴이나 사진을 쓰지 않는다.
 */
const SKIN = 0xffe2d2;
export const HAIR_COLORS = [0x2b1e19, 0x3d2a22, 0x523829, 0x1d1b22, 0x6a4632];
export const HAIR_STYLES = ['long', 'pony', 'bob', 'braid'];
const NAVY = 0x253560, NAVY_DARK = 0x1c284b, COBALT = 0x2f63e0, WHITE = 0xfbfbf7, SOCK = 0x1f2742, SHOE = 0x2f2621;

let skirtTexture;
function skirtMat() {
  if (!skirtTexture) {
    skirtTexture = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#24315b'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(70,88,140,.55)';
      for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, 64); g.fillRect(0, i, 64, 6); }
      g.fillStyle = 'rgba(170,176,190,.85)';
      for (let i = 0; i < 64; i += 16) { g.fillRect(i + 10, 0, 1.4, 64); g.fillRect(0, i + 10, 64, 1.4); }
      g.fillStyle = 'rgba(150,50,95,.9)';
      for (let i = 0; i < 64; i += 32) { g.fillRect(i + 3, 0, 1, 64); g.fillRect(0, i + 3, 64, 1); }
    }, { repeat: [4, 1.3] });
  }
  return mat(0xffffff, { map: skirtTexture });
}

function m(geo, material, x, y, z, parent, cast = true) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  parent.add(mesh);
  return mesh;
}

const geo = {};
function g(name, make) { return geo[name] || (geo[name] = make()); }

export function createAvatar({ hairStyle = 'long', hairColor = HAIR_COLORS[0], outfit = 'uniform', scale = 1, lite = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // 앉기·절하기 때 내려가는 몸 전체
  root.add(body);
  const hairM = mat(hairColor, { roughness: 0.7 });
  const dok = outfit === 'dokkaebi'; // 호통 도깨비(가상 캐릭터)
  const skinM = mat(dok ? 0xe0584a : SKIN, { roughness: 0.75 });
  const jacketM = outfit === 'angel' ? mat(0xfffdf8) : dok ? mat(0x3b2a2e) : mat(NAVY);
  const sleeveM = outfit === 'angel' ? mat(0xfffdf8) : dok ? mat(0x2a1f22) : mat(NAVY_DARK);
  const bare = outfit === 'angel' || dok;

  // 다리 (엉덩이 높이 .44에 축)
  const HIP = 0.44;
  const legs = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.085, HIP, 0);
    body.add(pivot);
    m(g('leg', () => new THREE.CylinderGeometry(0.062, 0.058, 0.36, 10)), bare ? skinM : mat(SOCK), 0, -0.2, 0, pivot);
    m(g('shoe', () => rbox(0.13, 0.08, 0.2, 0.035)), outfit === 'angel' ? mat(0xf3e6c8) : dok ? mat(0x2a1f22) : mat(SHOE), 0, -0.4, 0.03, pivot);
    legs.push(pivot);
  }

  // 치마
  const skirt = m(g('skirt', () => new THREE.CylinderGeometry(0.19, 0.31, 0.27, 18, 1)), outfit === 'angel' ? mat(0xfffdf8) : dok ? mat(0xf2c230) : skirtMat(), 0, HIP - 0.04, 0, body);

  // 상체 (엉덩이에 축 → 절할 때 앞으로 숙인다)
  const upper = new THREE.Group();
  upper.position.y = HIP;
  body.add(upper);
  m(g('torso', () => rbox(0.42, 0.38, 0.28, 0.1)), jacketM, 0, 0.27, 0, upper);
  // 흰 블라우스 깃 (V)
  const collar = m(g('collar', () => new THREE.ConeGeometry(0.1, 0.13, 3)), dok ? mat(0xf2c230) : mat(WHITE), 0, 0.41, 0.115, upper, false);
  collar.rotation.set(Math.PI, 0, 0);
  collar.scale.set(1, 1, 0.35);
  if (outfit !== 'angel' && !dok && !lite) {
    // 코발트 리본
    for (const side of [-1, 1]) {
      const wing = m(g('ribbonWing', () => rbox(0.1, 0.06, 0.03, 0.015)), mat(COBALT, { roughness: 0.5 }), side * 0.055, 0.37, 0.15, upper, false);
      wing.rotation.z = side * 0.35;
    }
    m(g('knot', () => new THREE.SphereGeometry(0.025, 8, 6)), mat(COBALT, { roughness: 0.5 }), 0, 0.37, 0.158, upper, false);
    // 두 단추 · 왼쪽 가슴 작은 표식
    for (const y of [0.2, 0.12]) m(g('btn', () => new THREE.SphereGeometry(0.016, 6, 5)), mat(0x3a3a44, { metalness: 0.4, roughness: 0.4 }), 0.03, y, 0.143, upper, false);
    m(g('badge', () => rbox(0.045, 0.05, 0.01, 0.01)), mat(0xd9b45a, { roughness: 0.5 }), -0.11, 0.33, 0.142, upper, false);
  } else if (outfit === 'angel') {
    // 천사 날개 · 고리
    for (const side of [-1, 1]) {
      const wing = m(g('wing', () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0); s.bezierCurveTo(0.2, 0.25, 0.45, 0.3, 0.5, 0.05); s.bezierCurveTo(0.4, 0.0, 0.35, -0.12, 0.2, -0.2); s.bezierCurveTo(0.12, -0.12, 0.05, -0.08, 0, 0);
        return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
      }), mat(0xffffff, { emissive: 0xfff4d6, emissiveIntensity: 0.35 }), side * 0.08, 0.32, -0.16, upper);
      wing.scale.set(side, 1, 1);
      wing.rotation.y = side * 0.5;
      wing.name = side < 0 ? 'wingL' : 'wingR';
    }
  }

  // 팔 (어깨 축)
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.25, 0.42, 0);
    upper.add(pivot);
    m(g('arm', () => rbox(0.1, 0.3, 0.1, 0.045)), sleeveM, 0, -0.14, 0, pivot);
    m(g('hand', () => new THREE.SphereGeometry(0.052, 10, 8)), skinM, 0, -0.31, 0, pivot);
    arms.push(pivot);
  }
  if (dok) {
    // 도깨비 방망이 (오른손)
    const club = new THREE.Group();
    club.position.set(0, -0.31, 0.06); club.rotation.x = -0.5;
    m(g('clubHandle', () => new THREE.CylinderGeometry(0.035, 0.04, 0.34, 8)), mat(0x6b4226), 0, 0.12, 0, club);
    m(g('clubHead', () => new THREE.CylinderGeometry(0.1, 0.07, 0.36, 10)), mat(0x4a3a36), 0, 0.42, 0, club);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; m(g('clubStud', () => new THREE.ConeGeometry(0.025, 0.06, 6)), mat(0xf2c230, { metalness: 0.4 }), Math.cos(a) * 0.1, 0.36 + (i % 2) * 0.12, Math.sin(a) * 0.1, club, false).rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); }
    arms[1].add(club);
  }

  // 머리 (목 축)
  const head = new THREE.Group();
  head.position.y = 0.48;
  upper.add(head);
  const HR = 0.3;
  const face = m(g('head', () => new THREE.SphereGeometry(HR, 28, 20)), skinM, 0, 0.27, 0, head);
  face.scale.set(1.02, 0.95, 0.96);
  // 눈 · 반짝임 · 볼 · 입
  if (!lite) for (const side of [-1, 1]) {
    const eye = m(g('eye', () => new THREE.SphereGeometry(0.042, 12, 10)), mat(0x2a2030, { roughness: 0.3 }), side * 0.105, 0.25, 0.262, head, false);
    eye.scale.set(0.95, 1.28, 0.5);
    m(g('shine', () => new THREE.SphereGeometry(0.013, 6, 5)), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), side * 0.105 + 0.012, 0.272, 0.284, head, false);
    const cheek = m(g('cheek', () => new THREE.CircleGeometry(0.048, 16)), mat(0xff9fae, { transparent: true, opacity: 0.55, roughness: 1 }), side * 0.18, 0.18, 0.245, head, false);
    cheek.rotation.y = side * 0.62;
  }
  const mouth = lite ? null : m(g('mouth', () => new THREE.TorusGeometry(0.032, 0.009, 6, 14, Math.PI)), mat(0x9b3b45), 0, dok ? 0.155 : 0.17, 0.285, head, false);
  if (mouth) mouth.rotation.z = dok ? 0 : Math.PI;
  if (dok && !lite) {
    for (const side of [-1, 1]) {
      const brow = m(g('brow', () => rbox(0.13, 0.03, 0.03, 0.012)), mat(0x1d1b22), side * 0.105, 0.335, 0.272, head, false);
      brow.rotation.z = side * 0.5;
      m(g('fang', () => new THREE.ConeGeometry(0.014, 0.045, 6)), mat(0xfffdf5), side * 0.03, 0.14, 0.286, head, false).rotation.x = Math.PI;
      const horn = m(g('horn', () => new THREE.ConeGeometry(0.05, 0.22, 8)), mat(0xfff3cf, { roughness: 0.5 }), side * 0.15, 0.62, 0.04, head);
      horn.rotation.z = -side * 0.3;
    }
  }

  // 머리카락
  const cap = m(g('hairCap', () => new THREE.SphereGeometry(HR * 1.075, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.6)), hairM, 0, 0.275, -0.005, head);
  cap.rotation.x = -0.52;
  // 앞머리 덩어리
  if (!lite) for (const [x, rz] of [[-0.13, 0.5], [0, 0], [0.13, -0.5]]) {
    const bang = m(g('bang', () => new THREE.SphereGeometry(0.1, 12, 8)), hairM, x, 0.43, 0.2, head, false);
    bang.scale.set(1.1, 0.55, 0.6);
    bang.rotation.z = rz;
  }
  if (hairStyle === 'long' || hairStyle === 'braid') {
    m(g('hairBack', () => rbox(0.54, 0.46, 0.15, 0.07)), hairM, 0, 0.0, -0.17, head);
    if (!lite) for (const side of [-1, 1]) m(g('lock', () => rbox(0.09, 0.34, 0.09, 0.04)), hairM, side * 0.27, 0.06, 0.04, head);
    if (hairStyle === 'braid') {
      for (let i = 0; i < 4; i++) m(g('braidBall', () => new THREE.SphereGeometry(0.06, 10, 8)), hairM, 0, -0.24 - i * 0.09, -0.21, head);
    }
  } else if (hairStyle === 'pony') {
    m(g('bun', () => new THREE.SphereGeometry(0.09, 12, 10)), hairM, 0, 0.42, -0.27, head);
    const tail = m(g('tail', () => new THREE.CapsuleGeometry(0.07, 0.3, 4, 10)), hairM, 0, 0.2, -0.36, head);
    tail.rotation.x = 0.35;
    m(g('tie', () => new THREE.TorusGeometry(0.06, 0.018, 6, 14)), mat(COBALT), 0, 0.37, -0.3, head, false).rotation.x = 1.2;
  } else if (hairStyle === 'bob') {
    const bob = m(g('bob', () => new THREE.SphereGeometry(HR * 1.1, 24, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.35)), hairM, 0, 0.27, -0.03, head);
    bob.scale.set(1.02, 1.08, 1);
    bob.rotation.x = -0.3;
  }
  if (outfit === 'angel') {
    const halo = m(g('halo', () => new THREE.TorusGeometry(0.17, 0.022, 8, 28)), mat(0xffd65a, { emissive: 0xffc93a, emissiveIntensity: 0.9 }), 0, 0.68, -0.02, head, false);
    halo.rotation.x = Math.PI / 2 - 0.2;
    halo.name = 'halo';
  }

  root.scale.setScalar(scale);
  root.traverse((o) => { if (o.isMesh) o.userData.keepGeo = true; });

  const state = {
    walk: 0, phase: 0, t: 0,
    action: null, actionT: 0, actionDur: 0,
    pose: 'stand', // stand | sit | lie
    seatHeight: 0.45,
    hold: null, // 계속 유지하는 동작: pray, write, eat, look
  };

  const props = new Set(); // 손에 든 물건
  // 들고 있기(hold)에 따라 손에 나타나는 컵: cupA=아아, cupG=자몽허니블랙티 (다른 사람 화면에서도 같은 컵이 보인다)
  let holdProp = null, holdKind = null;
  const CUP_HOLDS = { cupA: 'ame', cupG: 'grape', mochi: 'mochi' }; // 들고 있기 → 손에 나타나는 물건
  const makeHoldProp = (k) => (k === 'mochi' ? makeMochi() : makeCup(k));
  const _qt = new THREE.Quaternion();
  const _q = new THREE.Quaternion(), _qr = new THREE.Quaternion();
  const lerp = (a, b, k) => a + (b - a) * k;
  function setRot(obj, x, y, z, k) {
    obj.rotation.x = lerp(obj.rotation.x, x, k);
    obj.rotation.y = lerp(obj.rotation.y, y, k);
    obj.rotation.z = lerp(obj.rotation.z, z, k);
  }

  const BITE = [-1.55, -0.55, 0.3, 0]; // 한 입 자세(팔 x·z, 고개, 상체) — 브라우저에서 떡과 입 거리를 계산해 맞춤
  const DUR = { bow: 2.8, wave: 1.8, cheer: 1.8, clap: 1.8, stretch: 3.2, nod: 1.2, pat: 2.4, jump: 0.9, pull: 1.2, throw: 1.0, shout: 2.6, stab: 1.4, reach: 1.3, sip: 1.1, bite: 1.0 };

  return {
    root,
    play(name, dur) { state.action = name; state.actionT = 0; state.actionDur = dur || DUR[name] || 1.6; },
    get action() { return state.action; },
    setHold(name) { state.hold = name; },
    get hold() { return state.hold; },
    sit(height = 0.45) { state.pose = 'sit'; state.seatHeight = height; },
    /** 반듯이 눕기: 머리는 root의 -z 쪽, 발은 +z 쪽. height는 몸통이 바닥에서 뜨는 높이 */
    lie(height = 0.3) { state.pose = 'lie'; state.seatHeight = height; state.hold = null; },
    stand() { state.pose = 'stand'; state.hold = null; },
    /** 손에 물건 쥐기(side 1=오른손, -1=왼손). 반환: 붙인 물체 */
    attach(obj, side = 1) { obj.position.set(0, -0.31, 0.05); arms[side === 1 ? 1 : 0].add(obj); props.add(obj); return obj; },
    detach(obj) { obj.removeFromParent(); props.delete(obj); },
    clearProps() { for (const o of props) o.removeFromParent(); props.clear(); if (CUP_HOLDS[state.hold]) state.hold = null; },
    /** 지금 손에 든 컵(음료 높이 조절용) */
    get holdProp() { return holdProp; },
    get pose() { return state.pose; },
    /** speed: 0~1 걷기 정도 */
    update(dt, speed = 0) {
      state.t += dt;
      const k = 1 - Math.exp(-dt * 14);
      state.walk = lerp(state.walk, speed, 1 - Math.exp(-dt * 10));
      state.phase += dt * (6 + 5 * state.walk) * (state.walk > 0.05 ? 1 : 0);
      const w = state.walk, s = Math.sin(state.phase);
      const breathe = Math.sin(state.t * 2.2) * 0.012;

      let bodyY = 0, upperX = 0, headX = 0, headY = 0, headZ = 0;
      let legL = [s * 0.75 * w, 0, 0], legR = [-s * 0.75 * w, 0, 0];
      let armL = [-s * 0.7 * w, 0, 0.08 + 0.04 * w], armR = [s * 0.7 * w, 0, 0.08 + 0.04 * w];
      bodyY = Math.abs(Math.cos(state.phase)) * 0.045 * w + breathe;
      upperX = 0.06 * w;

      if (state.pose === 'sit') {
        bodyY = state.seatHeight - HIP + 0.02 + breathe;
        legL = [-1.45, 0, 0.05]; legR = [-1.45, 0, -0.05];
        armL = [-0.5, 0, 0.12]; armR = [-0.5, 0, 0.12];
        upperX = 0.02;
      }
      const lying = state.pose === 'lie';
      if (lying) {
        bodyY = state.seatHeight + breathe;
        legL = [0, 0, 0.06]; legR = [0, 0, -0.06];
        armL = [0.05, 0, 0.16]; armR = [0.05, 0, 0.16];
        upperX = 0; headX = -0.08;
      }
      const hold = lying ? null : state.hold;
      if (hold === 'pray') { armL = [-1.25, 0, -0.78]; armR = [-1.25, 0, -0.78]; headX = 0.25; upperX += 0.06; }
      if (hold === 'write') { armL = [-1.0, 0, -0.3]; armR = [-1.15 + Math.sin(state.t * 9) * 0.06, 0, -0.25]; headX = 0.42; upperX += 0.18; }
      if (hold === 'eat') { armL = [-0.9, 0, -0.3]; armR = [-1.3 - Math.max(0, Math.sin(state.t * 2.4)) * 0.6, 0, -0.35]; headX = 0.15 + Math.max(0, Math.sin(state.t * 2.4)) * 0.1; }
      if (hold === 'look') { headX = -0.5; upperX -= 0.12; armL = [0.2, 0, 0.35]; armR = [0.2, 0, 0.35]; }
      if (CUP_HOLDS[hold]) { armR = [-0.9, 0, -0.22]; } // 컵을 가슴 앞에 든다
      if (hold === 'stretchHold') { armL = [-2.9, 0, 0.12]; armR = [-2.9, 0, 0.12]; headX = -0.2; }
      if (hold === 'rest') { headX = 0.12; headZ = Math.sin(state.t * 0.8) * 0.05; armL = [-0.35, 0, 0.18]; armR = [-0.35, 0, 0.18]; }

      if (state.action) {
        state.actionT += dt;
        const p = Math.min(1, state.actionT / state.actionDur);
        const bump = Math.sin(p * Math.PI);
        switch (state.action) {
          case 'bow': {
            // 무릎 꿇고 앞으로 엎드렸다 일어나는 절
            const q = Math.min(1, bump * 1.6);
            bodyY -= 0.3 * q;
            legL = [-1.6 * q, 0, 0.05]; legR = [-1.6 * q, 0, -0.05];
            upperX += 1.15 * Math.max(0, bump * 1.5 - 0.35);
            armL = [-2.2 * q, 0, -0.1]; armR = [-2.2 * q, 0, -0.1];
            headX = 0.3 * q;
            break;
          }
          case 'wave': {
            armR = [-2.7, 0, 0.35 + Math.sin(state.actionT * 14) * 0.35];
            headZ = 0.12;
            break;
          }
          case 'cheer': {
            const j = Math.abs(Math.sin(state.actionT * 7));
            bodyY += j * 0.16;
            armL = [-2.9, 0, 0.35]; armR = [-2.9, 0, 0.35];
            headX = -0.15;
            break;
          }
          case 'jump': {
            bodyY += bump * 0.35;
            armL = [-2.6 * bump, 0, 0.3]; armR = [-2.6 * bump, 0, 0.3];
            break;
          }
          case 'clap': {
            const c = Math.abs(Math.sin(state.actionT * 11));
            armL = [-1.3, 0, -(0.2 + c * 0.6)]; armR = [-1.3, 0, -(0.2 + c * 0.6)];
            break;
          }
          case 'stretch': {
            const side = Math.sin(state.actionT * 2.0);
            armL = [-2.95, 0, 0.1]; armR = [-2.95, 0, 0.1];
            upperX = 0; headZ = side * 0.2;
            upper.rotation.z = side * 0.28 * bump;
            break;
          }
          case 'nod': { headX = Math.sin(state.actionT * 10) * 0.25; break; }
          case 'pat': {
            armR = [-2.4, 0, -0.1 + Math.sin(state.actionT * 9) * 0.15];
            headX = 0.25;
            break;
          }
          case 'pull': {
            const d = Math.sin(p * Math.PI);
            armL = [-2.8 + d * 1.6, 0, 0.05]; armR = [-2.8 + d * 1.6, 0, 0.05];
            bodyY -= d * 0.08;
            break;
          }
          case 'throw': {
            armR = [-2.6 * bump + 0.4 * (p > 0.5 ? 1 : 0), 0, 0.2];
            upperX += 0.2 * bump;
            break;
          }
          case 'shout': {
            // 두 주먹을 흔들며 호통
            const sh = Math.sin(state.actionT * 18) * 0.18;
            armL = [-2.35 + sh, 0, 0.5]; armR = [-2.35 - sh, 0, 0.5];
            headX = -0.32 + sh * 0.6;
            upperX -= 0.1;
            bodyY += Math.abs(Math.sin(state.actionT * 9)) * 0.07;
            break;
          }
          case 'reach': {
            // 앞으로 손을 뻗어 불을 옮기거나 컵을 받는다
            const q = Math.min(1, bump * 1.5);
            armR = [-0.2 - 1.25 * q, 0, 0.12];
            upperX += 0.16 * q; headX = 0.22 * q;
            break;
          }
          case 'sip': {
            // 컵을 턱 밑 가운데로 가져와 빨대를 문다(각도는 빨대 끝과 입 거리를 계산해 맞춤)
            const q = Math.min(1, bump * 1.6);
            armR = [-0.9 + q * 0.05, 0, -0.22 - q * 0.53];
            headX = 0.05 * q;
            break;
          }
          case 'bite': {
            // 떡을 입으로 가져와 한 입 (몸을 살짝 숙여 입을 떡에 댄다)
            const q = Math.min(1, bump * 1.6);
            armR = [BITE[0] * q + -0.9 * (1 - q), 0, BITE[1] * q + -0.22 * (1 - q)];
            headX = BITE[2] * q; upperX += BITE[3] * q;
            break;
          }
          case 'stab': {
            // 위로 들었다가 앞으로 콕, 두 번
            const mm = Math.abs(Math.cos(p * Math.PI * 2));
            armR = [-1.0 - mm * 1.5, 0, 0.15];
            upperX += (1 - mm) * 0.28;
            headX = 0.22 * (1 - mm);
            break;
          }
        }
        if (p >= 1) { state.action = null; upper.rotation.z = 0; }
      } else if (Math.abs(upper.rotation.z) > 0.001) {
        upper.rotation.z = lerp(upper.rotation.z, 0, k);
      }

      body.position.y = lerp(body.position.y, bodyY, state.action === 'cheer' || state.action === 'jump' ? 1 : k * 1.4);
      // 눕기: 몸을 뒤로 눕히고(머리 -z) 가운데가 자리 위에 오게 옮긴다
      body.rotation.x = lerp(body.rotation.x, lying ? -Math.PI / 2 : 0, k * 0.7);
      body.position.z = lerp(body.position.z, lying ? 0.75 : 0, k * 0.7);
      setRot(legs[0], ...legL, k);
      setRot(legs[1], ...legR, k);
      // 팔 z값은 두 팔 모두 '바깥으로 벌림'이 양수
      setRot(arms[0], armL[0], armL[1], -armL[2], k);
      setRot(arms[1], armR[0], armR[1], armR[2], k);
      upper.rotation.x = lerp(upper.rotation.x, upperX, k);
      setRot(head, headX, headY, headZ, k);
      skirt.rotation.x = state.pose === 'sit' ? lerp(skirt.rotation.x, -0.25, k) : lerp(skirt.rotation.x, 0, k);
      // 손에 드는 컵: hold에 맞춰 붙이고 떼며, 팔이 어떻게 움직여도 컵은 똑바로 선다
      const wantCup = CUP_HOLDS[state.hold] || null;
      if (wantCup !== holdKind) {
        if (holdProp) { holdProp.removeFromParent(); disposeCup(holdProp); holdProp = null; }
        if (wantCup) { holdProp = makeHoldProp(wantCup); holdProp.position.set(0, -0.32, 0.07); arms[1].add(holdProp); }
        holdKind = wantCup;
      }
      if (holdProp) {
        arms[1].updateWorldMatrix(true, false);
        arms[1].getWorldQuaternion(_q); root.getWorldQuaternion(_qr);
        holdProp.quaternion.copy(_q.invert().multiply(_qr));
      }
      // 손에 붙인 물건 중 '똑바로'(upright) 표시가 있는 것은 몸 방향 기준으로 세운다(+ 기울기 tilt)
      for (const o of props) {
        if (!o.userData.upright || !o.parent) continue;
        o.parent.updateWorldMatrix(true, false);
        o.parent.getWorldQuaternion(_q); root.getWorldQuaternion(_qr);
        o.quaternion.copy(_q.invert().multiply(_qr));
        if (o.userData.tilt) o.quaternion.multiply(_qt.setFromEuler(o.userData.tilt));
      }
      // 천사 날개 파닥
      if (outfit === 'angel') {
        const f = Math.sin(state.t * 5) * 0.25;
        upper.children.forEach((c) => { if (c.name === 'wingL') c.rotation.y = -0.5 - f; if (c.name === 'wingR') c.rotation.y = 0.5 + f; });
      }
    },
    dispose() { root.removeFromParent(); },
  };
}

/** uid 같은 문자열로 정해지는 모습 */
export function lookFromSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h >>>= 0;
  return { hairStyle: HAIR_STYLES[h % HAIR_STYLES.length], hairColor: HAIR_COLORS[(h >>> 4) % HAIR_COLORS.length], lookId: h % 1000 };
}
