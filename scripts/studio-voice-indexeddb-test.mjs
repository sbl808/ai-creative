import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STATE_SCRIPT } from '../worker/src/frontend/studios/voice/state.js';
import { HELPERS_SCRIPT } from '../worker/src/frontend/studios/voice/helpers.js';
import { ACTIONS_SCRIPT } from '../worker/src/frontend/studios/voice/actions.js';

let saved = null;
let stored = null;
let imported = null;
const storageApi = {
  load: async () => stored,
  save: async (studio, envelope) => {
    assert.equal(studio, 'voice');
    saved = envelope;
    return true;
  },
  importLegacy: async (studio, envelope) => {
    assert.equal(studio, 'voice');
    imported = envelope;
    return { imported: true };
  }
};
const context = {
  window: { AICS_STUDIO_DRAFTS: storageApi },
  localStorage: {
    getItem: () => null,
    setItem: () => { throw new Error('Voice draft must not write to localStorage'); }
  },
  Date,
  Promise,
  String,
  Number,
  Object,
  Array,
  Math,
  isFinite,
  setTimeout,
  clearTimeout
};
context.window.window = context.window;
vm.runInNewContext(STATE_SCRIPT + HELPERS_SCRIPT, context, { filename: 'voice-draft-scripts.js' });

const data = {
  state: { voiceMode: 'media-to-text', voiceStep: 2, view: 'format', audioResult: { data: 'BAUG', mimeType: 'audio/mpeg' } },
  inputs: { tts: 'hello', speaking: '', voice: 'Kore', instruction: '', audience: 'လူတိုင်း', srt: '' },
  mediaAudio: { base64: 'AQID', mime: 'audio/wav', fileName: 'sample.wav' },
  translation: 'translated subtitle'
};
assert.equal(context.voiceApplyDraftData(data), true);
assert.equal(context.MEDIA_AUDIO.base64, 'AQID');
assert.equal(context.MEDIA_AUDIO.fileName, 'sample.wav');
assert.equal(context.LAST_AUDIO.base64, 'BAUG');
assert.equal(context.translatedSrt, 'translated subtitle');

assert.equal(await context.saveDraft(), true);
assert.equal(saved.step, 2);
assert.equal(saved.data.mediaAudio.base64, 'AQID');
assert.equal(saved.data.translation, 'translated subtitle');
assert.equal('lastAudio' in saved.data, false, 'generated audio is stored once inside voiceState');

stored = { data: { data } };
assert.equal(await context.restoreDraft(), true);
assert.equal(context.MEDIA_AUDIO.mime, 'audio/wav');

stored = null;
const legacyData = {
  state: { voiceMode: 'text-to-voice', voiceStep: 1, view: 'input' },
  inputs: { tts: 'legacy voice text' },
  mediaFileName: 'legacy.wav',
  translation: ''
};
context.localStorage.getItem = () => JSON.stringify(legacyData);
assert.equal(await context.restoreDraft(), true);
assert.equal(imported.data.state.voiceMode, 'text-to-voice');
assert.equal(context.VOICE_INPUTS.tts, 'legacy voice text');
assert.equal(context.MEDIA_AUDIO.base64, '', 'legacy v3 did not persist the original media bytes');
assert.equal(context.LAST_AUDIO.base64, '', 'restore clears stale audio when the legacy draft has no result');

assert.match(HELPERS_SCRIPT, /AICS_STUDIO_DRAFTS\.save\('voice'/);
assert.match(HELPERS_SCRIPT, /AICS_STUDIO_DRAFTS\.load\('voice'/);
assert.match(HELPERS_SCRIPT, /importLegacy\('voice'/);
assert.doesNotMatch(HELPERS_SCRIPT, /localStorage\.setItem\(voiceDraftKey/);
assert.match(ACTIONS_SCRIPT, /scheduleVoiceDraftSave\(\)/);
assert.match(ACTIONS_SCRIPT, /AICS_STUDIO_DRAFTS\.remove\('voice'/);
assert.match(ACTIONS_SCRIPT, /restoreDraft\(\)\.then/);
console.log('Voice Studio IndexedDB draft tests passed.');
