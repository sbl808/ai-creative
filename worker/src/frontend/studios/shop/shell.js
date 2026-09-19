// AI Creative Studio — Shop Studio / shell.js (V2 refactor)
// Browser-side shell — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const SHELL_SCRIPT = `// ===================== Studio Shell Hooks (Main Stepper) =====================
function bReset(){return{label:'Reset',cls:'ghost',fn:studioReset};}

function setActionsForCurrent(){
  if(window.studioCur&&window.studioCur()!==2)return;
  var list=[];
  if(shopState.view==='content'){
    list=[bReset(),{label:'📋 Copy',cls:'secondary',fn:copyResult},{label:'💾 သိမ်းရန်',cls:'purple',fn:saveContent}];
  }else if(shopState.view==='video'){
    list=[{label:'← Product Content Result',cls:'ghost',fn:goContentResult},bReset()];
    if(shopState.video.step===2){
      list.push({label:'📋 Copy',cls:'secondary',fn:copyAllVideo});
      list.push({label:'💾 ဖန်တီးမှုအားလုံးသိမ်း',cls:'purple',fn:saveAllVideo});
    }
  }else if(shopState.view==='audio'){
    list=[{label:'← Product Content Result',cls:'ghost',fn:goContentResult},bReset()];
    if(shopState.audio.step===3)list.push({label:'📋 Copy SRT',cls:'secondary',fn:copySrt});
    if(shopState.audio.step===4)list.push({label:'📋 Copy Translated',cls:'secondary',fn:copyTranslated});
  }else if(shopState.view==='image'){
    list=[{label:'← Product Content Result',cls:'ghost',fn:goContentResult},bReset()];
    if(shopState.image.step===2){
      list.push({label:'📋 Copy Prompt',cls:'secondary',fn:copyImagePrompt});
      list.push({label:'💾 Save Image',cls:'purple',fn:saveImage});
    }
  }
  studioSetActions(list);
}
window.setActionsForCurrent=setActionsForCurrent;

function studioOnStep(n){
  shopState.mainStep=n;
  if(n===1){
    studioSetActions([bReset(),{label:'✨ Product Content ဖန်တီးရန်',cls:'primary',fn:generateContent}]);
  }else if(n===2){
    showBranchViews();
    setActionsForCurrent();
    var ta=document.getElementById('resultContent');
    if(ta&&ta.value)autoExpand(ta);
  }
}
window.studioOnStep=studioOnStep;

// ===================== Draft (studioCollectDraft / studioRestoreDraft) =====================
function normalizeState(s){
  var base={
    mainStep:1,
    view:'content',
    content:{input:{idea:'',type:'1',images:[]},result:''},
    video:{step:1,input:{text:'',type:'1',images:[],purpose:'Product Promotion'},result:{product:null,characters:[],scenes:[]}},
    audio:{step:1,input:{text:'',voiceName:'Puck',voiceGender:'male',purpose:'Product Description',settings:''},result:{data:'',mimeType:'audio/wav',url:'',voiceName:''},srt:{text:''},translation:{dir:'MY_TO_CN',srt:'',text:''}},
    image:{step:1,input:{text:'',images:[],purpose:'Product Image'},result:{data:'',mimeType:'image/png',url:'',prompt:''}}
  };
  function merge(b,o){
    if(!o||typeof o!=='object')return b;
    var out=Object.assign({},b);
    for(var k in o){
      if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])&&b[k]&&typeof b[k]==='object'){
        out[k]=merge(b[k],o[k]);
      }else{
        out[k]=o[k];
      }
    }
    return out;
  }
  return merge(base,s||{});
}

