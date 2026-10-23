// AI Creative Studio — Projects UI Frontend (Phase 3 — Personal User System)
// User ကိုယ်ပိုင် Project များ — Create / List / Delete
// Sidebar + Helper Script များကို Shared Component (frontend/shared.js) မှ ယူသည်

import { renderSidebar, sidebarScript, shellIcon } from './shared.js';

export const PROJECTS_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Projects — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#f6f8fb);--card:var(--aics-surface,#fff);--card2:var(--aics-surface-subtle,#f8fafc);--text:var(--aics-text,#172033);--text2:var(--aics-text-muted,#667085);--text3:var(--aics-text-soft,#667085);--border:var(--aics-border,#e5eaf1);--border-strong:var(--aics-border-strong,#d7dee8);--primary:var(--aics-primary,#5b5bd6);--primary-hover:var(--aics-primary-hover,#4b4bc4);--primary-soft:var(--aics-primary-soft,#f0efff);--success:var(--aics-success,#16845b);--error:var(--aics-danger,#c4323a);--focus:var(--aics-focus,rgba(91,91,214,.28));}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:var(--aics-font,Inter,"Noto Sans Myanmar",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6;}
a{color:var(--primary);text-decoration:none;}
.page-title{font-size:22px;font-weight:700;color:var(--text);margin-bottom:8px;letter-spacing:-.25px;}
.page-title .lucide-icon{display:inline-block;width:20px;height:20px;vertical-align:-3px;margin-right:5px;color:var(--primary);}
.page-subtitle{color:var(--text2);font-size:13.5px;margin-bottom:22px;}
.create-box{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
.create-input{flex:1 1 240px;min-width:0;padding:11px 14px;border-radius:var(--aics-radius-sm,8px);border:1px solid var(--border-strong);background:var(--card);color:var(--text);font:inherit;font-size:14px;outline:none;}
.create-input::placeholder{color:var(--text3);}
.create-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--focus);}
.btn{padding:10px 18px;border:1px solid transparent;border-radius:var(--aics-radius-sm,8px);cursor:pointer;font-weight:650;font-size:13.5px;min-height:42px;transition:background .16s,color .16s,border-color .16s,box-shadow .16s;}
.btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px;}
.btn:disabled{opacity:.6;cursor:wait;}
.btn-primary{background:var(--primary);color:#fff;}
.btn-primary:hover:not(:disabled){background:var(--primary-hover);}
.btn-danger{background:#fff1f1;color:var(--error);border-color:#f3c7ca;padding:6px 12px;font-size:12.5px;min-height:36px;}
.btn-danger:hover:not(:disabled){background:#ffe5e6;}
.project-card{background:var(--card);border:1px solid var(--border);border-radius:var(--aics-radius-md,12px);padding:16px 18px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:var(--aics-shadow-sm,0 1px 2px rgba(16,24,40,.06));}
.project-info{flex:1 1 260px;min-width:0;}
.project-title{font-weight:650;font-size:15px;color:var(--text);}
.project-desc{color:var(--text2);font-size:12.5px;margin-top:3px;}
.project-meta{color:var(--text3);font-size:12px;margin-top:3px;}
.empty-state{text-align:center;color:var(--text2);padding:60px 20px;}
.loading-state{text-align:center;color:var(--primary);padding:40px 20px;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:var(--text);padding:12px 20px;border-radius:var(--aics-radius-md,12px);font-size:14px;z-index:9999;display:none;box-shadow:var(--aics-shadow-md,0 8px 24px rgba(16,24,40,.08));}
.toast.show{display:block;}.toast.success{border-color:var(--success);}.toast.error{border-color:var(--error);}
@media(prefers-reduced-motion:reduce){.btn{transition:none;}}
</style>
</head>
<body>
<div class="aics-app" id="aicsApp">
<header class="aics-header">
<button class="aics-menu-btn" onclick="toggleSidebar()" aria-label="Menu">${shellIcon('menu')}</button>
<div class="aics-brand"><span class="aics-brand-icon">${shellIcon('sparkles')}</span><span class="aics-title">AI Creative Studio</span></div>
<div class="aics-pro" id="sidePlan">FREE</div>
</header>
<div class="layout">
${renderSidebar('projects',{variant:'studio'})}
<main class="main-content aics-main">
  <h1 class="page-title">${shellIcon('folder')} Projects</h1>
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
