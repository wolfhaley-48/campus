import test from "node:test";
import assert from "node:assert/strict";
import { cubeSilhouette } from "../src/cube.js";

test("cube silhouette is closed by the renderer without seams and stays inside its viewport for a full turn", () => {
  for (let step = 0; step <= 72; step++) {
    const points = cubeSilhouette((step * Math.PI) / 36);
    assert.ok(points.length >= 4 && points.length <= 6);
    for (const [x, y] of points)
      assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
    assert.equal(
      new Set(points.map((point) => point.join(","))).size,
      points.length,
    );
  }
  assert.notDeepEqual(cubeSilhouette(0), cubeSilhouette(Math.PI / 4));
});
