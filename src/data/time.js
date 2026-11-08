/**
 * 서울 시간 계산. 기기 시간대와 상관없이 Asia/Seoul 기준으로 하루를 판단한다.
 * 시험용으로 주소에 ?time=2026-11-19T08:45 를 붙이면 그 서울 시각에서 시작해 흘러간다.
 */
const SEOUL_OFFSET_MIN = 9 * 60;
let overrideOffsetMs = 0;

/** 'YYYY-MM-DDTHH:MM' (서울 시각) → UTC ms */
export function parseSeoulLocal(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(text || '').trim());
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - SEOUL_OFFSET_MIN * 60000;
}

export function setTimeOverride(text, realNow = Date.now()) {
  const target = parseSeoulLocal(text);
  overrideOffsetMs = target == null ? 0 : target - realNow;
  return target != null;
}

export function nowMs() {
  return Date.now() + overrideOffsetMs;
}

/** UTC ms → 서울 달력 정보 */
export function seoulParts(ms = nowMs()) {
  const t = new Date(ms + SEOUL_OFFSET_MIN * 60000);
  const y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1, d = t.getUTCDate();
  const h = t.getUTCHours(), mi = t.getUTCMinutes(), s = t.getUTCSeconds();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    y, mo, d, h, mi, s,
    dow: t.getUTCDay(),
    ymd: `${y}${pad(mo)}${pad(d)}`,
    iso: `${y}-${pad(mo)}-${pad(d)}`,
    hm: `${pad(h)}:${pad(mi)}`,
    /** 0~24 소수 시각 */
    hour: h + mi / 60 + s / 3600,
    minuteOfDay: h * 60 + mi,
  };
}

/** 서울 날짜 기준 남은 날 수. 시험 당일 0, 지나면 음수. */
export function daysUntil(isoDate, ms = nowMs()) {
  const p = seoulParts(ms);
  const today = Date.UTC(p.y, p.mo - 1, p.d);
  const [y, mo, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, mo - 1, d);
  return Math.round((target - today) / 86400000);
}

/** 전광판 문구. 지난 뒤에는 음수 대신 응원 문구. */
export function dDayLabel(isoDate, ms = nowMs()) {
  const n = daysUntil(isoDate, ms);
  if (n > 0) return { text: `D-${n}`, phase: 'before', days: n };
  if (n === 0) return { text: 'D-DAY', phase: 'today', days: 0 };
  return { text: '수고했어요', phase: 'after', days: n };
}

export const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
