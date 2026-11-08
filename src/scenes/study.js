import * as THREE from 'three';
import { makeScene, room, door, spot, sign, clickable, mat, rbox, add, block, rect, tileTexture } from './kit.js';
import { canvasTexture, roundRect, woodTexture } from '../engine/materials.js';
import { createAvatar, lookFromSeed } from '../engine/avatar.js';
import { SCHOOL } from '../data/school.js';
import { PRESETS, SCHEDULE, phaseAt, nextExam, NOTES, NOTES_SOURCE } from '../data/exam.js';
import { TERMS, TERM_KINDS, shuffled } from '../data/korean-terms.js';
import { fetchMeals } from '../data/meal.js';
import { seoulParts, daysUntil, DOW_KO } from '../data/time.js';
import { nowMs } from '../data/time.js';
import { drinkBar } from './drinks.js';

// ── 집중 타이머 (마감 시각 기준이라 탭이 쉬어도 어긋나지 않는다) ──
const timer = { preset: PRESETS[0], endAt: 0, pausedLeft: 0, running: false, done: false };
function timerLeft() { return timer.running ? Math.max(0, timer.endAt - Date.now()) : timer.pausedLeft || timer.preset.minutes * 60000; }
const fmt = (ms) => { const s = Math.ceil(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`; };

function clockTexture(text, sub) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#1d2a50'; roundRect(g, 0, 0, w, h, 26); g.fill();
    g.fillStyle = '#e9b44c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 104px Pretendard, Malgun Gothic, sans-serif'; g.fillText(text, w / 2, h / 2 - 16);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 34px Pretendard, Malgun Gothic, sans-serif'; g.fillText(sub, w / 2, h / 2 + 70);
  }, { repeat: [1, 1] });
}

let mealCache = null;
async function loadMeals() {
  const p = seoulParts();
  if (mealCache && mealCache.ymd === p.ymd) return mealCache;
  try { mealCache = { ymd: p.ymd, meals: await fetchMeals(SCHOOL.neis, p.ymd), error: null }; }
  catch (e) { mealCache = { ymd: p.ymd, meals: [], error: e.message || '불러오지 못했어요' }; }
  return mealCache;
}

// ───────────────────────── 자습실 ─────────────────────────
export function buildStudy(api) {
  const S = makeScene({ env: { bg: '#ece6da', hemi: 1.25, sun: 1.3, hemiSky: '#fffaf0', hemiGround: '#a89f8f' } });
  const G = S.group;
  const ft = tileTexture().clone(); ft.needsUpdate = true;
  room(S, { w: 16, d: 11, h: 3.6, floorMat: new THREE.MeshStandardMaterial({ map: ft, color: 0xc9c7c2, roughness: 0.7 }), wallColor: 0xf7f3ea, lowerColor: 0xdcd6ca, trimColor: 0x6b6458 });
  door(S, { x: -6.6, z: -5.5, label: '복도로', to: 'hall', api, color: 0x9c7a58 });
  // 아치 창 (학봉 독서실 느낌)
  for (const x of [-3.2, 0, 3.2, 6.2]) {
    add(G, rbox(1.8, 1.7, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0xcfe2ea, emissive: 0xeef7ff, emissiveIntensity: 0.55 }), x, 1.95, -5.47, { cast: false });
    add(G, new THREE.CircleGeometry(0.9, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xcfe2ea, emissive: 0xeef7ff, emissiveIntensity: 0.55 }), x, 2.8, -5.465, { cast: false });
    add(G, new THREE.BoxGeometry(0.06, 2.6, 0.04), mat(0xffffff), x, 2.1, -5.44, { cast: false });
  }
  // 칸막이 책상 12석 (낮은 목재 칸막이 · 긴 흰 독서등 · 회색 메쉬 의자)
  const woodM = new THREE.MeshStandardMaterial({ map: (() => { const t = woodTexture().clone(); t.needsUpdate = true; return t; })(), color: 0xe8c9a0, roughness: 0.7 });
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 0.9 });
  const chairM = mat(0x8a8d94, { roughness: 0.6 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
    const x = -5.5 + c * 2.0 + (c > 2 ? 0.6 : 0), z = -2.0 + r * 3.4;
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    block(g, 1.6, 0.05, 0.8, 0, 0, 0.74, 0, { material: woodM });
    for (const sx of [-0.78, 0.78]) block(g, 0.04, 0.74, 0.76, 0, sx, 0, 0, { material: mat(0x9c8f80) });
    block(g, 1.6, 0.5, 0.04, 0, 0, 0.79, -0.4, { material: woodM });
    for (const sx of [-0.79, 0.79]) block(g, 0.03, 0.45, 0.8, 0, sx, 0.79, 0, { material: woodM });
    add(g, rbox(1.2, 0.04, 0.08, 0.02), lampM, 0, 1.22, -0.34, { cast: false });
    // 책·필통
    add(g, rbox(0.34, 0.05, 0.26, 0.01), mat([0x5b6fb5, 0xd9473b, 0x2f7a5f, 0xe9b44c][(r + c) % 4]), -0.35, 0.81, -0.05, { ry: 0.1 });
    // 의자
    const ch = new THREE.Group(); ch.position.set(0, 0, 0.62); g.add(ch);
    add(ch, rbox(0.5, 0.06, 0.48, 0.03), chairM, 0, 0.46, 0);
    add(ch, rbox(0.5, 0.5, 0.05, 0.03), chairM, 0, 0.75, 0.24);
    add(ch, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), mat(0x3d4250), 0, 0.22, 0);
    S.colliders.push(rect(x, z, 1.7, 0.85));
    S.seats.push({ id: `d${r}${c}`, x, z: z + 0.62, y: 0, h: 0.48, ry: Math.PI });
  }
  // 벽시계 · 타이머 판
  let clockTex = clockTexture('00:00', '집중 타이머');
  const clockM = new THREE.MeshStandardMaterial({ map: clockTex, emissive: 0xffffff, emissiveMap: clockTex, emissiveIntensity: 0.35 });
  add(G, new THREE.PlaneGeometry(2.2, 1.1), clockM, -4.0, 2.6, -5.46, { cast: false });
  sign(G, ['자습실', '조용히, 그러나 꾸준히'], { w: 2.6, h: 0.9, x: 3.6, y: 0.75, z: 5.62, bg: '#3f7a8c', size: 80, tw: 760 });
  // 급식 안내판
  const mealBoard = add(G, rbox(1.4, 1.8, 0.06, 0.04), mat(0xffffff), 7.94, 1.5, 0, { ry: -Math.PI / 2 });
  sign(G, ['오늘 급식', '눌러서 보기'], { w: 1.2, h: 0.7, x: 7.9, y: 1.7, z: 0, ry: -Math.PI / 2, bg: '#e9b44c', fg: '#26252e', size: 90, tw: 500 });
  spot(S, { id: 'meal', label: '오늘 급식', pos: [7.6, 2.8, 0], at: [6.8, 0.6], onUse: () => openPanel('meal') });
  const cafe = drinkBar(S, api, { x: 7.2, z: -3.6, ry: -Math.PI / 2, id: 'cafe' });
  spot(S, { id: 'clock', label: '집중 타이머', pos: [-4.0, 3.4, -5.2], at: [-4.0, -3.6], onUse: () => openPanel('timer') });

  function openPanel(tab = 'timer') {
    api.hud.openPanel({
      title: '자습실', sub: '타이머는 창을 닫아도 계속 흘러가요.',
      tabs: [{ id: 'timer', label: '집중 타이머' }, { id: 'terms', label: '국어 단어장' }, { id: 'meal', label: '오늘 급식' }],
      tab,
      render(body, id) {
        if (id === 'timer') renderTimer(body);
        if (id === 'terms') renderTerms(body);
        if (id === 'meal') renderMeal(body);
      },
      onClose: () => { clearInterval(panelTick); },
    });
  }
  let panelTick = null;
  function renderTimer(body) {
    body.innerHTML = `<div class="timer-face"><div class="big">${fmt(timerLeft())}</div><div class="what">${timer.preset.label} ${timer.preset.minutes}분 ${timer.running ? '· 집중하는 중' : ''}</div></div>
      <div class="ring"><i></i></div>
      <div class="presets">${PRESETS.map((p) => `<button class="preset ${p.id === timer.preset.id ? 'on' : ''}" data-id="${p.id}">${p.label}<small>${p.minutes}분</small></button>`).join('')}</div>
      <div class="row-btns"><button class="btn primary go">${timer.running ? '잠깐 멈춤' : timerLeft() < timer.preset.minutes * 60000 ? '이어서' : '시작'}</button><button class="btn rs">처음으로</button></div>
      <p class="src">국어 80분 · 수학 100분 · 영어 70분 · 탐구 30분은 실제 수능 시험 시간이에요. 자리에 앉아 시작하면 공부하는 모습이 다른 친구에게도 보여요.</p>`;
    const big = body.querySelector('.big'), bar = body.querySelector('.ring i'), go = body.querySelector('.go');
    const paint = () => { const left = timerLeft(); big.textContent = fmt(left); bar.style.width = `${100 - (left / (timer.preset.minutes * 60000)) * 100}%`; go.textContent = timer.running ? '잠깐 멈춤' : left < timer.preset.minutes * 60000 && left > 0 ? '이어서' : '시작'; };
    paint();
    clearInterval(panelTick); panelTick = setInterval(paint, 500);
    body.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { timer.preset = PRESETS.find((p) => p.id === b.dataset.id); timer.running = false; timer.pausedLeft = 0; timer.done = false; renderTimer(body); }));
    go.addEventListener('click', () => {
      if (timer.running) { timer.pausedLeft = timerLeft(); timer.running = false; api.hold(api.player.seat ? 'rest' : null); }
      else { const left = timerLeft() || timer.preset.minutes * 60000; timer.endAt = Date.now() + left; timer.running = true; timer.done = false; if (api.player.seat) api.hold('write'); else { const s = api.freeSeat(); if (s) api.sit(s).then(() => setTimeout(() => api.hold('write'), 1600)); } api.audio.play('tick'); api.say('study', { kicker: `${timer.preset.label} ${timer.preset.minutes}분 시작` }); }
      paint();
    });
    body.querySelector('.rs').addEventListener('click', () => { timer.running = false; timer.pausedLeft = 0; timer.done = false; paint(); });
  }
  let deck = shuffled(TERMS), di = 0, shown = false, kind = '전체';
  function renderTerms(body) {
    body.innerHTML = `<div class="tabs" style="padding:0 0 6px">${TERM_KINDS.map((k) => `<button class="tab ${k === kind ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div><div class="term-card" role="button" tabindex="0"></div><div class="term-count"></div><p class="src">뜻을 가린 채로 나와요. 한 번 누르면 뜻, 한 번 더 누르면 다음 카드. 순서는 매번 섞여요.</p>`;
    const card = body.querySelector('.term-card'), count = body.querySelector('.term-count');
    const list = () => deck.filter((t) => kind === '전체' || t.kind === kind);
    const paint = () => {
      const l = list(); const t = l[di % l.length];
      card.innerHTML = `<div class="term-kind">${t.kind}</div><div class="term-word">${api.hud.esc(t.term)}</div>${shown ? `<div class="term-mean">${api.hud.esc(t.mean)}</div>${t.ex ? `<div class="term-ex">${api.hud.esc(t.ex)}</div>` : ''}` : '<div class="term-hide">눌러서 뜻 보기</div>'}`;
      count.textContent = `${(di % l.length) + 1} / ${l.length}`;
    };
    const tap = () => { if (!shown) { shown = true; api.audio.play('click'); } else { shown = false; di++; api.audio.play('tick'); if (di % list().length === 0) deck = shuffled(TERMS); } paint(); };
    card.addEventListener('click', tap);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    body.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.k; di = 0; shown = false; body.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x === b)); paint(); }));
    paint();
  }
  async function renderMeal(body) {
    const p = seoulParts();
    body.innerHTML = `<div class="meal-day">${p.mo}월 ${p.d}일 (${DOW_KO[p.dow]}) · ${SCHOOL.name}</div><div class="meal-empty">급식 정보를 불러오는 중…</div>`;
    const m = await loadMeals();
    if (!body.isConnected) return;
    if (m.error) { body.querySelector('.meal-empty').textContent = `급식 정보를 불러오지 못했어요. (${m.error})`; return; }
    if (!m.meals.length) { body.querySelector('.meal-empty').innerHTML = p.dow === 0 || p.dow === 6 ? '오늘은 주말이라 급식이 없어요.<br/>맛있는 거 먹고 푹 쉬어요.' : '오늘은 등록된 급식 정보가 없어요.'; return; }
    body.innerHTML = `<div class="meal-day">${p.mo}월 ${p.d}일 (${DOW_KO[p.dow]}) · ${SCHOOL.name}</div>` + m.meals.map((ml) => `<div class="zone" style="margin-top:8px"><span>${api.hud.esc(ml.meal)}</span><em>${api.hud.esc(ml.kcal)}</em></div><ul class="meal-list">${ml.dishes.map((d) => `<li><span>${d.emoji}</span>${api.hud.esc(d.name)}</li>`).join('')}</ul>`).join('') + '<p class="meal-src">나이스 교육정보 개방 포털에서 오늘 것만 실시간으로 받아와요. 알레르기 번호는 지웠어요.</p>';
  }

  S.actions = () => [
    { id: 'timer', label: timer.running ? `타이머 ${fmt(timerLeft())}` : '집중 타이머', icon: 'clock', primary: true, onClick: () => openPanel('timer') },
    { id: 'terms', label: '국어 단어장', icon: 'book', onClick: () => openPanel('terms') },
    { id: 'meal', label: '오늘 급식', icon: 'meal', onClick: () => openPanel('meal') },
    { id: 'cafe', label: '아아 한 잔', icon: 'cup', onClick: () => cafe.start() },
  ];
  let last = '';
  S.update = () => {
    const left = timerLeft();
    const text = fmt(left);
    if (timer.running && left <= 0 && !timer.done) {
      timer.done = true; timer.running = false; timer.pausedLeft = 0;
      api.audio.play('timerDone'); api.say(`${timer.preset.label} ${timer.preset.minutes}분 끝! 정말 수고했어요. 이제 꼭 쉬기.`, { kicker: '타이머 끝', ms: 6000 });
      api.hold('rest'); api.count('focus');
    }
    if (text !== last) {
      last = text;
      const t = clockTexture(timer.running ? text : fmt(timer.preset.minutes * 60000), timer.running ? `${timer.preset.label} 집중 중` : '집중 타이머');
      clockM.map.dispose(); clockM.map = t; clockM.emissiveMap = t; clockM.needsUpdate = true;
      if (timer.running) api.hud.updateAction('timer', { label: `타이머 ${text}` });
    }
  };
  S.onSit = () => { if (timer.running) api.hold('write'); };
  S.dispose = () => clearInterval(panelTick);
  S.spawns = { main: { x: -6.4, z: 4.0, ry: Math.PI * 0.8 } };
  S.camera = { yaw: 0.1, pitch: 0.72, dist: 14, minDist: 5, maxDist: 19, yawRange: 0.8 };
  S.hint = '자리에 앉아 타이머를 켜면 공부 모드 · 오른쪽 벽에 오늘 급식';
  return S;
}

