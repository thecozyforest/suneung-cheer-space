import * as THREE from 'three';

/** 원과 상자 충돌, 장면 경계 안 걷기. 순수 계산이라 시험에서도 쓴다. */
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    if (pos.y != null && c.minY != null && (pos.y < c.minY - 0.1 || pos.y > c.maxY)) continue;
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = radius - d;
        pos.x += (dx / d) * push; pos.z += (dz / d) * push;
      } else {
        // 상자 안에 들어간 경우 가장 가까운 면으로 밀어낸다
        const opts = [
          [c.minX - radius - pos.x, 0], [c.maxX + radius - pos.x, 0],
          [0, c.minZ - radius - pos.z], [0, c.maxZ + radius - pos.z],
        ].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        pos.x += opts[0][0]; pos.z += opts[0][1];
      }
    }
  }
  return pos;
}

export function clampBounds(pos, b, r = 0) {
  pos.x = Math.max(b.minX + r, Math.min(b.maxX - r, pos.x));
  pos.z = Math.max(b.minZ + r, Math.min(b.maxZ - r, pos.z));
  return pos;
}

/** 사각형(중심·크기) → 충돌 상자 */
export const rect = (x, z, w, d, pad = 0) => ({ minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad });

export class Player {
  constructor(avatar) {
    this.avatar = avatar;
    this.pos = new THREE.Vector3();
    this.facing = 0;
    this.speed = 4.2;
    this.radius = 0.3;
    this.target = null;
    this.onArrive = null;
    this.seat = null;
    this.moving = 0;
    this.stuck = 0;
    this.footstepT = 0;
  }
  place(x, z, ry = 0, y = 0) {
    this.pos.set(x, y, z); this.facing = ry; this.target = null; this.onArrive = null; this.seat = null;
    this.avatar.stand();
    this.sync();
  }
  walkTo(x, z, onArrive) {
    if (this.seat) this.standUp();
    this.target = new THREE.Vector2(x, z);
    this.onArrive = onArrive || null;
    this.stuck = 0;
  }
  sitAt(seat) {
    this.seat = seat;
    this.target = null;
    this.pos.set(seat.x, seat.y || 0, seat.z);
    this.facing = seat.ry || 0;
    if (seat.lie) this.avatar.lie(seat.h ?? 0.3); else this.avatar.sit(seat.h ?? 0.45);
    this.sync();
  }
  standUp() {
    if (!this.seat) return;
    const s = this.seat;
    this.seat = null;
    this.avatar.stand();
    // 앉은 자리 앞으로 한 걸음
    this.pos.x += Math.sin(this.facing) * 0.55;
    this.pos.z += Math.cos(this.facing) * 0.55;
    return s;
  }
  /** axis: 화면 기준 입력, basis: 카메라 방향, world: {colliders, bounds, heightAt} */
  update(dt, axis, basis, world) {
    let vx = 0, vz = 0;
    const manual = Math.hypot(axis.x, axis.y) > 0.05;
    if (manual) {
      if (this.seat) this.standUp();
      this.target = null; this.onArrive = null;
      vx = basis.f.x * axis.y + basis.r.x * axis.x;
      vz = basis.f.y * axis.y + basis.r.y * axis.x;
      const l = Math.hypot(vx, vz) || 1;
      const mag = Math.min(1, Math.hypot(axis.x, axis.y));
      vx = vx / l * mag; vz = vz / l * mag;
    } else if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.y - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.18) {
        this.target = null;
        const cb = this.onArrive; this.onArrive = null;
        cb?.();
      } else {
        const sp = Math.min(1, d / 0.6);
        vx = dx / d * sp; vz = dz / d * sp;
      }
    }
    const mag = Math.hypot(vx, vz);
    if (mag > 0.01 && !this.seat) {
      const before = this.pos.clone();
      this.pos.x += vx * this.speed * dt;
      this.pos.z += vz * this.speed * dt;
      this.pos.y = world.heightAt ? world.heightAt(this.pos.x, this.pos.z) : 0;
      resolveCollisions(this.pos, this.radius, world.colliders);
      if (world.bounds) clampBounds(this.pos, world.bounds, this.radius);
      const want = Math.atan2(vx, vz);
      let diff = want - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * (1 - Math.exp(-dt * 12));
      // 막혀서 못 가면 목적지를 포기
      const progressed = before.distanceTo(this.pos);
      if (this.target) {
        this.stuck = progressed < this.speed * dt * 0.15 ? this.stuck + dt : 0;
        if (this.stuck > 0.45) {
          // 의자·책상에 막혀도 목적(앉기·문 열기 등)이 있으면 그 자리로 옮겨 마무리한다
          const cb = this.onArrive, t = this.target;
          this.target = null; this.onArrive = null; this.stuck = 0;
          if (cb) { this.pos.x = t.x; this.pos.z = t.y; this.pos.y = world.heightAt ? world.heightAt(t.x, t.y) : 0; cb(); }
        }
      }
      this.moving = Math.min(1, progressed / (this.speed * dt + 1e-6));
    } else {
      this.moving = 0;
      if (!this.seat) this.pos.y = world.heightAt ? world.heightAt(this.pos.x, this.pos.z) : 0;
    }
    this.avatar.update(dt, this.moving);
    this.sync();
    return this.moving;
  }
  sync() {
    this.avatar.root.position.copy(this.pos);
    this.avatar.root.rotation.y = this.facing;
  }
}
