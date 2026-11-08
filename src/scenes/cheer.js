import * as THREE from 'three';
import { makeScene, room, door, spot, sign, cushion, clickable, bench, mat, rbox, add, block, rect } from './kit.js';
import { canvasTexture, roundRect } from '../engine/materials.js';
import { createAvatar } from '../engine/avatar.js';
import { BLOCK_WORDS } from '../data/phrases.js';
import { drinkBar } from './drinks.js';
import { worryBin } from './worry.js';

// ───────────────────────── 응원 순한맛 ─────────────────────────
export function buildSoft(api) {
  const S = makeScene({ env: { bg: '#f7e6ea', hemi: 1.35, sun: 1.1, hemiSky: '#fff3f6', hemiGround: '#c9a7b6', sunColor: '#fff0f2' } });
  const G = S.group;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xf4dfe3, roughness: 0.95 });
  room(S, { w: 14, d: 10, h: 3.8, floorMat, wallColor: 0xfbeef1, lowerColor: 0xf1d3da, trimColor: 0xd99aac });
  door(S, { x: -5.5, z: -5, label: '복도로', to: 'hall', api, color: 0xc98a9b });
  // 둥근 러그 · 구름 · 별 장식
  const rug = add(G, new THREE.CircleGeometry(3.4, 48), mat(0xffffff, { roughness: 1 }), 0, 0.01, 0.4, { rx: -Math.PI / 2, cast: false });
  add(G, new THREE.RingGeometry(3.0, 3.25, 48), mat(0xf4b6c2), 0, 0.012, 0.4, { rx: -Math.PI / 2, cast: false });
  const clouds = [];
  for (const [cx, cy, cz, s] of [[-4, 3.1, -3.5, 1], [3.5, 3.2, -3.8, 1.2], [0.5, 3.4, -2, 0.8], [5.2, 2.9, 1, 0.7], [-5.3, 3.0, 1.5, 0.75]]) {
    const c = new THREE.Group();
    for (const [bx, by, bs] of [[0, 0, 0.5], [0.5, -0.05, 0.38], [-0.5, -0.06, 0.36], [0.2, 0.2, 0.34]]) add(c, new THREE.SphereGeometry(bs, 14, 10), mat(0xffffff, { roughness: 0.9, emissive: 0xfff6f8, emissiveIntensity: 0.2 }), bx, by, 0, { cast: false });
    c.position.set(cx, cy, cz); c.scale.setScalar(s); G.add(c); clouds.push(c);
  }
  // 하트 쿠션 자리 (바닥에 앉기)
  const cols = [0xf4b6c2, 0xc6a8ff, 0xa8d8ff, 0xffd9a0, 0xb8e6c1, 0xffc4d6];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 2.4, z = 0.4 + Math.sin(a) * 2.4;
    cushion(G, x, z, cols[i], { r: 0.38, h: 0.16 });
    S.seats.push({ id: `c${i}`, x, z, y: -0.27, h: 0.45, ry: Math.atan2(-x, 0.4 - z) });
  }
  // 창에서 들어오는 빛 기둥
  const beam = add(G, new THREE.CylinderGeometry(0.9, 1.6, 3.8, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.FrontSide }), 0, 1.9, 0.4, { cast: false });
  sign(G, ['응원 순한맛', '괜찮아, 잘하고 있어'], { w: 3.4, h: 1.2, x: 2.2, y: 2.35, z: -4.98, bg: '#fffafc', fg: '#c2577a', size: 90, tw: 900, border: '#f4b6c2' });

  const cafe = drinkBar(S, api, { x: 6.2, z: -2.6, ry: -Math.PI / 2, id: 'cafe' });
  // 마음 털기 통 (오른쪽 앞 구석) — 걱정을 구겨 던져 버리기
  const bin = worryBin(S, api, { x: 5.8, z: 3.3, ry: -Math.PI / 2 });
  // 천사 (가상 캐릭터)
  const angel = createAvatar({ outfit: 'angel', hairStyle: 'long', hairColor: 0xe8c27a });
  angel.root.position.set(0, 6, 0);
  angel.root.scale.setScalar(1.15);
  G.add(angel.root);
  const angelLight = new THREE.PointLight(0xfff0c8, 0, 6, 1.5);
  G.add(angelLight);
  let angelState = null;

  function pat() {
    if (angelState) return;
    const p = api.player.pos;
    const f = api.player.facing;
    const tx = p.x + Math.sin(f + 0.9) * 0.75, tz = p.z + Math.cos(f + 0.9) * 0.75;
    angelState = { t: 0, from: new THREE.Vector3(tx, 4.6, tz), to: new THREE.Vector3(tx, p.y + 0.35, tz), face: Math.atan2(p.x - tx, p.z - tz), said: false };
    api.audio.play('warm');
    api.count('pat');
  }
  S.actions = () => [
    { id: 'pat', label: '토닥토닥 받기', icon: 'heart', primary: true, onClick: pat },
    { id: 'warm', label: '따뜻한 말 한마디', icon: 'sparkle', onClick: () => { api.say('soft', { kicker: '순한맛' }); api.audio.play('soft'); } },
    { id: 'worry', label: '마음 털기', icon: 'paper', onClick: () => bin.start() },
    { id: 'cafe', label: '음료 한 잔', icon: 'cup', onClick: () => cafe.start() },
  ];
  S.update = (dt, t) => {
    clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.3 + i) * dt * 0.08; });
    beam.material.opacity = 0.06 + Math.sin(t * 0.8) * 0.02;
    if (angelState) {
      const a = angelState; a.t += dt;
      const T1 = 1.6, T2 = 4.2, T3 = 5.6;
      if (a.t < T1) { const k = 1 - (1 - a.t / T1) ** 3; angel.root.position.lerpVectors(a.from, a.to, k); }
      else if (a.t < T2) { angel.root.position.copy(a.to); angel.root.position.y += Math.sin(t * 3) * 0.05; if (angel.action !== 'pat') angel.play('pat', T2 - T1); if (!a.said && a.t > T1 + 0.6) { a.said = true; api.audio.play('pat'); api.fx.burst({ origin: api.player.pos.clone().add(new THREE.Vector3(0, 1.8, 0)), count: 16, shape: 'heart', size: 0.16, colors: ['#ff8fa3', '#ffb3c6', '#ffd1dc'], speed: [0.4, 1.2], up: 2, gravity: -0.6, life: [1.6, 2.4], spin: 2 }); api.say('soft', { kicker: '천사가 토닥토닥', ms: 4600 }); api.act('nod'); } }
      else if (a.t < T3) { const k = (a.t - T2) / (T3 - T2); angel.root.position.lerpVectors(a.to, a.from, k * k); }
      else { angelState = null; angel.root.position.set(0, 6, 0); }
      angel.root.rotation.y = a.face ?? 0;
      angelLight.position.copy(angel.root.position).add(new THREE.Vector3(0, 1.4, 0));
      angelLight.intensity = angelState ? 6 : 0;
    } else {
      angel.root.position.y = 6;
    }
    angel.update(dt, 0);
  };
  S.spawns = { main: { x: -3.5, z: 2.5, ry: Math.PI * 0.85 } };
  S.camera = { yaw: 0.15, pitch: 0.72, dist: 13, minDist: 5, maxDist: 18, yawRange: 0.8 };
  S.onSit = () => { api.hold('rest'); };
  S.hint = '토닥토닥 받기 · 마음 털기 종이공 · 음료 한 잔 · 쿠션에 앉아도 좋아요';
  return S;
}

