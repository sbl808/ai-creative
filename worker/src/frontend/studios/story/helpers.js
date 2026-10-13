// AI Creative Studio — Story Studio / helpers.js (V2 refactor)
// Browser-side helpers — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const HELPERS_SCRIPT = `(function init(){
  if(!token){document.getElementById('loginView').style.display='flex';document.getElementById('aicsApp').style.display='none';return;}
  var _ue=document.getElementById('userEmail');if(_ue)_ue.textContent=userEmail||'—';
  var _pb=document.getElementById('planBadge');if(_pb)_pb.textContent=userPlan||'FREE';
  try{var ic=localStorage.getItem('aics_draft_story_imgcache');if(ic){imgCache=JSON.parse(ic)||{};}}catch(e){}
  buildIdeaFields();
  buildWorkflowSel();
  fillSelect('vidDurationSel',DURATIONS,'30 sec');
  fillSelect('vidSceneSel',SCENE_DURATIONS,'8 sec');
  fillSelect('vidRatioSel',RATIOS,'16:9');
  fillSelect('vidStyleSel',VISUAL_STYLES,'Realism');
  fillSelect('vidCamSel',CAMERA_STYLES,'Feature Film');
  fillSelect('vidLangSel',LANGUAGES,'မြန်မာ');
  var _ta=document.getElementById('field_0');
  if(_ta){_ta.addEventListener('input',function(){this.style.height='auto';this.style.height=(this.scrollHeight)+'px';});}
  updateGenBtn();
  var _db=debounce(autoSave,400);
  document.addEventListener('input',function(e){if(e.target&&e.target.closest&&e.target.closest('#aicsApp'))_db();},true);
  document.addEventListener('change',function(e){if(e.target&&e.target.closest&&e.target.closest('#aicsApp'))_db();},true);
})();

function debounce(fn,ms){var t=null;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},ms);};}
function sel(id){var e=document.getElementById(id);return e?e.value:'';}
function fillSelect(id,opts,defVal){
  var s=document.getElementById(id);if(!s)return;
  s.innerHTML='';
  for(var i=0;i<opts.length;i++){
    var o=document.createElement('option');o.value=opts[i];o.textContent=opts[i];
    if(opts[i]===defVal)o.selected=true;
    s.appendChild(o);
  }
}
// Video Workflow Select — Video Type (1–5) အစား Video Workflow (CINEMATIC_FEATURE …)
// Story Video သည် Feature-level PRO gate ဖြစ်သောကြောင့် option-level Pro မလို — config သာ
function buildWorkflowSel(){
  var selEl=document.getElementById('vidWorkflowSel');if(!selEl)return;
  selEl.innerHTML='';
  for(var i=0;i<VIDEO_WORKFLOWS.length;i++){
    (function(t){
      var o=document.createElement('option');
      o.value=t.v;
      o.textContent=t.label;
      selEl.appendChild(o);
    })(VIDEO_WORKFLOWS[i]);
  }
  selEl.value=selectedWorkflow;
  selEl.onchange=function(){selectedWorkflow=selEl.value;};
}

function apiCall(url,body){var s=document.getElementById('aiModelSel');if(s&&s.value)body.model=s.value;return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)}).then(function(res){return res.json().then(function(data){if(!res.ok)throw new Error(data.detail||data.error||'Request failed');return data;});});}

// GLOBAL RESULT STREAMING — NDJSON stream reader wrapper (model select + token handled inside)
function streamCall(url,body,handlers){
  var s=document.getElementById('aiModelSel');if(s&&s.value)body.model=s.value;
  if(!window.aicsStreamCall)return Promise.reject(new Error('streaming_not_available'));
  return window.aicsStreamCall(url,body,handlers);
}

// ===================== Advanced Settings Fields =====================
function buildIdeaFields(){
  var c=document.getElementById('ideaFields');if(!c)return;
  c.innerHTML='';
  for(var i=1;i<FIELD_CONFIG.length;i++){
    (function(f,idx){
      var row=document.createElement('div');row.className='form-group';
      var label=document.createElement('label');label.textContent=f.label;
      var input;
      if(f.multiline){
        input=document.createElement('textarea');
        input.style.minHeight='70px';
        input.addEventListener('input',function(){autoExpand(this);});
      }else{
        input=document.createElement('input');input.type='text';
      }
      input.id='field_'+idx;
      input.placeholder=f.placeholder;
      label.htmlFor=input.id;
      row.appendChild(label);row.appendChild(input);c.appendChild(row);
    })(FIELD_CONFIG[i],i);
  }
}

