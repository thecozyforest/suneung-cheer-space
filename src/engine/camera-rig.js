import * as THREE from 'three';

/** 캐릭터를 따라가는 카메라. 끌어서 돌리고, 휠·두 손가락으로 당긴다. */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0; this.pitch = 0.55; this.dist = 10;
    this.goalYaw = 0; this.goalPitch = 0.55; this.goalDist = 10;
    this.limits = { minDist: 4, maxDist: 24, minPitch: 0.12, maxPitch: 1.25, yawMin: -Infinity, yawMax: Infinity };
    this.focus = new THREE.Vector3();
    this.lookOffset = new THREE.Vector3(0, 1.0, 0);
    this.lookUp = 0; this.goalLookUp = 0;
    this.override = null; // {pos, look} 고정 시점
    this.tmp = new THREE.Vector3();
  }
  configure({ yaw = 0, pitch = 0.55, dist = 10, minDist = 4, maxDist = 24, minPitch = 0.12, maxPitch = 1.25, yawRange = null, lookHeight = 1.0 } = {}) {
    this.goalYaw = this.yaw = yaw;
    this.goalPitch = this.pitch = pitch;
    this.goalDist = this.dist = dist;
    this.limits = { minDist, maxDist, minPitch, maxPitch, yawMin: yawRange ? yaw - yawRange : -Infinity, yawMax: yawRange ? yaw + yawRange : Infinity };
    this.lookOffset.set(0, lookHeight, 0);
    this.override = null;
    this.goalLookUp = this.lookUp = 0;
  }
  snap(target) { this.focus.copy(target); this.update(1, target, true); }
  rotate(dx, dy) {
    this.goalYaw = THREE.MathUtils.clamp(this.goalYaw - dx * 0.006, this.limits.yawMin, this.limits.yawMax);
    this.goalPitch = THREE.MathUtils.clamp(this.goalPitch + dy * 0.004, this.limits.minPitch, this.limits.maxPitch);
  }
  zoom(f) { this.goalDist = THREE.MathUtils.clamp(this.goalDist * f, this.limits.minDist, this.limits.maxDist); }
  setOverride(pos, look) { this.override = pos ? { pos: pos.clone(), look: look.clone() } : null; }
  update(dt, target, instant = false) {
    const k = instant ? 1 : 1 - Math.exp(-dt * 7);
    this.yaw += (this.goalYaw - this.yaw) * k;
    this.pitch += (this.goalPitch - this.pitch) * k;
    this.dist += (this.goalDist - this.dist) * k;
    this.lookUp += (this.goalLookUp - this.lookUp) * (instant ? 1 : 1 - Math.exp(-dt * 2));
    this.focus.lerp(target, instant ? 1 : 1 - Math.exp(-dt * 8));
    const cam = this.camera;
    if (this.override) {
      cam.position.lerp(this.override.pos, instant ? 1 : 1 - Math.exp(-dt * 3));
      this.tmp.copy(this.override.look);
      cam.lookAt(this.tmp);
      return;
    }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const look = this.tmp.copy(this.focus).add(this.lookOffset);
    cam.position.set(
      look.x + Math.sin(this.yaw) * cp * this.dist,
      look.y + sp * this.dist,
      look.z + Math.cos(this.yaw) * cp * this.dist,
    );
    look.y += this.lookUp;
    cam.lookAt(look);
  }
  /** 화면 기준 앞·오른쪽 방향 (xz 평면) */
  basis() {
    const f = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const r = new THREE.Vector2(-f.y, f.x);
    return { f, r };
  }
}
