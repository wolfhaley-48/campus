// One silhouette avoids the hairline seams between separately rasterized faces.
export function cubeSilhouette(angle) {
  const tilt = (-18 * Math.PI) / 180;
  const roll = (-8 * Math.PI) / 180;
  const points = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        const rx = x * Math.cos(angle) + z * Math.sin(angle);
        const rz = -x * Math.sin(angle) + z * Math.cos(angle);
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        points.push([
          50 + (rx * Math.cos(roll) - ry * Math.sin(roll)) * 25,
          50 + (rx * Math.sin(roll) + ry * Math.cos(roll)) * 25,
        ]);
      }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (list) => {
    const result = [];
    for (const point of list) {
      while (
        result.length > 1 &&
        cross(result.at(-2), result.at(-1), point) <= 0
      )
        result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())];
}
