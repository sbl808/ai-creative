// AI Creative Studio — Subtitle Studio / state.js
// Browser memory only. Do not persist media or generated user content in the Worker.
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

var SUBTITLE_MEDIA = { file: null, fileName: '', mimeType: '', duration: null };
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
