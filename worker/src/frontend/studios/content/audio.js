// AI Creative Studio — Content Studio / audio.js (V2 refactor)
// Browser-side audio — extracted VERBATIM from frontend/content.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const AUDIO_SCRIPT = `// ===== Audio Branch — Voice Selection (Gender → Voice — Section 6 Single Dropdown) =====
function renderVoiceOptions(kind, selected){
  var list=(kind==='female')?FEMALE_VOICES:MALE_VOICES;
  var sel=document.getElementById('voiceSel');
  if(!sel)return;
  sel.innerHTML=voiceOptionHtml(list, selected||effectiveVoiceName||'Puck');
}
function setVoiceGender(kind){
  var def=(kind==='female')?'Kore':'Puck';
  effectiveVoiceName=def;
  renderVoiceOptions(kind,def);
  var ind=document.getElementById('effectiveVoiceLabel');
  if(ind)ind.textContent=effectiveVoiceName;
}
function setEffectiveVoice(){
  var sel=document.getElementById('voiceSel');
  if(sel&&sel.value)effectiveVoiceName=sel.value;
  var ind=document.getElementById('effectiveVoiceLabel');
  if(ind)ind.textContent=effectiveVoiceName;
}
function currentVoiceGender(){
  var r=document.querySelector('input[name="audioGender"]:checked');
  return r&&r.value==='female'?'female':'male';
}
function collectAudioExtras(){
  var parts=[];
  function val(id){var e=document.getElementById(id);return e?(e.value||'').trim():'';}
  var vs=val('audioVoiceStyleSel'); if(vs)parts.push('Voice Style: '+vs);
  var lang=val('audioLangSel'); if(lang)parts.push('Language: '+lang);
  var sp=val('audioSpeed'); if(sp)parts.push('Speed: '+sp);
  var pt=val('audioPitch'); if(pt)parts.push('Pitch: '+pt);
  var dir=val('audioDirection'); if(dir)parts.push('Voice Direction:\\n'+dir);
  var em=val('audioEmotion'); if(em&&em!=='Neutral')parts.push('Emotion: '+em);
  var pr=val('audioPronunciation'); if(pr)parts.push('Pronunciation:\\n'+pr);
  return parts;
}

