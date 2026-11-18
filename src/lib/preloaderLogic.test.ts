import test from 'node:test';
import assert from 'node:assert/strict';
import { computePreloaderFrame, easeOutCubic } from './preloaderLogic';

test('easeOutCubic starts at 0, ends at 1, and clamps out-of-range inputs', () => {
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(0), 0);
  assert.ok(easeOutCubic(0.5) > 0.5 && easeOutCubic(0.5) < 1);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(1.5), 1);
});

test('computePreloaderFrame progresses smoothly from 0% to 100% and handles exit/done phases', () => {
  const start = computePreloaderFrame(0, 'en', 1000, 300);
  assert.equal(start.percent, 0);
  assert.equal(start.stageIndex, 0);
  assert.equal(start.isExiting, false);
  assert.equal(start.isDone, false);

  const mid = computePreloaderFrame(600, 'en', 1000, 300);
  assert.ok(mid.percent > 60 && mid.percent < 100);
  assert.equal(mid.stageIndex, 1);
  assert.equal(mid.isExiting, false);

  const exiting = computePreloaderFrame(1050, 'hi', 1000, 300);
  assert.equal(exiting.percent, 100);
  assert.equal(exiting.stageIndex, 2);
  assert.equal(exiting.stageLabel, 'तैयार');
  assert.equal(exiting.isExiting, true);
  assert.equal(exiting.isDone, false);

  const done = computePreloaderFrame(1300, 'en', 1000, 300);
  assert.equal(done.percent, 100);
  assert.equal(done.isExiting, false);
  assert.equal(done.isDone, true);
});
