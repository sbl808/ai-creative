import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIdeasOutput, parseIdeaRevisionOutput, validateIdeaRevision, validateIdeasBrief } from '../worker/src/core/ideas.js';

const brief = {
  idea: 'A local education channel',
  audience: 'Young adults',
  goal: 'Teach a useful skill',
  language: 'Burmese',
  platform: 'TikTok',
  contentType: 'Educational short video',
  count: 3,
};
assert.deepEqual(validateIdeasBrief(brief), { ok: true, category: 'story' });
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
const fence = String.fromCharCode(96).repeat(3);
assert.equal(parseIdeasOutput(JSON.stringify({ ideas })).length, 3);
assert.equal(parseIdeasOutput(fence + 'json\n' + JSON.stringify({ ideas }) + '\n' + fence).length, 3);
assert.throws(() => parseIdeasOutput('not json'), /invalid_ai_output/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.slice(0, 2) })), /invalid_ideas_count/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, suggestedStudio: 'unknown' })) })), /invalid_suggested_studio/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, suggestedStudio: 'voice' })) })), /invalid_suggested_studio/);
const revisionBody = { category: 'story', idea: { ...ideas[0] }, instruction: 'Improve the idea' };
assert.equal(validateIdeaRevision(revisionBody).ok, true);
assert.equal(validateIdeaRevision({ ...revisionBody, idea: { ...ideas[0], suggestedStudio: 'voice' } }).error, 'invalid_suggested_studio');
assert.throws(() => parseIdeaRevisionOutput(JSON.stringify({ idea: { ...ideas[0], suggestedStudio: 'voice' } })), /invalid_suggested_studio/);
assert.throws(() => parseIdeasOutput(JSON.stringify({ ideas: ideas.map((x) => ({ ...x, title: '' })) })), /invalid_idea/);

const ideaUi = readFileSync(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8');
const voiceActions = readFileSync(new URL('../worker/src/frontend/studios/voice/actions.js', import.meta.url), 'utf8');
for (const studio of ['story', 'content', 'short', 'image', 'shop']) {
  assert.ok(ideaUi.includes("id:'" + studio + "'"), 'missing handoff target: ' + studio);
}
assert.match(ideaUi, /if\(\(existing&&existing\.data\)\|\|hasLegacy\)\{/, 'handoff must detect an existing IndexedDB or legacy draft');
assert.match(ideaUi, /if\(!confirm\(/, 'handoff must ask before replacing an existing draft');
assert.match(ideaUi, /Cancel လုပ်လျှင် မူလ Draft ကို မပြောင်းပါ/, 'handoff cancellation must preserve the existing draft');
assert.match(ideaUi, /return false;/, 'handoff cancellation must stop the replacement');
assert.match(
  ideaUi,
  /AICS_HANDOFFS\.create\(\{contractVersion:1,source:'ideas',target:'story',payload:fullPayload\}\)/,
  'Story handoff must send the complete Idea Result through the IndexedDB handoff contract'
);
assert.match(ideaUi, /aics_draft_content/, 'Content handoff draft key missing');
assert.match(ideaUi, /aics_draft_short/, 'Short handoff draft key missing');
assert.match(ideaUi, /aics_draft_image/, 'Image handoff draft key missing');
assert.match(ideaUi, /aics_draft_shop/, 'Shop handoff draft key missing');
assert.doesNotMatch(ideaUi, /id:'voice'/, 'Voice must not be an Ideas handoff target');
const editorStudioSelect = ideaUi.match(/<select id="editStudio">([\s\S]*?)<\/select>/);
assert.ok(editorStudioSelect, 'Idea editor Studio selector must exist');
assert.doesNotMatch(editorStudioSelect[1], /<option[^>]*>voice<\/option>/i, 'Voice must not be selectable in the Idea editor');
assert.match(editorStudioSelect[1], /option value="" disabled/, 'Legacy unsupported Studio values must require an explicit valid selection');
assert.match(ideaUi, /ALLOWED_SUGGESTED_STUDIOS=\['story','content','short','image','shop'\]/, 'Idea editor must allow only independent Ideas destinations');
assert.match(ideaUi, /isAllowedSuggestedStudio\(result\.suggestedStudio\)\?result\.suggestedStudio:''/, 'Legacy Voice suggestions must not be silently converted');
assert.match(ideaUi, /if\(!isAllowedSuggestedStudio\(el\('editStudio'\)\.value\)\)/, 'AI revision must require an allowed Studio selection');
assert.match(ideaUi, /if\(!isAllowedSuggestedStudio\(result\.suggestedStudio\)\)/, 'Manual save must reject unsupported Studio values');
assert.match(ideaUi, /if\(!isAllowedSuggestedStudio\(pendingRevision\.suggestedStudio\)\)/, 'Revision apply must reject unsupported Studio values');
assert.doesNotMatch(ideaUi, /aics_voice_transfer.*source:'ideas'/s, 'Ideas must not create a Voice transfer');

const ignoredIdeasTransfer = voiceActions.match(/function applyContentTransfer\(\)\{([\s\S]*?)\n\}/);
assert.ok(ignoredIdeasTransfer, 'Voice transfer consumer must exist for Content/Shop');
assert.match(ignoredIdeasTransfer[1], /if\(d\.source==='ideas'\)return;/, 'Voice must ignore Ideas-originated legacy transfer');
assert.match(ignoredIdeasTransfer[1], /localStorage\.removeItem\('aics_voice_transfer'\)/, 'Voice must still consume unrelated Content/Shop transfers');
const resetBlock = voiceActions.match(/function voiceReset\(\)\{([\s\S]*?)\n\}/);
assert.ok(resetBlock, 'Voice reset handler must exist');
assert.doesNotMatch(resetBlock[1], /aics_voice_transfer/, 'Voice reset must preserve legacy transfer data');

console.log('Idea Workspace contract tests passed.');
