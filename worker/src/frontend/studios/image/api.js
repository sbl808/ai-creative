// AI Creative Studio — Image Studio / api.js (V2 refactor)
// Browser-side api — extracted VERBATIM from frontend/image.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const API_SCRIPT = `(function init(){
  if(!token){document.getElementById('loginView').style.display='flex';document.getElementById('aicsApp').style.display='none';return;}
})();

// ===================== API =====================
function apiCall(url,body){
  var s=document.getElementById('aiModelSel');if(s&&s.value)body.model=s.value;
  return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)}).then(function(res){return res.json().then(function(data){if(!res.ok)throw new Error(data.detail||data.error||'Request failed');return data;});});
}

// ===================== Reference Images (Tab 1) =====================
function onRefSelected(){
  var fileInput=document.getElementById('refInput');
  var files=fileInput.files;
  for(var i=0;i<files.length;i++){
    if(refImages.length>=MAX_REF){showToast('Reference ပုံ အများဆုံး '+MAX_REF+' ပုံပဲ တင်လို့ရပါတယ်။',true);break;}
    var file=files[i];
    if(file.size>5*1024*1024){showToast("'"+file.name+"' ပုံသည် 5MB ထက် ကျော်နေလို့ ကျော်သွားပါမည်။",true);continue;}
    addRefFile(file);
  }
  fileInput.value='';
}
function addRefFile(file){
  var reader=new FileReader();
  reader.onload=function(e){
    refImages.push({dataUrl:e.target.result,base64:e.target.result.split(',')[1],mimeType:file.type});
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
    removeBtn.onclick=function(){removeRef(idx);};
    thumb.appendChild(imgEl);
    thumb.appendChild(removeBtn);
    container.appendChild(thumb);
  });
}
function removeRef(idx){
  refImages.splice(idx,1);
  renderRefPreviews();
}

// ===================== Step 01 → 02 → 03 (AI Prepare Prompt) =====================
function checkTypeAllowed(){
  var proTypes={2:true,3:true,4:true,5:true};
  if(proTypes[selectedImageType]&&!isPro){
    showToast('ဒီ Type ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။',true);
    return false;
  }
  return true;
}

