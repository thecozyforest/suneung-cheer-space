/**
 * 받침에 따라 조사를 고른다. 학교 이름을 바꿔도 문구가 어색해지지 않게.
 *   josa('한빛', '이', '가') → '한빛이'
 *   josa('하나', '이', '가') → '하나가'
 * 한글이 아닌 글자로 끝나면 받침 없는 쪽을 쓴다.
 */
export function josa(word, withBatchim, withoutBatchim) {
  const s = String(word);
  if (!s) return s;
  const code = s.charCodeAt(s.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasBatchim = isHangul && (code - 0xac00) % 28 !== 0;
  return s + (hasBatchim ? withBatchim : withoutBatchim);
}
