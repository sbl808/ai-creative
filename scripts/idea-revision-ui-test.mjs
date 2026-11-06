import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8');

for (const marker of [
  'id="revisionInstruction"',
  'id="reviseIdeaBtn"',
  'id="revisionPreview"',
  'id="applyRevisionBtn"',
  'id="discardRevisionBtn"',
  "fetch('/api/ideas/revise'",
  'showRevisionPreview(data.idea)',
  "window.AICS_IDEAS.update(editingIdeaId,{fields:fields,result:pendingRevision})",
]) {
  assert.ok(page.includes(marker), 'missing AI revision UI contract: ' + marker);
}
assert.ok(page.includes('pendingRevision=idea'), 'AI response must remain pending before explicit apply');
assert.ok(page.includes('pendingRevision=null;el(\'revisionPreview\').hidden=true'), 'discard must clear the preview');
console.log('Idea revision UI contract checks passed.');
