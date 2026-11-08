import * as THREE from 'three';
import { spot, sign, mat, rbox, add, block, rect } from './kit.js';
import { makeCup, disposeCup } from '../engine/props.js';

/**
 * 응원 카페: 아아(아이스 아메리카노)와 자몽허니블랙티 중 하나를 고른다.
 * 카운터 앞에 컵이 나오면 손을 뻗어 받아 들고(컵은 손에 똑바로 선다), 빨대로 네 모금 마신다.
 * 한 모금마다 음료가 줄고, 다 마신 컵은 잠깐 들고 다니다 사라진다.
 * 손에 든 컵은 '들고 있기(hold) cupA·cupG'로 정해져 같은 방 친구 화면에서도 보인다.
 * opts: x,z · ry(카운터 앞면이 보는 방향) · id
 */
const DRINKS = {
  ame: {
    hold: 'cupA', key: 'americano', name: '아이스 아메리카노', short: '아아', icon: '🧊', desc: '얼음 가득, 정신 번쩍',
    lines: ['아아 한 모금, 정신이 번쩍! 오늘도 할 수 있어.', '얼음 소리 들으면서 한 문제만 더.', '시원하게 한 잔. 머리도 맑아져라.'],
  },
  grape: {
    hold: 'cupG', key: 'grapefruit', name: '자몽허니블랙티', short: '자몽허니블랙티', icon: '🍊', desc: '새콤달콤, 수고한 나에게',
    lines: ['새콤달콤 자몽허니블랙티. 수고한 나에게 한 잔.', '달달한 한 모금, 지친 마음도 사르르.', '오늘 하루도 잘 버틴 나, 건배!'],
  },
};

