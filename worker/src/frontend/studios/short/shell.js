// AI Creative Studio — Short Studio / shell.js (V2 refactor)
// Browser-side shell — extracted VERBATIM from frontend/short.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const SHELL_SCRIPT = `// ===================== Error Helpers (Myanmar — Technical error ကို မပြပါ) =====================
function friendlyMsg(err,kind){
  var m=(err&&err.message)?String(err.message):'';
  if(kind==='short'){
    if(/missing_idea/.test(m))return 'Short အကြောင်းအရာကို အနည်းဆုံး ဖြည့်ရေးပါ။';
    if(/pro_only|feature_disabled/.test(m))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return '⚠️ Short Script ရေးသား၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return '⚠️ Short Script ရေးသား၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  }
  if(kind==='video'){
    if(/missing_idea/.test(m))return 'Short Script ထည့်ရန် လိုအပ်ပါသည် — Step 03 မှာ Script ရေးပြီးမှ ဆက်လုပ်ပါ။';
    if(/pro_only|feature_disabled/.test(m))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return '⚠️ Short Video အတွက် ပြင်ဆင်၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return '⚠️ Short Video အတွက် ပြင်ဆင်၍ မရပါ။\\nScene များကို ခွဲခြားရာတွင် အခက်အခဲ ဖြစ်ပေါ်ခဲ့ပါသည်။';
  }
  if(kind==='image'){
    if(/fetch|network|failed/i.test(m))return '⚠️ ရုပ်ပုံ ဖန်တီး၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return '⚠️ ရုပ်ပုံ ဖန်တီး၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  }
  return '⚠️ လုပ်ဆောင်၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
}
function showError(id,msg){var el=document.getElementById(id);if(!el)return;el.textContent=msg;el.classList.add('show');}
function hideError(id){var el=document.getElementById(id);if(el)el.classList.remove('show');}
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
function showToastMsg(msg){var t=document.getElementById('toast');t.textContent=msg||'✅ ကူးယူပြီးပါပြီ';t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2500);}
function escapeHtml(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function copyToClipboard(text){
  if(!text){showToastMsg('Text မရှိပါ');return;}
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg('✅ ကူးယူပြီးပါပြီ');});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg('✅ ကူးယူပြီးပါပြီ');}
}

// ===================== Stepper Actions =====================
function bReset(){return {label:'Reset',cls:'ghost',fn:studioReset};}
function studioOnStep(n){
  if(n===1){
    studioSetActions([bReset(),{label:'&#10024; Generate Short',cls:'primary',fn:generateShort}]);
  }else if(n===2){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(1);}},
      bReset(),
      {label:'&#128203; Copy Short',cls:'secondary',fn:copyShort},
      {label:'&#128190; ဖန်တီးမှုသိမ်းပါ',cls:'purple',fn:saveShort},
      {label:'&#128203; Copy All',cls:'secondary',fn:copyAllResult},
      {label:'&#128190; ဖန်တီးမှုအားလုံးသိမ်း',cls:'purple',fn:saveAllResult}
    ]);
    var ta=document.getElementById('shortResult');
    if(ta)autoExpand(ta);
  }else if(n===3){
    fillVideoScriptField();
    var pb=document.getElementById('shortVideoBtn');
    if(pb)pb.disabled=false;
    studioSetActions([
      {label:'&#8592; Script ရလဒ်သို့ ပြန်ရန်',cls:'ghost',fn:function(){stSetMode('main');stGoForce(2);}},
      bReset()
    ]);
  }else if(n===4){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(3);}},
      {label:'&#128203; Copy All',cls:'secondary',fn:copyAllResult},
      {label:'&#128190; ဖန်တီးမှုအားလုံးသိမ်း',cls:'purple',fn:saveAllResult}
    ]);
    renderFinalResult();
  }
}
window.studioOnStep=studioOnStep;

