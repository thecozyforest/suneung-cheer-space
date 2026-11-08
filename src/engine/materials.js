import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** 한 벌의 색. 장면마다 새 색을 만들기보다 여기서 고른다. */
export const C = {
  cream: 0xf7efe0,
  paper: 0xfffaf0,
  ink: 0x2b2a33,
  navy: 0x22305a,
  cobalt: 0x2f63e0,
  brick: 0xb4573f,
  brickDark: 0x8e3f2f,
  roof: 0xc9674a,
  roofDark: 0xa9523a,
  stone: 0xd9d2c3,
  stoneDark: 0xb9b1a2,
  concrete: 0xcfcac0,
  sand: 0xe8d3a8,
  sandDark: 0xd9bf8d,
  grass: 0x9bbf6e,
  grassDark: 0x6f9a52,
  leaf: 0x7fae5b,
  leafDark: 0x4f8243,
  pine: 0x3f6f45,
  trunk: 0x7a5a43,
  wood: 0xc99a68,
  woodDark: 0x9c6f47,
  woodLight: 0xe3c299,
  white: 0xfbfaf6,
  glass: 0x5d7f8f,
  teal: 0x5f9ea0,
  gold: 0xe9b44c,
  pink: 0xf4b6c2,
  red: 0xd9534f,
  ginkgo: 0xf2c230,
  maple: 0xe0603a,
  mapleDeep: 0xc2412d,
};

const cache = new Map();
/** 같은 색·옵션의 재질을 재사용한다. */
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...opts }));
  }
  return cache.get(key);
}
export function basic(color, opts = {}) {
  const key = `b|${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return cache.get(key);
}

const boxCache = new Map();
export function rbox(w, h, d, r = 0.06, seg = 3) {
  const key = `${w}|${h}|${d}|${r}|${seg}`;
  if (!boxCache.has(key)) boxCache.set(key, new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));
  return boxCache.get(key);
}

/** 그림자를 드리우는 메시를 만들어 부모에 붙인다. */
export function add(parent, geo, material, x = 0, y = 0, z = 0, { cast = true, receive = true, ry = 0, rx = 0, rz = 0, name } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  parent.add(m);
  return m;
}

/** 상자: 바닥이 y인 상자 (x,z는 중심) */
export function block(parent, w, h, d, color, x, y, z, opts = {}) {
  const r = opts.r ?? 0;
  const geo = r > 0 ? rbox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
  return add(parent, geo, opts.material || mat(color, opts.matOpts || {}), x, y + h / 2, z, opts);
}

/** 캔버스로 그린 질감 */
export function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

let brickTex;
export function brickTexture() {
  if (brickTex) return brickTex;
  brickTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#d7b9a5'; g.fillRect(0, 0, w, h);
    const bw = 32, bh = 14;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * bw < w + bw; col++) {
        const v = rnd();
        const r = 172 + v * 26, gg = 82 + v * 16, b = 60 + v * 12;
        g.fillStyle = `rgb(${r|0},${gg|0},${b|0})`;
        g.fillRect(col * bw + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
      }
    }
  });
  return brickTex;
}

let tileTex;
export function tileTexture() {
  if (tileTex) return tileTex;
  tileTex = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#e9e6df'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,110,100,.18)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    g.fillStyle = 'rgba(150,140,130,.08)';
    for (let k = 0; k < 160; k++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  });
  return tileTex;
}

let woodTex;
export function woodTexture() {
  if (woodTex) return woodTex;
  woodTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#cfa274'; g.fillRect(0, 0, w, h);
    const plank = 32;
    for (let i = 0; i < h / plank; i++) {
      const v = (i * 37) % 11 / 11;
      g.fillStyle = `rgba(${150 + v * 40},${100 + v * 30},${60 + v * 20},.35)`;
      g.fillRect(0, i * plank, w, plank - 2);
      g.fillStyle = 'rgba(90,60,35,.25)'; g.fillRect(0, i * plank + plank - 2, w, 2);
      g.strokeStyle = 'rgba(120,80,45,.12)';
      for (let k = 0; k < 4; k++) { g.beginPath(); const y = i * plank + 6 + k * 6; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 3, w * .6, y - 3, w, y + 1); g.stroke(); }
      g.fillStyle = 'rgba(90,60,35,.22)'; g.fillRect(((i * 97) % w), i * plank, 2, plank - 2);
    }
  });
  return woodTex;
}

let sandTex;
export function sandTexture() {
  if (sandTex) return sandTex;
  sandTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#e6cfa2'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2600; k++) {
      const v = Math.random();
      g.fillStyle = v > .5 ? 'rgba(255,245,220,.35)' : 'rgba(170,135,90,.22)';
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  });
  return sandTex;
}

let grassTex;
export function grassTexture() {
  if (grassTex) return grassTex;
  grassTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#9bbf6e'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2200; k++) {
      const v = Math.random();
      g.fillStyle = v > .5 ? 'rgba(200,230,150,.30)' : 'rgba(70,110,50,.22)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 3);
    }
  });
  return grassTex;
}

/** 글자 간판 질감 */
export function textTexture(lines, { w = 512, h = 256, bg = '#fffaf0', fg = '#2b2a33', font = 700, size = 72, radius = 28, border, sub, subSize, align = 'center' } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines];
  return canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    if (bg) {
      g.fillStyle = bg;
      roundRect(g, 0, 0, w, h, radius); g.fill();
    }
    if (border) { g.strokeStyle = border; g.lineWidth = 8; roundRect(g, 4, 4, w - 8, h - 8, radius); g.stroke(); }
    g.fillStyle = fg;
    g.textAlign = align; g.textBaseline = 'middle';
    const total = arr.length + (sub ? 0.8 : 0);
    const lh = size * 1.22;
    let y = h / 2 - ((total - 1) * lh) / 2;
    for (const line of arr) {
      g.font = `${font} ${size}px Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`;
      g.fillText(line, align === 'center' ? w / 2 : 30, y);
      y += lh;
    }
    if (sub) {
      g.globalAlpha = .7;
      g.font = `600 ${subSize || size * .5}px Pretendard, 'Malgun Gothic', sans-serif`;
      g.fillText(sub, w / 2, y - lh * .15);
      g.globalAlpha = 1;
    }
  }, { repeat: [1, 1] });
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 장면을 버릴 때 질감·형상을 정리한다. 공유 캐시는 남긴다. */
export function disposeTree(root) {
  const shared = new Set([...cache.values()]);
  const sharedGeo = new Set([...boxCache.values()]);
  const sharedTex = new Set([brickTex, tileTex, woodTex, sandTex, grassTex].filter(Boolean));
  root.traverse((o) => {
    if (o.geometry && !sharedGeo.has(o.geometry) && !o.userData.keepGeo) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (shared.has(m) || o.userData.keepMat) continue;
      for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k] && !sharedTex.has(m[k])) m[k].dispose();
      m.dispose();
    }
  });
}
