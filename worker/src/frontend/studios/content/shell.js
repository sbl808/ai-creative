// AI Creative Studio — Content Studio / shell.js (V2 refactor)
// Browser-side shell — extracted VERBATIM from frontend/content.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const SHELL_SCRIPT = `// ===== Studio Shell Hooks =====
// Stepper = Main + Branch — MAP (System တစ်ခုလုံး) ကို UI တွင် မပြပါ
function studioOnStep(n){
  var backHub={label:'&#8592; Content ရလဒ်သို့ ပြန်ရန်',cls:'ghost',fn:backToContentResult};
  if(n===1){
    var acts=[{label:'Reset',cls:'ghost',fn:studioReset}];
    if(lastResult)acts.push({label:'Next &#8594;',cls:'secondary',fn:function(){csNav(2);}});
    acts.push({label:'&#10024; Content ရေးသားရန်',cls:'primary',fn:generateContent});
    studioSetActions(acts);
  }else if(n===2){
    studioSetActions([{label:'Reset',cls:'ghost',fn:studioReset},{label:'&#128203; Copy',cls:'ghost',fn:copyAllResult},{label:'&#128190; ဖန်တီးမှုသိမ်းပါ',cls:'purple',fn:saveContentResult}]);
  }else if(n===12){
    studioSetActions([backHub]);
  }else if(n===22){
    studioSetActions([backHub]);
  }else if(n===14||n===24){
    studioSetActions([backHub,{label:'&#128190; ဖန်တီးမှုသိမ်းပါ',cls:'purple',fn:saveContentResult}]);
  }
}
window.studioOnStep=studioOnStep;