// ───────────────────────── 시험고사장 ─────────────────────────
function boardTex(p, phase, next, examDay) {
  return canvasTexture(1024, 400, (g, w, h) => {
    g.fillStyle = '#2f5a45'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 18; g.strokeRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.92)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.font = '800 40px Pretendard, Malgun Gothic, sans-serif';
    g.fillText(examDay ? '2027학년도 대학수학능력시험' : '오늘이 수능날이라면?', 50, 40);
    g.font = '900 96px Pretendard, Malgun Gothic, sans-serif';
    g.fillStyle = '#fff6c8';
    g.fillText(phase.label, 50, 110);
    g.font = '700 42px Pretendard, Malgun Gothic, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(`${phase.start} ~ ${phase.end}${phase.minutes ? ` · ${phase.minutes}분` : ''}`, 54, 230);
    if (next) g.fillText(`다음: ${next.label} ${next.start}`, 54, 290);
    g.textAlign = 'right'; g.font = '900 72px Pretendard, Malgun Gothic, sans-serif'; g.fillStyle = '#ffffff';
    g.fillText(p.hm, w - 50, 40);
    g.font = '600 30px Pretendard, Malgun Gothic, sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
    g.fillText('서울 시각', w - 50, 122);
  }, { repeat: [1, 1] });
}

