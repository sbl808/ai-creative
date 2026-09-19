// AI Creative Studio — Settings UI Frontend (Phase 3 — Personal User System)
// Profile / Preferences / API Key — User တစ်ယောက်ချင်းစီအတွက် သီးသန့်
// Sidebar + Helper Script များကို Shared Component (frontend/shared.js) မှ ယူသည်

import { renderSidebar, sidebarScript } from './shared.js';
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
:root{--bg:#080c18;--bg-sidebar:#0d1220;--card:#151b2b;--card2:#111827;--cyan:#00e5ff;--purple:#7b5cff;--text:#e8ecf4;--text2:#94a3b8;--text3:#5b6785;--border:#26324a;--success:#2bff9f;--error:#ff4d4d;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6;}
a{color:var(--cyan);text-decoration:none;}
.brand{margin-bottom:22px;}
.brand-title{font-weight:800;font-size:18px;letter-spacing:0.5px;background:linear-gradient(90deg,var(--purple),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent;}
.nav-label{font-size:11px;color:var(--text3);letter-spacing:1.5px;margin:18px 0 8px 10px;text-transform:uppercase;}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;color:#ccc;text-decoration:none;cursor:pointer;font-size:14px;margin-bottom:4px;border:1px solid transparent;transition:all 0.2s;}
.nav-item:hover{background:#161d30;transform:translateX(2px);}
.nav-item.active{background:linear-gradient(90deg,rgba(123,92,255,0.18),rgba(0,229,255,0.08));color:#fff;border:1px solid var(--purple);box-shadow:0 0 14px rgba(123,92,255,0.35);}
.nav-icon-circle{width:30px;height:30px;border-radius:9px;background:#1a2138;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.sidebar-bottom{margin-top:24px;padding-top:18px;border-top:1px solid var(--border);}
.license-badge{display:inline-block;font-size:12px;padding:5px 12px;border-radius:20px;margin-bottom:12px;background:#333;color:#aaa;}
.license-badge.pro{background:#103a2a;color:var(--success);}
.side-btn{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:12px;background:#161d30;color:#ccc;border:1px solid var(--border);font-size:13px;cursor:pointer;margin-bottom:6px;text-decoration:none;transition:all 0.2s;}
.side-btn:hover{background:#1e2740;border-color:var(--cyan);}
.page-title{font-size:22px;font-weight:700;color:var(--cyan);margin-bottom:8px;}
.page-subtitle{color:var(--text2);font-size:13.5px;margin-bottom:22px;}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.tab{padding:10px 18px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text2);font-size:14px;cursor:pointer;font-weight:600;transition:all 0.2s;}
.tab.active{background:linear-gradient(90deg,rgba(123,92,255,0.2),rgba(0,229,255,0.1));color:#fff;border-color:var(--purple);}
.tab-panel{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;}
.form-row{margin-bottom:18px;}
.form-row label{display:block;color:var(--text2);font-size:13px;margin-bottom:6px;font-weight:600;}
.form-input{width:100%;max-width:420px;padding:11px 14px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:14px;outline:none;}
.form-input:focus{border-color:var(--cyan);}
.form-select{width:100%;max-width:420px;padding:11px 14px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:14px;outline:none;cursor:pointer;}
.btn{padding:11px 22px;border:none;border-radius:10px;cursor:pointer;font-weight:bold;font-size:14px;min-height:42px;transition:opacity 0.2s;}
.btn:hover{opacity:0.85;}
.btn-primary{background:var(--cyan);color:#001014;}
.btn-secondary{background:#26324a;color:#ccc;}
.profile-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.profile-row:last-child{border-bottom:none;}
.profile-label{color:var(--text3);font-size:13px;}
.profile-value{color:var(--text);font-weight:600;word-break:break-all;text-align:right;}
.plan-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#333;color:#aaa;}
.plan-badge.pro{background:#103a2a;color:var(--success);}
.key-status{padding:14px;border-radius:10px;background:var(--card2);border:1px solid var(--border);margin-bottom:16px;font-size:14px;}
.key-has{color:var(--success);}
.key-none{color:#ffd166;}
.hint{color:var(--text3);font-size:12.5px;margin-top:8px;line-height:1.7;}
.empty-state{text-align:center;color:var(--text3);padding:60px 20px;}
.loading-state{text-align:center;color:var(--cyan);padding:40px 20px;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:9999;display:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);}
.toast.show{display:block;}
.toast.success{border-color:var(--success);}
.toast.error{border-color:var(--error);}
</style>
</head>
<body>
<div class="aics-app" id="aicsApp">
<header class="aics-header">
<button class="aics-menu-btn" onclick="toggleSidebar()" aria-label="Menu">&#9776;</button>
<div class="aics-brand"><span class="aics-brand-icon">🎨</span><span class="aics-title">AI Creative Studio</span></div>
<div class="aics-pro" id="sidePlan">FREE</div>
</header>
<div class="layout">
${renderSidebar('settings',{variant:'studio'})}
<main class="main-content aics-main">
  <h1 class="page-title">🛠️ ဆက်တင်များ</h1>
  <p class="page-subtitle">သင့်အကောင့်၊ ဦးစားပေးချက်များနှင့် API Key ကို စီမံပါ — ဤအချက်များသည် သင့်အကောင့်တွင်သာ သက်ရောက်သည်။</p>
  <div class="tabs">
    <button class="tab active" onclick="showTab('profile')">👤 Profile</button>
    <button class="tab" onclick="showTab('prefs')">🎯 ဦးစားပေးချက်များ</button>
    <button class="tab" onclick="showTab('apikey')">🔑 API Key</button>
  </div>
  <div id="tab-profile" class="tab-panel">
    <div class="loading-state">Loading...</div>
  </div>
  <div id="tab-prefs" class="tab-panel" style="display:none;">
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
        <div class="hint">ယခုလက်ရှိ App သည် Dark Theme ဖြစ်သည် — Light Theme ကို နောက်ပိုင်း Phase တွင် အသုံးပြုပါမည်။</div>
      </div>
      <button type="submit" class="btn btn-primary" id="saveBtn">💾 သိမ်းပါ</button>
    </form>
  </div>
  <div id="tab-apikey" class="tab-panel" style="display:none;">
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
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.tab-panel').forEach(function(p){p.style.display='none';});
  var tabs={profile:'tab-profile',prefs:'tab-prefs',apikey:'tab-apikey'};
  document.getElementById(tabs[name]).style.display='block';
  var idx=name==='profile'?0:name==='prefs'?1:2;
  document.querySelectorAll('.tab')[idx].classList.add('active');
}
function loadSettings(){
  api('/api/users/me').then(function(d){
    if(d.error){document.getElementById('tab-profile').innerHTML='<div class="empty-state">Data ရယူ၍ မရပါ — '+(d.error||'error')+'</div>';return;}
    var s=d.settings||{};
    var u=d.usage||{};
    document.getElementById('tab-profile').innerHTML=
      '<div class="profile-row"><span class="profile-label">👤 နာမည်</span><span class="profile-value"><input id="profileName" maxlength="60" value="'+escapeHtml(d.name||'')+'" style="width:200px;max-width:100%;min-height:40px;padding:0 10px;border-radius:8px;border:1px solid #223052;background:#0b1120;color:#e8ecf4;font-size:14px"> <button class="btn btn-secondary" style="padding:8px 14px;min-height:40px" onclick="saveName()">သိမ်းပါ</button></span></div>'+
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
    var has=!d.error&&d.hasKey;
    document.getElementById('tab-apikey').innerHTML=
      '<div class="key-status">'+(has?'<span class="key-has">✅ API Key ရှိပါသည် (Server တွင် လုံခြုံစွာ သိမ်းထားသည်)</span>':'<span class="key-none">API Key မရှိသေးပါ</span>')+'</div>'+
      '<button class="btn btn-primary" onclick="setApiKeyAndRefresh()">🔑 '+(has?'API Key အသစ် ထည့်ရန်':'API Key ထည့်ရန်')+'</button>'+
      '<div class="hint">API Key ကို Frontend တွင် မပြပါ — Server-side ၌ AES စာဝှက်ဖြင့် သိမ်းဆည်းပြီး AI ခေါ်ယူရာတွင်သာ အသုံးပြုပါသည်။</div>';
  }).catch(function(){
    document.getElementById('tab-apikey').innerHTML='<div class="empty-state">Network problem</div>';
  });
}
function setApiKeyAndRefresh(){
  if(typeof window.setApiKey==='function'){window.setApiKey();setTimeout(loadKeyStatus,2000);}
  else{showToast('Script loading...','error');}
}
</script>
</body>
</html>`;
