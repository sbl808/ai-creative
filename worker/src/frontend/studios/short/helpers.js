// AI Creative Studio — Short Studio / helpers.js (V2 refactor)
// Browser-side helpers — extracted VERBATIM from frontend/short.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const HELPERS_SCRIPT = `(function init(){
  if(!token){var login=document.getElementById('loginView');var app=document.getElementById('aicsApp');if(login)login.classList.remove('is-hidden');if(app)app.classList.add('aics-hidden');return;}
  var _ue=document.getElementById('userEmail');if(_ue)_ue.textContent=userEmail||'—';
  var _pb=document.getElementById('planBadge');if(_pb)_pb.textContent=userPlan||'FREE';
  // Image cache is restored together with the Short draft from IndexedDB.\n  buildShortTypeSel();
  fillSelect('durSel',DURATIONS,'30 sec');
  fillSelect('toneSel',TONES,'Emotional');
  fillSelect('langSel',LANGUAGES,'မြန်မာ');
  fillSelect('vidStyleSel',VIDEO_STYLES,'Cinematic');
  fillSelect('vidRatioSel',RATIOS,'9:16');
  fillSelect('vidDurationSel',DURATIONS,'30 sec');
  fillSelect('vidSceneSel',SCENE_DURATIONS,'5 sec');
  fillSelect('vidVisualSel',VISUAL_STYLES,'Realistic');
  fillSelect('vidCamSel',CAMERA_STYLES,'Dynamic');
  fillSelect('vidLangSel',LANGUAGES,'မြန်မာ');
  var _ta=document.getElementById('field_0');
  if(_ta){_ta.addEventListener('input',function(){autoExpand(this);});}
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
function buildShortTypeSel(){
  var selEl=document.getElementById('shortTypeSel');if(!selEl)return;
  selEl.innerHTML='';
  for(var i=0;i<SHORT_TYPES.length;i++){
    (function(t){
      var o=document.createElement('option');
      o.value=t.v;
      o.textContent=t.label+(t.pro?' (PRO)':'');
      if(t.pro&&!isPro)o.disabled=true;
      selEl.appendChild(o);
    })(SHORT_TYPES[i]);
  }
  if(!isPro&&selectedShortType!=='1')selectedShortType='1';
  selEl.value=selectedShortType;
  selEl.addEventListener('change',function(){
    var v=selEl.value;
    var meta=SHORT_TYPES[parseInt(v,10)-1];
    if(meta&&meta.pro&&!isPro){showToastMsg('ဒီ Type ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။');selEl.value=selectedShortType;return;}
    selectedShortType=v;
  });
}

function toggleAdvFields(){
  var box=document.getElementById('advFields');
  var label=document.querySelector('#advToggle span');
  if(!box)return;
  var button=document.getElementById('advToggle');
  var isOpen=box.classList.toggle('open');
  if(button)button.setAttribute('aria-expanded',String(isOpen));
  if(label)label.textContent=isOpen?'ချုံ့ရန် ▲':'အပိုဆောင်းသတ်မှတ်ချက် (Advanced Options) ▼';
}

function apiCall(url,body){var s=document.getElementById('aiModelSel');if(s&&s.value)body.model=s.value;return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)}).then(function(res){return res.json().then(function(data){if(!res.ok)throw new Error(data.detail||data.error||'Request failed');return data;});});}

// GLOBAL RESULT STREAMING — NDJSON stream reader wrapper (model select + token handled inside)
function streamCall(url,body,handlers){
  var s=document.getElementById('aiModelSel');if(s&&s.value)body.model=s.value;
  if(!window.aicsStreamCall)return Promise.reject(new Error('streaming_not_available'));
  return window.aicsStreamCall(url,body,handlers);
}

`;
