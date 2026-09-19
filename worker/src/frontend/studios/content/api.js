// AI Creative Studio — Content Studio / api.js (V2 refactor)
// Browser-side api — extracted VERBATIM from frontend/content.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const API_SCRIPT = `// ===== Step 01 — Conditional Fields (Section 8 — Content Type ပေါ်မူတည်၍ ပြသည်) =====
function updateConditionalFields(){
  var ct=(document.getElementById('contentTypeSel')||{}).value||'';
  var showPlatform=(ct==='Social Media Post');
  var showCampaign=(ct==='Advertisement'||ct==='Product Promotion');
  var cf=document.getElementById('conditionalFields');
  var pg=document.getElementById('platformGroup');
  var pr=document.getElementById('productGroup');
  var go=document.getElementById('goalGroup');
  var cg=document.getElementById('ctaGroup');
  if(pg)pg.style.display=showPlatform?'':'none';
  if(pr)pr.style.display=showCampaign?'':'none';
  if(go)go.style.display=showCampaign?'':'none';
  if(cg)cg.style.display=showCampaign?'':'none';
  if(cf)cf.style.display=(showPlatform||showCampaign)?'':'none';
}
function conditionalValues(){
  function v(id){var e=document.getElementById(id);return e?(e.value||'').trim():'';}
  var ct=(document.getElementById('contentTypeSel')||{}).value||'';
  var vals={};
  if(ct==='Social Media Post')vals.platform=v('platformSel');
  else if(ct==='Advertisement'||ct==='Product Promotion'){vals.product=v('productInput');vals.goal=v('goalInput');vals.cta=v('ctaInput');}
  return vals;
}

// ===== Step 01 မှ အပိုအချက်များကို Idea ထဲသို့ ပေါင်းသည် (Content Type ကို body.contentType အဖြစ် သီးခြား ပို့သည်) =====
function collectIdeaNotes(){
  var parts=[];
  function val(id){var e=document.getElementById(id);return e?(e.value||'').trim():'';}
  var aud=val('audSel'); if(aud)parts.push('Audience (ပရိသတ်): '+aud);
  var tone=val('toneSel'); if(tone)parts.push('Tone (ရေးသားပုံစံ): '+tone);
  var lang=val('langSel'); if(lang&&lang!=='Auto')parts.push('Language (ဘာသာစကား): '+lang);
  var kp=val('keyPoints'); if(kp)parts.push('Key Points (အဓိကအချက်များ):\\n'+kp);
  var mm=val('mainMessage'); if(mm)parts.push('Main Message (အဓိကအကြောင်းအရာ): '+mm);
  var len=val('lengthSel'); if(len)parts.push('Length (အရှည်): '+len);
  var ai=val('additionalInstr'); if(ai)parts.push('Additional Instructions (ထပ်မံညွှန်ကြားချက်): '+ai);
  var cv=conditionalValues();
  if(cv.platform)parts.push('Platform: '+cv.platform);
  if(cv.product)parts.push('Product / Service (ထုတ်ကုန် / ဝန်ဆောင်မှု): '+cv.product);
  if(cv.goal)parts.push('Goal (ရည်ရွယ်ချက်): '+cv.goal);
  if(cv.cta)parts.push('CTA (လုပ်ဆောင်ရန် တိုက်တွန်းချက်): '+cv.cta);
  return parts;
}

