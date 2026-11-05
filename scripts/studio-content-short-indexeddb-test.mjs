import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [shared, contentPage, shortShell, shortActions, shortStepper, shortPage] = await Promise.all([
  read('../worker/src/frontend/shared.js'),
  read('../worker/src/frontend/studios/content/page.js'),
  read('../worker/src/frontend/studios/short/shell.js'),
  read('../worker/src/frontend/studios/short/stepper.js'),
  read('../worker/src/frontend/studios/short/page.js')
]);

// Content, Short, and Shop use the shared IndexedDB adapter in the app shell.
assert.match(shared, /AICS_STUDIO_DRAFTS\.save\(SHELL_ID/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.load\(SHELL_ID\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.importLegacy\(SHELL_ID, legacy\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.remove\(SHELL_ID\)/);

// Legacy localStorage is read for migration; the adapter-backed branch does not write it.
const adapterBranchStart = shared.indexOf('if (["content", "short", "shop"].indexOf(SHELL_ID) !== -1 && window.AICS_STUDIO_DRAFTS)');
const adapterBranchEnd = shared.indexOf('function restoreDraft(d)', adapterBranchStart);
assert.ok(adapterBranchStart >= 0 && adapterBranchEnd > adapterBranchStart);
const adapterBranch = shared.slice(adapterBranchStart, adapterBranchEnd);
assert.doesNotMatch(adapterBranch, /localStorage\.setItem/);
assert.match(adapterBranch, /localStorage\.getItem/);

// Content inputs are saved after a short debounce; API keys are not part of the collector.
assert.match(contentPage, /queueContentDraftSave/);
assert.match(contentPage, /window\.studioPersistDraft\(false\)/);
assert.match(shared, /window\.AICS_STUDIO_DRAFTS\.save\(SHELL_ID/);

// Short fields and generated image cache are collected into the IndexedDB draft.
assert.match(shortShell, /imgCache:imgCache/);\nassert.match(shortShell, /referenceImages:refImages\.map/);\nassert.match(shortShell, /renderRefPreviews\(\)/);
assert.match(shortShell, /imgCache=d\.imgCache/);
assert.match(shortShell, /queueShortDraftSave/);
assert.match(shortShell, /autoSave\(\)/);\nassert.match(shortActions, /renderRefPreviews\(\);\s*autoSave\(\);/);
assert.match(shortPage, /SHELL_SCRIPT/);\nassert.match(shortPage, /STEPPER_SCRIPT/);

// Short reset removes the IndexedDB draft and only clears legacy keys after confirmation.
assert.match(shortStepper, /AICS_STUDIO_DRAFTS\.remove\('short'\)/);
assert.match(shortStepper, /localStorage\.removeItem\('aics_draft_short'\)/);
assert.match(shortStepper, /if\(!confirm\(/);

console.log('Content and Short IndexedDB wiring tests passed.');
