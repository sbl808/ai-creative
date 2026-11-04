import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [fragments, page] = await Promise.all([
  readFile(new URL('worker/src/frontend/studios/content/fragments.js', root), 'utf8'),
  readFile(new URL('worker/src/frontend/studios/content/page.js', root), 'utf8'),
]);
const inlineEventAttribute = /\son(?:click|change|input|keypress)\s*=/i;
assert.ok(!inlineEventAttribute.test(fragments), 'Content Studio active fragments contain no inline event attributes');

for (const action of [
  'toggle-audio-advanced', 'generate-voice', 'content-nav-audio', 'download-audio',
  'generate-srt', 'copy-result-srt', 'download-result-srt', 'translate-srt',
  'select-direction', 'copy-translated-srt', 'download-translated-srt',
  'back-to-content-result', 'save-content-result'
]) {
  assert.ok(fragments.includes('data-aics-action="' + action + '"'), 'Content action marker: ' + action);
}
for (const change of ['voice-gender-male', 'voice-gender-female', 'effective-voice']) {
  assert.ok(fragments.includes('data-aics-change="' + change + '"'), 'Content change marker: ' + change);
}
assert.ok(fragments.includes('data-aics-input="auto-grow"'), 'Content auto-grow input marker exists');
assert.ok(page.includes("document.addEventListener('click'") && page.includes("document.addEventListener('change'") && page.includes("document.addEventListener('input'"), 'Content delegated listeners exist');
assert.ok(page.includes("case 'select-direction'"), 'Direction selection is handled through delegation');

console.log('Content Studio delegated event tests passed.');
