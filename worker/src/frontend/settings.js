// AI Creative Studio — Settings UI Frontend (Phase 3 — Personal User System)
// Profile / Preferences / API Key — User တစ်ယောက်ချင်းစီအတွက် သီးသန့်
// Sidebar + Helper Script များကို Shared Component (frontend/shared.js) မှ ယူသည်

import { renderSidebar, sidebarScript, shellIcon } from './shared.js';
import { STUDIO_ORDER, getStudio } from '../config/studios.js';

// Studio စာရင်းကို Registry မှ အလိုအလျောက် ထုတ်သည် (ပြောင်းလဲမှု ရှိပါက ဤနေရာမှ အလိုအလျောက် ပြောင်းသည်)
const studioOptions = STUDIO_ORDER.map(function (id) {
  const s = getStudio(id);
  return '<option value="' + s.id + '">' + s.icon + ' ' + s.nameMy + '</option>';
}).join('\n      ');

export const SETTINGS_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Settings — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#f6f8fb);--card:var(--aics-surface,#fff);--card2:var(--aics-surface-subtle,#f8fafc);--text:var(--aics-text,#172033);--text2:var(--aics-text-muted,#667085);--text3:var(--aics-text-soft,#667085);--border:var(--aics-border,#e5eaf1);--border-strong:var(--aics-border-strong,#d7dee8);--primary:var(--aics-primary,#5b5bd6);--primary-hover:var(--aics-primary-hover,#4b4bc4);--primary-soft:var(--aics-primary-soft,#f0efff);--primary-border:var(--aics-primary-border,#d9d6fe);--success:var(--aics-success,#16845b);--error:var(--aics-danger,#c4323a);--warning:var(--aics-warning,#b54708);--focus:var(--aics-focus,rgba(91,91,214,.28));}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--aics-font,Inter,"Noto Sans Myanmar",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6;}
a{color:var(--primary);text-decoration:none;}
.page-title{font-size:22px;font-weight:700;color:var(--text);margin-bottom:8px;letter-spacing:-.25px;}
.page-title .lucide-icon{display:inline-block;width:20px;height:20px;vertical-align:-3px;margin-right:5px;color:var(--primary);}
.page-subtitle{color:var(--text2);font-size:13.5px;margin-bottom:20px;}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.tab{padding:9px 15px;border-radius:var(--aics-radius-sm,8px);border:1px solid var(--border);background:var(--card);color:var(--text2);font:inherit;font-size:13.5px;cursor:pointer;font-weight:600;transition:background .16s,color .16s,border-color .16s,box-shadow .16s;}
.tab:hover{background:var(--card2);color:var(--text);}
.tab:focus-visible,.btn:focus-visible,.form-input:focus-visible,.form-select:focus-visible{outline:3px solid var(--focus);outline-offset:2px;}
.tab.active{background:var(--primary-soft);color:var(--primary);border-color:var(--primary-border);}
.tab-panel{background:var(--card);border:1px solid var(--border);border-radius:var(--aics-radius-md,12px);padding:24px;box-shadow:var(--aics-shadow-sm,0 1px 2px rgba(16,24,40,.06));}
.form-row{margin-bottom:18px;}
.form-row label{display:block;color:var(--text2);font-size:13px;margin-bottom:6px;font-weight:600;}
.form-input,.form-select{width:100%;max-width:420px;padding:10px 12px;border-radius:var(--aics-radius-sm,8px);border:1px solid var(--border-strong);background:var(--card);color:var(--text);font:inherit;font-size:14px;}
.form-input::placeholder{color:var(--text3);}
.form-input:focus,.form-select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--focus);outline:none;}
.btn{padding:10px 18px;border:1px solid transparent;border-radius:var(--aics-radius-sm,8px);cursor:pointer;font-weight:650;font-size:13.5px;min-height:42px;transition:background .16s,color .16s,border-color .16s,box-shadow .16s;}
.btn:disabled{opacity:.6;cursor:wait;}
.btn-primary{background:var(--primary);color:#fff;}
.btn-primary:hover:not(:disabled){background:var(--primary-hover);}
.btn-secondary{background:var(--card);border-color:var(--border-strong);color:var(--text);}
.btn-secondary:hover:not(:disabled){background:var(--card2);}
.profile-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.profile-row:last-child{border-bottom:none;}
.profile-label{color:var(--text2);font-size:13px;}
.profile-value{color:var(--text);font-weight:600;word-break:break-all;text-align:right;}
.plan-badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:var(--card2);border:1px solid var(--border);color:var(--text2);}
.plan-badge.pro{background:#eaf7f1;border-color:#b7e4cf;color:var(--success);}
.key-status{padding:14px;border-radius:var(--aics-radius-sm,8px);background:var(--card2);border:1px solid var(--border);margin-bottom:16px;font-size:14px;}
.key-has{color:var(--success);}.key-none{color:var(--warning);}
.hint{color:var(--text2);font-size:12.5px;margin-top:8px;line-height:1.7;}
.empty-state{text-align:center;color:var(--text2);padding:60px 20px;}
.loading-state{text-align:center;color:var(--primary);padding:40px 20px;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:var(--text);padding:12px 20px;border-radius:var(--aics-radius-md,12px);font-size:14px;z-index:9999;display:none;box-shadow:var(--aics-shadow-md,0 8px 24px rgba(16,24,40,.08));}
.toast.show{display:block;}.toast.success{border-color:var(--success);}.toast.error{border-color:var(--error);}
@media(max-width:600px){.tab-panel{padding:17px;}.profile-value{text-align:left;width:100%;}.tabs{gap:6px;}.tab{min-height:44px;flex:1 1 auto;}}
@media(prefers-reduced-motion:reduce){.tab,.btn{transition:none;}}

/* AICS UIUX: shared theme bridge and keyboard/touch accessibility */
html[data-aics-theme="light"] .aics-app{
  --bg:#f5f7fb;--card:#ffffff;--card2:#f0f4fa;--text:#172033;
  --text2:#526078;--text3:#718096;--border:#d8e0eb;--border-strong:#bdc9da;
  --primary:#5145cd;--primary-hover:#4338b8;--primary-soft:#f0efff;
  --primary-border:#d9d6fe;--success:#087f5b;--error:#c53030;--warning:#975a16;
  --focus:rgba(81,69,205,.30);
}
html[data-aics-theme="dark"] .aics-app{
  --bg:#080c18;--card:#0d1424;--card2:#111a2e;--text:#e8ecf4;
  --text2:#8b95a8;--text3:#5a6478;--border:rgba(0,229,255,.15);--border-strong:rgba(0,229,255,.35);
  --primary:#00e5ff;--primary-hover:#55efff;--primary-soft:rgba(0,229,255,.12);
  --primary-border:rgba(0,229,255,.35);--success:#00c982;--error:#ff5252;--warning:#ffc107;
  --focus:rgba(0,229,255,.32);
}
.aics-app :where(button,a,input,select,textarea,[role="button"],[tabindex]):focus-visible{
  outline:2px solid var(--primary);outline-offset:3px;
}
.aics-app :where(button,input,select,textarea){font:inherit}
.aics-app button:disabled{cursor:not-allowed;opacity:.62}
.aics-app :where(button,.btn,.tab){touch-action:manipulation}
@media(max-width:767px){
  .aics-app input,.aics-app select{min-height:42px}
  .aics-app .btn,.aics-app .tab{min-height:42px}
}
@media(prefers-reduced-motion:reduce){
  .aics-app *, .aics-app *::before, .aics-app *::after{
    scroll-behavior:auto!important;animation-duration:.01ms!important;
    animation-iteration-count:1!important;transition-duration:.01ms!important;
  }
}

</style>
</head>
<body>
<div class="aics-app" id="aicsApp">
<header class="aics-header">
<button type="button" class="aics-menu-btn" onclick="toggleSidebar()" aria-label="Menu ဖွင့်ရန် / ပိတ်ရန်" aria-controls="sidebar" aria-expanded="false">${shellIcon('menu')}</button>
<div class="aics-brand"><span class="aics-brand-icon">${shellIcon('sparkles')}</span><span class="aics-title">AI Creative Studio</span></div>
<div class="aics-pro" id="sidePlan">FREE</div>
</header>
<div class="layout">
${renderSidebar('settings',{variant:'studio'})}
<main class="main-content aics-main">
  <h1 class="page-title">${shellIcon('settings')} ဆက်တင်များ</h1>
  <p class="page-subtitle">သင့်အကောင့်၊ ဦးစားပေးချက်များနှင့် API Key ကို စီမံပါ — ဤအချက်များသည် သင့်အကောင့်တွင်သာ သက်ရောက်သည်။</p>
  <div class="tabs" role="tablist" aria-label="Settings sections">
    <button type="button" class="tab active" id="tab-btn-profile" role="tab" aria-controls="tab-profile" aria-selected="true" tabindex="0" onclick="showTab('profile')">👤 Profile</button>
    <button type="button" class="tab" id="tab-btn-prefs" role="tab" aria-controls="tab-prefs" aria-selected="false" tabindex="-1" onclick="showTab('prefs')">🎯 ဦးစားပေးချက်များ</button>
    <button type="button" class="tab" id="tab-btn-apikey" role="tab" aria-controls="tab-apikey" aria-selected="false" tabindex="-1" onclick="showTab('apikey')">🔑 API Key</button>
  </div>
  <div id="tab-profile" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-profile" tabindex="0">
    <div class="loading-state">Loading...</div>
  </div>
  <div id="tab-prefs" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-prefs" tabindex="0" style="display:none;">
    <form onsubmit="savePrefs(event)">
      <div class="form-row">
        <label>ပုံမှန် Studio (Default Studio)</label>
        <select id="pref_studio" class="form-select">
          ${studioOptions}
        </select>
      </div>
      <div class="form-row">
        <label>ပုံမှန် အသံ (Default Voice)</label>
        <input id="pref_voice" class="form-input" type="text" placeholder="Kore">
      </div>
      <div class="form-row">
        <label>ပုံမှန် AI Model</label>
        <select id="pref_model" class="form-select"><option value="">Loading…</option></select>
        <span style="font-size:11px;color:var(--text3);">Studio များတွင် ရွေးထားသော Model ကို ဤနေရာမှ ပုံသေထားနိုင်သည် (Phase C)</span>
      </div>
      <div class="form-row">
        <label>ဘာသာစကား (Language)</label>
        <select id="pref_lang" class="form-select">
          <option value="my">မြန်မာ (Myanmar)</option>
          <option value="en">English</option>
        </select>
      </div>
      <div class="form-row">
        <label>အပြင်အဆင် (Theme)</label>
        <select id="pref_theme" class="form-select">
          <option value="dark">Dark (မှောင်မိုက်)</option>
          <option value="light">Light (ပေါ့ပါး)</option>
        </select>
        <div class="hint">Projects နှင့် Settings အပါအဝင် shared app shell သည် Light Minimal UI ဖြစ်သည်။ Theme preference သည် အခြား Studio များတွင် အပြည့်အဝ မသက်ရောက်သေးပါ။</div>
      </div>
      <button type="submit" class="btn btn-primary" id="saveBtn">💾 သိမ်းပါ</button>
    </form>
  </div>
  <div id="tab-apikey" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-apikey" tabindex="0" style="display:none;">
    <div class="loading-state">Loading...</div>
  </div>
</main>
</div>
<div class="toast" id="toast"></div>
${sidebarScript()}
<script>
var TOKEN = localStorage.getItem('aics_token') || '';
function api(path,opts){opts=opts||{};var h=opts.headers||{};h['Content-Type']='application/json';if(TOKEN)h['Authorization']='Bearer '+TOKEN;return fetch(path,{method:opts.method||'GET',headers:h,body:opts.body?JSON.stringify(opts.body):undefined}).then(function(r){return r.json();});}
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(type?' '+type:'');setTimeout(function(){t.className='toast';},2500);}
function escapeHtml(text){var div=document.createElement('div');div.innerText=text;return div.innerHTML;}
if(!TOKEN){
  document.querySelector('.main-content').innerHTML='<div style="padding:40px;text-align:center;"><h2>🔒 Login လိုအပ်ပါသည်</h2><p style="margin:16px 0;"><a href="/login" style="text-decoration:underline;">Login / Sign Up သို့ သွားရန်</a></p></div>';
}else{
  loadSettings();
}
function showTab(name){
  var tabs={profile:'tab-profile',prefs:'tab-prefs',apikey:'tab-apikey'};
  if(!tabs[name]) return;
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');t.setAttribute('aria-selected','false');t.setAttribute('tabindex','-1');});
  document.querySelectorAll('.tab-panel').forEach(function(p){p.style.display='none';});
  document.getElementById(tabs[name]).style.display='block';
  var selected=document.getElementById('tab-btn-'+name);
  if(selected){selected.classList.add('active');selected.setAttribute('aria-selected','true');selected.setAttribute('tabindex','0');}
}
document.querySelectorAll('[role="tab"]').forEach(function(tab){
  tab.addEventListener('keydown',function(event){
    var tabs=Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    var index=tabs.indexOf(tab);
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();
      var delta=event.key==='ArrowRight'?1:-1;
      var next=tabs[(index+delta+tabs.length)%tabs.length];
      next.focus();
      next.click();
    }
  });
}
function loadSettings(){
  api('/api/users/me').then(function(d){
    if(d.error){document.getElementById('tab-profile').innerHTML='<div class="empty-state">Data ရယူ၍ မရပါ — '+(d.error||'error')+'</div>';return;}
    var s=d.settings||{};
    var u=d.usage||{};
    document.getElementById('tab-profile').innerHTML=
      '<div class="profile-row"><span class="profile-label">👤 နာမည်</span><span class="profile-value"><input id="profileName" maxlength="60" value="'+escapeHtml(d.name||'')+'" style="width:200px;max-width:100%;min-height:40px;padding:0 10px;border-radius:8px;border:1px solid var(--aics-border-strong);background:var(--aics-surface);color:var(--aics-text);font-size:14px"> <button class="btn btn-secondary" style="padding:8px 14px;min-height:40px" onclick="saveName()">သိမ်းပါ</button></span></div>'+
      '<div class="profile-row"><span class="profile-label">📧 အီးမေးလ်</span><span class="profile-value">'+escapeHtml(d.email||'')+'</span></div>'+
      '<div class="profile-row"><span class="profile-label">Plan</span><span class="profile-value"><span class="plan-badge'+(d.plan==='PRO'?' pro':'')+'">'+(d.plan==='PRO'?'PRO ⭐':'FREE')+'</span></span></div>'+
      '<div class="profile-row"><span class="profile-label">User ID</span><span class="profile-value">'+escapeHtml(String(d.user_id||''))+'</span></div>'+
      '<div class="profile-row"><span class="profile-label">အခွင့်အရေး</span><span class="profile-value">'+(d.is_admin?'Admin ⚙️':'User')+'</span></div>'+
      '<div class="profile-row"><span class="profile-label">📊 အသုံးပြုမှု</span><span class="profile-value">AI: '+(u.ai_requests||0)+' · ပုံ: '+(u.image_generations||0)+' · အသံ: '+(u.voice_generations||0)+'</span></div>';
    document.getElementById('pref_studio').value=s.default_studio||'story';
    document.getElementById('pref_voice').value=s.default_voice||'Kore';
    var pm=document.getElementById('pref_model');
    pm.value=s.default_model||'';
    if(!pm.value&&pm.options.length>1)pm.value=pm.options[1].value;
    try{localStorage.setItem('aics_default_model',pm.value);}catch(e){}
    (function(){
      fetch('/api/ai-models',{headers:{'Authorization':'Bearer '+TOKEN}}).then(function(r){return r.json();}).then(function(d){
        if(!d||d.error||!d.items||d.items.length===0)return;
        var cur=pm.value;
        var html='';
        d.items.forEach(function(m){html+='<option value="'+escapeHtml(m.id)+'"'+(m.id===cur?' selected':'')+'>'+escapeHtml(m.name||m.id)+'</option>';});
        pm.innerHTML=html;
        if(!pm.value&&pm.options.length>0)pm.value=pm.options[0].value;
      }).catch(function(){});
    })();
    document.getElementById('pref_lang').value=s.language||'my';
    document.getElementById('pref_theme').value=s.theme||'dark';
    loadKeyStatus();
  }).catch(function(){document.getElementById('tab-profile').innerHTML='<div class="empty-state">Network problem</div>';});
}
function saveName(){
  var name=document.getElementById('profileName').value.trim();
  if(!name){showToast('နာမည် ထည့်ပါ','error');return;}
  api('/api/users/me/profile',{method:'PUT',body:{name:name}}).then(function(d){
    if(d.error){showToast('သိမ်း၍ မရပါ','error');return;}
    showToast('✓ နာမည် သိမ်းပြီးပါပြီ','success');
    var sn=document.getElementById('sideName');if(sn)sn.textContent=name;
    var av=document.getElementById('sideAvatar');if(av)av.textContent=name.charAt(0).toUpperCase();
  }).catch(function(){showToast('Network error','error');});
}
function savePrefs(ev){
  ev.preventDefault();
  var btn=document.getElementById('saveBtn');
  btn.disabled=true;btn.textContent='⏳ သိမ်းနေသည်…';
  api('/api/users/me/settings',{method:'PUT',body:{
    settings:{
      default_studio:document.getElementById('pref_studio').value,
      default_voice:document.getElementById('pref_voice').value.trim(),
      default_model:document.getElementById('pref_model').value.trim(),
      language:document.getElementById('pref_lang').value,
      theme:document.getElementById('pref_theme').value
    }
  }}).then(function(d){
    btn.disabled=false;btn.textContent='💾 သိမ်းပါ';
    if(d.error){showToast('သိမ်း၍ မရပါ','error');return;}
    showToast('✓ ဆက်တင်များ သိမ်းပြီးပါပြီ','success');
  }).catch(function(){btn.disabled=false;btn.textContent='💾 သိမ်းပါ';showToast('Network error','error');});
}
function loadKeyStatus(){
  api('/api/user/apikey/status').then(function(d){
    if(d.error){document.getElementById('tab-apikey').innerHTML='<div class="empty-state">API Key အခြေအနေ မစစ်နိုင်ပါ။ နောက်မှ ပြန်ကြိုးစားပါ။ <button class="btn btn-secondary" onclick="loadKeyStatus()">Retry</button></div>';return;}
    var has=!!d.hasKey;
    document.getElementById('tab-apikey').innerHTML=
      '<div class="key-status">'+(has?'<span class="key-has">✅ API Key ချိတ်ဆက်ထားပါသည်</span>':'<span class="key-none">API Key မရှိသေးပါ</span>')+'</div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
      '<button class="btn btn-primary" onclick="setApiKeyAndRefresh()">🔑 '+(has?'API Key အသစ် အစားထိုးရန်':'API Key ထည့်ရန်')+'</button>'+
      (has?'<button class="btn btn-secondary" onclick="testApiKey()">🧪 Connection စမ်းသပ်ရန်</button><button class="btn btn-secondary" onclick="removeApiKey()">🗑️ API Key ဖျက်ရန်</button>':'')+
      '</div>'+
      '<div class="hint">သိမ်းထားသော Key အစစ်ကို UI မှာ ပြန်မပြပါ။ Server က စာဝှက်ထားသော Key ကို AI ခေါ်ယူချိန်တွင်သာ အသုံးပြုပါသည်။ Key အသစ် အစားထိုးလိုပါက အရင် Key ကို ဖျက်စရာမလိုပါ။</div>';
  }).catch(function(){
    document.getElementById('tab-apikey').innerHTML='<div class="empty-state">Network problem</div>';
  });
}
function setApiKeyAndRefresh(){
  if(typeof window.setApiKey==='function'){
    Promise.resolve(window.setApiKey()).then(function(saved){
      if(saved) loadKeyStatus();
    }).catch(function(){
      showToast('API Key သိမ်း၍ မရပါ','error');
    });
  } else { showToast('Script loading...','error'); }
}
function testApiKey(){
  var panel=document.getElementById('tab-apikey');
  var buttons=panel.querySelectorAll('button');
  buttons.forEach(function(b){b.disabled=true;});
  showToast('API Connection စမ်းသပ်နေသည်…');
  api('/api/ai/test',{method:'POST',body:{prompt:'Reply with OK',model:(document.getElementById('pref_model')||{}).value||undefined}}).then(function(d){
    buttons.forEach(function(b){b.disabled=false;});
    if(d.error){showToast(d.error==='rate_limited'?'စမ်းသပ်မှု များလွန်းပါသည် — ၁၀ မိနစ်အတွင်း ၅ ကြိမ်သာ ခွင့်ပြုပါသည်':d.error==='rate_limit_unavailable'?'Connection Test ယာယီ မရနိုင်ပါ':'Connection မအောင်မြင်ပါ — Key သို့မဟုတ် Model ကို စစ်ပါ','error');return;}
    showToast('✓ API Connection အောင်မြင်ပါသည်','success');
  }).catch(function(){
    buttons.forEach(function(b){b.disabled=false;});
    showToast('Network error','error');
  });
}
function removeApiKey(){
  if(!confirm('သိမ်းထားသော API Key ကို ဖျက်မှာ သေချာပါသလား?')) return;
  api('/api/user/apikey',{method:'DELETE'}).then(function(d){
    if(d.error){showToast('API Key ဖျက်၍ မရပါ','error');return;}
    showToast('API Key ဖျက်ပြီးပါပြီ','success');
    loadKeyStatus();
  }).catch(function(){showToast('Network error','error');});
}
</script>
</body>
</html>`;
