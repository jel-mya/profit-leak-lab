import test from 'node:test';
import assert from 'node:assert/strict';
import { pageWindow } from '../core/pagination.mjs';
test('all 10,000 imported records are reachable exactly once through bounded pages', () => {
  const visited = [];
  for (let page = 0; page < 200; page++) {
    const window = pageWindow(10000, page);
    assert.equal(window.end - window.start, 50);
    for (let i = window.start; i < window.end; i++) visited.push(i);
  }
  assert.deepEqual(visited, Array.from({ length: 10000 }, (_, i) => i));
});
test('a smaller replacement dataset clamps a stale page without empty results', () => {
  assert.deepEqual(pageWindow(51, 199), { page: 1, pages: 2, start: 50, end: 51, previous: true, next: false });
  assert.equal(pageWindow(25, 199).page, 0);
  assert.deepEqual(pageWindow(0, 3), { page: 0, pages: 1, start: 0, end: 0, previous: false, next: false });
});
test('invalid paging bounds fail instead of allocating or accepting fractional offsets', () => {
  for (const args of [[-1, 0], [3.5, 0], [100, NaN], [100, 0, 0], [100, 0, 101]]) assert.throws(() => pageWindow(...args));
  assert.equal(pageWindow(100, -5).page, 0);
});
