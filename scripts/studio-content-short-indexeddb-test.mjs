import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [shared, contentPage, shortShell, shortActions, shortStepper, shortPage] = await Promise.all([
  read('../worker/src/frontend/shared.js'),
  read('../worker/src/frontend/studios/content/page.js'),
  read('../worker/src/frontend/studios/short/shell.js'),
  read('../worker/src/frontend/studios/short/actions.js'),
  read('../worker/src/frontend/studios/short/stepper.js'),
  read('../worker/src/frontend/studios/short/page.js')
]);

// Content, Short, and Shop use the shared IndexedDB adapter in the app shell.
assert.match(shared, /AICS_STUDIO_DRAFTS\.save\(SHELL_ID/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.load\(SHELL_ID\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.importLegacy\(SHELL_ID, legacy\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.remove\(SHELL_ID\)/);
assert.match(shared, /!studioDraftReady/);

// Legacy localStorage is read for migration; the adapter-backed branch does not write it.
const initStart = shared.indexOf('function init() {');
const adapterBranchStart = shared.indexOf('if (["content", "short", "shop"].indexOf(SHELL_ID) !== -1 && window.AICS_STUDIO_DRAFTS)', initStart);
const adapterBranchEnd = shared.indexOf('if (raw) {', adapterBranchStart);
assert.ok(adapterBranchStart >= 0 && adapterBranchEnd > adapterBranchStart);
const adapterBranch = shared.slice(adapterBranchStart, adapterBranchEnd);
assert.doesNotMatch(adapterBranch, /localStorage\.setItem/);
assert.match(adapterBranch, /localStorage\.getItem/);

// Content inputs and workflow results are saved to IndexedDB after a short debounce.
assert.match(contentPage, /queueContentDraftSave/);
assert.match(contentPage, /window\.studioPersistDraft\(false\)/);
assert.match(shared, /window\.AICS_STUDIO_DRAFTS\.save\(SHELL_ID/);

// Short fields, generated image cache, and uploaded reference images are persisted.
assert.match(shortShell, /imgCache:imgCache/);
assert.match(shortShell, /referenceImages:refImages\.map/);
assert.match(shortShell, /renderRefPreviews\(\)/);
assert.match(shortShell, /imgCache=d\.imgCache/);
assert.match(shortShell, /queueShortDraftSave/);
assert.match(shortShell, /autoSave\(\)/);
assert.match(shortActions, /renderRefPreviews\(\);\s*autoSave\(\);/);
assert.match(shortPage, /SHELL_SCRIPT/);
assert.match(shortPage, /STEPPER_SCRIPT/);

// Short reset removes the IndexedDB draft and clears legacy keys only after confirmation.
assert.match(shortStepper, /AICS_STUDIO_DRAFTS\.remove\('short'\)/);
assert.match(shortStepper, /localStorage\.removeItem\('aics_draft_short'\)/);
assert.match(shortStepper, /if\(!confirm\(/);

console.log('Content and Short IndexedDB wiring tests passed.');
