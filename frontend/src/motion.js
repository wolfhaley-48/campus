export const CONTROL_SPRING = { type: "spring", mass: 0.8, stiffness: 440, damping: 38 };
export const CONTENT_EASE = [0.23, 1, 0.32, 1];
export const CONTENT_TRANSITION = { duration: 0.18, ease: CONTENT_EASE };

// Meow Client's proxy sheet: mass .5, stiffness 100, damping ratio 1.1.
export const SHEET_SPRING = {
  type: "spring", mass: 0.5, stiffness: 100, damping: 2 * 1.1 * Math.sqrt(50),
  restDelta: 0.01, restSpeed: 0.01,
};

export function shouldCloseSheet({ height, viewportHeight, displacement, velocity, opening }) {
  if (velocity < -90 || (Math.abs(velocity) <= 90 && opening)) return false;
  const threshold = height > viewportHeight * 0.857 ? viewportHeight * 0.857 : height * 0.64;
  const current = height - Math.max(0, displacement);
  if (velocity <= 90) return current <= threshold;

  // Same overdamped spring prediction as sheet_motion.dart; positive pointer
  // velocity closes the sheet, whereas positive extent velocity opens it.
  const { mass, stiffness, damping } = SHEET_SPRING;
  const discriminant = Math.sqrt(damping ** 2 - 4 * mass * stiffness);
  const r1 = (-damping + discriminant) / (2 * mass);
  const r2 = (-damping - discriminant) / (2 * mass);
  const speed = -Math.min(5000, velocity);
  const a = (speed - r2 * (current - height)) / (r1 - r2);
  const b = current - height - a;
  let low = current;
  for (let step = 1; step <= 120; step++) {
    const time = step / 120;
    const x = height + a * Math.exp(r1 * time) + b * Math.exp(r2 * time);
    const dx = a * r1 * Math.exp(r1 * time) + b * r2 * Math.exp(r2 * time);
    low = Math.min(low, x);
    if (dx >= 0) break;
  }
  return low <= threshold;
}
