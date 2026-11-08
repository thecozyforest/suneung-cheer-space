/**
 * 15개 공간. scene은 실제로 그리는 장면, spawn은 그 장면 안의 시작 위치.
 * 같은 장면(앞마당·뒤뜰)에 있는 공간끼리는 서로 보이고 함께 접속한다.
 */
import { SCHOOL } from '../data/school.js';
export const ZONES = [
  { id: 'out', name: '우리 학교', note: '건물 배치는 개략 표현 · 거리와 크기는 실측 아님' },
  { id: 'rest', name: '우리 학교 쉼터', note: '' },
  { id: 'cheer', name: '응원', note: '' },
  { id: 'wish', name: '기원', note: '학교의 실제 시설이 아닌 가상 공간' },
  { id: 'study', name: '공부', note: '' },
];

export const SPACES = [
  { id: 'gate', zone: 'out', name: '학교 전경', scene: 'front', spawn: 'gate', icon: 'school', color: '#22305a', desc: '정문에서 본관과 D-day 전광판까지. 서울 시간에 맞춰 낮과 밤이 바뀌어요.' },
  { id: 'field', zone: 'out', name: '운동장 · 물결 차양', scene: 'front', spawn: 'field', icon: 'field', color: '#c9934a', desc: '기지개 켜고, 관람석에 앉아 하늘 보고, 소원 풍선을 날려요.' },
  { id: 'hall', zone: 'out', name: '복도', scene: 'hall', spawn: 'west', icon: 'door', color: '#5f7d9e', desc: '문을 골라 들어가는 복도. 오늘의 응원이 게시판에 붙어 있어요.' },
  { id: 'forest', zone: 'rest', name: '본관 뒤 숲길', scene: 'rear', spawn: 'forest', icon: 'tree', color: '#4f8243', desc: '나무 사이를 걷다가 벤치에서 20초 숲 호흡.' },
  { id: 'annex', zone: 'rest', name: `${SCHOOL.campus.annex} 앞 낙엽 벤치`, scene: 'rear', spawn: 'annex', icon: 'leaf', color: '#d0682f', desc: '벤치에 앉아 떨어지는 단풍과 은행잎을 봐요. 낙엽을 잡으면 응원이 와요.' },
  { id: 'roof', zone: 'rest', name: '옥상 별빛 소원', scene: 'roof', spawn: 'main', icon: 'star', color: '#2b2f6b', desc: '별똥별에 소원을 빌고 망원경으로 달과 토성을 봐요.' },
  { id: 'stage', zone: 'rest', name: '강당 무대', scene: 'stage', spawn: 'main', icon: 'stage', color: '#8c3b4a', desc: '무대에 올라 조명과 박수를 받는 미리 합격 축하식.' },
  { id: 'soft', zone: 'cheer', name: '응원 순한맛', scene: 'soft', spawn: 'main', icon: 'heart', color: '#e9788f', desc: '천사가 내려와 토닥토닥. 따뜻한 말을 받아 가요.' },
  { id: 'spicy', zone: 'cheer', name: '응원 매운맛', scene: 'spicy', spawn: 'main', icon: 'hammer', color: '#d9473b', desc: '불안·졸음·마킹실수 블록을 와장창 부숴요.' },
  { id: 'temple', zone: 'wish', name: '법당', scene: 'temple', spawn: 'main', icon: 'lotus', color: '#b5762f', desc: '108배를 세고, 처마 풍경과 범종을 울려요.' },
  { id: 'cathedral', zone: 'wish', name: '성당', scene: 'cathedral', spawn: 'main', icon: 'candle', color: '#5b6fb5', desc: '묵주 59알을 한 알씩 돌리고 초를 밝혀요.' },
  { id: 'church', zone: 'wish', name: '교회', scene: 'church', spawn: 'main', icon: 'bell', color: '#7a8c5a', desc: '종탑 줄을 당겨 종을 울리고 손을 모아요.' },
  { id: 'allwish', zone: 'wish', name: '다 빌어 보는 방', scene: 'allwish', spawn: 'main', icon: 'stones', color: '#9a6bb5', desc: '엿·찹쌀떡·포크·휴지·거울·돌탑. 뭐든 다 빌어 봐요.' },
  { id: 'study', zone: 'study', name: '자습실', scene: 'study', spawn: 'main', icon: 'book', color: '#3f7a8c', desc: '과목별 시험 시간 타이머, 국어 개념어 카드, 오늘 급식.' },
  { id: 'exam', zone: 'study', name: '시험고사장', scene: 'exam', spawn: 'main', icon: 'clock', color: '#2f63e0', desc: '서울 시간에 맞춰 교시별로 움직이는 교실과 시험장 유의사항.' },
];

export const spaceById = (id) => SPACES.find((s) => s.id === id);
