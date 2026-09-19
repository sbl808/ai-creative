// AI Creative Studio — Projects UI Frontend (Phase 3 — Personal User System)
// User ကိုယ်ပိုင် Project များ — Create / List / Delete
// Sidebar + Helper Script များကို Shared Component (frontend/shared.js) မှ ယူသည်

import { renderSidebar, sidebarScript } from './shared.js';

export const PROJECTS_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Projects — AI Creative Studio</title>
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
.create-box{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
.create-input{flex:1 1 240px;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:14px;outline:none;}
.create-input:focus{border-color:var(--cyan);}
.btn{padding:11px 22px;border:none;border-radius:10px;cursor:pointer;font-weight:bold;font-size:14px;min-height:42px;transition:opacity 0.2s;}
.btn:hover{opacity:0.85;}
.btn-primary{background:var(--cyan);color:#001014;}
.btn-danger{background:#4a2626;color:#ff8080;padding:7px 14px;font-size:12.5px;min-height:32px;}
.project-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
.project-info{flex:1 1 260px;min-width:0;}
.project-title{font-weight:bold;font-size:15.5px;color:var(--text);}
.project-desc{color:var(--text3);font-size:12.5px;margin-top:3px;}
.project-meta{color:var(--text3);font-size:12px;margin-top:3px;}
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
${renderSidebar('projects',{variant:'studio'})}
<main class="main-content aics-main">
  <h1 class="page-title">📁 Projects</h1>
  <p class="page-subtitle">သင့်ဖန်တီးမှုများကို Project များအတွင်း စုစည်းနိုင်ရန် — နောက်ဆင့်များတွင် Creation များနှင့် ချိတ်ဆက်ပါမည်။</p>
  <div class="create-box">
    <input id="projectTitle" class="create-input" type="text" placeholder="Project အမည် ရိုက်ထည့်ပါ..." onkeydown="if(event.key==='Enter')createProject()">
    <button class="btn btn-primary" onclick="createProject()">➕ Project အသစ်</button>
  </div>
  <div id="loadingState" class="loading-state">Loading...</div>
  <div id="emptyState" class="empty-state" style="display:none;">📭 Project များ မရှိသေးပါ — အထက်ပါ အကွက်တွင် အမည်ရိုက်၍ "Project အသစ်" နှိပ်ပါ။</div>
  <div id="projectsList"></div>
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
  loadProjects();
}
function loadProjects(){
  document.getElementById('loadingState').style.display='block';
  api('/api/projects').then(function(d){
    document.getElementById('loadingState').style.display='none';
    if(d.error||!d.items||d.items.length===0){
      document.getElementById('emptyState').style.display='block';
      return;
    }
    var container=document.getElementById('projectsList');
    container.innerHTML='';
    d.items.forEach(function(p){
      var dateStr=p.created_at?new Date(p.created_at.replace(' ','T')+'Z').toLocaleDateString():'';
      var card=document.createElement('div');
      card.className='project-card';
      card.innerHTML=
        '<div class="project-info">'+
        '<div class="project-title">📌 '+escapeHtml(p.title)+'</div>'+
        (p.description?'<div class="project-desc">'+escapeHtml(p.description)+'</div>':'')+
        '<div class="project-meta">🕒 '+dateStr+'</div>'+
        '</div>'+
        '<button class="btn btn-danger" onclick="removeProject(\\''+p.id+'\\',this)">🗑 ဖျက်မည်</button>';
      container.appendChild(card);
    });
  }).catch(function(){
    document.getElementById('loadingState').style.display='none';
    document.getElementById('loadingState').innerHTML='Error: Network problem';
  });
}
function createProject(){
  var input=document.getElementById('projectTitle');
  var title=input.value.trim();
  if(!title){showToast('Project အမည် ရိုက်ထည့်ပါ','error');input.focus();return;}
  var btn=document.querySelector('.create-box .btn-primary');
  btn.disabled=true;btn.textContent='⏳ ဖန်တီးနေသည်…';
  api('/api/projects',{method:'POST',body:{title:title}}).then(function(d){
    btn.disabled=false;btn.textContent='➕ Project အသစ်';
    if(d.error){showToast('ဖန်တီး၍ မရပါ','error');return;}
    input.value='';
    document.getElementById('emptyState').style.display='none';
    loadProjects();
    showToast('✓ Project ဖန်တီးပြီးပါပြီ','success');
  }).catch(function(){btn.disabled=false;btn.textContent='➕ Project အသစ်';showToast('Network error','error');});
}
function removeProject(id,btn){
  if(!confirm('ဒီ Project ကို ဖျက်မှာ သေချာပါသလား?'))return;
  var orig=btn.textContent;btn.textContent='⏳…';btn.disabled=true;
  api('/api/projects/'+id,{method:'DELETE'}).then(function(d){
    if(d.error){showToast('ဖျက်မရပါ','error');btn.textContent=orig;btn.disabled=false;return;}
    btn.closest('.project-card').remove();
    showToast('✓ Project ဖျက်ပြီးပါပြီ','success');
    if(document.querySelectorAll('.project-card').length===0)document.getElementById('emptyState').style.display='block';
  }).catch(function(){showToast('Network error','error');btn.textContent=orig;btn.disabled=false;});
}
</script>
</body>
</html>`;
