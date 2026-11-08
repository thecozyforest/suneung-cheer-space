import * as THREE from 'three';

/** 렌더러·카메라·해상도 자동 조절 */
export function createCore(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 700);

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || /Android [5-9]|iPhone OS 1[0-3]/.test(navigator.userAgent);
  const maxDpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
  let dpr = maxDpr;
  let frames = 0, acc = 0, lastAdjust = performance.now();
  let locked = false; // 캡처(포스터용)처럼 화질을 고정할 때

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 세로 화면에서는 시야를 넓혀 캐릭터 주변이 덜 잘리게
    camera.fov = w < h ? 55 : 42;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /** 프레임 시간을 보고 해상도를 올리고 내린다 */
  function measure(dtMs) {
    if (locked) return;
    frames++; acc += dtMs;
    const now = performance.now();
    if (now - lastAdjust < 2000 || frames < 40) return;
    const avg = acc / frames;
    frames = 0; acc = 0; lastAdjust = now;
    let next = dpr;
    if (avg > 24 && dpr > 0.75) next = Math.max(0.75, dpr - 0.25);
    else if (avg < 13 && dpr < maxDpr) next = Math.min(maxDpr, dpr + 0.25);
    if (next !== dpr) { dpr = next; resize(); }
  }

  /** 화질 고정(자동 조절 끔). 캡처·시연용 */
  function lockQuality(value = maxDpr) { locked = true; dpr = value; resize(); }
  return { renderer, scene, camera, resize, measure, lockQuality, get dpr() { return dpr; }, lowEnd };
}