// ===== Content Generate (Main — Step 01 → 02 Result — Unified Result Loading) =====
function generateContent(){
  if(csBusy)return;
  var idea=document.getElementById('ideaInput').value.trim();
  var generationLevel=document.getElementById('generationLevelSel').value;
  var contentType=(document.getElementById('contentTypeSel')||{}).value||'Other';
  var byok=(document.getElementById('byokInput')||{value:''}).value.trim();
  var audEl=document.getElementById('audSel');
  if(!idea){showError('genError','အကြောင်းအရာ (Content Idea) ထည့်ပါ။');return;}
  if(generationLevel!=='1'&&(window.userPlan||localStorage.getItem('aics_plan')||'FREE')!=='PRO'){showError('genError','ဒီ Generation Level ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။ — Settings → Plan မှာ Upgrade လုပ်ပါ။');return;}
  window.aichAud=audEl?audEl.value:'လူတိုင်း';
  var notes=collectIdeaNotes();
  if(notes.length)idea+='\\n\\n'+notes.join('\\n');
  hideError('genError'); hideError('genError2');
  document.getElementById('genRetryRow').style.display='none';
  contentState.input={idea:idea,contentType:contentType,generationLevel:generationLevel};
  contentState.status='processing';
  csBusy=true;
  setGenButtonsDisabled(true);
  csMarkDone(1);
  // Unified: Result section အတွင်း loading ပြသည် (processing step မရှိ) — Exact Text: AI ရေးသားနေသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('contentLoading','AI ရေးသားနေသည်',idea);
  var crb=document.getElementById('contentResultBody');if(crb)crb.style.display='none';
  csGoForce(2);
  setLoading('genLoading',true);
  var body={idea:idea,contentType:contentType,generationLevel:generationLevel};
  var cv=conditionalValues();
  if(cv.platform)body.platform=cv.platform;
  if(cv.product)body.product=cv.product;
  if(cv.goal)body.goal=cv.goal;
  if(cv.cta)body.cta=cv.cta;
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/generate',body)
    .then(function(data){
      lastResult=data;
      contentState.result=data;
      contentState.status='done';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('contentLoading');
      var crb2=document.getElementById('contentResultBody');if(crb2)crb2.style.display='';
      renderContentResult(false); // Typewriter Effect
      document.getElementById('ttsText').value=data.content||'';
      csMarkDone(1);
      csMarkDone(2);
      showToastMsg('&#10004; Content ပြီးပါပြီ');
      csGoForce(2);
    })
    .catch(function(err){
      console.error(err);
      contentState.status='error';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('contentLoading');
      // Error State (Section 8) — Form Data မပျောက်၊ Retry ရှိသည်
      showError('genError2','⚠️ Content ဖန်တီးရာတွင် ပြဿနာရှိပါသည်။');
      document.getElementById('genRetryRow').style.display='flex';
      csUnmarkDone(2);
      showToastMsg('⚠️ Content ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ');
    })
    .finally(function(){setLoading('genLoading',false);setGenButtonsDisabled(false);csBusy=false;});
}

function renderContentResult(instant){
  if(!lastResult){
    if(document.getElementById('resultGrid'))document.getElementById('resultGrid').style.display='none';
    if(document.getElementById('noResultHint'))document.getElementById('noResultHint').style.display='block';
    return;
  }
  var ta=document.getElementById('contentOut');
  if(document.getElementById('resultGrid'))document.getElementById('resultGrid').style.display='block';
  if(document.getElementById('noResultHint'))document.getElementById('noResultHint').style.display='none';
  var showMeta=function(){
    if(document.getElementById('speakingOut'))document.getElementById('speakingOut').textContent=lastResult.speakingStyle||'(empty)';
    if(document.getElementById('voiceOut'))document.getElementById('voiceOut').textContent=lastResult.voiceStyle||'(empty)';
    if(document.getElementById('resultActionsRow'))document.getElementById('resultActionsRow').style.display='flex';
  };
  if(instant){
    if(ta){ta.value=lastResult.content||'(empty)';autoGrow(ta);}
    showMeta();
  }else{
    typewriterFill(ta,lastResult.content||'(empty)',showMeta); // Typewriter + Auto Expand
  }
}

