import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const [actions, page, loaders, worker] = await Promise.all([
  read('worker/src/frontend/studios/story/actions.js'),
  read('worker/src/frontend/studios/story/video-plan/page.js'),
  read('worker/src/frontend/studioPages.js'),
  read('worker/src/index.js')
]);

const handoffStart = actions.indexOf('function goToVideoForm(){');
const handoffEnd = actions.indexOf('\nfunction fillVideoStoryField()', handoffStart);
assert.ok(handoffStart >= 0 && handoffEnd > handoffStart, 'Story Video handoff action exists');
const handoff = actions.slice(handoffStart, handoffEnd);
assert.ok(handoff.indexOf('autoSave()') < handoff.indexOf("window.location.assign('/app/story-video-plan?session='"), 'Draft save must happen before navigation');
assert.match(handoff, /if\(!session\|\|!session\.id\)/, 'Navigation must stop when the IndexedDB save fails');
assert.match(handoff, /encodeURIComponent\(session\.id\)/, 'Only the encoded Session ID is passed in the URL');

assert.match(page, /VIDEO_PLAN_SESSION_SCRIPT/, 'Dedicated page loads the IndexedDB session bridge');
assert.match(page, /storyNode\.textContent=session\.story/, 'Story content is rendered as text, not HTML');
assert.match(page, /AICS_STORY_VIDEO_SESSION\.load\(sessionId\)/, 'Page loads Story by Session ID');
assert.match(loaders, /'story-video-plan': \(\) => import\('\.\/studios\/story\/video-plan\/page\.js'\)/, 'Page is registered in the lazy loader');
assert.match(worker, /studioSlug === 'story-video-plan' \? 'story' : studioSlug/, 'Page uses Story Studio enablement settings');

console.log('Story Video Plan page handoff tests passed.');
