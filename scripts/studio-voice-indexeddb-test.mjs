import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STATE_SCRIPT } from '../worker/src/frontend/studios/voice/state.js';
import { HELPERS_SCRIPT } from '../worker/src/frontend/studios/voice/helpers.js';

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
  state: { voiceMode: 'media-to-text', voiceStep: 2, view: 'format', audioResult: null },
  inputs: { tts: 'hello', speaking: '', voice: 'Kore', instruction: '', audience: 'လူတိုင်း', srt: '' },
  mediaAudio: { base64: 'AQID', mime: 'audio/wav', fileName: 'sample.wav' },
  lastAudio: { base64: 'BAUG', mime: 'audio/mpeg' },
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
assert.equal(saved.data.lastAudio.base64, 'BAUG');
assert.equal(saved.data.translation, 'translated subtitle');

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

console.log('Voice Studio IndexedDB draft tests passed.');
