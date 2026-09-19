// AI Creative Studio — Story Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `// ===================== Step 01 → 02 (Story Generate — Unified Result Loading) =====================
function generateStory(){
  if(storyBusy)return;
  var collected=collectIdeaText();
  if(!collected.valid){showError('genError','ဇာတ်လမ်းအကြောင်း အနည်းဆုံး ဖြည့်ရေးပါ');showField0Error();return;}
  var stMeta=STORY_TYPES[parseInt(selectedStoryType,10)-1];
  if(stMeta&&stMeta.pro&&!isPro){showToastMsg('ဒီ Type ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။');return;}
  var idea=collected.text;
  hideError('genError');hideStepError('genError2','genRetry2');
  storyBusy=true;
  currentStory='';
  studioMarkDone(1);
  // Unified: Result section အတွင်း loading ပြသည် (Stepper ထဲတွင် မပြ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('storyLoading','AI ရေးသားနေသည်...',idea);
  var sb=document.getElementById('storyResultBody');if(sb)sb.style.display='none';
  var gb=document.getElementById('genStoryBtn');
  if(gb){gb.disabled=true;gb.innerHTML='&#9203; ဇာတ်လမ်းရေးသားနေသည်...';}
  var f0=document.getElementById('field_0');if(f0)f0.disabled=true;
  if(window.studioForceGoStep)window.studioForceGoStep(2);
  else window.studioGoStep(2);
  var byok=document.getElementById('byokInput')?document.getElementById('byokInput').value.trim():'';
  var body={idea:idea,type:selectedStoryType};
  if(byok)body.apiKey=byok;
  apiCall('/api/studio/story/generate',body)
    .then(function(data){
      currentStory=data.story||'';
      currentStoryIdea=idea;
      if(window.aicsResultLoading)window.aicsResultLoading.hide('storyLoading');
      var sb2=document.getElementById('storyResultBody');if(sb2)sb2.style.display='';
      studioMarkDone(1);studioMarkDone(2);
      document.getElementById('reviseHistory').innerHTML='';
      var ta=document.getElementById('storyResult');
      typewriteStory(currentStory,ta);
      storyBusy=false;
      if(f0)f0.disabled=false;
      if(gb){gb.disabled=false;gb.innerHTML='&#10024; ဇာတ်လမ်းရေးသားရန်';}
      if(window.studioForceGoStep)window.studioForceGoStep(2);
      else window.studioGoStep(2);
      showToastMsg('&#10004; ဇာတ်လမ်းရေးပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Story Generate Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('storyLoading');
      storyBusy=false;
      if(f0)f0.disabled=false;
      if(gb){gb.disabled=false;gb.innerHTML='&#10024; ဇာတ်လမ်းရေးသားရန်';}
      var sb3=document.getElementById('storyResultBody');if(sb3)sb3.style.display='none';
      showStepError('genError2','genRetry2',friendlyMsg(err,'story'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည်
      if(window.studioUnmarkDone)window.studioUnmarkDone(2);
      showToastMsg('⚠️ '+(friendlyMsg(err,'story').replace(/\\n/g,' ')));
    });
}

// ===================== Revise =====================
function reviseStory(){
  var instruction=document.getElementById('feedbackInput').value.trim();
  if(!instruction){showError('revError','ဘယ်လိုပြင်ချင်လဲ ရေးပါ');return;}
  if(!currentStory){showError('revError','အရင် Story ကို ဖန်တီးပါ');return;}
  hideError('revError');
  document.getElementById('revLoading').classList.add('show');
  document.getElementById('reviseBtn').disabled=true;
  addHistory('user',instruction);
  document.getElementById('feedbackInput').value='';
  var latestStory=document.getElementById('storyResult').value;
  var body={idea:currentStoryIdea,type:selectedStoryType,currentStory:latestStory,instruction:instruction};
  apiCall('/api/studio/story/revise',body)
    .then(function(data){
      currentStory=data.story||'';
      var ta=document.getElementById('storyResult');
      if(ta){ta.value=currentStory;autoExpand(ta);}
      addHistory('ai','ပြင်ဆင်ပြီးပါပြီ — အထက်က ဇာတ်လမ်းထဲမှာ ကြည့်ပါ');
      autoSave();
    })
    .catch(function(err){showError('revError',friendlyMsg(err,'story'));})
    .finally(function(){document.getElementById('revLoading').classList.remove('show');document.getElementById('reviseBtn').disabled=false;});
}
function addHistory(role,text){
  var div=document.createElement('div');div.className='revise-msg '+role;
  div.innerHTML='<div class="role">'+(role==='user'?'သင် (User)':'AI')+'</div>'+escapeHtml(text);
  document.getElementById('reviseHistory').appendChild(div);
  document.getElementById('reviseHistory').scrollTop=document.getElementById('reviseHistory').scrollHeight;
}
function focusRevise(){
  var t=document.getElementById('reviseToggle');
  var p=document.getElementById('revisePanel');
  if(t&&p&&!p.classList.contains('open')){if(window.studioToggleAdvanced)window.studioToggleAdvanced('reviseToggle','revisePanel');}
  var r=document.getElementById('revise-section');
  if(r)r.scrollIntoView({behavior:'smooth',block:'center'});
  var f=document.getElementById('feedbackInput');
  if(f)f.focus();
}

// ===================== 02 → 03 (User နောက်ဆုံးပြင်ထားသော Story ကို ပို့သည် — Auto Transfer) =====================
function goToVideoForm(){
  var ta=document.getElementById('storyResult');
  stopTypewriter();
  if(ta)currentStory=ta.value;
  if(!currentStory||!currentStory.trim()){showToastMsg('ဗီဒီယို ဖန်တီးရန် ဇာတ်လမ်း မရှိသေးပါ');return;}
  stMarkDone(2);
  videoStarted=true;
  fillVideoStoryField();
  stSetMode('video');
  stGoForce(3);
  autoSave();
}
function fillVideoStoryField(){
  var ta=document.getElementById('videoStoryInput');
  if(!ta)return;
  ta.value=currentStory||'';
  autoExpand(ta);
}

// ===================== Step 03 → 04 (Video Plan — Unified Result Loading) =====================
function generateVideoPlan(){
  if(planBusy)return;
  var story=document.getElementById('videoStoryInput').value.trim();
  if(!story){showError('planError','ဇာတ်လမ်း ထည့်ရန် လိုအပ်ပါသည် — Step 02 မှာ ဇာတ်လမ်းရေးပြီးမှ ဆက်လုပ်ပါ');return;}
  hideError('planError');hideStepError('planError5','planRetry5');
  planBusy=true;
  var btn=document.getElementById('videoPlanBtn');
  if(btn){btn.disabled=true;btn.innerHTML='&#9203; Video ပြင်ဆင်နေသည်...';}
  studioMarkDone(3);
  // Unified: Video Result section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('planLoading','AI ပြင်ဆင်နေသည်...',story);
  if(window.studioForceGoStep)window.studioForceGoStep(4);
  else window.studioGoStep(4);
  var continuity=document.getElementById('vidContinuity');
  var consistency=document.getElementById('vidConsistency');
  var body={
    story:story,
    type:selectedVideoType,
    videoType:sel('vidTypeSel'),
    duration:sel('vidDurationSel'),
    sceneDuration:sel('vidSceneSel'),
    aspectRatio:sel('vidRatioSel'),
    visualStyle:sel('vidStyleSel'),
    cameraStyle:sel('vidCamSel'),
    language:sel('vidLangSel'),
    characterContinuity:(continuity&&continuity.checked)?'true':'false',
    characterConsistency:(consistency&&consistency.checked)?'true':'false',
    characterDirection:document.getElementById('vidCharDir')?document.getElementById('vidCharDir').value.trim():'',
    cameraDirection:document.getElementById('vidCamDir')?document.getElementById('vidCamDir').value.trim():'',
    lighting:document.getElementById('vidLighting')?document.getElementById('vidLighting').value.trim():'',
    environmentDetails:document.getElementById('vidEnvDetails')?document.getElementById('vidEnvDetails').value.trim():'',
    colorMood:document.getElementById('vidColorMood')?document.getElementById('vidColorMood').value.trim():'',
    transitionPacing:document.getElementById('vidTransition')?document.getElementById('vidTransition').value.trim():'',
    audioDirection:document.getElementById('vidAudio')?document.getElementById('vidAudio').value.trim():'',
    additionalInstructions:document.getElementById('vidExtra')?document.getElementById('vidExtra').value.trim():''
  };
  apiCall('/api/studio/story/video',body)
    .then(function(data){
      currentScenes=data.scenes||[];
      currentCharacters=data.characters||[];
      if(window.aicsResultLoading)window.aicsResultLoading.hide('planLoading');
      studioMarkDone(3);studioMarkDone(4);
      planBusy=false;
      if(btn){btn.disabled=false;btn.innerHTML='&#127916; Video ဇာတ်လမ်း ဖန်တီးရန်';}
      if(window.studioForceGoStep)window.studioForceGoStep(4);
      else window.studioGoStep(4);
      renderFinalResult();
      showToastMsg('&#10004; Video ဇာတ်လမ်း ပြင်ဆင်ပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Story Video Plan Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('planLoading');
      planBusy=false;
      if(btn){btn.disabled=false;btn.innerHTML='&#127916; Video ဇာတ်လမ်း ဖန်တီးရန်';}
      showStepError('planError5','planRetry5',friendlyMsg(err,'video'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည်
      if(window.studioUnmarkDone)window.studioUnmarkDone(4);
      showToastMsg('⚠️ '+(friendlyMsg(err,'video').replace(/\\n/g,' ')));
    });
}

// ===================== Video Result — Characters + Story Map =====================
function durText(d){
  if(d===undefined||d===null||d==='')return '';
  if(typeof d==='number')return d+' sec';
  var s=String(d).trim();
  return /sec/i.test(s)?s:(s+' sec');
}
function resolveSceneCharacters(idx){
  var s=currentScenes[idx];if(!s)return '-';
  var ids=(s.characterIds&&s.characterIds.length)?s.characterIds:(Array.isArray(s.characters)?s.characters:[]);
  if(!ids.length)return '-';
  var names=[];
  for(var i=0;i<ids.length;i++){
    var id=ids[i],found=null;
    for(var k=0;k<currentCharacters.length;k++){
      if(currentCharacters[k].id===id||currentCharacters[k].name===id){found=currentCharacters[k];break;}
    }
    names.push(found?(found.name||id):id);
  }
  return names.join(', ');
}
function renderFinalResult(){
  var c=document.getElementById('finalResult');if(!c)return;
  var html='';
  // ---- Characters ----
  if(currentCharacters&&currentCharacters.length){
    html+='<div class="card"><div class="card-title">&#128100; ဇာတ်ကောင်များ (Characters)</div>';
    for(var i=0;i<currentCharacters.length;i++){
      (function(idx){
        var ch=currentCharacters[idx]||{};
        var prompt=ch.characterPrompt||ch.prompt||'(မရှိပါ)';
        var img=imgCache['char_'+idx]||ch.referenceImage||'';
        html+='<div class="final-char-card">';
        html+='<div class="final-char-head"><span class="final-char-name">&#128100; '+escapeHtml(ch.name||'Character '+(idx+1))+'</span><span class="final-char-id">'+escapeHtml(ch.id||('char_'+String(idx+1).padStart(2,'0')))+'</span></div>';
        var meta='';
        if(ch.age)meta+='<div>&#127875; အသက် '+escapeHtml(ch.age)+'</div>';
        if(ch.role)meta+='<div>&#127917; '+escapeHtml(ch.role)+'</div>';
        if(ch.description)meta+='<div>&#128221; '+escapeHtml(ch.description)+'</div>';
        if(meta)html+='<div class="final-char-meta">'+meta+'</div>';
        html+='<div class="final-char-ref"><div class="final-prompt-label">Character Reference</div><div class="final-prompt-text">'+escapeHtml(prompt)+'</div></div>';
        html+='<div class="final-char-img" id="charImg_'+idx+'">'+(img?'<img class="aics-pv-img" src="'+img+'">':'<div class="empty-note">ရုပ်ပုံ မရှိသေးပါ</div>')+'</div>';
        html+='<div class="btn-row"><button class="btn-ghost" onclick="copyCharPrompt('+idx+')">&#128203; Copy Prompt</button><button class="btn-ghost" onclick="generateCharImage('+idx+')">&#127912; Character Image ဖန်တီးရန်</button></div>';
        html+='</div>';
      })(i);
    }
    html+='</div>';
  }
  // ---- Story Map (Scenes) ----
  if(currentScenes&&currentScenes.length){
    html+='<div class="card storymap-card"><div class="card-title">&#128506; Story Map <span class="card-title-sub">(ဇာတ်လမ်းမြေပုံ — Scenes)</span></div>';
    for(var j=0;j<currentScenes.length;j++){
      (function(idx){
        var s=currentScenes[idx]||{};
        var num=String(s.number||(idx+1));
        var title=s.title?escapeHtml(s.title):'(Scene '+num+')';
        html+='<div class="smap-card">';
        html+='<div class="smap-head"><span class="smap-num">SCENE '+num+'</span><span class="smap-title">'+title+'</span></div>';
        html+='<div class="smap-row"><div class="smap-label">&#127757; Environment</div><div class="smap-text">'+escapeHtml(s.environmentPrompt||'(မရှိပါ)')+'</div>';
        html+='<div class="env-action-grid"><div class="scene-image-area" id="envImg_'+idx+'">'+(imgCache['env_'+idx]?'<img src="'+imgCache['env_'+idx]+'">':'<button class="btn btn-orange env-img-btn" onclick="generateEnvImage('+idx+')">&#127912; Environment Image ဖန်တီးပါ</button>')+'</div><button class="btn btn-ghost env-copy-btn" onclick="copyEnvPrompt('+idx+')">&#128203; Copy Environment Prompt</button></div></div>';
        html+='<div class="smap-row"><div class="smap-label">&#127916; Video Prompt</div><div class="smap-text">'+escapeHtml(s.videoPrompt||'(မရှိပါ)')+'</div><div class="btn-row"><button class="btn-ghost" onclick="copyVideoPrompt('+idx+')">&#128203; Copy Video Prompt</button></div></div>';
        html+='<div class="smap-meta"><span>&#128100; Characters: '+escapeHtml(resolveSceneCharacters(idx))+'</span><span>&#9201; '+escapeHtml(durText(s.duration))+'</span></div>';
        html+='</div>';
      })(j);
    }
    html+='</div>';
  }
  if(!html)html='<div class="card"><div class="empty-note">ရလဒ် မရှိသေးပါ — Video ဇာတ်လမ်း ဖန်တီးပါ</div></div>';
  c.innerHTML=html;
}

// ===================== Copy / Save / Export =====================
function copyStory(){
  var text=document.getElementById('storyResult').value;
  if(!text){showToastMsg('Copy လုပ်ဖို့ Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function saveStory(){
  var text=document.getElementById('storyResult').value;
  if(!text){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var topic=document.getElementById('field_0').value.trim()||'ဇာတ်လမ်း';
  var defaultTitle=topic.substring(0,40)+(topic.length>40?'...':'');
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'STORY',type:selectedStoryType,title:title||defaultTitle,original_prompt:currentStoryIdea,ai_output:text})
    .then(function(){showToastMsg('&#128190; My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToastMsg('Save မအောင်မြင်ပါ: '+(err&&err.message||'Error'));});
}
function copyCharPrompt(idx){
  if(!currentCharacters[idx])return;
  copyToClipboard(currentCharacters[idx].characterPrompt||currentCharacters[idx].prompt||'');
}
function copyVideoPrompt(idx){if(!currentScenes[idx])return;copyToClipboard(currentScenes[idx].videoPrompt||'');}
function copyEnvPrompt(idx){if(!currentScenes[idx])return;copyToClipboard(currentScenes[idx].environmentPrompt||'');}

// ===================== Image Generation (Character / Environment) =====================
function generateCharImage(idx){
  if(!currentCharacters[idx])return;
  var prompt=currentCharacters[idx].characterPrompt||currentCharacters[idx].prompt||'';
  if(!prompt){showToastMsg('Prompt မရှိပါ');return;}
  var area=document.getElementById('charImg_'+idx);
  if(area)area.innerHTML='<div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:14px;"><div class="spinner"></div><span style="font-size:13px;color:var(--cyan);">ရုပ်ပုံ ဖန်တီးနေပါသည်...</span></div>';
  apiCall('/api/studio/story/video-image',{prompt:prompt})
    .then(function(data){
      if(data.data){
        var src='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
        imgCache['char_'+idx]=src;
        currentCharacters[idx].referenceImage=src;
        if(area)area.innerHTML='<img class="aics-pv-img" src="'+src+'"><div style="margin-top:8px;"><a href="'+src+'" download="story_character_'+(idx+1)+'.png"><button class="btn-ghost">&#128190; Save Image</button></a></div>';
        autoSave();autoSaveImgCache();
      }else{if(area)area.innerHTML='<div class="empty-note">ရုပ်ပုံ မထွက်ပါ — ထပ်စမ်းပါ</div>';}
    })
    .catch(function(err){if(area)area.innerHTML='<div style="color:var(--error);font-size:12px;padding:10px;">'+escapeHtml(friendlyMsg(err,'image'))+'</div><div style="text-align:center;margin-top:4px;"><button class="btn-ghost" onclick="generateCharImage('+idx+')">&#8635; ထပ်စမ်းပါ</button></div>';});
}
function generateEnvImage(idx){
  if(!currentScenes[idx]||!currentScenes[idx].environmentPrompt){showToastMsg('Prompt မရှိပါ');return;}
  var area=document.getElementById('envImg_'+idx);
  if(area)area.innerHTML='<div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;"><div class="spinner"></div><span style="font-size:13px;color:var(--cyan);">ရုပ်ပုံ ဖန်တီးနေပါသည်...</span></div>';
  apiCall('/api/studio/story/video-image',{prompt:currentScenes[idx].environmentPrompt})
    .then(function(data){
      if(data.data){
        var src='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
        imgCache['env_'+idx]=src;
        if(area)area.innerHTML='<img src="'+src+'"><div style="margin-top:8px;"><a href="'+src+'" download="story_scene_'+(idx+1)+'_env.png"><button class="btn-ghost">&#128190; Save Image</button></a></div>';
        autoSave();autoSaveImgCache();
      }else{if(area)area.innerHTML='<div class="empty-note">ရုပ်ပုံ မထွက်ပါ — ထပ်စမ်းပါ</div>';}
    })
    .catch(function(err){if(area)area.innerHTML='<div style="color:var(--error);font-size:12px;padding:10px;">'+escapeHtml(friendlyMsg(err,'image'))+'</div><div style="text-align:center;margin-top:4px;"><button class="btn-ghost" onclick="generateEnvImage('+idx+')">&#8635; ထပ်စမ်းပါ</button></div>';});
}

// ===================== Result Text / Export =====================
function buildResultText(){
  var parts=[];
  if(currentStory&&currentStory.trim())parts.push('STORY\\n======================\\n'+currentStory);
  if(currentCharacters&&currentCharacters.length){
    var cp='CHARACTER REFERENCE PROMPTS\\n======================\\n';
    for(var i=0;i<currentCharacters.length;i++){
      var ch=currentCharacters[i];
      cp+='\\nCHARACTER '+(i+1)+'\\nID: '+(ch.id||'-')+'\\nName: '+(ch.name||'-')+'\\nRole: '+(ch.role||'-')+(ch.age?'\\nAge: '+ch.age:'')+(ch.description?'\\nDescription: '+ch.description:'')+'\\nPrompt: '+(ch.characterPrompt||ch.prompt||'-');
    }
    parts.push(cp);
  }
  if(currentScenes&&currentScenes.length){
    var sp='SCENE PROMPTS (Environment & Video)\\n======================\\n';
    for(var j=0;j<currentScenes.length;j++){
      var sc=currentScenes[j];
      sp+='\\nSCENE '+(sc.number||(j+1))+(sc.title?' — '+sc.title:'')+'\\nCharacters: '+resolveSceneCharacters(j)+'\\nDuration: '+durText(sc.duration)+'\\nEnvironment: '+(sc.environmentPrompt||'-')+'\\nVideo: '+(sc.videoPrompt||'-');
    }
    parts.push(sp);
  }
  return parts.join('\\n\\n');
}
function copyAllResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function saveAllResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var defaultTitle=(document.getElementById('field_0').value.trim()||'Story Result').substring(0,40);
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'STORY',type:selectedVideoType,title:title||defaultTitle,original_prompt:currentStoryIdea,ai_output:text})
    .then(function(){showToastMsg('&#128190; My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToastMsg('Save မအောင်မြင်ပါ: '+(err&&err.message||'Error'));});
}
function exportResult(){
  var text=buildResultText();
  if(!text.trim()){showToastMsg('Export လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='story_result.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  showToastMsg('&#10004; Export ပြီးပါပြီ');
}

// ===================== Stepper Actions =====================
function bReset(){return {label:'Reset',cls:'ghost',fn:studioReset};}
function studioOnStep(n){
  if(n===1){
    // Story Form အောက်ရှိ Generate Button ကို Primary Action အဖြစ် ထားသည်
    studioSetActions([bReset()]);
  }else if(n===2){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(1);}},
      bReset()
    ]);
    var ta=document.getElementById('storyResult');
    if(ta)autoExpand(ta);
  }else if(n===3){
    fillVideoStoryField();
    var pb=document.getElementById('videoPlanBtn');
    if(pb)pb.disabled=false;
    studioSetActions([
      {label:'&#8592; ရလဒ်သို့ ပြန်ရန်',cls:'ghost',fn:function(){stSetMode('main');stGoForce(2);}},
      bReset()
    ]);
  }else if(n===4){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(3);}},
      {label:'&#128203; Copy All',cls:'secondary',fn:copyAllResult},
      {label:'&#128190; သိမ်းရန် (All)',cls:'purple',fn:saveAllResult},
      bReset()
    ]);
    renderFinalResult();
  }
}
window.studioOnStep=studioOnStep;

// ===================== Draft (studioCollectDraft / studioRestoreDraft) =====================
function studioCollectDraft(){
  var fields={};
  for(var i=0;i<FIELD_CONFIG.length;i++){var f=document.getElementById('field_'+i);fields[i]=f?f.value:'';}
  return {
    stepNow:window.studioCur?window.studioCur():1,
    mode:ST_MODE,
    storyType:selectedStoryType,
    videoType:selectedVideoType,
    aud:(document.getElementById('audSel')?document.getElementById('audSel').value:''),
    tone:document.getElementById('toneSel')?document.getElementById('toneSel').value:'',
    lang:document.getElementById('langSel')?document.getElementById('langSel').value:'',
    fields:fields,
    story:currentStory,
    storyIdea:currentStoryIdea,
    videoStarted:videoStarted,
    videoForm:{
      story:document.getElementById('videoStoryInput')?document.getElementById('videoStoryInput').value:'',
      videoType:selectedVideoType,
      duration:sel('vidDurationSel'),
      sceneDuration:sel('vidSceneSel'),
      aspectRatio:sel('vidRatioSel'),
      visualStyle:sel('vidStyleSel'),
      cameraStyle:sel('vidCamSel'),
      language:sel('vidLangSel'),
      characterContinuity:document.getElementById('vidContinuity')?document.getElementById('vidContinuity').checked:true,
      characterConsistency:document.getElementById('vidConsistency')?document.getElementById('vidConsistency').checked:true,
      characterDirection:document.getElementById('vidCharDir')?document.getElementById('vidCharDir').value:'',
      cameraDirection:document.getElementById('vidCamDir')?document.getElementById('vidCamDir').value:'',
      lighting:document.getElementById('vidLighting')?document.getElementById('vidLighting').value:'',
      environmentDetails:document.getElementById('vidEnvDetails')?document.getElementById('vidEnvDetails').value:'',
      colorMood:document.getElementById('vidColorMood')?document.getElementById('vidColorMood').value:'',
      transitionPacing:document.getElementById('vidTransition')?document.getElementById('vidTransition').value:'',
      audioDirection:document.getElementById('vidAudio')?document.getElementById('vidAudio').value:'',
      additionalInstructions:document.getElementById('vidExtra')?document.getElementById('vidExtra').value:''
    },
    characters:currentCharacters,
    scenes:currentScenes
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  selectedStoryType=d.storyType||'1';
  selectedVideoType=d.videoType||'1';
  var sts=document.getElementById('storyTypeSel');if(sts)sts.value=selectedStoryType;
  var aud=document.getElementById('audSel');if(aud&&d.aud)aud.value=d.aud;window.aichAud=(aud?aud.value:'လူတိုင်း');
  var tone=document.getElementById('toneSel');if(tone&&d.tone)tone.value=d.tone;
  var lang=document.getElementById('langSel');if(lang&&d.lang)lang.value=d.lang;
  if(d.fields){for(var i=0;i<FIELD_CONFIG.length;i++){var f=document.getElementById('field_'+i);if(f)f.value=d.fields[i]||'';}}
  currentStory=d.story||'';
  currentStoryIdea=d.storyIdea||'';
  videoStarted=!!d.videoStarted;
  document.getElementById('storyResult').value=currentStory;
  if(d.videoForm){
    var vf=d.videoForm;
    var vs=document.getElementById('videoStoryInput');if(vs){vs.value=vf.story||currentStory;autoExpand(vs);}
    var vt=document.getElementById('vidTypeSel');
    if(vt){vt.value=(!isPro&&vf.videoType&&vf.videoType!=='1')?'1':(vf.videoType||'1');selectedVideoType=vt.value||'1';}
    var setf=function(id,v){var e=document.getElementById(id);if(e&&v)e.value=v;};
    setf('vidDurationSel',vf.duration);setf('vidSceneSel',vf.sceneDuration);setf('vidRatioSel',vf.aspectRatio);
    setf('vidStyleSel',vf.visualStyle);setf('vidCamSel',vf.cameraStyle);setf('vidLangSel',vf.language);
    var cc=document.getElementById('vidContinuity');if(cc)cc.checked=vf.characterContinuity!==false;
    var cs=document.getElementById('vidConsistency');if(cs)cs.checked=vf.characterConsistency!==false;
    var ve=document.getElementById('vidExtra');if(ve)ve.value=vf.additionalInstructions||'';
    setf('vidCharDir',vf.characterDirection);setf('vidCamDir',vf.cameraDirection);setf('vidLighting',vf.lighting);
    setf('vidEnvDetails',vf.environmentDetails);setf('vidColorMood',vf.colorMood);setf('vidTransition',vf.transitionPacing);
    setf('vidAudio',vf.audioDirection);
  }
  currentCharacters=d.characters||[];
  currentScenes=d.scenes||[];
  var was=d.stepNow||1;
  if(currentStory){studioMarkDone(1);studioMarkDone(2);}
  if((videoStarted||was>=3)&&currentStory){studioMarkDone(2);}
  if(currentCharacters.length||currentScenes.length){studioMarkDone(3);studioMarkDone(4);}
  if(currentScenes.length||currentCharacters.length)renderFinalResult();
  // Restore mode (main vs video branch)
  if(d.mode==='video'&&(videoStarted||was>=3)&&currentStory){ST_MODE='video';}
  // Resolve target step
  var target=was;
  var tm=stMeta(target);
  if(!tm||tm.lock||!stAllowed(target)){
    var steps=stModeSteps();
    target=steps[steps.length-1].n;
    if(stMeta(target).lock)target=steps[steps.length-2].n;
    if(!stAllowed(target))target=1;
  }
  stCur=target;
  stShow(target);
  updateGenBtn();
}
window.studioRestoreDraft=studioRestoreDraft;

// ===================== Auto Save (Refresh ပြီးနောက် Data မပျောက်စေရ) =====================
function autoSave(){
  try{
    var data=studioCollectDraft();
    localStorage.setItem('aics_draft_story',JSON.stringify({step:window.studioCur?window.studioCur():1,data:data,savedAt:new Date().toISOString()}));
  }catch(e){}
}
function autoSaveImgCache(){
  try{localStorage.setItem('aics_draft_story_imgcache',JSON.stringify(imgCache));}catch(e){}
}

// ============================================================
`;
