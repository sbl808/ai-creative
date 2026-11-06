import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../worker/src/frontend/studios/content/', import.meta.url);
const ui = await readFile(new URL('ui.js', root), 'utf8');
const page = await readFile(new URL('page.js', root), 'utf8');
const shell = await readFile(new URL('shell.js', root), 'utf8');
const api = await readFile(new URL('api.js', root), 'utf8');

const inlineEventAttribute = /\bon(?:click|change|input|keypress|keydown|submit)\s*=/i;
assert.equal(inlineEventAttribute.test(ui), false, 'Content UI fragments must not contain inline event attributes');
assert.equal(inlineEventAttribute.test(shell), false, 'Content audio shell must not contain inline event attributes');
assert.equal(inlineEventAttribute.test(api), false, 'Content dynamic result HTML must not contain inline event attributes');
const inlineStyleAttribute = /\bstyle\s*=/i;
assert.equal(inlineStyleAttribute.test(api), false, 'Content dynamic result HTML must not contain inline style attributes');
for (const className of ['scene-duration', 'scene-image-action', 'scene-empty-state', 'content-scene-loading', 'scene-image-error']) {
  assert.ok(page.includes('.' + className), 'Missing Content Studio CSS class: ' + className);
  assert.ok(api.includes('class="' + className + '"') || api.includes(' ' + className + '"'), 'Dynamic HTML does not use CSS class: ' + className);
}

const actions = [...ui.matchAll(/data-aics-action="([^"]+)"/g)].map((match) => match[1]);
const dynamicActions = [...api.matchAll(/data-aics-action="([^"]+)"/g)].map((match) => match[1]);
const delegatedCases = [...page.matchAll(/case '([^']+)':/g)].map((match) => match[1]);
for (const action of new Set(actions)) {
  assert.ok(delegatedCases.includes(action), 'Missing delegated click handler: ' + action);
}
for (const action of new Set(dynamicActions)) {
  assert.ok(delegatedCases.includes(action), 'Missing dynamic delegated click handler: ' + action);
}

assert.match(ui, /data-aics-change="update-conditional-fields"/);
assert.match(page, /update-conditional-fields/);
assert.match(ui, /data-aics-input="content-edit auto-grow"/);
assert.match(page, /inputActions\.indexOf\('content-edit'\)/);
assert.match(page, /inputActions\.indexOf\('auto-grow'\)/);
assert.match(shell, /data-aics-action="download-audio"/);

console.log('Content Studio inline event CSP contract checks passed.');