export function drinkBar(S, api, { x, z, ry = 0, id = 'cafe' }) {
  const G = S.group;
  const bar = new THREE.Group(); bar.position.set(x, 0, z); bar.rotation.y = ry; G.add(bar);
  // 카운터 · 커피 기계 · 메뉴판
  block(bar, 1.6, 0.92, 0.6, 0, 0, 0, 0, { material: mat(0x8a5f3f) });
  add(bar, rbox(1.66, 0.05, 0.66, 0.02), mat(0xf4ece0, { roughness: 0.5 }), 0, 0.945, 0);
  add(bar, rbox(0.38, 0.42, 0.32, 0.04), mat(0x2b2f3a, { metalness: 0.4, roughness: 0.4 }), -0.5, 1.18, -0.1);
  add(bar, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), mat(0xb8bcc4, { metalness: 0.7 }), -0.5, 1.02, 0.08, { cast: false });
  // 진열 컵 두 개 (메뉴 보기)
  const showA = makeCup('ame'); showA.position.set(0.2, 1.08, -0.15); bar.add(showA);
  const showB = makeCup('grape'); showB.position.set(0.5, 1.08, -0.15); bar.add(showB);
  sign(bar, ['응원 카페', '아아 · 자몽허니블랙티'], { w: 1.5, h: 0.5, y: 1.85, z: -0.28, bg: '#2f4a3a', fg: '#fff4d6', size: 80, tw: 760, border: '#e9b44c' });
  sign(bar, '무료 · 마음껏', { w: 0.8, h: 0.18, y: 0.6, z: 0.31, bg: '#e9b44c', fg: '#26252e', size: 90, tw: 480 });
  {
    const W = 1.7, D = 0.7, c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    S.colliders.push(rect(x, z, c * W + s * D, s * W + c * D));
  }
  const ax = x + Math.sin(ry) * 1.0, az = z + Math.cos(ry) * 1.0;
  const alive = () => !!S.group.parent;

  // 내가 받는 컵: 카운터 앞쪽에 나왔다가 손으로 옮겨진다
  let counterCup = null, busy = false, token = 0;
  function serve(kind) {
    if (busy) return;
    busy = true;
    const d = DRINKS[kind];
    const my = ++token;
    api.player.facing = ry + Math.PI; api.player.sync();
    if (api.player.avatar.hold === 'cupA' || api.player.avatar.hold === 'cupG') api.hold(null);
    // 1) 기계에서 컵이 나와 카운터 앞으로
    counterCup = makeCup(kind); counterCup.position.set(-0.5, 1.08, 0.08); bar.add(counterCup);
    api.audio.play('pour');
    api.fx.burst({ origin: bar.localToWorld(new THREE.Vector3(-0.5, 1.3, 0.1)), count: 8, shape: 'spark', size: 0.03, colors: ['#ffffff', '#e8f6ff'], speed: [0.2, 0.6], up: 0.8, gravity: 1, life: [0.4, 0.8] });
    let slide = 0;
    const slideT = setInterval(() => {
      slide = Math.min(1, slide + 0.08);
      if (counterCup) counterCup.position.set(-0.5 + slide * 0.5, 1.08, 0.08 + slide * 0.14);
      if (slide >= 1) clearInterval(slideT);
    }, 40);
    // 2) 손을 뻗어 받는다
    setTimeout(() => { if (alive() && my === token) { api.act('reach'); } }, 650);
    setTimeout(() => {
      clearInterval(slideT);
      if (counterCup) { counterCup.removeFromParent(); disposeCup(counterCup); counterCup = null; }
      if (!alive() || my !== token) { busy = false; return; }
      api.hold(d.hold); api.audio.play('clink'); api.count(d.key);
      api.say(`${d.icon} ${d.name} 받았어요. 한 모금씩 마셔요.`, { kicker: '응원 카페', ms: 2200 });
    }, 1250);
    // 3) 빨대로 네 모금
    for (let i = 0; i < 4; i++) {
      const t0 = 2000 + i * 1500;
      setTimeout(() => { if (alive() && my === token && api.player.avatar.hold === d.hold) api.act('sip'); }, t0);
      setTimeout(() => {
        if (!alive() || my !== token) return;
        const cup = api.player.avatar.holdProp;
        if (!cup || api.player.avatar.hold !== d.hold) return;
        const liq = cup.userData.liquid;
        liq.scale.y = Math.max(0.06, 1 - (i + 1) * 0.23);
        cup.userData.ice.forEach((c, k) => { c.position.y = Math.max(-0.09, c.position.y - 0.018 * (k + 1) * 0.5); });
        api.audio.play('sip');
        if (i === 1) api.say(d.lines[Math.floor(Math.random() * d.lines.length)], { kicker: `${d.icon} ${d.short}`, ms: 3800 });
        if (i === 3) api.audio.play('clink');
      }, t0 + 480);
    }
    // 4) 빈 컵은 조금 들고 다니다 사라진다
    setTimeout(() => { busy = false; }, 2000 + 4 * 1500);
    setTimeout(() => { if (alive() && my === token && api.player.avatar.hold === d.hold) api.hold(null); }, 2000 + 4 * 1500 + 20000);
  }
  function openMenu() {
    api.hud.openPanel({
      title: '응원 카페', sub: '한 잔 골라요. 컵을 받아 들고 마시며 걸어 다녀도 돼요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${Object.entries(DRINKS).map(([k, d]) => `<button class="choice" data-k="${k}">${d.icon} ${d.name} <small style="display:block;color:var(--faint);font-weight:600;margin-top:2px">${d.desc}</small></button>`).join('')}</div>`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { api.hud.closePanel(); serve(b.dataset.k); }));
      },
    });
  }
  spot(S, { id, label: '응원 카페 · 아아 · 자몽허니블랙티', pos: [x, 2.5, z], at: [ax, az], face: ry + Math.PI, onUse: openMenu });
  const prevDispose = S.dispose;
  S.dispose = () => { token++; if (counterCup) { disposeCup(counterCup); counterCup = null; } prevDispose?.(); };
  return {
    start() { api.walkTo(ax, az, () => { api.player.facing = ry + Math.PI; api.player.sync(); openMenu(); }); },
  };
}
