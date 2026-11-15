// AI Creative Studio — Subtitle Studio / constants.js
// Browser-side workflow constants. No API calls or persistence are performed here.

export const CONSTANTS_SCRIPT = `
var SUBTITLE_MODES = [
  { id: 'media-to-srt', icon: '🎧', label: 'အသံ/ဗီဒီယိုမှ စာတန်းထိုး' },
  { id: 'edit-srt', icon: '📝', label: 'SRT တည်းဖြတ်ရန်' },
  { id: 'translate-srt', icon: '🌐', label: 'စာတန်းထိုး ဘာသာပြန်ရန်' }
];

var SUBTITLE_STEPS = [
  { n: 1, label: 'Input' },
  { n: 2, label: 'Edit' },
  { n: 3, label: 'Translate' },
  { n: 4, label: 'Result' }
];

var SUBTITLE_DEFAULTS = {
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN',
  translationDirection: 'MY_TO_CN',
  outputFormat: 'srt'
};

var SUBTITLE_LANGUAGES = [
  { id: 'my', label: 'မြန်မာ' },
  { id: 'zh-CN', label: 'တရုတ် (ရိုးရှင်း)' }
];
`;
