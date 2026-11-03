import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const [storyUi, videoUi, videoPage, storyPage] = await Promise.all([
  read('worker/src/frontend/studios/story/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/page.js'),
  read('worker/src/frontend/studios/story/page.js')
]);

assert.match(storyUi, /const CONTENT_HTML = STEP1_HTML \+ STEP3_HTML;/, 'Story Studio contains only Story steps');
assert.doesNotMatch(storyUi, /vidWorkflowSel|videoPlanBtn|finalResult/, 'Story Studio UI does not own Video Plan controls');
assert.match(videoUi, /vidWorkflowSel/, 'Video Plan module owns workflow settings');
assert.match(videoUi, /videoPlanBtn/, 'Video Plan module owns its generate action');
assert.match(videoUi, /id="finalResult"/, 'Video Plan module owns its result container');
assert.match(videoUi, /data-step="1"/, 'Video Plan settings use local step 1');
assert.match(videoUi, /data-step="2"/, 'Video Plan result uses local step 2');
assert.match(videoPage, /VIDEO_PLAN_CONTENT_HTML/, 'Dedicated page composes the Video Plan UI module');
assert.match(videoPage, /steps: \[\{ label: '01 Video Settings' \}, \{ label: '02 Video Result'/, 'Dedicated page has its own stepper');
assert.match(videoPage, /storyNode\.value=session\.story/, 'Source Story is copied into the Video Plan working field');
assert.match(videoPage, /storyVideoLoadStatus/, 'Source loading status is shown');
assert.match(storyPage, /CONTENT_HTML/, 'Story page still composes its own UI');

console.log('Story / Video Plan UI separation tests passed.');
