import test from "node:test";
import assert from "node:assert/strict";
import { SHEET_SPRING, shouldCloseSheet } from "../src/motion.js";

const tall = { height: 780, viewportHeight: 800, displacement: 0, velocity: 0, opening: false };
test("sheet uses the reference overdamped spring", () => {
  assert.equal(SHEET_SPRING.mass, 0.5);
  assert.equal(SHEET_SPRING.stiffness, 100);
  assert.equal(SHEET_SPRING.damping / (2 * Math.sqrt(50)), 1.1);
});
test("a tall sheet uses the viewport threshold, not an arbitrary drag distance", () => {
  assert.equal(shouldCloseSheet({ ...tall, displacement: 90 }), false);
  assert.equal(shouldCloseSheet({ ...tall, displacement: 100 }), true);
});
test("short sheet closes at 64% of its extent", () => {
  assert.equal(shouldCloseSheet({ ...tall, height: 500, displacement: 170 }), false);
  assert.equal(shouldCloseSheet({ ...tall, height: 500, displacement: 185 }), true);
});
test("reversing the gesture reopens the sheet", () => {
  assert.equal(shouldCloseSheet({ ...tall, displacement: 300, opening: true }), false);
  assert.equal(shouldCloseSheet({ ...tall, displacement: 300, velocity: -200 }), false);
});
test("flings are predicted and bounded like the reference", () => {
  assert.equal(shouldCloseSheet({ ...tall, displacement: 15, velocity: 100 }), false);
  assert.equal(shouldCloseSheet({ ...tall, displacement: 15, velocity: 5000 }), true);
  assert.equal(shouldCloseSheet({ ...tall, displacement: 15, velocity: 50000 }), shouldCloseSheet({ ...tall, displacement: 15, velocity: 5000 }));
});
