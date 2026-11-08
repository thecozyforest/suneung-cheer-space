import * as THREE from 'three';
import { spot, sign, mat, add, rect } from './kit.js';
import { WISHES } from '../data/phrases.js';

/**
 * 초 켜는 기도.
 * 소원을 고르면 불붙은 심지초를 손에 들고 촛대의 빈 초에 불을 옮긴 뒤 손을 모은다.
 * 오늘 켜진 초 수는 서버 누적 수(counts/오늘/key)로 모두가 함께 보고, 켜진 초는 그날 계속 탄다.
 * 내가 켠 초 위에는 내 소원이 잠깐 떠 있고, 같은 방 친구 화면에도 뜬다(presence 동작 cw숫자).
 *
 * opts: key(누적 이름, 영문 소문자) · x,z · ry(촛대 앞면이 보는 방향) · pool(문구 방 이름) · label · y
 * 반환: { start() } — 걸어가서 기도 창 열기
 */
export function candlePrayer(S, api, { key, x, z, ry = 0, y = 0, pool, label = '초 켜고 기도', tiers = [7, 6, 5], note = '' }) {
  const G = S.group;
  const rack = new THREE.Group();
  rack.position.set(x, y, z); rack.rotation.y = ry;
  G.add(rack);
  const brass = mat(0x8a7a50, { metalness: 0.6, roughness: 0.38 });
  // 계단식 받침
  tiers.forEach((n, t) => {
    const w = n * 0.24 + 0.2;
    add(rack, new THREE.BoxGeometry(w, 0.06, 0.3), brass, 0, 0.5 + t * 0.2, 0.14 - t * 0.17);
  });
  add(rack, new THREE.CylinderGeometry(0.06, 0.09, 0.5, 10), brass, 0, 0.25, -0.02);
  add(rack, new THREE.CylinderGeometry(0.34, 0.38, 0.05, 18), brass, 0, 0.025, -0.02);
  {
    const W = tiers[0] * 0.24 + 0.25, D = 0.6, c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    S.colliders.push(rect(x, z, c * W + s * D, s * W + c * D));
  }

  // 초 · 불꽃
  const waxM = mat(0xfff8ea, { roughness: 0.7 });
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffc35a, toneMapped: false });
  const coreM = new THREE.MeshBasicMaterial({ color: 0xfff4c8, toneMapped: false });
  const glowM = new THREE.MeshBasicMaterial({ color: 0xffb45a, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
  const slots = [];
  tiers.forEach((n, t) => {
    for (let i = 0; i < n; i++) {
      const cx = (i - (n - 1) / 2) * 0.24, cy = 0.53 + t * 0.2, cz = 0.14 - t * 0.17;
      add(rack, new THREE.CylinderGeometry(0.04, 0.042, 0.2, 10), waxM, cx, cy + 0.1, cz, { cast: false });
      const f = new THREE.Group(); f.position.set(cx, cy + 0.24, cz); rack.add(f);
      const outer = add(f, new THREE.SphereGeometry(0.035, 8, 6), flameM, 0, 0, 0, { cast: false }); outer.scale.set(1, 1.8, 1);
      add(f, new THREE.SphereGeometry(0.018, 6, 5), coreM, 0, -0.012, 0.004, { cast: false });
      add(f, new THREE.SphereGeometry(0.09, 8, 6), glowM, 0, 0, 0, { cast: false });
      f.visible = false; f.scale.setScalar(0.001);
      slots.push({ f, on: false, grow: 0, ph: Math.random() * 6 });
    }
  });
  // 모든 화면에서 같은 순서로 켜지게 정해진 섞음
  let seed = [...key].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const order = slots.map((_, i) => i).sort(() => rnd() - 0.5);
  const light = new THREE.PointLight(0xffb45a, 0, 5, 1.6);
  light.position.set(0, 1.2, 0.5); rack.add(light);

  const world = (lx, ly, lz) => rack.localToWorld(new THREE.Vector3(lx, ly, lz));
  const ax = x + Math.sin(ry) * 0.82, az = z + Math.cos(ry) * 0.82;
  const sp = spot(S, { id: `candle-${key}`, label, pos: [x, y + 1.75, z], at: [ax, az], face: ry + Math.PI, onUse: () => openPanel() });

  let server = 0, mine = 0;
  const litCount = () => Math.min(slots.length, Math.max(server, mine));
  function refresh() {
    const n = litCount();
    for (let k = 0; k < slots.length; k++) {
      const s = slots[order[k]];
      if (k < n && !s.on) { s.on = true; s.grow = -0.9; s.f.visible = true; } // 잠깐 뒤에 피어오른다(날아온 불꽃이 먼저 닿게)
    }
    const total = Math.max(server, mine);
    sp.label = total ? `${label} · 오늘 ${total}개` : label;
  }
  api.watchCount(key, (v) => { server = v; refresh(); });

  const alive = () => !!S.group.parent;
  const hops = []; // 날아가는 불꽃
  let busy = false;
  function openPanel() {
    if (busy) return;
    api.hud.openPanel({
      title: '초 켜고 기도하기',
      sub: '소원 하나를 고르면 초에 불을 붙이고 잠시 손을 모아요. 켜진 초는 오늘 하루 꺼지지 않고, 들어오는 친구들도 함께 봐요.',
      render(body) {
        body.innerHTML = `<div class="choice-list">${WISHES.map((w, i) => `<button class="choice" data-i="${i}">🕯️ ${w}</button>`).join('')}</div>${note ? `<p class="src">${note}</p>` : ''}`;
        body.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { api.hud.closePanel(); light1(+b.dataset.i); }));
      },
    });
  }

  function taper() {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.012, 0.014, 0.34, 6), mat(0xf6ead2), 0, 0.12, 0, { cast: false });
    const fl = add(g, new THREE.SphereGeometry(0.026, 6, 5), flameM, 0, 0.31, 0, { cast: false }); fl.scale.set(1, 1.8, 1);
    add(g, new THREE.SphereGeometry(0.06, 8, 6), glowM, 0, 0.31, 0, { cast: false });
    g.userData.upright = true; g.userData.tilt = new THREE.Euler(1.0, 0, 0);
    g.userData.tip = fl;
    return g;
  }

  function light1(wi) {
    busy = true;
    const w = WISHES[wi] || '';
    const av = api.player.avatar;
    const tp = av.attach(taper(), 1);
    api.player.facing = ry + Math.PI; api.player.sync();
    api.act('reach'); api.audio.play('candle');
    setTimeout(() => {
      // 다음 빈 초에 불이 옮겨 붙는다
      const idx = Math.min(slots.length - 1, litCount());
      mine = Math.max(server, mine) + 1;
      refresh();
      const s = slots[order[idx]];
      if (alive()) {
        const p = s.f.getWorldPosition(new THREE.Vector3());
        // 심지초 끝 불꽃이 초 심지로 날아간다
        const from = tp.userData.tip.getWorldPosition(new THREE.Vector3());
        const spark = add(G, new THREE.SphereGeometry(0.035, 8, 6), flameM, from.x, from.y, from.z, { cast: false });
        hops.push({ m: spark, from, to: p.clone(), t: 0 });
        api.fx.burst({ origin: p, count: 12, shape: 'spark', size: 0.03, colors: ['#ffe08a', '#ffb45a', '#ffffff'], speed: [0.3, 0.9], up: 1.2, gravity: -0.2, life: [0.6, 1.1], emissive: 1.4 });
        const id = `deco:cw${Date.now()}`;
        api.labels.set(id, { text: w, cls: 'bubble', getPos: (v) => v.copy(p).add(new THREE.Vector3(0, 0.55, 0)) });
        setTimeout(() => api.labels.remove(id), 6500);
      }
      api.count(key);
      api.presence.action(`cw${wi}`);
    }, 750);
    setTimeout(() => {
      av.detach(tp);
      if (!alive()) { busy = false; return; }
      api.hold('pray'); api.audio.play('soft');
      api.say(pool, { kicker: `초 하나 · ${w}`, ms: 5200 });
    }, 1300);
    setTimeout(() => { busy = false; if (alive()) api.hold(api.player.seat ? 'pray' : null); }, 6500);
  }

  // 친구가 켠 초의 소원도 잠깐 뜬다
  S.peerHandlers.push((pos, name) => {
    if (!name.startsWith('cw')) return;
    const w = WISHES[+name.slice(2)];
    if (!w) return;
    const p = world(0, 1.5, 0.1);
    const id = `deco:pcw${Date.now()}${Math.random()}`;
    api.labels.set(id, { text: w, cls: 'bubble', getPos: (v) => v.copy(p) });
    setTimeout(() => api.labels.remove(id), 5000);
  });

  S.tickers.push((dt, t) => {
    for (let i = hops.length - 1; i >= 0; i--) {
      const h = hops[i]; h.t += dt / 0.35;
      const k = Math.min(1, h.t);
      h.m.position.lerpVectors(h.from, h.to, k); h.m.position.y += Math.sin(k * Math.PI) * 0.12;
      if (h.t >= 1) { G.remove(h.m); h.m.geometry.dispose(); hops.splice(i, 1); }
    }
    let n = 0;
    for (const s of slots) {
      if (!s.on) continue;
      n++;
      s.grow = Math.min(1, s.grow + dt * 2.5);
      const gr = Math.max(0.001, s.grow);
      const fl = 1 + Math.sin(t * 11 + s.ph) * 0.12 + Math.sin(t * 23 + s.ph * 2) * 0.06;
      s.f.scale.set(gr, gr * fl, gr);
    }
    light.intensity = n ? 0.8 + n * 0.22 + Math.sin(t * 9) * 0.15 : 0;
  });

  sign(rack, '초 켜고 기도', { w: 0.9, h: 0.2, y: 0.3, z: 0.11, bg: '#5a3a22', fg: '#ffe7b8', size: 90, tw: 520 });

  return {
    start() { api.walkTo(ax, az, () => { api.player.facing = ry + Math.PI; api.player.sync(); openPanel(); }); },
  };
}
