import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/live-face.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { advanceCapture, captureSteps } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
let progress = { step: 0, stableFrames: 0, lastAcceptedAt: null };
const preview = (pose = 'front', overrides = {}) => ({ pose, acceptable: true, face_count: 1, code: 'ready', ...overrides });
function advance(value, time) {
  const result = advanceCapture(progress, value, time);
  progress = result.progress;
  return result.capture;
}
assert.equal(advance(preview(), 0), false);
assert.equal(advance(preview(), 600), false);
assert.equal(advance(preview('front', { acceptable: false, code: 'blurry' }), 1200), false);
assert.equal(progress.stableFrames, 0, 'A bad frame must reset the current hold');
assert.equal(advance(preview(), 1800), false);
assert.equal(advance(preview(), 2400), false);
assert.equal(advance(preview(), 3000), true);
assert.equal(progress.step, 1);
assert.equal(advance(preview('front'), 3600), false, 'A stale response for the previous pose cannot advance');
assert.equal(progress.stableFrames, 0);
assert.equal(advance(preview('left'), 4200), false);
assert.equal(advance(preview('left'), 9200), false);
assert.equal(progress.stableFrames, 1, 'A network stall must reset the hold');
assert.equal(advance(preview('left', { face_count: 2 }), 9800), false);
for (const [index, pose] of ['left', 'right'].entries()) {
  assert.equal(advance(preview(pose), 10400 + index * 3000), false);
  assert.equal(advance(preview(pose), 11000 + index * 3000), false);
  assert.equal(advance(preview(pose), 11600 + index * 3000), true);
}
assert.equal(progress.step, captureSteps.length);
assert.equal(advance(preview('right'), 16000), false, 'A completed session cannot capture extra samples');
progress = { step: 0, stableFrames: 0, lastAcceptedAt: null };
advance(preview(), 17000);
advance(preview(), 17300);
assert.equal(advance(preview('front', { acceptable: false, face_count: 0, code: 'no_face' }), 17600), false);
assert.equal(progress.stableFrames, 2, 'One brief detection miss preserves the hold');
assert.equal(advance(preview(), 17900), true, 'Only the next valid frame may be captured');
progress = { step: 0, stableFrames: 0, lastAcceptedAt: null };
advance(preview(), 18000);
advance(preview('front', { acceptable: false, face_count: 0, code: 'no_face' }), 18300);
assert.equal(advance(preview('front', { acceptable: false, face_count: 0, code: 'no_face' }), 18600), false);
assert.equal(progress.stableFrames, 0, 'Repeated detection misses must reset the hold');
console.log('PASS: quality/pose checks, one brief detection miss, repeated misses, multiple faces, network stalls, and automatic captures only from valid frames.');
