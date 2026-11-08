import * as THREE from 'three';
import { makeScene, floor, door, spot, sign, bench, lieMat, forest, mat, rbox, add, block, rect } from './kit.js';
import { canvasTexture, woodTexture, roundRect } from '../engine/materials.js';
import { createAvatar, lookFromSeed } from '../engine/avatar.js';
import { WISHES } from '../data/phrases.js';
import { SCHOOL } from '../data/school.js';

// ───────────────────────── 옥상 별빛 소원 ─────────────────────────
function moonCanvas(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#05070f'; g.fillRect(0, 0, 320, 320);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; g.fillRect(Math.random() * 320, Math.random() * 320, 1.2, 1.2); }
  if (kind === 'moon') {
    const gr = g.createRadialGradient(140, 140, 20, 160, 160, 120); gr.addColorStop(0, '#f4f1e6'); gr.addColorStop(1, '#bdb7a6');
    g.fillStyle = gr; g.beginPath(); g.arc(160, 160, 112, 0, Math.PI * 2); g.fill();
    let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) { const a = r() * 6.3, d = r() * 95, x = 160 + Math.cos(a) * d, y = 160 + Math.sin(a) * d, rr = 4 + r() * 16; g.fillStyle = 'rgba(120,112,98,.35)'; g.beginPath(); g.arc(x, y, rr, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - 1, y - 1, rr, 3.6, 5.6); g.stroke(); }
    g.fillStyle = 'rgba(5,7,15,.55)'; g.beginPath(); g.arc(205, 150, 112, 0, Math.PI * 2); g.arc(160, 160, 112, 0, Math.PI * 2, true); g.fill('evenodd');
  } else {
    g.save(); g.translate(160, 160); g.rotate(-0.35);
    g.strokeStyle = 'rgba(230,205,150,.85)'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 0, 120, 30, 0, Math.PI, 0); g.stroke();
    const gr = g.createLinearGradient(0, -60, 0, 60); gr.addColorStop(0, '#f2dca6'); gr.addColorStop(0.5, '#d9b878'); gr.addColorStop(1, '#b8945a');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160,120,70,.35)'; g.lineWidth = 5; for (const y of [-30, -10, 12, 32]) { g.beginPath(); g.moveTo(-60, y); g.lineTo(60, y); g.stroke(); }
    g.strokeStyle = 'rgba(240,215,160,.95)'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 0, 120, 30, 0, 0, Math.PI); g.stroke();
    g.restore();
  }
  return c;
}

