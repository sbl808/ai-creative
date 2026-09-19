// AI Creative Studio — Image Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/image.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `// ===================== Actions =====================
function copyPrompt(){
  var text=imageMap.finalPrompt||latestPrompt||'';
  if(!text){showToast('Copy လုပ်ဖို့ Prompt မရှိသေးပါ',true);return;}
  copyToClipboard(text);
  showToast('✓ Copy ပြီးပါပြီ');
}

function saveToCreations(){
  var resultText=imageMap.finalPrompt||latestPrompt||'';
  if(!resultText){showToast('Save လုပ်ဖို့ Result မရှိသေးပါ',true);return;}
  var topic=originalIdea||'Image Creation';
  var defaultTitle=topic.substring(0,40)+(topic.length>40?'...':'');
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  var media=imageMap.finalImage||null;
  AICS_CREATIONS.save({
    studio:'IMAGE',
    type:selectedImageType,
    original_prompt:originalIdea,
    ai_output:resultText,
    title:title||defaultTitle,
    media_type:media?'image':'',
    media_mime:media?media.mimeType:'',
    media_data:media?media.data:''
  })
    .then(function(){showToast('💾 My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToast('Save မအောင်မြင်ပါ: '+((err&&err.message)||'Error'),true);});
}

function downloadImage(){
  var m=imageMap.finalImage;
  if(!m){showToast('Download လုပ်ဖို့ ပုံမရှိသေးပါ',true);return;}
  var a=document.createElement('a');
  a.href='data:'+m.mimeType+';base64,'+m.data;
  a.download='image_studio_output.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('✓ Download စတင်ပါပြီ');
}

// ===================== Typewriter + Auto Expand =====================
function stopTypewriter(){if(typewriterTimer){clearInterval(typewriterTimer);typewriterTimer=null;}}
function autoExpand(ta){if(!ta)return;ta.style.height='auto';ta.style.height=(ta.scrollHeight+2)+'px';}
function typewrite(text,ta){
  stopTypewriter();
  if(!ta)return;
  ta.value='';autoExpand(ta);
  var i=0,total=text.length;
  var step=Math.max(1,Math.round(total/150));
  typewriterTimer=setInterval(function(){
    i+=step;
    if(i>=total){ta.value=text;stopTypewriter();autoExpand(ta);latestPrompt=text;return;}
    ta.value=text.slice(0,i);
    autoExpand(ta);
  },18);
}
function onPromptEdit(ta){
  stopTypewriter();
  if(ta){latestPrompt=ta.value;autoExpand(ta);}
}

// ===================== Status Animation =====================
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

// ===================== Error Helpers =====================
function friendlyMsg(err,kind){
  var m=(err&&err.message)?String(err.message):'';
  if(kind==='prepare'){
    if(/missing_idea/.test(m))return 'ပုံဖော်ပြချင်တဲ့ အကြောင်းအရာ အနည်းဆုံး ဖြည့်ရေးပါ။';
    if(/pro_only|feature_disabled/.test(m))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return '⚠️ Image Prompt ပြင်ဆင်၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return '⚠️ Image Prompt ပြင်ဆင်၍ မရပါ။\\nကျေးဇူးပြု၍ ပြန်လည်ကြိုးစားပါ။';
  }
  if(kind==='generate'){
    if(/missing_prompt/.test(m))return 'Prompt မရှိပါ — ပြန်ပြင်ဆင်ပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return '❌ Image ဖန်တီး၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return '❌ Image ဖန်တီး၍ မရပါ။\\nကျေးဇူးပြု၍ ပြန်လည်ကြိုးစားပါ။';
  }
  return '⚠️ လုပ်ဆောင်၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
}
function showError(id,msg){var el=document.getElementById(id);if(!el)return;el.textContent=msg;el.classList.add('show');}
function hideError(id){var el=document.getElementById(id);if(!el)return;el.classList.remove('show');}
function showStepError(id,rid,msg){
  var el=document.getElementById(id);
  if(el){el.innerHTML=String(msg).replace(/\\n/g,'<br>');el.classList.add('show');}
  var r=document.getElementById(rid);
  if(r)r.classList.add('show');
}
function hideStepError(id,rid){
  var el=document.getElementById(id);if(el)el.classList.remove('show');
  var r=document.getElementById(rid);if(r)r.classList.remove('show');
}
function showToast(msg,isError){
  var t=document.getElementById('toast');
  t.textContent=msg;
  if(isError)t.classList.add('error');else t.classList.remove('error');
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2500);
}
function escapeHtml(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function copyToClipboard(text){
  if(navigator.clipboard)navigator.clipboard.writeText(text);
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
}

// ===================== Stepper Actions =====================
function bReset(){return {label:'Reset',cls:'ghost',fn:studioReset};}

function studioOnStep(n){
  if(n===1){
    studioSetActions([bReset(),{label:'✨ Image Prompt ဖန်တီးရန်',cls:'primary',fn:preparePrompt}]);
  }else if(n===2){
    var ta=document.getElementById('promptResult');
    if(ta)autoExpand(ta);
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(1);}},
      bReset(),
      {label:'&#128203; Copy Prompt',cls:'secondary',fn:copyPrompt},
      {label:'&#128190; ဖန်တီးမှုသိမ်းပါ',cls:'purple',fn:saveToCreations},
      {label:'&#128295; ပုံဖန်တီးရန် ပြင်ဆင်မည်',cls:'primary',fn:goPrepare}
    ]);
  }else if(n===3){
    var pta=document.getElementById('prepPromptInput');
    if(pta&&!pta.value){pta.value=prepPrompt||'';autoExpand(pta);}
    studioSetActions([
      {label:'&#8592; Prompt ရလဒ်သို့ ပြန်ရန်',cls:'ghost',fn:function(){stSetMode('main');stGoForce(2);}},
      bReset(),
      {label:'&#10024; AI ပုံဖန်တီးရန်',cls:'primary',fn:startGenerate}
    ]);
  }else if(n===4){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(3);}},
      bReset(),
      {label:'&#128203; Copy Prompt',cls:'secondary',fn:copyPrompt},
      {label:'&#128190; ဖန်တီးမှုသိမ်းပါ',cls:'purple',fn:saveToCreations},
      {label:'&#128190; Save Image',cls:'success',fn:downloadImage}
    ]);
    renderMap();
  }
}
window.studioOnStep=studioOnStep;

