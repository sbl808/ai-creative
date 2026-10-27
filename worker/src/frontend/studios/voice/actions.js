// AI Creative Studio — Voice Studio / actions.js (V2.1 Unified Workflow)
// စာမျက်နှာတစ်ခုတည်း: Mode chips (စာ→အသံ | အသံ→စာ | ဘာသာပြန်) + Stepper ၄ ဆင့် (Input → Format → Generate → Result Hub)
// SRT / ဘာသာပြန် ဆက်လုပ်ခြင်းကို Result Hub (shared-ui.js aicsResultHub) ထဲတွင်သာ ပြသည် — Stepper မရှည်တော့ပါ။
// NOTE: String.raw အတွင်း backtick နှင့် dollar-brace မသုံးရ (Browser script string ဖြစ်၍)။
export const ACTIONS_SCRIPT = String.raw`
function vEl(id){return document.getElementById(id);}
function setStickyActions(list){if(window.studioSetActions)studioSetActions(list);}
function voiceReset(){
  if(!confirm('ဤ Studio ရဲ့ အချက်အလက်အားလုံးကို ဖျက်ပြီး အစကပြန်စမလား?'))return;
  try{localStorage.removeItem(voiceDraftKey);localStorage.removeItem('aics_voice_workflow_v2');localStorage.removeItem('aics_draft_voice');localStorage.removeItem('aics_voice_transfer');}catch(e){}
  location.reload();
}
function bReset(){return {label:'Reset',cls:'ghost',fn:voiceReset};}
function vPro(){
  if(USER_PLAN!=='PRO'){toast('ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်','error');return false;}
  return true;
}
function vLockBadge(){return USER_PLAN==='PRO'?'':' <span class="lock">🔒 Pro</span>';}

// ===== Body / Stepper / Chips =====
function vSetBody(html){
  // aiModelSel2 ကို DOM ပြန်ဆွဲခြင်းကြောင့် မပျောက်စေရန် Store သို့ အရင်ပြန်ထည့်ပြီးမှ Slot ထဲသို့ ရွှေ့သည်
  var store=vEl('voiceModel2Store'),g=vEl('voiceModel2Group');
  if(store&&g&&g.parentNode!==store)store.appendChild(g);
  vEl('voiceWorkflowBody').innerHTML=html;
  var slot=vEl('voiceModel2Slot');
  if(slot&&g)slot.appendChild(g);
  vFill();
}
function vSetStep(n){VOICE_STATE.voiceStep=n;renderStepper(VOICE_STEPS,n);}
function renderChips(){
  var h='';
  VOICE_MODES.forEach(function(m){
    var on=VOICE_STATE.voiceMode===m.id;
    h+='<button type="button" class="vchip'+(on?' active':'')+'" role="tab" aria-selected="'+(on?'true':'false')+'" onclick="voiceSwitchMode(\''+m.id+'\')">'+m.icon+' '+esc(m.label)+((m.pro&&USER_PLAN!=='PRO')?' <span class="lock">🔒 Pro</span>':'')+'</button>';
  });
  vEl('voiceChips').innerHTML=h;
}
// TTS = aiModelSel (Action bar) · အသံ→စာ / ဘာသာပြန် = aiModelSel2 (Format screen ထဲ) — တစ်ကြိမ်တွင် တစ်ခုသာ ပြသည်
function vSyncModelBar(){
  var m=document.querySelector('.aics-actions-model');
  if(m)m.style.display=(VOICE_STATE.voiceMode==='text-to-voice')?'':'none';
}
function vHasResult(){
  var s=VOICE_STATE;
  return !!((s.audioResult&&s.audioResult.data)||(s.voiceResult&&typeof s.voiceResult.text==='string')||s.srtResult||s.translationResult);
}
function resetVoiceBranch(mode,source){
  // ရလဒ်များကိုသာ ရှင်းသည် — VOICE_INPUTS နှင့် တင်ထားသော ဖိုင် (MEDIA_AUDIO) ကို ထိန်းထားသည်
  VOICE_STATE=newVoiceState(mode,source||'');
  translatedSrt='';LAST_AUDIO={base64:'',mime:'audio/wav',url:''};
}
function voiceSwitchMode(mode){
  if(mode===VOICE_STATE.voiceMode)return;
  vCapture();
  if(vHasResult()&&!confirm('လက်ရှိ ရလဒ်ကို ဖျက်ပြီး Mode ပြောင်းမလား?'))return;
  VOICE_REQUEST_ID++;hideLoading();
  resetVoiceBranch(mode,VOICE_STATE.source);
  vRenderInput();
}

// ===== Form values (Step / Mode ပြောင်းလည်း မပျောက်စေရန်) =====
function vSyncEdits(){
  var e=vEl('srtEditor');if(e)VOICE_STATE.srtResult=e.value;
  var t=vEl('translatedEditor');if(t){translatedSrt=t.value;VOICE_STATE.translationResult=t.value;}
  var x=vEl('textResult');if(x&&VOICE_STATE.voiceResult&&typeof VOICE_STATE.voiceResult.text==='string')VOICE_STATE.voiceResult.text=x.value;
}
function vCapture(){
  var I=VOICE_INPUTS;
  [['ttsText','tts'],['speakingStyle','speaking'],['voiceName','voice'],['voiceInstruction','instruction'],['audience','audience'],['srtSourceText','srt']].forEach(function(p){
    var x=vEl(p[0]);if(x&&x.value!==undefined)I[p[1]]=x.value;
  });
  var d=vEl('translationDirection');if(d&&d.value)VOICE_STATE.translationDirection=d.value;
  vSyncEdits();
}
function vFill(){
  var I=VOICE_INPUTS;
  var map={ttsText:I.tts,speakingStyle:I.speaking,voiceName:I.voice,voiceInstruction:I.instruction,audience:I.audience,srtSourceText:I.srt};
  Object.keys(map).forEach(function(id){var x=vEl(id);if(x&&map[id]!==undefined&&map[id]!==null)x.value=map[id];});
  var d=vEl('translationDirection');if(d)d.value=VOICE_STATE.translationDirection;
  ['ttsText','speakingStyle','voiceInstruction','srtSourceText','srtEditor','translatedEditor','textResult'].forEach(function(id){autoGrow(vEl(id));});
}
function vDirSelect(){
  return '<select id="translationDirection"><option value="MY_TO_CN">မြန်မာ → တရုတ်</option><option value="CN_TO_MY">တရုတ် → မြန်မာ</option></select>';
}
function vPasteInto(id){
  var x=vEl(id);if(!x)return;
  if(!navigator.clipboard||!navigator.clipboard.readText){toast('Paste မရပါ — စာသားကို တိုက်ရိုက် ထည့်ပါ','error');return;}
  navigator.clipboard.readText().then(function(t){
    if(t){x.value=t;autoGrow(x);}else toast('Clipboard ထဲမှာ စာသား မရှိပါ','error');
  }).catch(function(){toast('Paste မရပါ — စာသားကို တိုက်ရိုက် ထည့်ပါ','error');});
}
function vExample(){
  var x=vEl('ttsText');if(!x)return;
  x.value='မင်္ဂလာပါ။ ဒီနေ့ ရာသီဥတု အေးချမ်းပြီး လမ်းလျှောက်ဖို့ သင့်တော်ပါတယ်။';autoGrow(x);
}
function vSrtFilePicked(){
  var f=vEl('srtFile')&&vEl('srtFile').files[0];if(!f)return;
  if(f.size>1024*1024){toast('ဖိုင်သည် 1MB ထက် မကျော်ရပါ','error');return;}
  var r=new FileReader();
  r.onload=function(e){var t=vEl('srtSourceText');if(t){t.value=String(e.target.result||'');autoGrow(t);}};
  r.onerror=function(){toast('ဖိုင်ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်','error');};
  r.readAsText(f);
}
function vReadMedia(cb){
  var f=vEl('mediaFile')?vEl('mediaFile').files[0]:null;
  if(!f){
    // ဖိုင်အသစ် မရွေးထားလျှင် ယခင်ဖိုင်ကို ပြန်သုံးသည် (Data မပျောက်စေရ)
    if(MEDIA_AUDIO.base64){cb();return;}
    toast('Audio သို့မဟုတ် Video ဖိုင် ရွေးပါ','error');return;
  }
  if(f.size>5*1024*1024){toast('ဖိုင်သည် 5MB ထက် မကျော်ရပါ','error');return;}
  var r=new FileReader();
  r.onload=function(e){MEDIA_AUDIO={base64:e.target.result.split(',')[1],mime:f.type||'application/octet-stream',fileName:f.name};cb();};
  r.onerror=function(){toast('ဖိုင်ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်','error');};
  r.readAsDataURL(f);
}

// ===== Step 1 — Input =====
function vRenderInput(){
  var m=VOICE_STATE.voiceMode;
  VOICE_STATE.view='input';vSetStep(1);renderChips();vSyncModelBar();
  var b='';
  if(m==='text-to-voice'){
    b='<div class="vcard"><div class="vtitle">📝 စာသား</div><p class="hint">Voice အဖြစ် ဖန်တီးလိုသော စာသားကို ထည့်ပါ။</p>'
      +(VOICE_STATE.source?'<div class="source-note">Content Studio မှ နောက်ဆုံးပြင်ထားသော Content ကို အလိုအလျောက် ထည့်ပေးထားပါသည်။</div>':'')
      +'<div class="form-group"><label>စာသားအကြောင်းအရာ *</label><textarea id="ttsText" placeholder="Voice ပြောင်းလိုသော Text ကို ထည့်ပါ" oninput="autoGrow(this)"></textarea></div>'
      +'<div class="btn-row" style="margin-top:0"><button type="button" class="btn ghost" onclick="vPasteInto(\'ttsText\')">📋 Paste</button><button type="button" class="btn ghost" onclick="vExample()">✨ ဥပမာ</button></div></div>';
  }else if(m==='media-to-text'){
    var note=MEDIA_AUDIO.base64?'<div class="source-note">ယခင်ဖိုင် — '+esc(MEDIA_AUDIO.fileName||'audio')+' ကို မှတ်ထားပါသည်။ ဖိုင်အသစ် မရွေးလျှင် ဒီဖိုင်ကို ဆက်သုံးမည်။</div>':'';
    b='<div class="vcard"><div class="vtitle">🎧 အသံ / Video</div><p class="hint">Audio သို့မဟုတ် Video ဖိုင်ကို တင်ပါ။ 5MB အထိ အသုံးပြုနိုင်ပါသည်။</p>'+note
      +'<div class="form-group"><label>Audio / Video File *</label><input type="file" id="mediaFile" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv"></div></div>';
  }else{
    b='<div class="vcard"><div class="vtitle">🌐 SRT စာသား</div><p class="hint">ဘာသာပြန်လိုသော SRT ကို paste လုပ်ပါ သို့မဟုတ် .srt ဖိုင်တင်ပါ။</p>'
      +'<div class="form-group"><label>SRT *</label><textarea id="srtSourceText" class="srt-box" placeholder="1&#10;00:00:00,000 --> 00:00:03,000&#10;မင်္ဂလာပါ" oninput="autoGrow(this)"></textarea></div>'
      +'<div class="btn-row" style="margin-top:0"><button type="button" class="btn ghost" onclick="vPasteInto(\'srtSourceText\')">📋 Paste</button></div>'
      +'<div class="form-group" style="margin-top:14px"><label>သို့မဟုတ် .srt ဖိုင်</label><input type="file" id="srtFile" accept=".srt,.txt,text/plain" onchange="vSrtFilePicked()"></div></div>';
  }
  vSetBody(voiceErrorBanner()+b);
  setStickyActions([bReset(),{label:'Next →',cls:'primary',fn:vInputNext}]);
}
function vInputNext(){
  vCapture();var m=VOICE_STATE.voiceMode;
  if(m==='text-to-voice'){
    if(!VOICE_INPUTS.tts.trim()){toast('Voice ပြောင်းလိုသော စာသားကို ထည့်ပါ','error');return;}
    vRenderFormat();
  }else if(m==='media-to-text'){
    vReadMedia(function(){vRenderFormat();});
  }else{
    if(!VOICE_INPUTS.srt.trim()){toast('ဘာသာပြန်လိုသော SRT စာသားကို ထည့်ပါ','error');return;}
    vRenderFormat();
  }
}

// ===== Step 2 — Format =====
function vSetMediaOutput(o){vCapture();VOICE_STATE.mediaOutput=o;vRenderFormat();}
function vRenderFormat(){
  var m=VOICE_STATE.voiceMode,b='';
  VOICE_STATE.view='format';vSetStep(2);renderChips();vSyncModelBar();
  if(m==='text-to-voice'){
    b='<div class="vcard"><div class="vtitle">🎚️ အသံပုံစံ</div><p class="hint">အသံနှင့် စကားပြောပုံစံကို ရွေးပါ။ AI Model ကို အောက်ဆုံးဘားမှာ ရွေးနိုင်ပါသည်။</p>'
      +'<div class="source-note">“'+esc(shortHint(VOICE_INPUTS.tts))+'”</div>'
      +'<div class="form-group"><label>Voice Style</label><select id="voiceName">'+voiceOptions()+'</select></div>'
      +'<div class="form-group"><label>Speaking Style</label><textarea id="speakingStyle" placeholder="ဥပမာ - နူးညံ့စွာ၊ တက်ကြွစွာ၊ သဘာဝကျစွာ ပြောပါ" oninput="autoGrow(this)"></textarea></div>'
      +'<div class="form-group"><label>ညွှန်ကြားချက် (Optional)</label><textarea id="voiceInstruction" placeholder="AI အသံအတွက် ထပ်မံညွှန်ကြားလိုသည်များ" oninput="autoGrow(this)"></textarea></div>'
      +'<div class="form-group"><label>ပရိသတ်</label><select id="audience"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select></div></div>';
  }else if(m==='media-to-text'){
    var srtSel=VOICE_STATE.mediaOutput==='srt';
    b='<div class="vcard"><div class="vtitle">📤 Output</div><p class="hint">ဖိုင် — '+esc(MEDIA_AUDIO.fileName||'audio')+'</p>'
      +'<div class="seg">'
      +'<button type="button" class="choice-card'+(srtSel?'':' active')+'" onclick="vSetMediaOutput(\'text\')"><strong>📝 စာသား</strong><span>စကားပြောစာသားကို Text အဖြစ်ရယူရန်</span></button>'
      +'<button type="button" class="choice-card'+(srtSel?' active':'')+'" onclick="vSetMediaOutput(\'srt\')"><strong>📄 မူရင်း SRT'+vLockBadge()+'</strong><span>Timestamp ပါတဲ့ subtitle အဖြစ် ရယူရန်</span></button></div>'
      +'<div id="voiceModel2Slot" style="margin-top:14px"></div></div>';
  }else{
    b='<div class="vcard"><div class="vtitle">🌐 ဘာသာပြန်ဦးတည်ချက်</div><p class="hint">SRT Number နှင့် Timestamp များကို မပြောင်းဘဲ စာသားကိုသာ ဘာသာပြန်ပါမည်။</p>'
      +'<div class="form-group"><label>ဘာသာပြန်ဦးတည်ချက်</label>'+vDirSelect()+'</div>'
      +'<div id="voiceModel2Slot"></div>'
      +(USER_PLAN==='PRO'?'':'<div class="pro-note">🔒 ဘာသာပြန်ခြင်းကို Pro User သာ အသုံးပြုနိုင်ပါသည်။</div>')+'</div>';
  }
  vSetBody(voiceErrorBanner()+b);
  setStickyActions([
    {label:'← Back',cls:'ghost',fn:function(){vCapture();vRenderInput();}},
    {label:'✨ ဖန်တီးရန်',cls:'primary',fn:vGenerate}
  ]);
}
function vGenerate(){
  vCapture();var m=VOICE_STATE.voiceMode;
  if(m==='text-to-voice'){vRunTts();}
  else if(m==='media-to-text'){
    if(VOICE_STATE.mediaOutput==='srt'){if(!vPro())return;VOICE_STATE.voiceResult=null;vRunSrt('media');}
    else vRunTranscribe();
  }else{vRunTranslation('translate');}
}

// ===== Step 3 — Generate (loading) =====
function vRenderLoading(msg,hint){
  VOICE_STATE.view='loading';vSetStep(3);renderChips();vSyncModelBar();
  setStickyActions([]);
  vSetBody(resultLoadingCard(msg,hint));
  showLoading(msg);
}
function composeVoiceText(){
  var I=VOICE_INPUTS,parts=[];
  var speaking=I.speaking.trim(),instruction=I.instruction.trim(),aud=(I.audience||'').trim();
  if(speaking)parts.push('[Speaking Style: '+speaking+']');
  if(instruction)parts.push('[Voice Instruction: '+instruction+']');
  if(aud)parts.push('[Target audience: '+aud+']');
  parts.push(I.tts.trim());
  return parts.join('\n\n');
}
function vRunTts(){
  var I=VOICE_INPUTS;
  if(!I.tts.trim()){toast('Voice ပြောင်းလိုသော စာသားကို ထည့်ပါ','error');vRenderInput();return;}
  VOICE_STATE.errorState=null;
  VOICE_STATE.voiceInput={text:I.tts,speakingStyle:I.speaking,voiceStyle:I.voice,instruction:I.instruction,audience:I.audience};
  var rid=++VOICE_REQUEST_ID;
  vRenderLoading('AI က သင့်အတွက် အသံကို ပြင်ဆင်နေသည်...',I.tts);
  api('/api/studio/voice/tts',{text:composeVoiceText(),voiceName:I.voice}).then(function(d){
    if(rid!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));
    LAST_AUDIO.base64=d.data;LAST_AUDIO.mime=d.mimeType||'audio/wav';
    VOICE_STATE.audioResult={data:d.data,mimeType:LAST_AUDIO.mime};
    VOICE_STATE.voiceResult=d;VOICE_STATE.srtResult=null;VOICE_STATE.translationResult=null;translatedSrt='';
    vRenderResult('audio');toast('✓ Voice ဖန်တီးပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(rid===VOICE_REQUEST_ID){hideLoading();vFail('tts',e);}});
}
function vRunTranscribe(){
  if(!MEDIA_AUDIO.base64){toast('Audio သို့မဟုတ် Video ဖိုင် ရွေးပါ','error');vRenderInput();return;}
  VOICE_STATE.errorState=null;
  var rid=++VOICE_REQUEST_ID;
  vRenderLoading('AI က သင့်အတွက် စာသားကို ဖန်တီးနေသည်...',MEDIA_AUDIO.fileName||'');
  api('/api/studio/voice/transcribe',{audioBase64:MEDIA_AUDIO.base64,mimeType:MEDIA_AUDIO.mime,type:'1'}).then(function(d){
    if(rid!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));
    if(!d.text||!String(d.text).trim())throw new Error('empty_transcription|စာသားရလဒ် ဗလာဖြစ်နေပါသည်');
    VOICE_STATE.voiceResult={text:d.text||''};VOICE_STATE.srtResult=null;VOICE_STATE.translationResult=null;translatedSrt='';
    vRenderResult('text');toast('✓ စာသားဖန်တီးပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(rid===VOICE_REQUEST_ID){hideLoading();vFail('text',e);}});
}
function vStartSrt(source){vSyncEdits();VOICE_STATE.srtSource=source;vRunSrt(source);}
function vRunSrt(source){
  if(!vPro())return;
  var b=source==='voice'?LAST_AUDIO:MEDIA_AUDIO;
  if(!b.base64){toast('SRT ထုတ်ဖို့ Audio/Video မရှိသေးပါ','error');return;}
  VOICE_STATE.errorState=null;VOICE_STATE.srtSource=source;
  var rid=++VOICE_REQUEST_ID;
  vRenderLoading('AI က သင့်အတွက် SRT စာတန်းထိုးကို ပြင်ဆင်နေသည်...','');
  api('/api/studio/voice/srt',{audioBase64:b.base64,mimeType:b.mime,type:'2',knownText:(source==='voice')?((VOICE_STATE.voiceInput&&VOICE_STATE.voiceInput.text)||VOICE_INPUTS.tts||''):''}).then(function(d){
    if(rid!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));
    if(!d.srt||!String(d.srt).trim())throw new Error('empty_transcription|SRT ရလဒ် ဗလာဖြစ်နေပါသည်');
    VOICE_STATE.srtResult=d.srt||'';VOICE_STATE.translationResult=null;translatedSrt='';
    vRenderResult('srt');toast('✓ SRT ပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(rid===VOICE_REQUEST_ID){hideLoading();vFail('srt',e);}});
}
function vRunTranslation(source){
  if(!vPro())return;
  vCapture();
  var srt=(source==='translate')?VOICE_INPUTS.srt:(VOICE_STATE.srtResult||'');
  if(!srt.trim()){toast('ဘာသာပြန်ဖို့ SRT မရှိသေးပါ','error');return;}
  VOICE_STATE.errorState=null;VOICE_STATE.transSource=source;
  var rid=++VOICE_REQUEST_ID;
  vRenderLoading('AI က သင့်အတွက် ဘာသာပြန်ကို ပြင်ဆင်နေသည်...',srt);
  api('/api/studio/voice/translate-srt',{srtText:srt,direction:VOICE_STATE.translationDirection,type:'2'}).then(function(d){
    if(rid!==VOICE_REQUEST_ID)return;
    hideLoading();
    if(d.error)throw new Error(d.error+'|'+(d.detail||''));
    translatedSrt=d.srt||'';VOICE_STATE.translationResult=translatedSrt;
    vRenderResult('translation');toast('✓ ဘာသာပြန်ပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(rid===VOICE_REQUEST_ID){hideLoading();vFail('translation',e);}});
}
// Error → သက်ဆိုင်ရာ ယခင် Screen သို့ Auto Back (Input / ရလဒ်များ မပျောက်စေရ)
function vFail(kind,e){
  var raw=(e&&e.message)||'',code=(raw.split('|')[0]||'').trim();
  var fb={
    tts:'အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    text:'စာသားဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    srt:'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    translation:'ဘာသာပြန်ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။'
  };
  var key={tts:'tts_error',text:'transcribe_error',srt:'srt_error',translation:'translate_error'}[kind];
  var msg=friendlyError({error:code||key,detail:raw.split('|').slice(1).join('|')},fb[kind]);
  console.error('Voice '+kind+' Error:',e);
  VOICE_STATE.errorState=msg;toast(msg,'error');
  if(kind==='srt')vBackFromSrt();
  else if(kind==='translation'){if(VOICE_STATE.transSource==='translate')vRenderFormat();else vRenderResult('srt');}
  else vRenderFormat();
  VOICE_STATE.errorState=null;
}
function vBackFromSrt(){
  var s=VOICE_STATE;vSyncEdits();
  if(s.srtSource==='voice'&&LAST_AUDIO.base64)vRenderResult('audio');
  else if(s.voiceResult&&typeof s.voiceResult.text==='string')vRenderResult('text');
  else vRenderFormat();
}

// ===== Step 4 — Result Hub (shared aicsResultHub) =====
function vPipeline(kind){
  var s=VOICE_STATE,m=s.voiceMode,p=[];
  var hasSrt=!!s.srtResult,hasTr=!!(s.translationResult||translatedSrt);
  if(m==='text-to-voice')p.push({label:'အသံ',done:true,current:kind==='audio'});
  else if(m==='media-to-text'&&(kind==='text'||(s.voiceResult&&typeof s.voiceResult.text==='string')))p.push({label:'စာသား',done:true,current:kind==='text'});
  if(m==='translate')p.push({label:'SRT',done:true});
  else p.push({label:'SRT',done:hasSrt,current:kind==='srt'});
  p.push({label:'ဘာသာပြန်',done:hasTr,current:kind==='translation'});
  return p;
}
function vRenderResult(kind){
  VOICE_STATE.view='result';VOICE_STATE.resultKind=kind;
  vSetStep(4);renderChips();vSyncModelBar();
  var fn={audio:vRenderAudioResult,text:vRenderTextResult,srt:vRenderSrtResult,translation:vRenderTranslationResult}[kind];
  fn();
}
// ===== GLOBAL RESULT UI — Voice results use the shared Global Result Box (media-safe, no collapse) =====
function vWrapResult(id,type){
  if(!window.aicsResultBox)return null;
  if(window.aicsResultBox.destroy)window.aicsResultBox.destroy(id);
  return window.aicsResultBox.create({id:id,type:type||'text',collapsible:false}).complete();
}
function vRenderAudioResult(){
  var url=URL.createObjectURL(base64Blob(LAST_AUDIO.base64,LAST_AUDIO.mime));LAST_AUDIO.url=url;
  var hub=aicsResultHub({
    pipeline:vPipeline('audio'),
    body:'<div class="audio-box" id="voiceAudioBox"><audio controls src="'+esc(url)+'"></audio></div>',
    tools:[{label:'💾 Download',fn:downloadVoiceAudio},{label:'💾 သိမ်းရန်',fn:saveVoiceCreation},{label:'↻ Retry',fn:vRunTts}],
    nextTitle:'ဒီရလဒ်နဲ့ ဆက်လုပ်ရန်',
    next:[{icon:'📄',label:'မူရင်း SRT ဖန်တီးရန်',desc:'Timestamp ပါသော subtitle',locked:USER_PLAN!=='PRO',fn:function(){vStartSrt('voice');}}]
  });
  vSetBody(voiceErrorBanner()+'<div class="vcard"><div class="vtitle">🎧 အသံ ရလဒ်</div>'+hub+'</div>');
  vWrapResult('voiceAudioBox','audio');
  setStickyActions([bReset(),{label:'← ပြင်ရန်',cls:'ghost',fn:vRenderFormat}]);
}
function vRenderTextResult(){
  var t=(VOICE_STATE.voiceResult&&VOICE_STATE.voiceResult.text)||'';
  var hub=aicsResultHub({
    pipeline:vPipeline('text'),
    body:'<p class="hint">စာသားကို လိုအပ်သလို ပြင်ဆင်နိုင်ပါသည်။</p><textarea id="textResult" class="result-text" oninput="autoGrow(this)">'+esc(t)+'</textarea>',
    tools:[{label:'📋 Copy',fn:function(){copyValue('textResult');}},{label:'💾 သိမ်းရန်',fn:saveTranscript},{label:'↻ Retry',fn:vRunTranscribe}],
    nextTitle:'ဒီရလဒ်နဲ့ ဆက်လုပ်ရန်',
    next:[
      {icon:'📄',label:'မူရင်း SRT ဖန်တီးရန်',desc:'Timestamp ပါသော subtitle',locked:USER_PLAN!=='PRO',fn:function(){vStartSrt('media');}},
      {icon:'🎙️',label:'ဒီစာသားကို အသံပြောင်းရန်',desc:'စာ → အသံ သို့ ဆက်သွားရန်',fn:vTextToVoiceFromText}
    ]
  });
  vSetBody(voiceErrorBanner()+'<div class="vcard"><div class="vtitle">📝 စာသား ရလဒ်</div>'+hub+'</div>');
  vWrapResult('textResult','text');
  setStickyActions([bReset(),{label:'← ပြင်ရန်',cls:'ghost',fn:vRenderFormat}]);
}
function vTextToVoiceFromText(){
  var t=val('textResult');if(!t.trim()){toast('စာသား မရှိပါ','error');return;}
  VOICE_INPUTS.tts=t;
  resetVoiceBranch('text-to-voice','');
  vRenderInput();
}
function vRenderSrtResult(){
  var src=VOICE_STATE.srtSource||'voice';
  var hub=aicsResultHub({
    pipeline:vPipeline('srt'),
    body:'<p class="hint">Timestamp များကို မူရင်းအတိုင်း ထိန်းသိမ်းထားပါသည်။ လိုအပ်သလို စာသားကို ပြင်နိုင်ပါသည်။</p><textarea class="srt-box" id="srtEditor" oninput="autoGrow(this)">'+esc(VOICE_STATE.srtResult||'')+'</textarea>',
    tools:[
      {label:'📋 Copy SRT',fn:function(){copyValue('srtEditor');}},
      {label:'💾 Save .srt',fn:function(){downloadValue('srtEditor','original_subtitle.srt');}},
      {label:'💾 သိမ်းရန်',fn:function(){saveSrtCreation('original');}},
      {label:'↻ Retry',fn:function(){vRunSrt(src);}}
    ],
    afterHtml:'<div class="form-group" style="margin-top:14px"><label>ဘာသာပြန်ဦးတည်ချက်</label>'+vDirSelect()+'</div>',
    nextTitle:'ဒီရလဒ်နဲ့ ဆက်လုပ်ရန်',
    next:[{icon:'🌐',label:'ဘာသာပြန်ဖန်တီးရန်',desc:'Number နှင့် Timestamp မပြောင်းပါ',locked:USER_PLAN!=='PRO',fn:function(){vSyncEdits();vRunTranslation(src);}}]
  });
  vSetBody(voiceErrorBanner()+'<div class="vcard"><div class="vtitle">📄 SRT ရလဒ်</div>'+hub+'</div>');
  vWrapResult('srtEditor','text');
  setStickyActions([bReset(),{label:'← နောက်သို့',cls:'ghost',fn:vBackFromSrt}]);
}
function vRenderTranslationResult(){
  var s=VOICE_STATE.translationResult||translatedSrt||'';
  var src=VOICE_STATE.transSource||'voice';
  var hub=aicsResultHub({
    pipeline:vPipeline('translation'),
    body:'<p class="hint">မူရင်း SRT Number နှင့် Timestamp များကို မပြောင်းထားပါ။</p><textarea class="srt-box" id="translatedEditor" oninput="autoGrow(this)">'+esc(s)+'</textarea>',
    tools:[
      {label:'📋 Copy SRT',fn:function(){copyValue('translatedEditor');}},
      {label:'💾 Save .srt',fn:function(){downloadValue('translatedEditor','translated_subtitle.srt');}},
      {label:'💾 သိမ်းရန်',fn:function(){saveSrtCreation('translated');}},
      {label:'↻ Retry',fn:function(){vRunTranslation(src);}}
    ],
    afterHtml:'<div class="form-group" style="margin-top:14px"><label>ဘာသာပြန်ဦးတည်ချက် (Retry အတွက်)</label>'+vDirSelect()+'</div>'
  });
  vSetBody(voiceErrorBanner()+'<div class="vcard"><div class="vtitle">🌐 ဘာသာပြန် ရလဒ်</div>'+hub+'</div>');
  vWrapResult('translatedEditor','text');
  setStickyActions([bReset(),{label:'← နောက်သို့',cls:'ghost',fn:function(){vSyncEdits();if(src==='translate')vRenderFormat();else vRenderResult('srt');}}]);
}

// ===== Shared small helpers =====
function downloadVoiceAudio(){
  if(!LAST_AUDIO.url){toast('Download လုပ်ဖို့ Audio မရှိပါ','error');return;}
  var a=document.createElement('a');a.href=LAST_AUDIO.url;a.download='voice_output.wav';document.body.appendChild(a);a.click();a.remove();
}
function autoGrow(x){if(!x)return;x.style.height='auto';x.style.height=Math.min(Math.max(x.scrollHeight,100),520)+'px';}
function copyValue(id){var x=document.getElementById(id),t=x?(x.value!==undefined?x.value:x.textContent):'';if(!t.trim()){toast('Copy လုပ်ဖို့ Result မရှိပါ','error');return;}if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast('✓ Copy ပြီးပါပြီ','success');});}
function downloadValue(id,name){var x=document.getElementById(id),t=x?x.value:'';if(!t.trim()){toast('Save လုပ်ဖို့ Result မရှိပါ','error');return;}var u=URL.createObjectURL(new Blob([t],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},500);}
function saveVoiceCreation(){
  var text=VOICE_INPUTS.tts||(VOICE_STATE.voiceInput&&VOICE_STATE.voiceInput.text);if(!text)return;
  var title=prompt('Creation အမည် ပေးပါ:',text.substring(0,40));if(title===null)return;
  AICS_CREATIONS.save({studio:'VOICE',type:'1',title:title||'Voice Text',original_prompt:text,ai_output:text,media_type:LAST_AUDIO.base64?'audio':'',media_mime:LAST_AUDIO.mime,media_data:LAST_AUDIO.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function saveTranscript(){
  var text=val('textResult');if(!text.trim()){toast('Save လုပ်ဖို့ Result မရှိပါ','error');return;}
  var title=prompt('Creation အမည် ပေးပါ:','Voice Transcript');if(title===null)return;
  AICS_CREATIONS.save({studio:'VOICETRANSCRIBE',type:'1',title:title||'Voice Transcript',original_prompt:'(Audio / Video transcription)',ai_output:text,media_type:MEDIA_AUDIO.base64?'audio':'',media_mime:MEDIA_AUDIO.mime||'',media_data:MEDIA_AUDIO.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function saveSrtCreation(kind){
  if(!vPro())return;
  vSyncEdits();
  var srt=kind==='translated'?(val('translatedEditor')||translatedSrt):val('srtEditor');
  if(!srt.trim()){toast('Save လုပ်ဖို့ SRT မရှိပါ','error');return;}
  var title=prompt('Creation အမည် ပေးပါ:',kind==='translated'?'Voice Translated SRT':'Voice Original SRT');if(title===null)return;
  var m=VOICE_STATE.voiceMode;
  var b=m==='media-to-text'?MEDIA_AUDIO:(m==='text-to-voice'?LAST_AUDIO:{base64:'',mime:''});
  var orig=m==='translate'?VOICE_INPUTS.srt:(VOICE_STATE.srtResult||'');
  AICS_CREATIONS.save({studio:'VOICE',type:'2',title:title||'Voice SRT',original_prompt:orig,ai_output:srt,media_type:b.base64?'audio':'',media_mime:b.mime||'',media_data:b.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}
function hydratePlan(){
  apiGet('/api/users/me').then(function(d){
    if(d.error){localStorage.removeItem('aics_token');location.reload();return;}
    USER_PLAN=d.plan||'FREE';var p=document.getElementById('sidePlan');if(p)p.textContent=USER_PLAN;
    renderChips();
  }).catch(function(){});
}
function apiGet(path){var h={};if(TOKEN)h.Authorization='Bearer '+TOKEN;return fetch(path,{headers:h}).then(function(r){return r.json();});}
// Content / Shop Studio မှ လွှဲပို့သော စာသား (aics_voice_transfer) ကို Input ထဲသို့ ထည့်သည်
function applyContentTransfer(){
  try{
    var raw=localStorage.getItem('aics_voice_transfer');if(!raw)return;
    var d=JSON.parse(raw);if(!d||!d.text)return;
    resetVoiceBranch('text-to-voice',d.source||'content');
    if(d.source==='ideas'){
      // Idea handoff replaces the Voice draft inputs as well as its previous result.
      VOICE_INPUTS={tts:d.text,speaking:'',voice:'Kore',instruction:'',audience:d.audience||'လူတိုင်း',srt:''};
      MEDIA_AUDIO={base64:'',mime:'',fileName:''};
    }else{
      VOICE_INPUTS.tts=d.text;
      if(d.speakingStyle)VOICE_INPUTS.speaking=d.speakingStyle;
      if(d.voiceStyle)VOICE_INPUTS.voice=d.voiceStyle;
      if(d.instruction)VOICE_INPUTS.instruction=d.instruction;
      if(d.audience)VOICE_INPUTS.audience=d.audience;
    }
    localStorage.removeItem('aics_voice_transfer');
    vRenderInput();saveDraft();
  }catch(e){}
}
function studioOnStep(){/* Voice Studio owns its own stepper; shared shell stepper is intentionally unused. */}
window.studioOnStep=studioOnStep;
function studioCollectDraft(){return{voiceState:VOICE_STATE,translation:translatedSrt};}
window.studioCollectDraft=studioCollectDraft;
function studioRestoreDraft(){/* Draft is restored by Voice Studio after its DOM is ready. */}
window.studioRestoreDraft=studioRestoreDraft;

function vResultAvailable(k){
  var s=VOICE_STATE;
  if(k==='audio')return !!LAST_AUDIO.base64;
  if(k==='text')return !!(s.voiceResult&&typeof s.voiceResult.text==='string');
  if(k==='srt')return !!s.srtResult;
  if(k==='translation')return !!(s.translationResult||translatedSrt);
  return false;
}
(function initVoice(){
  if(!TOKEN){document.getElementById('loginView').style.display='flex';document.getElementById('aicsApp').style.display='none';return;}
  hydratePlan();
  var restored=restoreDraft();
  if(!restored)resetVoiceBranch('text-to-voice','');
  var s=VOICE_STATE;
  if(restored&&s.view==='result'&&s.resultKind&&vResultAvailable(s.resultKind))vRenderResult(s.resultKind);
  else if(restored&&s.view==='format')vRenderFormat();
  else vRenderInput();
  applyContentTransfer();
  window.addEventListener('pagehide',function(){saveDraft();});
})();
`;
