/**
 * 2027학년도 수능 시간표 (2026-11-19).
 * 출처: 한국교육과정평가원 2027학년도 수능 시행 기본계획(2026-03-31, "시험 시간은 전년도와 동일"),
 *       KB Think 「2027 수능 날짜·시간표」 정리(평가원 인용)로 대조.
 * 시험고사장은 날마다 이 시간표대로 움직인다(오늘이 수능날이라면?).
 */
const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

export const SCHEDULE = [
  { id: 'before', label: '시험 전', kind: 'before', start: '00:00', end: '07:30', note: '고사장이 아직 조용해요.' },
  { id: 'arrive', label: '입실 시간', kind: 'arrive', start: '07:30', end: '08:10', note: '08:10까지 시험실에 들어가요.' },
  { id: 'ready1', label: '1교시 준비', kind: 'ready', start: '08:10', end: '08:40', note: '감독관 입실 · 휴대전화 등 제출 · 답안지 배부' },
  { id: 'p1', label: '1교시 국어', kind: 'exam', subject: '국어', start: '08:40', end: '10:00', minutes: 80, items: 45 },
  { id: 'b1', label: '쉬는 시간', kind: 'break', start: '10:00', end: '10:30', note: '2교시 시작 10분 전(10:20)까지 입실' },
  { id: 'p2', label: '2교시 수학', kind: 'exam', subject: '수학', start: '10:30', end: '12:10', minutes: 100, items: 30 },
  { id: 'lunch', label: '점심시간', kind: 'lunch', start: '12:10', end: '13:00', note: '도시락 먹고 잠깐 걷기' },
  { id: 'ready3', label: '3교시 준비', kind: 'ready', start: '13:00', end: '13:10', note: '13:00까지 입실' },
  { id: 'p3', label: '3교시 영어', kind: 'exam', subject: '영어', start: '13:10', end: '14:20', minutes: 70, items: 45 },
  { id: 'b3', label: '쉬는 시간', kind: 'break', start: '14:20', end: '14:50', note: '4교시 시작 10분 전(14:40)까지 입실' },
  { id: 'p4a', label: '4교시 한국사', kind: 'exam', subject: '한국사', start: '14:50', end: '15:20', minutes: 30, items: 20, note: '한국사는 필수 — 응시하지 않으면 성적 전체가 무효예요.' },
  { id: 'p4g', label: '탐구 문제지 배부', kind: 'ready', start: '15:20', end: '15:35', note: '한국사 답안지·문제지 회수, 탐구 문제지 배부' },
  { id: 'p4b', label: '4교시 탐구 1', kind: 'exam', subject: '탐구 1', start: '15:35', end: '16:05', minutes: 30, items: 20 },
  { id: 'p4c', label: '탐구 문제지 회수', kind: 'ready', start: '16:05', end: '16:07', note: '첫 번째 선택 과목 문제지 회수' },
  { id: 'p4d', label: '4교시 탐구 2', kind: 'exam', subject: '탐구 2', start: '16:07', end: '16:37', minutes: 30, items: 20 },
  { id: 'b4', label: '쉬는 시간', kind: 'break', start: '16:37', end: '17:05', note: '5교시 응시자만 남아요.' },
  { id: 'p5', label: '5교시 제2외국어·한문', kind: 'exam', subject: '제2외국어·한문', start: '17:05', end: '17:45', minutes: 40, items: 30 },
  { id: 'done', label: '시험 끝', kind: 'after', start: '17:45', end: '24:00', note: '정말 수고했어요.' },
].map((p) => ({ ...p, s: hm(p.start), e: hm(p.end) }));

/** 하루 중 분(0~1439)으로 지금 구간 찾기 */
export function phaseAt(minuteOfDay) {
  return SCHEDULE.find((p) => minuteOfDay >= p.s && minuteOfDay < p.e) || SCHEDULE[SCHEDULE.length - 1];
}

/** 다음 시험 교시 */
export function nextExam(minuteOfDay) {
  return SCHEDULE.find((p) => p.kind === 'exam' && p.s > minuteOfDay) || null;
}

/** 지금 구간이 끝날 때까지 남은 분 */
export function minutesLeft(minuteOfDay) {
  const p = phaseAt(minuteOfDay);
  return p.e - minuteOfDay;
}

export const PRESETS = [
  { id: 'kor', label: '국어', minutes: 80 },
  { id: 'math', label: '수학', minutes: 100 },
  { id: 'eng', label: '영어', minutes: 70 },
  { id: 'inq', label: '탐구', minutes: 30 },
  { id: 'pomo', label: '뽀모도로', minutes: 25 },
  { id: 'rest', label: '쉬기', minutes: 5 },
];