// ===== Audio Branch — Generate Voice (Step 22 → 24 Result — Unified Result Loading) =====
function generateVoice(){
  if(csBusy)return;
  var text=(document.getElementById('ttsText').value||'').trim();
  if(!text){showError('voiceError','Text ထည့်ပါ (သို့မဟုတ် Content ကို အရင်ဖန်တီးပါ)။');return;}
  var voiceName=effectiveVoiceName||'Kore';
  var extras=collectAudioExtras();
  var byok=(document.getElementById('byokInput')||{value:''}).value.trim();
  hideError('voiceError'); hideError('voiceError2');
  document.getElementById('voiceRetryRow').style.display='none';
  audioState.content=text;
  audioState.input={voiceName:voiceName,voiceGender:currentVoiceGender(),settings:extras};
  audioState.status='processing';
  csBusy=true;
  setGenButtonsDisabled(true);
  csMarkDone(22);
  // Unified: Audio Result section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('audioLoading','AI က သင့်အတွက် အသံကို ပြင်ဆင်နေသည်...',text);
  var ac=document.getElementById('audioContainer');if(ac)ac.innerHTML='';
  csGoForce(24);
  setLoading('voiceGenLoading',true);
  document.getElementById('voiceBtn').disabled=true;
  var gl=(document.getElementById('generationLevelSel')||{}).value||'1';
  var body={text:text,voiceName:voiceName,generationLevel:gl};
  if(extras.length)body.settings=extras;
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/tts',body)
    .then(function(data){
      currentAudioBase64=data.data;
      audioState.result={data:data.data,mimeType:data.mimeType||'audio/wav'};
      audioState.status='done';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('audioLoading');
      var audioUrl='data:'+(data.mimeType||'audio/wav')+';base64,'+data.data;
      var container=document.getElementById('audioContainer');
      container.innerHTML='<audio controls src="'+audioUrl+'"></audio>'+
        '<div class="btn-row"><button class="btn-ghost" onclick="downloadAudio()">&#128190; Save Audio</button></div>';
      csMarkDone(22);
      csMarkDone(24);
      showToastMsg('&#10004; အသံပြီးပါပြီ');
      csGoForce(24);
    })
    .catch(function(err){
      console.error(err);
      audioState.status='error';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('audioLoading');
      showError('voiceError2','အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ပြန်လည်ကြိုးစားပါ။');
      document.getElementById('voiceRetryRow').style.display='flex';
      csUnmarkDone(24);
      showToastMsg('⚠️ အသံဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ');
    })
    .finally(function(){setLoading('voiceGenLoading',false);setGenButtonsDisabled(false);document.getElementById('voiceBtn').disabled=false;csBusy=false;});
}
function downloadAudio(){
  if(!currentAudioBase64)return;
  var byteChars=atob(currentAudioBase64);
  var byteNumbers=new Array(byteChars.length);
  for(var i=0;i<byteChars.length;i++)byteNumbers[i]=byteChars.charCodeAt(i);
  var blob=new Blob([new Uint8Array(byteNumbers)],{type:'audio/wav'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='content_voice.wav';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== SRT & Translate (Existing — Audio Result တွင် ဆက်သုံးသည်) =====
function generateSrt(){
  if(csBusy)return;
  if(!currentAudioBase64){showError('srtError','အရင် Generate Voice ကို နှိပ်ပါ — Audio မရှိသေးပါ။');return;}
  var byok=(document.getElementById('byokInput')||{value:''}).value.trim();
  hideError('srtError');
  csBusy=true;
  setGenButtonsDisabled(true);
  setLoading('srtLoading',true);
  document.getElementById('srtBtn').disabled=true;
  var body={audioBase64:currentAudioBase64,mimeType:'audio/wav'};
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/srt',body)
    .then(function(data){
      document.getElementById('resultSrt').value=data.srt||'';
    })
    .catch(function(err){
      console.error(err);
      showError('srtError','SRT ထုတ်ရာတွင် အခက်အခဲရှိနေပါသည်။ ပြန်ကြိုးစားပါ။');
    })
    .finally(function(){setLoading('srtLoading',false);setGenButtonsDisabled(false);document.getElementById('srtBtn').disabled=false;csBusy=false;});
}
function selectDirection(chip){
  var chips=document.querySelectorAll('.direction-chip');
  for(var i=0;i<chips.length;i++)chips[i].classList.remove('selected');
  chip.classList.add('selected');
  currentDirection=chip.getAttribute('data-dir');
}
function translateSrt(){
  if(csBusy)return;
  var srtText=(document.getElementById('resultSrt').value||'').trim();
  if(!srtText){showError('translateError','မူရင်း SRT မရှိသေးပါ — Generate SRT ကို အရင်နှိပ်ပါ။');return;}
  var byok=(document.getElementById('byokInput')||{value:''}).value.trim();
  hideError('translateError');
  csBusy=true;
  setGenButtonsDisabled(true);
  setLoading('translateLoading',true);
  document.getElementById('translateBtn').disabled=true;
  var body={srtText:srtText,direction:currentDirection};
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/translate-srt',body)
    .then(function(data){
      document.getElementById('resultSrtTranslated').value=data.srt||'';
      document.getElementById('translatedLabel').style.display='block';
    })
    .catch(function(err){
      console.error(err);
      showError('translateError','ဘာသာပြန်ရာတွင် အခက်အခဲရှိနေပါသည်။ ပြန်ကြိုးစားပါ။');
    })
    .finally(function(){setLoading('translateLoading',false);setGenButtonsDisabled(false);document.getElementById('translateBtn').disabled=false;csBusy=false;});
}
function downloadSrt(elementId,filename){
  var text=document.getElementById(elementId).value;
  if(!text||!text.trim()){showToastMsg('SRT မရှိသေးပါ');return;}
  var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Result — Save / Copy / Export (Existing ကို မဖျက်ပါ) =====
function buildResultText(){
  var parts=[];
  if(lastResult&&lastResult.content)parts.push('CONTENT\\n======================\\n'+lastResult.content);
  if(lastResult&&lastResult.speakingStyle)parts.push('SPEAKING STYLE\\n======================\\n'+lastResult.speakingStyle);
  if(lastResult&&lastResult.voiceStyle)parts.push('VOICE STYLE\\n======================\\n'+lastResult.voiceStyle);
  if(videoPlan&&videoPlan.characters&&videoPlan.characters.length){
    var cp='CHARACTERS\\n======================\\n';
    for(var i=0;i<videoPlan.characters.length;i++){
      var c=videoPlan.characters[i];
      cp+='\\n'+(c.name||'Character '+(i+1))+': '+(c.description||'');
    }
    parts.push(cp);
  }
  if(videoPlan&&videoPlan.scenes&&videoPlan.scenes.length){
    var sp='VIDEO PLAN SCENES\\n======================\\n';
    for(var j=0;j<videoPlan.scenes.length;j++){
      var s=videoPlan.scenes[j];
      sp+='\\nScene '+(s.number||(j+1))+(s.duration?' ('+s.duration+')':'')+'\\n';
      if(s.description)sp+='Description: '+s.description+'\\n';
      if(s.visualPrompt)sp+='Visual Prompt: '+s.visualPrompt+'\\n';
      if(s.dialogue)sp+='Dialogue: '+s.dialogue+'\\n';
    }
    parts.push(sp);
  }
  return parts.join('\\n\\n');
}
function saveContentResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var idea=(document.getElementById('ideaInput').value.trim()||'Content Result').substring(0,40);
  var title=prompt('Creation အမည် ပေးပါ:',idea);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'CONTENT',type:document.getElementById('generationLevelSel').value,title:title||idea,original_prompt:document.getElementById('ideaInput').value,ai_output:text})
    .then(function(){showToastMsg('&#128190; My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToastMsg('Save မအောင်မြင်ပါ: '+(err&&err.message||'Error'));});
}
function copyAllResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function exportResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Export လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='content_result.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  showToastMsg('&#10004; Export ပြီးပါပြီ');
}
function copyToClipboard(text){
  if(!text){showToastMsg('Text မရှိပါ');return;}
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}

`;
