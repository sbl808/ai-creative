import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../worker/src/frontend/studios/image/', import.meta.url);
const [ui, api, stepper, page] = await Promise.all(
  ['ui.js', 'api.js', 'stepper.js', 'page.js'].map(name =>
    readFile(new URL(name, root), 'utf8')
  )
);

for (const [name, source] of Object.entries({ ui, api, stepper, page })) {
  assert.doesNotMatch(source, /\son(?:click|input|change|submit|keydown)=["']/i,
    name + ' must not contain inline event attributes');
  assert.doesNotMatch(source, /\sstyle=["']/i,
    name + ' must not contain inline style attributes');
}

for (const marker of [
  'data-image-action="preparePrompt"', 'data-image-action="retryPrepare"',
  'data-image-action="retryGenerate"', 'data-image-action="retryPromptEdit"',
  'data-image-action="scrollMapTop"', 'data-image-action="regenerateImage"',
  'data-image-action="downloadImage"', 'data-image-action="editMap"',
  'data-image-action="saveMap"', 'data-image-action="cancelMapEdit"'
]) assert.ok((ui + api).includes(marker), 'Missing action marker: ' + marker);

for (const marker of [
  'data-image-change="type"', 'data-image-change="audience"',
  'data-image-change="referenceFiles"', 'data-image-input="autoExpand"',
  'data-image-input="promptEdit"'
]) assert.ok(ui.includes(marker), 'Missing delegated UI marker: ' + marker);

assert.ok(stepper.includes('data-image-step-nav'));
assert.ok(page.includes("button.hasAttribute('data-image-step-nav')"));
assert.ok(page.includes('button.dataset.imageAction'));
assert.ok(page.includes('.image-intro-note'));
assert.ok(page.includes('.image-form-group-compact'));
assert.ok(page.includes('.image-idea-input'));
assert.ok(page.includes('.image-prep-prompt'));
assert.ok(page.includes('.map-loading-title'));
assert.ok(page.includes('.aics-login-overlay.is-hidden'));
assert.ok(page.includes("case 'editMap':window.editMapSection(button.dataset.imageKey)"));
assert.ok(page.includes("case 'saveMap':window.saveMapSection(button.dataset.imageKey)"));

console.log('Image Studio CSP static contract: PASS');
