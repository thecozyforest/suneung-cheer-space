/**
 * ★ 두 번째로 고치는 파일 ★
 *
 * 지금은 비어 있어서 **혼자 보기**로만 동작한다(다른 사람이 보이지 않을 뿐,
 * 15개 공간은 모두 그대로 돌아간다). 친구들이 서로 보이게 하려면
 * 자기 Firebase 프로젝트를 만들어 아래 값을 채운다.
 *
 * 1. https://console.firebase.google.com 에서 프로젝트 만들기
 * 2. 빌드 → Realtime Database 만들기 (지역은 asia-southeast1 권장)
 * 3. 빌드 → Authentication → 로그인 방법 → **익명** 사용 설정
 * 4. 프로젝트 설정 → 내 앱 → 웹 앱(</>) 추가 → firebaseConfig 값을 아래에 붙여넣기
 * 5. 보안 규칙은 이 저장소의 database.rules.json 을 그대로 올린다
 *      firebase deploy --only database --project <내-프로젝트-id>
 *
 * 웹 설정값은 공개되어도 되는 값이다(빌드된 코드에 그대로 들어간다).
 * 실제 보호는 database.rules.json 이 맡는다 — 본인 칸만 쓰기, 빈자리만 앉기, 응원 수는 +1만.
 */
export const firebaseConfig = null;

// 채우면 이런 모양이 된다. 위 줄을 지우고 아래 주석을 풀어 쓴다.
//
// export const firebaseConfig = {
//   apiKey: '...',
//   authDomain: '<프로젝트-id>.firebaseapp.com',
//   databaseURL: 'https://<프로젝트-id>-default-rtdb.asia-southeast1.firebasedatabase.app',
//   projectId: '<프로젝트-id>',
//   storageBucket: '<프로젝트-id>.firebasestorage.app',
//   messagingSenderId: '...',
//   appId: '...',
// };
