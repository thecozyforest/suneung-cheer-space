import { buildFront } from './front.js';
import { buildRear } from './rear.js';
import { buildHall } from './hall.js';
import { buildSoft, buildSpicy } from './cheer.js';
import { buildTemple, buildCathedral, buildChurch, buildAllWish } from './wish.js';
import { buildStudy, buildExam } from './study.js';
import { buildRoof, buildStage } from './roofstage.js';

/** 장면 이름 → 만드는 함수 (scene 값은 registry.js와 같다) */
export const SCENES = {
  front: buildFront,
  rear: buildRear,
  hall: buildHall,
  soft: buildSoft,
  spicy: buildSpicy,
  temple: buildTemple,
  cathedral: buildCathedral,
  church: buildChurch,
  allwish: buildAllWish,
  study: buildStudy,
  exam: buildExam,
  roof: buildRoof,
  stage: buildStage,
};