// ===== Revise (AI ပြန်ပြင်ရန် — Existing ကို ဆက်သုံးသည်) =====
function reviseContent(){
  if(csBusy)return;
  var feedback=document.getElementById('feedbackInput').value.trim();
  if(!feedback){showError('revError','ပြင်ဆင်ချက် (Feedback) ရေးပါ။');return;}
  if(!lastResult){showError('revError','အရင် Content ကို ဖန်တီးပါ။');return;}
  hideError('revError');
  csBusy=true;
  setGenButtonsDisabled(true);
  setLoading('revLoading',true);
  document.getElementById('reviseBtn').disabled=true;
  addHistory('user',feedback);
  var generationLevel=document.getElementById('generationLevelSel').value;
  var contentType=(document.getElementById('contentTypeSel')||{}).value||'Other';
  var byok=(document.getElementById('byokInput')||{value:''}).value.trim();
  var body={
    originalContent:lastResult.content||'',
    originalSpeaking:lastResult.speakingStyle||'',
    originalVoice:lastResult.voiceStyle||'',
    feedback:feedback,
    generationLevel:generationLevel,
    contentType:contentType
  };
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/revise',body)
    .then(function(data){
      lastResult=data;
      contentState.result=data;
      renderContentResult(false); // Typewriter Effect
      document.getElementById('feedbackInput').value='';
      document.getElementById('ttsText').value=data.content||'';
      addHistory('ai','ပြင်ဆင်ပြီးပါပြီ — အထက်ပါရလဒ်ကို ကြည့်ပါ။');
    })
    .catch(function(err){
      console.error(err);
      showError('revError','Content ပြင်ဆင်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    })
    .finally(function(){setLoading('revLoading',false);setGenButtonsDisabled(false);document.getElementById('reviseBtn').disabled=false;csBusy=false;});
}
function addHistory(role,text){
  var div=document.createElement('div');
  div.className='revise-msg '+role;
  var roleLabel=role==='user'?'သင် (User)':'AI';
  div.innerHTML='<div class="role">'+roleLabel+'</div>'+escapeHtml(text);
  document.getElementById('reviseHistory').appendChild(div);
  document.getElementById('reviseHistory').scrollTop=document.getElementById('reviseHistory').scrollHeight;
}

// ===== Video Branch — Settings များကို Idea ထဲသို့ ပေါင်းသည် =====
function collectVideoExtras(){
  var parts=[];
  function val(id){var e=document.getElementById(id);return e?(e.value||'').trim():'';}
  var vType=val('videoTypeSel'); if(vType)parts.push('Video Type: '+vType);
  var dur=val('videoDuration'); if(dur)parts.push('Duration: '+dur+' seconds');
  var ar=val('videoAspect'); if(ar)parts.push('Aspect Ratio: '+ar);
  var vs=val('videoVisualStyle'); if(vs)parts.push('Visual Style: '+vs);
  var cs=val('videoCameraStyle'); if(cs)parts.push('Camera Style: '+cs);
  var mo=val('videoMotion'); if(mo)parts.push('Motion / Speed:\\n'+mo);
  var lang=val('videoLanguage'); if(lang&&lang!=='Auto')parts.push('Language: '+lang);
  var ss=val('videoSceneSettings'); if(ss)parts.push('Scene Settings:\\n'+ss);
  var vv=val('videoVisualSettings'); if(vv)parts.push('Visual Settings:\\n'+vv);
  var ref=val('videoReference'); if(ref)parts.push('Reference:\\n'+ref);
  var ai=val('videoAdditionalInstructions'); if(ai)parts.push('Additional Instructions:\\n'+ai);
  return parts;
}

// ===== Video Branch — Generate (Step 12 → 14 Result — Unified Result Loading) =====
function generateVideo(){
  if(csBusy)return;
  var content=(document.getElementById('videoContentText').value||'').trim();
  var generationLevel=document.getElementById('videoGenerationLevelSel').value;
  var contentType=(document.getElementById('contentTypeSel')||{}).value||'Other';
  var byok=(document.getElementById('videoByokInput')||{value:''}).value.trim();
  if(!content){showError('videoError','Content မရှိသေးပါ — Content ကို အရင်ဖန်တီးပါ။');return;}
  hideError('videoError'); hideError('videoError2');
  document.getElementById('videoRetryRow').style.display='none';
  videoState.content=content;
  var extras=collectVideoExtras();
  var idea=content;
  if(extras.length)idea+='\\n\\n'+extras.join('\\n');
  videoState.input={contentType:contentType,generationLevel:generationLevel,settings:extras};
  videoState.status='processing';
  csBusy=true;
  setGenButtonsDisabled(true);
  csMarkDone(12);
  // Unified: Video Result section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('videoLoading','AI က သင့်အတွက် Video ကို ပြင်ဆင်နေသည်...',content);
  var vrc=document.getElementById('videoResult');if(vrc)vrc.style.display='none';
  csGoForce(14);
  setLoading('videoGenLoading',true);
  var body={idea:idea,generationLevel:generationLevel,contentType:contentType};
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/video',body)
    .then(function(data){
      videoPlan=data;
      videoState.result=data;
      videoState.status='done';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('videoLoading');
      renderVideoPlan(data);
      document.getElementById('videoResult').style.display='block';
      csMarkDone(12);
      csMarkDone(14);
      showToastMsg('&#10004; Video Plan ပြီးပါပြီ');
      csGoForce(14);
    })
    .catch(function(err){
      console.error(err);
      videoState.status='error';
      if(window.aicsResultLoading)window.aicsResultLoading.hide('videoLoading');
      showError('videoError2','Video ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ပြန်လည်ကြိုးစားပါ။');
      document.getElementById('videoRetryRow').style.display='flex';
      csUnmarkDone(14);
      showToastMsg('⚠️ Video ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ');
    })
    .finally(function(){setLoading('videoGenLoading',false);setGenButtonsDisabled(false);csBusy=false;});
}
function renderVideoPlan(data){
  var charsCard=document.getElementById('charactersCard');
  var charsList=document.getElementById('charactersList');
  if(data.characters&&data.characters.length>0){
    charsCard.style.display='block';
    charsList.innerHTML='';
    for(var i=0;i<data.characters.length;i++){
      var c=data.characters[i];
      var div=document.createElement('div');
      div.className='final-char-card';
      div.innerHTML='<div class="final-char-head"><span class="final-char-name">&#128100; '+escapeHtml(c.name||('Character '+(i+1)))+'</span></div>'+
                    '<div class="final-prompt-label">Character Reference</div>'+
                    '<div class="final-prompt-text">'+escapeHtml(c.description||'')+'</div>'+
                    '<div class="btn-row"><button class="btn-ghost" onclick="copyCharText('+i+')">&#128203; Copy Prompt</button></div>';
      charsList.appendChild(div);
    }
  }else{
    charsCard.style.display='none';
  }
  var scenesList=document.getElementById('scenesList');
  scenesList.innerHTML='';
  if(data.scenes&&data.scenes.length>0){
    for(var j=0;j<data.scenes.length;j++){
      (function(idx){
        var s=data.scenes[idx];
        var item=document.createElement('div');
        item.className='final-scene-card';
        var html='<div class="final-scene-title">&#127916; SCENE '+(s.number||(idx+1))+(s.duration?' <span style="color:var(--text2,#8b95a8);font-weight:400;">&#9201; '+escapeHtml(s.duration)+'</span>':'')+'</div>';
        if(s.visualPrompt){
          html+='<div class="final-scene-box"><div class="final-box-label">&#127916; Video Prompt</div>'+
                '<div class="final-prompt-text" id="sceneVP_'+idx+'">'+escapeHtml(s.visualPrompt)+'</div>'+
                '<div class="btn-row"><button class="btn-ghost" onclick="copySceneText('+idx+')">&#128203; Copy Video Prompt</button></div></div>';
        }
        if(s.description){
          html+='<div class="final-scene-box"><div class="final-box-label">&#127757; Environment Reference</div>'+
                '<div class="final-prompt-text">'+escapeHtml(s.description)+'</div>'+
                '<div class="btn-row"><button class="btn-ghost" onclick="copyEnvText('+idx+')">&#128203; Copy Environment Prompt</button></div></div>';
        }
        if(s.dialogue){
          html+='<div class="final-scene-box"><div class="final-box-label">&#128172; Dialogue</div>'+
                '<div class="final-prompt-text">'+escapeHtml(s.dialogue)+'</div>'+
                '<div class="btn-row"><button class="btn-ghost" onclick="copyDialogueText('+idx+')">&#128203; Copy Dialogue</button></div></div>';
        }
        html+='<div class="scene-image-area" id="sceneImg_'+idx+'">'+
              (imgCache['scene_'+idx]?'<img src="'+imgCache['scene_'+idx]+'"><div style="margin-top:8px;"><button class="btn-ghost" onclick="generateSceneImage('+idx+')">&#128260; ပြန်ဖန်တီးပါ</button></div>':'<button class="btn btn-secondary" onclick="generateSceneImage('+idx+')">&#128444; ဤဖြစ်စဉ်၏ ရုပ်ပုံဖန်တီးပါ</button>')+
              '</div>';
        item.innerHTML=html;
        scenesList.appendChild(item);
      })(j);
    }
  }else{
    scenesList.innerHTML='<div style="color:var(--text3);text-align:center;padding:20px;">Scenes မတွေ့ရှိပါ</div>';
  }
}
function copySceneText(idx){
  if(!videoPlan||!videoPlan.scenes||!videoPlan.scenes[idx])return;
  var text=videoPlan.scenes[idx].visualPrompt||'';
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}
function copyCharText(idx){
  if(!videoPlan||!videoPlan.characters||!videoPlan.characters[idx])return;
  var c=videoPlan.characters[idx];
  var text=c.characterPrompt||c.prompt||c.description||'';
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}
function copyEnvText(idx){
  if(!videoPlan||!videoPlan.scenes||!videoPlan.scenes[idx])return;
  var text=videoPlan.scenes[idx].description||'';
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}
function copyDialogueText(idx){
  if(!videoPlan||!videoPlan.scenes||!videoPlan.scenes[idx])return;
  var text=videoPlan.scenes[idx].dialogue||'';
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}
function generateSceneImage(idx){
  if(!videoPlan||!videoPlan.scenes||!videoPlan.scenes[idx])return;
  var scene=videoPlan.scenes[idx];
  var prompt=scene.visualPrompt||scene.description||'';
  if(!prompt){alert('ဒီဖြစ်စဉ်တွင် Visual Prompt မရှိပါ');return;}
  var area=document.getElementById('sceneImg_'+idx);
  if(!area)return;
  area.innerHTML='<div class="loading show" style="justify-content:center;position:static;transform:none;display:flex;"><div class="spinner"></div> ရုပ်ပုံဖန်တီးနေပါသည်...</div>';
  var byok=(document.getElementById('videoByokInput')||{value:''}).value.trim();
  var body={prompt:prompt};
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/content/video-image',body)
    .then(function(data){
      if(data.data){
        var imgSrc='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
        imgCache['scene_'+idx]=imgSrc;
        area.innerHTML='<img src="'+imgSrc+'" alt="Scene '+(idx+1)+'">'+
                       '<div style="margin-top:8px;"><button class="btn-ghost" onclick="generateSceneImage('+idx+')">&#128260; ပြန်ဖန်တီးပါ</button></div>';
      }else{
        area.innerHTML='<div class="scene-image-placeholder">ရုပ်ပုံမထွက်ပါ</div>';
      }
    })
    .catch(function(err){
      console.error(err);
      area.innerHTML='<div style="color:var(--error);font-size:12px;padding:10px;">ရုပ်ပုံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။</div>'+
                     '<button class="btn-ghost" onclick="generateSceneImage('+idx+')">ထပ်စမ်းပါ</button>';
    });
}

`;
