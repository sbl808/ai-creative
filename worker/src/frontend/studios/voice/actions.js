// AI Creative Studio — Voice Studio / actions.js (TTS-only workflow)
// Voice Studio သည် Text-to-Voice ကိုသာ ကိုင်တွယ်ပြီး Subtitle လုပ်ဆောင်ချက်များကို Subtitle Studio တွင် သီးခြားထားသည်။
// NOTE: String.raw အတွင်း backtick နှင့် dollar-brace မသုံးရ (Browser script string ဖြစ်၍)။
export const ACTIONS_SCRIPT = String.raw`
function vEl(id){return document.getElementById(id);}
function setStickyActions(list){if(window.studioSetActions)studioSetActions(list);}
function voiceReset(){
  if(!confirm('ဤ Studio ရဲ့ အချက်အလက်အားလုံးကို ဖျက်ပြီး အစကပြန်စမလား?'))return;
  var removeDraft=window.AICS_STUDIO_DRAFTS?window.AICS_STUDIO_DRAFTS.remove('voice'):Promise.resolve();
  removeDraft.then(function(){
    try{localStorage.removeItem(voiceDraftKey);localStorage.removeItem('aics_voice_workflow_v2');localStorage.removeItem('aics_draft_voice');localStorage.removeItem('aics_voice_transfer');}catch(e){}
    location.reload();
  }).catch(function(){toast('IndexedDB ထဲမှ Voice Draft ဖျက်မအောင်မြင်ပါ','error');});
}
function bReset(){return {label:'Reset',cls:'ghost',fn:voiceReset};}



// ===== Body / Stepper / Chips =====
function vSetBody(html){vEl('voiceWorkflowBody').innerHTML=html;vFill();}
function vSetStep(n){VOICE_STATE.voiceStep=n;renderStepper(VOICE_STEPS,n);var status=vEl('voiceStatus'),step=VOICE_STEPS.filter(function(x){return x.n===n;})[0];if(status&&step)status.textContent='အဆင့် '+n+' / '+VOICE_STEPS.length+' — '+step.label;}
function renderStepper(items,current){var c=vEl('voiceStepper'),h='';if(!c)return;h+='<ol class="voice-step-list" role="list">';items.forEach(function(x){var cls=x.n===current?'active':(x.n<current?'done':'');h+='<li class="vstep '+cls+'" role="listitem" data-step="'+x.n+'"'+(x.n===current?' aria-current="step"':'')+'>'+(x.n<current?'✓ ':'')+esc(x.label)+'</li>';});h+='</ol>';c.innerHTML=h;var active=c.querySelector('.vstep.active');if(active&&window.studioScrollElementIntoView)window.studioScrollElementIntoView(active,'#voiceStepper',true);}
function vClearValidation(el){if(!el)return;el.removeAttribute('aria-invalid');var id=el.getAttribute('aria-describedby');if(id){var note=vEl(id);if(note&&note.classList.contains('field-error'))note.remove();el.removeAttribute('aria-describedby');}}
function vShowValidation(id,message){var el=vEl(id);if(!el)return;vClearValidation(el);el.setAttribute('aria-invalid','true');var note=document.createElement('p');note.className='field-error';note.id=id+'Error';note.setAttribute('role','alert');note.textContent=message;el.insertAdjacentElement('afterend',note);el.setAttribute('aria-describedby',note.id);el.focus();var status=vEl('voiceStatus');if(status)status.textContent=message;}

// TTS Model ကို Action Bar ရှိ aiModelSel မှ ရွေးချယ်သည်။


function resetVoiceBranch(source){var previous=VOICE_STATE||{},next=newVoiceState('text-to-voice',source||'');['voiceResult','srtResult','translationDirection','translationResult','mediaOutput','srtSource','transSource'].forEach(function(key){if(Object.prototype.hasOwnProperty.call(previous,key))next[key]=previous[key];});VOICE_STATE=next;LAST_AUDIO={base64:'',mime:'audio/wav',url:''};}


// ===== Form values (Step / Mode ပြောင်းလည်း မပျောက်စေရန်) =====

function vCapture(){var I=VOICE_INPUTS;[['ttsText','tts'],['speakingStyle','speaking'],['voiceName','voice'],['voiceInstruction','instruction'],['audience','audience']].forEach(function(p){var x=vEl(p[0]);if(x&&x.value!==undefined)I[p[1]]=x.value;});}
function vFill(){var I=VOICE_INPUTS,map={ttsText:I.tts,speakingStyle:I.speaking,voiceName:I.voice,voiceInstruction:I.instruction,audience:I.audience};Object.keys(map).forEach(function(id){var x=vEl(id);if(x&&map[id]!=null)x.value=map[id];});['ttsText','speakingStyle','voiceInstruction'].forEach(function(id){autoGrow(vEl(id));});}

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



// ===== Step 1 — Input =====
function vRenderInput(){VOICE_STATE.view='input';vSetStep(1);var b='<div class="vcard"><div class="vtitle">📝 စာသား</div><p class="hint">Voice အဖြစ် ဖန်တီးလိုသော စာသားကို ထည့်ပါ။</p>'+(VOICE_STATE.source?'<div class="source-note">Content Studio မှ နောက်ဆုံးပြင်ထားသော Content ကို အလိုအလျောက် ထည့်ပေးထားပါသည်။</div>':'')+'<div class="form-group"><label for="ttsText">စာသားအကြောင်းအရာ *</label><textarea id="ttsText" required aria-required="true" placeholder="Voice ပြောင်းလိုသော Text ကို ထည့်ပါ" data-voice-input="grow-clear"></textarea></div><div class="btn-row voice-space-top-0"><button type="button" class="btn ghost" data-voice-action="paste" data-voice-target="ttsText">📋 Paste</button><button type="button" class="btn ghost" data-voice-action="example">✨ ဥပမာ</button></div></div>';vSetBody(voiceErrorBanner()+b);setStickyActions([bReset(),{label:'Next →',cls:'primary',fn:vInputNext}]);}
function vInputNext(){vCapture();if(!VOICE_INPUTS.tts.trim()){vShowValidation('ttsText','Voice ပြောင်းလိုသော စာသားကို ထည့်ပါ။');return;}vRenderFormat();}

// ===== Step 2 — Format =====

function vRenderFormat(){VOICE_STATE.view='format';vSetStep(2);var b='<div class="vcard"><div class="vtitle">🎚️ အသံပုံစံ</div><p class="hint">အသံနှင့် စကားပြောပုံစံကို ရွေးပါ။ AI Model ကို အောက်ဆုံးဘားမှာ ရွေးနိုင်ပါသည်။</p><div class="source-note">“'+esc(shortHint(VOICE_INPUTS.tts))+'”</div><div class="form-group"><label for="voiceName">Voice Style</label><select id="voiceName">'+voiceOptions()+'</select></div><div class="form-group"><label for="speakingStyle">Speaking Style</label><textarea id="speakingStyle" placeholder="ဥပမာ - နူးညံ့စွာ၊ တက်ကြွစွာ၊ သဘာဝကျစွာ ပြောပါ" data-voice-input="grow"></textarea></div><div class="form-group"><label for="voiceInstruction">ညွှန်ကြားချက် (Optional)</label><textarea id="voiceInstruction" placeholder="AI အသံအတွက် ထပ်မံညွှန်ကြားလိုသည်များ" data-voice-input="grow"></textarea></div><div class="form-group"><label for="audience">ပရိသတ်</label><select id="audience"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select></div></div>';vSetBody(voiceErrorBanner()+b);setStickyActions([{label:'← Back',cls:'ghost',fn:function(){vCapture();vRenderInput();}},{label:'✨ ဖန်တီးရန်',cls:'primary',fn:vGenerate}]);}
function vGenerate(){vCapture();vRunTts();}

// ===== Step 3 — Generate (loading) =====
function vRenderLoading(msg,hint){VOICE_STATE.view='loading';vSetStep(3);setStickyActions([]);vSetBody(resultLoadingCard(msg,hint));showLoading(msg);}
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
    
    vRenderResult('audio');toast('✓ Voice ဖန်တီးပြီးပါပြီ','success');saveDraft();
  }).catch(function(e){if(rid===VOICE_REQUEST_ID){hideLoading();vFail('tts',e);}});
}




// Error → သက်ဆိုင်ရာ ယခင် Screen သို့ Auto Back (Input / ရလဒ်များ မပျောက်စေရ)
function vFail(kind,e){var raw=(e&&e.message)||'',code=(raw.split('|')[0]||'').trim();var msg=friendlyError({error:code||'tts_error',detail:raw.split('|').slice(1).join('|')},'အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။');VOICE_STATE.errorState=msg;toast(msg,'error');vRenderFormat();VOICE_STATE.errorState=null;}


// ===== Step 4 — Result Hub (shared aicsResultHub) =====
function vPipeline(){return [{label:'အသံ',done:true,current:true}];}
function vRenderResult(){VOICE_STATE.view='result';VOICE_STATE.resultKind='audio';vSetStep(4);vRenderAudioResult();}
// ===== GLOBAL RESULT UI — Voice results use the shared Global Result Box (media-safe, no collapse) =====
function vWrapResult(id,type){
  if(!window.aicsResultBox)return null;
  if(window.aicsResultBox.destroy)window.aicsResultBox.destroy(id);
  return window.aicsResultBox.create({id:id,type:type||'text',collapsible:false}).complete();
}
function vRenderAudioResult(){var url=URL.createObjectURL(base64Blob(LAST_AUDIO.base64,LAST_AUDIO.mime));LAST_AUDIO.url=url;var hub=aicsResultHub({pipeline:vPipeline(),body:'<div class="audio-box" id="voiceAudioBox"><audio controls src="'+esc(url)+'"></audio></div>',tools:[{label:'💾 Download',fn:downloadVoiceAudio},{label:'💾 သိမ်းရန်',fn:saveVoiceCreation},{label:'↻ Retry',fn:vRunTts}]});vSetBody(voiceErrorBanner()+'<div class="vcard"><div class="vtitle">🎧 အသံ ရလဒ်</div>'+hub+'</div>');vWrapResult('voiceAudioBox','audio');setStickyActions([bReset(),{label:'← ပြင်ရန်',cls:'ghost',fn:vRenderFormat}]);}





// ===== Shared small helpers =====
function downloadVoiceAudio(){
  if(!LAST_AUDIO.url){toast('Download လုပ်ဖို့ Audio မရှိပါ','error');return;}
  var a=document.createElement('a');a.href=LAST_AUDIO.url;a.download='voice_output.wav';document.body.appendChild(a);a.click();a.remove();
}
function autoGrow(x){if(!x)return;x.style.height='auto';x.style.height=Math.min(Math.max(x.scrollHeight,100),520)+'px';}


function saveVoiceCreation(){
  var text=VOICE_INPUTS.tts||(VOICE_STATE.voiceInput&&VOICE_STATE.voiceInput.text);if(!text)return;
  var title=prompt('Creation အမည် ပေးပါ:',text.substring(0,40));if(title===null)return;
  AICS_CREATIONS.save({studio:'VOICE',type:'1',title:title||'Voice Text',original_prompt:text,ai_output:text,media_type:LAST_AUDIO.base64?'audio':'',media_mime:LAST_AUDIO.mime,media_data:LAST_AUDIO.base64||''}).then(function(){toast('💾 Save ပြီးပါပြီ','success');}).catch(function(){toast('Save မအောင်မြင်ပါ','error');});
}


function hydratePlan(){
  apiGet('/api/users/me').then(function(d){
    if(d.error){localStorage.removeItem('aics_token');location.reload();return;}
    USER_PLAN=d.plan||'FREE';var p=document.getElementById('sidePlan');if(p)p.textContent=USER_PLAN;
  
  }).catch(function(){});
}
function apiGet(path){var h={};if(TOKEN)h.Authorization='Bearer '+TOKEN;return fetch(path,{headers:h}).then(function(r){return r.json();});}
// Content / Shop Studio မှ လွှဲပို့သော စာသား (aics_voice_transfer) ကို Input ထဲသို့ ထည့်သည်
function applyContentTransfer(){
  try{
    var raw=localStorage.getItem('aics_voice_transfer');if(!raw)return;
    var d=JSON.parse(raw);if(!d||!d.text)return;
    resetVoiceBranch(d.source||'content');
    if(d.source==='ideas'){
      // Replace active TTS inputs but preserve legacy Subtitle draft fields until Task 5D migrates them.
       VOICE_INPUTS=Object.assign({},VOICE_INPUTS,{tts:d.text,speaking:'',voice:'Kore',instruction:'',audience:d.audience||'လူတိုင်း'});
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

function vResultAvailable(k){return k==='audio'&&!!LAST_AUDIO.base64;}
function vHandleDelegatedAction(event){
  var target=event.target;
  if(!target||!target.closest)return;
  var action=target.closest('[data-voice-action]');
  if(!action)return;
  var name=action.getAttribute('data-voice-action');
  if(name==='paste')vPasteInto(action.getAttribute('data-voice-target'));
  else if(name==='example')vExample();
}
function vHandleDelegatedInput(event){
  var target=event.target;
  if(!target||!target.matches)return;
  var action=target.getAttribute('data-voice-input');
  if(action==='grow'||action==='grow-clear')autoGrow(target);
  if(action==='grow-clear')vClearValidation(target);
}
function vHandleDelegatedChange(event){
  var target=event.target;
  if(!target||!target.matches)return;
  var action=target.getAttribute('data-voice-change');
  if(action==='clear-validation')vClearValidation(target);

}
(function initVoice(){
  if(!TOKEN){document.getElementById('loginView').style.display='flex';document.getElementById('aicsApp').style.display='none';return;}
  hydratePlan();
  document.addEventListener('click',vHandleDelegatedAction);
  document.addEventListener('input',vHandleDelegatedInput);
  document.addEventListener('change',vHandleDelegatedChange);
  document.addEventListener('input',function(){voiceDraftTouchedBeforeRestore=true;scheduleVoiceDraftSave();},true);
  document.addEventListener('change',function(){voiceDraftTouchedBeforeRestore=true;scheduleVoiceDraftSave();},true);
  restoreDraft().then(function(restored){
    if(!restored)resetVoiceBranch('');
    var s=VOICE_STATE;
    // Older Voice drafts may contain Subtitle data. Keep legacy fields intact
    // for migration; the active Voice UI and actions are Text-to-Voice only.
    if(s.voiceMode!=='text-to-voice'){
      s.voiceMode='text-to-voice';
      s.view='input';
      s.resultKind=null;
      s.voiceStep=1;
    }
    if(restored&&s.view==='result'&&s.resultKind==='audio'&&vResultAvailable('audio'))vRenderResult('audio');
    else if(restored&&s.view==='format')vRenderFormat();
    else vRenderInput();
    applyContentTransfer();
    if(voiceDraftTouchedBeforeRestore)saveDraft();
  }).catch(function(){
    resetVoiceBranch('');
    vRenderInput();
  });
  window.addEventListener('pagehide',function(){saveDraft();});
})();
`;
