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

for (const marker of ['data-voice-action=\"switch-mode\"', 'data-voice-action=\"paste\"', 'data-voice-action=\"example\"', 'data-voice-action=\"set-media-output\"', 'data-voice-input=\"grow-clear\"', 'data-voice-input=\"grow\"', 'data-voice-change=\"clear-validation\"', 'data-voice-change=\"srt-file\"']) {
  assert.ok(actions.includes(marker), 'Missing delegated marker: ' + marker);
}
for (const listener of [\"addEventListener('click',vHandleDelegatedAction)\", \"addEventListener('input',vHandleDelegatedInput)\", \"addEventListener('change',vHandleDelegatedChange)\"]) {
  assert.ok(actions.includes(listener), 'Missing delegated listener: ' + listener);
}
assert.ok(actions.includes(\"data-voice-mode=\\\"'+esc(m.id)+'\\\">\"), 'Mode chip value binding is missing');
for (const cssClass of ['voice-model-store', 'voice-space-top-0', 'voice-space-top-14', 'aics-login-overlay.is-hidden']) {
  assert.ok(page.includes(cssClass), 'Missing CSS class: ' + cssClass);
}
assert.ok(ui.includes('class=\"voice-model-store\"'));
assert.ok(page.includes('class=\"aics-login-overlay is-hidden\"'));

process.stdout.write('Voice Studio CSP static contract: PASS\\n');