export function buildRoof(api) {
  const S = makeScene({ env: { sky: true, skyHour: 23.2, night: 1, hemi: 0.75, sun: 0.55, hemiSky: '#7f8fd0', hemiGround: '#2a2f4a', sunColor: '#a8b8ff', exposure: 1.15 } });
  const G = S.group;
  // 초록 방수 바닥
  const roofTex = canvasTexture(256, 256, (g, w, h) => { g.fillStyle = '#3e7d62'; g.fillRect(0, 0, w, h); for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { repeat: [6, 4] });
  floor(S, 24, 14, 0, 0, new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85 }));
  S.bounds = { minX: -11.6, maxX: 11.6, minZ: -6.6, maxZ: 6.6 };
  // 난간
  const railM = mat(0xdcdfe6, { metalness: 0.4, roughness: 0.4 });
  for (const [x, z, w, d] of [[0, -7, 24, 0.1], [0, 7, 24, 0.1], [-12, 0, 0.1, 14], [12, 0, 0.1, 14]]) {
    add(G, new THREE.BoxGeometry(w, 0.08, d), railM, x, 1.1, z);
    add(G, new THREE.BoxGeometry(w, 0.5, d), mat(0xc8c3b8), x, 0.25, z);
  }
  // 물탱크 · 계단실
  add(G, new THREE.CylinderGeometry(1.1, 1.1, 2.2, 20), mat(0xe8e4dc), 8.8, 1.6, -4.6);
  add(G, new THREE.BoxGeometry(2.4, 0.5, 2.4), mat(0x9c9890), 8.8, 0.25, -4.6);
  S.colliders.push(rect(8.8, -4.6, 2.6, 2.6));
  block(G, 3.6, 2.8, 3.0, 0, -9.6, 0, -5.2, { material: mat(0xd8d2c6) });
  S.colliders.push(rect(-9.6, -5.2, 3.8, 3.2));
  door(S, { x: -9.6, z: -3.68, label: '계단으로 내려가기', to: 'hall', api, color: 0x6f7884 });
  // 망원경 (흰 긴 경통·삼각대)
  const scope = new THREE.Group(); scope.position.set(3.2, 0, -1.6);
  for (let i = 0; i < 3; i++) { const leg = add(scope, new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), mat(0x3d4250), Math.cos(i * 2.1) * 0.3, 0.7, Math.sin(i * 2.1) * 0.3); leg.rotation.set(Math.sin(i * 2.1) * 0.35, 0, -Math.cos(i * 2.1) * 0.35); }
  const tube = add(scope, new THREE.CylinderGeometry(0.11, 0.13, 1.5, 16), mat(0xf7f7f2, { roughness: 0.35 }), 0, 1.6, 0);
  tube.rotation.set(-0.8, 0.4, 0);
  G.add(scope);
  S.colliders.push(rect(3.2, -1.6, 0.9, 0.9));
  // 벤치 (누워 보기 대신 앉아 하늘 보기)
  bench(S, -3, 3.8, Math.PI, { idPrefix: 'rf', color: 0x9c7a58 });
  bench(S, 1.4, 3.8, Math.PI, { idPrefix: 'rg', color: 0x9c7a58 });
  bench(S, 5.8, 3.8, Math.PI, { idPrefix: 'rh', color: 0x9c7a58 });
  bench(S, -7.4, 3.8, Math.PI, { idPrefix: 'ri', color: 0x9c7a58 });
  // 돗자리 (누워서 별 보기) 15장
  {
    const cols = [0x6f7fd0, 0x9a7fd0, 0xd08fb0, 0x7fb0d0];
    let mi = 0;
    for (const [mx, mz] of [[-7.6, 0.4], [-6.2, 0.4], [-4.8, 0.4], [-3.4, 0.4], [-2.0, 0.4], [-0.6, 0.4], [4.6, 0.4], [6.0, 0.4], [7.4, 0.4], [8.8, 0.4], [-5.2, -3.2], [-3.8, -3.2], [-2.4, -3.2], [-1.0, -3.2], [0.4, -3.2]]) {
      lieMat(S, mx, mz, { id: `lm${mi}`, ry: 0, color: cols[mi % 4], stripe: 0xe8ecff }); mi++;
    }
  }
  // 멀리 보이는 동네 불빛·산 그림자
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0x1c2040), 80);
  const lights = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd98a, toneMapped: false }), 240);
  const d = new THREE.Object3D(); let li = 0;
  for (let i = 0; i < 80; i++) {
    const a = Math.PI * 0.15 + (i / 80) * Math.PI * 0.7, r = 60 + Math.random() * 50;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.6 + 20, h = 4 + Math.random() * 16, w = 4 + Math.random() * 6;
    d.position.set(x, -14 + h / 2, z); d.scale.set(w, h, w); d.rotation.set(0, 0, 0); d.updateMatrix(); city.setMatrixAt(i, d.matrix);
    for (let k = 0; k < 3 && li < 240; k++, li++) { d.position.set(x + (Math.random() - 0.5) * w * 0.7, -14 + Math.random() * h, z - w / 2 - 0.05); d.scale.set(1, 1, 1); d.rotation.set(0, Math.PI, 0); d.updateMatrix(); lights.setMatrixAt(li, d.matrix); }
  }
  lights.count = li;
  G.add(city); G.add(lights);
  forest(G, Array.from({ length: 40 }, (_, i) => ({ x: -70 + i * 3.6, z: -46 - Math.random() * 10, y: -8, s: 2 + Math.random(), kind: 'round' })), { shadows: false });
  sign(G, ['옥상 별빛 소원', '평소엔 출입 통제 · 천체관측회 날을 가상으로'], { w: 4.4, h: 0.9, x: 0, y: 0.55, z: -6.88, bg: '#2b2f6b', size: 64, tw: 1100 });

  // 소원 별 (오늘 빈 소원이 하늘에 모인다)
  const wishStars = [];
  const starGeo = new THREE.OctahedronGeometry(0.5, 0);
  function addWishStar(text, mine) {
    const m = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: mine ? 0xffe08a : 0xcfe0ff, toneMapped: false }));
    m.userData.keepGeo = true;
    const a = Math.random() * Math.PI * 1.4 - 0.2, h = 26 + Math.random() * 22, r = 30 + Math.random() * 30;
    m.position.set(Math.cos(a) * r, h, -Math.abs(Math.sin(a)) * r - 10);
    m.userData.ph = Math.random() * 6;
    G.add(m); wishStars.push(m);
    if (wishStars.length > 60) { const o = wishStars.shift(); G.remove(o); o.material.dispose(); }
    return m;
  }
  let shoot = null;
  function shootingStar(text, mine = true) {
    const start = new THREE.Vector3(-30 + Math.random() * 20, 40, -40), end = new THREE.Vector3(20 + Math.random() * 20, 22, -30);
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.25, 9, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false }));
    trail.position.copy(start); G.add(trail);
    const dir = end.clone().sub(start).normalize();
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    shoot = { trail, start, end, t: 0, text, mine };
    api.audio.play('shootingStar');
  }
  function openWish() {
    api.hud.openPanel({
      title: '별똥별 소원', sub: '하나 고르면 별똥별이 떨어지고, 소원이 별이 되어 하늘에 남아요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${WISHES.map((w, i) => `<button class="choice" data-i="${i}">${w}</button>`).join('')}</div>`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
          api.hud.closePanel();
          const w = WISHES[+b.dataset.i];
          api.hold('look'); api.rig.goalLookUp = 6; api.rig.goalPitch = 0.1;
          shootingStar(w);
          api.presence.action(`ws${b.dataset.i}`);
          api.count('wish');
          setTimeout(() => api.hold(null), 4000);
        }));
      },
    });
  }
  function telescope() {
    let kind = 'moon';
    api.act('nod');
    api.hud.openPanel({
      title: '망원경', sub: '달과 토성을 번갈아 봐요. (그린 그림이에요)',
      tabs: [{ id: 'moon', label: '달' }, { id: 'saturn', label: '토성' }],
      render(body, id) {
        kind = id || 'moon';
        body.innerHTML = `<div class="scope"></div><p class="src">${kind === 'moon' ? '초승달 쪽 그림자 경계에서 크레이터가 가장 또렷해요.' : '토성 고리는 작은 망원경으로도 보일 만큼 밝아요.'} 우리 학교는 해마다 1~2번 옥상 천체관측회를 열어요. 평소 옥상은 출입을 통제해요.</p>`;
        body.querySelector('.scope').appendChild(moonCanvas(kind));
        api.audio.play('sparkle');
      },
    });
  }
  spot(S, { id: 'scope', label: '망원경 보기', pos: [3.2, 2.6, -1.6], at: [2.6, -0.6], onUse: telescope });
  S.actions = () => [
    { id: 'wish', label: '별똥별 소원', icon: 'star', primary: true, onClick: openWish },
    { id: 'scope', label: '망원경', icon: 'telescope', onClick: () => { const s = S.spots.find((x) => x.id === 'scope'); api.walkTo(s.at.x, s.at.z, telescope); } },
    { id: 'look', label: '하늘 보기', icon: 'moon', onClick: () => { api.hold('look'); api.rig.goalLookUp = 6; api.rig.goalPitch = 0.1; api.say('roof', { kicker: '별 보기' }); setTimeout(() => { api.hold(null); api.rig.goalLookUp = 0; api.rig.goalPitch = 0.45; }, 7000); } },
  ];
  S.onPeerAction = (pos, name) => { if (name.startsWith('ws')) shootingStar(WISHES[+name.slice(2)] || '', false); };
  for (let i = 0; i < 12; i++) addWishStar('', false);
  S.onSit = (seat) => { if (!seat?.lie) api.hold('look'); api.rig.goalLookUp = seat?.lie ? 3.2 : 5; api.rig.goalPitch = seat?.lie ? 0.2 : 0.12; api.say('roof', { kicker: seat?.lie ? '누워서 별 보기' : '별 보기' }); };
  S.onStand = () => { api.rig.goalLookUp = 0; api.rig.goalPitch = 0.45; };
  S.update = (dt, t) => {
    for (const m of wishStars) { m.rotation.y += dt; const s = 0.7 + Math.sin(t * 2 + m.userData.ph) * 0.25; m.scale.setScalar(s); }
    if (shoot) {
      shoot.t += dt / 1.3;
      shoot.trail.position.lerpVectors(shoot.start, shoot.end, Math.min(1, shoot.t));
      shoot.trail.material.opacity = 0.9 * (1 - shoot.t);
      if (shoot.t >= 1) {
        G.remove(shoot.trail); shoot.trail.geometry.dispose(); shoot.trail.material.dispose();
        const star = addWishStar(shoot.text, shoot.mine);
        if (shoot.mine) { api.say(shoot.text, { kicker: '소원이 별이 되었어요' }); api.audio.play('sparkle'); const id = `deco:ws${Date.now()}`; api.labels.set(id, { text: shoot.text, cls: 'bubble', getPos: (v) => v.copy(star.position) }); setTimeout(() => api.labels.remove(id), 5000); }
        shoot = null;
      }
    }
  };
  S.spawns = { main: { x: -6.4, z: -1.4, ry: Math.PI * 0.75 } };
  S.camera = { yaw: 0.2, pitch: 0.45, dist: 11, minDist: 4, maxDist: 18 };
  S.hint = '별똥별 소원을 고르거나 망원경으로 달을 봐요';
  return S;
}

