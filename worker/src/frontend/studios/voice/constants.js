// AI Creative Studio — Voice Studio / constants.js (V2 refactor)
// Browser-side constants — extracted VERBATIM from frontend/voice.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const CONSTANTS_SCRIPT = `
// ==== Voice Studio Browser-side Constants / Helpers ====
// (Module scope တွင်မထားဘဲ ဤ page script ထဲတွင် သတ်မှတ်သည် —
//  Browser page တွင် ဤ Variables/Functions ရှိမှသာ Branch Workflow UI render နိုင်သည်)
const VOICES = [
  ['Zephyr','တောက်ပ (Bright)'],['Puck','တက်ကြွ (Upbeat)'],['Charon','ရှင်းလင်းတိကျ (Informative)'],
  ['Kore','ခိုင်မာတည်ငြိမ် (Firm)'],['Fenrir','စိတ်လှုပ်ရှားလွယ် (Excitable)'],['Leda','လူငယ်ဆန် (Youthful)'],
  ['Orus','ခိုင်မာ (Firm)'],['Aoede','ပေါ့ပါးလန်းဆန်း (Breezy)'],['Callirrhoe','အေးဆေး (Easy-going)'],
  ['Autonoe','တောက်ပ (Bright)'],['Enceladus','အသက်ရှူသံပါ (Breathy)'],['Iapetus','ရှင်းလင်း (Clear)'],
  ['Umbriel','အေးဆေး (Easy-going)'],['Algieba','ချောမွေ့ (Smooth)'],['Despina','ချောမွေ့ (Smooth)'],
  ['Erinome','ရှင်းလင်း (Clear)'],['Algenib','ရိုင်းရင့် (Gravelly)'],['Rasalgethi','ရှင်းလင်းတိကျ (Informative)'],
  ['Laomedeia','တက်ကြွ (Upbeat)'],['Achernar','နူးညံ့ (Soft)'],['Alnilam','ခိုင်မာ (Firm)'],
  ['Schedar','တညီတညာ (Even)'],['Gacrux','ရင့်ကျက် (Mature)'],['Pulcherrima','တိုက်ရိုက် (Forward)'],
  ['Achird','ဖော်ရွေ (Friendly)'],['Zubenelgenubi','ပေါ့ပေါ့ပါးပါး (Casual)'],
  ['Vindemiatrix','နူးညံ့သိမ်မွေ့ (Gentle)'],['Sadachbia','တက်ကြွရှင်သန် (Lively)'],
  ['Sadaltager','ဗဟုသုတရှိ (Knowledgeable)'],['Sulafat','နွေးထွေး (Warm)']
];
// V2.1 Unified Workflow — Stepper ၄ ဆင့်တည်း (mode မည်သည်ဖြစ်စေ)
// Input → Format → Generate → Result Hub  (SRT / ဘာသာပြန် ဆက်လုပ်ခြင်းကို Result Hub ထဲတွင်သာ ပြသည်)
const VOICE_STEPS = [
  {n:1,label:'Input'},{n:2,label:'Format'},{n:3,label:'Generate'},{n:4,label:'Result'}
];
// Mode chips (စာမျက်နှာတစ်ခုတည်း)
const VOICE_MODES = [
  {id:'text-to-voice',icon:'📝',label:'စာ → အသံ'},
  {id:'media-to-text',icon:'🎧',label:'အသံ → စာ'},
  {id:'translate',icon:'🌐',label:'ဘာသာပြန်',pro:true}
];
function esc(s) {
  const value = s == null ? '' : String(s);
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}
function voiceOptions() {
  return VOICES.map(v => '<option value="' + esc(v[0]) + '"' + (v[0] === 'Kore' ? ' selected' : '') + '>' +
    esc(v[0] + ' — ' + v[1]) + '</option>').join('');
}
`;
