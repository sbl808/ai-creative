// AI Creative Studio — Home Page Frontend (Phase 9 — Dark Theme)
// Replaces old generic light-theme frontend.js
// Features: Sidebar nav, Hero banner, 6 Studio cards, Recent Projects, BYOK API Key setting
// Phase 2 — Sidebar + Helper Script များကို Shared Component (frontend/shared.js) မှ ယူသည်

import { renderSidebar, sidebarScript } from './frontend/shared.js';

export const APP_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Creative Studio</title>
<style>
:root {
  --bg:#080c18; --bg-sidebar:#0d1220; --card:#151b2b; --card2:#111827;
  --cyan:#00e5ff; --purple:#7b5cff; --text:#e8ecf4; --text2:#94a3b8; --text3:#5b6785;
  --border:#26324a; --success:#2bff9f; --error:#ff4d4d;
}
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
.license-badge.pro{background:#103a2a;color:var(--success);box-shadow:0 0 10px rgba(43,255,159,0.25);}
.side-btn{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:12px;background:#161d30;color:#ccc;border:1px solid var(--border);font-size:13px;cursor:pointer;margin-bottom:6px;text-decoration:none;transition:all 0.2s;}
.side-btn:hover{background:#1e2740;border-color:var(--cyan);}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:12px;flex-wrap:wrap;}
.api-pill{padding:10px 18px;background:rgba(0,229,255,0.08);border:1px solid var(--cyan);color:var(--cyan);border-radius:999px;font-size:13px;cursor:pointer;white-space:nowrap;}
.api-pill:hover{background:rgba(0,229,255,0.16);}
.topbar h1{font-size:26px;margin-bottom:6px;}
.topbar .subtitle{color:var(--text2);}
.aics-brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}
.aics-brand-icon{font-size:20px;flex-shrink:0;}
.aics-title{font-size:17px;font-weight:800;letter-spacing:.3px;background:linear-gradient(90deg,#00e5ff,#7b5cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;}
.aics-pro{padding:6px 16px;border-radius:999px;background:linear-gradient(135deg,#7b5cff,#00e5ff);color:#fff;font-size:12px;font-weight:700;letter-spacing:.5px;flex-shrink:0;box-shadow:0 2px 12px rgba(123,92,255,.35);}
.api-pill{display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);color:#ccc;padding:9px 14px;border-radius:20px;cursor:pointer;font-size:13px;white-space:nowrap;transition:border-color 0.2s;flex-shrink:0;}
.api-pill:hover{border-color:var(--cyan);}
/* Phase 8 — အခမဲ့ API Key ခလုတ် (Sparkle) + လမ်းညွှန် Modal */
.api-pill.sparkle{background:linear-gradient(135deg,rgba(123,92,255,0.28),rgba(0,229,255,0.2));border:1px solid var(--purple);color:#fff;box-shadow:0 0 14px rgba(123,92,255,0.5);animation:sparklePulse 2s ease-in-out infinite;}
@keyframes sparklePulse{0%,100%{box-shadow:0 0 8px rgba(123,92,255,0.4);}50%{box-shadow:0 0 22px rgba(0,229,255,0.6);}}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:500;align-items:center;justify-content:center;padding:16px;}
.modal-overlay.show{display:flex;}
.free-key-modal{width:100%;max-width:440px;max-height:85vh;overflow-y:auto;background:#111827;border:1px solid var(--border);border-radius:16px;padding:22px;position:relative;box-shadow:0 8px 40px rgba(0,0,0,0.6);}
.free-key-modal h3{margin:0 0 6px;font-size:19px;background:linear-gradient(90deg,var(--purple),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent;}
.free-key-modal .sub{color:var(--text2);font-size:13px;margin-bottom:16px;}
.free-key-step{display:flex;gap:12px;margin-bottom:13px;align-items:flex-start;}
.free-key-step .num{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--purple),var(--cyan));color:#001014;font-weight:bold;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px;}
.free-key-step .txt{color:var(--text);font-size:14px;line-height:1.55;}
.free-key-step .txt b{color:#fff;}
.free-key-actions{display:flex;flex-direction:column;gap:10px;margin-top:18px;}
.btn-primary-glow{display:inline-block;text-align:center;padding:13px 18px;border-radius:12px;background:linear-gradient(135deg,var(--purple),var(--cyan));color:#001014;font-weight:bold;font-size:14px;text-decoration:none;cursor:pointer;border:none;}
.btn-primary-glow:hover{filter:brightness(1.15);}
.btn-ghost-full{display:inline-block;text-align:center;padding:12px 18px;border-radius:12px;background:transparent;color:var(--cyan);border:1px solid var(--cyan);font-size:14px;cursor:pointer;text-decoration:none;}
.btn-ghost-full:hover{background:rgba(0,229,255,0.1);}
.modal-close{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--text2);font-size:22px;cursor:pointer;line-height:1;}
.modal-close:hover{color:#fff;}
.hero-banner{position:relative;width:100%;aspect-ratio:42/9;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#1a1030 0%,#0e1424 50%,#0a1f2e 100%);border:1px solid #3a2f7a;display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
.hero-banner-icons{position:absolute;inset:0;}
.hero-banner-icons span{position:absolute;font-size:clamp(20px,6vw,46px);opacity:0.14;}
.hbi-1{top:8%;left:4%;}.hbi-2{top:58%;left:11%;}.hbi-3{top:15%;left:44%;}
.hbi-4{top:65%;left:40%;}.hbi-5{top:12%;left:84%;}.hbi-6{top:60%;left:78%;}.hbi-7{top:30%;left:94%;}
.hbi-1{top:8%;left:4%;}.hbi-2{top:58%;left:11%;}.hbi-3{top:15%;left:44%;}.hbi-4{top:65%;left:40%;}.hbi-5{top:12%;left:84%;}.hbi-6{top:60%;left:78%;}.hbi-7{top:30%;left:94%;}
.hero-banner-text{position:relative;z-index:2;text-align:center;padding:0 16px;}
.hero-banner-text .main-line{font-size:clamp(15px,2.8vw,24px);font-weight:bold;background:linear-gradient(90deg,#fff,#b9c6ff);-webkit-background-clip:text;background-clip:text;color:transparent;transition:opacity 0.6s ease;}
.section-label{font-size:13px;color:var(--text3);letter-spacing:1px;margin:26px 0 12px 2px;display:flex;justify-content:space-between;align-items:center;}
.section-label .view-all{color:var(--purple);cursor:pointer;font-size:13px;letter-spacing:normal;}
.quick-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}
.studio-card{position:relative;overflow:hidden;border-radius:16px;padding:20px;cursor:pointer;transition:transform 0.2s;border:1px solid;min-height:110px;}
.studio-card:hover{transform:translateY(-4px);}
.studio-card .bg-icon{position:absolute;right:-14px;bottom:-22px;font-size:110px;line-height:1;opacity:0.16;pointer-events:none;}
.studio-card .title{position:relative;z-index:2;font-weight:bold;font-size:16px;margin-bottom:3px;}
.studio-card .desc{position:relative;z-index:2;font-size:12.5px;color:var(--text2);transition:opacity 0.5s,transform 0.5s;}
.studio-card .sparkle{position:absolute;top:18px;right:18px;opacity:0.7;font-size:14px;z-index:2;}
.card-story{background:linear-gradient(135deg,#2a1a45,#1a1030);border-color:var(--purple);}
.card-content{background:linear-gradient(135deg,#10253f,#0d1a2c);border-color:#2b9fff;}
.card-short{background:linear-gradient(135deg,#3a2410,#2a1a0d);border-color:#ff9f2b;}
.card-image{background:linear-gradient(135deg,#0f3320,#0b2418);border-color:var(--success);}
.card-voice{background:linear-gradient(135deg,#3a1030,#2a0c24);border-color:#ff2ba0;}
.card-shop{background:linear-gradient(135deg,#3a2f0a,#2a2207);border-color:#ffcf2b;}
.recent-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}
.project-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;}
.project-card .p-icon{font-size:22px;margin-bottom:8px;}
.project-card .p-title{font-weight:bold;font-size:14px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.project-card .p-date{color:var(--text3);font-size:12px;margin-bottom:12px;}
.project-open-btn{width:100%;padding:9px;background:transparent;color:var(--purple);border:1px solid var(--purple);border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;}
.project-open-btn:hover{background:rgba(123,92,255,0.12);}
.empty-projects{text-align:center;color:var(--text3);padding:30px 16px;background:var(--card2);border:1px dashed var(--border);border-radius:14px;font-size:14px;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:9999;display:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);}
.toast.show{display:block;}
.toast.success{border-color:var(--success);}
.toast.error{border-color:var(--error);}
@media(max-width:767px){
    .topbar h1{font-size:21px;}
      .aics-title{font-size:15px;}
  .aics-brand-icon{font-size:17px;}
  .aics-pro{padding:5px 12px;font-size:11px;}
  .quick-grid,.recent-grid{grid-template-columns:repeat(2,1fr);gap:10px;}
  .studio-card{padding:14px;min-height:90px;}
  .studio-card .title{font-size:14px;}
  .studio-card .desc{font-size:11px;}
  .studio-card .bg-icon{font-size:80px;}
}
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
${renderSidebar('home',{variant:'studio'})}
<main class="main-content aics-main">
  <div class="topbar">
    <div>
      <h1 id="greeting">မင်္ဂလာပါ 👋</h1>
      <p class="subtitle">ဒီနေ့ ဘာဖန်တီးချင်ပါသလဲ?</p>
    </div>
    <div class="api-pill sparkle" onclick="openFreeKeyGuide()">✨ အခမဲ့ API KEY ယူရန်</div>
  </div>
  <div class="hero-banner">
    <div class="hero-banner-icons">
      <span class="hbi-1">🎬</span><span class="hbi-2">🎭</span><span class="hbi-3">🖼️</span>
      <span class="hbi-4">🎙️</span><span class="hbi-5">🛍️</span><span class="hbi-6">✨</span><span class="hbi-7">📖</span>
    </div>
    <div class="hero-banner-text"><div class="main-line" id="heroBannerText">AI Creative Studio မှ ကြိုဆိုပါတယ် ✨</div></div>
  </div>
  <div class="section-label">အမြန်ဖန်တီးရန်</div>
  <div class="quick-grid">
    <div class="studio-card card-story" data-studio="story" onclick="location.href='/app/story'">
      <div class="sparkle">✨</div><div class="bg-icon">📖</div>
      <div class="title">ဇာတ်လမ်း Studio</div>
      <div class="desc" id="desc-story">AI ဖြင့် Story ရေးပါ</div>
    </div>
    <div class="studio-card card-content" data-studio="content" onclick="location.href='/app/content'">
      <div class="sparkle">✨</div><div class="bg-icon">✍️</div>
      <div class="title">Content Studio</div>
      <div class="desc" id="desc-content">AI ဖြင့် Content ရေးပါ</div>
    </div>
    <div class="studio-card card-short" data-studio="short" onclick="location.href='/app/short'">
      <div class="sparkle">✨</div><div class="bg-icon">🎬</div>
      <div class="title">Short Studio</div>
      <div class="desc" id="desc-short">TikTok/Reels Script ဖန်တီးပါ</div>
    </div>
    <div class="studio-card card-image" data-studio="image" onclick="location.href='/app/image'">
      <div class="sparkle">✨</div><div class="bg-icon">🎨</div>
      <div class="title">ပုံ Studio</div>
      <div class="desc" id="desc-image">AI Image Prompt ဖန်တီးပါ</div>
    </div>
    <div class="studio-card card-voice" data-studio="voice" onclick="location.href='/app/voice'">
      <div class="sparkle">✨</div><div class="bg-icon">🎙</div>
      <div class="title">အသံ Studio</div>
      <div class="desc" id="desc-voice">Voice နဲ့ Text ပြောင်းပါ</div>
    </div>
    <div class="studio-card card-shop" data-studio="shop" onclick="location.href='/app/shop'">
      <div class="sparkle">✨</div><div class="bg-icon">🛒</div>
      <div class="title">ရောင်းချရေး Studio</div>
      <div class="desc" id="desc-shop">Marketing Content ဖန်တီးပါ</div>
    </div>
  </div>
  <div class="section-label">
    နောက်ဆုံးဖန်တီးထားသော Project များ
    <span class="view-all" onclick="location.href='/app/creations'">အားလုံးကြည့်ရန် →</span>
  </div>
  <div id="recentProjectsArea"><p style="color:var(--text3);">Loading...</p></div>
</main>
</div>
</div>
<div class="modal-overlay" id="freeKeyModal">
  <div class="free-key-modal">
    <button class="modal-close" onclick="closeFreeKeyGuide()" aria-label="Close">✕</button>
    <h3>✨ အခမဲ့ API Key ယူနည်း</h3>
    <div class="sub">Gemini API Key အခမဲ့ ရယူနည်း — အဆင့် ၅ ဆင့်သာ လိုပါသည်</div>
    <div class="free-key-step"><div class="num">1</div><div class="txt">အောက်က <b>အပြာရောင် ခလုတ်</b> ကို နှိပ်ပါ — Google AI Studio ၏ API Key စာမျက်နှာသို့ အလိုအလျောက် ရောက်ပါမည်</div></div>
    <div class="free-key-step"><div class="num">2</div><div class="txt">ထိုစာမျက်နှာတွင် <b>Google အကောင့်</b> ဖြင့် Login ဝင်ပါ</div></div>
    <div class="free-key-step"><div class="num">3</div><div class="txt"><b>"Create API key"</b> ခလုတ်ကို နှိပ်ပါ (ပထမဆုံးအကြိမ်ဆိုလျှင် သဘောတူညီချက်ကို လက်ခံပါ)</div></div>
    <div class="free-key-step"><div class="num">4</div><div class="txt">ထွက်လာသော <b>Key ကို Copy</b> လုပ်ပါ (AIza... ဖြင့် စတင်ပါသည်)</div></div>
    <div class="free-key-step"><div class="num">5</div><div class="txt">အောက်က <b>"ဆက်တင်များတွင် Key ထည့်ရန်"</b> ကို နှိပ်၍ Key ကို ထည့်ပါ — ပြီးပါပြီ! 🎉</div></div>
    <div class="free-key-actions">
      <a class="btn-primary-glow" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">🚀 API Key ဖန်တီးရန် သွားမည်</a>
      <a class="btn-ghost-full" href="/app/settings">🔑 ဆက်တင်များတွင် Key ထည့်ရန်</a>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
${sidebarScript()}
<script>
var TOKEN = localStorage.getItem('aics_token') || '';
var BANNER_MESSAGES = [
  "AI Creative Studio မှ ကြိုဆိုပါတယ် ✨",
  "သင့်ရဲ့ Creative Idea ကို AI နဲ့ အသက်သွင်းလိုက်ပါ 🚀",
  "ဇာတ်လမ်း၊ ပုံ၊ အသံ — အားလုံး တစ်နေရာတည်းမှာ 🎨"
];
var bannerIndex = 0;
function rotateBanner(){
  var el=document.getElementById('heroBannerText');
  if(!el||BANNER_MESSAGES.length<2)return;
  el.style.opacity=0;
  setTimeout(function(){bannerIndex=(bannerIndex+1)%BANNER_MESSAGES.length;el.innerText=BANNER_MESSAGES[bannerIndex];el.style.opacity=1;},600);
}
setInterval(rotateBanner,4000);
var CARD_MESSAGES={
  story:["AI ဖြင့် Story ရေးပါ","ဇာတ်လမ်းအမျိုးမျိုး ဖန်တီးပါ"],
  content:["AI ဖြင့် Content ရေးပါ","Facebook Content လွယ်ကူစွာ ဖန်တီးပါ"],
  short:["TikTok/Reels Script ဖန်တီးပါ","Short Video Idea ဖန်တီးပါ"],
  image:["AI Image Prompt ဖန်တီးပါ","ပုံလှလှလေးတွေ ဖန်တီးပါ"],
  voice:["Voice နဲ့ Text ပြောင်းပါ","အသံဖိုင်ကို Subtitle ပြောင်းပါ"],
  shop:["Marketing Content ဖန်တီးပါ","ရောင်းအား တက်အောင် ကူညီပါ"]
};
function rotateCard(key,index){
  var el=document.getElementById('desc-'+key);var list=CARD_MESSAGES[key];
  if(!el||!list||list.length<2)return;
  el.style.opacity=0;el.style.transform='translateY(6px)';
  setTimeout(function(){index=(index+1)%list.length;el.innerText=list[index];el.style.opacity=1;el.style.transform='translateY(0)';setTimeout(function(){rotateCard(key,index);},3200);},500);
}
Object.keys(CARD_MESSAGES).forEach(function(key,i){setTimeout(function(){rotateCard(key,0);},3200+(i*250));});
var STUDIO_ICONS={"STORY":"📖","STORYVIDEO":"🎬","CONTENT":"✍️","CONTENTVIDEO":"🎥","SHORT":"🎬","SHORTVIDEO":"🎬","IMAGE":"🎨","VOICE":"🎙","VOICETRANSCRIBE":"📝","SHOPCONTENT":"🛒","SHOPVIDEO":"🛒"};
(function(){var h=new Date().getHours();var t="မင်္ဂလာပါ 🌙";if(h<12)t="မင်္ဂလာပါ 👋";else if(h<17)t="မင်္ဂလာပါ ☀️";document.getElementById('greeting').innerText=t;})();
function api(path,opts){opts=opts||{};var h=opts.headers||{};h['Content-Type']='application/json';if(TOKEN)h['Authorization']='Bearer '+TOKEN;return fetch(path,{method:opts.method||'GET',headers:h,body:opts.body?JSON.stringify(opts.body):undefined}).then(function(r){return r.json();});}
// Phase 8 — အခမဲ့ API Key လမ်းညွှန် Modal ဖွင့်/ပိတ်
function openFreeKeyGuide(){var m=document.getElementById('freeKeyModal');if(m)m.classList.add('show');}
function closeFreeKeyGuide(){var m=document.getElementById('freeKeyModal');if(m)m.classList.remove('show');}
(function(){
  var m=document.getElementById('freeKeyModal');
  if(m)m.addEventListener('click',function(e){if(e.target===m)closeFreeKeyGuide();});
})();
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(type?' '+type:'');setTimeout(function(){t.className='toast';},2500);}
// (toggleSidebar / logout / setApiKey / TG-FB link များကို Shared Sidebar Script သို့ ရွှေ့ပြီးပါပြီ — Phase 2)
if(!TOKEN){
  document.querySelector('.main-content').innerHTML='<div style="padding:40px;text-align:center;"><h2>🔒 Login လိုအပ်ပါသည်</h2><p style="margin:16px 0;"><a href="/login" style="color:var(--cyan);text-decoration:underline;">Login / Sign Up စာမျက်နှာသို့ သွားရန်</a></p></div>';
}else{
  // Phase 13 — Option 2: Recent များကို Browser IndexedDB မှ ဖတ်သည်
  AICS_CREATIONS.list().then(function(items){
    var area=document.getElementById('recentProjectsArea');
    if(!items||items.length===0){
      area.innerHTML='<div class="empty-projects">📭 Save ထားသော Creation မရှိသေးပါ — Studio တစ်ခုခုမှာ Generate လုပ်ပြီး Save လုပ်ကြည့်ပါ</div>';
      return;
    }
    var top3=items.slice(0,3);
    var html='<div class="recent-grid">';
    top3.forEach(function(c){
      var icon=STUDIO_ICONS[c.studio]||'📄';
      var dateStr=c.created_at?fmtHomeDate(c.created_at):'';
      html+='<div class="project-card"><div class="p-icon">'+icon+'</div><div class="p-title">'+escapeHtml(c.title||'(Untitled)')+'</div><div class="p-date">'+dateStr+'</div><button class="project-open-btn" onclick="location.href=\\'/app/creations\\'">ဖွင့်ရန်</button></div>';
    });
    html+='</div>';
    area.innerHTML=html;
  }).catch(function(){document.getElementById('recentProjectsArea').innerHTML='<div class="empty-projects">Browser Storage ဖွင့်မရပါ</div>';});
}
function fmtHomeDate(s){
  var d=new Date(s);
  if(isNaN(d.getTime())) d=new Date(String(s).replace(' ','T')+'Z');
  return isNaN(d.getTime())?'':d.toLocaleDateString();
}
function escapeHtml(text){var div=document.createElement('div');div.innerText=text;return div.innerHTML;}
</script>
</body>
</html>`;