function collectIdeaText(){
  var lines=[],valid=true;
  for(var i=0;i<FIELD_CONFIG.length;i++){
    var el=document.getElementById('field_'+i);
    var val=el?el.value.trim():'';
    if(FIELD_CONFIG[i].required&&!val)valid=false;
    if(val)lines.push(FIELD_CONFIG[i].label.split(' (')[0]+': '+val);
  }
  var tone=document.getElementById('toneSel');if(tone&&tone.value)lines.push('ရေးသားပုံစံ (Tone): '+tone.value);
  var lang=document.getElementById('langSel');if(lang&&lang.value)lines.push('ဘာသာစကား (Language): '+lang.value);
  var aud=document.getElementById('audSel');if(aud&&aud.value)lines.push('ပရိသတ် (Audience): '+aud.value);
  return{text:lines.join('\\n'),valid:valid};
}

// ===================== Form Validation (Generate Button) =====================
function onStoryContentInput(){
  var ta=document.getElementById('field_0');
  if(ta){autoExpand(ta);}
  updateGenBtn();
}
function updateGenBtn(){
  var btn=document.getElementById('genStoryBtn');
  if(!btn)return;
  var ta=document.getElementById('field_0');
  var v=ta?ta.value.trim():'';
  btn.disabled=!v;
  if(v){hideField0Error();}
}
function showField0Error(){
  var g=document.getElementById('field_0');
  if(g&&g.closest){var grp=g.closest('.form-group');if(grp)grp.classList.add('has-error');}
}
function hideField0Error(){
  var g=document.getElementById('field_0');
  if(g&&g.closest){var grp=g.closest('.form-group');if(grp)grp.classList.remove('has-error');}
}

// ===================== Auto Expand (Global Result Box handles streaming display) =====================
function autoExpand(ta){if(!ta)return;ta.style.height='auto';ta.style.height=(ta.scrollHeight+2)+'px';}
function onStoryEdit(){
  var ta=document.getElementById('storyResult');
  if(ta){currentStory=ta.value;autoExpand(ta);}
}

// ===================== Error Helpers =====================
function friendlyMsg(err,kind){
  var m=(err&&err.message)?String(err.message):'';
  if(kind==='story'){
    if(/missing_idea/.test(m))return 'ဇာတ်လမ်းအကြောင်း အနည်းဆုံး ဖြည့်ရေးပါ။';
    if(/pro_only|feature_disabled/.test(m))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return 'ဇာတ်လမ်းရေးသားရာတွင် ပြဿနာတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return 'ဇာတ်လမ်းရေးသားရာတွင် ပြဿနာတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  }
  if(kind==='video'){
    if(/missing_idea/.test(m))return 'ဇာတ်လမ်း ထည့်ရန် လိုအပ်ပါသည် — Step 02 မှာ ဇာတ်လမ်းရေးပြီးမှ ဆက်လုပ်ပါ။';
    if(/pro_only|feature_disabled/.test(m))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/unauthorized|invalid_token/.test(m))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/fetch|network|failed/i.test(m))return 'Video ပြင်ဆင်ရာတွင် ပြဿနာတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return 'Video ပြင်ဆင်ရာတွင် ပြဿနာတစ်ခု ဖြစ်ပေါ်ခဲ့သည်။\\nScene များကို ခွဲခြားရာတွင် အခက်အခဲ ဖြစ်ပေါ်ခဲ့ပါသည်။';
  }
  if(kind==='image'){
    if(/fetch|network|failed/i.test(m))return 'ရုပ်ပုံ ဖန်တီး၍ မရပါ။\\nAI Server မှ တုံ့ပြန်မှု မရရှိပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return 'ရုပ်ပုံ ဖန်တီး၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  }
  return 'လုပ်ဆောင်၍ မရပါ။\\nခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
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
function showToastMsg(msg){var t=document.getElementById('toast');t.textContent=msg||'&#9989; ကူးယူပြီးပါပြီ';t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2500);}
function escapeHtml(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function copyToClipboard(text){
  if(!text){showToastMsg('Text မရှိပါ');return;}
  if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){showToastMsg();});
  else{var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToastMsg();}
}

`;