// ===================== Draft (studioCollectDraft / studioRestoreDraft) =====================
function studioCollectDraft(){
  return {
    stepNow:window.studioCur?window.studioCur():1,
    mode:ST_MODE,
    imageType:selectedImageType,
    aud:document.getElementById('audSel')?document.getElementById('audSel').value:'',
    idea:originalIdea,
    ideaText:document.getElementById('ideaInput')?document.getElementById('ideaInput').value:'',
    refCount:refImages.length,
    latestPrompt:latestPrompt,
    prepPrompt:document.getElementById('prepPromptInput')?document.getElementById('prepPromptInput').value:'',
    resultText:document.getElementById('promptResult')?document.getElementById('promptResult').value:'',
    map:{
      subject:imageMap.subject.description,
      style:imageMap.style.description,
      environment:imageMap.environment.description,
      lighting:imageMap.lighting.description,
      camera:imageMap.camera.description,
      finalPrompt:imageMap.finalPrompt
    },
    finalPromptManual:finalPromptManual,
    hasFinalImage:!!imageMap.finalImage,
    finalImage:imageMap.finalImage
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  if(d.imageType){selectedImageType=d.imageType;var ts=document.getElementById('imgTypeSel');if(ts)ts.value=String(selectedImageType);}
  var aud=document.getElementById('audSel');
  if(aud&&d.aud)aud.value=d.aud;
  if(aud)window.aichAud=aud.value;
  if(d.idea)originalIdea=d.idea;
  var ie=document.getElementById('ideaInput');
  if(ie&&d.ideaText!=null)ie.value=d.ideaText;
  latestPrompt=d.latestPrompt||'';
  var rt=document.getElementById('promptResult');
  if(rt&&d.resultText!=null){rt.value=d.resultText;autoExpand(rt);}
  prepPrompt=d.prepPrompt||latestPrompt;
  var pt=document.getElementById('prepPromptInput');
  if(pt&&d.prepPrompt!=null){pt.value=d.prepPrompt;autoExpand(pt);}
  if(d.map){
    imageMap.subject.description=d.map.subject||'';
    imageMap.style.description=d.map.style||'';
    imageMap.environment.description=d.map.environment||'';
    imageMap.lighting.description=d.map.lighting||'';
    imageMap.camera.description=d.map.camera||'';
    imageMap.finalPrompt=d.map.finalPrompt||'';
  }
  finalPromptManual=!!d.finalPromptManual;
  imageMap.finalImage=(d.finalImage&&d.finalImage.data)?d.finalImage:null;
  if(!imageMap.finalPrompt&&(imageMap.subject.description||latestPrompt)){
    imageMap.finalPrompt=latestPrompt||buildFinalPromptFromMap();
  }
  if(latestPrompt){studioMarkDone(1);studioMarkDone(2);}
  if(prepPrompt||latestPrompt){studioMarkDone(2);}
  if(imageMap.finalImage){studioMarkDone(3);studioMarkDone(4);}
  if(d.map&&(imageMap.subject.description||imageMap.style.description||imageMap.finalPrompt))renderMap();
  // Restore mode (main vs image branch)
  if(d.mode==='image'&&(prepPrompt||latestPrompt)){ST_MODE='image';}
  // Resolve target step
  var target=d.stepNow||1;
  var tm=stMeta(target);
  if(!tm||tm.lock||!stAllowed(target)){
    var steps=stModeSteps();
    target=steps[steps.length-1].n;
    if(stMeta(target).lock)target=steps[steps.length-2].n;
    if(!stAllowed(target))target=1;
  }
  stCur=target;
  stShow(target);
}
window.studioRestoreDraft=studioRestoreDraft;

// ===================== Auto Save (Refresh ပြီးနောက် Data မပျောက်စေရ) =====================
function autoSave(){
  try{
    var data=studioCollectDraft();
    var envelope={step:window.studioCur?window.studioCur():1,data:data,savedAt:new Date().toISOString()};
    try{
      localStorage.setItem('aics_draft_image',JSON.stringify(envelope));
    }catch(e){
      // ပုံကြီးလွန်းလျှင် — Final Image မပါဘဲ သိမ်းသည် (flag သာ ထားသည်)
      data.hasFinalImage=!!imageMap.finalImage;
      data.finalImage=null;
      try{localStorage.setItem('aics_draft_image',JSON.stringify({step:envelope.step,data:data,savedAt:envelope.savedAt}));}catch(e2){}
    }
  }catch(e){}
}

// ============================================================
// Branch Stepper State Machine (Content Studio ပုံစံ — Main + Image Branch)
// Main: 1,2,3 | Image Branch: 4,5,6
// ============================================================
`;
