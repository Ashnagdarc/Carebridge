export function triggerHaptic(pattern: number | number[] = 12) {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;

  navigator.vibrate(pattern);
}
