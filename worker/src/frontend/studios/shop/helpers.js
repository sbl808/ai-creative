// AI Creative Studio — Shop Studio / helpers.js (V2 refactor)
// Browser-side helpers — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const HELPERS_SCRIPT = `// ===================== Helpers =====================
function api(path,opts){
  opts=opts||{};
  var s=document.getElementById('aiModelSel');
  if(s&&s.value&&opts.body)opts.body.model=s.value;
  var headers=opts.headers||{};
  headers['Content-Type']='application/json';
  if(TOKEN)headers['Authorization']='Bearer '+TOKEN;
  return fetch(path,{method:opts.method||'GET',headers:headers,body:opts.body?JSON.stringify(opts.body):undefined})
    .then(function(r){return r.json().catch(function(){return {error:'bad_response',detail:'Server မှ တုံ့ပြန်မှု မရရှိပါ'};});});
}
function showToast(msg,type){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.className='toast show'+(type?' '+type:'');setTimeout(function(){t.className='toast';},2500);}
function base64ToBlob(b64,mime){var bin=atob(b64);var arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
function escapeHtml(s){var d=document.createElement('div');d.textContent=(s==null?'':String(s));return d.innerHTML;}
function escapeAttr(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function safeUrl(u){u=String(u||'').trim();return (u.indexOf('http://')===0||u.indexOf('https://')===0||u.indexOf('data:image/')===0||u.indexOf('/')===0)?u:'';}
function pad2(n){return String(n).padStart(2,'0');}

// User-friendly Burmese error message (API error object မှ)
function friendlyApiError(d){
  var msg=(d&&d.error)?String(d.error):'';
  var detail=(d&&d.detail)?String(d.detail):'';
  var hay=msg+' '+detail;
  if(/unauthorized|invalid_token/.test(hay))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
  if(/pro_only|feature_disabled|denied|disabled/i.test(hay))return 'ဒီ Feature ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။';
  if(/usage|limit|quota/i.test(hay))return 'Usage Limit ပြည့်သွားပါပြီ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  if(!msg&&!detail)return 'ဖန်တီး၍ မရပါ။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
  return msg+(detail?': '+detail:'');
}

// ===================== Status Animation (Loading steps) =====================
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
  },1000);
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

// ===================== Typewriter + Auto-expand =====================
function typewrite(ta,text){
  stopTypewriter();
  if(!ta)return;
  var i=0,total=text.length;
  var step=Math.max(1,Math.round(total/150));
  twRunning=true;
  ta.value='';
  twTimer=setInterval(function(){
    i+=step;
    if(i>=total){ta.value=text;twRunning=false;stopTypewriter();autoExpand(ta);return;}
    ta.value=text.slice(0,i);
    autoExpand(ta);
  },16);
}
function stopTypewriter(){if(twTimer){clearInterval(twTimer);twTimer=null;}twRunning=false;}
function autoExpand(ta){
  if(!ta)return;
  ta.style.height='auto';
  ta.style.height=(ta.scrollHeight+2)+'px';
}

// ===================== Draft Save (autoSave — Refresh ပြီးနောက် မပျောက်ရ) =====================
function sanitizeForDraft(state){
  var s=JSON.parse(JSON.stringify(state));
  if(s.video&&s.video.result){
    (s.video.result.characters||[]).forEach(function(c){if(c.referenceImage&&c.referenceImage.indexOf('data:')===0)c.referenceImage='';});
    (s.video.result.scenes||[]).forEach(function(sc){if(sc.envImage&&sc.envImage.indexOf('data:')===0)sc.envImage='';});
    if(s.video.result.product&&s.video.result.product.image&&s.video.result.product.image.indexOf('data:')===0)s.video.result.product.image='';
  }
  return s;
}
function autoSave(){
  try{
    var data=studioCollectDraft();
    localStorage.setItem('aics_draft_shop',JSON.stringify({step:window.studioCur?window.studioCur():1,data:data,savedAt:new Date().toISOString()}));
  }catch(e){
    try{
      var data2=studioCollectDraft();
      var s=sanitizeForDraft(data2.shopState);
      data2.shopState=s;
      localStorage.setItem('aics_draft_shop',JSON.stringify({step:window.studioCur?window.studioCur():1,data:data2,savedAt:new Date().toISOString()}));
    }catch(e2){}
  }
}
function scheduleSave(){if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(autoSave,400);}

`;
