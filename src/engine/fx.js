import * as THREE from 'three';

/**
 * 가벼운 입자 효과 모음. 하나의 InstancedMesh로 한 번 터뜨리고 수명이 다하면 스스로 지운다.
 * fx.update(dt)를 매 프레임 부른다.
 */
const dummy = new THREE.Object3D();
const col = new THREE.Color();

export function createFx(scene) {
  const live = [];

  function burst({ count = 60, origin, colors = ['#ffd65a', '#ff8fa3', '#7fc8ff', '#a6e3a1', '#ffffff'], speed = [3, 7], up = 5, gravity = 9, life = [1.4, 2.4], size = 0.12, shape = 'confetti', spin = 8, drag = 0.6, emissive = 0, spread = 1 }) {
    const geo = shape === 'shard' ? new THREE.TetrahedronGeometry(size, 0)
      : shape === 'spark' ? new THREE.SphereGeometry(size, 6, 4)
        : shape === 'heart' ? heartGeo(size)
          : new THREE.PlaneGeometry(size, size * 1.6);
    const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: emissive, toneMapped: emissive < 0.5 });
    const mesh = new THREE.InstancedMesh(geo, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const parts = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() * 0.9 + 0.1) * spread;
      const sp = speed[0] + Math.random() * (speed[1] - speed[0]);
      parts.push({
        p: origin.clone(),
        v: new THREE.Vector3(Math.cos(a) * e * sp, up * (0.5 + Math.random() * 0.8), Math.sin(a) * e * sp),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: new THREE.Vector3((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin),
        life: life[0] + Math.random() * (life[1] - life[0]), t: 0,
      });
      mesh.setColorAt(i, col.set(colors[i % colors.length]));
    }
    if (emissive > 0) material.vertexColors = false;
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    live.push({ mesh, parts, gravity, drag, emissive });
    return mesh;
  }

  /** 밤하늘 폭죽: 올라가다 둥글게 터진다 */
  function firework(origin, color) {
    const palette = color ? [color] : [['#ffd65a', '#fff2b0'], ['#ff7aa2', '#ffd0dd'], ['#7fc8ff', '#dff1ff'], ['#b28dff', '#e8dcff'], ['#8ef0b0', '#e0ffe9']][Math.floor(Math.random() * 5)];
    const shell = { t: 0, p: origin.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 2, 16 + Math.random() * 5, (Math.random() - 0.5) * 2), palette };
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: palette[0], toneMapped: false }));
    trail.position.copy(origin);
    scene.add(trail);
    live.push({ shell, trail });
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const L = live[i];
      if (L.shell) {
        const s = L.shell;
        s.t += dt; s.v.y -= 9 * dt; s.p.addScaledVector(s.v, dt); L.trail.position.copy(s.p);
        if (s.v.y < 2 || s.t > 2.2) {
          scene.remove(L.trail); L.trail.geometry.dispose(); L.trail.material.dispose();
          live.splice(i, 1);
          burst({ count: 90, origin: s.p, colors: s.palette, speed: [6, 11], up: 2, gravity: 3.5, life: [1.2, 2.0], size: 0.22, shape: 'spark', spin: 0, drag: 1.6, emissive: 2.2, spread: 1 });
        }
        continue;
      }
      let alive = 0;
      for (let j = 0; j < L.parts.length; j++) {
        const q = L.parts[j];
        q.t += dt;
        const k = Math.max(0, 1 - q.t / q.life);
        if (k > 0) alive++;
        q.v.y -= L.gravity * dt;
        q.v.multiplyScalar(Math.exp(-L.drag * dt));
        q.p.addScaledVector(q.v, dt);
        q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
        dummy.position.copy(q.p);
        dummy.rotation.copy(q.r);
        dummy.scale.setScalar(k > 0 ? Math.min(1, k * 3) : 0.0001);
        dummy.updateMatrix();
        L.mesh.setMatrixAt(j, dummy.matrix);
      }
      L.mesh.instanceMatrix.needsUpdate = true;
      if (!alive) {
        scene.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.material.dispose();
        live.splice(i, 1);
      }
    }
  }

  function clear() {
    for (const L of live) {
      const o = L.mesh || L.trail;
      scene.remove(o); o.geometry.dispose(); o.material.dispose();
    }
    live.length = 0;
  }

  return { burst, firework, update, clear, get count() { return live.length; } };
}

let heart;
function heartGeo(size) {
  if (heart) return heart.clone().scale(size / 0.12, size / 0.12, size / 0.12);
  const s = new THREE.Shape();
  s.moveTo(0, -0.06); s.bezierCurveTo(-0.12, 0.02, -0.06, 0.1, 0, 0.05); s.bezierCurveTo(0.06, 0.1, 0.12, 0.02, 0, -0.06);
  heart = new THREE.ShapeGeometry(s, 8);
  return heart.clone().scale(size / 0.12, size / 0.12, size / 0.12);
}

/**
 * 계속 떨어지는 잎·꽃가루. area: {minX,maxX,minZ,maxZ,top,bottom}
 */
export function createFalling(parent, { count = 120, area, colors, size = 0.18, speed = 0.8, sway = 1.2, heightAt }) {
  const geo = new THREE.PlaneGeometry(size, size * 0.7);
  geo.translate(0, 0, 0);
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  const parts = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < count; i++) {
    parts.push({ x: rand(area.minX, area.maxX), y: rand(area.bottom, area.top), z: rand(area.minZ, area.maxZ), ph: Math.random() * 6, sp: speed * rand(0.6, 1.3), rx: Math.random() * 6, ry: Math.random() * 6, rest: 0 });
    mesh.setColorAt(i, col.set(colors[i % colors.length]));
  }
  mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);
  let intensity = 1;
  return {
    mesh,
    set intensity(v) { intensity = v; },
    get intensity() { return intensity; },
    /** 화면에서 집을 수 있게 i번째 잎 위치 */
    positionOf(i, out = new THREE.Vector3()) { const q = parts[i]; return out.set(q.x, q.y, q.z); },
    respawn(i) { const q = parts[i]; q.y = area.top + Math.random() * 2; q.x = rand(area.minX, area.maxX); q.z = rand(area.minZ, area.maxZ); q.rest = 0; },
    update(dt, t) {
      for (let i = 0; i < count; i++) {
        const q = parts[i];
        const ground = heightAt ? heightAt(q.x, q.z) + 0.02 : area.bottom;
        if (q.rest > 0) {
          q.rest -= dt * intensity;
          if (q.rest <= 0) { q.y = area.top + Math.random() * 3; q.x = rand(area.minX, area.maxX); q.z = rand(area.minZ, area.maxZ); }
        } else {
          q.y -= q.sp * dt * (0.6 + intensity * 0.6);
          q.x += Math.sin(t * 1.3 + q.ph) * sway * dt;
          q.z += Math.cos(t * 1.1 + q.ph) * sway * 0.5 * dt;
          q.rx += dt * 2.2; q.ry += dt * 1.6;
          if (q.y <= ground) { q.y = ground; q.rest = 3 + Math.random() * 6; q.rx = -Math.PI / 2; }
        }
        dummy.position.set(q.x, q.y, q.z);
        dummy.rotation.set(q.rest > 0 ? -Math.PI / 2 : q.rx, q.ry, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { parent.remove(mesh); geo.dispose(); material.dispose(); },
  };
}
