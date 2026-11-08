import * as THREE from 'three';

/**
 * 서울 시각에 따라 바뀌는 하늘·빛. 0~24시 열쇠 장면 사이를 섞는다.
 * night: 0(낮)~1(밤) — 창문 불빛·별·폭죽에 쓴다.
 */
const KEYS = [
  { h: 0, top: '#0d1430', bottom: '#2a2f55', sun: '#8ea2d8', sunI: 0.35, hemi: 0.45, ground: '#20233a', night: 1, exposure: 1.0 },
  { h: 5.2, top: '#1c2350', bottom: '#5a4f78', sun: '#b0a4d0', sunI: 0.4, hemi: 0.5, ground: '#2c2a40', night: 0.9, exposure: 1.0 },
  { h: 6.4, top: '#6f8fcf', bottom: '#f3b99a', sun: '#ffc39a', sunI: 1.3, hemi: 0.75, ground: '#7a6a5a', night: 0.35, exposure: 1.0 },
  { h: 8, top: '#7fb3e8', bottom: '#dcecf3', sun: '#fff1db', sunI: 2.2, hemi: 0.95, ground: '#a59a80', night: 0, exposure: 1.0 },
  { h: 12.5, top: '#6eaee8', bottom: '#e4f1f5', sun: '#ffffff', sunI: 2.6, hemi: 1.0, ground: '#a8a088', night: 0, exposure: 1.0 },
  { h: 16, top: '#7aa9df', bottom: '#f3e6cf', sun: '#ffe2b8', sunI: 2.2, hemi: 0.9, ground: '#a59478', night: 0, exposure: 1.0 },
  { h: 17.4, top: '#6c7fc4', bottom: '#f7b28a', sun: '#ffab78', sunI: 1.6, hemi: 0.75, ground: '#8d6e5c', night: 0.2, exposure: 1.0 },
  { h: 18.4, top: '#3c4688', bottom: '#d98a8a', sun: '#ff9a8a', sunI: 0.8, hemi: 0.6, ground: '#5b4a55', night: 0.6, exposure: 1.0 },
  { h: 19.4, top: '#161d45', bottom: '#4b4675', sun: '#9fb2e8', sunI: 0.45, hemi: 0.5, ground: '#2b2b44', night: 0.95, exposure: 1.0 },
  { h: 24, top: '#0d1430', bottom: '#2a2f55', sun: '#8ea2d8', sunI: 0.35, hemi: 0.45, ground: '#20233a', night: 1, exposure: 1.0 },
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function mixHex(a, b, t) { return tmpA.set(a).lerp(tmpB.set(b), t).clone(); }

export function skyAt(hour) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
  const s = t * t * (3 - 2 * t);
  return {
    top: mixHex(a.top, b.top, s), bottom: mixHex(a.bottom, b.bottom, s), sun: mixHex(a.sun, b.sun, s), ground: mixHex(a.ground, b.ground, s),
    sunI: a.sunI + (b.sunI - a.sunI) * s, hemi: a.hemi + (b.hemi - a.hemi) * s, night: a.night + (b.night - a.night) * s,
  };
}

export function phaseName(hour) {
  if (hour < 5.5 || hour >= 20) return '밤';
  if (hour < 8) return '아침';
  if (hour < 16.5) return '낮';
  return '저녁';
}

/** 하늘 공·별·해/달 */
export function createSky({ radius = 320, starCount = 900 } = {}) {
  const group = new THREE.Group();
  const uniforms = { top: { value: new THREE.Color('#7fb3e8') }, bottom: { value: new THREE.Color('#e4f1f5') } };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top;\nuniform vec3 bottom;\nvarying vec3 vP;\nvoid main(){\n  float h = clamp(vP.y*1.35+0.08,0.0,1.0);\n  vec3 c = mix(bottom, top, pow(h,0.75));\n  gl_FragColor = vec4(c,1.0);\n  #include <colorspace_fragment>\n}',
    }),
  );
  dome.renderOrder = -10;
  group.add(dome);

  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random(), v = Math.random() * 0.9 + 0.08;
    const th = u * Math.PI * 2, ph = Math.acos(v);
    const r = radius * 0.92;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(sg, starMat);
  group.add(stars);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12), new THREE.MeshBasicMaterial({ color: 0xfff6dd, fog: false }));
  group.add(orb);

  return {
    group, uniforms, stars, orb,
    apply(state, hour) {
      uniforms.top.value.copy(state.top);
      uniforms.bottom.value.copy(state.bottom);
      starMat.opacity = Math.max(0, (state.night - 0.4) / 0.6);
      // 해는 6~19시 남쪽 하늘을 가로지르고, 밤에는 달
      const day = hour >= 6 && hour <= 19;
      const t = day ? (hour - 6) / 13 : ((hour + 24 - 19) % 24) / 11;
      const ang = Math.PI * t;
      orb.position.set(Math.cos(ang) * -radius * 0.7, Math.sin(ang) * radius * 0.45 + 20, radius * 0.45);
      orb.material.color.set(day ? '#fff3d6' : '#e8eeff');
      orb.scale.setScalar(day ? 1 : 0.7);
    },
  };
}
