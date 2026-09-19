// AI Creative Studio — Short Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/short.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `// ===================== Step 01 → 02 → 03 (Short Generate) =====================
function collectShortIdea(){
  var lines=[],valid=true;
  var topic=document.getElementById('field_0').value.trim();
  if(!topic)valid=false;
  function add(label,val){if(val&&String(val).trim())lines.push(label+': '+String(val).trim());}
  var stMeta=SHORT_TYPES[parseInt(selectedShortType,10)-1];
  add('Short Type',stMeta?stMeta.label:selectedShortType);
  add('Duration',sel('durSel'));
  add('Tone',sel('toneSel'));
  add('Language',sel('langSel'));
  add('Target Audience',document.getElementById('audInput')?document.getElementById('audInput').value:'');
  add('Topic',topic);
  add('Main Message',document.getElementById('mainMsg')?document.getElementById('mainMsg').value:'');
  add('Additional Instructions',document.getElementById('extraInstr')?document.getElementById('extraInstr').value:'');
  add('Hook',document.getElementById('advHook')?document.getElementById('advHook').value:'');
  add('Call To Action',document.getElementById('advCta')?document.getElementById('advCta').value:'');
  add('Character Information',document.getElementById('advCharInfo')?document.getElementById('advCharInfo').value:'');
  add('Location',document.getElementById('advLocation')?document.getElementById('advLocation').value:'');
  add('Visual Style',document.getElementById('advVisualStyle')?document.getElementById('advVisualStyle').value:'');
  add('Ending Style',document.getElementById('advEnding')?document.getElementById('advEnding').value:'');
  return{text:lines.join('\\n'),valid:valid};
}

