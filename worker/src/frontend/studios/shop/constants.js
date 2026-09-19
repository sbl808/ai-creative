// AI Creative Studio — Shop Studio / constants.js (V2 refactor)
// Browser-side constants — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const CONSTANTS_SCRIPT = `// Content Purpose — Product/Commerce အတွက် (Advertisement သည် Branch မဟုတ်ဘဲ Content Purpose ဖြစ်သည်)
var CONTENT_PURPOSES=[
  {val:'1',label:'📦 Product Description (Free)'},
  {val:'2',label:'💰 Sales Copy (Pro)',pro:true},
  {val:'3',label:'📱 Social Media (Pro)',pro:true},
  {val:'4',label:'📢 Advertisement (Pro)',pro:true},
  {val:'5',label:'🎉 Promotional Content (Pro)',pro:true}
];
var VIDEO_TYPES=[
  {val:'1',label:'🎬 Product Video (Free)'},
  {val:'2',label:'🎬 Scene Planning (Pro)',pro:true},
  {val:'3',label:'🎬 Product Showcase (Pro)',pro:true},
  {val:'4',label:'🎬 Customer Targeting (Pro)',pro:true},
  {val:'5',label:'🎬 Brand Story (Pro)',pro:true}
];

// ===== Voice Data (Content Studio နည်းစနစ်အတိုင်း — Gender → Voice Selection) =====
var MALE_VOICES=[
  {name:'Puck',desc:'တက်ကြွဆန်းသစ်သော အသံ (Upbeat)'},
  {name:'Charon',desc:'တည်ငြိမ်ပြီး လုပ်ငန်းသုံး အသံ (Informative / Calm)'},
  {name:'Fenrir',desc:'စိတ်လှုပ်ရှားဖွယ် တက်ကြွသော အသံ (Excitable / Energetic)'},
  {name:'Orus',desc:'တည်ငြိမ်ပြီး ခိုင်မာသော အသံ (Firm / Calm)'},
  {name:'Enceladus',desc:'ငြင်သာပြီး သက်ပြင်းသံပါသော အသံ (Breathy / Soft)'},
  {name:'Iapetus',desc:'သလင်းပြင်ကဲ့သို့ ကြည်လင်သော အသံ (Clear)'},
  {name:'Umbriel',desc:'ပေါ့ပေါ့ပါးပါး ဖော်ရွေသော အသံ (Easy-going / Relaxed)'},
  {name:'Algieba',desc:'ချောမွေ့ပြေပြစ်သော အသံ (Smooth)'},
  {name:'Algenib',desc:'သြဇာပါပြီး အနည်းငယ် ရှာရှာအသံ (Gravelly / Textured)'},
  {name:'Rasalgethi',desc:'စာဖတ်ပြသူ/သတင်းဖတ်သူ အသံပုံစံ (Informative / Narrator)'},
  {name:'Alnilam',desc:'ယုံကြည်မှုရှိပြီး ခိုင်မာသော အသံ (Firm / Confident)'},
  {name:'Schedar',desc:'ညီညာတပြ ပုံမှန်အသံ (Even / Steady)'},
  {name:'Pulcherrima',desc:'တက်ကြွပြီး ရှေ့သို့ တက်လှမ်းလိုဟန် အသံ (Forward / Enterprising)'},
  {name:'Achird',desc:'ဖော်ရွေပြီး ကြင်နာသော အသံ (Friendly / Kind)'},
  {name:'Zubenelgenubi',desc:'ပေါ့ပေါ့ပါးပါး ပြောဆိုသည့် အသံ (Casual / Resonant)'},
  {name:'Sadachbia',desc:'သက်ဝင်လှုပ်ရှားသော အသံ (Lively)'},
  {name:'Sadaltager',desc:'ဗဟုသုတပြည့်ဝသော ပညာရှင်အသံ (Knowledgeable)'},
];
var FEMALE_VOICES=[
  {name:'Zephyr',desc:'တောက်ပပြီး ကြည်လင်သော အသံ (Bright / Clear)'},
  {name:'Kore',desc:'ခိုင်မာပြီး စိတ်ချရသော အသံ (Firm / Strong)'},
  {name:'Leda',desc:'လူငယ်ဆန်ပြီး တက်ကြွသော အသံ (Youthful / Energetic)'},
  {name:'Aoede',desc:'အေးဆေးတည်ငြိမ်ပြီး သဘာဝကျသော အသံ (Breezy / Natural)'},
  {name:'Callirrhoe',desc:'ဖော်ရွေပြီး သဘောကောင်းသော အသံ (Easy-going / Friendly)'},
  {name:'Autonoe',desc:'ရွှင်လန်းတောက်ပသော အသံ (Bright / Cheerful)'},
  {name:'Despina',desc:'ငြင်သာပြီး ချောမွေ့သော အသံ (Smooth / Gentle)'},
  {name:'Erinome',desc:'ပီပြင်ပြတ်သားသော အသံ (Clear / Articulate)'},
  {name:'Laomedeia',desc:'အပြုသဘောဆောင်ပြီး တက်ကြွသော အသံ (Upbeat / Positive)'},
  {name:'Achernar',desc:'ငြင်သာပြီး နွေးထွေးသော အသံ (Soft / Warm)'},
  {name:'Gacrux',desc:'ရင့်ကျက်ပြီး တည်ငြိမ်သော အသံ (Mature / Steady)'},
  {name:'Vindemiatrix',desc:'သိမ်မွေ့ပြီး အေးဆေးသော အသံ (Gentle / Delicate)'},
  {name:'Sulafat',desc:'နွေးထွေးပြီး အနီးကပ်ခံစားရသော အသံ (Warm / Approachable)'},
];

`;
