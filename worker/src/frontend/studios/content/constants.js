// AI Creative Studio — Content Studio / constants.js (V2 refactor)
// Browser-side constants — extracted VERBATIM from frontend/content.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const CONSTANTS_SCRIPT = `// ===== Branch Stepper State Machine (Content.js တွင်သာ — shared.js မပြောင်းပါ) =====
// Main Stepper နှင့် Branch Stepper ကို State အရ သီးခြားထိန်းချုပ်သည် (Section 12)
var CS_MODE = 'main'; // 'main' | 'video' | 'audio'
var csCur = 1;
var csDone = {};
var CS_STEPS = {
  main:  [
    { n: 1,  label: '01 အကြောင်းအရာ' },
    { n: 2,  label: '02 Content ရလဒ်', req: [1] }
  ],
  video: [
    { n: 12, label: '01 Video ပြင်ဆင်ရန်', req: [2] },
    { n: 14, label: '02 Video ရလဒ်', req: [12] }
  ],
  audio: [
    { n: 22, label: '01 Audio ပြင်ဆင်ရန်', req: [2] },
    { n: 24, label: '02 Audio ရလဒ်', req: [22] }
  ]
};

var QUICK_ACTIONS=[
  {label:'&#128260; Rewrite',kind:'rewrite'},
  {label:'&#128259; Shorten',kind:'shorten'},
  {label:'&#128240; Expand',kind:'expand'},
  {label:'&#11088; Improve',kind:'improve'},
  {label:'&#127912; Change Tone',kind:'tone'}
];
var QUICK_PROMPTS={
  rewrite:'ပြန်ရေးပါ (Rewrite) — အဓိကအကြောင်းအရာကို ထိန်းထားပြီး ပုံစံအသစ်နဲ့ လုံးဝပြန်ရေးပါ',
  shorten:'ပိုတိုအောင် အတိုချုံးပါ (Shorten) — အဓိကအချက်များကိုသာ ထားပါ',
  expand:'ပိုရှည်အောင် ချဲ့ပါ (Expand) — အသေးစိတ် ဥပမာများ ထည့်ပြီး ချဲ့ပါ',
  improve:'ပိုကောင်းအောင် ပြင်ပါ (Improve) — စာဖတ်ရလွယ်ကူ၊ ဆွဲဆောင်မှုရှိအောင် ပြင်ပါ',
  tone:'အသံသေချာပြောင်းပါ'
};

`;
