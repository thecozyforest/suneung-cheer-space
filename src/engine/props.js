import * as THREE from 'three';
import { mat } from './materials.js';

/**
 * 손에 드는 컵. 원점이 컵 가운데(손으로 쥐는 곳)라 손에 붙이면 손 위아래로 컵이 보인다.
 * kind: 'ame'(아이스 아메리카노) | 'grape'(자몽허니블랙티)
 * userData: { liquid, ice } — 마실 때 음료 높이를 줄인다.
 */
export const CUP_KINDS = {
  ame: { liquid: 0x2a1810, alpha: 0.95, straw: 0x2b2b2b },
  grape: { liquid: 0xd0583e, alpha: 0.86, straw: 0xf07a3a },
};

export function makeCup(kind = 'ame') {
  const d = CUP_KINDS[kind] || CUP_KINDS.ame;
  const g = new THREE.Group();
  const H = 0.26, RT = 0.085, RB = 0.068, Y0 = -0.11;
  // 투명 컵
  const cupM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.26, roughness: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(RT, RB, H, 16, 1, true), cupM);
  cup.position.y = Y0 + H / 2; cup.renderOrder = 3; g.add(cup);
  const base = new THREE.Mesh(new THREE.CircleGeometry(RB, 16), cupM); base.rotation.x = -Math.PI / 2; base.position.y = Y0 + 0.002; g.add(base);
  // 음료 (아래가 고정, 높이만 줄인다)
  const lg = new THREE.CylinderGeometry(RT * 0.94, RB * 0.94, H * 0.86, 16); lg.translate(0, H * 0.43, 0);
  const liquid = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: d.liquid, transparent: true, opacity: d.alpha, roughness: 0.25 }));
  liquid.position.y = Y0 + 0.004; liquid.renderOrder = 2; g.add(liquid);
  // 얼음
  const iceM = new THREE.MeshStandardMaterial({ color: 0xeaf7ff, transparent: true, opacity: 0.8, roughness: 0.05 });
  const ice = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), iceM);
    c.position.set(Math.cos(i * 1.7) * 0.03, Y0 + 0.17 - i * 0.03, Math.sin(i * 1.7) * 0.03);
    c.rotation.set(i, i * 0.7, 0); c.renderOrder = 2; g.add(c); ice.push(c);
  }
  // 뚜껑 · 빨대
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(RT + 0.004, RT + 0.004, 0.016, 16), mat(0xffffff, { roughness: 0.4 }));
  lid.position.y = Y0 + H + 0.004; g.add(lid);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), mat(d.straw));
  straw.position.set(0.018, Y0 + H + 0.09, 0.01); straw.rotation.z = -0.12; g.add(straw);
  if (kind === 'grape') {
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 14), mat(0xf26b4f, { roughness: 0.6 }));
    slice.position.set(-RT, Y0 + H - 0.01, 0); slice.rotation.z = 1.25; g.add(slice);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  g.userData = { liquid, ice, kind, own: [cupM, liquid.material, iceM] };
  return g;
}

/** 손에 드는 찹쌀떡(하얀 떡, 가루). 원점이 떡 가운데. */
export function makeMochi() {
  const g = new THREE.Group();
  const own = new THREE.MeshStandardMaterial({ color: 0xfbf7ef, roughness: 0.95 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), own);
  ball.scale.set(1.1, 0.8, 1.05); g.add(ball);
  const dust = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.6 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), dust);
  top.position.y = 0.012; top.scale.set(1.2, 0.9, 1.2); g.add(top);
  g.userData = { body: ball, own: [own, dust], kind: 'mochi' };
  return g;
}

/** 컵 하나 지우기(공유 재질 mat()는 그대로 둔다) */
export function disposeCup(g) {
  g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  for (const m of g.userData.own || []) m.dispose();
}
