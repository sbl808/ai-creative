import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [page, repository, forms] = await Promise.all([
  readFile(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/frontend/storage/repositories/ideas.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/frontend/ideas/forms.js', import.meta.url), 'utf8'),
]);

assert.ok(page.includes('window.AICS_IDEAS.create('), 'new ideas must use shared IndexedDB repository');
assert.ok(page.includes('window.AICS_IDEAS.list()'), 'saved ideas must load from shared repository');
assert.ok(page.includes('window.AICS_IDEAS.update('), 'manual edits must persist');
assert.ok(page.includes('window.AICS_IDEAS.toggleFavorite('), 'favorite action must be wired');
assert.ok(page.includes('window.AICS_IDEAS.remove('), 'delete action must be wired');
assert.ok(page.includes('id="ideaEditor"'), 'idea editor UI must exist');
assert.ok(!page.includes('aics_ideas_v1'), 'Idea Workspace must not create/use the legacy database');
assert.ok(repository.includes("ownerId: ownerId"), 'new records must be owner-scoped');
assert.ok(repository.includes("record.result = changes.result"), 'generated result must be editable');
assert.ok(forms.includes('function read(categoryId, container)'), 'form reader must support scoped containers');
assert.ok(forms.includes('function validate(categoryId, container)'), 'form validation must support scoped containers');
console.log('Idea Workspace CRUD wiring checks passed.');
