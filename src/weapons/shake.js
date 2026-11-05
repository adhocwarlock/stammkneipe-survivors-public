// The ONE place that shakes the camera for weapons, so it can be turned down (or off) globally later.
let shakeScale = 1;

export function setShakeScale(scale) {
  shakeScale = Math.max(0, scale);
}

export function shake(scene, intensity, durationMs = 120) {
  if (shakeScale <= 0 || intensity <= 0) return;
  scene.cameras.main.shake(durationMs, intensity * shakeScale);
}