function preparePrompt(){
  if(prepareBusy)return;
  var ideaEl=document.getElementById('ideaInput');
  var idea=ideaEl?ideaEl.value.trim():'';
  if(!idea){showError('prepareErr','ပုံဖော်ပြချင်တဲ့ အကြောင်းအရာ အနည်းဆုံး ဖြည့်ရေးပါ');return;}
  if(!checkTypeAllowed())return;
  hideError('prepareErr');
  hideStepError('prepareErr2','prepareRetry');
  var aud=document.getElementById('audSel');
  originalIdea=idea;
  if(aud&&aud.value)idea+='\\n\\nAudience: '+aud.value;
  prepareBusy=true;
  stopTypewriter();
  studioMarkDone(1);
  // Unified: Result (Prompt Result) section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('promptLoading','AI က သင့်အတွက် Image Prompt ကို ပြင်ဆင်နေသည်...',originalIdea);
  if(window.studioForceGoStep)window.studioForceGoStep(2);else window.studioGoStep(2);
  if(window.studioSetLoading)window.studioSetLoading({on:true});
  var body={idea:idea,type:selectedImageType};
  if(refImages.length>0){
    body.images=refImages.map(function(img){return{base64:img.base64,mimeType:img.mimeType};});
  }
  apiCall('/api/studio/image/prompt',body)
    .then(function(data){
      var promptText=(data&&data.prompt)?data.prompt:'';
      applyMapData((data&&data.map)?data.map:null,promptText);
      latestPrompt=promptText||buildFinalPromptFromMap();
      if(window.aicsResultLoading)window.aicsResultLoading.hide('promptLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      prepareBusy=false;
      studioMarkDone(1);
      studioMarkDone(2);
      var ta=document.getElementById('promptResult');
      if(ta)typewrite(latestPrompt,ta);
      if(window.studioForceGoStep)window.studioForceGoStep(2);else window.studioGoStep(2);
      showToast('✓ Image Prompt ပြင်ဆင်ပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Image Prompt Prepare Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('promptLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      prepareBusy=false;
      showStepError('prepareErr2','prepareRetry',friendlyMsg(err,'prepare'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      if(window.studioUnmarkDone)window.studioUnmarkDone(2);
      showToast('⚠️ '+(friendlyMsg(err,'prepare').replace(/\\n/g,' ')),true);
    });
}

// Backend MAP (ရှိလျှင်) ကို imageMap state သို့ ထည့်သည် — မရှိလျှင် fallback (တစ်ပိုင်းလုံး subject)
function applyMapData(map,promptText){
  var p=promptText||'';
  if(map&&(map.subject||map.style||map.environment||map.lighting||map.camera||map.finalPrompt)){
    imageMap.subject.description=(map.subject&&map.subject.description)?map.subject.description:'';
    imageMap.style.description=(map.style&&map.style.description)?map.style.description:'';
    imageMap.environment.description=(map.environment&&map.environment.description)?map.environment.description:'';
    imageMap.lighting.description=(map.lighting&&map.lighting.description)?map.lighting.description:'';
    imageMap.camera.description=(map.camera&&map.camera.description)?map.camera.description:'';
    imageMap.finalPrompt=(map.finalPrompt&&map.finalPrompt.trim())?map.finalPrompt:buildFinalPromptFromMap();
  }else{
    imageMap.subject.description=p;
    imageMap.style.description='';
    imageMap.environment.description='';
    imageMap.lighting.description='';
    imageMap.camera.description='';
    imageMap.finalPrompt=p;
  }
  finalPromptManual=false;
  imageMap.finalImage=null;
}

function buildFinalPromptFromMap(){
  var parts=[
    imageMap.subject.description,
    imageMap.style.description,
    imageMap.environment.description,
    imageMap.lighting.description,
    imageMap.camera.description
  ];
  return parts.filter(function(s){return s&&s.trim();}).join(', ');
}

// ===================== 03 → 04 (Latest Prompt auto-transfer) =====================
function goPrepare(){
  var ta=document.getElementById('promptResult');
  stopTypewriter();
  if(ta)latestPrompt=ta.value;
  if(!latestPrompt||!latestPrompt.trim()){showToast('Prompt မရှိသေးပါ — ပြန်ပြင်ဆင်ပါ',true);return;}
  prepPrompt=latestPrompt;
  imageMap.finalPrompt=latestPrompt;
  finalPromptManual=false;
  var pta=document.getElementById('prepPromptInput');
  if(pta){pta.value=prepPrompt;autoExpand(pta);}
  stMarkDone(2);
  stSetMode('image');
  stGoForce(3);
  autoSave();
}

// ===================== Step 04 → 05 → 06 (Generate Actual Image) =====================
function startGenerate(){
  if(generateBusy)return;
  var ta=document.getElementById('prepPromptInput');
  var p=ta?(ta.value||'').trim():'';
  if(!p){showError('genErr','ပုံဖန်တီးဖို့ Prompt လိုအပ်ပါသည် — အရင်ဆုံး Prompt ပြင်ဆင်ပါ');return;}
  hideError('genErr');
  hideStepError('genErr5','genRetry5');
  generateBusy=true;
  prepPrompt=p;
  studioMarkDone(3);
  // Unified: Image Result section အတွင်း loading ပြသည်
  if(window.aicsResultLoading)window.aicsResultLoading.show('imageLoading','AI က သင့်အတွက် ပုံကို ဖန်တီးနေသည်...',p);
  if(window.studioForceGoStep)window.studioForceGoStep(4);else window.studioGoStep(4);
  if(window.studioSetLoading)window.studioSetLoading({on:true});
  apiCall('/api/studio/image/generate',{prompt:p})
    .then(function(data){
      imageMap.finalImage={data:data.data,mimeType:data.mimeType};
      if(window.aicsResultLoading)window.aicsResultLoading.hide('imageLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      generateBusy=false;
      studioMarkDone(3);
      studioMarkDone(4);
      if(window.studioForceGoStep)window.studioForceGoStep(4);else window.studioGoStep(4);
      renderMap();
      showToast('✓ ပုံဖန်တီးပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      console.error('Image Generate Error:', err);
      if(window.aicsResultLoading)window.aicsResultLoading.hide('imageLoading');
      if(window.studioSetLoading)window.studioSetLoading({on:false});
      generateBusy=false;
      showStepError('genErr5','genRetry5',friendlyMsg(err,'generate'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      if(window.studioUnmarkDone)window.studioUnmarkDone(4);
      showToast('⚠️ '+(friendlyMsg(err,'generate').replace(/\\n/g,' ')),true);
    });
}

// ===================== MAP Regenerate (Updated MAP → Final Prompt → API → New Image) =====================
function regenerateImage(){
  if(regenBusy)return;
  var p=(imageMap.finalPrompt&&imageMap.finalPrompt.trim())?imageMap.finalPrompt:buildFinalPromptFromMap();
  if(!p){showToast('MAP ထဲမှာ ဖော်ပြချက် မရှိသေးပါ — အရင်ဆုံး Prompt ပြင်ဆင်ပါ',true);return;}
  hideError('regenError');
  regenBusy=true;
  setRegenLoading(true);
  apiCall('/api/studio/image/generate',{prompt:p})
    .then(function(data){
      imageMap.finalImage={data:data.data,mimeType:data.mimeType};
      regenBusy=false;
      setRegenLoading(false);
      renderMap();
      showToast('✓ ပုံအသစ် ဖန်တီးပြီးပါပြီ');
      autoSave();
    })
    .catch(function(err){
      regenBusy=false;
      setRegenLoading(false);
      var wrap=document.getElementById('mapImgWrap');
      if(wrap)renderMapImageInto(wrap);
      showError('regenError',friendlyMsg(err,'generate'));
    });
}
function setRegenLoading(on){
  var wrap=document.getElementById('mapImgWrap');
  if(!wrap)return;
  if(on){
    wrap.innerHTML='<div class="map-loading"><div class="spinner"></div><div class="loading-title" style="font-size:15px;">&#10024; AI ဖန်တီးနေသည်...</div><p class="loading-sub">ပုံအသစ် ဖန်တီးနေပါသည်</p></div>';
  }
}

// ===================== IMAGE MAP Render (Step 06) =====================
function renderMap(){
  var area=document.getElementById('imageMapArea');
  if(!area)return;
  var sections=[
    {key:'subject',icon:'👤',title:'SUBJECT'},
    {key:'style',icon:'🎨',title:'STYLE'},
    {key:'environment',icon:'🌍',title:'ENVIRONMENT'},
    {key:'lighting',icon:'💡',title:'LIGHTING'},
    {key:'camera',icon:'📷',title:'CAMERA'}
  ];
  var html='<div class="map-intro"><div class="map-title-lg">🗺️ IMAGE MAP</div><p>ပုံဖန်တီးမှု အချက်အလက်များ — Section တစ်ခုချင်းစီကို ✏️ Edit နှိပ်ပြီး ပြင်နိုင်ပါသည်။ Section တစ်ခုပြင်လျှင် Final Prompt သာ အလိုအလျောက် Update ဖြစ်ပါမည်။</p></div>';
  for(var i=0;i<sections.length;i++){
    var s=sections[i];
    var desc=(imageMap[s.key]&&imageMap[s.key].description)?imageMap[s.key].description:'';
    html+=mapCardHTML(s.icon,s.title,s.key,desc,false);
  }
  html+=mapCardHTML('✨','FINAL PROMPT','finalPrompt',imageMap.finalPrompt||'',true);
  html+='<div class="map-card map-image-card">' +
    '<div class="map-card-head"><span class="map-icon">🖼️</span><span class="map-title">FINAL IMAGE</span></div>' +
    '<div class="map-card-body"><div id="mapImgWrap"></div>' +
    '<div class="map-img-actions">' +
    '<button class="btn btn-secondary" onclick="scrollMapTop()">✏️ MAP ပြင်ရန်</button>' +
    '<button class="btn btn-purple" onclick="regenerateImage()">🔄 ပြန်ဖန်တီးရန်</button>' +
    '<button class="btn btn-success" onclick="downloadImage()">⬇️ Download</button>' +
    '</div>' +
    '<div class="error-box" id="regenError"></div>' +
    '</div></div>';
  area.innerHTML=html;
  var wrap=document.getElementById('mapImgWrap');
  if(wrap)renderMapImageInto(wrap);
}

function mapCardHTML(icon,title,key,desc,isPrompt){
  var descHtml=desc
    ?('<div class="map-desc">'+escapeHtml(desc)+'</div>')
    :('<div class="map-desc map-empty">(မဖြည့်ရသေးပါ)</div>');
  var extra='';
  if(isPrompt&&imageMap.finalPrompt){
    extra='<button class="btn btn-purple map-regen-btn" onclick="regenerateImage()">🔄 ပြန်ဖန်တီးရန်</button>';
  }
  return '<div class="map-card">' +
    '<div class="map-card-head"><span class="map-icon">'+icon+'</span><span class="map-title">'+title+'</span>' +
    '<button class="map-edit-btn" onclick="editMapSection(\\''+key+'\\')">✏️ Edit</button></div>' +
    '<div class="map-card-body" id="mapBody_'+key+'">'+descHtml+extra+'</div>' +
    '</div>';
}

// ===================== MAP Section Edit (တစ်ခုချင်းစီသာ ပြင်သည်) =====================
function editMapSection(key){
  var body=document.getElementById('mapBody_'+key);
  if(!body)return;
  var cur=(key==='finalPrompt')
    ?imageMap.finalPrompt
    :((imageMap[key]&&imageMap[key].description)||'');
  var ph=(key==='finalPrompt')?'Final Prompt ရေးပါ':'ဖော်ပြချက် ရေးပါ';
  body.innerHTML='<textarea class="map-edit-ta" id="mapEdit_'+key+'" placeholder="'+ph+'">'+escapeHtml(cur)+'</textarea>' +
    '<div class="map-edit-actions">' +
    '<button class="btn btn-success" onclick="saveMapSection(\\''+key+'\\')">💾 သိမ်းရန်</button>' +
    '<button class="btn btn-ghost" onclick="renderMap()">မလုပ်တော့ပါ</button>' +
    '</div>';
  var ta=document.getElementById('mapEdit_'+key);
  if(ta){ta.focus();autoExpand(ta);}
}

function saveMapSection(key){
  var ta=document.getElementById('mapEdit_'+key);
  var val=ta?(ta.value||'').trim():'';
  if(key==='finalPrompt'){
    imageMap.finalPrompt=val;
    finalPromptManual=true;
  }else{
    if(imageMap[key])imageMap[key].description=val;
    imageMap.finalPrompt=buildFinalPromptFromMap();
    finalPromptManual=false;
  }
  renderMap();
  showToast('✓ MAP ပြင်ပြီးပါပြီ — Final Prompt ကိုလည်း Update လုပ်ပြီးပါပြီ');
  autoSave();
}

function scrollMapTop(){
  var area=document.getElementById('imageMapArea');
  if(area)area.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderMapImageInto(wrap){
  if(!wrap)return;
  if(imageMap.finalImage){
    wrap.innerHTML='<div class="map-final-img"><img src="data:'+imageMap.finalImage.mimeType+';base64,'+imageMap.finalImage.data+'" alt="Final Image"></div>';
  }else{
    wrap.innerHTML='<div class="empty-note">🖼️ ပုံမရှိသေးပါ — "🔄 ပြန်ဖန်တီးရန်" နှိပ်ပြီး Final Prompt မှ ပုံဖန်တီးပါ</div>';
  }
}

`;