export function buildExam(api) {
  const S = makeScene({ env: { bg: '#e6e1d6', hemi: 1.25, sun: 1.4, hemiSky: '#fffaf0', hemiGround: '#a89f8f' } });
  const G = S.group;
  const wt = woodTexture().clone(); wt.needsUpdate = true;
  room(S, { w: 15, d: 12, h: 3.6, floorMat: new THREE.MeshStandardMaterial({ map: wt, color: 0xd8c4a6, roughness: 0.75 }), wallColor: 0xf7f3ea, lowerColor: 0xe6c9c9, trimColor: 0x6b5b4b });
  door(S, { x: -6.2, z: -6, label: '복도로', to: 'hall', api, color: 0x9c7a58 });
  // 칠판 · 시계
  const p0 = seoulParts();
  let bt = boardTex(p0, phaseAt(p0.minuteOfDay), nextExam(p0.minuteOfDay), daysUntil(SCHOOL.examDate) === 0);
  const boardM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 });
  add(G, new THREE.PlaneGeometry(6.4, 2.5), boardM, 0.8, 1.9, -5.95, { cast: false });
  block(G, 1.4, 1.0, 0.7, 0, 0.8, 0, -4.9, { material: mat(0x9c7a58) });
  S.colliders.push(rect(0.8, -4.9, 1.5, 0.8));
  sign(G, ['제 ○○ 시험실', '수험생 28명'], { w: 1.8, h: 0.6, x: 5.9, y: 2.8, z: -5.94, bg: '#ffffff', fg: '#26252e', size: 70, tw: 600 });
  // 책상 24 + 가상 수험생
  const deskM = mat(0xc9e2a8), legM = mat(0x8a8d94), chairM = mat(0xc9e2a8);
  const npcs = [], seats = [];
  let seed = 5; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = -5.0 + c * 2.0, z = -2.6 + r * 2.2;
    block(G, 0.9, 0.04, 0.6, 0, x, 0.72, z, { material: deskM });
    for (const [lx, lz] of [[-0.4, -0.26], [0.4, -0.26], [-0.4, 0.26], [0.4, 0.26]]) add(G, new THREE.CylinderGeometry(0.02, 0.02, 0.72, 5), legM, x + lx, 0.36, z + lz, { cast: false });
    add(G, rbox(0.42, 0.05, 0.4, 0.02), chairM, x, 0.44, z + 0.52, { cast: false });
    add(G, rbox(0.42, 0.4, 0.04, 0.02), chairM, x, 0.7, z + 0.73, { cast: false });
    S.colliders.push(rect(x, z, 0.95, 0.65));
    const seat = { id: `e${r}${c}`, x, z: z + 0.52, y: 0, h: 0.46, ry: Math.PI };
    seats.push(seat);
    S.seats.push(seat);
    // 6자리는 비워 두고, 나머지는 가상 학생이 앉아 있다가 실제 사람이 앉으면 비켜 준다
    if ((r * 6 + c) % 4 === 1) continue;
    const a = createAvatar({ ...lookFromSeed(`exam${r}${c}`), lite: true });
    a.root.position.set(x, 0, z + 0.52); a.root.rotation.y = Math.PI;
    a.sit(0.46);
    // 문제지·도시락
    const paper = add(G, new THREE.PlaneGeometry(0.38, 0.5), mat(0xffffff), x, 0.745, z - 0.02, { rx: -Math.PI / 2, cast: false });
    const lunch = add(G, rbox(0.34, 0.12, 0.24, 0.03), mat([0xd9473b, 0x5b6fb5, 0xe9b44c, 0x2f7a5f][(r + c) % 4]), x + 0.1, 0.8, z - 0.05, { cast: false });
    lunch.visible = false;
    G.add(a.root);
    npcs.push({ a, x, z: z + 0.52, paper, lunch, delay: rng(), seat });
  }
  // 감독관 (가상)
  const proctor = createAvatar({ hairStyle: 'bob', hairColor: 0x2b1e19, lite: true });
  proctor.root.position.set(3.2, 0, -4.4); proctor.root.rotation.y = 0; G.add(proctor.root);
  let proctorT = 0;
  // 시계
  const clockFace = add(G, new THREE.CircleGeometry(0.42, 32), mat(0xffffff), -4.6, 2.75, -5.95, { cast: false });
  const hourHand = add(G, new THREE.BoxGeometry(0.04, 0.22, 0.01), mat(0x26252e), -4.6, 2.75, -5.93, { cast: false });
  const minHand = add(G, new THREE.BoxGeometry(0.03, 0.34, 0.01), mat(0x26252e), -4.6, 2.75, -5.925, { cast: false });
  hourHand.geometry.translate(0, 0.1, 0); minHand.geometry.translate(0, 0.16, 0);

  let curPhase = null;
  function applyPhase(phase) {
    curPhase = phase;
    const k = phase.kind;
    for (const n of npcs) {
      const present = !(k === 'before' || k === 'after') || (k === 'arrive' && n.delay < 0.7);
      n.a.root.visible = k === 'before' || k === 'after' ? false : k === 'arrive' ? n.delay < 0.75 : true;
      n.paper.visible = k === 'exam';
      n.lunch.visible = k === 'lunch';
      n.a.setHold(k === 'exam' ? 'write' : k === 'lunch' ? 'eat' : k === 'ready' ? 'rest' : null);
      if (!present) n.a.root.visible = false;
    }
    proctor.root.visible = !(k === 'before' || k === 'after');
  }
  function openNotes(tab = 'now') {
    api.hud.openPanel({
      title: '시험고사장', sub: '서울 시간에 맞춰 교실이 움직여요. 수능 당일 그 시각에 들어오면 실제와 같은 교시예요.',
      tabs: [{ id: 'now', label: '지금 교시' }, { id: 'notes', label: '유의사항 30' }],
      tab,
      render(body, id) {
        const p = seoulParts();
        if (id === 'now') {
          const ph = phaseAt(p.minuteOfDay), nx = nextExam(p.minuteOfDay);
          const examDay = daysUntil(SCHOOL.examDate) === 0;
          body.innerHTML = `<div class="exam-now"><div class="k">${examDay ? '지금 전국의 수험생은' : `오늘이 수능날이라면 · ${p.hm}`}</div><div class="v">${ph.label}</div><div class="d">${ph.start} ~ ${ph.end}${ph.note ? ` · ${api.hud.esc(ph.note)}` : ''}${nx ? `<br/>다음 시험: ${nx.label} ${nx.start}` : ''}</div></div>
          <ul class="sched">${SCHEDULE.filter((s) => s.kind !== 'before' && s.kind !== 'after').map((s) => `<li class="${s.kind === 'exam' ? 'exam' : ''} ${s.id === ph.id ? 'now' : ''}"><span>${s.label}</span><time>${s.start}~${s.end}</time></li>`).join('')}</ul>
          <p class="src">2027학년도 수능 시간표(평가원 2027학년도 수능 시행 기본계획: 시험 시간은 전년도와 같음). 2026년 11월 19일(목).</p>`;
        } else {
          let i = 0;
          body.innerHTML = '<div class="note-card"></div><div class="row-btns"><button class="btn pv">이전</button><button class="btn primary nx">다음</button></div><p class="src"></p>';
          body.querySelector('.src').textContent = NOTES_SOURCE;
          const card = body.querySelector('.note-card');
          const paint = () => { const n = NOTES[i]; card.innerHTML = `<span class="k ${n.kind === '꿀팁' ? 'tip' : ''}">${n.kind} · ${i + 1}/${NOTES.length}</span><div class="t">${api.hud.esc(n.text)}</div>`; };
          body.querySelector('.nx').addEventListener('click', () => { i = (i + 1) % NOTES.length; paint(); api.audio.play('click'); });
          body.querySelector('.pv').addEventListener('click', () => { i = (i - 1 + NOTES.length) % NOTES.length; paint(); api.audio.play('click'); });
          paint();
        }
      },
    });
  }
  S.actions = () => [
    { id: 'now', label: '지금 몇 교시?', icon: 'clock', primary: true, onClick: () => openNotes('now') },
    { id: 'notes', label: '유의사항 30', icon: 'note', onClick: () => openNotes('notes') },
    { id: 'cheer', label: '시험장 응원', icon: 'sparkle', onClick: () => { api.say('exam', { kicker: '시험장에서 기억할 것' }); api.audio.play('soft'); } },
  ];
  let lastMin = -1;
  S.update = (dt, t) => {
    const p = seoulParts();
    if (p.minuteOfDay !== lastMin) {
      lastMin = p.minuteOfDay;
      const ph = phaseAt(p.minuteOfDay);
      if (!curPhase || curPhase.id !== ph.id) applyPhase(ph);
      const nt = boardTex(p, ph, nextExam(p.minuteOfDay), daysUntil(SCHOOL.examDate) === 0);
      boardM.map.dispose(); boardM.map = nt; boardM.needsUpdate = true;
    }
    minHand.rotation.z = -(p.mi + p.s / 60) / 60 * Math.PI * 2;
    hourHand.rotation.z = -((p.h % 12) + p.mi / 60) / 12 * Math.PI * 2;
    // 쉬는 시간: 몇 명은 일어나 기지개
    const k = curPhase?.kind;
    const taken = new Set([api.player.seat?.id, ...[...api.presence.peers.values()].map((d) => d.s)].filter(Boolean));
    for (const n of npcs) {
      const yield_ = taken.has(n.seat.id);
      if (yield_) { n.a.root.visible = false; n.paper.visible = false; n.lunch.visible = false; continue; }
      if (!n.a.root.visible && curPhase && !['before', 'after'].includes(curPhase.kind) && !(curPhase.kind === 'arrive' && n.delay >= 0.75)) { n.a.root.visible = true; n.paper.visible = curPhase.kind === 'exam'; n.lunch.visible = curPhase.kind === 'lunch'; }
      if (k === 'break' && n.delay > 0.6) {
        if (n.a.pose === 'sit') n.a.stand();
        if (!n.a.action && Math.sin(t * 0.5 + n.delay * 9) > 0.98) n.a.play('stretch');
      } else if (n.a.pose !== 'sit') { n.a.sit(0.46); n.a.setHold(k === 'exam' ? 'write' : k === 'lunch' ? 'eat' : null); }
      n.a.update(dt, 0);
    }
    // 감독관은 시험 중 천천히 돌아다닌다
    if (proctor.root.visible) {
      proctorT += dt * (k === 'exam' ? 0.12 : 0.05);
      const px = Math.sin(proctorT) * 5.6, pz = -4.2 + (k === 'exam' ? (Math.cos(proctorT * 0.5) + 1) * 3.2 : 0);
      const dx = px - proctor.root.position.x, dz = pz - proctor.root.position.z;
      const moving = Math.hypot(dx, dz) > 0.001 ? 0.4 : 0;
      proctor.root.position.set(px, 0, pz);
      if (moving) proctor.root.rotation.y = Math.atan2(dx, dz);
      proctor.update(dt, moving);
    }
  };
  S.onSit = () => { if (curPhase?.kind === 'exam') api.hold('write'); else if (curPhase?.kind === 'lunch') api.hold('eat'); };
  S.spawns = { main: { x: -6.0, z: 4.8, ry: Math.PI * 0.8 } };
  S.camera = { yaw: 0.05, pitch: 0.74, dist: 15, minDist: 5, maxDist: 20, yawRange: 0.8 };
  S.hint = '교실은 서울 시간에 맞춰 움직여요 · 빈 책상에 앉아 볼 수 있어요';
  return S;
}
