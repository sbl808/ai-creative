// AI Creative Studio — Short Studio / stepper.js (V2 refactor)
// Browser-side stepper — extracted VERBATIM from frontend/short.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STEPPER_SCRIPT = `window.studioReset=function(){
  if(!confirm('ဤ Studio ရဲ့ အချက်အလက်အားလုံးကို ဖျက်ပြီး အစကပြန်စမလား?'))return;
  try{localStorage.removeItem('aics_draft_short');}catch(e){}
  try{localStorage.removeItem('aics_draft_short_imgcache');}catch(e){}
  location.reload();
};

// ============================================================
// Branch Stepper State Machine (Content Studio ပုံစံ — Main + Video Branch)
// Main: 1,2,3 | Video Branch: 4,5,6
// ============================================================
var ST_MODE='main';
var stCur=1;
var stDone={};
var ST_STEPS={
  main:[
    { n:1, label:'01 Short အချက်အလက်' },
    { n:2, label:'02 Short Script ရလဒ်', req:[1] }
  ],
  video:[
    { n:3, label:'01 Video ပြင်ဆင်ရန်', req:[2] },
    { n:4, label:'02 MAP / နောက်ဆုံးရလဒ်', req:[3] }
  ]
};
function stMeta(n){
  var modes=['main','video'];
  for(var m=0;m<modes.length;m++){var s=ST_STEPS[modes[m]];for(var i=0;i<s.length;i++)if(s[i].n===n)return s[i];}
  return null;
}
function stModeSteps(){return ST_STEPS[ST_MODE]||ST_STEPS.main;}
// Main + Branch = Stepper တစ်ခုတည်း — Branch ဝင်လျှင် Main steps ကို မဖျောက်ဘဲ ဆက်ပေါင်းပြသည်
function stVisibleSteps(){
  var main=ST_STEPS.main||[];
  if(ST_MODE==='main'||!ST_STEPS[ST_MODE])return main.slice();
  return main.concat(ST_STEPS[ST_MODE]);
}
function stAllowed(n){
  if(stDone[n])return true;
  var m=stMeta(n);if(!m)return false;
  var req=m.req||[];
  if(req.length===0)return true;
  for(var i=0;i<req.length;i++)if(!stDone[req[i]])return false;
  return true;
}
function stNav(n){
  var m=stMeta(n);if(!m)return;
  if(m.lock){showToastMsg('ဤအဆင့်သည် AI ဆောင်ရွက်နေချိန် အဆင့်ဖြစ်ပြီး ကိုယ်တိုင် ရွေးချယ်၍ မရပါ');return;}
  if(!stAllowed(n)){showToastMsg('အရင်အဆင့်များ ပြီးမှ ဤအဆင့်သို့ ဆက်သွားနိုင်ပါသည်');return;}
  stGoForce(n);
}
function stGoForce(n){stCur=n;stShow(n);}
function stMarkDone(n){stDone[n]=true;stUpdateStepper();}
function stUnmarkDone(n){stDone[n]=false;stUpdateStepper();}
function stShow(n){
  var steps=document.querySelectorAll('.aics-step');
  for(var i=0;i<steps.length;i++){
    var ds=steps[i].getAttribute('data-step');
    steps[i].classList.toggle('active',parseInt(ds,10)===n);
  }
  var w=document.getElementById('aicsWork');if(w)w.scrollTop=0;
  stUpdateStepper();
  if(window.studioOnStep){try{window.studioOnStep(n);}catch(e){}}
}
function stUpdateStepper(){
  var btns=document.querySelectorAll('.aics-step-btn');
  for(var i=0;i<btns.length;i++){
    var n=parseInt(btns[i].getAttribute('data-step'),10);
    var m=stMeta(n);
    btns[i].classList.remove('active','done','todo');
    if(n===stCur)btns[i].classList.add('active');
    else if(stDone[n])btns[i].classList.add('done');
    else if(!stAllowed(n)||(m&&m.lock))btns[i].classList.add('todo');
  }
  if(window.studioScrollActiveStep)window.studioScrollActiveStep(true);
}
function stRenderStepper(){
  var c=document.getElementById('aicsStepper');if(!c)return;
  var steps=stVisibleSteps();
  var html='<div class="aics-stepper-inner">';
  for(var i=0;i<steps.length;i++){
    var s=steps[i];
    var label=((i+1<10)?'0':'')+(i+1)+' '+String(s.label).replace(/^\\d+\\s*/,'');
    html+='<button class="aics-step-btn" data-step="'+s.n+'" onclick="stNav('+s.n+')">'+
      '<span class="aics-step-txt"><span class="aics-step-label">'+label+'</span></span>'+
      '<span class="aics-step-loading"><span class="aics-step-spinner"></span>'+(s.loading||'ဖန်တီးနေသည်...')+'</span></button>';
    if(i<steps.length-1)html+='<span class="aics-step-link"></span>';
  }
  html+='</div>';
  c.innerHTML=html;
  stUpdateStepper();
}
function stSetMode(mode){ST_MODE=mode;stRenderStepper();}
window.studioGoStep=stNav;
window.studioForceGoStep=stGoForce;
window.studioMarkDone=stMarkDone;
window.studioUnmarkDone=stUnmarkDone;
window.studioCur=function(){return stCur;};
function stBoot(){
  stRenderStepper();
  stShow(stCur);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stBoot);
else stBoot();
`;
