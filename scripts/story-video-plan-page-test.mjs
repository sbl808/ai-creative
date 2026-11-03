import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const [storyActions, videoActions, storyUi, videoUi, videoPage, videoState, videoSession, storyPage, loaders, worker] = await Promise.all([
  read('worker/src/frontend/studios/story/actions.js'),
  read('worker/src/frontend/studios/story/video-plan/actions.js'),
  read('worker/src/frontend/studios/story/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/ui.js'),
  read('worker/src/frontend/studios/story/video-plan/page.js'),
  read('worker/src/frontend/studios/story/video-plan/state.js'),
  read('worker/src/frontend/studios/story/video-plan/session.js'),
  read('worker/src/frontend/studios/story/page.js'),
  read('worker/src/frontend/studioPages.js'),
  read('worker/src/index.js')
]);

assert.ok(storyUi.includes('const CONTENT_HTML = STEP1_HTML + STEP3_HTML;'), 'Story Studio contains only Story steps');
assert.ok(!/vidWorkflowSel|videoPlanBtn|finalResult/.test(storyUi), 'Story Studio UI does not own Video Plan controls');
assert.ok(videoUi.includes('vidWorkflowSel'), 'Video Plan module owns workflow settings');
assert.ok(videoUi.includes('videoPlanBtn'), 'Video Plan module owns its generate action');
assert.ok(videoUi.includes('id="finalResult"'), 'Video Plan module owns its result container');
assert.ok(videoUi.includes('data-step="1"') && videoUi.includes('data-step="2"'), 'Video Plan uses independent step numbering');
assert.ok(videoUi.includes('id="videoPlanBtn" disabled'), 'Generate stays disabled until Video Plan session initialization');
assert.ok(videoUi.includes('onclick="saveVideoPlan()"'), 'Video Plan exposes an explicit save action');
assert.ok(videoUi.includes('onclick="copyAllVideoPlanResult()"'), 'Video Plan exposes a copy action');
assert.ok(videoUi.includes('onclick="exportVideoPlan()"'), 'Video Plan exposes an export action');
assert.ok(videoUi.includes('id="planRetryBtn"'), 'Video Plan retry button is wired');
assert.ok(videoPage.includes('VIDEO_PLAN_CONTENT_HTML'), 'Dedicated page composes the Video Plan UI module');
assert.ok(videoPage.includes("steps: [{ label: '01 Video Settings' }, { label: '02 Video Result'"), 'Dedicated page has its own stepper');
assert.ok(videoPage.includes('VIDEO_PLAN_STATE_SCRIPT'), 'Dedicated page loads the Video Plan state module');
assert.ok(videoPage.includes('VIDEO_PLAN_ACTIONS_SCRIPT'), 'Dedicated page loads independent Video Plan actions');
assert.ok(videoPage.includes('AICS_VIDEO_PLAN_ACTIONS.init()'), 'Dedicated page initializes actions after IndexedDB state is ready');
assert.ok(videoPage.includes('AICS_VIDEO_PLAN_STATE.init(session)'), 'Story projection initializes the Video Plan state');
assert.ok(videoPage.includes('storyVideoLoadStatus'), 'Source loading status is shown');
assert.ok(videoState.includes("studio:'STORY_VIDEO_PLAN'"), 'Video Plan uses an independent IndexedDB session');
assert.ok(videoState.includes('sourceStorySnapshot:state.sourceStory'), 'Video Plan preserves a source Story snapshot');
assert.ok(videoState.includes('legacyVideoPlan'), 'Video Plan migrates legacy settings and results');
assert.ok(videoState.includes("type:'video_image'"), 'Legacy Story images are copied into the Video Plan session');
assert.ok(videoSession.includes('legacyVideoPlan:'), 'Read-only bridge exposes legacy data without writing to Story');
assert.ok(videoActions.includes("'/api/studio/story/video'"), 'Video Plan actions call the existing generation endpoint');
assert.ok(videoActions.includes("'/api/studio/story/video-image'"), 'Video Plan actions call the existing image endpoint');
assert.ok(videoActions.includes("type:'video_image'"), 'Generated images are saved under the Video Plan session');
assert.ok(videoActions.includes('function savePlan()'), 'Video Plan has an independent IndexedDB save action');
assert.ok(videoActions.includes('if(state().characters.length||state().scenes.length)'), 'Saved Video Plan results reopen on the result step');
assert.ok(videoActions.includes('story===s.sourceStory'), 'Edited Video Plan story does not reuse stale Story facts');
assert.ok(videoActions.includes('function exportResult()'), 'Video Plan has a text export action');
assert.ok(videoActions.includes('window.generateVideoPlan=generateVideoPlan'), 'Video Plan generate action is exposed to the UI');
assert.ok(storyPage.includes('CONTENT_HTML'), 'Story page still composes its own UI');
assert.ok(!/function\s+(generateVideoPlan|renderFinalResult|generateCharImage|generateEnvImage|copyCharPrompt)\s*\(/.test(storyActions), 'Story actions no longer own Video Plan operations');
assert.ok(storyActions.includes('videoForm:'), 'Legacy Video Plan settings remain readable for migration');
assert.ok(storyActions.includes('function studioCollectLegacyVideoForm()'), 'Story retains legacy settings even though Video Plan controls are no longer rendered');
assert.ok(storyActions.includes('legacyVideoForm=Object.assign({},d.videoForm||{})'), 'Restored legacy settings are retained without overwriting them with empty Story controls');
assert.ok(storyActions.includes('characters:currentCharacters'), 'Legacy character data remains readable for migration');
assert.ok(storyActions.includes("ST_MODE='main'"), 'Legacy Story drafts restore into the Story-only stepper');
assert.ok(!storyActions.includes('function fillVideoStoryField()'), 'Story actions do not bind Video Plan form fields');

const handoffStart = storyActions.indexOf('function goToVideoForm(){');
const handoffEnd = storyActions.indexOf('function copyStory()', handoffStart);
assert.ok(handoffStart >= 0 && handoffEnd > handoffStart, 'Story handoff action remains available');
const handoff = storyActions.slice(handoffStart, handoffEnd);
assert.ok(handoff.indexOf('autoSave()') < handoff.indexOf("window.location.assign('/app/story-video-plan?session='"), 'Story is saved before navigation');
assert.ok(handoff.includes('encodeURIComponent(session.id)'), 'Only the Story Session ID is passed in the URL');
assert.ok(loaders.includes("'story-video-plan': () => import('./studios/story/video-plan/page.js')"), 'Dedicated page is registered');
assert.ok(worker.includes("studioSlug === 'story-video-plan' ? 'story' : studioSlug"), 'Video Plan uses Story Studio enablement');

console.log('Story / Video Plan UI separation tests passed.');
