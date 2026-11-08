/** 키보드·마우스·터치 입력. 짧게 누르면 tap, 끌면 drag, 두 손가락은 pinch. */
export function createInput(el, { onTap, onDrag, onZoom }) {
  const keys = new Set();
  const joy = { x: 0, y: 0, active: false };
  const pointers = new Map();
  let downInfo = null, pinchDist = 0;

  // 글자를 치는 칸일 때만 이동 키를 양보한다. 소리 크기 막대(range)·체크 칸은 방향키를 가로채지 않는다.
  const isTyping = () => {
    const a = document.activeElement;
    if (!a) return false;
    if (a.isContentEditable || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') return true;
    return a.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(a.type);
  };
  // 한글 입력 상태에서는 e.key가 'ㅈ'처럼 바뀌므로, 물리 키(e.code)로 읽는다.
  const KEY_BY_CODE = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright' };
  const keyName = (e) => KEY_BY_CODE[e.code] || (['w', 'a', 's', 'd'].includes(e.key.toLowerCase()) ? e.key.toLowerCase() : e.key.startsWith('Arrow') ? e.key.toLowerCase() : null);
  window.addEventListener('keydown', (e) => {
    if (isTyping() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = keyName(e);
    if (k) {
      keys.add(k);
      if (k.startsWith('arrow')) e.preventDefault();
    }
  });
  // 떼는 키는 어떤 상태에서든 지운다(눌린 채 남아 혼자 걷는 일 방지)
  window.addEventListener('keyup', (e) => { const k = keyName(e); if (k) keys.delete(k); });
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => keys.clear());
  window.addEventListener('contextmenu', () => keys.clear());

  // 마우스 오른쪽·가운데 버튼은 클릭 이동으로 치지 않는다(오른쪽 버튼 끌기는 시점 돌리기로만 쓴다).
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 1) return;
    el.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, noTap: e.pointerType === 'mouse' && e.button !== 0 };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); downInfo = null; }
  });
  el.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) onZoom(pinchDist / d);
      pinchDist = d;
      return;
    }
    if (downInfo) downInfo.moved += Math.abs(dx) + Math.abs(dy);
    if (!downInfo || downInfo.moved > 6) onDrag(dx, dy);
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (downInfo && !downInfo.noTap && pointers.size === 0 && downInfo.moved <= 8 && performance.now() - downInfo.t < 500) {
      onTap(e.clientX, e.clientY);
    }
    if (pointers.size === 0) downInfo = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downInfo = null; });
  el.addEventListener('wheel', (e) => { e.preventDefault(); onZoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });

  return {
    keys, joy,
    /** 화면 기준 입력 벡터 (x 오른쪽, y 앞) */
    axis() {
      let x = 0, y = 0;
      if (keys.has('w') || keys.has('arrowup')) y += 1;
      if (keys.has('s') || keys.has('arrowdown')) y -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (joy.active) { x += joy.x; y += joy.y; }
      const len = Math.hypot(x, y);
      return len > 1 ? { x: x / len, y: y / len } : { x, y };
    },
  };
}

/** 화면 왼쪽 아래 가상 조이스틱 (터치 기기) */
export function createJoystick(container, joy) {
  const base = document.createElement('div');
  base.className = 'joystick';
  base.innerHTML = '<div class="joystick-knob"></div>';
  container.appendChild(base);
  const knob = base.firstChild;
  let id = null, cx = 0, cy = 0;
  const R = 46;
  base.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    id = e.pointerId; base.setPointerCapture(id);
    const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    move(e);
  });
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R; joy.y = -dy / R; joy.active = true;
  };
  base.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; joy.active = false; knob.style.transform = ''; };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  return base;
}