function studioCollectDraft(){
  function val(id){var e=document.getElementById(id);return e?(e.value||''):'';}
  return {
    mode:CS_MODE,
    csCur:csCur,
    idea:val('ideaInput'),
    generationLevel:val('generationLevelSel')||'1',
    aud:val('audSel'),
    contentType:val('contentTypeSel'),
    tone:val('toneSel'),
    lang:val('langSel'),
    platform:val('platformSel'),
    product:val('productInput'),
    goal:val('goalInput'),
    cta:val('ctaInput'),
    keyPoints:val('keyPoints'),
    mainMessage:val('mainMessage'),
    length:val('lengthSel'),
    additionalInstr:val('additionalInstr'),
    byok:val('byokInput'),
    videoContent:val('videoContentText'),
    videoGenerationLevel:val('videoGenerationLevelSel')||'1',
    videoTypeSel:val('videoTypeSel'),
    videoDuration:val('videoDuration'),
    videoAspect:val('videoAspect'),
    videoVisualStyle:val('videoVisualStyle'),
    videoCameraStyle:val('videoCameraStyle'),
    videoMotion:val('videoMotion'),
    videoLanguage:val('videoLanguage'),
    videoSceneSettings:val('videoSceneSettings'),
    videoVisualSettings:val('videoVisualSettings'),
    videoReference:val('videoReference'),
    videoAdditionalInstructions:val('videoAdditionalInstructions'),
    videoByok:val('videoByokInput'),
    ttsText:val('ttsText'),
    voiceGender:currentVoiceGender(),
    voice:val('voiceSel'),
    effectiveVoice:effectiveVoiceName,
    audioVoiceStyle:val('audioVoiceStyleSel'),
    audioLang:val('audioLangSel'),
    audioSpeed:val('audioSpeed'),
    audioPitch:val('audioPitch'),
    audioDirection:val('audioDirection'),
    audioEmotion:val('audioEmotion'),
    audioPronunciation:val('audioPronunciation'),
    srt:val('resultSrt'),
    srtTranslated:val('resultSrtTranslated'),
    direction:currentDirection,
    lastResult:lastResult,
    videoPlan:videoPlan,
    audio:currentAudioBase64
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  function setVal(id,v){if(v!==undefined&&v!==null&&document.getElementById(id))document.getElementById(id).value=v;}
  setVal('ideaInput',d.idea);
  setVal('generationLevelSel',d.generationLevel||d.type||'1');
  setVal('audSel',d.aud);
  var audEl=document.getElementById('audSel');if(audEl)window.aichAud=audEl.value;
  setVal('contentTypeSel',d.contentType);
  setVal('toneSel',d.tone);
  setVal('langSel',d.lang);
  setVal('platformSel',d.platform);
  setVal('productInput',d.product);
  setVal('goalInput',d.goal);
  setVal('ctaInput',d.cta);
  setVal('keyPoints',d.keyPoints);
  setVal('mainMessage',d.mainMessage);
  setVal('lengthSel',d.length);
  setVal('additionalInstr',d.additionalInstr);
  setVal('byokInput',d.byok);
  setVal('videoContentText',d.videoContent);
  setVal('videoGenerationLevelSel',d.videoGenerationLevel||d.videoType||'1');
  setVal('videoTypeSel',d.videoTypeSel);
  setVal('videoDuration',d.videoDuration);
  setVal('videoAspect',d.videoAspect);
  setVal('videoVisualStyle',d.videoVisualStyle);
  setVal('videoCameraStyle',d.videoCameraStyle);
  setVal('videoMotion',d.videoMotion);
  setVal('videoLanguage',d.videoLanguage);
  setVal('videoSceneSettings',d.videoSceneSettings);
  setVal('videoVisualSettings',d.videoVisualSettings);
  setVal('videoReference',d.videoReference);
  setVal('videoAdditionalInstructions',d.videoAdditionalInstructions);
  setVal('videoByokInput',d.videoByok);
  setVal('ttsText',d.ttsText);
  var oldEff=d.effectiveVoice||'';
  var gender=d.voiceGender||(oldEff&&FEMALE_VOICE_NAMES.indexOf(oldEff)>=0?'female':'male');
  var radios=document.querySelectorAll('input[name="audioGender"]');
  for(var ri=0;ri<radios.length;ri++)radios[ri].checked=(radios[ri].value===gender);
  var selVoice=d.voice||oldEff||(gender==='female'?'Kore':'Puck');
  effectiveVoiceName=selVoice;
  renderVoiceOptions(gender,selVoice);
  var ev=document.getElementById('effectiveVoiceLabel');if(ev)ev.textContent=effectiveVoiceName;
  setVal('audioVoiceStyleSel',d.audioVoiceStyle);
  setVal('audioLangSel',d.audioLang);
  setVal('audioSpeed',d.audioSpeed);
  setVal('audioPitch',d.audioPitch);
  setVal('audioDirection',d.audioDirection);
  setVal('audioEmotion',d.audioEmotion);
  setVal('audioPronunciation',d.audioPronunciation);
  updateConditionalFields();
  setVal('resultSrt',d.srt);
  setVal('resultSrtTranslated',d.srtTranslated);
  if(d.direction)currentDirection=d.direction;
  lastResult=d.lastResult||null;
  videoPlan=d.videoPlan||null;
  currentAudioBase64=d.audio||null;
  contentState.result=lastResult;
  if(lastResult){
    renderContentResult(true);
    csMarkDone(1);
    csMarkDone(2);
  }
  if(videoPlan){
    renderVideoPlan(videoPlan);
    document.getElementById('videoResult').style.display='block';
    csMarkDone(12);
    csMarkDone(14);
    var vp=document.getElementById('videoContentPreview');
    if(vp&&videoState.content)vp.textContent=videoState.content;
  }
  if(currentAudioBase64){
    var audioUrl='data:audio/wav;base64,'+currentAudioBase64;
    document.getElementById('audioContainer').innerHTML='<audio controls src="'+audioUrl+'"></audio><div class="btn-row"><button class="btn-ghost" onclick="downloadAudio()">&#128190; Save Audio</button></div>';
    csMarkDone(22);
    csMarkDone(24);
    var ap=document.getElementById('audioContentPreview');
    if(ap&&audioState.content)ap.textContent=audioState.content;
  }
  if(d.mode&&CS_STEPS[d.mode]){
    CS_MODE=d.mode;
  }
  csRenderStepper();
  var target=d.csCur||1;
  var m=csMeta(target);
  if(!m||m.lock||!csAllowed(target)){
    var steps=csModeSteps();
    target=steps[steps.length-1].n;
    if(csMeta(target).lock)target=steps[steps.length-2].n;
    if(!csAllowed(target))target=1;
  }
  csCur=target;
  csShow(target);
}
window.studioRestoreDraft=studioRestoreDraft;

// ===== Boot (Shell ပြီးမှ Main + Branch Stepper ကို ကိုယ်ပိုင်ဖြင့် ပြန်ဆောက်သည်) =====
function csBoot(){
  csRenderStepper();
  csShow(csCur);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',csBoot);
else csBoot();
`;
