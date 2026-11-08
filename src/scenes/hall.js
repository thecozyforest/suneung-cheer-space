import * as THREE from 'three';
import { makeScene, room, spot, sign, bench, mat, rbox, add, block, rect, tileTexture } from './kit.js';
import { canvasTexture, roundRect } from '../engine/materials.js';
import { spaceById } from './registry.js';

/**
 * 복도: 흰 벽·회색 아랫벽·목재 유리문·보라색 문틀.
 * 북쪽 벽의 문을 골라 들어간다. 가운데 게시판에 오늘의 응원.
 */
const DOORS = [
  ['soft', -19], ['spicy', -14.5], ['study', -10], ['exam', -5.5],
  ['temple', 5.5], ['cathedral', 10], ['church', 14.5], ['allwish', 19],
];

function boardTexture(title, line) {
  return canvasTexture(1024, 560, (g, w, h) => {
    g.fillStyle = '#6b4f3a'; roundRect(g, 0, 0, w, h, 26); g.fill();
    g.fillStyle = '#d9c39a'; roundRect(g, 22, 22, w - 44, h - 44, 16); g.fill();
    // 붙인 종이
    g.save(); g.translate(w / 2, h / 2 + 14); g.rotate(-0.015);
    g.fillStyle = '#fffdf6'; g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
    roundRect(g, -420, -190, 840, 380, 10); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = '#e9788f'; g.beginPath(); g.arc(0, -190, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f63e0'; g.textAlign = 'center'; g.font = '800 40px Pretendard, Malgun Gothic, sans-serif'; g.fillText(title, 0, -110);
    g.fillStyle = '#26252e'; g.font = '800 54px Pretendard, Malgun Gothic, sans-serif';
    // 줄바꿈
    const words = line.split(' '); const lines = []; let cur = '';
    for (const wd of words) { const t = cur ? `${cur} ${wd}` : wd; if (g.measureText(t).width > 740) { lines.push(cur); cur = wd; } else cur = t; }
    lines.push(cur);
    lines.forEach((l, i) => g.fillText(l, 0, -10 + i * 70 - (lines.length - 1) * 35));
    g.restore();
  }, { repeat: [1, 1] });
}

export function buildHall(api) {
  const S = makeScene({ env: { bg: '#e9e2d4', hemi: 1.25, sun: 1.3, hemiSky: '#fffaf0', hemiGround: '#b5a991' } });
  const G = S.group;
  const W = 46, D = 6.4, H = 3.4;
  const ft = tileTexture().clone(); ft.needsUpdate = true;
  const floorMat = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.55, color: 0xdedcd8 });
  room(S, { w: W, d: D, h: H, floorMat, wallColor: 0xf6f3ee, lowerColor: 0xc9c6c0, trimColor: 0x55524f, cut: 1.0 });

  // 천장 조명 줄
  const pl = new THREE.PointLight(0xfff1dc, 18, 30, 1.6); pl.position.set(0, H - 0.4, 0); G.add(pl);

  // 방 문들
  const frameM = mat(0x7b6aa8), woodM = mat(0xa9805a), glassM = mat(0xbcd3dc, { roughness: 0.15 });
  for (const [id, x] of DOORS) {
    const sp = spaceById(id);
    const g = new THREE.Group(); g.position.set(x, 0, -D / 2 + 0.02);
    add(g, rbox(1.62, 2.42, 0.1, 0.02), frameM, 0, 1.21, 0.03);
    add(g, rbox(1.4, 2.28, 0.06, 0.02), woodM, 0, 1.14, 0.08);
    add(g, rbox(0.9, 0.7, 0.02, 0.02), glassM, 0, 1.6, 0.12, { cast: false });
    add(g, new THREE.SphereGeometry(0.045, 8, 6), mat(0xd9b45a, { metalness: 0.6, roughness: 0.3 }), 0.5, 1.05, 0.14);
    // 방 이름 판 (공간 색)
    sign(g, sp.name, { w: 1.9, h: 0.42, y: 2.75, z: 0.06, bg: sp.color, size: 92, tw: 800 });
    if (sp.zone === 'wish') sign(g, '가상 기원 공간', { w: 1.1, h: 0.22, y: 2.38, z: 0.13, bg: '#f2e2b8', fg: '#7a5a10', size: 90, tw: 600 });
    G.add(g);
    spot(S, { id: `door-${id}`, label: sp.name, kind: 'door', pos: [x, 3.25, -D / 2 + 0.3], at: [x, -D / 2 + 1.15], show: 60, onUse: () => { api.audio.play('door'); api.go(id); } });
  }

  // 게시판: 오늘의 응원
  const line = api.dayLine('hall');
  const bt = boardTexture(`오늘의 응원 · ${line.name}`, line.text);
  const boardM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.8 });
  add(G, new THREE.PlaneGeometry(4.6, 2.5), boardM, 0, 1.75, -D / 2 + 0.05, { cast: false });
  spot(S, { id: 'board', label: '게시판 · 오늘의 응원', pos: [0, 3.25, -D / 2 + 0.3], at: [0, -D / 2 + 1.3], show: 60, onUse: () => { api.say('day', { kicker: '게시판에 붙은 응원' }); api.audio.play('sparkle'); } });

  // 서쪽: 현관(운동장으로) / 동쪽: 옥상 계단 · 강당
  {
    const g = new THREE.Group(); g.position.set(-W / 2 + 0.02, 0, 0); g.rotation.y = Math.PI / 2;
    add(g, rbox(2.6, 2.6, 0.12, 0.02), mat(0x6f7884), 0, 1.3, 0.02);
    add(g, rbox(2.3, 2.4, 0.05, 0.02), mat(0xbcd8e4, { roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 1.22, 0.08, { cast: false });
    sign(g, '현관 · 운동장', { w: 2.2, h: 0.45, y: 2.95, z: 0.1, bg: '#22305a', size: 96, tw: 800 });
    G.add(g);
    spot(S, { id: 'out', label: '운동장으로 나가기', kind: 'door', pos: [-W / 2 + 0.4, 3.3, 0], at: [-W / 2 + 1.4, 0], show: 60, onUse: () => { api.audio.play('door'); api.go('field'); } });
  }
  {
    // 계단 (올라가는 모양)
    const stepM = mat(0xd9d4ca);
    for (let i = 0; i < 7; i++) block(G, 1.8, 0.22 * (i + 1), 0.4, 0, W / 2 - 1.1, 0, 2.6 - i * 0.4, { material: stepM, cast: false });
    S.colliders.push(rect(W / 2 - 1.1, 1.4, 1.9, 3));
    sign(G, '옥상 계단', { w: 1.6, h: 0.4, x: W / 2 - 0.12, y: 2.6, z: 1.2, ry: -Math.PI / 2, bg: '#2b2f6b', size: 96, tw: 640 });
    spot(S, { id: 'roof', label: '옥상으로 (별빛 소원)', kind: 'door', pos: [W / 2 - 1.1, 2.9, 1.4], at: [W / 2 - 2.6, 1.6], show: 60, onUse: () => { api.audio.play('door'); api.go('roof'); } });
    const g = new THREE.Group(); g.position.set(W / 2 - 0.02, 0, -1.4); g.rotation.y = -Math.PI / 2;
    add(g, rbox(1.62, 2.42, 0.1, 0.02), frameM, 0, 1.21, 0.03);
    add(g, rbox(1.4, 2.28, 0.06, 0.02), woodM, 0, 1.14, 0.08);
    sign(g, '강당 무대', { w: 1.6, h: 0.42, y: 2.75, z: 0.06, bg: '#8c3b4a', size: 92, tw: 700 });
    G.add(g);
    spot(S, { id: 'stage', label: '강당 무대', kind: 'door', pos: [W / 2 - 0.4, 3.3, -1.4], at: [W / 2 - 1.5, -1.4], show: 60, onUse: () => { api.audio.play('door'); api.go('stage'); } });
  }
  // 화분·사물함
  for (const x of [-21.5, -2.8, 2.8, 21.5]) {
    add(G, new THREE.CylinderGeometry(0.28, 0.22, 0.5, 12), mat(0xb8836a), x, 0.25, -D / 2 + 0.5);
    add(G, new THREE.IcosahedronGeometry(0.42, 1), mat(0x6d9f4f, { flatShading: true }), x, 0.85, -D / 2 + 0.5);
    S.colliders.push(rect(x, -D / 2 + 0.5, 0.6, 0.6));
  }

  // 쉬는 벤치 (창가 쪽 · 여덟 자리)
  for (const [bx, k] of [[-16, 'a'], [-8, 'b'], [8, 'c'], [16, 'd']]) bench(S, bx, D / 2 - 1.0, Math.PI, { idPrefix: `h${k}` });
  S.onSit = () => { api.hold('rest'); api.say('복도 벤치에서 잠깐 숨 돌리기.', { kicker: '쉬어 가기', ms: 2600 }); };
  S.spawns = { west: { x: -W / 2 + 2.4, z: 0.6, ry: Math.PI / 2 }, main: { x: 0, z: 0.8, ry: Math.PI } };
  S.camera = { yaw: 0, pitch: 0.72, dist: 13, minDist: 5, maxDist: 20, yawRange: 0.7, lookHeight: 1.2 };
  S.actions = () => [
    { id: 'today', label: '오늘의 응원', icon: 'note', primary: true, onClick: () => { api.say('day', { kicker: '복도에서 만난 응원' }); api.audio.play('soft'); } },
  ];
  S.hint = '문 위의 이름표를 누르면 걸어가서 들어가요';
  return S;
}