// ───────────────────────── 응원 매운맛 ─────────────────────────
function blockTexture(word, color) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const size = word.length > 3 ? 54 : 76;
    g.font = `900 ${size}px Pretendard, Malgun Gothic, sans-serif`;
    g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 6;
    g.fillText(word, w / 2, h / 2 + 4);
  }, { repeat: [1, 1] });
}

export function buildSpicy(api) {
  const S = makeScene({ env: { bg: '#3a1c1c', hemi: 1.5, sun: 1.8, hemiSky: '#ffe6d6', hemiGround: '#8a3a30', sunColor: '#ffe0c8' } });
  const G = S.group;
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x5e3a32, roughness: 0.8 });
  room(S, { w: 15, d: 11, h: 4.2, floorMat, wallColor: 0xb5443a, lowerColor: 0x7a2a24, trimColor: 0x2b1210 });
  door(S, { x: -6, z: -5.5, label: '복도로', to: 'hall', api, color: 0x3a2a26 });
  // 경고 줄무늬 · 간판
  const stripe = canvasTexture(256, 32, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#26252e'; for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h); g.fill(); } }, { repeat: [8, 1] });
  add(G, new THREE.PlaneGeometry(15, 0.3), new THREE.MeshStandardMaterial({ map: stripe }), 0, 3.6, -5.48, { cast: false });
  sign(G, ['응원 매운맛', '불안은 부수고 간다!'], { w: 4.2, h: 1.3, x: 2.5, y: 2.4, z: -5.48, bg: '#1d1212', fg: '#ffcf4a', size: 96, tw: 1000, border: '#d9473b' });
  // 붉은 조명
  const red = new THREE.PointLight(0xff6a4a, 14, 16, 1.6); red.position.set(0, 3.6, 0); G.add(red);

  // 떠다니는 단어 블록
  const colors = ['#d9473b', '#e0703a', '#c2412d', '#b8433a', '#e9a23b', '#7a3b8c'];
  const blocks = [];
  const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  let smashed = 0;
  function spawnBlock(i, word) {
    const color = colors[i % colors.length];
    const tex = blockTexture(word, color);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    m.castShadow = true;
    m.userData.keepGeo = true;
    const x = -5.5 + (i % 5) * 2.7 + (Math.random() - 0.5) * 0.6, z = -2.8 + Math.floor(i / 5) * 2.8 + (Math.random() - 0.5) * 0.6;
    m.position.set(x, 1.4 + Math.random() * 1.2, z);
    m.userData.base = m.position.y; m.userData.ph = Math.random() * 6; m.userData.color = color; m.userData.word = word;
    m.rotation.set(Math.random(), Math.random() * 6, 0);
    G.add(m);
    clickable(S, m, () => smash(m));
    blocks[i] = m;
    return m;
  }
  let words = [...BLOCK_WORDS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 10; i++) spawnBlock(i, words[i]);
  function smash(m) {
    if (!m.visible) return;
    const i = blocks.indexOf(m);
    m.visible = false;
    S.clickables = S.clickables.filter((c) => c !== m);
    api.fx.burst({ origin: m.position.clone(), count: 46, shape: 'shard', size: 0.16, colors: [m.userData.color, '#ffffff', '#26252e'], speed: [3, 7], up: 3, gravity: 9, life: [0.9, 1.6], spin: 14 });
    api.audio.play('shatter'); api.audio.play('thud');
    api.act('throw');
    api.count('smash');
    smashed++;
    shake = 0.35;
    api.hud.updateAction('smash', { badge: smashed });
    if (smashed % 10 === 0) {
      api.say('spicy', { kicker: `${smashed}개 와장창! 대단해`, cls: 'spicy' });
      for (let k = 0; k < 3; k++) setTimeout(() => api.fx.burst({ origin: new THREE.Vector3(-4 + k * 4, 3.4, -1), count: 60, speed: [2, 5], up: 4, gravity: 6 }), k * 200);
      api.audio.play('firework');
    } else if (Math.random() < 0.45) api.say(`"${m.userData.word}" 부쉈다!`, { kicker: '와장창', cls: 'spicy', ms: 1600 });
    setTimeout(() => {
      G.remove(m); m.material.map.dispose(); m.material.dispose();
      if (words.length < 11) words = [...BLOCK_WORDS].sort(() => Math.random() - 0.5);
      const next = words.pop();
      spawnBlock(i, next);
    }, 2600);
  }
  let shake = 0;
  // 쉬어 가는 벤치 (매운맛도 앉아서 숨 고르기)
  bench(S, -1.5, 4.7, Math.PI, { idPrefix: 'sp1', color: 0x7a4a3a });
  bench(S, 3.2, 4.7, Math.PI, { idPrefix: 'sp2', color: 0x7a4a3a });
  bench(S, 6.8, 0.8, -Math.PI / 2, { idPrefix: 'sp3', color: 0x7a4a3a });
  S.onSit = () => { api.hold('rest'); api.say('앉아서 숨 한 번 고르고, 다시 가자.', { kicker: '잠깐 쉬기', cls: 'spicy', ms: 2600 }); };

  // 호통 도깨비 (가상 캐릭터 — 순한맛의 천사 짝)
  const oni = createAvatar({ outfit: 'dokkaebi', hairStyle: 'bob', hairColor: 0x1d1b22 });
  oni.root.scale.setScalar(1.25);
  oni.root.position.set(0, -8, 0);
  oni.root.visible = false; // 호통 때만 나타난다
  G.add(oni.root);
  let oniState = null;
  function scold() {
    if (oniState) return;
    const p = api.player.pos, f = api.player.facing;
    const tx = Math.max(-6.4, Math.min(6.4, p.x + Math.sin(f) * 1.7)), tz = Math.max(-4.4, Math.min(4.6, p.z + Math.cos(f) * 1.7));
    oniState = { t: 0, from: new THREE.Vector3(tx, 7, tz), to: new THREE.Vector3(tx, p.y, tz), face: Math.atan2(p.x - tx, p.z - tz), landed: false };
    oni.root.position.copy(oniState.from);
    oni.root.visible = true;
    api.audio.play('shout');
    api.count('scold');
  }
  S.actions = () => [
    { id: 'smash', label: '블록 부수기', icon: 'hammer', primary: true, badge: smashed, onClick: () => { const v = blocks.filter((b) => b.visible); if (!v.length) return; const near = v.sort((a, b) => a.position.distanceTo(api.player.pos) - b.position.distanceTo(api.player.pos))[0]; smash(near); } },
    { id: 'shout', label: '도깨비 호통 듣기', icon: 'sparkle', onClick: scold },
    { id: 'fire', label: '폭죽', icon: 'firework', onClick: () => { api.fx.burst({ origin: api.player.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), count: 70, speed: [2, 6], up: 5, gravity: 7 }); api.audio.play('pop'); api.audio.play('firework'); api.act('cheer'); } },
  ];
  S.update = (dt, t) => {
    for (const b of blocks) {
      if (!b || !b.visible) continue;
      b.position.y = b.userData.base + Math.sin(t * 1.4 + b.userData.ph) * 0.25;
      b.rotation.y += dt * 0.4; b.rotation.x += dt * 0.15;
    }
    if (shake > 0) { shake = Math.max(0, shake - dt); const s = shake * 0.12; api.camera.position.x += (Math.random() - 0.5) * s; api.camera.position.y += (Math.random() - 0.5) * s; }
    red.intensity = 12 + Math.sin(t * 3) * 3;
    if (oniState) {
      const a = oniState; a.t += dt;
      const T1 = 0.45, T2 = 3.6, T3 = 4.3;
      if (a.t < T1) { const k = a.t / T1; oni.root.position.lerpVectors(a.from, a.to, k * k); }
      else if (a.t < T2) {
        oni.root.position.copy(a.to);
        if (!a.landed) {
          a.landed = true; shake = 0.7;
          api.audio.play('thud'); api.audio.play('shout');
          api.fx.burst({ origin: a.to.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 26, shape: 'spark', size: 0.08, colors: ['#ffb38a', '#fff0dc', '#ff6a4a'], speed: [1.5, 3.2], up: 1.2, gravity: 6, life: [0.4, 0.8] });
          oni.play('shout', 2.8);
          api.say('spicy', { kicker: '호통 도깨비', cls: 'spicy', ms: 3600 });
          api.act('nod');
        }
      } else if (a.t < T3) { const k = (a.t - T2) / (T3 - T2); oni.root.position.lerpVectors(a.to, a.from, k * k); }
      else { oniState = null; oni.root.position.set(0, -8, 0); oni.root.visible = false; }
      oni.root.rotation.y = a.face;
    }
    oni.update(dt, 0);
  };
  S.spawns = { main: { x: -4, z: 3.5, ry: Math.PI * 0.85 } };
  S.camera = { yaw: 0.1, pitch: 0.7, dist: 14, minDist: 5, maxDist: 19, yawRange: 0.8 };
  S.hint = '떠다니는 블록을 직접 눌러서 부숴요';
  S.dispose = () => { for (const b of blocks) if (b) { b.material.map?.dispose(); b.material.dispose(); } };
  return S;
}