// ───────────────────────── 강당 무대 ─────────────────────────
export function buildStage(api) {
  const S = makeScene({ env: { bg: '#2a2530', hemi: 0.95, sun: 0.9, hemiSky: '#ffe9d2', hemiGround: '#5a4636', sunColor: '#fff0dc' } });
  const G = S.group;
  const W = 24, D = 20;
  const wt = woodTexture().clone(); wt.needsUpdate = true; wt.repeat.set(8, 6);
  floor(S, W, D, 0, 0, new THREE.MeshStandardMaterial({ map: wt, color: 0xe7c493, roughness: 0.55 }));
  S.bounds = { minX: -W / 2 + 0.3, maxX: W / 2 - 0.3, minZ: -D / 2 + 0.3, maxZ: D / 2 - 0.3 };
  const wallM = mat(0xeae2d4);
  for (const [x, z, w, d, h] of [[0, -D / 2 - 0.1, W, 0.2, 8], [-W / 2 - 0.1, 0, 0.2, D, 8], [W / 2 + 0.1, 0, 0.2, D, 8]]) add(G, new THREE.BoxGeometry(w, h, d), wallM, x, h / 2, z);
  add(G, new THREE.BoxGeometry(W, 0.8, 0.2), wallM, 0, 0.4, D / 2 + 0.1);
  // 코트 선
  const lineM = mat(0x2f63e0);
  for (const [x, z, w, d] of [[0, 2, 16, 0.08], [0, 9, 16, 0.08], [-8, 5.5, 0.08, 7], [8, 5.5, 0.08, 7], [0, 5.5, 0.08, 7]]) add(G, new THREE.BoxGeometry(w, 0.01, d), lineM, x, 0.012, z, { cast: false });
  // 무대
  const stageTop = 1.1;
  const stageMat = new THREE.MeshStandardMaterial({ map: (() => { const t = woodTexture().clone(); t.needsUpdate = true; t.repeat.set(5, 2); return t; })(), color: 0xc9925a, roughness: 0.5 });
  block(G, 16, stageTop, 6, 0, 0, 0, -6.6, { material: stageMat });
  const stageFloor = floor(S, 16, 6, 0, -6.6, new THREE.MeshBasicMaterial({ visible: false }), stageTop + 0.001);
  // 계단 (앞 가운데)
  for (let i = 0; i < 4; i++) block(G, 3, stageTop * (i + 1) / 4, 0.45, 0, 0, 0, -1.8 - 0.225 - i * 0.45, { material: stageMat, cast: false });
  const stepsZ0 = -3.6, stepsZ1 = -1.8;
  S.heightAt = (x, z) => {
    if (Math.abs(x) < 8 && z < stepsZ0 && z > -9.6) return stageTop;
    if (Math.abs(x) < 1.5 && z >= stepsZ0 && z < stepsZ1) return stageTop * (stepsZ1 - z) / (stepsZ1 - stepsZ0);
    return 0;
  };
  // 무대 앞면 막기 (계단만 통과)
  S.colliders.push(rect(-4.8, -3.65, 6.4, 0.3), rect(4.8, -3.65, 6.4, 0.3));
  // 막 · 현수막 · 조명
  const curtainM = mat(0x8c2f3a, { roughness: 0.85 });
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(3.2, 6.4, 16, 1);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * 0.12);
    geo.computeVertexNormals();
    add(G, geo, curtainM, side * 6.6, stageTop + 3.2, -9.0, { cast: false });
  }
  add(G, new THREE.PlaneGeometry(16, 1.0), curtainM, 0, stageTop + 6.0, -9.0, { cast: false });
  const banner = canvasTexture(1400, 280, (g, w, h) => {
    g.fillStyle = '#22305a'; roundRect(g, 0, 0, w, h, 30); g.fill();
    g.fillStyle = '#e9b44c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 104px Pretendard, Malgun Gothic, sans-serif'; g.fillText(`${SCHOOL.short} 3학년, 미리 합격 축하해!`, w / 2, h / 2 - 22);
    g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '700 44px Pretendard, Malgun Gothic, sans-serif'; g.fillText('2027학년도 수능 · 끝까지 해낸 너에게', w / 2, h / 2 + 76);
  }, { repeat: [1, 1] });
  add(G, new THREE.PlaneGeometry(10, 2), new THREE.MeshStandardMaterial({ map: banner, emissive: 0xffffff, emissiveMap: banner, emissiveIntensity: 0.3 }), 0, stageTop + 4.0, -9.4, { cast: false });
  const spotL = new THREE.SpotLight(0xfff2d6, 0, 22, 0.32, 0.5, 1.2);
  spotL.position.set(0, 9, 2); spotL.castShadow = false;
  G.add(spotL); G.add(spotL.target);
  const cone = add(G, new THREE.ConeGeometry(1.6, 8.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2d6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 0, 5, -5, { cast: false });
  // 관객 (가상 · 가벼운 모양)
  const audience = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
    if ((r + c) % 5 === 2) continue;
    const a = createAvatar({ ...lookFromSeed(`hall${r}${c}`), lite: true });
    const x = -8 + c * 2, z = 2.6 + r * 2.4;
    add(G, rbox(0.5, 0.06, 0.46, 0.02), mat(0x7a8c9e), x, 0.44, z, { cast: false });
    a.root.position.set(x, 0, z); a.root.rotation.y = Math.PI; a.sit(0.46);
    G.add(a.root); audience.push(a);
    S.colliders.push(rect(x, z, 0.6, 0.6));
  }
  S.colliders.push(rect(0, -9.6, 16, 0.6));
  // 객석 뒤줄·옆벽 벤치 (앉아서 무대 보기)
  for (const [bx, k] of [[-6, 'a'], [0, 'b'], [6, 'c']]) bench(S, bx, 9.0, Math.PI, { idPrefix: `sb${k}` });
  for (const [bz, k] of [[3, 'a'], [7, 'b']]) bench(S, -10.7, bz, Math.PI / 2, { idPrefix: `sw${k}` });
  S.onSit = () => { api.hold('rest'); api.say('stage', { kicker: '객석에서 보기' }); };
  door(S, { x: W / 2 - 0.05, z: 6, ry: -Math.PI / 2, label: '복도로', to: 'hall', api, color: 0x7a5a3f });

  let ceremony = 0;
  function onStage() { return api.player.pos.y > stageTop - 0.2; }
  function celebrate() {
    if (!onStage()) { api.walkTo(0, -6.2, () => { api.player.facing = 0; api.player.sync(); celebrate(); }); return; }
    ceremony = 6;
    api.act('cheer');
    api.audio.play('applause', 4); api.audio.play('sparkle');
    api.count('stage');
    for (let k = 0; k < 4; k++) setTimeout(() => api.fx.burst({ origin: new THREE.Vector3(-6 + k * 4, stageTop + 6, -6), count: 70, speed: [1, 3], up: 0.5, gravity: 2.2, life: [2.5, 3.6], size: 0.14 }), k * 250);
    api.say('stage', { kicker: '미리 합격 축하식', ms: 5000 });
    audience.forEach((a, i) => setTimeout(() => a.play('clap', 3), i * 40));
  }
  S.actions = () => [
    { id: 'celebrate', label: '미리 합격 축하식', icon: 'stage', primary: true, onClick: celebrate },
    { id: 'clap', label: '박수 보내기', icon: 'sparkle', onClick: () => { api.act('clap'); api.audio.play('applause', 2); audience.forEach((a, i) => setTimeout(() => a.play('clap', 2), i * 30)); } },
  ];
  spot(S, { id: 'stage-center', label: '무대 위로', pos: [0, stageTop + 2.6, -6.2], at: [0, -6.2], onUse: () => { api.player.facing = 0; api.player.sync(); api.say('조명이 너를 비춰요. "미리 합격 축하식"을 눌러 봐요.', { kicker: '무대 위' }); } });
  S.update = (dt) => {
    const on = onStage();
    const want = on ? (ceremony > 0 ? 260 : 120) : 0;
    spotL.intensity += (want - spotL.intensity) * (1 - Math.exp(-dt * 4));
    spotL.target.position.copy(api.player.pos);
    cone.material.opacity = Math.min(0.14, spotL.intensity / 1800);
    cone.position.set(api.player.pos.x * 0.6, 5, api.player.pos.z * 0.5 - 3);
    cone.lookAt(api.player.pos.x, 0, api.player.pos.z);
    cone.rotateX(-Math.PI / 2);
    if (ceremony > 0) ceremony -= dt;
    for (const a of audience) a.update(dt, 0);
  };
  S.spawns = { main: { x: 9.6, z: 6, ry: -Math.PI / 2 } };
  S.camera = { yaw: 0.25, pitch: 0.42, dist: 14, minDist: 5, maxDist: 22, yawRange: 0.9 };
  S.hint = '무대에 올라 미리 합격 축하식을 열어요';
  return S;
}
