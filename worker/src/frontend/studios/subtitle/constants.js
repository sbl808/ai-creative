// AI Creative Studio — Subtitle Studio / constants.js
// Subtitle modes are presentation metadata only; API behavior is added in a later task.
export const CONSTANTS_SCRIPT = String.raw`
var SUBTITLE_MODES = [
  {
    id: 'transcribe',
    icon: '📝',
    label: 'အသံမှ စာသား',
    title: 'Audio Transcription',
    description: 'အသံဖိုင်ထဲက ပြောထားတဲ့ စကားတွေကို စာသားအဖြစ် ပြောင်းရန်။'
  },
  {
    id: 'srt',
    icon: '⏱️',
    label: 'SRT ဖန်တီးရန်',
    title: 'SRT Creation',
    description: 'အသံဖိုင်မှ အချိန်အမှတ်အသားပါသော Subtitle ဖိုင် ဖန်တီးရန်။'
  },
  {
    id: 'translate',
    icon: '🌐',
    label: 'SRT ဘာသာပြန်ရန်',
    title: 'SRT Translation',
    description: 'ရှိပြီးသား SRT စာသားကို ရွေးချယ်ထားသော ဘာသာသို့ ပြန်ဆိုရန်။'
  }
];
`;
