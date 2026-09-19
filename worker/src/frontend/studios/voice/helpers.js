// AI Creative Studio — Voice Studio / helpers.js (V2 refactor)
// Browser-side helpers — extracted VERBATIM from frontend/voice.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const HELPERS_SCRIPT = `function toast(msg,type){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.className='toast show'+(type?' '+type:'');setTimeout(function(){t.className='toast';},2600);}
// Error ဖြစ်ပြီး Input Step သို့ Auto Back ဖြစ်သောအခါ Input Screen ထဲတွင် ရှင်းလင်းသော Error Message ပြရန်
function voiceErrorBanner(){
  return VOICE_STATE.errorState?('<div class="error-box">'+esc(VOICE_STATE.errorState)+'</div>'):'';
}
function friendlyError(d,fallback){
  var e=(d&&d.error)||'', detail=(d&&d.detail)||'';
  var map={
    unauthorized:'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။',
    invalid_token:'Login အချက်အလက် မမှန်ကန်ပါ။ ပြန်လည် Login ဝင်ပါ။',
    missing_text:'စာသား ထည့်ပေးပါ။',
    missing_audio:'အသံ သို့မဟုတ် Video ဖိုင် ရွေးပေးပါ။',
    missing_srt:'SRT စာသား မရှိသေးပါ။',
    tts_error:'အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    transcribe_error:'စာသားဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    srt_error:'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    translate_error:'ဘာသာပြန်ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    feature_denied:'ဒီ Feature ကို သင့် Plan နဲ့ အသုံးပြုခွင့်မရှိသေးပါ။',
    pro_only:'ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။',
    feature_disabled:'ဒီ Feature ကို ယခု ပိတ်ထားပါသည်။',
    usage_limit:'အသုံးပြုခွင့် အကန့်အသတ် ပြည့်သွားပါပြီ။',
    forbidden:'အသုံးပြုခွင့် မရှိပါ။'
  };
  return map[e]||fallback||'ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
}
function api(path,body){
  body=body||{};
  var sel=document.getElementById((path.indexOf('/transcribe')>-1||path.indexOf('/srt')>-1)?'aiModelSel2':'aiModelSel')||document.getElementById('aiModelSel');
  if(sel&&sel.value)body.model=sel.value;
  var h={'Content-Type':'application/json'};if(TOKEN)h.Authorization='Bearer '+TOKEN;
  return fetch(path,{method:'POST',headers:h,body:JSON.stringify(body)}).then(function(r){
    return r.json().catch(function(){return {error:'request_error'};}).then(function(d){if(!r.ok&&!d.error)d.error='request_error';return d;});
  });
}
function base64Blob(b,m){var bin=atob(b),a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:m});}
var VOICE_LOADING_STEP=0;
// Loading UI ကို Result section အတွင်း၌သာ ပြသည် — full-screen overlay မသုံးတော့ပါ
function showLoading(text){
  VOICE_LOADING_STEP=2;
  if(window.studioSetLoading)window.studioSetLoading({on:true,step:VOICE_LOADING_STEP,text:text,buttonSelector:'#voiceStepper .vstep[data-step="'+VOICE_LOADING_STEP+'"]',containerSelector:'#voiceStepper'});
}
function hideLoading(){
  if(window.studioSetLoading&&VOICE_LOADING_STEP){
    window.studioSetLoading({on:false,step:VOICE_LOADING_STEP,buttonSelector:'#voiceStepper .vstep[data-step="'+VOICE_LOADING_STEP+'"]',containerSelector:'#voiceStepper'});
  }
  VOICE_LOADING_STEP=0;
}
// Unified Result Loading Card (Shared .aics-result-loading ပုံစံဖြင့် — Result အတွင်းတွင် ပြသည်)
function shortHint(t){
  t=(t==null?'':String(t)).replace(/\s+/g,' ').trim();
  return t.length>90?t.slice(0,87)+'…':t;
}
function resultLoadingCard(msg,hint){
  var h='<div class="aics-result-loading show" style="margin-bottom:0;">'+
    '<div class="aics-result-loading-inner">'+
    '<div class="aics-result-loading-spinner"></div>'+
    '<div class="aics-result-loading-msg">'+esc(msg)+'</div>';
  if(hint&&String(hint).trim())h+='<div class="aics-result-loading-hint">“'+esc(shortHint(hint))+'”</div>';
  h+='</div></div>';
  return '<div class="vcard"><div class="vtitle">✨ '+esc(msg)+'</div>'+h+'</div>';
}
function saveDraft(){
  try{localStorage.setItem(voiceDraftKey,JSON.stringify({
    state:VOICE_STATE,tts:val('ttsText'),speaking:val('speakingStyle'),voice:val('voiceName'),
    instruction:val('voiceInstruction'),audience:val('audience'),srt:val('srtEditor'),
    mediaType:val('mediaOutput'),mediaFileName:MEDIA_AUDIO.fileName,transcript:val('textResult'),
    translation:translatedSrt,dir:VOICE_STATE.translationDirection
  }));}catch(e){}
}
function val(id){var x=document.getElementById(id);return x?(x.value||''):'';}
function restoreDraft(){
  try{
    var raw=localStorage.getItem(voiceDraftKey);if(!raw)return false;
    var d=JSON.parse(raw)||{},s=d.state||{};
    VOICE_DRAFT_VALUES={tts:d.tts||'',speaking:d.speaking||'',voice:d.voice||'Kore',instruction:d.instruction||'',audience:d.audience||'လူတိုင်း',srt:d.srt||'',transcript:d.transcript||''};
    if(s.voiceMode)VOICE_STATE=s;
    VOICE_STATE.translationDirection=d.dir||VOICE_STATE.translationDirection||'MY_TO_CN';
    if(d.translation)translatedSrt=d.translation;
    if(s.audioResult&&s.audioResult.data){LAST_AUDIO.base64=s.audioResult.data;LAST_AUDIO.mime=s.audioResult.mimeType||'audio/wav';}
    return true;
  }catch(e){VOICE_DRAFT_VALUES=null;return false;}
}
function applyDraftToForm(){
  var d=VOICE_DRAFT_VALUES;
  var vi=VOICE_STATE.voiceInput||null;
  // Error → Auto Back ဖြစ်သောအခါ နောက်ဆုံး ထည့်ထားသော Input များ မပျောက်စေရန် voiceInput ကို ဦးစားပေး ပြန်ဖြည့်သည်
  var tts=(d&&d.tts)||(vi&&vi.text)||'';
  var speaking=(d&&d.speaking)||(vi&&vi.speakingStyle)||'';
  var voice=(d&&d.voice)||(vi&&vi.voiceStyle)||'Kore';
  var instruction=(d&&d.instruction)||(vi&&vi.instruction)||'';
  var audience=(d&&d.audience)||(vi&&vi.audience)||'လူတိုင်း';
  var map={ttsText:tts,speakingStyle:speaking,voiceName:voice,voiceInstruction:instruction,audience:audience};
  Object.keys(map).forEach(function(id){var x=document.getElementById(id);if(x&&map[id]!==undefined&&map[id]!==null)x.value=map[id];});
  var s=document.getElementById('srtEditor');if(s&&d.srt)s.value=d.srt;
  var t=document.getElementById('textResult');if(t&&d.transcript)t.value=d.transcript;
  autoGrow(document.getElementById('ttsText'));autoGrow(document.getElementById('speakingStyle'));autoGrow(document.getElementById('voiceInstruction'));
}
function renderStepper(items,current){
  var c=document.getElementById('voiceStepper'),h='';
  items.forEach(function(x,i){
    var cls=x.n===current?'active':(x.n<current?'done':'');
    h+='<div class="vstep '+cls+'" data-step="'+x.n+'">'+(x.n<current?'✓ ':'')+esc(x.label)+'</div>';
    if(i<items.length-1)h+='<span class="vlink"></span>';
  });c.innerHTML=h;
  var active=c.querySelector('.vstep.active');
  if(active&&window.studioScrollElementIntoView)window.studioScrollElementIntoView(active,'#voiceStepper',true);
}
// Main + Branch = Stepper တစ်ခုတည်း —
// Main workflow (3 steps) ပြီးနောက် SRT / ဘာသာပြန် Branch steps များကို ဆက်ပေါင်းပြသည်
`;
