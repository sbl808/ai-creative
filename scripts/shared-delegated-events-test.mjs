import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [shared, sharedUi] = await Promise.all([
  readFile(new URL('worker/src/frontend/shared.js', root), 'utf8'),
  readFile(new URL('worker/src/frontend/shared-ui.js', root), 'utf8'),
]);

const inlineHandler = /\\s(?:onclick|onchange|oninput|onkeydown|onkeypress)\\s*=/i;
assert.ok(!inlineHandler.test(shared), 'Shared shell and sidebar contain no inline event attributes');
assert.ok(!inlineHandler.test(sharedUi), 'Shared UI components contain no inline event attributes');

for (const action of ['toggle', 'set-api-key', 'logout', 'load-more-sessions', 'open-story-session']) {
  assert.ok(shared.includes('data-aics-sidebar-action="' + action + '"'), 'Sidebar delegated action: ' + action);
}
for (const action of ['step', 'audience', 'studio-action']) {
  assert.ok(shared.includes('data-aics-shell-action="' + action + '"'), 'Shell delegated action: ' + action);
}
assert.ok(shared.includes('document.addEventListener') && shared.includes('sidebarAction'), 'Shared shell delegated listener exists');
assert.ok(sharedUi.includes('data-aics-hub-action='), 'Result Hub delegated action markers exist');
assert.ok(sharedUi.includes('window.__aicsHubDelegationBound'), 'Result Hub listener is installed once');
assert.ok(sharedUi.includes('document.addEventListener'), 'Result Hub delegated listener exists');

console.log('Shared shell, sidebar, and Result Hub delegated event tests passed.');
