import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../worker/src/frontend/studios/story/', import.meta.url);
const [ui, page, stepper] = await Promise.all([
  readFile(new URL('ui.js', root), 'utf8'),
  readFile(new URL('page.js', root), 'utf8'),
  readFile(new URL('stepper.js', root), 'utf8'),
]);

for (const [name, source] of [['ui.js', ui], ['page.js', page], ['stepper.js', stepper]]) {
  assert.equal(/\son[a-z]+\s*=\s*["']/i.test(source), false, name + ' must not contain inline event attributes');
  assert.equal(/\sstyle\s*=\s*["']/i.test(source), false, name + ' must not contain inline style attributes');
}
assert.match(ui, /story-handoff-panel/);
assert.match(page, /aics-login-overlay\.is-hidden\{display:none\}/);
assert.match(page, /data-story-step-nav/);
assert.match(page, /window\.stNav\(Number\(stepButton\.dataset\.storyStepNav\)\)/);
assert.match(page, /window\.stStepperKeydown\(event,Number\(target\.dataset\.storyStepNav\)\)/);
assert.match(stepper, /data-story-step-nav/);
assert.doesNotMatch(stepper, /onclick=|onkeydown=/);
console.log('Story Studio CSP static contract: PASS');
