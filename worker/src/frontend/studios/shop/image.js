// AI Creative Studio — Shop Studio / image.js (V2 refactor)
// Browser-side image — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const IMAGE_SCRIPT = `// ===================== IMAGE BRANCH (အသစ် — Video Branch နှင့် မချိတ်ပါ — Image State ထဲတွင်သာ သိမ်းသည်) =====================
function showImagePhase(){
  var meta=imageBranchMeta();
  renderShopStepper();
  renderShopBranchStepper();
  document.getElementById('imageSetupCard').style.display=shopState.image.step===1?'':'none';
  document.getElementById('imageResultCard').style.display=shopState.image.step===2?'':'none';
  if(shopState.image.step===2)renderImageResult();
}
function onImageTextEdit(){
  var ta=document.getElementById('imageText');
  if(!ta)return;
  shopState.image.input.text=ta.value;
  scheduleSave();
}
function collectImagePrompt(){
  var parts=[];
  var content=shopState.image.input.text||'';
  if(content)parts.push('PRODUCT CONTENT:\\n'+content);
  var purpose=fieldVal('imagePurposeSel')||'Product Image';
  shopState.image.input.purpose=purpose;
  parts.push('IMAGE PURPOSE: '+purpose);
  var st=fieldVal('imageStyleSel');if(st)parts.push('IMAGE STYLE: '+st);
  var bg=fieldVal('imageBg');if(bg)parts.push('BACKGROUND: '+bg);
  var cp=fieldVal('imageComposition');if(cp)parts.push('COMPOSITION: '+cp);
  var li=fieldVal('imageLighting');if(li)parts.push('LIGHTING: '+li);
  var ratio=fieldVal('imageRatio');if(ratio)parts.push('ASPECT RATIO: '+ratio);
  var ai=fieldVal('imageInstructions');if(ai)parts.push('ADDITIONAL INSTRUCTIONS: '+ai);
  if(refImagesImage.length>0)parts.push('PRODUCT REFERENCE IMAGES: ပူးတွဲထားသော Product ပုံများနှင့် ကိုက်ညီအောင် ဖန်တီးပါ ('+refImagesImage.length+' images)');
  return parts.join('\\n');
}
function generateImage(){
  if(shopBusy)return;
  var text=document.getElementById('imageText').value.trim();
  if(!text){showToast('Image ဖန်တီးရန် Content ထည့်ပါ','error');return;}
  shopState.image.input.text=text;
  shopState.image.input.images=refImagesImage;
  var prompt=collectImagePrompt();
  hideStepError('imageLoadingErr','imageLoadingRetry');
  shopState.image.step=2;
  showImagePhase();
  setActionsForCurrent();
  shopBusy=true;
  // Unified: Image Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('imageLoading','AI ဖန်တီးနေသည်...',text);
  api('/api/studio/shop/video-image',{method:'POST',body:{prompt:prompt,images:refImagesImage}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('imageLoading');
    if(d.error){
      console.error('Shop Image Generate Error:', d.error);
      showStepError('imageLoadingErr','imageLoadingRetry','❌ Image ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      shopState.image.step=2;showImagePhase();setActionsForCurrent();
      showToast('⚠️ Image ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    shopState.image.result={data:d.data||'',mimeType:d.mimeType||'image/png',url:d.url||'',prompt:prompt};
    shopState.image.step=2;
    showImagePhase();
    setActionsForCurrent();
    showToast('✓ Image ပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop Image Generate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('imageLoading');
    showStepError('imageLoadingErr','imageLoadingRetry','❌ Image ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    shopState.image.step=2;showImagePhase();setActionsForCurrent();
    showToast('⚠️ Image ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retryImage(){
  hideStepError('imageLoadingErr','imageLoadingRetry');
  generateImage();
}
function backFromImageLoading(){
  hideStepError('imageLoadingErr','imageLoadingRetry');
  if(window.aicsResultLoading)window.aicsResultLoading.hide('imageLoading');
  shopState.image.step=1;
  showImagePhase();
  setActionsForCurrent();
  autoSave();
}
function renderImageResult(){
  var box=document.getElementById('imageResultView');
  if(!box)return;
  var r=shopState.image.result||{};
  var html='';
  var imgSrc=safeUrl(r.url)||(r.data?('data:'+(r.mimeType||'image/png')+';base64,'+r.data):'');
  if(imgSrc)html+='<div class="image-result-box"><img src="'+imgSrc+'" alt="AI Generated Product Image"><div class="btn-row"><button class="btn btn-green btn-sm" onclick="copyImagePrompt()">📋 Copy Prompt</button><button class="btn btn-secondary btn-sm" onclick="saveImage()">💾 Save Image</button></div></div>';
  if(r.prompt)html+='<div class="image-prompt-box"><div class="srt-label">✏️ Image Prompt</div><div class="sm-txt">'+escapeHtml(r.prompt)+'</div><button class="btn btn-green btn-sm" style="margin-top:8px;" onclick="copyImagePrompt()">📋 Copy Prompt</button></div>';
  box.innerHTML=html||'<p class="hint">Image မရှိသေးပါ</p>';
}
function copyImagePrompt(){
  var r=shopState.image.result||{};
  if(!r.prompt){showToast('မရှိပါ','error');return;}
  navigator.clipboard.writeText(r.prompt);
  showToast('✓ Copy ပြီးပါပြီ','success');
}
function saveImage(){
  var r=shopState.image.result||{};
  var src=safeUrl(r.url)||(r.data?('data:'+(r.mimeType||'image/png')+';base64,'+r.data):'');
  if(!src){showToast('Image မရှိသေးပါ','error');return;}
  var a=document.createElement('a');
  a.href=src;
  a.download='shop-product-image-'+String(shopState.image.input.purpose||'image').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()+'.png';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

`;
