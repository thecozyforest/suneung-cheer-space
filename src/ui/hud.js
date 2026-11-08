import { icon } from './icons.js';
import { SPACES, ZONES } from '../scenes/registry.js';
import { SCHOOL } from '../data/school.js';

const $ = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createHud(root, handlers) {
  // 상단
  const top = $(`<div class="hud-top">
    <div class="place glass"><div class="place-ico">${icon('school')}</div><div class="place-t"><div class="place-name">${esc(SCHOOL.appName)}</div><div class="place-desc"></div></div></div>
    <div class="hud-right">
      <button class="pill glass people solo" type="button" aria-label="같은 공간에 있는 사람"><span class="dot"></span><span class="pc">혼자 보는 중</span><span class="pn">혼자</span></button>
      <button class="round glass tm" type="button" aria-label="시간대 바꾸기">${icon('clock')}</button>
      <button class="round glass snd" type="button" aria-label="소리">${icon('sound')}</button>
      <button class="round glass mnu" type="button" aria-label="공간 이동">${icon('map')}</button>
    </div></div>`);
  root.appendChild(top);
  const dday = $(`<div class="dday-chip glass"><div class="n"></div><div class="l"></div></div>`);
  root.appendChild(dday);

  const vol = $(`<div class="vol glass"><label>소리 <span class="vv">70</span></label><input type="range" min="0" max="100" value="70" aria-label="소리 크기"/><div class="vnote">모든 소리는 음원 없이 브라우저에서 합성해요.</div></div>`);
  root.appendChild(vol);
  top.querySelector('.snd').addEventListener('click', () => { vol.classList.toggle('on'); timePick.classList.remove('on'); });

  // 시간대 바꾸기 (내 화면에서만)
  const TIMES = [
    { id: 'now', label: '지금', sub: '서울 시간' },
    { id: 'morning', label: '아침', sub: '7:30', hm: '07:30' },
    { id: 'noon', label: '낮', sub: '12:30', hm: '12:30' },
    { id: 'evening', label: '저녁', sub: '18:00', hm: '18:00' },
    { id: 'night', label: '밤', sub: '21:00', hm: '21:00' },
    { id: 'p1', label: '수능 1교시', sub: '11/19 08:50', date: '2026-11-19', hm: '08:50' },
    { id: 'lunch', label: '수능 점심', sub: '11/19 12:30', date: '2026-11-19', hm: '12:30' },
    { id: 'p4', label: '수능 4교시', sub: '11/19 15:00', date: '2026-11-19', hm: '15:00' },
  ];
  const timePick = $(`<div class="vol glass timepick" role="dialog" aria-label="시간대 바꾸기"><label>시간대 바꾸기</label><div class="time-grid">${TIMES.map((t) => `<button type="button" class="time-btn${t.id === 'now' ? ' on' : ''}" data-id="${t.id}"><b>${t.label}</b><small>${t.sub}</small></button>`).join('')}</div><div class="vnote">내 화면에서만 바뀌어요. 다른 친구들에게는 각자의 시간이 보여요.</div></div>`);
  root.appendChild(timePick);
  top.querySelector('.tm').addEventListener('click', () => { timePick.classList.toggle('on'); vol.classList.remove('on'); });
  timePick.querySelectorAll('.time-btn').forEach((b) => b.addEventListener('click', () => {
    timePick.querySelectorAll('.time-btn').forEach((x) => x.classList.toggle('on', x === b));
    const t = TIMES.find((x) => x.id === b.dataset.id);
    handlers.onTime?.(t);
    timePick.classList.remove('on');
  }));
  vol.querySelector('input').addEventListener('input', (e) => {
    const v = +e.target.value;
    vol.querySelector('.vv').textContent = v;
    top.querySelector('.snd').innerHTML = icon(v === 0 ? 'mute' : 'sound');
    handlers.onVolume(v / 100);
  });

  // 아래
  const dockWrap = $(`<div class="dock-wrap"><div class="dock glass"></div></div>`);
  root.appendChild(dockWrap);
  const dock = dockWrap.firstElementChild;
  const hint = $(`<div class="hint glass"></div>`);
  root.appendChild(hint);

  // 문구
  const toast = $(`<div class="toast glass" role="status" aria-live="polite"><div class="t-kicker"></div><div class="t-text"></div></div>`);
  root.appendChild(toast);
  let toastTimer = null;

  // 공간 목록
  const sheetBg = $(`<div class="sheet-bg"></div>`);
  const sheet = $(`<div class="sheet" role="dialog" aria-label="공간 이동"><div class="sheet-grip"></div><h2>어디로 갈까요?</h2><p class="sub">누르면 바로 이동해요. 학교 안에서는 문으로 걸어 들어가도 돼요.</p><div class="sheet-body"></div></div>`);
  root.appendChild(sheetBg); root.appendChild(sheet);
  const closeSheet = () => { sheet.classList.remove('on'); sheetBg.classList.remove('on'); };
  sheetBg.addEventListener('click', closeSheet);
  top.querySelector('.mnu').addEventListener('click', () => { renderSheet(); sheet.classList.add('on'); sheetBg.classList.add('on'); });
  top.querySelector('.people').addEventListener('click', () => { renderSheet(); sheet.classList.add('on'); sheetBg.classList.add('on'); });
  let currentSpace = null, counts = {};
  function renderSheet() {
    const body = sheet.querySelector('.sheet-body');
    body.innerHTML = ZONES.map((z) => {
      const items = SPACES.filter((s) => s.zone === z.id);
      return `<div class="zone"><span>${esc(z.name)}</span><em>${esc(z.note)}</em></div><div class="space-grid">${items.map((s) => {
        const n = counts[s.id];
        return `<button class="space-btn${s.id === currentSpace ? ' here' : ''}" data-id="${s.id}" type="button"><span class="sw" style="background:${s.color}">${icon(s.icon)}</span><span><div class="nm">${esc(s.name)}</div><div class="ct">${s.id === currentSpace ? '지금 여기' : n ? `${n}명 있어요` : ''}</div></span></button>`;
      }).join('')}</div>`;
    }).join('');
    body.querySelectorAll('.space-btn').forEach((b) => b.addEventListener('click', () => { closeSheet(); handlers.onGo(b.dataset.id); }));
  }

  // 패널
  const panelBg = $(`<div class="panel-bg"><div class="panel" role="dialog" aria-modal="true"><div class="panel-head"><div><h3></h3><p></p></div><button class="panel-x" type="button" aria-label="닫기">${icon('close')}</button></div><div class="tabs"></div><div class="panel-body"></div></div></div>`);
  root.appendChild(panelBg);
  let panelClose = null, lastFocus = null;
  const closePanel = () => {
    if (!panelBg.classList.contains('on')) return;
    panelBg.classList.remove('on');
    const cb = panelClose; panelClose = null; cb?.();
    lastFocus?.focus?.();
  };
  panelBg.querySelector('.panel-x').addEventListener('click', closePanel);
  panelBg.addEventListener('click', (e) => { if (e.target === panelBg) closePanel(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanel(); closeSheet(); vol.classList.remove('on'); timePick.classList.remove('on'); } });

  return {
    setPlace(space) {
      currentSpace = space.id;
      top.querySelector('.place-ico').style.background = space.color;
      top.querySelector('.place-ico').innerHTML = icon(space.icon);
      top.querySelector('.place-name').textContent = space.name;
      top.querySelector('.place-desc').textContent = space.desc;
    },
    setPeople(n, online, roomCounts) {
      counts = roomCounts || counts;
      const el = top.querySelector('.people');
      el.classList.toggle('solo', !online);
      el.querySelector('.pc').textContent = online ? `같은 공간 ${n}명` : '혼자 보는 중';
      el.querySelector('.pn').textContent = online ? `${n}명` : '혼자';
    },
    setDday(n, label) { dday.querySelector('.n').textContent = n; dday.querySelector('.l').textContent = label; },
    setHint(text) { hint.textContent = text || ''; hint.style.opacity = text ? '1' : '0'; },
    /** actions: [{id,label,icon,primary,badge,onClick}] */
    setActions(actions) {
      dock.innerHTML = '';
      for (const a of actions) {
        if (a.sep) { dock.appendChild($('<span class="act-sep"></span>')); continue; }
        const b = $(`<button class="act${a.primary ? ' primary' : ''}" type="button">${a.icon ? icon(a.icon) : ''}<span class="lb">${esc(a.label)}</span>${a.badge != null ? `<span class="badge">${esc(a.badge)}</span>` : ''}</button>`);
        b.addEventListener('click', (e) => { e.stopPropagation(); a.onClick?.(b); });
        b.dataset.id = a.id || '';
        dock.appendChild(b);
      }
      dockWrap.style.display = actions.length ? '' : 'none';
    },
    updateAction(id, { label, badge } = {}) {
      const b = dock.querySelector(`[data-id="${id}"]`);
      if (!b) return;
      if (label != null) b.querySelector('.lb').textContent = label;
      if (badge != null) { let s = b.querySelector('.badge'); if (!s) { s = document.createElement('span'); s.className = 'badge'; b.appendChild(s); } s.textContent = badge; }
    },
    toast(text, { kicker = '', ms = 3800, cls = '' } = {}) {
      toast.className = `toast glass ${cls}`;
      toast.querySelector('.t-kicker').textContent = kicker;
      toast.querySelector('.t-kicker').style.display = kicker ? '' : 'none';
      toast.querySelector('.t-text').textContent = text;
      void toast.offsetWidth;
      toast.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('on'), ms);
    },
    /** 패널 열기. tabs: [{id,label}], render(body, tabId) */
    openPanel({ title, sub = '', tabs = null, tab = null, render, onClose }) {
      lastFocus = document.activeElement;
      panelBg.querySelector('h3').textContent = title;
      panelBg.querySelector('.panel-head p').textContent = sub;
      const tabsEl = panelBg.querySelector('.tabs');
      const body = panelBg.querySelector('.panel-body');
      const show = (id) => {
        tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === id));
        body.innerHTML = '';
        body.scrollTop = 0;
        render(body, id);
      };
      tabsEl.innerHTML = tabs ? tabs.map((t) => `<button class="tab" type="button" data-id="${t.id}">${esc(t.label)}</button>`).join('') : '';
      tabsEl.style.display = tabs ? '' : 'none';
      tabsEl.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.id)));
      show(tab || tabs?.[0]?.id || null);
      panelClose = onClose || null;
      panelBg.classList.add('on');
      panelBg.querySelector('.panel-x').focus();
      return { close: closePanel, body, show };
    },
    closePanel,
    get panelOpen() { return panelBg.classList.contains('on'); },
    esc,
  };
}

