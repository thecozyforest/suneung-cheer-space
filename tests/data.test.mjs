import test from 'node:test';
import assert from 'node:assert/strict';
import { FRONT, BACK, NICK_COUNT, nicknameAt, randomNickname, isValidNickname } from '../src/data/nicknames.js';
import { DAY_POOLS, todayPool, phraseOfDay, nextPhrase, ROOM_POOLS, AFTER_EXAM, EXAM_DAY, allPhraseCount } from '../src/data/phrases.js';
import { parseSeoulLocal, seoulParts, daysUntil, dDayLabel } from '../src/data/time.js';
import { SCHEDULE, phaseAt, nextExam, NOTES } from '../src/data/exam.js';
import { cleanDish, parseDishes, emojiFor, mealUrl } from '../src/data/meal.js';
import { TERMS } from '../src/data/korean-terms.js';
import { resolveCollisions, clampBounds, rect } from '../src/engine/player.js';

const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

test('별명은 모두 5글자이고 겹치지 않는다', () => {
  assert.equal(NICK_COUNT, 1200);
  const all = new Set();
  for (let i = 0; i < NICK_COUNT; i++) { const n = nicknameAt(i); assert.equal([...n].length, 5, n); assert.ok(isValidNickname(n), n); all.add(n); }
  assert.equal(all.size, NICK_COUNT);
  assert.ok(FRONT.every((f) => [...f].length === 2) && BACK.every((b) => [...b].length === 3));
  assert.ok(isValidNickname(randomNickname()));
  for (const bad of ['', '나쁜말입니다', '<b>x</b>', '합격요정님x', 12345]) assert.equal(isValidNickname(bad), false);
});

test('서울 시간은 기기 시간대와 상관없이 계산한다', () => {
  const ms = parseSeoulLocal('2026-11-19T08:45');
  const p = seoulParts(ms);
  assert.deepEqual([p.y, p.mo, p.d, p.h, p.mi, p.dow], [2026, 11, 19, 8, 45, 4]);
  // 서울 0시 10분은 UTC로 전날 15시 10분
  const late = seoulParts(Date.UTC(2026, 10, 18, 15, 10));
  assert.equal(late.d, 19); assert.equal(late.h, 0);
});

test('D-day는 지나도 음수로 보이지 않는다', () => {
  assert.equal(daysUntil('2026-11-19', parseSeoulLocal('2026-11-06T23:59')), 13);
  assert.equal(dDayLabel('2026-11-19', parseSeoulLocal('2026-11-06T09:00')).text, 'D-13');
  assert.equal(dDayLabel('2026-11-19', parseSeoulLocal('2026-11-19T07:00')).text, 'D-DAY');
  const after = dDayLabel('2026-11-19', parseSeoulLocal('2026-11-20T09:00'));
  assert.equal(after.phase, 'after'); assert.ok(!after.text.includes('-'));
});

test('요일·수능 전후에 맞는 문구를 고른다', () => {
  for (let d = 0; d < 7; d++) assert.ok(DAY_POOLS[d].lines.length >= 15);
  assert.equal(todayPool(1, 5).name, '시작하는 월요일');
  assert.equal(todayPool(4, 0).lines, EXAM_DAY);
  assert.equal(todayPool(5, -1).lines, AFTER_EXAM);
  const a = phraseOfDay(DAY_POOLS[3].lines, '20261111', 'hall');
  assert.equal(a, phraseOfDay(DAY_POOLS[3].lines, '20261111', 'hall'));
  const l = ROOM_POOLS.soft;
  for (let i = 0; i < 50; i++) { const prev = l[i % l.length]; assert.notEqual(nextPhrase(l, prev), prev); }
  assert.ok(allPhraseCount() >= 250, String(allPhraseCount()));
  // 문구에 학생 실명 같은 고유 정보가 들어가지 않도록 길이만 확인
  for (const pool of Object.values(ROOM_POOLS)) for (const t of pool) assert.ok(t.length < 60, t);
});

test('시험 시간표: 교시 판정과 2027학년도 시간', () => {
  assert.equal(phaseAt(hm('08:45')).id, 'p1');
  assert.equal(phaseAt(hm('10:15')).kind, 'break');
  assert.equal(phaseAt(hm('12:30')).kind, 'lunch');
  assert.equal(phaseAt(hm('15:00')).subject, '한국사');
  assert.equal(phaseAt(hm('16:06')).id, 'p4c');
  assert.equal(phaseAt(hm('17:30')).id, 'p5');
  assert.equal(phaseAt(hm('23:00')).kind, 'after');
  assert.equal(phaseAt(hm('03:00')).kind, 'before');
  assert.equal(nextExam(hm('10:05')).subject, '수학');
  const exams = SCHEDULE.filter((p) => p.kind === 'exam');
  assert.deepEqual(exams.map((e) => e.minutes), [80, 100, 70, 30, 30, 30, 40]);
  for (const e of exams) assert.equal(e.e - e.s, e.minutes, e.label);
  // 빈틈 없이 이어진다
  for (let i = 1; i < SCHEDULE.length; i++) assert.equal(SCHEDULE[i].s, SCHEDULE[i - 1].e);
  assert.equal(NOTES.length, 30);
});

test('급식 문자열 정리', () => {
  assert.equal(cleanDish('닭갈비(1.5.6.13.)'), '닭갈비');
  assert.equal(cleanDish('친환경흑미밥 '), '친환경흑미밥');
  const d = parseDishes('친환경흑미밥<br/>새우완탕(5.6.9.)<br/>배추김치(9.)');
  assert.deepEqual(d.map((x) => x.name), ['친환경흑미밥', '새우완탕', '배추김치']);
  assert.equal(emojiFor('배추김치'), '🥬');
  assert.match(mealUrl({ office: 'X00', school: '1234567' }, '20261106'), /ATPT_OFCDC_SC_CODE=X00&SD_SCHUL_CODE=1234567&MLSV_YMD=20261106/);
});

test('국어 단어장 카드는 비어 있지 않다', () => {
  assert.ok(TERMS.length >= 55);
  for (const t of TERMS) { assert.ok(t.term && t.mean && t.kind, JSON.stringify(t)); }
  assert.equal(new Set(TERMS.map((t) => t.term)).size, TERMS.length);
});

test('충돌: 벽을 뚫지 않고 경계 안에 머문다', () => {
  const wall = rect(0, 0, 2, 2);
  const p = { x: 0.9, z: 0 };
  resolveCollisions(p, 0.3, [wall]);
  assert.ok(p.x >= 1.3 - 1e-9, String(p.x));
  const q = { x: 0, z: 0.2 };
  resolveCollisions(q, 0.3, [wall]);
  assert.ok(Math.abs(q.x) >= 1.3 - 1e-9 || Math.abs(q.z) >= 1.3 - 1e-9);
  const b = clampBounds({ x: 50, z: -50 }, { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, 0.3);
  assert.deepEqual([b.x, b.z], [4.7, -4.7]);
});