// ===================== Draft (studioCollectDraft / studioRestoreDraft) =====================
// localStorage key: aics_draft_short — Story (aics_draft_story) နှင့် သီးခြား
function studioCollectDraft(){
  var fields={};
  var f0=document.getElementById('field_0');fields[0]=f0?f0.value:'';
  function v(id){var e=document.getElementById(id);return e?e.value:'';}
  return {
    stepNow:window.studioCur?window.studioCur():1,
    mode:ST_MODE,
    shortType:selectedShortType,
    fields:fields,
    aud:v('audInput'),
    dur:sel('durSel'),
    tone:sel('toneSel'),
    lang:sel('langSel'),
    mainMsg:v('mainMsg'),
    extraInstr:v('extraInstr'),
    adv:{hook:v('advHook'),cta:v('advCta'),charInfo:v('advCharInfo'),location:v('advLocation'),visualStyle:v('advVisualStyle'),ending:v('advEnding')},
    short:currentShort,
    shortIdea:currentShortIdea,
    videoStarted:videoStarted,
    videoForm:{
      script:document.getElementById('videoScriptInput')?document.getElementById('videoScriptInput').value:'',
      videoStyle:sel('vidStyleSel'),
      aspectRatio:sel('vidRatioSel'),
      duration:sel('vidDurationSel'),
      sceneDuration:sel('vidSceneSel'),
      visualStyle:sel('vidVisualSel'),
      cameraStyle:sel('vidCamSel'),
      language:sel('vidLangSel'),
      characterContinuity:document.getElementById('vidContinuity')?document.getElementById('vidContinuity').checked:true,
      additionalInstructions:v('vidExtra')
    },
    characters:currentCharacters,
    scenes:currentScenes,
    refCount:refImages.length
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  selectedShortType=d.shortType||'1';
  var sts=document.getElementById('shortTypeSel');if(sts)sts.value=selectedShortType;
  if(d.fields){var f0=document.getElementById('field_0');if(f0)f0.value=d.fields[0]||'';}
  var aud=document.getElementById('audInput');if(aud&&d.aud)aud.value=d.aud;
  function setv(id,val){var e=document.getElementById(id);if(e&&val)e.value=val;}
  setv('durSel',d.dur);setv('toneSel',d.tone);setv('langSel',d.lang);
  setv('mainMsg',d.mainMsg);setv('extraInstr',d.extraInstr);
  if(d.adv){
    setv('advHook',d.adv.hook);setv('advCta',d.adv.cta);setv('advCharInfo',d.adv.charInfo);
    setv('advLocation',d.adv.location);setv('advVisualStyle',d.adv.visualStyle);setv('advEnding',d.adv.ending);
  }
  currentShort=d.short||'';
  currentShortIdea=d.shortIdea||'';
  videoStarted=!!d.videoStarted;
  document.getElementById('shortResult').value=currentShort;
  if(d.videoForm){
    var vf=d.videoForm;
    var vs=document.getElementById('videoScriptInput');if(vs){vs.value=vf.script||currentShort;autoExpand(vs);}
    setv('vidStyleSel',vf.videoStyle);setv('vidRatioSel',vf.aspectRatio);
    setv('vidDurationSel',vf.duration);setv('vidSceneSel',vf.sceneDuration);
    setv('vidVisualSel',vf.visualStyle);setv('vidCamSel',vf.cameraStyle);setv('vidLangSel',vf.language);
    var cc=document.getElementById('vidContinuity');if(cc)cc.checked=vf.characterContinuity!==false;
    setv('vidExtra',vf.additionalInstructions);
  }
  currentCharacters=d.characters||[];
  currentScenes=d.scenes||[];
  var was=d.stepNow||1;
  if(currentShort){studioMarkDone(1);studioMarkDone(2);}
  if((videoStarted||was>=3)&&currentShort){studioMarkDone(2);}
  if(currentCharacters.length||currentScenes.length){studioMarkDone(3);studioMarkDone(4);}
  if(currentScenes.length||currentCharacters.length)renderFinalResult();
  // Restore mode (main vs video branch)
  if(d.mode==='video'&&(videoStarted||was>=3)&&currentShort){ST_MODE='video';}
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
}
window.studioRestoreDraft=studioRestoreDraft;

// ===================== Auto Save (Refresh ပြီးနောက် Data မပျောက်စေရ) =====================
function autoSave(){
  try{
    var data=studioCollectDraft();
    localStorage.setItem('aics_draft_short',JSON.stringify({step:window.studioCur?window.studioCur():1,data:data,savedAt:new Date().toISOString()}));
  }catch(e){}
}
function autoSaveImgCache(){
  try{localStorage.setItem('aics_draft_short_imgcache',JSON.stringify(imgCache));}catch(e){}
}

// Reset — Shared Reset ၏ Draft ဖျက်ခြင်းနှင့်အတူ Short Image Cache ကိုပါ ရှင်းသည်
`;