/** 입장 화면 */
export function createEntry(root, { appName, school, dday, nickname, onReroll, onEnter }) {
  const el = $(`<div class="entry"><div class="entry-card glass">
    <div class="entry-badge">2027학년도 수능 <b>${esc(dday)}</b></div>
    <h1><small>${esc(school)}</small>${esc(appName)}</h1>
    <p class="lead">잠깐 들어왔다 나가도 괜찮은 곳.<br/>기원하고, 부수고, 쉬어 가요.</p>
    <div class="nick-box"><div><div class="k">오늘의 별명</div><div class="v">${esc(nickname)}</div></div><button class="dice" type="button">${icon('dice')}다시 뽑기</button></div>
    <button class="enter-btn" type="button">입장하기</button>
    <ul class="entry-notes">
      <li>로그인도, 학번 입력도 없어요. 별명은 자동으로 붙어요.</li>
      <li>글을 쓰는 칸이 없어요. 응원은 골라서 보내요.</li>
      <li>같이 들어온 친구들이 화면에 보여요. 누가 누군지는 몰라요.</li>
    </ul>
    <div class="entry-foot">${esc(SCHOOL.audience)} · 소리가 나요</div>
  </div></div>`);
  root.appendChild(el);
  el.querySelector('.dice').addEventListener('click', () => { el.querySelector('.v').textContent = onReroll(); });
  el.querySelector('.enter-btn').addEventListener('click', () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 600);
    onEnter();
  });
  return el;
}
