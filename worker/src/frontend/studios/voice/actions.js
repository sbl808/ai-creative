// AI Creative Studio — Voice Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/voice.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `function voiceRenderCombinedStepper(phase,step){
  var main=(VOICE_STATE.voiceMode==='text-to-voice')?VOICE_STEPPER:MEDIA_STEPPER;
  var steps=main.slice();
  var offset=0;
  if(phase==='srt'){
    offset=main.length;
    steps=steps.concat(SRT_STEPPER.map(function(s){return {n:s.n+offset,label:s.label};}));
  }else if(phase==='translation'){
    offset=main.length;
    steps=steps.concat(SRT_STEPPER.map(function(s){return {n:s.n+offset,label:s.label};}));
    offset=main.length*2;
    steps=steps.concat(TRANSLATE_STEPPER.map(function(s){return {n:s.n+offset,label:s.label};}));
  }
  renderStepper(steps,step+offset);
}
function setScreen(active){
  document.getElementById('voiceHome').classList.toggle('active',active==='home');
  document.getElementById('voiceWorkflow').classList.toggle('active',active!=='home');
}
function goHome(clear){
  VOICE_REQUEST_ID++;
  hideLoading();
  if(clear){VOICE_STATE={voiceMode:null,voiceStep:0,voiceInput:null,voiceResult:null,audioResult:null,srtResult:null,translationDirection:'MY_TO_CN',translationResult:null,processingState:null,errorState:null,source:'',srtSource:null};LAST_AUDIO={base64:'',mime:'audio/wav',url:''};MEDIA_AUDIO={base64:'',mime:'',fileName:''};translatedSrt='';}
  setScreen('home');document.getElementById('voiceStepper').innerHTML='';document.getElementById('voiceWorkflowBody').innerHTML='';
  setStickyActions([]);
}
function resetVoiceBranch(mode,source){
  source=source||'';
  VOICE_STATE={voiceMode:mode,voiceStep:1,voiceInput:null,voiceResult:null,audioResult:null,srtResult:null,translationDirection:'MY_TO_CN',translationResult:null,processingState:null,errorState:null,source:source,srtSource:null};
  translatedSrt='';LAST_AUDIO={base64:'',mime:'audio/wav',url:''};MEDIA_AUDIO={base64:'',mime:'',fileName:''};
}
function voiceStartMode(mode,restore){
  if(!restore)resetVoiceBranch(mode);
  else VOICE_STATE.voiceMode=mode;
  VOICE_STATE.voiceStep=1;VOICE_STATE.errorState=null;
  setScreen('workflow');
  if(mode==='text-to-voice')renderTextInput();else renderMediaInput();
}
function workflowTop(title){
  return '<div class="top-actions"><button class="btn ghost" onclick="goHome(false)">← Voice Studio Home</button><div style="color:var(--muted);font-size:12px;padding:9px 2px;">'+esc(title)+'</div></div>';
}
// ===== Sticky Action Bar (shared .aics-actions) — Voice Studio ၏ Screen တိုင်းအတွက် Action button များ =====
function bReset(){return {label:'Reset',cls:'ghost',fn:studioReset};}
function setStickyActions(list){if(window.studioSetActions)studioSetActions(list);}
function downloadVoiceAudio(){
  if(!LAST_AUDIO.url){toast('Download လုပ်ဖို့ Audio မရှိပါ','error');return;}
  var a=document.createElement('a');a.href=LAST_AUDIO.url;a.download='voice_output.wav';document.body.appendChild(a);a.click();a.remove();
}
var VOICE_SUBMITTING_TTS=false;
function renderTextInput(){
  VOICE_STATE.voiceStep=1;voiceRenderCombinedStepper('main',1);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📝 စာသား → အသံ')+voiceErrorBanner()+\`
  <div class="vcard">
    <div class="vtitle">📝 စာသား</div><p class="hint">Voice အဖြစ် ဖန်တီးလိုသော စာသားနှင့် စကားပြောပုံစံကို ထည့်ပါ။</p>
    \${VOICE_STATE.source?'<div class="source-note">Content Studio မှ နောက်ဆုံးပြင်ထားသော Content ကို အလိုအလျောက် ထည့်ပေးထားပါသည်။</div>':''}
    <div class="form-group"><label>စာသားအကြောင်းအရာ *</label><textarea id="ttsText" placeholder="Voice ပြောင်းလိုသော Text ကို ထည့်ပါ" oninput="autoGrow(this)"></textarea></div>
    <div class="form-group"><label>Speaking Style</label><textarea id="speakingStyle" placeholder="ဥပမာ - နူးညံ့စွာ၊ တက်ကြွစွာ၊ သဘာဝကျစွာ ပြောပါ" oninput="autoGrow(this)"></textarea></div>
    <div class="form-group"><label>Voice Style</label><select id="voiceName">\${voiceOptions()}</select></div>
    <div class="form-group"><label>ညွှန်ကြားချက် (Optional)</label><textarea id="voiceInstruction" placeholder="AI အသံအတွက် ထပ်မံညွှန်ကြားလိုသည်များ" oninput="autoGrow(this)"></textarea></div>
    <div class="form-group"><label>ပရိသတ်</label><select id="audience"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select></div>
  </div>\`;
  VOICE_SUBMITTING_TTS=false;
  setStickyActions([bReset(),{label:'✨ အသံဖန်တီးရန်',cls:'primary',fn:submitTextToVoice}]);
  applyDraftToForm();
}
function composeVoiceText(){
  var text=val('ttsText').trim(),parts=[];
  var speaking=val('speakingStyle').trim(),instruction=val('voiceInstruction').trim(),aud=val('audience').trim();
  if(speaking)parts.push('[Speaking Style: '+speaking+']');
  if(instruction)parts.push('[Voice Instruction: '+instruction+']');
  if(aud)parts.push('[Target audience: '+aud+']');
  parts.push(text);
  return parts.join('\\n\\n');
}
function submitTextToVoice(){
  var text=val('ttsText').trim();if(!text){toast('Voice ပြောင်းလိုသော စာသားကို ထည့်ပါ','error');return;}
  VOICE_STATE.errorState=null;
  if(VOICE_SUBMITTING_TTS)return;VOICE_SUBMITTING_TTS=true;
  var requestId=++VOICE_REQUEST_ID;
  VOICE_STATE.voiceInput={text:text,speakingStyle:val('speakingStyle'),voiceStyle:val('voiceName'),instruction:val('voiceInstruction'),audience:val('audience')};
  // Unified: Result section အတွင်း loading ပြသည် (processing step မရှိ)
  renderVoiceResultLoading(text);
  showLoading('✨ AI က သင့်အတွက် အသံကို ပြင်ဆင်နေသည်...');
  api('/api/studio/voice/tts',{text:composeVoiceText(),voiceName:val('voiceName')}).then(function(d){
    if(requestId!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));
    LAST_AUDIO.base64=d.data;LAST_AUDIO.mime=d.mimeType||'audio/wav';
    VOICE_STATE.audioResult={data:d.data,mimeType:LAST_AUDIO.mime};
    VOICE_STATE.voiceResult=d;
    renderVoiceResult();
    toast('✓ Voice ဖန်တီးပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(requestId===VOICE_REQUEST_ID){hideLoading();renderVoiceError('tts',e);}});
}
// Unified Result Loading (Result section အတွင်းတွင် loading card ပြသည်)
function renderVoiceResultLoading(hint){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('main',2);
  setStickyActions([]);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📝 စာသား → အသံ')+resultLoadingCard('AI က သင့်အတွက် အသံကို ပြင်ဆင်နေသည်...',hint);
}
function renderVoiceResult(){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('main',2);
  var url=URL.createObjectURL(base64Blob(LAST_AUDIO.base64,LAST_AUDIO.mime));LAST_AUDIO.url=url;
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🎧 အသံ ရလဒ်')+\`
  <div class="vcard"><div class="vtitle">🎧 အသံ ရလဒ်</div>
    <div class="audio-box"><audio controls src="\${esc(url)}"></audio></div>
  </div>
  <div class="vcard"><div class="vtitle">📝 မူရင်း SRT စာတန်းထိုး</div><p class="hint">အသံမှ SRT စာတန်းထိုး လိုအပ်မှသာ ဆက်လုပ်ပါ။</p>
  </div>\`;
  setStickyActions([
    {label:'← ပြန်ပြင်ရန်',cls:'ghost',fn:renderTextInput},
    {label:'💾 Download Audio',cls:'secondary',fn:downloadVoiceAudio},
    {label:'💾 သိမ်းရန်',cls:'purple',fn:saveVoiceCreation},
    {label:'📄 SRT ဖန်တီးရန်',cls:'primary',fn:startSrtFromVoice}
  ]);
}
function renderVoiceError(kind,e){
  var msg=friendlyError({error:(e.message||'').split('|')[0],detail:(e.message||'').split('|').slice(1).join('|')},kind==='tts'?'အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။':'ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။');
  console.error('Voice TTS Error:', e);
  VOICE_STATE.errorState=msg;
  toast(msg,'error');
  // Error → သက်ဆိုင်ရာ Input Step (စာသား) သို့ Auto Back — ထည့်ထားသော Input များ မပျောက်စေရ
  renderTextInput();
}
function startSrtFromVoice(){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}
  VOICE_STATE.processingState='srt';VOICE_STATE.srtSource='voice';renderSrtInput('voice');
}
function renderSrtInput(source){
  VOICE_STATE.srtSource=source;VOICE_STATE.voiceStep=1;voiceRenderCombinedStepper('srt',1);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📄 SRT')+voiceErrorBanner()+\`
  <div class="vcard"><div class="vtitle">📄 SRT ဖန်တီးရန်</div><p class="hint">လက်ရှိ Audio မှ Timestamp ပါသော SRT ကို ဖန်တီးပါ။</p>
    <div class="source-note">မူရင်း Audio ရလဒ်ကို အသုံးပြုပါမည်။ SRT ကို အလိုအလျောက် မဖန်တီးပါ။</div>
  </div>\`;
  setStickyActions([
    {label:'← နောက်သို့',cls:'ghost',fn:function(){source==='voice'?renderVoiceResult():renderMediaResult();}},
    {label:'✨ SRT ဖန်တီးရန်',cls:'primary',fn:function(){submitSrt(source);}}
  ]);
}
function submitSrt(source){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}
  var b=source==='voice'?LAST_AUDIO:MEDIA_AUDIO;if(!b.base64){toast('SRT ထုတ်ဖို့ Audio/Video မရှိသေးပါ','error');return;}
  VOICE_STATE.errorState=null;
  var requestId=++VOICE_REQUEST_ID;
  VOICE_STATE.processingState='srt';
  // Unified: Result section အတွင်း loading ပြသည်
  renderSrtResultLoading();
  showLoading('✨ AI က သင့်အတွက် SRT စာတန်းထိုးကို ပြင်ဆင်နေသည်...');
  api('/api/studio/voice/srt',{audioBase64:b.base64,mimeType:b.mime,type:'2'}).then(function(d){
    if(requestId!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));VOICE_STATE.srtResult=d.srt||'';renderSrtResult(source);toast('✓ SRT ပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(requestId===VOICE_REQUEST_ID){hideLoading();renderGenericError('srt',source,e);}});
}
// Unified Result Loading (SRT Result section အတွင်းတွင် loading card ပြသည်)
function renderSrtResultLoading(){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('srt',2);
  setStickyActions([]);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📄 SRT')+resultLoadingCard('AI က သင့်အတွက် SRT စာတန်းထိုးကို ပြင်ဆင်နေသည်...','');
}
function renderSrtResult(source){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('srt',2);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📄 SRT ရလဒ်')+\`
  <div class="vcard"><div class="vtitle">📄 SRT ရလဒ်</div><p class="hint">Timestamp များကို မူရင်းအတိုင်း ထိန်းသိမ်းထားပါသည်။ လိုအပ်သလို စာသားကို ပြင်နိုင်ပါသည်။</p>
    <textarea class="srt-box" id="srtEditor" oninput="autoGrow(this)">\${esc(VOICE_STATE.srtResult)}</textarea>
  </div>
  <div class="vcard"><div class="vtitle">🌐 ဘာသာပြန်</div><p class="hint">လိုအပ်မှသာ ဘာသာပြန်လုပ်ပါ။</p></div>\`;
  setStickyActions([
    {label:'📋 Copy SRT',cls:'success',fn:function(){copyValue('srtEditor');}},
    {label:'💾 Save .srt',cls:'secondary',fn:function(){downloadValue('srtEditor','original_subtitle.srt');}},
    {label:'💾 သိမ်းရန်',cls:'purple',fn:function(){saveSrtCreation('original');}},
    {label:'ဘာသာပြန်ဖန်တီးရန် →',cls:'primary',fn:function(){startTranslation(source);}}
  ]);
}
function startTranslation(source){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}
  var edited=val('srtEditor').trim();if(edited)VOICE_STATE.srtResult=edited;
  VOICE_STATE.processingState='translation';renderTranslationInput(source);
}
function renderTranslationInput(source){
  VOICE_STATE.voiceStep=1;voiceRenderCombinedStepper('translation',1);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🌐 ဘာသာပြန်')+voiceErrorBanner()+\`
  <div class="vcard"><div class="vtitle">🌐 ဘာသာပြန်</div>
    <div class="form-group"><label>ဘာသာပြန်ဦးတည်ချက်</label><select id="translationDirection" onchange="VOICE_STATE.translationDirection=this.value">
      <option value="MY_TO_CN"\${VOICE_STATE.translationDirection==='MY_TO_CN'?' selected':''}>မြန်မာ → တရုတ်</option>
      <option value="CN_TO_MY"\${VOICE_STATE.translationDirection==='CN_TO_MY'?' selected':''}>တရုတ် → မြန်မာ</option>
    </select></div>
  </div>\`;
  setStickyActions([
    {label:'← SRT ရလဒ်',cls:'ghost',fn:function(){renderSrtResult(source);}},
    {label:'ဘာသာပြန်ဖန်တီးရန် →',cls:'primary',fn:function(){submitTranslation(source);}}
  ]);
}
function submitTranslation(source){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}
  var srt=val('srtEditor')||VOICE_STATE.srtResult;if(!srt.trim()){toast('ဘာသာပြန်ဖို့ SRT မရှိသေးပါ','error');return;}
  VOICE_STATE.errorState=null;
  VOICE_STATE.translationDirection=val('translationDirection')||VOICE_STATE.translationDirection;
  var requestId=++VOICE_REQUEST_ID;
  VOICE_STATE.processingState='translation';
  // Unified: Result section အတွင်း loading ပြသည်
  renderTranslationResultLoading(srt);
  showLoading('✨ AI က သင့်အတွက် ဘာသာပြန်ကို ပြင်ဆင်နေသည်...');
  api('/api/studio/voice/translate-srt',{srtText:srt,direction:VOICE_STATE.translationDirection,type:'2'}).then(function(d){
    if(requestId!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));translatedSrt=d.srt||'';VOICE_STATE.translationResult=translatedSrt;renderTranslationResult(source);toast('✓ ဘာသာပြန်ပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(requestId===VOICE_REQUEST_ID){hideLoading();renderGenericError('translation',source,e);}});
}
// Unified Result Loading (ဘာသာပြန် Result section အတွင်းတွင် loading card ပြသည်)
function renderTranslationResultLoading(hint){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('translation',2);
  setStickyActions([]);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🌐 ဘာသာပြန်')+resultLoadingCard('AI က သင့်အတွက် ဘာသာပြန်ကို ပြင်ဆင်နေသည်...',hint);
}
function renderTranslationResult(source){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('translation',2);
  var s=VOICE_STATE.translationResult||translatedSrt;
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🌐 ဘာသာပြန် ရလဒ်')+\`
  <div class="vcard"><div class="vtitle">🌐 ဘာသာပြန် ရလဒ်</div><p class="hint">မူရင်း SRT Number နှင့် Timestamp များကို မပြောင်းထားပါ။</p>
    <textarea class="srt-box" id="translatedEditor">\${esc(s)}</textarea>
  </div>\`;
  setStickyActions([
    {label:'📋 Copy SRT',cls:'success',fn:function(){copyValue('translatedEditor');}},
    {label:'💾 Save .srt',cls:'secondary',fn:function(){downloadValue('translatedEditor','translated_subtitle.srt');}},
    {label:'💾 သိမ်းရန်',cls:'purple',fn:function(){saveSrtCreation('translated');}}
  ]);
}
function renderGenericError(kind,source,e){
  var raw=(e&&e.message)||'';var actual=(raw.split('|')[0]||'').trim();
  var key=actual|| (kind==='translation'?'translate_error':kind==='srt'?'srt_error':'request_error');
  var msg=friendlyError({error:key},kind==='translation'?'ဘာသာပြန်ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။':kind==='srt'?'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။':'ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။');
  console.error(kind==='srt'?'Voice SRT Error:':'Voice Translate Error:', e);
  VOICE_STATE.errorState=msg;
  toast(msg,'error');
  // Error → သက်ဆိုင်ရာ Input / Setup Step သို့ Auto Back — Processing Step တွင် မရပ်ပါ
  if(kind==='srt'){renderSrtInput(source);}
  else{renderTranslationInput(source);}
}
function renderMediaInput(){
  VOICE_STATE.voiceStep=1;voiceRenderCombinedStepper('main',1);
  var reuseNote=(MEDIA_AUDIO.base64)?'<div class="source-note">ယခင် ဖိုင်ကို မှတ်ထားပါသည် — အောက်က ခလုတ်ဖြင့် ပြန်လည်ကြိုးစားနိုင်ပါသည်။</div><div class="btn-row"><button class="btn secondary" onclick="submitMedia(&#39;text&#39;)">&#8635; ယခင် ဖိုင်ဖြင့် ထပ်မံကြိုးစားရန်</button></div>':'';
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🎧 အသံ / Video → စာသား')+voiceErrorBanner()+\`
  <div class="vcard"><div class="vtitle">🎧 အသံ / Video</div><p class="hint">Audio သို့မဟုတ် Video ဖိုင်ကို တင်ပါ။ 5MB အထိ အသုံးပြုနိုင်ပါသည်။</p>
    <div class="form-group"><label>Audio / Video File</label><input type="file" id="mediaFile" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv" onchange="previewMediaChoice()"></div>
    \${reuseNote}
  </div>
  <div class="vcard" id="mediaOutputCard" style="display:none"><div class="vtitle">Output ရွေးချယ်ရန်</div><p class="hint">ဖိုင်တင်ပြီးနောက် လိုချင်သော result တစ်ခုကို ရွေးပါ။</p><div class="choice-grid">
    <button class="choice-card" onclick="submitMedia('text')"><strong>📝 စာသား</strong><span>အသံ/Video ထဲက စကားပြောစာသားကို ရိုးရိုး Text အဖြစ်ရယူရန်</span></button>
    <button class="choice-card" onclick="submitMedia('srt')"><strong>📄 မူရင်း SRT</strong><span>Timestamp ပါတဲ့ subtitle အဖြစ် ရယူရန်</span></button>
  </div></div>\`;
  setStickyActions([bReset()]);
}
function previewMediaChoice(){
  var f=document.getElementById('mediaFile')&&document.getElementById('mediaFile').files[0];
  var card=document.getElementById('mediaOutputCard');
  if(card)card.style.display=f?'block':'none';
}
function readMedia(cb){
  var f=document.getElementById('mediaFile')?document.getElementById('mediaFile').files[0]:null;
  if(!f){
    // Error → Auto Back ပြီးနောက် ဖိုင်အသစ် ပြန်ရွေးမထားလျှင် ယခင် ဖိုင်ကို ပြန်သုံးသည် (Data မပျောက်စေရ)
    if(MEDIA_AUDIO.base64){cb();return;}
    toast('Audio သို့မဟုတ် Video ဖိုင် ရွေးပါ','error');return;
  }
  if(f.size>5*1024*1024){toast('ဖိုင်သည် 5MB ထက် မကျော်ရပါ','error');return;}
  var r=new FileReader();r.onload=function(e){MEDIA_AUDIO={base64:e.target.result.split(',')[1],mime:f.type||'application/octet-stream',fileName:f.name};cb();};r.onerror=function(){toast('ဖိုင်ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်','error');};r.readAsDataURL(f);
}
function submitMedia(type){
  VOICE_STATE.errorState=null;
  readMedia(function(){
    if(type==='srt'){startSrtMedia();return;}
    var requestId=++VOICE_REQUEST_ID;
    // Unified: Result section အတွင်း loading ပြသည်
    renderMediaResultLoading(MEDIA_AUDIO.fileName||'');
    showLoading('✨ AI က သင့်အတွက် စာသားကို ဖန်တီးနေသည်...');
    api('/api/studio/voice/transcribe',{audioBase64:MEDIA_AUDIO.base64,mimeType:MEDIA_AUDIO.mime,type:'1'}).then(function(d){
      if(requestId!==VOICE_REQUEST_ID)return;
      hideLoading();
      if(d.error)throw new Error(d.error+'|'+(d.detail||''));VOICE_STATE.voiceResult={text:d.text||''};renderMediaResult();toast('✓ စာသားဖန်တီးပြီးပါပြီ','success');saveDraft();
    }).catch(function(e){if(requestId===VOICE_REQUEST_ID){hideLoading();renderMediaError(e);}});
  });
}
// Unified Result Loading (စာသား Result section အတွင်းတွင် loading card ပြသည်)
function renderMediaResultLoading(hint){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('main',2);
  setStickyActions([]);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('🎧 အသံ / Video → စာသား')+resultLoadingCard('AI က သင့်အတွက် စာသားကို ဖန်တီးနေသည်...',hint);
}
function renderMediaError(e){
  var msg=friendlyError({error:(e.message||'').split('|')[0]},'စာသားဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။');
  console.error('Voice Transcribe Error:', e);
  VOICE_STATE.errorState=msg;
  toast(msg,'error');
  // Error → သက်ဆိုင်ရာ Input Step (အသံ / Video) သို့ Auto Back — ယခင် ဖိုင်ကို ပြန်သုံးနိုင်ရန် ထားပေးသည်
  renderMediaInput();
}
function renderMediaResult(){
  VOICE_STATE.voiceStep=2;voiceRenderCombinedStepper('main',2);
  document.getElementById('voiceWorkflowBody').innerHTML=workflowTop('📝 စာသား ရလဒ်')+\`
  <div class="vcard"><div class="vtitle">📝 စာသား ရလဒ်</div><p class="hint">စာသားကို လိုအပ်သလို ပြင်ဆင်နိုင်ပါသည်။</p>
    <textarea id="textResult" class="result-text" oninput="autoGrow(this)">\${esc((VOICE_STATE.voiceResult&&VOICE_STATE.voiceResult.text)||'')}</textarea>
  </div>\`;
  setStickyActions([
    {label:'← ပြန်ဖန်တီးရန်',cls:'ghost',fn:renderMediaInput},
    {label:'📋 Copy',cls:'success',fn:function(){copyValue('textResult');}},
    {label:'💾 သိမ်းရန်',cls:'purple',fn:saveTranscript}
  ]);
}
function startSrtMedia(){if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}VOICE_STATE.processingState='srt';VOICE_STATE.srtSource='media';renderSrtInput('media');}
function autoGrow(x){if(!x)return;x.style.height='auto';x.style.height=Math.min(Math.max(x.scrollHeight,100),520)+'px';}
function copyValue(id){var x=document.getElementById(id),t=x?(x.value!==undefined?x.value:x.textContent):'';if(!t.trim()){toast('Copy လုပ်ဖို့ Result မရှိပါ','error');return;}if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast('✓ Copy ပြီးပါပြီ','success');});}
function downloadValue(id,name){var x=document.getElementById(id),t=x?x.value:'';if(!t.trim()){toast('Save လုပ်ဖို့ Result မရှိပါ','error');return;}var u=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},500);}
function saveVoiceCreation(){
  var text=val('ttsText')||VOICE_STATE.voiceInput&&VOICE_STATE.voiceInput.text;if(!text)return;
  var title=prompt('Creation အမည် ပေးပါ:',text.substring(0,40));if(title===null)return;
  AICS_CREATIONS.save({studio:'VOICE',type:'1',title:title||'Voice Text',original_prompt:text,ai_output:text,media_type:LAST_AUDIO.base64?'audio':'',media_mime:LAST_AUDIO.mime,media_data:LAST_AUDIO.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function saveTranscript(){
  var text=val('textResult');if(!text.trim()){toast('Save လုပ်ဖို့ Result မရှိပါ','error');return;}
  var title=prompt('Creation အမည် ပေးပါ:','Voice Transcript');if(title===null)return;
  AICS_CREATIONS.save({studio:'VOICETRANSCRIBE',type:'1',title:title||'Voice Transcript',original_prompt:'(Audio / Video transcription)',ai_output:text,media_type:MEDIA_AUDIO.base64?'audio':'',media_mime:MEDIA_AUDIO.mime||'',media_data:MEDIA_AUDIO.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function saveSrtCreation(kind){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return;}
  var srt=kind==='translated'?(val('translatedEditor')||translatedSrt):val('srtEditor');
  if(!srt.trim()){toast('Save လုပ်ဖို့ SRT မရှိပါ','error');return;}
  var title=prompt('Creation အမည် ပေးပါ:',kind==='translated'?'Voice Translated SRT':'Voice Original SRT');if(title===null)return;
  var b=VOICE_STATE.voiceMode==='media-to-text'?MEDIA_AUDIO:LAST_AUDIO;
  AICS_CREATIONS.save({studio:'VOICE',type:'2',title:title||'Voice SRT',original_prompt:val('srtEditor'),ai_output:srt,media_type:b.base64?'audio':'',media_mime:b.mime||'',media_data:b.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function hydratePlan(){
  apiGet('/api/users/me').then(function(d){
    if(d.error){localStorage.removeItem('aics_token');location.reload();return;}
    USER_PLAN=d.plan||'FREE';var p=document.getElementById('sidePlan');if(p)p.textContent=USER_PLAN;
  }).catch(function(){});
}
function apiGet(path){var h={};if(TOKEN)h.Authorization='Bearer '+TOKEN;return fetch(path,{headers:h}).then(function(r){return r.json();});}
function applyContentTransfer(){
  try{
    var raw=localStorage.getItem('aics_voice_transfer');if(!raw)return;
    var d=JSON.parse(raw);if(!d||!d.text)return;
    var transferSource=d.source||'content';
    resetVoiceBranch('text-to-voice',transferSource);
    setScreen('workflow');
    renderTextInput();
    document.getElementById('ttsText').value=d.text;
    var s=document.getElementById('speakingStyle');if(s&&d.speakingStyle)s.value=d.speakingStyle;
    var v=document.getElementById('voiceName');if(v&&d.voiceStyle)v.value=d.voiceStyle;
    var ins=document.getElementById('voiceInstruction');if(ins&&d.instruction)ins.value=d.instruction;
    var a=document.getElementById('audience');if(a&&d.audience)a.value=d.audience;
    autoGrow(document.getElementById('ttsText'));localStorage.removeItem('aics_voice_transfer');saveDraft();
  }catch(e){}
}
function studioOnStep(){/* Voice Studio owns its branch stepper; shared shell stepper is intentionally unused. */}
window.studioOnStep=studioOnStep;
function studioCollectDraft(){return{voiceState:VOICE_STATE,translation:translatedSrt};}
window.studioCollectDraft=studioCollectDraft;
function studioRestoreDraft(){/* Draft is restored by Voice Studio after its DOM is ready. */}
window.studioRestoreDraft=studioRestoreDraft;

(function initVoice(){
  if(!TOKEN){document.getElementById('loginView').style.display='flex';document.getElementById('aicsApp').style.display='none';return;}
  hydratePlan();
  var restored=restoreDraft();
  if(restored && VOICE_STATE.voiceMode){
    setScreen('workflow');
    var src=VOICE_STATE.srtSource||'voice';
    if(VOICE_STATE.processingState==='srt' && VOICE_STATE.srtResult){
      renderSrtResult(src);
    }else if(VOICE_STATE.processingState==='translation' && VOICE_STATE.translationResult){
      renderTranslationResult(src);
    }else if(VOICE_STATE.voiceMode==='text-to-voice' && VOICE_STATE.audioResult && VOICE_STATE.audioResult.data){
      renderVoiceResult();
    }else if(VOICE_STATE.voiceMode==='media-to-text' && VOICE_STATE.voiceResult && VOICE_STATE.voiceResult.text){
      renderMediaResult();
    }else{
      // Draft မှာ Branch ရွေးထားပြီး Result မရသေးလျှင် — ထို Branch ၏ Input UI ကို ပြန်ပြသည် (Branch state မပျောက်စေရ)
      voiceStartMode(VOICE_STATE.voiceMode,true);
    }
  }else if(restored && VOICE_STATE.voiceMode==='text-to-voice' && VOICE_DRAFT_VALUES && VOICE_DRAFT_VALUES.tts){
    voiceStartMode('text-to-voice',true);
  }
  applyContentTransfer();
})();
`;
