import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [shared, imageActions, imageApi, imagePage, shopShell, shopHelpers, shopActions] = await Promise.all([
  read('../worker/src/frontend/shared.js'),
  read('../worker/src/frontend/studios/image/actions.js'),
  read('../worker/src/frontend/studios/image/api.js'),
  read('../worker/src/frontend/studios/image/page.js'),
  read('../worker/src/frontend/studios/shop/shell.js'),
  read('../worker/src/frontend/studios/shop/helpers.js'),
  read('../worker/src/frontend/studios/shop/actions.js')
]);

// Image is included in the shared IndexedDB save/load/migration/reset path.
assert.match(shared, /["content", "short", "image", "shop"]/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.save\(SHELL_ID/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.load\(SHELL_ID\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.importLegacy\(SHELL_ID, legacy\)/);
assert.match(shared, /AICS_STUDIO_DRAFTS\.remove\(SHELL_ID\)/);

// Image drafts preserve generated results and uploaded reference images.
assert.match(imageActions, /referenceImages:refImages\.map/);
assert.match(imageActions, /imageMap\.finalImage/);
assert.match(imageActions, /d\.referenceImages\.slice\(0,MAX_REF\)/);
assert.match(imageActions, /renderRefPreviews\(\)/);
assert.match(imageActions, /window\.studioPersistDraft\(false\)/);
assert.doesNotMatch(imageActions, /localStorage\.setItem\(['"]aics_draft_image/);
assert.match(imageApi, /renderRefPreviews\(\);\s*autoSave\(\);/);
assert.match(imageApi, /function removeRef\(idx\)[\s\S]*?autoSave\(\);/);
assert.match(imagePage, /queueImageDraftSave/);
assert.match(imagePage, /target\.closest\('\.aics-work'\)/);

// Shop captures all reference image arrays before serializing the complete state.
assert.match(shopShell, /shopState\.content\.input\.images=refImagesContent/);
assert.match(shopShell, /shopState\.video\.input\.images=refImagesVideo/);
assert.match(shopShell, /shopState\.image\.input\.images=refImagesImage/);
assert.match(shopShell, /queueShopDraftSave/);
assert.match(shopShell, /target\.closest\('\.aics-work'\)/);
assert.match(shopHelpers, /return JSON\.parse\(JSON\.stringify\(state\)\)/);
assert.doesNotMatch(shopHelpers, /referenceImage=''/);
assert.doesNotMatch(shopHelpers, /envImage=''/);
assert.match(shopActions, /arr\.push\(\{base64:b64,mimeType:file\.type\|\|'image\/png'\}\);[\s\S]*?scheduleSave\(\);/);
assert.match(shopActions, /arr\.splice\(idx,1\);renderRefPreview\(id,arr\);scheduleSave\(\);/);

console.log('Image and Shop IndexedDB wiring tests passed.');
