import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { clientStorageScript } from '../worker/src/frontend/storage/client-storage.js';

const source = clientStorageScript();
assert.match(source, /indexedDB\\.open\\('aics_creations_v1', 4\\)/);
assert.match(source, /createObjectStore\\('studio_handoffs'/);
assert.match(source, /window\\.AICS_HANDOFFS\\s*=\\s*\\{/);
assert.match(source, /contractVersion!==1/);
assert.match(source, /owner_target_createdAt/);
new vm.Script(source, { filename: 'client-storage.js' });

const idea = readFileSync(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8');
const story = readFileSync(new URL('../worker/src/frontend/studios/story/actions.js', import.meta.url), 'utf8');
assert.match(idea, /AICS_HANDOFFS\\.create\\(\\{contractVersion:1,source:'ideas',target:'story'/);
assert.match(idea, /location\\.href='\\/app\\/story\\?handoff='/);
assert.match(story, /function studioReceiveIdeaHandoff\\(\\)/);
assert.match(story, /studioRestoreDraft\\(\\{stepNow:1,mode:'main'/);
assert.match(story, /AICS_HANDOFFS\\.remove\\(handoffId\\)/);
assert.match(story, /autoSave\\(\\)\\.then\\(function\\(session\\)/);
console.log('IndexedDB Studio Handoff tests passed.');
