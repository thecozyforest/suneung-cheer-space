import test from 'node:test';
import assert from 'node:assert/strict';
import { computeUiScale } from '../src/ui/scale.js';

test('UI 배율: 터치 기기는 1배, 데스크톱 큰 화면은 키운다', () => {
  assert.equal(computeUiScale(390, 844, false), 1);      // 휴대폰
  assert.equal(computeUiScale(1366, 768, true), 1);      // 작은 노트북은 그대로
  assert.equal(computeUiScale(1920, 1080, true), 1.4);   // 풀HD
  assert.equal(computeUiScale(2560, 1440, true), 1.8);   // 큰 모니터는 상한
  assert.equal(computeUiScale(800, 500, true), 1);       // 작은 창은 줄이지 않는다
});
