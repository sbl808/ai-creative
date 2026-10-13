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
    empty_transcription:'ရလဒ် ဗလာဖြစ်နေပါသည် — AI က အကြောင်းအရာ မပြန်ပါ။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
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
  // Model dropdown ၂ ခု: TTS → aiModelSel (category=voice) · transcribe/SRT/translate → aiModelSel2 (category=transcribe)
  var selId=(path.indexOf('/tts')>-1)?'aiModelSel':'aiModelSel2';
  var sel=document.getElementById(selId);if(sel&&sel.value)body.model=sel.value;
  var h={'Content-Type':'application/json'};if(TOKEN)h.Authorization='Bearer '+TOKEN;
  return fetch(path,{method:'POST',headers:h,body:JSON.stringify(body)}).then(function(r){
    return r.json().catch(function(){return {error:'request_error'};}).then(function(d){if(!r.ok&&!d.error)d.error='request_error';return d;});
  });
}
function base64Blob(b,m){var bin=atob(b),a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:m});}
var VOICE_LOADING_STEP=0;
// Loading UI ကို Result section အတွင်း၌သာ ပြသည် — full-screen overlay မသုံးတော့ပါ
function showLoading(text){
  VOICE_LOADING_STEP=3;
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
    state:VOICE_STATE,inputs:VOICE_INPUTS,mediaFileName:MEDIA_AUDIO.fileName,translation:translatedSrt
  }));}catch(e){}
}
function val(id){var x=document.getElementById(id);return x?(x.value||''):'';}
function restoreDraft(){
  try{
    var raw=localStorage.getItem(voiceDraftKey);if(!raw)return false;
    var d=JSON.parse(raw)||{},s=d.state||{};
    if(!s.voiceMode)return false;
    VOICE_STATE=Object.assign(newVoiceState(s.voiceMode,s.source),s);
    if(d.inputs)VOICE_INPUTS=Object.assign(VOICE_INPUTS,d.inputs);
    if(d.translation)translatedSrt=d.translation;
    if(s.audioResult&&s.audioResult.data){LAST_AUDIO.base64=s.audioResult.data;LAST_AUDIO.mime=s.audioResult.mimeType||'audio/wav';}
    return true;
  }catch(e){return false;}
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
`;
