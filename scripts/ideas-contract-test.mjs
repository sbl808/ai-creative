import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIdeasOutput, validateIdeasBrief } from '../worker/src/core/ideas.js';

const brief = {
  idea: 'A local education channel',
  audience: 'Young adults',
  goal: 'Teach a useful skill',
  language: 'Burmese',
  platform: 'TikTok',
  contentType: 'Educational short video',
  count: 3,
};
assert.deepEqual(validateIdeasBrief(brief), { ok: true });
assert.equal(validateIdeasBrief({ ...brief, count: 2 }).error, 'count_must_be_3');
assert.equal(validateIdeasBrief({ ...brief, idea: '' }).error, 'missing_idea');
assert.equal(validateIdeasBrief(null).error, 'invalid_request');
assert.equal(validateIdeasBrief({ ...brief, idea: 'x'.repeat(2001) }).error, 'field_too_long');

const ideas = [1, 2, 3].map((n) => ({
  title: 'Idea ' + n,
  concept: 'Concept ' + n,
  hook: 'Hook ' + n,
  outline: 'Outline ' + n,
  suggestedStudio: 'story',
}));
assert.equal(parseIdeasOutput(JSON.stringify({ ideas })).length, 3);
assert.equal(parseIdeasOutput('```json\n' + JSON.stringify({ ideas }) + '\n```').length, 3);
assert.throws(() => parseIdeasOutput('not json'), /invalid_ai_output/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.slice(0, 2) })), /invalid_ideas_count/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, suggestedStudio: 'unknown' })) })), /invalid_suggested_studio/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, title: '' })) })), /invalid_idea/);


const ideaUi = readFileSync(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8');
const voiceActions = readFileSync(new URL('../worker/src/frontend/studios/voice/actions.js', import.meta.url), 'utf8');
for (const studio of ['story', 'content', 'short', 'image', 'voice', 'shop']) {
  assert.ok(ideaUi.includes("id:'" + studio + "'"), 'missing handoff target: ' + studio);
}
assert.match(ideaUi, /targetHasDraft\(studio\)&&!confirm\(/, 'handoff must confirm before replacing an existing draft');
assert.match(ideaUi, /aics_draft_story/, 'Story handoff draft key missing');
assert.match(ideaUi, /aics_draft_content/, 'Content handoff draft key missing');
assert.match(ideaUi, /aics_draft_short/, 'Short handoff draft key missing');
assert.match(ideaUi, /aics_draft_image/, 'Image handoff draft key missing');
assert.match(ideaUi, /aics_draft_shop/, 'Shop handoff draft key missing');
assert.match(ideaUi, /aics_voice_transfer.*source:'ideas'/s, 'Voice handoff must use the Voice transfer contract');
assert.match(voiceActions, /d\.source==='ideas'[\s\S]*?VOICE_INPUTS=\{tts:d\.text/, 'Voice Idea handoff must initialize Text-to-Voice inputs');
assert.match(voiceActions, /d\.source==='ideas'[\s\S]*?MEDIA_AUDIO=\{base64:'',mime:'',fileName:''\}/, 'Voice Idea handoff must clear stale uploaded audio');

console.log('Idea Workspace contract tests passed.');
