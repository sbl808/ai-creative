import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../worker/src/frontend/studios/voice/ui.js');
const actions = read('../worker/src/frontend/studios/voice/actions.js');
const page = read('../worker/src/frontend/studios/voice/page.js');

const inlineEventAttribute = /\s+on[a-z]+\s*=\s*[\"']/i;
const inlineStyleAttribute = /\s+style\s*=\s*[\"']/i;
for (const [name, source] of [['ui.js', ui], ['actions.js', actions], ['page.js', page]]) {
  assert.equal(inlineEventAttribute.test(source), false, name + ' must not contain inline event attributes');
  assert.equal(inlineStyleAttribute.test(source), false, name + ' must not contain inline style attributes');
}

assert.match(actions, /data-voice-action=\"switch-mode\"/);
assert.match(actions, /data-voice-action=\"paste\"/);
assert.match(actions, /data-voice-action=\"example\"/);
assert.match(actions, /data-voice-action=\"set-media-output\"/);
assert.match(actions, /data-voice-input=\"grow-clear\"/);
assert.match(actions, /data-voice-input=\"grow\"/);
assert.match(actions, /data-voice-change=\"clear-validation\"/);
assert.match(actions, /data-voice-change=\"srt-file\"/);
assert.match(actions, /addEventListener\\('click',vHandleDelegatedAction\\)/);
assert.match(actions, /addEventListener\\('input',vHandleDelegatedInput\\)/);
assert.match(actions, /addEventListener\\('change',vHandleDelegatedChange\\)/);
assert.match(actions, /data-voice-mode=\"'\\+esc\\(m\\.id\\)\\+'\">/);

for (const cssClass of ['voice-model-store', 'voice-space-top-0', 'voice-space-top-14', 'aics-login-overlay.is-hidden']) {
  assert.ok(page.includes(cssClass), 'Missing CSS class: ' + cssClass);
}
assert.ok(ui.includes('class=\"voice-model-store\"'));
assert.ok(page.includes('class=\"aics-login-overlay is-hidden\"'));

process.stdout.write('Voice Studio CSP static contract: PASS\\n');
