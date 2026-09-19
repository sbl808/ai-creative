// AI Creative Studio — Shop Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `// ===================== Product Information Input (Structured — Step 01) =====================
var PRODUCT_FIELDS=[
  {id:'prodName',label:'Product Name (ကုန်ပစ္စည်း အမည်)'},
  {id:'prodCategory',label:'Product Category (အမျိုးအစား)'},
  {id:'prodDesc',label:'Product Description (ထုတ်ကုန် ဖော်ပြချက်)'},
  {id:'prodFeatures',label:'Key Features (အဓိကအင်္ဂါရပ်များ)'},
  {id:'prodBenefits',label:'Benefits (အကျိုးကျေးဇူးများ)'},
  {id:'prodPrice',label:'Price (စျေးနှုန်း)'},
  {id:'prodCurrency',label:'Currency (ငွေကြေး)'},
  {id:'prodTarget',label:'Target Customer (ပစ်မှတ်ဖောက်သည်)'},
  {id:'prodBrand',label:'Brand Name (အမှတ်တံဆိပ်)'},
  {id:'prodLang',label:'Language (ဘာသာစကား)'}
];
var ADVANCED_FIELDS=[
  {id:'advUsp',label:'USP / အဓိကအားသာချက်'},
  {id:'advOffer',label:'Offer / Discount (လျှော့စျေး)'},
  {id:'advCta',label:'CTA (လုပ်ဆောင်ရန် တိုက်တွန်းချက်)'},
  {id:'advTone',label:'Brand Tone (အမှတ်တံဆိပ် လေသံ)'},
  {id:'advDelivery',label:'Delivery Information (ပို့ဆောင်မှု)'},
  {id:'advWarranty',label:'Warranty (အာမခံ)'},
  {id:'advShopLink',label:'Shop Link (ဆိုင်လင့်)'},
  {id:'advInstructions',label:'Additional Instructions (ထပ်ဆောင်း ညွှန်ကြားချက်)'},
  {id:'advReference',label:'Reference (ရည်ညွှန်း)'}
];
function fieldVal(id){var e=document.getElementById(id);return e?(e.value||'').trim():'';}
function collectContentIdea(){
  var parts=[];
  PRODUCT_FIELDS.forEach(function(f){
    var v=fieldVal(f.id);
    if(v)parts.push(f.label+': '+v);
  });
  var cp=document.getElementById('contentPurposeSel');
  if(cp&&cp.value){
    var lab='Content Purpose: '+cp.value;
    for(var i=0;i<CONTENT_PURPOSES.length;i++){
      if(CONTENT_PURPOSES[i].val===cp.value){lab=CONTENT_PURPOSES[i].label;break;}
    }
    parts.push(lab);
  }
  ADVANCED_FIELDS.forEach(function(f){
    var v=fieldVal(f.id);
    if(v)parts.push(f.label+': '+v);
  });
  return parts.join('\\n\\n');
}
function syncContent(){
  var ta=document.getElementById('resultContent');
  if(ta&&ta.value!==undefined){
    // Typewriter ဖွင့်နေစဉ် textarea သည် partial value သာ ရှိနေသေးသည် —
    // ထိုအခါ full generated content (source) ကို မဖျောက်ရပါ။
    if(!twRunning)shopState.content.result=ta.value;
  }
  shopState.content.input.idea=collectContentIdea();
  shopState.content.input.type=contentType;
}
function onContentEdit(){
  stopTypewriter();
  var ta=document.getElementById('resultContent');
  if(!ta)return;
  shopState.content.result=ta.value;
  autoExpand(ta);
  scheduleSave();
}

