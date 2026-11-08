/**
 * 입장할 때 자동으로 붙는 5글자 별명 = 앞 2글자 × 뒤 3글자.
 * 이 프로젝트에서 새로 지은 목록이다(원작 목록을 옮기지 않았다). 40 × 30 = 1,200가지.
 */
export const FRONT = [
  '찰떡', '만점', '대박', '합격', '행운', '반짝', '씩씩', '든든', '뚝심', '별빛',
  '새벽', '몽글', '포근', '단단', '말랑', '쑥쑥', '차분', '용감', '슬기', '기특',
  '달콤', '상큼', '초록', '하늘', '햇살', '꿈빛', '당찬', '멋진', '우뚝', '쨍쨍',
  '느긋', '꼼꼼', '똑똑', '성실', '활짝', '싱글', '방긋', '굳센', '다정', '환한',
];
export const BACK = [
  '다람쥐', '고양이', '부엉이', '곰돌이', '강아지', '햄스터', '거북이', '펭귄이', '수달이', '판다곰',
  '여우님', '오리님', '참새님', '너구리', '코알라', '돌고래', '병아리', '토끼님', '사슴님', '고래님',
  '수험생', '공부왕', '집중러', '응원단', '요정님', '수호자', '해결사', '형광펜', '찹쌀떡', '재학생',
];

export const NICK_COUNT = FRONT.length * BACK.length;

export function nicknameAt(i) {
  const n = ((i % NICK_COUNT) + NICK_COUNT) % NICK_COUNT;
  return FRONT[Math.floor(n / BACK.length)] + BACK[n % BACK.length];
}

export function randomNickname(rand = Math.random) {
  return nicknameAt(Math.floor(rand() * NICK_COUNT));
}

/** 서버에 오는 별명이 우리 목록의 조합인지 확인 */
export function isValidNickname(s) {
  if (typeof s !== 'string' || [...s].length !== 5) return false;
  return FRONT.includes(s.slice(0, 2)) && BACK.includes(s.slice(2));
}
