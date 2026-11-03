import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const [actions, storyUi, videoUi, videoPage, storyPage, loaders, worker] = await Promise.all([
  read('worker/src/frontend/studios/story/actions.js'),
  read('worker/src/frontend/studios/story/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/page.js'),
  read('worker/src/frontend/studios/story/page.js'),
  read('worker/src/frontend/studioPages.js'),
  read('worker/src/index.js')
]);

assert.match(storyUi, /const CONTENT_HTML = STEP1_HTML \\+ STEP3_HTML;/, 'Story Studio contains only Story steps');
assert.doesNotMatch(storyUi, /vidWorkflowSel|videoPlanBtn|finalResult/, 'Story Studio UI does not own Video Plan controls');
assert.match(videoUi, /vidWorkflowSel/, 'Video Plan module owns workflow settings');
assert.match(videoUi, /videoPlanBtn/, 'Video Plan module owns its generate action');
assert.match(videoUi, /id="finalResult"/, 'Video Plan module owns its result container');
assert.match(videoUi, /data-step="1"/, 'Video Plan settings use local step 1');
assert.match(videoUi, /data-step="2"/, 'Video Plan result uses local step 2');
assert.match(videoUi, /id="videoPlanBtn" disabled/, 'Generate stays disabled until its action module is connected');
assert.match(videoPage, /VIDEO_PLAN_CONTENT_HTML/, 'Dedicated page composes the Video Plan UI module');
assert.match(videoPage, /steps: \\[\\{ label: '01 Video Settings' \\}, \\{ label: '02 Video Result'/, 'Dedicated page has its own stepper');
assert.match(videoPage, /storyNode\\.value=session\\.story/, 'Source Story is copied into the Video Plan working field');
assert.match(videoPage, /storyVideoLoadStatus/, 'Source loading status is shown');
assert.match(storyPage, /CONTENT_HTML/, 'Story page still composes its own UI');

const handoffStart = actions.indexOf('function goToVideoForm(){');
const handoffEnd = actions.indexOf('function fillVideoStoryField()', handoffStart);
assert.ok(handoffStart >= 0 && handoffEnd > handoffStart, 'Story handoff action remains available');
const handoff = actions.slice(handoffStart, handoffEnd);
assert.ok(handoff.indexOf('autoSave()') < handoff.indexOf("window.location.assign('/app/story-video-plan?session='"), 'Story is saved before navigation');
assert.match(handoff, /encodeURIComponent\\(session\\.id\\)/, 'Only the Story Session ID is passed in the URL');
assert.match(loaders, /'story-video-plan': \\(\\) => import\\('\\.\\/studios\\/story\\/video-plan\\/page\\.js'\\)/, 'Dedicated page is registered');
assert.match(worker, /studioSlug === 'story-video-plan' \\? 'story' : studioSlug/, 'Video Plan uses Story Studio enablement');

console.log('Story / Video Plan UI separation tests passed.');