// ===================== Reference Image Upload =====================
function setupRefUpload(inputId,previewId,arr){
  var inp=document.getElementById(inputId);
  if(!inp)return;
  inp.addEventListener('change',function(e){
    var files=e.target.files;
    for(var i=0;i<files.length;i++){
      if(arr.length>=5){showToast('အများဆုံး ၅ ပုံသာ တင်နိုင်ပါတယ်','error');break;}
      if(files[i].size>5*1024*1024){showToast('ပုံတစ်ပုံသည် 5MB ထက် မကျော်ရပါ','error');continue;}
      (function(file){
        var reader=new FileReader();
        reader.onload=function(ev){
          var b64=ev.target.result.split(',')[1];
          arr.push({base64:b64,mimeType:file.type||'image/png'});
          renderRefPreview(previewId,arr);
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    e.target.value='';
  });
}
function renderRefPreview(id,arr){
  var c=document.getElementById(id);
  if(!c)return;
  c.innerHTML='';
  arr.forEach(function(img,idx){
    var d=document.createElement('div');d.className='ref-thumb';
    var im=document.createElement('img');im.src='data:'+img.mimeType+';base64,'+img.base64;
    var x=document.createElement('button');x.className='remove-x';x.textContent='✕';
    x.onclick=function(){arr.splice(idx,1);renderRefPreview(id,arr);};
    d.appendChild(im);d.appendChild(x);c.appendChild(d);
  });
}

// ===================== Type Chips (Video) =====================
function buildTypes(containerId,types,varName){
  var c=document.getElementById(containerId);
  if(!c)return;
  c.innerHTML='';
  types.forEach(function(t){
    var d=document.createElement('div');
    d.className='type-chip'+(t.pro?' pro':'')+(t.val==='1'?' active':'');
    d.setAttribute('data-val',t.val);
    d.textContent=t.label;
    d.onclick=function(){
      if(t.pro&&USER_PLAN!=='PRO'){showToast('ဒီ Type ကို Pro User သာ သုံးနိုင်ပါတယ်','error');return;}
      c.querySelectorAll('.type-chip').forEach(function(x){x.classList.remove('active');});
      d.classList.add('active');
      if(varName==='video'){videoType=t.val;shopState.video.input.type=t.val;scheduleSave();}
    };
    c.appendChild(d);
  });
}
function setTypeChip(containerId,val){
  var c=document.getElementById(containerId);
  if(!c)return;
  c.querySelectorAll('.type-chip').forEach(function(x){
    if(x.getAttribute('data-val')===String(val))x.classList.add('active');
    else x.classList.remove('active');
  });
}

// ===================== MAIN STEP 01 → 02 (Content Generate) =====================
function generateContent(){
  if(shopBusy)return;
  var idea=collectContentIdea();
  // Validate — အနည်းဆုံး Product Name + Product Description ရှိရမည် (Instruction 08)
  if(!fieldVal('prodName')||!fieldVal('prodDesc')){showToast('အနည်းဆုံး Product Name နှင့် Product Description ထည့်ပါ','error');return;}
  if(!idea){showToast('အနည်းဆုံး Product Info ကို ထည့်ပါ','error');return;}
  if(contentType!=='1'&&USER_PLAN!=='PRO'){showToast('ဒီ Type ကို Pro User သာ သုံးနိုင်ပါတယ်','error');return;}
  shopState.content.input.idea=idea;
  shopState.content.input.type=contentType;
  shopState.content.input.images=refImagesContent;
  hideStepError('step2Err','step2Retry');
  shopBusy=true;
  // Unified: Result section အတွင်း loading ပြသည် (processing step မရှိ)
  studioMarkDone(1);
  if(window.studioForceGoStep)window.studioForceGoStep(2);
  else window.studioGoStep(2);
  shopState.view='content';
  showBranchViews();
  if(window.aicsResultLoading)window.aicsResultLoading.show('contentLoading','AI ရေးသားနေသည်...',idea);
  api('/api/studio/shop/content/generate',{method:'POST',body:{idea:idea,type:contentType,images:refImagesContent}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('contentLoading');
    if(d.error){
      console.error('Shop Content Generate Error:', d.error);
      showStepError('step2Err','step2Retry','❌ Content ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      showToast('⚠️ Content ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    var text=d.content||'';
    if(d.speakingStyle)text+='\\n\\n[SPEAKING STYLE]\\n'+d.speakingStyle;
    if(d.voiceStyle)text+='\\n\\n[VOICE STYLE]\\n'+d.voiceStyle;
    shopState.content.result=text;
    studioMarkDone(1);
    studioMarkDone(2);
    var ta=document.getElementById('resultContent');
    if(ta){ta.value=text;}
    shopState.view='content';
    showBranchViews();
    if(ta)typewrite(ta,text);
    showToast('✓ Content ဖန်တီးပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop Content Generate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('contentLoading');
    showStepError('step2Err','step2Retry','❌ Content ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
    showToast('⚠️ Content ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retryContent(){
  hideStepError('step2Err','step2Retry');
  generateContent();
}

// ===================== Content Result (Copy / Save / Revise Chat) =====================
function copyResult(){var t=document.getElementById('resultContent').value;if(!t){showToast('Copy လုပ်ဖို့ မရှိပါ','error');return;}navigator.clipboard.writeText(t);showToast('✓ Copy ပြီးပါပြီ','success');}
function saveContent(){
  var t=document.getElementById('resultContent').value;
  if(!t){showToast('Save လုပ်ဖို့ မရှိပါ','error');return;}
  var title=prompt('Creation အမည်:',t.substring(0,40));
  if(title===null)return;
  AICS_CREATIONS.save({studio:'SHOPCONTENT',type:contentType,title:title||'Shop Content',original_prompt:collectContentIdea(),ai_output:t})
  .then(function(){showToast('💾 Save ပြီးပါပြီ','success');})
  .catch(function(){showToast('Browser Storage မအောင်မြင်','error');});
}
function toggleChat(){var s=document.getElementById('chatSection');if(!s)return;s.style.display=s.style.display==='block'?'none':'block';}
function sendRevision(){
  var instr=document.getElementById('chatInput').value.trim();
  if(!instr){showToast('ညွှန်ကြားချက် ထည့်ပါ','error');return;}
  var current=document.getElementById('resultContent').value;
  if(!current){showToast('Content အရင် Generate လုပ်ပါ','error');return;}
  var log=document.getElementById('chatLog');
  log.innerHTML+='<div class="chat-bubble chat-user">'+escapeHtml(instr)+'</div>';
  document.getElementById('chatInput').value='';
  document.getElementById('loadingChat').classList.add('show');
  api('/api/studio/shop/content/revise',{method:'POST',body:{idea:collectContentIdea(),type:contentType,currentContent:current,instruction:instr}})
  .then(function(d){
    document.getElementById('loadingChat').classList.remove('show');
    if(d.error){showToast(friendlyApiError(d),'error');return;}
    var text=d.content||'';
    if(d.speakingStyle)text+='\\n\\n[SPEAKING STYLE]\\n'+d.speakingStyle;
    if(d.voiceStyle)text+='\\n\\n[VOICE STYLE]\\n'+d.voiceStyle;
    var ta=document.getElementById('resultContent');
    if(ta){ta.value=text;autoExpand(ta);}
    shopState.content.result=text;
    log.innerHTML+='<div class="chat-bubble chat-ai">✓ ပြင်ဆင်ပြီးပါပြီ</div>';
    log.scrollTop=log.scrollHeight;
    autoSave();
  })
  .catch(function(){
    document.getElementById('loadingChat').classList.remove('show');
    showToast('Network error','error');
  });
}

// ===================== Main Stepper (Main steps သာ — အမြဲမြင်ရမည်) =====================
// Main Stepper ကို မဖျောက်ဘဲ Branch Stepper ကို အောက်တွင် သီးခြားပြသည်
function renderShopStepper(){
  var c=document.getElementById('aicsStepper');if(!c)return;
  var hasResult=!!(shopState.content.result&&shopState.content.result.trim());
  var shellCur=(window.studioCur)?window.studioCur():1;
  var html='<div class="aics-stepper-inner">';
  for(var i=0;i<SHOP_MAIN_STEPS.length;i++){
    var s=SHOP_MAIN_STEPS[i];
    var n=i+1;
    var label=((n<10)?'0':'')+n+' '+String(s.label).replace(/^\\d+\\s*/,'');
    var cls='aics-step-btn';
    if(n===shellCur)cls+=' active';
    else if(n===1&&hasResult)cls+=' done';
    else if(n===2)cls+=hasResult?' done':' todo';
    var loadingSpan='<span class="aics-step-loading"><span class="aics-step-spinner"></span>'+(s.loading||'ဖန်တီးနေသည်...')+'</span>';
    html+='<button type="button" class="'+cls+'" data-step="'+n+'" onclick="shopMainNav('+n+')">'+
      '<span class="aics-step-txt"><span class="aics-step-label">'+label+'</span></span>'+loadingSpan+'</button>';
    if(i<SHOP_MAIN_STEPS.length-1)html+='<span class="aics-step-link"></span>';
  }
  html+='</div>';
  c.innerHTML=html;
}
function shopMainNav(n){
  if(window.studioGoStep)window.studioGoStep(n);
  // Shell update ပြီးနောက် Main + Branch stepper ကို ပြန် render သည်
  renderShopStepper();
  renderShopBranchStepper();
}
function shopBranchStepHint(){showToast('ဤအဆင့်သို့ တိုက်ရိုက် မသွားနိုင်ပါ — အောက်ရှိ ခလုတ်များဖြင့် ဆက်လုပ်ပါ');}
// ===================== Branch Stepper (Video / Audio / Image — Main အောက်တွင် သီးခြားပြသည်) =====================
function renderShopBranchStepper(){
  var c=document.getElementById('shopBranchStepper');if(!c)return;
  var meta=null;
  if(shopState.view==='video')meta=videoBranchMeta();
  else if(shopState.view==='audio')meta=audioBranchMeta();
  else if(shopState.view==='image')meta=imageBranchMeta();
  if(!meta){c.style.display='none';return;}
  c.style.display='';
  var html='<span class="shop-branch-label">Branch Stepper</span><div class="shop-branch-inner">';
  for(var i=0;i<meta.steps.length;i++){
    var done=meta.done.indexOf(i)!==-1;
    var cls='shop-bstep'+(done?' done':(i===meta.cur?' active':' todo'));
    var marker=done?'✓':(i===meta.cur?'●':'○');
    html+='<div class="'+cls+'"><span class="shop-bstep-marker">'+marker+'</span><span class="shop-bstep-label">'+meta.steps[i]+'</span></div>';
    if(i<meta.steps.length-1)html+='<span class="shop-bstep-link"></span>';
  }
  html+='</div>';
  c.innerHTML=html;
}
function videoBranchMeta(){
  var steps=['Video ပြင်ဆင်ရန်','Video Plan','Video ရလဒ်'];
  var hasRes=shopState.video.result&&(shopState.video.result.product||(shopState.video.result.scenes&&shopState.video.result.scenes.length));
  if(shopState.video.step===1)return {steps:steps,cur:0,done:[]};
  return hasRes?{steps:steps,cur:2,done:[0,1]}:{steps:steps,cur:1,done:[0]};
}
function audioBranchMeta(){
  var steps=['Audio ပြင်ဆင်ရန်','Audio ရလဒ်','SRT','SRT ရလဒ်','ဘာသာပြန်','ဘာသာပြန်ရလဒ်'];
  var cur,done;
  switch(shopState.audio.step){
    case 1:cur=0;done=[];break;
    case 2:cur=1;done=[0];break;
    case 3:cur=3;done=[0,1,2];break;
    case 4:cur=5;done=[0,1,2,3,4];break;
    default:cur=0;done=[];break;
  }
  return {steps:steps,cur:cur,done:done};
}
function imageBranchMeta(){
  var steps=['Image ပြင်ဆင်ရန်','Image ရလဒ်'];
  var cur,done;
  if(shopState.image.step===1){cur=0;done=[];}
  else{cur=1;done=[0];}
  return {steps:steps,cur:cur,done:done};
}

// ===================== View Switching (Branch ပြောင်းလျှင် state မပျောက် — Branch Isolation) =====================
function showBranchViews(){
  document.getElementById('viewContent').style.display=shopState.view==='content'?'':'none';
  document.getElementById('viewVideo').style.display=shopState.view==='video'?'':'none';
  document.getElementById('viewAudio').style.display=shopState.view==='audio'?'':'none';
  document.getElementById('viewImage').style.display=shopState.view==='image'?'':'none';
  // Main Stepper ကို မဖျောက်ဘဲ Branch Stepper ကို သီးခြား render သည်
  renderShopStepper();
  renderShopBranchStepper();
  if(shopState.view==='video')showVideoPhase();
  else if(shopState.view==='audio')showAudioPhase();
  else if(shopState.view==='image')showImagePhase();
}
function goContentResult(){
  stopTypewriter();
  syncContent();
  shopState.view='content';
  showBranchViews();
  setActionsForCurrent();
  autoSave();
}
// Product Content Result → Video Branch (Data Auto Transfer — user ကို ထပ်ကူးထည့်ခိုင်းမထားပါ)
function goVideoBranch(){
  if(!shopState.content.result||!shopState.content.result.trim()){showToast('Product Content အရင် ဖန်တီးပါ','error');return;}
  stopTypewriter();
  syncContent();
  shopState.view='video';
  var vta=document.getElementById('videoText');
  if(vta){vta.value=shopState.content.result;autoExpand(vta);}
  shopState.video.input.text=shopState.content.result;
  showBranchViews();
  setActionsForCurrent();
  autoSave();
}
// Product Content Result → Audio Branch (Data Auto Transfer)
function goAudioBranch(){
  if(!shopState.content.result||!shopState.content.result.trim()){showToast('Product Content အရင် ဖန်တီးပါ','error');return;}
  stopTypewriter();
  syncContent();
  shopState.view='audio';
  var ata=document.getElementById('audioText');
  if(ata){ata.value=shopState.content.result;autoExpand(ata);}
  shopState.audio.input.text=shopState.content.result;
  showBranchViews();
  setActionsForCurrent();
  autoSave();
}
// Product Content Result + Product Reference ပုံများ → Image Branch (Data Auto Transfer)
function goImageBranch(){
  if(!shopState.content.result||!shopState.content.result.trim()){showToast('Product Content အရင် ဖန်တီးပါ','error');return;}
  stopTypewriter();
  syncContent();
  shopState.view='image';
  var ita=document.getElementById('imageText');
  if(ita){ita.value=shopState.content.result;autoExpand(ita);}
  shopState.image.input.text=shopState.content.result;
  // Product Reference ပုံများကို Image Branch သို့ အလိုအလျောက် ကူးယူသည် (မရှိသေးမှသာ)
  if(refImagesImage.length===0&&refImagesContent.length>0){
    refImagesImage=JSON.parse(JSON.stringify(refImagesContent));
    renderRefPreview('refPreviewImage',refImagesImage);
  }
  shopState.image.input.images=refImagesImage;
  showBranchViews();
  setActionsForCurrent();
  autoSave();
}

`;