/**
 * 시험장 유의사항 30. kind: 규정(공식 안내 내용) / 꿀팁(이 앱이 덧붙이는 조언).
 * 규정 출처: 평가원 2027학년도 수능 안내를 인용한 교육청 보도(2026-10)·KB Think 정리.
 * 화면 맨 아래에 "수험표와 함께 받는 공식 「수험생 유의사항」을 꼭 확인" 안내를 둔다.
 */
export const NOTES = [
  { kind: '규정', text: '시험 당일 오전 8시 10분까지 지정된 시험실에 들어가야 해요.' },
  { kind: '규정', text: '수험표와 신분증을 꼭 챙겨요. 신분증은 실물이어야 해요.' },
  { kind: '규정', text: '휴대전화·스마트워치·블루투스 이어폰 같은 전자기기는 가져갈 수 없어요.' },
  { kind: '규정', text: '올해부터 스마트안경도 반입 금지 물품으로 명시됐어요.' },
  { kind: '규정', text: '보조배터리·전자담배·전자사전 같은 물품도 안 돼요.' },
  { kind: '규정', text: '실수로 가져왔다면 1교시 시작 전에 감독관에게 제출해요.' },
  { kind: '규정', text: '반입 금지 물품을 제출하지 않고 가지고만 있어도 부정행위예요.' },
  { kind: '규정', text: '시계는 통신·결제 기능과 전자식 화면이 없는 아날로그 시계만 돼요.' },
  { kind: '규정', text: '샤프펜은 시험실에서 나누어 준 것만 써요.' },
  { kind: '규정', text: '흑색 연필, 지우개, 흰색 수정테이프, 0.5mm 흑색 샤프심은 쓸 수 있어요.' },
  { kind: '규정', text: '2교시부터는 각 교시 시작 10분 전까지 시험실에 들어가요.' },
  { kind: '규정', text: '4교시 한국사는 필수예요. 응시하지 않으면 수능 성적 전체가 무효가 돼요.' },
  { kind: '규정', text: '탐구는 정해진 과목 순서와 시간을 지켜요.' },
  { kind: '규정', text: '해당 과목 시간에 다른 과목 문제지를 보면 부정행위예요.' },
  { kind: '규정', text: '시험 종료령이 울린 뒤 답안을 쓰거나 고치면 부정행위예요.' },
  { kind: '규정', text: '종료령 뒤에 가채점표에 답을 옮겨 적는 것도 부정행위예요.' },
  { kind: '규정', text: '가채점은 수험표 뒷면의 공식 가채점표만 써요. 따로 붙이면 안 돼요.' },
  { kind: '규정', text: '교과서·참고서는 가져갈 수 있지만 시험 중에는 가방에 넣어 지정 장소에 둬요.' },
  { kind: '꿀팁', text: '전날 예비소집에서 시험장 위치와 가는 길을 미리 확인해요.' },
  { kind: '꿀팁', text: '시험장 교실은 덥거나 추울 수 있어요. 입고 벗기 쉬운 겉옷을 챙겨요.' },
  { kind: '꿀팁', text: '점심 도시락은 평소 먹던, 소화 잘 되는 것으로.' },
  { kind: '꿀팁', text: '시험지를 받으면 이름과 수험번호부터 적어요.' },
  { kind: '꿀팁', text: '답안지 수험번호·이름·선택 과목 표기를 끝나기 전에 한 번 더 확인해요.' },
  { kind: '꿀팁', text: '마킹은 마지막에 몰아서 하지 말고 시간을 넉넉히 남겨요.' },
  { kind: '꿀팁', text: '어려운 문제는 표시해 두고 넘어갔다가 돌아와요.' },
  { kind: '꿀팁', text: '쉬는 시간에 지난 교시 답을 맞춰 보지 않아요. 다음 교시만 생각해요.' },
  { kind: '꿀팁', text: '1교시가 어렵게 느껴지면, 모두에게 어려운 거예요.' },
  { kind: '꿀팁', text: '물은 조금씩. 화장실은 쉬는 시간에 미리 다녀와요.' },
  { kind: '꿀팁', text: '긴장되면 발바닥에 힘을 주고 숨을 길게 내쉬어요.' },
  { kind: '꿀팁', text: '전날은 새로운 문제보다 익숙한 오답 노트를 가볍게 봐요.' },
];

export const NOTES_SOURCE = '규정 항목은 평가원 2027학년도 수능 안내를 인용한 교육청 보도(2026년 10월)와 KB Think 정리를 대조했어요. 정확한 내용은 수험표와 함께 받는 공식 「수험생 유의사항」을 꼭 확인하세요.';
