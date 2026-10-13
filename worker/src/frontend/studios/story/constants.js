// AI Creative Studio — Story Studio / constants.js (V2 refactor)
// Browser-side constants — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const CONSTANTS_SCRIPT = `var STORY_TYPES=[
  {v:'1',label:'ဇာတ်လမ်း',pro:false},
  {v:'2',label:'ရုပ်ရှင်',pro:true},
  {v:'3',label:'ဇာတ်လမ်းတွဲ',pro:true},
  {v:'4',label:'ဇာတ်လမ်းတို',pro:true},
  {v:'5',label:'ဟာသဇာတ်လမ်း',pro:true}
];
// Video Workflow — "Video ကို ဘယ်လိုတည်ဆောက်မလဲ" (Story Type / Visual Style နှင့် သီးခြား)
var VIDEO_WORKFLOWS=[
  {v:'CINEMATIC_FEATURE',label:'Cinematic Feature'},
  {v:'CHARACTER_FOCUS',label:'Character Focus'},
  {v:'DOCUMENTARY',label:'Documentary'},
  {v:'EPISODIC_SERIES',label:'Episodic Series'},
  {v:'NON_LINEAR_THRILLER',label:'Non-Linear Thriller'}
];
// Advanced Settings fields (field_0 = ဇာတ်လမ်းအကြောင်းအရာ — Essential, Required)
// အောက်ပါတို့သည် Optional ဖြစ်ပြီး Advanced Accordion အတွင်းတွင် ပြသည်
var FIELD_CONFIG=[
  {label:'ဇာတ်လမ်းအကြောင်းအရာ (Story Content)',placeholder:'ဥပမာ — ဘာအကြောင်းရေးချင်ပါသလဲ?',required:true,multiline:true},
  {label:'အဓိကဇာတ်ကောင် (Main Character)',placeholder:'ဥပမာ — မောင်မင်း'},
  {label:'ဇာတ်ကောင်အသေးစိတ် (Character Details)',placeholder:'ဥပမာ — ၂၅ နှစ် / ဆော့ဖ်ဝဲ အင်ဂျင်နီယာ / ရဲရင့်သော စိတ်ထား'},
  {label:'အဓိကပြဿနာ (Main Conflict)',placeholder:'ဥပမာ — ဇာတ်ကောင် ဘာအခက်အခဲကရမလဲ?'},
  {label:'ဇာတ်ကောင်ရည်မှန်းချက် (Character Goal)',placeholder:'ဥပမာ — ကိုယ်ပိုင်လုပ်ငန်း ထူထောင်ချင်သည်'},
  {label:'နေရာ / ပတ်ဝန်းကျင် (Setting / Environment)',placeholder:'ဥပမာ — မြန်မာကျေးရွာ / ရန်ကုန်မြို့'},
  {label:'အချိန်ကာလ (Time Period)',placeholder:'ဥပမာ — ၂၀၂၀ / ရှေးခေတ် / အနာဂတ်'},
  {label:'ခံစားချက် (Mood / Emotion)',placeholder:'ဥပမာ — ဝမ်းနည်း / လှုပ်ရှား / ကြောက်စရာ'},
  {label:'ဇာတ်လမ်းအရှည် (Story Length)',placeholder:'ဥပမာ — မိနစ် ၃၀ / နာရီဝက်'},
  {label:'နိဂုံးပုံစံ (Ending)',placeholder:'ဥပမာ — ပျော်ရွှင်စရာ အဆုံးသတ် / လှည့်ကွက်နဲ့ အဆုံးသတ်'},
  {label:'အပိုဆောင်းညွှန်ကြားချက် (Additional Instructions)',placeholder:'ဥပမာ — ဇာတ်လမ်းထဲမှာ မြန်မာ့ယဉ်ကျေးမှု အသေးစိတ်များ ထည့်ပေးပါ',multiline:true}
];
var DURATIONS=['15 sec','30 sec','45 sec','60 sec','90 sec','120 sec'];
var SCENE_DURATIONS=['5 sec','8 sec','10 sec','12 sec','15 sec'];
var RATIOS=['16:9','9:16','1:1','4:3','21:9'];
var VISUAL_STYLES=['Realism','Anime','3D Animation','2D Illustration','Documentary','Film Noir','Fantasy'];
var CAMERA_STYLES=['Feature Film','Documentary','Drone Shot','Handheld','Static Shot','Slow Motion','Tracking Shot','Aerial'];
var LANGUAGES=['မြန်မာ','English','မြန်မာ + English'];

`;
