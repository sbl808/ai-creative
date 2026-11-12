// AI Creative Studio — Subtitle Studio / state.js
// Browser-side state only. User-generated content must remain in browser memory / IndexedDB.
// This module does not read or write localStorage, call APIs, or persist user content.

export const STATE_SCRIPT = `
var SUBTITLE_STATE = {
  mode: 'media-to-srt',
  step: 1,
  view: 'input',
  mediaInput: null,
  sourceSrt: '',
  editedSrt: '',
  translatedSrt: '',
  translationDirection: 'MY_TO_CN',
  processingState: 'idle',
  errorState: null,
  resultKind: null
};

var SUBTITLE_INPUTS = {
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN',
  srtText: '',
  translationDirection: 'MY_TO_CN'
};

var SUBTITLE_MEDIA = {
  file: null,
  fileName: '',
  mimeType: '',
  duration: null
};

var SUBTITLE_REQUEST_ID = 0;

function newSubtitleState(mode) {
  return {
    mode: mode || 'media-to-srt',
    step: 1,
    view: 'input',
    mediaInput: null,
    sourceSrt: '',
    editedSrt: '',
    translatedSrt: '',
    translationDirection: 'MY_TO_CN',
    processingState: 'idle',
    errorState: null,
    resultKind: null
  };
}
`;
