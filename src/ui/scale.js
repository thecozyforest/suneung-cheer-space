/**
 * 데스크톱 큰 화면에서 UI(글자·버튼·이름표)를 키우는 배율.
 * 휴대폰·태블릿(터치가 주된 입력)은 1배 그대로. 마우스가 주된 입력이고 화면이 클 때만 키운다.
 * 계산 기준: 1280×760을 1배로 보고 가로·세로 중 더 작은 쪽 비율을 따른다(최대 1.8배).
 */
const fine = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };
let k = 1;

export function computeUiScale(w = window.innerWidth, h = window.innerHeight, isFine = fine.matches) {
  // w·h·isFine을 직접 줄 수 있어 시험에서도 쓴다
  if (!isFine) return 1;
  const raw = Math.min(w / 1280, h / 760);
  return Math.min(1.8, Math.max(1, Math.round(raw * 20) / 20));
}

export function getUiScale() { return k; }

/** 창 크기가 바뀔 때마다 호출. CSS 변수 --ui-k 로 내보낸다. */
export function applyUiScale() {
  k = computeUiScale();
  document.documentElement.style.setProperty('--ui-k', String(k));
  return k;
}

export function watchUiScale() {
  applyUiScale();
  window.addEventListener('resize', applyUiScale);
}
