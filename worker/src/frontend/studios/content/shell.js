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
  if(window.studioPersistDraft)window.studioPersistDraft(false);
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
    lastResult:lastResult,
    approvedContent:contentState.approvedContent||'',
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
  // Never restore legacy plaintext API keys from browser drafts.
  setVal('byokInput','');
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
  setVal('videoByokInput','');
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
  lastResult=d.lastResult||null;
  videoPlan=d.videoPlan||null;
  currentAudioBase64=d.audio||null;
  contentState.result=lastResult;
  contentState.approvedContent=(typeof d.approvedContent==='string')?d.approvedContent:'';
  if(lastResult){
    renderContentResult(true);
    csMarkDone(1);
    csMarkDone(2);
  }
  if(videoPlan){
    renderVideoPlan(videoPlan);
    setContentVisible(document.getElementById('videoResult'),true,'cs-display-block');
    if(isContentApproved()){csMarkDone(12);csMarkDone(14);}
    var vp=document.getElementById('videoContentPreview');
    if(vp&&videoState.content)vp.textContent=videoState.content;
  }
  if(currentAudioBase64){
    var audioUrl='data:audio/wav;base64,'+currentAudioBase64;
    document.getElementById('audioContainer').innerHTML='<audio controls src="'+audioUrl+'"></audio><div class="btn-row"><button class="btn-ghost" data-aics-action="download-audio">&#128190; Save Audio</button></div>';
    if(isContentApproved()){csMarkDone(22);csMarkDone(24);}
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
  renderApprovalState();
}
window.studioRestoreDraft=studioRestoreDraft;

// ===== User Approval Gate — Content must be approved before Video / Audio =====
function isContentApproved(){
  var current=getEditedContent();
  return !!(current&&contentState.approvedContent&&contentState.approvedContent===current);
}
function ensureContentApprovalUI(){
  var row=document.getElementById('resultActionsRow');
  if(!row||!row.parentNode)return;
  if(document.getElementById('contentApprovalPanel'))return;
  var panel=document.createElement('div');
  panel.id='contentApprovalPanel';
  panel.className='btn-row content-approval-panel cs-hidden';
  panel.innerHTML='<span id="contentApprovalStatus" role="status" aria-live="polite">အတည်ပြုရန် လိုအပ်ပါသည်</span><button type="button" id="approveContentBtn" class="btn btn-secondary">Content ကို အတည်ပြုရန်</button>';
  row.parentNode.insertBefore(panel,row);
  document.getElementById('approveContentBtn').addEventListener('click',approveContent);
}
function renderApprovalState(){
  ensureContentApprovalUI();
  var panel=document.getElementById('contentApprovalPanel');
  var status=document.getElementById('contentApprovalStatus');
  var approveBtn=document.getElementById('approveContentBtn');
  var approved=isContentApproved();
  if(panel){panel.classList.toggle('cs-hidden',!lastResult);panel.classList.toggle('cs-display-flex',!!lastResult);}
  if(status)status.textContent=approved?'အတည်ပြုပြီးပါပြီ — နောက်အဆင့်သို့ ဆက်နိုင်ပါသည်':'Content ကို စစ်ဆေးပြီး အတည်ပြုရန် လိုအပ်ပါသည်';
  if(approveBtn){approveBtn.disabled=approved;approveBtn.textContent=approved?'✓ အတည်ပြုပြီး':'Content ကို အတည်ပြုရန်';}
  var branchButtons=document.querySelectorAll('[data-aics-action="open-branch"]');
  for(var i=0;i<branchButtons.length;i++){
    branchButtons[i].disabled=!approved;
    branchButtons[i].setAttribute('aria-disabled',approved?'false':'true');
  }
  if(window.csUpdateStepper)window.csUpdateStepper();
}
function syncContentApproval(){
  var current=getEditedContent();
  if(contentState.approvedContent&&contentState.approvedContent!==current){
    // မူလ Approved Snapshot ကို IndexedDB ထဲမှာ ထိန်းထားပြီး လက်ရှိ Version ကို Pending အဖြစ်သာ သတ်မှတ်သည်။
    csDone[12]=false;csDone[14]=false;csDone[22]=false;csDone[24]=false;
  }
  renderApprovalState();
}
function approveContent(){
  var content=getEditedContent();
  if(!content||!content.trim()){showToastMsg('အတည်ပြုရန် Content မရှိသေးပါ');return;}
  contentState.approvedContent=content;
  contentState.editedResult=content;
  renderApprovalState();
  if(window.studioPersistDraft)window.studioPersistDraft(false);
  showToastMsg('Content ကို အတည်ပြုပြီးပါပြီ');
}
window.approveContent=approveContent;

// Keep the existing functions and add the approval check at their public entry points.
var originalOpenBranch=window.openBranch;
window.openBranch=function(kind){
  syncContentApproval();
  if(!isContentApproved()){showToastMsg('Video သို့မဟုတ် Audio မစမီ Content ကို အတည်ပြုပါ');return;}
  return originalOpenBranch(kind);
};
var originalCsNav=window.csNav;
window.csNav=function(n){
  syncContentApproval();
  if([12,14,22,24].indexOf(Number(n))!==-1&&!isContentApproved()){
    showToastMsg('နောက်အဆင့်သို့ မသွားမီ Content ကို အတည်ပြုပါ');return;
  }
  return originalCsNav(n);
};
var originalCsAllowed=window.csAllowed;
window.csAllowed=function(n){
  if([12,14,22,24].indexOf(Number(n))!==-1&&!isContentApproved())return false;
  return originalCsAllowed(n);
};
var originalOnContentEdit=window.onContentEdit;
window.onContentEdit=function(){
  if(originalOnContentEdit)originalOnContentEdit();
  syncContentApproval();
};
var originalRenderContentResult=window.renderContentResult;
window.renderContentResult=function(instant){
  var result=originalRenderContentResult(instant);
  syncContentApproval();
  return result;
};

// ===== Boot (Shell ပြီးမှ Main + Branch Stepper ကို ကိုယ်ပိုင်ဖြင့် ပြန်ဆောက်သည်) =====
function csBoot(){
  ensureContentApprovalUI();
  csRenderStepper();
  csShow(csCur);
  renderApprovalState();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',csBoot);
else csBoot();
`;
