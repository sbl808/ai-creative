// AI Creative Studio — Shop Studio / video.js (V2 refactor)
// Browser-side video — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const VIDEO_SCRIPT = `// ===================== VIDEO BRANCH =====================
function showVideoPhase(){
  var meta=videoBranchMeta();
  renderShopStepper();
  renderShopBranchStepper();
  document.getElementById('videoSetupCard').style.display=shopState.video.step===1?'':'none';
  document.getElementById('videoResultCard').style.display=shopState.video.step===2?'':'none';
  if(shopState.video.step===2)renderVideoResultMap();
}
function onVideoTextEdit(){
  var ta=document.getElementById('videoText');
  if(!ta)return;
  shopState.video.input.text=ta.value;
  autoExpand(ta);
  scheduleSave();
}
function collectVideoSetup(){
  var parts=[];
  var purpose=fieldVal('videoPurposeSel')||'Product Promotion';
  shopState.video.input.purpose=purpose;
  parts.push('VIDEO PURPOSE: '+purpose);
  var vType='';
  for(var i=0;i<VIDEO_TYPES.length;i++){if(VIDEO_TYPES[i].val===videoType){vType=VIDEO_TYPES[i].label;break;}}
  if(vType)parts.push('VIDEO TYPE: '+vType);
  var dur=fieldVal('videoDuration');if(dur)parts.push('DURATION: '+dur+' sec');
  var ratio=fieldVal('videoRatio');if(ratio)parts.push('ASPECT RATIO: '+ratio);
  var vs=fieldVal('videoVisualStyle');if(vs)parts.push('VISUAL STYLE: '+vs);
  var cs=fieldVal('videoCameraStyle');if(cs)parts.push('CAMERA STYLE: '+cs);
  var pf=fieldVal('videoPlatform');if(pf)parts.push('PLATFORM: '+pf);
  var sd=fieldVal('videoSceneDir');if(sd)parts.push('SCENE DIRECTION: '+sd);
  var ai=fieldVal('videoInstructions');if(ai)parts.push('ADDITIONAL INSTRUCTIONS: '+ai);
  return parts.join('\\n');
}
function generateVideo(){
  if(shopBusy)return;
  var text=document.getElementById('videoText').value.trim();
  if(!text){showToast('Video ဖန်တီးရန် Content ထည့်ပါ','error');return;}
  if(videoType!=='1'&&USER_PLAN!=='PRO'){showToast('ဒီ Type ကို Pro User သာ သုံးနိုင်ပါတယ်','error');return;}
  shopState.video.input.text=text;
  shopState.video.input.type=videoType;
  shopState.video.input.images=refImagesVideo;
  var setup=collectVideoSetup();
  var idea='PRODUCT CONTENT:\\n'+text+'\\n\\n'+setup;
  hideStepError('videoLoadingErr','videoLoadingRetry');
  shopState.video.step=2;
  showVideoPhase();
  setActionsForCurrent();
  shopBusy=true;
  // Unified: Video Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('videoLoading','AI ပြင်ဆင်နေသည်...',text);
  api('/api/studio/shop/video/generate',{method:'POST',body:{idea:idea,type:videoType,images:refImagesVideo}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('videoLoading');
    if(d.error){
      console.error('Shop Video Generate Error:', d.error);
      showStepError('videoLoadingErr','videoLoadingRetry','❌ Video ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      shopState.video.step=2;showVideoPhase();setActionsForCurrent();
      showToast('⚠️ Video ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    shopState.video.result={product:d.product||null,characters:d.characters||[],scenes:d.scenes||[]};
    shopState.video.step=2;
    showVideoPhase();
    setActionsForCurrent();
    showToast('✓ Video Plan ပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop Video Generate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('videoLoading');
    showStepError('videoLoadingErr','videoLoadingRetry','❌ Video ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
    shopState.video.step=2;showVideoPhase();setActionsForCurrent();
    showToast('⚠️ Video ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retryVideo(){
  hideStepError('videoLoadingErr','videoLoadingRetry');
  generateVideo();
}
function backFromVideoLoading(){
  hideStepError('videoLoadingErr','videoLoadingRetry');
  if(window.aicsResultLoading)window.aicsResultLoading.hide('videoLoading');
  shopState.video.step=1;
  showVideoPhase();
  setActionsForCurrent();
  autoSave();
}

// ===================== Video Result — Story Map =====================
function durText(v){
  if(v===undefined||v===null||v==='')return '-';
  if(typeof v==='number')return v+' sec';
  var s=String(v).trim();
  return /sec/i.test(s)?s:(s+' sec');
}
function resolveCharNames(ids){
  if(!Array.isArray(ids)||!ids.length)return '-';
  var chars=(shopState.video.result&&shopState.video.result.characters)||[];
  var names=[];
  ids.forEach(function(id){
    var found=null;
    for(var i=0;i<chars.length;i++){
      if(chars[i].id===id||chars[i].name===id){found=chars[i];break;}
    }
    names.push(found?('👤 '+found.name):String(id));
  });
  return names.join(', ');
}
function renderVideoResultMap(){
  var c=document.getElementById('videoResultMap');
  if(!c)return;
  var r=shopState.video.result||{product:null,characters:[],scenes:[]};
  var html='<div class="story-map">';
  // 1) Product Reference
  html+='<div class="sm-section"><div class="sm-section-title">🛍️ PRODUCT REFERENCE</div>';
  if(r.product&&r.product.prompt){
    html+='<div class="sm-card">';
    html+='<div class="sm-card-head"><span class="sm-card-name">🛍️ '+escapeHtml(r.product.name||'Product')+'</span></div>';
    html+='<div class="sm-lbl">Product Prompt</div><div class="sm-txt">'+escapeHtml(r.product.prompt)+'</div>';
    html+='<div class="btn-row"><button class="btn-ghost btn-sm" onclick="smCopyProduct()">&#128203; Copy Product Prompt</button></div>';
    html+='<div class="sm-img-area" id="img_product">'+(r.product.image?'<img class="shop-gen-img" src="'+safeUrl(r.product.image)+'" alt="Product">':'')+'</div>';
    html+='<div class="btn-row"><button class="btn btn-orange btn-sm" data-prompt="'+escapeAttr(r.product.prompt)+'" data-key="product" onclick="genImage(this)">🖼️ Generate Image</button></div>';
    html+='</div>';
  }else{
    html+='<div class="empty-note">Product Reference မရှိပါ</div>';
  }
  html+='</div>';
  // 2) Character Reference
  html+='<div class="sm-section"><div class="sm-section-title">👤 CHARACTER REFERENCE</div>';
  if(r.characters&&r.characters.length){
    for(var i=0;i<r.characters.length;i++){
      (function(idx){
        var ch=r.characters[idx]||{};
        var prompt=ch.characterPrompt||ch.prompt||'(မရှိပါ)';
        html+='<div class="sm-card sm-char">';
        html+='<div class="sm-card-head"><span class="sm-card-name">👤 '+escapeHtml(ch.name||'Character '+(idx+1))+'</span><span class="sm-id">'+escapeHtml(ch.id||('char_'+pad2(idx+1)))+'</span></div>';
        var meta='';
        if(ch.role)meta+='<span class="sm-meta-item">🎭 Role: <b>'+escapeHtml(ch.role)+'</b></span>';
        if(ch.age)meta+='<span class="sm-meta-item">🎂 Age: <b>'+escapeHtml(ch.age)+'</b></span>';
        if(meta)html+='<div class="sm-meta">'+meta+'</div>';
        if(ch.description)html+='<div class="sm-lbl">Description</div><div class="sm-txt">'+escapeHtml(ch.description)+'</div>';
        html+='<div class="sm-img-area" id="img_char'+idx+'">'+(ch.referenceImage?'<img class="shop-gen-img" src="'+safeUrl(ch.referenceImage)+'" alt="Character">':'')+'</div>';
        html+='<div class="sm-lbl">Reference Prompt</div><div class="sm-txt">'+escapeHtml(prompt)+'</div>';
        html+='<div class="btn-row"><button class="btn-ghost btn-sm" onclick="smCopyChar('+idx+')">&#128203; Copy Character Prompt</button><button class="btn btn-orange btn-sm" data-prompt="'+escapeAttr(prompt)+'" data-key="char'+idx+'" onclick="genImage(this)">🖼️ Generate Reference Image</button></div>';
        html+='</div>';
      })(i);
    }
  }else{
    html+='<div class="empty-note">Character မရှိပါ</div>';
  }
  html+='</div>';
  // 3) Scene Map (vertical timeline)
  html+='<div class="sm-section"><div class="sm-section-title">🎬 SCENE MAP</div>';
  if(r.scenes&&r.scenes.length){
    for(var j=0;j<r.scenes.length;j++){
      (function(idx){
        var sc=r.scenes[idx]||{};
        var num=sc.number||(idx+1);
        html+='<div class="sm-scene">';
        html+='<div class="sm-scene-head"><span class="sm-scene-title">🎬 Scene '+escapeHtml(num)+(sc.title?' — '+escapeHtml(sc.title):'')+'</span><span class="sm-id">'+escapeHtml(sc.id||('scene_'+pad2(num)))+'</span></div>';
        html+='<div class="sm-meta">';
        html+='<span class="sm-meta-item">⏱ Duration: <b>'+escapeHtml(durText(sc.duration))+'</b></span>';
        html+='<span class="sm-meta-item">👥 Characters: <b>'+resolveCharNames(sc.characterIds)+'</b></span>';
        html+='<span class="sm-meta-item">🎭 Emotion: <b>'+escapeHtml(sc.emotion||'-')+'</b></span>';
        html+='<span class="sm-meta-item">🎥 Camera: <b>'+escapeHtml(sc.camera||'-')+'</b></span>';
        html+='<span class="sm-meta-item">💡 Lighting: <b>'+escapeHtml(sc.lighting||'-')+'</b></span>';
        html+='</div>';
        html+='<div class="sm-box"><div class="sm-lbl">🎬 Video Prompt</div><div class="sm-txt">'+escapeHtml(sc.videoPrompt||'(မရှိပါ)')+'</div><div class="btn-row"><button class="btn-ghost btn-sm" onclick="smCopyVideoPrompt('+idx+')">&#128203; Copy Video Prompt</button></div></div>';
        html+='<div class="sm-box"><div class="sm-lbl">🌍 Environment Reference</div><div class="sm-txt">'+escapeHtml(sc.environmentPrompt||'(မရှိပါ)')+'</div>';
        html+='<div class="btn-row"><button class="btn-ghost btn-sm" onclick="smCopyEnvPrompt('+idx+')">&#128203; Copy Environment Prompt</button></div>';
        html+='<div class="sm-img-area" id="img_env'+idx+'">'+(sc.envImage?'<img class="shop-gen-img" src="'+safeUrl(sc.envImage)+'" alt="Environment">':'')+'</div>';
        if(sc.environmentPrompt)html+='<div class="btn-row"><button class="btn btn-orange btn-sm" data-prompt="'+escapeAttr(sc.environmentPrompt)+'" data-key="env'+idx+'" onclick="genImage(this)">🖼️ Generate Environment Image</button></div>';
        html+='</div>';
        html+='</div>';
      })(j);
    }
  }else{
    html+='<div class="empty-note">Scene မရှိပါ</div>';
  }
  html+='</div>';
  html+='</div>';
  c.innerHTML=html;
}
function storeImage(key,src){
  var r=shopState.video.result||{};
  if(key==='product'){if(r.product)r.product.image=src;}
  else if(key.indexOf('char')===0){var i=parseInt(key.slice(4),10);if(r.characters&&r.characters[i])r.characters[i].referenceImage=src;}
  else if(key.indexOf('env')===0){var j=parseInt(key.slice(3),10);if(r.scenes&&r.scenes[j])r.scenes[j].envImage=src;}
}
function genImage(btn){
  if(!btn)return;
  var prompt=(btn.getAttribute('data-prompt')||'').trim();
  var key=btn.getAttribute('data-key')||'';
  if(!prompt){showToast('Prompt မရှိပါ','error');return;}
  btn.disabled=true;btn.textContent='⏳ ဖန်တီးနေသည်...';
  api('/api/studio/shop/video-image',{method:'POST',body:{prompt:prompt}})
  .then(function(d){
    btn.disabled=false;btn.textContent='🖼️ Generate Image';
    if(d.error){showToast(friendlyApiError(d),'error');return;}
    var src='data:'+(d.mimeType||'image/png')+';base64,'+d.data;
    storeImage(key,src);
    var area=document.getElementById('img_'+key);
    if(area)area.innerHTML='<img class="shop-gen-img" src="'+src+'" alt="Generated"><div class="btn-row"><a href="'+src+'" download="shop_image.png"><button class="btn btn-secondary btn-sm">💾 Save Image</button></a></div>';
    autoSave();
  })
  .catch(function(){
    btn.disabled=false;btn.textContent='🖼️ Generate Image';
    showToast('Network error','error');
  });
}
function buildCombinedVideo(){
  var r=shopState.video.result||{};
  var t='';
  if(r.product&&r.product.prompt){t+='=== PRODUCT ===\\n'+(r.product.name||'')+'\\n'+(r.product.prompt||'')+'\\n\\n';}
  (r.characters||[]).forEach(function(ch,i){
    t+='=== CHARACTER '+(i+1)+' ===\\nID: '+(ch.id||'-')+'\\nName: '+(ch.name||'')+'\\nRole: '+(ch.role||'')+'\\nDescription: '+(ch.description||'')+'\\nPrompt: '+(ch.characterPrompt||ch.prompt||'')+'\\n\\n';
  });
  (r.scenes||[]).forEach(function(sc,i){
    t+='=== SCENE '+(sc.number||(i+1))+' ===\\nID: '+(sc.id||'-')+'\\nDuration: '+durText(sc.duration)+'\\nCharacters: '+((sc.characterIds||[]).join(', ')||'-')+'\\nEmotion: '+(sc.emotion||'-')+'\\nCamera: '+(sc.camera||'-')+'\\nLighting: '+(sc.lighting||'-')+'\\nENV: '+(sc.environmentPrompt||'')+'\\nVIDEO: '+(sc.videoPrompt||'')+'\\n\\n';
  });
  return t;
}
function copyAllVideo(){
  var r=shopState.video.result||{};
  if(!r.product&&!(r.scenes&&r.scenes.length)&&!(r.characters&&r.characters.length)){showToast('Result မရှိပါ','error');return;}
  navigator.clipboard.writeText(buildCombinedVideo());
  showToast('✓ Copy ပြီးပါပြီ','success');
}
function smCopy(text){
  if(!text){showToast('Copy စရာ မရှိပါ','error');return;}
  navigator.clipboard.writeText(text);
  showToast('&#128203; Copy ပြီးပါပြီ','success');
}
function smCopyProduct(){var r=shopState.video.result||{};smCopy((r.product&&r.product.prompt)||'');}
function smCopyChar(idx){var r=shopState.video.result||{};var ch=r.characters&&r.characters[idx];if(!ch)return;smCopy(ch.characterPrompt||ch.prompt||'');}
function smCopyVideoPrompt(idx){var r=shopState.video.result||{};var sc=r.scenes&&r.scenes[idx];if(!sc)return;smCopy(sc.videoPrompt||'');}
function smCopyEnvPrompt(idx){var r=shopState.video.result||{};var sc=r.scenes&&r.scenes[idx];if(!sc)return;smCopy(sc.environmentPrompt||'');}
function saveAllVideo(){
  var r=shopState.video.result||{};
  if(!r.product&&!(r.scenes&&r.scenes.length)&&!(r.characters&&r.characters.length)){showToast('Result မရှိပါ','error');return;}
  var title=prompt('Creation အမည်:',(shopState.video.input.text||'').substring(0,40));
  if(title===null)return;
  AICS_CREATIONS.save({studio:'SHOPVIDEO',type:videoType,title:title||'Shop Video',original_prompt:shopState.video.input.text||'',ai_output:buildCombinedVideo()})
  .then(function(){showToast('💾 Save ပြီးပါပြီ','success');})
  .catch(function(){showToast('Browser Storage မအောင်မြင်','error');});
}

`;
