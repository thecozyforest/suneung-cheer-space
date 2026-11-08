/**
 * 나이스 교육정보 개방 포털 급식 (인증키 없이 소량 조회 가능, CORS 허용 확인).
 * 학교 코드는 src/data/school.js 의 SCHOOL.neis 한곳에서 바꾼다.
 */
const EMOJI = [
  [/밥|라이스|덮밥|볶음밥|비빔밥|주먹밥/, '🍚'], [/국|탕|찌개|수프|스프|전골/, '🍲'], [/김치|깍두기|겉절이|석박지/, '🥬'],
  [/닭|치킨|계육/, '🍗'], [/돼지|돈육|제육|불고기|갈비|소고기|우육|떡갈비|함박/, '🥩'], [/생선|고등어|삼치|가자미|연어|동태|명태|조기|갈치|명엽|멸치|어묵|참치/, '🐟'],
  [/낙지|오징어|문어|쭈꾸미|주꾸미/, '🦑'], [/새우|해물|홍합|조개|게살|맛살/, '🦐'], [/계란|달걀|에그|스크램블/, '🥚'], [/두부/, '🧈'], [/면|국수|우동|스파게티|파스타|짜장|짬뽕|라면/, '🍜'],
  [/빵|토스트|베이글|크로와상|와플|머핀|케이크/, '🍞'], [/떡/, '🍡'], [/우유|요구르트|요거트|치즈/, '🥛'], [/주스|쥬스|에이드|음료|식혜|수정과/, '🧃'],
  [/사과|배|귤|오렌지|바나나|포도|딸기|수박|멜론|키위|파인애플|과일|복숭아|자두|감/, '🍎'], [/샐러드|나물|무침|쌈|깻잎|상추|브로콜리/, '🥗'],
  [/튀김|까스|가스|커틀릿|돈가스/, '🍤'], [/만두/, '🥟'], [/카레/, '🍛'], [/피자/, '🍕'], [/버거|햄버거/, '🍔'], [/아이스크림|빙수/, '🍨'], [/감자|고구마/, '🥔'],
];

/** "닭갈비(1.5.6.13.)" → "닭갈비" */
export function cleanDish(s) {
  return String(s)
    .replace(/\([\d.\s]*\)/g, '')
    .replace(/[\d.]+$/g, '')
    .replace(/[*#]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function emojiFor(dish) {
  for (const [re, e] of EMOJI) if (re.test(dish)) return e;
  return '🍽️';
}

export function parseDishes(ddish) {
  return String(ddish || '').split(/<br\s*\/?>/i).map(cleanDish).filter(Boolean).map((name) => ({ name, emoji: emojiFor(name) }));
}

export function mealUrl({ office, school }, ymd) {
  const q = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: '5', ATPT_OFCDC_SC_CODE: office, SD_SCHUL_CODE: school, MLSV_YMD: ymd });
  return `https://open.neis.go.kr/hub/mealServiceDietInfo?${q}`;
}

/** 오늘 급식 — 끼니별 [{meal:'중식', dishes:[...], kcal}] 또는 빈 배열 */
export async function fetchMeals(codes, ymd, fetchImpl = fetch) {
  if (!codes || !codes.office || !codes.school) throw new Error('나이스 코드가 아직 설정되지 않았어요 — src/data/school.js');
  const res = await fetchImpl(mealUrl(codes, ymd));
  if (!res.ok) throw new Error(`급식 응답 ${res.status}`);
  const data = await res.json();
  const rows = data?.mealServiceDietInfo?.[1]?.row || [];
  return rows.map((r) => ({ meal: r.MMEAL_SC_NM, dishes: parseDishes(r.DDISH_NM), kcal: r.CAL_INFO || '' }));
}