function studioCollectDraft(){
  syncContent();
  var fields={};
  PRODUCT_FIELDS.concat(ADVANCED_FIELDS).forEach(function(f){fields[f.id]=fieldVal(f.id);});
  var cp=document.getElementById('contentPurposeSel');
  return{
    shopState:sanitizeForDraft(shopState),
    contentType:contentType,
    videoType:videoType,
    fields:fields,
    purpose:(cp?cp.value:''),
    refCountContent:refImagesContent.length,
    refCountVideo:refImagesVideo.length,
    refCountImage:refImagesImage.length
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  if(d.shopState&&typeof d.shopState==='object'){
    shopState=normalizeState(d.shopState);
  }
  contentType=d.contentType||'1';
  videoType=d.videoType||'1';
  var cps=document.getElementById('contentPurposeSel');
  if(cps)cps.value=String(contentType);
  setTypeChip('videoTypes',videoType);
  if(d.fields){
    for(var k in d.fields){
      var el=document.getElementById(k);
      if(el&&el.value!==undefined)el.value=d.fields[k];
    }
  }
  var res=shopState.content.result||'';
  var rta=document.getElementById('resultContent');
  if(rta){rta.value=res;if(res)autoExpand(rta);}
  var vta=document.getElementById('videoText');
  if(vta&&shopState.video.input.text)vta.value=shopState.video.input.text;
  var ata=document.getElementById('audioText');
  if(ata&&shopState.audio.input.text)ata.value=shopState.audio.input.text;
  var ita=document.getElementById('imageText');
  if(ita&&shopState.image.input.text)ita.value=shopState.image.input.text;
  // Voice Gender → Voice (Content Studio style)
  var g=shopState.audio.input.voiceGender||'male';
  var rv=document.querySelector('input[name="audioGender"][value="'+g+'"]');
  if(rv)rv.checked=true;
  renderVoiceOptions(g,shopState.audio.input.voiceName||(g==='female'?'Kore':'Puck'));
  if(shopState.audio.result&&shopState.audio.result.data){
    lastAudioBase64=shopState.audio.result.data;
    try{
      var url=URL.createObjectURL(base64ToBlob(shopState.audio.result.data,shopState.audio.result.mimeType||'audio/wav'));
      shopState.audio.result.url=url;
      var ap=document.getElementById('audioPlayer');
      if(ap)ap.src=url;
    }catch(e){}
  }
  var so=document.getElementById('srtOriginal');
  if(so&&shopState.audio.srt)so.value=shopState.audio.srt.text||'';
  if(shopState.audio.translation&&shopState.audio.translation.dir)setTransDir(shopState.audio.translation.dir);
  // Reference images များကို ပြန် restore လုပ်သည် (Product Reference Upload / Auto Save ထိန်းသိမ်းရန်)
  if(shopState.content.input.images&&shopState.content.input.images.length){
    refImagesContent=JSON.parse(JSON.stringify(shopState.content.input.images));
    renderRefPreview('refPreviewContent',refImagesContent);
  }
  if(shopState.video.input.images&&shopState.video.input.images.length){
    refImagesVideo=JSON.parse(JSON.stringify(shopState.video.input.images));
    renderRefPreview('refPreviewVideo',refImagesVideo);
  }
  if(shopState.image.input.images&&shopState.image.input.images.length){
    refImagesImage=JSON.parse(JSON.stringify(shopState.image.input.images));
    renderRefPreview('refPreviewImage',refImagesImage);
  }
  if(res){studioMarkDone(1);studioMarkDone(2);}
}
window.studioRestoreDraft=studioRestoreDraft;

// ===================== Init =====================
(function init(){
  if(!TOKEN){
    document.getElementById('loginView').style.display='flex';
    document.getElementById('aicsApp').style.display='none';
    return;
  }
  var _ve=document.getElementById('userEmail');if(_ve)_ve.textContent=localStorage.getItem('aics_email')||'—';
  var _vp=document.getElementById('planBadge');if(_vp)_vp.textContent=localStorage.getItem('aics_plan')||'FREE';
  buildTypes('videoTypes',VIDEO_TYPES,'video');
  setupRefUpload('refImgContent','refPreviewContent',refImagesContent);
  setupRefUpload('refImgVideo','refPreviewVideo',refImagesVideo);
  setupRefUpload('refImgImage','refPreviewImage',refImagesImage);
  // Voice Gender → Voice (Content Studio style) — default Male / Puck
  renderVoiceOptions('male','Puck');
  var ap=document.getElementById('audioPlayer');
  if(ap){
    ap.addEventListener('loadedmetadata',function(){
      if(isFinite(ap.duration)){audioDuration=Math.round(ap.duration)+' sec';updateAudioInfo();}
    });
    ap.addEventListener('play',function(){var pb=document.getElementById('audioPlayBtn');if(pb)pb.textContent='⏸ Pause';});
    ap.addEventListener('pause',function(){var pb=document.getElementById('audioPlayBtn');if(pb)pb.textContent='▶ Play';});
  }
  api('/api/users/me').then(function(d){
    if(d.error){
      localStorage.removeItem('aics_token');
      location.reload();
      return;
    }
    var _ve2=document.getElementById('userEmail');if(_ve2)_ve2.textContent=d.email||'';
    var _vp2=document.getElementById('planBadge');if(_vp2)_vp2.textContent=d.plan||'FREE';
    var al=document.getElementById('adminLink');
    if(al)al.style.display=d.is_admin?'flex':'none';
    USER_PLAN=d.plan||'FREE';
    applyPlanGate();
  }).catch(function(){});
})();

function applyPlanGate(){
  var pro=USER_PLAN==='PRO';
  var gs=document.getElementById('genSrtBtn');
  var tb=document.getElementById('translateBtn');
  var srtNote=document.getElementById('srtLockNote');
  var transNote=document.getElementById('transLockNote');
  if(!pro){
    if(gs){gs.disabled=true;gs.title='Pro Feature';}
    if(tb){tb.disabled=true;tb.title='Pro Feature';}
    if(srtNote)srtNote.textContent='🔒 ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်';
    if(transNote)transNote.textContent='🔒 ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်';
  }
  var cts=document.getElementById('contentPurposeSel');
  if(cts){
    for(var i=0;i<cts.options.length;i++){
      cts.options[i].disabled=(!pro&&cts.options[i].value!=='1');
    }
  }
  var chips=document.querySelectorAll('.type-chip.pro');
  for(var j=0;j<chips.length;j++){
    if(pro)chips[j].classList.remove('locked');
    else chips[j].classList.add('locked');
  }
}
window.applyPlanGate=applyPlanGate;
`;