function generateShort(){
  if(shortBusy)return;
  var collected=collectShortIdea();
  if(!collected.valid){showError('genError','Short အကြောင်းအရာကို အနည်းဆုံး ဖြည့်ရေးပါ။');return;}
  var stMeta=SHORT_TYPES[parseInt(selectedShortType,10)-1];
  if(stMeta&&stMeta.pro&&!isPro){showToastMsg('ဒီ Type ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။');return;}
  var idea=collected.text;
  hideError('genError');hideStepError('genError2','genRetry2');
  shortBusy=true;
  currentShort='';
  studioMarkDone(1);
  // Unified: Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('shortLoading','AI က သင့်အတွက် Short Script ကို ရေးသားနေသည်...',idea);
  var sb=document.getElementById('shortResultBody');if(sb)sb.style.display='none';
  if(window.studioForceGoStep)window.studioForceGoStep(2);
  else window.studioGoStep(2);
  if(window.studioSetLoading)window.studioSetLoading({on:true});
  apiCall('/api/studio/short/generate',{idea:idea,type:selectedShortType})
    .then(function(data){
      currentShort=data.short||'';
      currentShortIdea=idea;
      if(window.aicsResultLoading)window.aicsResultLoading.hide('shortLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      var sb2=document.getElementById('shortResultBody');if(sb2)sb2.style.display='';
      studioMarkDone(1);studioMarkDone(2);
      document.getElementById('reviseHistory').innerHTML='';
      var ta=document.getElementById('shortResult');
      typewriteShort(currentShort,ta);
      shortBusy=false;
      if(window.studioForceGoStep)window.studioForceGoStep(2);
      else window.studioGoStep(2);
      showToastMsg('✓ Short Script ရေးပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Short Generate Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('shortLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      shortBusy=false;
      var sb3=document.getElementById('shortResultBody');if(sb3)sb3.style.display='none';
      showStepError('genError2','genRetry2',friendlyMsg(err,'short'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      if(window.studioUnmarkDone)window.studioUnmarkDone(2);
      showToastMsg('⚠️ '+(friendlyMsg(err,'short').replace(/\\n/g,' ')));
    });
}

// ===================== Typewriter + Auto Expand =====================
function stopTypewriter(){if(typewriterTimer){clearInterval(typewriterTimer);typewriterTimer=null;}}
function autoExpand(ta){if(!ta)return;ta.style.height='auto';ta.style.height=(ta.scrollHeight+2)+'px';}
function typewriteShort(text,ta){
  stopTypewriter();
  if(!ta)return;
  ta.value='';autoExpand(ta);
  var i=0,total=text.length;
  var step=Math.max(1,Math.round(total/150));
  typewriterTimer=setInterval(function(){
    i+=step;
    if(i>=total){ta.value=text;stopTypewriter();autoExpand(ta);currentShort=text;return;}
    ta.value=text.slice(0,i);
    autoExpand(ta);
  },18);
}
function onShortEdit(){
  stopTypewriter();
  var ta=document.getElementById('shortResult');
  if(ta){currentShort=ta.value;autoExpand(ta);}
}

// ===================== Step 03 — Revise =====================
function reviseShort(){
  var instruction=document.getElementById('feedbackInput').value.trim();
  if(!instruction){showError('revError','ဘယ်လိုပြင်ချင်လဲ ရေးပါ');return;}
  if(!currentShort){showError('revError','အရင် Short Script ကို ဖန်တီးပါ');return;}
  hideError('revError');
  document.getElementById('revLoading').classList.add('show');
  document.getElementById('reviseBtn').disabled=true;
  addHistory('user',instruction);
  document.getElementById('feedbackInput').value='';
  var latestShort=document.getElementById('shortResult').value;
  apiCall('/api/studio/short/revise',{idea:currentShortIdea,type:selectedShortType,currentShort:latestShort,instruction:instruction})
    .then(function(data){
      currentShort=data.short||'';
      var ta=document.getElementById('shortResult');
      if(ta){ta.value=currentShort;autoExpand(ta);}
      addHistory('ai','ပြင်ဆင်ပြီးပါပြီ — အထက်က Short Script ထဲမှာ ကြည့်ပါ');
      autoSave();
    })
    .catch(function(err){showError('revError',friendlyMsg(err,'short'));})
    .finally(function(){document.getElementById('revLoading').classList.remove('show');document.getElementById('reviseBtn').disabled=false;});
}
function addHistory(role,text){
  var div=document.createElement('div');div.className='revise-msg '+role;
  div.innerHTML='<div class="role">'+(role==='user'?'သင် (User)':'AI')+'</div>'+escapeHtml(text);
  document.getElementById('reviseHistory').appendChild(div);
  document.getElementById('reviseHistory').scrollTop=document.getElementById('reviseHistory').scrollHeight;
}
function focusRevise(){
  var r=document.getElementById('revise-section');
  if(r)r.scrollIntoView({behavior:'smooth',block:'center'});
  var f=document.getElementById('feedbackInput');
  if(f)f.focus();
}

// ===================== 03 → 04 (User နောက်ဆုံးပြင်ထားသော Final Short Script ကို ပို့သည်) =====================
function goToVideoForm(){
  var ta=document.getElementById('shortResult');
  stopTypewriter();
  if(ta)currentShort=ta.value;
  if(!currentShort||!currentShort.trim()){showToastMsg('ဗီဒီယို ဖန်တီးရန် Short Script မရှိသေးပါ');return;}
  stMarkDone(2);
  videoStarted=true;
  fillVideoScriptField();
  stSetMode('video');
  stGoForce(3);
  autoSave();
}
function fillVideoScriptField(){
  var ta=document.getElementById('videoScriptInput');
  if(!ta)return;
  ta.value=currentShort||'';
  autoExpand(ta);
}

// ===================== Step 04 → 05 → 06 (Short Video Plan) =====================
function generateShortVideoPlan(){
  if(planBusy)return;
  var script=document.getElementById('videoScriptInput').value.trim();
  if(!script){showError('planError','Short Script ထည့်ရန် လိုအပ်ပါသည် — Step 02 မှာ Script ရေးပြီးမှ ဆက်လုပ်ပါ');return;}
  hideError('planError');hideStepError('planError5','planRetry5');
  planBusy=true;
  var btn=document.getElementById('shortVideoBtn');
  if(btn)btn.disabled=true;
  studioMarkDone(3);
  // Unified: Video Result section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('planLoading','AI က သင့်အတွက် Short Video ကို ပြင်ဆင်နေသည်...',script);
  if(window.studioForceGoStep)window.studioForceGoStep(4);
  else window.studioGoStep(4);
  if(window.studioSetLoading)window.studioSetLoading({on:true});
  var continuity=document.getElementById('vidContinuity');
  var body={
    idea:script,
    type:selectedShortType,
    videoStyle:sel('vidStyleSel'),
    aspectRatio:sel('vidRatioSel'),
    duration:sel('vidDurationSel'),
    sceneDuration:sel('vidSceneSel'),
    visualStyle:sel('vidVisualSel'),
    cameraStyle:sel('vidCamSel'),
    language:sel('vidLangSel'),
    characterContinuity:(continuity&&continuity.checked)?'true':'false',
    additionalInstructions:document.getElementById('vidExtra')?document.getElementById('vidExtra').value.trim():''
  };
  if(refImages.length>0){
    body.images=refImages.map(function(img){return{base64:img.base64,mimeType:img.mimeType};});
  }
  apiCall('/api/studio/short/video',body)
    .then(function(data){
      currentScenes=data.scenes||[];
      currentCharacters=data.characters||[];
      if(window.aicsResultLoading)window.aicsResultLoading.hide('planLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      studioMarkDone(3);studioMarkDone(4);
      planBusy=false;
      if(btn)btn.disabled=false;
      if(window.studioForceGoStep)window.studioForceGoStep(4);
      else window.studioGoStep(4);
      renderFinalResult();
      showToastMsg('✓ Short Video ပြင်ဆင်ပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Short Video Plan Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('planLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      planBusy=false;
      if(btn)btn.disabled=false;
      showStepError('planError5','planRetry5',friendlyMsg(err,'video'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      if(window.studioUnmarkDone)window.studioUnmarkDone(4);
      showToastMsg('⚠️ '+(friendlyMsg(err,'video').replace(/\\n/g,' ')));
    });
}

// ===================== Reference Images (Short-specific) =====================
function onRefImageSelected(){
  var fileInput=document.getElementById('refImageInput');
  var files=fileInput.files;
  for(var i=0;i<files.length;i++){
    if(refImages.length>=MAX_REF_IMAGES){
      showToastMsg('Reference ပုံ အများဆုံး '+MAX_REF_IMAGES+' ပုံပဲ တင်လို့ရပါတယ်။');
      break;
    }
    var file=files[i];
    if(file.size>5*1024*1024){
      showToastMsg("'"+file.name+"' ပုံသည် 5MB ထက် ကျော်နေလို့ ကျော်သွားပါမည်။");
      continue;
    }
    addRefImageFile(file);
  }
  fileInput.value='';
}
function addRefImageFile(file){
  var reader=new FileReader();
  reader.onload=function(e){
    refImages.push({
      dataUrl:e.target.result,
      base64:e.target.result.split(',')[1],
      mimeType:file.type
    });
    renderRefPreviews();
  };
  reader.readAsDataURL(file);
}
function renderRefPreviews(){
  var container=document.getElementById('refPreview');
  if(!container)return;
  container.innerHTML='';
  refImages.forEach(function(img,idx){
    var thumb=document.createElement('div');
    thumb.className='ref-thumb';
    var imgEl=document.createElement('img');
    imgEl.src=img.dataUrl;
    var removeBtn=document.createElement('button');
    removeBtn.className='remove-x';
    removeBtn.textContent='✕';
    removeBtn.onclick=function(){removeRefImage(idx);};
    thumb.appendChild(imgEl);
    thumb.appendChild(removeBtn);
    container.appendChild(thumb);
  });
}
function removeRefImage(idx){
  refImages.splice(idx,1);
  renderRefPreviews();
}

// ===================== Step 06 — Short MAP (Characters + Scenes) =====================
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
  if(currentCharacters&&currentCharacters.length){
    html+='<div class="card"><div class="card-title">&#127934; Characters</div>';
    for(var i=0;i<currentCharacters.length;i++){
      (function(idx){
        var ch=currentCharacters[idx]||{};
        var prompt=ch.characterPrompt||ch.prompt||'(မရှိပါ)';
        var img=imgCache['char_'+idx]||ch.referenceImage||'';
        html+='<div class="final-char-card">';
        html+='<div class="final-char-head"><span class="final-char-name">&#128100; '+escapeHtml(ch.name||'Character '+(idx+1))+'</span><span class="final-char-id">'+escapeHtml(ch.id||('char_'+String(idx+1).padStart(2,'0')))+'</span></div>';
        var meta='';
        if(ch.age)meta+='<div>&#127875; အသက် '+escapeHtml(ch.age)+'</div>';
        if(ch.role)meta+='<div>&#127917; Role: '+escapeHtml(ch.role)+'</div>';
        if(ch.description)meta+='<div>&#128221; '+escapeHtml(ch.description)+'</div>';
        if(meta)html+='<div class="final-char-meta">'+meta+'</div>';
        html+='<div class="final-char-img" id="charImg_'+idx+'">'+(img?'<img class="aics-pv-img" src="'+img+'">':'<div class="empty-note">ရုပ်ပုံ မရှိသေးပါ</div>')+'</div>';
        html+='<div class="final-prompt-label">Character Reference Prompt</div>';
        html+='<div class="final-prompt-text">'+escapeHtml(prompt)+'</div>';
        html+='<div class="btn-row"><button class="btn-ghost" onclick="copyCharPrompt('+idx+')">&#128203; Copy Prompt</button><button class="btn-ghost" onclick="generateCharImage('+idx+')">&#127912; Character Image ဖန်တီးရန်</button></div>';
        html+='</div>';
      })(i);
    }
    html+='</div>';
  }
  if(currentScenes&&currentScenes.length){
    html+='<div class="card"><div class="card-title">&#127916; Scenes</div>';
    for(var j=0;j<currentScenes.length;j++){
      (function(idx){
        var s=currentScenes[idx]||{};
        var num=String(s.number||(idx+1));
        var title=s.title?(' — '+escapeHtml(s.title)):'';
        html+='<div class="final-scene-card">';
        html+='<div class="final-scene-title">&#127916; SCENE '+num+title+'</div>';
        html+='<div class="final-scene-box"><div class="final-box-label">&#127916; Video Prompt</div><div class="final-prompt-text">'+escapeHtml(s.videoPrompt||'(မရှိပါ)')+'</div><div class="btn-row"><button class="btn-ghost" onclick="copyVideoPrompt('+idx+')">&#128203; Copy Video Prompt</button></div></div>';
        html+='<div class="final-scene-box"><div class="final-box-label">&#127757; Environment Reference</div><div class="final-prompt-text">'+escapeHtml(s.environmentPrompt||'(မရှိပါ)')+'</div>';
        html+='<div class="scene-image-area" id="envImg_'+idx+'">'+(imgCache['env_'+idx]?'<img src="'+imgCache['env_'+idx]+'">':'<button class="btn btn-orange" style="font-size:12px;padding:8px 14px;min-height:36px;" onclick="generateEnvImage('+idx+')">&#127912; Environment Image ဖန်တီးပါ</button>')+'</div>';
        html+='<div class="btn-row"><button class="btn-ghost" onclick="copyEnvPrompt('+idx+')">&#128203; Copy Environment Prompt</button></div></div>';
        html+='<div class="final-scene-meta"><span>&#128100; Characters: '+escapeHtml(resolveSceneCharacters(idx))+'</span><span>&#9201; '+escapeHtml(durText(s.duration))+'</span></div>';
        html+='</div>';
      })(j);
    }
    html+='</div>';
  }
  if(!html)html='<div class="card"><div class="empty-note">ရလဒ် မရှိသေးပါ — Step 04 မှာ Short Video ဖန်တီးပါ</div></div>';
  c.innerHTML=html;
}

// ===================== Copy / Save / Export (Short-specific) =====================
function copyShort(){
  var text=document.getElementById('shortResult').value;
  if(!text){showToastMsg('Copy လုပ်ဖို့ Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function saveShort(){
  var text=document.getElementById('shortResult').value;
  if(!text){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var topic=document.getElementById('field_0').value.trim()||'Short Video';
  var defaultTitle=topic.substring(0,40)+(topic.length>40?'...':'');
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'SHORT',type:selectedShortType,title:title||defaultTitle,original_prompt:currentShortIdea,ai_output:text})
    .then(function(){showToastMsg('💾 My Creations ထဲ Save ပြီးပါပြီ');})
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
  apiCall('/api/studio/short/video-image',{prompt:prompt})
    .then(function(data){
      if(data.data){
        var src='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
        imgCache['char_'+idx]=src;
        currentCharacters[idx].referenceImage=src;
        if(area)area.innerHTML='<img class="aics-pv-img" src="'+src+'"><div style="margin-top:8px;"><a href="'+src+'" download="short_character_'+(idx+1)+'.png"><button class="btn-ghost">&#128190; Save Image</button></a></div>';
        autoSave();autoSaveImgCache();
      }else{if(area)area.innerHTML='<div class="empty-note">ရုပ်ပုံ မထွက်ပါ — ထပ်စမ်းပါ</div>';}
    })
    .catch(function(err){if(area)area.innerHTML='<div style="color:var(--error);font-size:12px;padding:10px;">'+escapeHtml(friendlyMsg(err,'image'))+'</div><div style="text-align:center;margin-top:4px;"><button class="btn-ghost" onclick="generateCharImage('+idx+')">&#8635; ထပ်စမ်းပါ</button></div>';});
}
function generateEnvImage(idx){
  if(!currentScenes[idx]||!currentScenes[idx].environmentPrompt){showToastMsg('Prompt မရှိပါ');return;}
  var area=document.getElementById('envImg_'+idx);
  if(area)area.innerHTML='<div style="display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;"><div class="spinner"></div><span style="font-size:13px;color:var(--cyan);">ရုပ်ပုံ ဖန်တီးနေပါသည်...</span></div>';
  apiCall('/api/studio/short/video-image',{prompt:currentScenes[idx].environmentPrompt})
    .then(function(data){
      if(data.data){
        var src='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
        imgCache['env_'+idx]=src;
        if(area)area.innerHTML='<img src="'+src+'"><div style="margin-top:8px;"><a href="'+src+'" download="short_scene_'+(idx+1)+'_env.png"><button class="btn-ghost">&#128190; Save Image</button></a></div>';
        autoSave();autoSaveImgCache();
      }else{if(area)area.innerHTML='<div class="empty-note">ရုပ်ပုံ မထွက်ပါ — ထပ်စမ်းပါ</div>';}
    })
    .catch(function(err){if(area)area.innerHTML='<div style="color:var(--error);font-size:12px;padding:10px;">'+escapeHtml(friendlyMsg(err,'image'))+'</div><div style="text-align:center;margin-top:4px;"><button class="btn-ghost" onclick="generateEnvImage('+idx+')">&#8635; ထပ်စမ်းပါ</button></div>';});
}

// ===================== Result Text / Export =====================
function buildShortResultText(){
  var parts=[];
  if(currentShort&&currentShort.trim())parts.push('SHORT SCRIPT\\n======================\\n'+currentShort);
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
  var text=buildShortResultText();
  if(!text.trim()){showToastMsg('Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function saveAllResult(){
  var text=buildShortResultText();
  if(!text.trim()){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var defaultTitle=(document.getElementById('field_0').value.trim()||'Short Result').substring(0,40);
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'SHORTVIDEO',type:selectedShortType,title:title||defaultTitle,original_prompt:currentShortIdea,ai_output:text})
    .then(function(){showToastMsg('💾 My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToastMsg('Save မအောင်မြင်ပါ: '+(err&&err.message||'Error'));});
}
function exportResult(){
  var text=buildShortResultText();
  if(!text.trim()){showToastMsg('Export လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='short_result.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
  showToastMsg('✓ Export ပြီးပါပြီ');
}

// ===================== Status Animation (Loading Steps 02/05) =====================
var statusTimers={};
function startStatusAnim(id){
  stopStatusAnim(id,false);
  var box=document.getElementById(id);if(!box)return;
  var lines=box.querySelectorAll('.st-line');
  var cur=0,started=false;
  for(var k=0;k<lines.length;k++){lines[k].className='st-line';var m=lines[k].querySelector('.st-marker');if(m)m.textContent='○';}
  statusTimers[id]=setInterval(function(){
    if(!started){lines[0].className='st-line active';var m0=lines[0].querySelector('.st-marker');if(m0)m0.textContent='●';started=true;return;}
    if(cur<lines.length){
      lines[cur].className='st-line done';
      var md=lines[cur].querySelector('.st-marker');if(md)md.textContent='✓';
      cur++;
      if(cur<lines.length){lines[cur].className='st-line active';var ma=lines[cur].querySelector('.st-marker');if(ma)ma.textContent='●';}
    }
  },1100);
}
function stopStatusAnim(id,allDone){
  if(statusTimers[id]){clearInterval(statusTimers[id]);delete statusTimers[id];}
  var box=document.getElementById(id);if(!box)return;
  var lines=box.querySelectorAll('.st-line');
  if(allDone){
    for(var k=0;k<lines.length;k++){
      lines[k].className='st-line done';
      var m=lines[k].querySelector('.st-marker');if(m)m.textContent='✓';
    }
  }
}

`;
