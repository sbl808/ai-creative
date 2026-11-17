import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const pages = ['home', 'settings', 'projects', 'creations'];
const sources = await Promise.all(pages.map((name) =>
  readFile(new URL('../worker/src/frontend/' + name + '.js', import.meta.url), 'utf8')
));
const inlineEventAttribute = /\son[a-z]+\s*=/i;

for (let i = 0; i < pages.length; i += 1) {
  assert.ok(!inlineEventAttribute.test(sources[i]), pages[i] + ' contains no inline event attributes');
}

const [home, settings, projects, creations] = sources;
for (const action of ['open-key-guide', 'close-key-guide', 'navigate-studio', 'navigate-creations']) {
  assert.ok(home.includes('data-home-action="' + action + '"'), 'Home action marker: ' + action);
}
assert.ok(home.includes("document.addEventListener('click'") && home.includes("document.addEventListener('keydown'"), 'Home delegated click and keyboard listeners exist');

for (const tab of ['profile', 'prefs', 'apikey', 'backup']) {
  assert.ok(settings.includes('data-settings-tab="' + tab + '"'), 'Settings tab marker: ' + tab);
}
for (const action of ['retry-key-status', 'set-api-key', 'test-api-key', 'remove-api-key']) {
  assert.ok(settings.includes('data-settings-action="' + action + '"'), 'Settings action marker: ' + action);
}
assert.ok(!settings.includes('data-settings-action="save-name"'), 'Removed Profile Name action is not present in Settings');
assert.ok(settings.includes('id="prefsForm"') && settings.includes("addEventListener('submit'"), 'Settings form uses a registered submit listener');

assert.ok(projects.includes('data-project-action="create"'), 'Projects create action marker exists');
assert.ok(projects.includes("document.addEventListener('keydown'"), 'Projects Enter key listener exists');

for (const action of ['open-image', 'favorite', 'toggle-full', 'copy', 'remove']) {
  assert.ok(creations.includes('data-creation-action="' + action + '"'), 'Creations action marker: ' + action);
}
assert.ok(creations.includes("document.addEventListener('input'") && creations.includes("document.addEventListener('change'"), 'Creations search and filter listeners exist');

console.log('Home, Settings, Projects, and Creations delegated event tests passed.');
