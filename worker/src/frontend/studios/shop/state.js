// AI Creative Studio — Shop Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
import { STEPS } from './ui.js';
export const STATE_SCRIPT = `
var TOKEN=localStorage.getItem('aics_token')||'';
var USER_PLAN='FREE';
var contentType='1';   // Content Purpose (1=Product Description ... 5=Promotional Content)
var videoType='1';
var refImagesContent=[];
var refImagesVideo=[];
var refImagesImage=[];
var lastAudioBase64='';
var shopBusy=false;
var twTimer=null;
var twRunning=false;
var statusTimers={};
var audioDuration='';
var saveTimer=null;
var effectiveVoiceName='Puck'; // Gender → Voice (Content Studio နည်းစနစ်အတိုင်း)

// ===================== SHOP MAIN STEPS (Main + Branch Combined Stepper အတွက်) =====================
// Module-level STEPS (shell) နှင့် တူညီသော data — page script ထဲတွင် သုံးနိုင်ရန် ဤနေရာတွင် ထည့်သည်
var SHOP_MAIN_STEPS=${JSON.stringify(STEPS.map(function(s){return {label:s.label,lock:!!s.lock,loading:s.loading||''};}))};

// ===================== SHOP STATE (Branch အလိုက် သီးခြား — Isolation) =====================
// shopContent သည် source/root data ဖြစ်သည်။
// Video Branch ပြင်ခြင်းက Audio/Image ကို မထိခိုက်၊ Audio Branch ပြင်ခြင်းက Video/Image ကို မထိခိုက်၊
// Image Branch ပြင်ခြင်းက Video/Audio ကို မထိခိုက်ရပါ။ (videoState / audioState / imageState — independent)
var shopState={
  mainStep:1,
  view:'content', // 'content' | 'video' | 'audio' | 'image'
  content:{
    input:{idea:'',type:'1',images:[]},
    result:'' // နောက်ဆုံး edited content — latest source
  },
  video:{
    step:1, // 1=setup 2=result
    input:{text:'',type:'1',images:[],purpose:'Product Promotion'},
    result:{product:null,characters:[],scenes:[]}
  },
  audio:{
    step:1, // 1=setup 2=result 3=srt 4=trans
    input:{text:'',voiceName:'Puck',voiceGender:'male',purpose:'Product Description'},
    result:{data:'',mimeType:'audio/wav',url:'',voiceName:''},
    srt:{text:''},
    translation:{dir:'MY_TO_CN',srt:'',text:''}
  },
  image:{
    step:1, // 1=setup 2=result
    input:{text:'',images:[],purpose:'Product Image'},
    result:{data:'',mimeType:'image/png',url:'',prompt:''}
  }
};

`;
