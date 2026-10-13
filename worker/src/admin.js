// Phase 5 — AI Creative Studio Admin Panel (Dashboard / CMS / Users / Studios / Features / Usage / Logs)
// Phase 4 — Studio Control (ON/OFF) ထည့်သည် (Rule 14 — Admin က Code မပြင်ဘဲ ထိန်းချုပ်နိုင်)
// Phase 5 — Free/Pro Feature ထိန်းချုပ် + Usage Statistics + Admin Logs (Rules 12/15/16/18)
// Served at /admin. Admin-only — Server-side တွင် အမြဲ စစ်ဆေးသည် (Rule 13).

import { setStudioEnabled, getStudioSettings } from './core/studioSettings.js';
import { STUDIO_REGISTRY } from './config/studios.js';
import { FEATURE_REGISTRY } from './config/features.js';
import { getFeatureSettings, setFeatureSetting } from './core/featureSettings.js';
import { getAiModels, setAiModel, deleteAiModel } from './core/aiModels.js';
import { logAdminAction, listAdminLogs } from './core/adminLogs.js';

export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Admin Center — AI Creative Studio</title>
<style>
:root{
  --bg:#080C18;--panel:#0D1424;--card:#111A2C;--card2:#151F33;--line:rgba(255,255,255,.08);
  --text:#F8FAFC;--muted:#8D98AB;--cyan:#00E5FF;--purple:#7B5CFF;--green:#4ADE80;--orange:#FF9F2B;--red:#FF6672;
  --shadow:0 18px 60px rgba(0,0,0,.28);--radius:16px
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Myanmar",sans-serif}
body{background:radial-gradient(900px 500px at 85% -10%,rgba(123,92,255,.13),transparent 55%),radial-gradient(700px 500px at 10% 0%,rgba(0,229,255,.07),transparent 52%),var(--bg)}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.hidden{display:none!important}
#loading{min-height:100vh;display:grid;place-items:center;color:var(--muted);font-size:14px;padding:30px;text-align:center}
#app{min-height:100vh}
.shell{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:256px;padding:20px 14px;background:rgba(10,16,29,.88);backdrop-filter:blur(18px);border-right:1px solid var(--line);z-index:40;overflow-y:auto}
.brand{display:flex;align-items:center;gap:11px;padding:6px 8px 22px}
.brand-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--purple),var(--cyan));box-shadow:0 8px 28px rgba(0,229,255,.15);font-size:18px}
.brand-title{font-weight:800;font-size:13px;letter-spacing:.04em}.brand-sub{font-size:10px;color:var(--muted);margin-top:2px}
.nav-section{font-size:10px;letter-spacing:.12em;color:#667287;font-weight:700;padding:15px 10px 7px;text-transform:uppercase}
.nav-btn{width:100%;border:1px solid transparent;background:transparent;color:#AEB8C8;text-align:left;border-radius:11px;padding:10px 11px;display:flex;align-items:center;gap:10px;font-size:13px;margin:2px 0;transition:.18s}
.nav-btn:hover{background:rgba(255,255,255,.045);color:#fff}.nav-btn.active{background:linear-gradient(90deg,rgba(0,229,255,.10),rgba(123,92,255,.08));border-color:rgba(0,229,255,.12);color:#fff;box-shadow:inset 2px 0 0 var(--cyan)}
.nav-icon{width:20px;text-align:center;font-size:15px}.nav-label{flex:1}.nav-arrow{font-size:11px;color:#5F6A7D}
.sidebar-footer{position:sticky;bottom:0;margin-top:18px;padding:12px 4px 4px;background:linear-gradient(transparent,rgba(10,16,29,.96) 25%)}
.app-link{display:flex;align-items:center;gap:8px;color:#B7C1D0;text-decoration:none;border:1px solid var(--line);padding:10px 11px;border-radius:11px;font-size:12px}.app-link:hover{color:#fff;border-color:rgba(0,229,255,.25)}
.main{margin-left:256px;width:calc(100% - 256px);min-width:0}
.topbar{position:sticky;top:0;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid var(--line);background:rgba(8,12,24,.78);backdrop-filter:blur(18px);z-index:30}
.mobile-menu{display:none}.crumb{font-size:12px;color:var(--muted)}.crumb b{color:#fff}.top-actions{display:flex;align-items:center;gap:10px}.admin-pill{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;font-size:11px;color:#C8D0DC}.avatar{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--purple),var(--cyan));color:#fff;font-size:11px;font-weight:800}
.content{max-width:1480px;margin:0 auto;padding:28px}
.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:22px}.eyebrow{font-size:11px;color:var(--cyan);font-weight:700;letter-spacing:.1em;text-transform:uppercase}.page-title{font-size:27px;line-height:1.15;margin:6px 0 6px;font-weight:800;letter-spacing:-.02em}.page-desc{margin:0;color:var(--muted);font-size:13px}.head-actions{display:flex;gap:8px;flex-wrap:wrap}
.btn{border:1px solid transparent;border-radius:10px;padding:9px 13px;font-size:12px;font-weight:650;color:#fff;background:#182338;transition:.18s;white-space:nowrap}.btn:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.12)}.btn.primary{background:linear-gradient(135deg,#00BFD6,#008FA4);box-shadow:0 8px 24px rgba(0,229,255,.12)}.btn.green{background:rgba(74,222,128,.12);color:#8AF0AA;border-color:rgba(74,222,128,.18)}.btn.red{background:rgba(255,102,114,.10);color:#FF9BA3;border-color:rgba(255,102,114,.18)}.btn.gray{background:#151D2C;color:#98A3B5}.btn.sm{padding:7px 10px;font-size:11px}.btn.active{background:rgba(0,229,255,.11);border-color:rgba(0,229,255,.2);color:#fff}.btn.inactive{background:#121A2A;color:#8994A7}
.card{background:linear-gradient(180deg,rgba(21,31,51,.96),rgba(15,24,41,.96));border:1px solid var(--line);border-radius:var(--radius);padding:17px;margin-bottom:14px;box-shadow:0 10px 34px rgba(0,0,0,.10)}
.card-title{font-size:13px;font-weight:750}.card-sub{font-size:11px;color:var(--muted);margin-top:4px}.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:13px}
.grid{display:grid;gap:14px}.stats-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.two-col{grid-template-columns:1.3fr .7fr}.three-col{grid-template-columns:repeat(3,minmax(0,1fr))}
.stat{position:relative;overflow:hidden;min-height:118px}.stat:after{content:"";position:absolute;width:90px;height:90px;border-radius:50%;right:-28px;bottom:-40px;background:rgba(0,229,255,.07)}.stat-label{font-size:11px;color:var(--muted)}.stat-value{font-size:27px;font-weight:800;margin-top:13px;letter-spacing:-.02em}.stat-foot{font-size:10px;color:#667287;margin-top:7px}
.health{display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid rgba(74,222,128,.14);background:rgba(74,222,128,.05);border-radius:11px}.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 12px rgba(74,222,128,.5)}
.quick{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.quick .btn{text-align:left;padding:12px}.quick small{display:block;color:var(--muted);font-weight:400;margin-top:3px}
.list{display:grid;gap:8px}.list-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 12px;border:1px solid rgba(255,255,255,.055);border-radius:11px;background:rgba(255,255,255,.018)}.list-main{min-width:0}.list-title{font-size:12px;font-weight:700}.list-meta{font-size:10px;color:var(--muted);margin-top:4px;white-space:normal}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.user-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}.user-meta{font-size:10px;color:var(--muted);margin-top:4px}
.badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:750;letter-spacing:.02em}.badge.free{background:rgba(148,163,184,.10);color:#AAB5C5}.badge.pro{background:rgba(123,92,255,.14);color:#BBAEFF}.badge.on{background:rgba(74,222,128,.10);color:#82EFA3}.badge.off{background:rgba(255,102,114,.10);color:#FF9BA3}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.filters>*{min-height:38px}select,input,textarea{border:1px solid rgba(255,255,255,.10);border-radius:10px;background:#0C1525;color:#EAF0F7;padding:9px 11px;font-size:12px;outline:none}select:focus,input:focus,textarea:focus{border-color:rgba(0,229,255,.42);box-shadow:0 0 0 3px rgba(0,229,255,.06)}select{width:auto}input{width:auto}textarea{width:100%;min-height:78px;resize:vertical}.filters input{min-width:170px}.filters select{min-width:125px}
.empty{padding:32px;text-align:center;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.10);border-radius:12px}.err{color:#FF8E98}
.overlay{position:fixed;inset:0;background:rgba(2,5,12,.78);backdrop-filter:blur(8px);overflow-y:auto;z-index:100;padding:24px}.form{max-width:820px;margin:0 auto}.form h3{font-size:18px;margin:0}.form label{display:block;font-size:10px;font-weight:750;color:#AAB5C5;letter-spacing:.05em;margin:13px 0 5px;text-transform:uppercase}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:15px;border-top:1px solid var(--line)}
.divider{height:1px;background:var(--line);margin:16px 0}.muted{color:var(--muted)}
@media(max-width:1100px){.stats-grid{grid-template-columns:repeat(3,1fr)}.two-col{grid-template-columns:1fr}.three-col{grid-template-columns:1fr 1fr}}
@media(max-width:760px){.sidebar{transform:translateX(-100%);transition:.2s;width:280px}.sidebar.open{transform:translateX(0)}.main{margin-left:0;width:100%}.topbar{height:60px;padding:0 14px}.mobile-menu{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--line);background:#111A2C;color:#fff;border-radius:10px}.crumb{display:none}.content{padding:18px 14px}.page-head{align-items:flex-start;flex-direction:column}.page-title{font-size:23px}.stats-grid{grid-template-columns:repeat(2,1fr)}.three-col{grid-template-columns:1fr}.quick{grid-template-columns:1fr}.top-actions .admin-pill span.email{display:none}.card{padding:14px;border-radius:14px}.filters>*{width:100%!important}.filters .btn{width:auto!important}.list-row{align-items:flex-start;flex-direction:column}.user-row{align-items:flex-start}.form{padding:15px}}
</style>
</head>
<body>
<div id="loading">⏳ Loading Admin Center…</div>
<div id="app" class="hidden">
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="brand-mark">✦</div><div><div class="brand-title">AI CREATIVE STUDIO</div><div class="brand-sub">Premium Admin Center</div></div></div>
    <div class="nav-section">Overview</div>
    <button class="nav-btn active" id="tabDashboard" onclick="switchTab('dashboard');closeNav()"><span class="nav-icon">⌂</span><span class="nav-label">Overview</span></button>
    <div class="nav-section">Management</div>
    <button class="nav-btn inactive" id="tabUsers" onclick="switchTab('users');closeNav()"><span class="nav-icon">♙</span><span class="nav-label">Users</span></button>
    <button class="nav-btn inactive" id="tabStudios" onclick="switchTab('studios');closeNav()"><span class="nav-icon">✦</span><span class="nav-label">AI Studios</span></button>
    <div class="nav-section">AI System</div>
    <button class="nav-btn inactive" id="tabModels" onclick="switchTab('models');closeNav()"><span class="nav-icon">◈</span><span class="nav-label">AI Models</span></button>
    <button class="nav-btn inactive" id="tabFeatures" onclick="switchTab('features');closeNav()"><span class="nav-icon">⚙</span><span class="nav-label">Plans & Features</span></button>
    <button class="nav-btn inactive" id="tabCms" onclick="switchTab('cms');closeNav()"><span class="nav-icon">▤</span><span class="nav-label">Content / CMS</span></button>
    <button class="nav-btn inactive" id="tabBrain" onclick="switchTab('brain');closeNav()"><span class="nav-icon">🧠</span><span class="nav-label">Brain CMS</span></button>
    <div class="nav-section">Analytics</div>
    <button class="nav-btn inactive" id="tabUsage" onclick="switchTab('usage');closeNav()"><span class="nav-icon">⌁</span><span class="nav-label">Usage</span></button>
    <button class="nav-btn inactive" id="tabLogs" onclick="switchTab('logs');closeNav()"><span class="nav-icon">≡</span><span class="nav-label">Activity</span></button>
    <div class="sidebar-footer"><a class="app-link" href="/app">↗ <span>Open User App</span></a></div>
  </aside>
  <section class="main">
    <header class="topbar"><div class="row"><button class="mobile-menu" onclick="toggleNav()">☰</button><div class="crumb">Admin Center <span class="muted">/</span> <b id="crumbTitle">Overview</b></div></div><div class="top-actions"><div class="admin-pill"><span class="avatar">A</span><span class="email" id="userBox"></span></div></div></header>
    <main class="content">
      <section id="dashboardView">
        <div class="page-head"><div><div class="eyebrow">Control Center</div><h1 class="page-title">Good morning, Admin</h1><p class="page-desc">AI Creative Studio ရဲ့ System အခြေအနေကို တစ်နေရာတည်းက စီမံပါ။</p></div><div class="head-actions"><button class="btn primary" onclick="loadDashboard()">↻ Refresh</button></div></div>
        <div class="grid stats-grid" id="statCards"></div>
        <div class="grid two-col" style="margin-top:14px">
          <div class="card"><div class="section-head"><div><div class="card-title">Studio Status</div><div class="card-sub">User App မှာ လက်ရှိဖွင့်ထားတဲ့ Studios</div></div></div><div class="grid three-col" id="healthGrid"></div></div>
          <div class="card"><div class="section-head"><div><div class="card-title">Quick Actions</div><div class="card-sub">မကြာခဏသုံးမယ့် Admin actions</div></div></div><div class="quick"><button class="btn" onclick="switchTab('models')">◈ AI Models<small>Model စီမံရန်</small></button><button class="btn" onclick="switchTab('studios')">✦ Studios<small>ON / OFF ပြုလုပ်ရန်</small></button><button class="btn" onclick="switchTab('cms')">▤ Content<small>Prompt / Template ပြင်ရန်</small></button></div></div>
        </div>
        <div class="card" style="margin-top:14px"><div class="section-head"><div><div class="card-title">Recent Users</div><div class="card-sub">နောက်ဆုံးဝင်လာတဲ့ Users</div></div><button class="btn sm" onclick="switchTab('users')">View all →</button></div><div id="recentUsers" class="list"></div></div>
      </section>
      <section id="cmsView" class="hidden"><div class="page-head"><div><div class="eyebrow">AI System</div><h1 class="page-title">Content / CMS</h1><p class="page-desc">Studio တစ်ခုချင်းစီအတွက် Prompt, Template နဲ့ AI instructions ကို စီမံပါ။</p></div><div class="head-actions"><button class="btn" onclick="load()">↻ Refresh</button><button class="btn primary" onclick="addEdit(null)">＋ Add Content</button></div></div><div class="card"><div class="filters"><select id="fStudio"></select><select id="fPlan"><option value="">Plan · All</option><option value="FREE">FREE</option><option value="PRO">PRO</option></select><input id="fType" placeholder="Sub-Type (1–5)"><button class="btn sm" onclick="load()">Apply</button></div></div><div id="list"></div></section>
      <section id="brainView" class="hidden"><div class="page-head"><div><div class="eyebrow">AI System</div><h1 class="page-title">Brain CMS (11-Layer)</h1><p class="page-desc">GLOBAL_BRAIN / STORY_TYPES / STORY_VIDEO — knowledge, rules, prompts များကို scope+module+type ဖြင့် သီးခြားစီမံပါ။ Knowledge Isolation: selected type/workflow rows သာ AI context ထဲ ဝင်မည်။</p></div><button class="btn" onclick="loadBrain()">↻ Refresh</button></div><div class="card"><div class="card-title">Add / Edit Brain Row</div><div class="grid three-col"><div><label>Scope</label><select id="bScope"><option>STORY_TYPES</option><option>STORY_VIDEO</option><option>GLOBAL_BRAIN</option></select></div><div><label>Module</label><select id="bModule"><option>STORY_TYPE</option><option>VIDEO_KNOWLEDGE</option><option>VISUAL_STYLE</option><option>VIDEO_WORKFLOW</option><option>GLOBAL_FRAMEWORK</option></select></div><div><label>Type (BASE / TYPE_1 / ANIME / CINEMATIC_FEATURE …)</label><input id="bType" value="TYPE_1"></div><div><label>Plan</label><select id="bPlan"><option>FREE</option><option>PRO</option></select></div><div><label>Key (role/knowledge/rules/structure/prompt/…)</label><input id="bKey" value="knowledge"></div><div><label>Version</label><input id="bVersion" type="number" value="1"></div></div><div style="margin-top:8px;"><label>Value</label><textarea id="bValue" style="min-height:90px;width:100%;box-sizing:border-box;"></textarea></div><div class="form-actions"><button class="btn gray" onclick="brainReset()">Reset</button><button class="btn primary" onclick="saveBrain()">Save Brain Row</button></div><div id="brainMsg" style="font-size:12px;margin-top:6px;color:#00C853;"></div></div><div class="card"><div class="filters"><select id="bScopeF"><option value="">Scope · All</option><option>GLOBAL_BRAIN</option><option>STORY_TYPES</option><option>STORY_VIDEO</option></select><select id="bModuleF"><option value="">Module · All</option><option>GLOBAL_FRAMEWORK</option><option>STORY_TYPE</option><option>VIDEO_KNOWLEDGE</option><option>VISUAL_STYLE</option><option>VIDEO_WORKFLOW</option></select><input id="bTypeF" placeholder="Type (e.g. TYPE_1 / ANIME)"><button class="btn sm" onclick="loadBrain()">Apply</button></div></div><div id="brainList"></div></section>
      <section id="usersView" class="hidden"><div class="page-head"><div><div class="eyebrow">Management</div><h1 class="page-title">Users</h1><p class="page-desc">User plan နဲ့ account အခြေအနေကို စီမံပါ။</p></div><button class="btn" onclick="loadUsers()">↻ Refresh</button></div><div id="usersList"></div></section>
      <section id="studiosView" class="hidden"><div class="page-head"><div><div class="eyebrow">Management</div><h1 class="page-title">AI Studios</h1><p class="page-desc">User App မှာ ဘယ် Studio တွေကို အသုံးပြုခွင့်ပေးမလဲ စီမံပါ။</p></div><button class="btn" onclick="loadStudios()">↻ Refresh</button></div><div class="card"><div class="card-title">Studio Availability</div><div class="card-sub">OFF လုပ်ထားတဲ့ Studio ကို User App မှာ ဝင်သုံးလို့မရတော့ပါ။</div></div><div id="studiosList"></div></section>
      <section id="featuresView" class="hidden"><div class="page-head"><div><div class="eyebrow">AI System</div><h1 class="page-title">Plans & Features</h1><p class="page-desc">FREE / PRO access နဲ့ feature limits ကို Code မပြင်ဘဲ စီမံပါ။</p></div><button class="btn" onclick="loadFeatures()">↻ Refresh</button></div><div id="featuresList"></div></section>
      <section id="modelsView" class="hidden"><div class="page-head"><div><div class="eyebrow">AI System</div><h1 class="page-title">AI Models</h1><p class="page-desc">Text, Image, Voice နဲ့ Transcription models ကို စီမံပါ။</p></div><button class="btn" onclick="loadModels()">↻ Refresh</button></div><div class="card"><div class="filters"><button id="mfAll" class="btn sm active" onclick="mfPlan('')">All</button><button id="mfFree" class="btn sm" onclick="mfPlan('FREE')">FREE</button><button id="mfPro" class="btn sm" onclick="mfPlan('PRO')">PRO</button><select id="mfCat" onchange="mfCat()"><option value="">Category · All</option><option value="text">📝 Text</option><option value="image">🖼️ Image</option><option value="voice">🎙️ Voice</option><option value="transcribe">🎧 Transcribe</option></select></div></div><div id="modelsList"></div></section>
      <section id="usageView" class="hidden"><div class="page-head"><div><div class="eyebrow">Analytics</div><h1 class="page-title">Usage</h1><p class="page-desc">AI, Voice နဲ့ Image usage ကို စောင့်ကြည့်ပါ။</p></div><button class="btn" onclick="loadUsage()">↻ Refresh</button></div><div class="grid two-col"><div class="card"><div class="section-head"><div><div class="card-title">Daily Usage</div><div class="card-sub">နောက်ဆုံး 28 ရက်</div></div></div><div id="usageDaily" class="list"></div></div><div class="card"><div class="section-head"><div><div class="card-title">Top Users</div><div class="card-sub">Usage အများဆုံး Users</div></div></div><div id="usageTop" class="list"></div></div></div></section>
      <section id="logsView" class="hidden"><div class="page-head"><div><div class="eyebrow">Analytics</div><h1 class="page-title">Activity</h1><p class="page-desc">Admin ပြုလုပ်ထားတဲ့ အရေးကြီးလုပ်ဆောင်ချက်တွေကို Audit လုပ်ပါ။</p></div><button class="btn" onclick="loadLogs()">↻ Refresh</button></div><div id="logsList" class="list"></div></section>
    </main>
  </section>
</div>
<div id="formWrap" class="hidden"><div class="overlay"><div class="card form"><div class="section-head"><div><div class="eyebrow">Content Editor</div><h3 id="formTitle">Add Content</h3></div><button class="btn gray sm" onclick="closeForm()">✕</button></div><div class="grid three-col"><div><label>Studio</label><select id="iStudio" style="width:100%"></select></div><div><label>Plan</label><select id="iPlan" style="width:100%"><option value="FREE">FREE</option><option value="PRO">PRO</option></select></div><div><label>Type</label><input id="iType" value="1" style="width:100%"></div></div><div class="divider"></div><div class="grid two-col"><div><label>core</label><textarea id="iCore"></textarea></div><div><label>memory</label><textarea id="iMemory"></textarea></div><div><label>knowledge</label><textarea id="iKnowledge"></textarea></div><div><label>workflow</label><textarea id="iWorkflow"></textarea></div><div><label>template</label><textarea id="iTemplate"></textarea></div><div><label>prompt</label><textarea id="iPrompt"></textarea></div><div><label>quality check</label><textarea id="iQuality_check"></textarea></div><div><label>final output</label><textarea id="iFinal_output"></textarea></div></div><div class="form-actions"><button class="btn gray" onclick="closeForm()">Cancel</button><button class="btn primary" onclick="save()">Save Changes</button></div></div></div></div>
</div>
<script>
function toggleNav(){var s=document.getElementById('sidebar');if(s)s.classList.toggle('open');}
function closeNav(){var s=document.getElementById('sidebar');if(s)s.classList.remove('open');}
function setCrumb(tab){var m={dashboard:'Overview',cms:'Content / CMS',brain:'Brain CMS',users:'Users',studios:'AI Studios',features:'Plans & Features',models:'AI Models',usage:'Usage',logs:'Activity'};var e=document.getElementById('crumbTitle');if(e)e.textContent=m[tab]||'Overview';}
</script>
<script>
window.onerror = function(msg, url, line) {
  var el = document.getElementById('loading');
  if (el) el.innerHTML = '<div style="color:#d33;text-align:left;"><b>JS Error:</b> ' + String(msg) + '<br><b>Line:</b> ' + line + '</div>';
};

var TOKEN_KEY='aics_token';
var token='';
try { token = localStorage.getItem(TOKEN_KEY) || ''; } catch(e) {}
var STUDIO_GROUPS=[
  {g:'Story', v:[['STORY','စာသား'],['STORYVIDEO','ဗီဒီယို']]},
  {g:'Content', v:[['CONTENT','စာသား'],['CONTENTVIDEO','ဗီဒီယို']]},
  {g:'Short', v:[['SHORT','စာသား'],['SHORTVIDEO','ဗီဒီယို']]},
  {g:'Image', v:[['IMAGE','ပုံ']]},
  {g:'Voice', v:[['VOICE','အသံ']]},
  {g:'Shop', v:[['SHOPCONTENT','စာသား'],['SHOPVIDEO','ဗီဒီယို']]}
];
var STUDIOS=[];STUDIO_GROUPS.forEach(function(g){g.v.forEach(function(x){STUDIOS.push(x[0]);});});
function studioLabel(code){
  for(var i=0;i<STUDIO_GROUPS.length;i++){
    var g=STUDIO_GROUPS[i];
    for(var j=0;j<g.v.length;j++){
      if(g.v[j][0]===code){ return g.g+' · '+g.v[j][1]; }
    }
  }
  return code;
}
var FIELDS=['core','memory','knowledge','workflow','template','prompt','quality_check','final_output'];
var items=[];
var users=[];
var editingId=null;
var currentTab='cms';

function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function showError(msg){
  $('loading').style.display='block';
  $('loading').innerHTML='<div style="color:#d33;"><b>Error:</b> '+esc(String(msg))+'</div>';
}
function showApp(){
  $('loading').style.display='none';
  $('app').classList.remove('hidden');
}
function login(){location.href='/api/auth/login?next='+encodeURIComponent(location.origin+'/admin');}
function api(path,method,body){
  return fetch(path,{method:method||'GET',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:body?JSON.stringify(body):undefined})
    .then(function(r){return r.json().catch(function(){return {error:'bad_response'};});});
}

function fillStudios(){
  var mk=function(id,allLabel){
    var html='<option value="">'+allLabel+'</option>';
    STUDIO_GROUPS.forEach(function(g){
      html+='<optgroup label="'+g.g+'">';
      g.v.forEach(function(x){html+='<option value="'+x[0]+'">'+x[1]+'</option>';});
      html+='</optgroup>';
    });
    $(id).innerHTML=html;
  };
  mk('fStudio','Studio (all)');
  mk('iStudio','— ရွေးပါ —');
}

function switchTab(tab){
  currentTab=tab;
  setCrumb(tab);
  ['dashboard','cms','brain','users','studios','features','models','usage','logs'].forEach(function(t){
    $('tab'+t.charAt(0).toUpperCase()+t.slice(1)).className='btn '+(tab===t?'active':'inactive');
    $(t+'View').classList.toggle('hidden',tab!==t);
  });
  if(tab==='users') loadUsers();
  if(tab==='studios') loadStudios();
  if(tab==='features') loadFeatures();
  if(tab==='models') loadModels();
  if(tab==='usage') loadUsage();
  if(tab==='logs') loadLogs();
  if(tab==='dashboard') loadDashboard();
}

// ===== Phase 5 — Dashboard (Statistics) =====
function loadDashboard(){
  api('/api/admin/dashboard').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('statCards').innerHTML='<span class="err">'+(d.detail||d.error)+'</span>';return;}
    var st=d.stats||{};
    var cards=[
      ['👥 Users',st.users||0],
      ['⭐ PRO',st.pro||0],
      ['🗂️ Projects',st.projects||0],
      ['🤖 AI (ယနေ့)',st.ai_today||0],
      ['🎙️ Voice (ယနေ့)',st.voice_today||0],
      ['🖼️ Image (ယနေ့)',st.image_today||0]
    ];
    var html='';
    var labels=[['👥','Users','All registered users','users'],['★','PRO Users','Premium accounts','pro'],['▣','Projects','Saved projects','projects'],['◈','AI Today','AI generations today','ai_today'],['◉','Voice Today','Voice generations today','voice_today'],['▧','Image Today','Image generations today','image_today']];
    labels.forEach(function(x){html+='<div class="card stat"><div class="stat-label">'+x[0]+' '+x[1]+'</div><div class="stat-value">'+esc(st[x[3]]||0)+'</div><div class="stat-foot">'+x[2]+'</div></div>';});
    $('statCards').innerHTML=html;
    var hg=$('healthGrid'); if(hg){hg.innerHTML='<div class="muted" style="font-size:11px">Loading studio status…</div>'; api('/api/admin/studios').then(function(sd){var arr=sd.items||[]; hg.innerHTML=arr.map(function(x){return '<div class="health" style="opacity:'+(x.enabled?'1':'.55')+'"><span class="dot" style="background:'+(x.enabled?'var(--green)':'#64748B')+';box-shadow:none"></span><span style="font-size:11px">'+esc(x.nameMy||x.name||x.id)+'</span><span style="margin-left:auto;font-size:10px;color:'+(x.enabled?'#82EFA3':'#7C8799')+'">'+(x.enabled?'ON':'OFF')+'</span></div>';}).join('')||'<div class="muted" style="font-size:11px">No studio data</div>';}).catch(function(){hg.innerHTML='<div class="muted" style="font-size:11px">Studio status unavailable</div>';});}
    var ru=$('recentUsers');ru.innerHTML='';
    (d.recent||[]).forEach(function(u){
      ru.innerHTML+='<div class="list-row"><div class="list-main"><div class="list-title">'+esc(u.email||'')+'</div><div class="list-meta">Joined '+esc(u.created_at||'')+'</div></div><span class="badge '+(u.plan==='PRO'?'pro':'free')+'">'+esc(u.plan||'FREE')+'</span></div>';
    });
  }).catch(function(e){
    $('statCards').innerHTML='<span class="err">Network error: '+esc(String(e&&e.message||e))+'</span>';
  });
}

// ===== Phase 5 — Features (Free/Pro Config — Rule 15) =====
function loadFeatures(){
  api('/api/admin/features').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('featuresList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    var list=$('featuresList');list.innerHTML='';
    (d.items||[]).forEach(function(f){
      var c=document.createElement('div');
      c.className='card';
      c.innerHTML='<div class="user-row"><div><b>'+esc(f.nameMy)+'</b> <span style="font-size:11px;color:#6B7280;">('+esc(f.id)+')</span>'+
        '<div class="user-meta">'+esc(f.desc||'')+' · '+(f.enabled?'<span class="badge pro">ON</span>':'<span class="badge free">OFF</span>')+'</div></div>'+
        '<div class="row" style="gap:6px;">'+
        '<select id="acc-'+esc(f.id)+'"><option value="FREE"'+(f.access!=='PRO'?' selected':'')+'>FREE</option><option value="PRO"'+(f.access==='PRO'?' selected':'')+'>PRO</option></select>'+
        '<input id="lim-'+esc(f.id)+'" type="number" min="0" value="'+esc(f.limit_value||0)+'" title="Limit" style="width:70px;">'+
        '<button class="btn sm '+(f.enabled?'red':'green')+'" data-on="'+(f.enabled?'1':'0')+'" onclick="toggleFeature(\\''+esc(f.id)+'\\',this)">'+(f.enabled?'⏻ ပိတ်မည်':'⏻ ဖွင့်မည်')+'</button>'+
        '<button class="btn sm" onclick="saveFeature(\\''+esc(f.id)+'\\')">💾 Save</button>'+
        '</div></div>';
      list.appendChild(c);
    });
  }).catch(function(e){
    $('featuresList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}
function saveFeature(id){
  var access=$('acc-'+id).value;
  var limit=$('lim-'+id).value;
  api('/api/admin/features/'+id,'PUT',{access:access,limit_value:limit}).then(function(d){
    if(d.ok){loadFeatures();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}
function toggleFeature(id,btn){
  var next=!(btn.getAttribute('data-on')==='1');
  api('/api/admin/features/'+id,'PUT',{enabled:next}).then(function(d){
    if(d.ok){loadFeatures();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

// ===== Phase C — AI Models (ထည့်/ပြင်/ဖွင့်/ပိတ်/ဖျက်) =====
function catLabel(c){return c==='image'?'🖼️ Image (ပုံ)':(c==='voice'?'🎙️ Text → Voice (အသံ)':(c==='transcribe'?'🎧 Voice → Text (အသံ→စာသား)':'📝 Text Only (စာသား)'));}
var modelItems=[], mfPlanSel='', mfCatSel='';
function mfPlan(p){
  mfPlanSel=p;
  [['','mfAll'],['FREE','mfFree'],['PRO','mfPro']].forEach(function(pair){
    $(pair[1]).className='btn sm '+(mfPlanSel===pair[0]?'active':'');
  });
  renderModels();
}
function mfCat(){ mfCatSel=$('mfCat').value; renderModels(); }
function loadModels(){
  api('/api/admin/models').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('modelsList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    modelItems=d.items||[];
    renderModels();
  }).catch(function(e){
    $('modelsList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}
function renderModels(){
  var rows=(modelItems||[]).filter(function(m){
    if(mfPlanSel&&m.plan_access!==mfPlanSel)return false;
    if(mfCatSel&&m.category!==mfCatSel)return false;
    return true;
  });
  var html='<div class="card"><b>＋ Model အသစ် ထည့်ရန်</b>'+
    '<div class="row" style="margin-top:8px;">'+
    '<input id="nm_id" placeholder="Model ID (ဥပမာ gemini-2.5-pro)" style="flex:2;min-width:150px;">'+
    '<input id="nm_name" placeholder="ပြမည့်နာမည်" style="flex:2;min-width:120px;">'+
    '<select id="nm_cat"><option value="text">📝 Text Only (စာသား)</option><option value="image">🖼️ Image (ပုံ)</option><option value="voice">🎙️ Text → Voice (အသံ)</option><option value="transcribe">🎧 Voice → Text (အသံ→စာသား)</option></select>'+
    '<select id="nm_plan"><option value="FREE">လူတိုင်း</option><option value="PRO">PRO သာ</option></select>'+
    '<button class="btn green" onclick="addModel()">＋ Add</button></div>'+
    '<div style="font-size:11px;color:#6B7280;margin-top:6px;">⚠️ Model ID သည် Google Gemini API တွင် တကယ်ရှိသော နာမည် ဖြစ်ရမည် — မမှန်ပါက Generate လုပ်သော အခါ အမှား ပြပါမည်။</div></div>';
  if(rows.length===0){html+='<div class="card">(ဤအပိုင်းတွင် Model မရှိသေး — အောက်ပါ စစ်ထုတ်မှု ပြောင်းပါ သို့မဟုတ် ＋ Add)</div>';}
  rows.forEach(function(m){
    var mid=esc(m.id);
    html+='<div class="card"><div class="user-row"><div><b>'+esc(m.name||m.id)+'</b> <span style="font-size:11px;color:#6B7280;">('+mid+')</span>'+
      '<div class="user-meta">'+catLabel(m.category)+' · '+(m.plan_access==='PRO'?'<span class="badge pro">PRO သာ</span>':'<span class="badge free">လူတိုင်း</span>')+
      (m.is_default?' · <span class="badge pro">★ မူရင်း</span>':'')+'</div></div>'+
      '<div class="row" style="gap:6px;margin-top:6px;">'+
      '<input id="nm_'+mid+'" value="'+esc(m.name||m.id)+'" placeholder="ပြမည့်နာမည်" style="flex:2;min-width:110px;">'+
      '<select id="pm_'+mid+'"><option value="FREE"'+(m.plan_access!=='PRO'?' selected':'')+'>လူတိုင်း</option><option value="PRO"'+(m.plan_access==='PRO'?' selected':'')+'>PRO သာ</option></select>'+
      '<button class="btn sm" onclick="saveModel(\\''+mid+'\\')">💾 Save</button>'+
      '<button class="btn sm '+(m.enabled?'red':'green')+'" data-on="'+(m.enabled?'1':'0')+'" onclick="toggleModel(\\''+mid+'\\',this)">'+(m.enabled?'⏻ ပိတ်မည်':'⏻ ဖွင့်မည်')+'</button>'+
      '<button class="btn sm '+(m.is_default?'gray':'')+'" onclick="setDefault(\\''+mid+'\\')">★ မူရင်း</button>'+
      '<button class="btn sm red" onclick="delModel(\\''+mid+'\\')">🗑 ဖျက်</button>'+
      '</div></div></div>';
  });
  $('modelsList').innerHTML=html;
}
function addModel(){
  var id=($('nm_id').value||'').trim();
  if(!id){alert('Model ID ထည့်ပါ');return;}
  api('/api/admin/models','POST',{
    id:id,
    name:$('nm_name').value.trim(),
    category:$('nm_cat').value,
    plan_access:$('nm_plan').value,
    enabled:true
  }).then(function(d){
    if(d.ok){loadModels();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}
function saveModel(id){
  var payload={plan_access:$('pm_'+id).value};
  var nm=$('nm_'+id);
  if(nm&&String(nm.value||'').trim())payload.name=String(nm.value).trim();
  api('/api/admin/models/'+id,'PUT',payload).then(function(d){
    if(d.ok){loadModels();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}
function toggleModel(id,btn){
  var next=!(btn.getAttribute('data-on')==='1');
  api('/api/admin/models/'+id,'PUT',{enabled:next}).then(function(d){
    if(d.ok){loadModels();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}
function setDefault(id){
  api('/api/admin/models/'+id,'PUT',{is_default:true}).then(function(d){
    if(d.ok){loadModels();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}
function delModel(id){
  if(!confirm('ဤ Model ကို ဖျက်မှာလား?'))return;
  api('/api/admin/models/'+id,'DELETE').then(function(d){
    if(d.ok||d.ok===undefined){loadModels();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

// ===== Phase 5 — Usage Statistics =====
function loadUsage(){
  api('/api/admin/usage').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('usageDaily').innerHTML='<span class="err">'+(d.detail||d.error)+'</span>';return;}
    var h='';
    (d.daily||[]).forEach(function(r){h+='<div class="list-row"><div class="list-main"><div class="list-title">'+esc(r.day||'')+'</div><div class="list-meta">'+esc(r.category||'')+'</div></div><b>'+esc(r.total)+'</b></div>';});
    $('usageDaily').innerHTML=h||'(no data yet)';
    var t='';
    (d.byUser||[]).forEach(function(r){t+='<div class="list-row"><div class="list-main"><div class="list-title">'+esc(r.email||'')+'</div><div class="list-meta">'+esc(r.calls)+' calls</div></div><b>'+esc(r.total)+'</b></div>';});
    $('usageTop').innerHTML=t||'(no data yet)';
  }).catch(function(e){
    $('usageDaily').innerHTML='<span class="err">Network error: '+esc(String(e&&e.message||e))+'</span>';
  });
}

// ===== Phase 5 — Admin Logs (Audit) =====
function loadLogs(){
  api('/api/admin/logs').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('logsList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    var list=$('logsList');list.innerHTML='';
    var rows=d.items||[];
    if(rows.length===0){list.innerHTML='<div class="empty">No activity yet</div>';return;}
    rows.forEach(function(r){
      var c=document.createElement('div');
      c.className='list-row';
      c.innerHTML='<div class="list-main"><div class="list-title">'+esc(r.action||'')+'</div><div class="list-meta">'+esc(r.admin_email||'')+' · '+esc(r.created_at||'')+'</div><div class="list-meta">'+esc(r.detail||'')+'</div></div>';
      list.appendChild(c);
    });
  }).catch(function(e){
    $('logsList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}

function load(){
  api('/api/cms').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('list').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    items=d.items||[];
    renderList();
  }).catch(function(e){
    $('list').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}

function applyFilter(){
  var s=$('fStudio').value,p=$('fPlan').value,t=$('fType').value.trim();
  return items.filter(function(it){
    if(s&&it.studio!==s)return false;
    if(p&&it.plan!==p)return false;
    if(t&&it.type!==t)return false;
    return true;
  });
}

function renderList(){
  var list=$('list');list.innerHTML='';
  var rows=applyFilter();
  if(rows.length===0){list.innerHTML='<div class="card">(no rows yet — tap + Add New)</div>';return;}
  rows.forEach(function(it){
    var c=document.createElement('div');
    c.className='card';
    c.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'+
      '<div><b>'+esc(studioLabel(it.studio))+'</b> <span class="badge '+(it.plan==='PRO'?'pro':'free')+'">'+esc(it.plan)+'</span> · Sub-Type '+esc(it.type)+'</div>'+
      '<span><button class="btn sm" onclick="copyRow('+it.id+')">📋</button> <button class="btn sm" onclick="addEdit('+it.id+')">✏️</button> <button class="btn sm red" onclick="del('+it.id+')">🗑️</button></span></div>'+
      '<div style="font-size:12px;color:#6B7280;margin-top:6px;"><b>core:</b> '+esc((it.core||'').slice(0,80))+'</div>'+
      '<div style="font-size:12px;color:#6B7280;margin-top:2px;"><b>prompt:</b> '+esc((it.prompt||'').slice(0,80))+'</div>';
    list.appendChild(c);
  });
}

function addEdit(id){
  editingId=id;
  var it=null;
  if(id){it=items.filter(function(x){return x.id==id;})[0];}
  $('formTitle').textContent=it?('Edit — '+studioLabel(it.studio)+' / '+it.plan+' / '+it.type):'+ Add New';
  $('iStudio').value=it?it.studio:'STORY';
  $('iPlan').value=it?it.plan:'FREE';
  $('iType').value=it?it.type:'1';
  FIELDS.forEach(function(f){$('i'+f.charAt(0).toUpperCase()+f.slice(1)).value=it?(it[f]||''):'';});
  $('formWrap').classList.remove('hidden');
  window.scrollTo(0,0);
}

function copyRow(id){
  var it=items.filter(function(x){return x.id==id;})[0];
  if(!it)return;
  addEdit(null);
  $('formTitle').textContent='Copy — '+studioLabel(it.studio)+' / '+it.plan+' / '+it.type;
  $('iStudio').value=it.studio||'STORY';
  $('iPlan').value=it.plan||'FREE';
  $('iType').value=it.type||'1';
  FIELDS.forEach(function(f){$('i'+f.charAt(0).toUpperCase()+f.slice(1)).value=it[f]||'';});
}

function closeForm(){$('formWrap').classList.add('hidden');}

function save(){
  var data={studio:$('iStudio').value,plan:$('iPlan').value,type:$('iType').value};
  FIELDS.forEach(function(f){data[f]=$('i'+f.charAt(0).toUpperCase()+f.slice(1)).value;});
  var url='/api/cms'+(editingId?'/'+editingId:'');
  api(url,editingId?'PUT':'POST',data).then(function(d){
    if(d.ok){closeForm();load();}
    else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

function del(id){
  if(!confirm('Delete this row?'))return;
  api('/api/cms/'+id,'DELETE').then(function(d){
    if(d.ok){load();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

// ===== Brain CMS (11-Layer — additive) =====
var brainItems=[];var brainEditId=null;
function loadBrain(){
  api('/api/brain').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('brainList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    brainItems=d.items||[];renderBrain();
  }).catch(function(e){
    $('brainList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}
function brainFilter(){
  var s=$('bScopeF').value,m=$('bModuleF').value,t=$('bTypeF').value.trim();
  return brainItems.filter(function(it){
    if(s&&it.scope!==s)return false;
    if(m&&it.module!==m)return false;
    if(t&&it.type!==t)return false;
    return true;
  });
}
function renderBrain(){
  var list=$('brainList');list.innerHTML='';
  var rows=brainFilter();
  if(rows.length===0){list.innerHTML='<div class="card">(no brain rows yet — အပေါ်မှ Add / Edit လုပ်ပါ)</div>';return;}
  rows.forEach(function(it){
    var c=document.createElement('div');c.className='card';
    c.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'+
      '<div><b>'+esc(it.scope)+'</b> / <b>'+esc(it.module)+'</b> / <b>'+esc(it.type)+'</b> · <span class="badge '+(it.plan==='PRO'?'pro':'free')+'">'+esc(it.plan)+'</span> · key <code>'+esc(it.key)+'</code> · v'+esc(it.version)+' · '+((it.active===0)?'<span class="badge free">inactive</span>':'<span class="badge pro">active</span>')+'</div>'+
      '<span><button class="btn sm" onclick="editBrain('+it.id+')">✏️</button> <button class="btn sm red" onclick="delBrain('+it.id+')">🗑️</button></span></div>'+
      '<div style="font-size:12px;color:#6B7280;margin-top:6px;white-space:pre-wrap;">'+esc((it.value||'').slice(0,160))+'</div>';
    list.appendChild(c);
  });
}
function editBrain(id){
  var it=brainItems.filter(function(x){return x.id==id;})[0];if(!it)return;
  brainEditId=id;
  $('bScope').value=it.scope||'STORY_TYPES';$('bModule').value=it.module||'STORY_TYPE';$('bType').value=it.type||'BASE';
  $('bPlan').value=it.plan||'FREE';$('bKey').value=it.key||'knowledge';$('bVersion').value=it.version||1;$('bValue').value=it.value||'';
  $('brainMsg').textContent='Editing #'+id;
}
function brainReset(){
  brainEditId=null;
  $('bScope').value='STORY_TYPES';$('bModule').value='STORY_TYPE';$('bType').value='TYPE_1';
  $('bPlan').value='FREE';$('bKey').value='knowledge';$('bVersion').value=1;$('bValue').value='';
  $('brainMsg').textContent='';
}
function saveBrain(){
  var data={scope:$('bScope').value,module:$('bModule').value,type:$('bType').value.trim()||'BASE',plan:$('bPlan').value,key:$('bKey').value.trim(),value:$('bValue').value,version:parseInt($('bVersion').value,10)||1};
  if(!data.scope||!data.module||!data.key){$('brainMsg').textContent='Error: scope/module/key required';return;}
  var url='/api/brain'+(brainEditId?'/'+brainEditId:'');
  api(url,brainEditId?'PUT':'POST',data).then(function(d){
    if(d.ok){$('brainMsg').textContent='Saved ✓';brainReset();loadBrain();}
    else{$('brainMsg').textContent='ERROR: '+(d.detail||d.error||'unknown');}
  }).catch(function(e){$('brainMsg').textContent='Network error: '+(e&&e.message||e);});
}
function delBrain(id){
  if(!confirm('Delete this brain row?'))return;
  api('/api/brain/'+id,'DELETE').then(function(d){
    if(d.ok){loadBrain();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

function loadUsers(){
  api('/api/admin/users').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('usersList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    users=d.items||[];
    renderUsers();
  }).catch(function(e){
    $('usersList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}

// ===== Studios Control (Phase 4 — Admin က Studio ON/OFF ပြုလုပ်နိုင်) =====
function loadStudios(){
  api('/api/admin/studios').then(function(d){
    if(d.error==='forbidden'){location.href='/app';return;}
    if(d.error){$('studiosList').innerHTML='<div class="card"><span class="err">'+(d.detail||d.error)+'</span></div>';return;}
    var list=$('studiosList');list.innerHTML='';
    (d.items||[]).forEach(function(s){
      var c=document.createElement('div');
      c.className='card';
      c.innerHTML='<div class="user-row"><div><b>'+esc(s.nameMy)+'</b> <span style="font-size:11px;color:#6B7280;">('+esc(s.name)+')</span>'+
        '<div class="user-meta">'+(s.enabled?'<span class="badge pro">ON</span>':'<span class="badge free">OFF</span>')+'</div></div>'+
        '<button class="btn sm '+(s.enabled?'red':'green')+'" data-on="'+(s.enabled?'1':'0')+'" onclick="toggleStudio(\\''+esc(s.id)+'\\',this)">'+(s.enabled?'⏻ ပိတ်မည်':'⏻ ဖွင့်မည်')+'</button></div>';
      list.appendChild(c);
    });
  }).catch(function(e){
    $('studiosList').innerHTML='<div class="card"><span class="err">Network error: '+esc(String(e&&e.message||e))+'</span></div>';
  });
}
function toggleStudio(id,btn){
  var next=!(btn.getAttribute('data-on')==='1');
  btn.disabled=true;
  api('/api/admin/studios/'+id,'PUT',{enabled:next}).then(function(d){
    if(d.error){alert('ERROR: '+(d.detail||d.error||'unknown'));btn.disabled=false;return;}
    loadStudios();
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));btn.disabled=false;});
}

function renderUsers(){
  var list=$('usersList');list.innerHTML='';
  if(users.length===0){list.innerHTML='<div class="empty">No users yet</div>';return;}
  users.forEach(function(u){
    var isPro=(u.plan==='PRO');
    var c=document.createElement('div');
    c.className='card';
    var btnLabel=isPro?'→ FREE':'→ PRO';
    var btnClass=isPro?'gray':'green';
    var newPlan=isPro?'FREE':'PRO';
    c.innerHTML='<div class="user-row">'+
      '<div><b>'+esc(u.email)+'</b> '+
      '<span class="badge '+(isPro?'pro':'free')+'">'+esc(u.plan||'FREE')+'</span></div>'+
      '<button class="btn sm '+btnClass+'" data-id="'+u.id+'" data-plan="'+newPlan+'">'+btnLabel+'</button></div>'+
      '<div class="user-meta">ID: '+u.id+' · created: '+esc(u.created_at||'-')+(u.expiry?' · expiry: '+esc(u.expiry):'')+'</div>';
    list.appendChild(c);
  });
  var btns=list.querySelectorAll('button[data-id]');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(){
      togglePlan(this.getAttribute('data-id'),this.getAttribute('data-plan'));
    });
  }
}

function togglePlan(id,plan){
  var label=plan==='PRO'?'Set PRO?':'Set FREE?';
  if(!confirm(label))return;
  api('/api/admin/users/'+id,'PUT',{plan:plan}).then(function(d){
    if(d.ok){loadUsers();}else{alert('ERROR: '+(d.detail||d.error||'unknown'));}
  }).catch(function(e){alert('Network error: '+(e&&e.message||e));});
}

function tokenFromHash(){
  var h=location.hash||'';
  if(h.indexOf('#token=')===0){
    try{localStorage.setItem(TOKEN_KEY,decodeURIComponent(h.slice(7)));}catch(e){}
    try{token=localStorage.getItem(TOKEN_KEY)||'';}catch(e){}
    history.replaceState(null,'',location.pathname);
  }
}

function init(){
  try{
    tokenFromHash();
    if(!token){
      $('loading').innerHTML='🔄 Redirecting to Google login...';
      setTimeout(login,300);
      return;
    }
    $('loading').innerHTML='🔍 Checking login...';
    api('/api/users/me').then(function(d){
      if(!d||!d.email){
        $('loading').innerHTML='🔄 Login expired — redirecting...';
        setTimeout(login,500);
        return;
      }
      $('userBox').textContent=d.email+' · '+d.plan;
      fillStudios();
      showApp();
      switchTab('dashboard');
    }).catch(function(e){
      showError('Login failed: '+String(e&&e.message||e));
    });
  }catch(e){
    showError('Init error: '+String(e&&e.message||e));
  }
}
init();
</script>
</body>
</html>`;

export async function adminApi(request, path, env, verifyToken) {
  const isCms = (path === '/api/cms' || path.indexOf('/api/cms/') === 0);
  const isUsers = (path === '/api/admin/users' || path.indexOf('/api/admin/users/') === 0);
  const isStudios = (path === '/api/admin/studios' || path.indexOf('/api/admin/studios/') === 0);
  const isFeatures = (path === '/api/admin/features' || path.indexOf('/api/admin/features/') === 0);
  const isModels = (path === '/api/admin/models' || path.indexOf('/api/admin/models/') === 0);
  const isDashboard = (path === '/api/admin/dashboard');
  const isUsage = (path === '/api/admin/usage');
  const isLogs = (path === '/api/admin/logs');
  const isBrain = (path === '/api/brain' || path.indexOf('/api/brain/') === 0);
  if (!isCms && !isUsers && !isStudios && !isFeatures && !isModels && !isDashboard && !isUsage && !isLogs && !isBrain) return null;

  const method = request.method;
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  // Phase 11 — Admin Panel Page မှ Fetch များတွင် Cookie Session ကိုပါ လက်ခံသည် (Header ဦးစားပေး)
  if (!token) {
    const c = request.headers.get('Cookie') || '';
    const m = c.match(/(?:^|;\s*)aics_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return json({ error: 'unauthorized', detail: 'login required' }, 401);
  const user = await verifyToken(env, token);
  if (!user || !user.email) return json({ error: 'unauthorized', detail: 'login required' }, 401);
  const adminEmail = env.ADMIN_EMAIL || 'saialin808@gmail.com';
  if (String(user.email).toLowerCase() !== String(adminEmail).toLowerCase()) {
    return json({ error: 'forbidden', detail: 'admin only' }, 403);
  }

  const COLS = ['studio','plan','type','core','memory','knowledge','workflow','template','prompt','quality_check','final_output'];

  if (path === '/api/cms' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM cms_prompts ORDER BY studio, plan, type').all();
    return json({ ok: true, items: results });
  }

  if (path === '/api/cms' && method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.studio || !body.plan || !body.type) return json({ error: 'missing_fields', detail: 'studio, plan, type required' }, 400);
    const vals = COLS.map(c => (body[c] === undefined || body[c] === null) ? '' : String(body[c]));
    vals[0] = vals[0].toUpperCase();
    vals[1] = vals[1].toUpperCase();
    try {
      await env.DB.prepare('INSERT OR REPLACE INTO cms_prompts (studio,plan,type,core,memory,knowledge,workflow,template,prompt,quality_check,final_output,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))').bind(...vals).run();
      await logAdminAction(env, user.email, 'cms_create', vals[0] + '/' + vals[1] + '/' + vals[2]);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/cms/') === 0) {
    const id = decodeURIComponent(path.slice('/api/cms/'.length));
    if (method === 'PUT') {
      const body = await readBody(request);
      const sets = COLS.map(c => c + '=?').join(',');
      const vals = COLS.map(c => (body && body[c] !== undefined && body[c] !== null) ? String(body[c]) : '');
      vals[0] = vals[0].toUpperCase();
      vals[1] = vals[1].toUpperCase();
      try {
        await env.DB.prepare('UPDATE cms_prompts SET ' + sets + ', updated_at=datetime(\'now\') WHERE id=?').bind(...vals, id).run();
        await logAdminAction(env, user.email, 'cms_update', 'id=' + id + ' ' + vals[0] + '/' + vals[1] + '/' + vals[2]);
        return json({ ok: true });
      } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM cms_prompts WHERE id=?').bind(id).run();
      await logAdminAction(env, user.email, 'cms_delete', 'id=' + id);
      return json({ ok: true });
    }
  }

  // ===== Brain CMS (11-Layer — additive; cms_prompts ကို မထိ) =====
  if (path === '/api/brain' && method === 'GET') {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM cms_brain ORDER BY scope, module, type, key').all();
      return json({ ok: true, items: results });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }
  if (path === '/api/brain' && method === 'POST') {
    const body = await readBody(request);
    if (!body || !body.scope || !body.module || !body.key) return json({ error: 'missing_fields', detail: 'scope, module, key required' }, 400);
    const scope = String(body.scope).toUpperCase();
    const module = String(body.module).toUpperCase();
    const type = String(body.type || 'BASE').toUpperCase();
    const plan = String(body.plan || 'FREE').toUpperCase();
    const key = String(body.key).trim();
    const val = (body.value === undefined || body.value === null) ? '' : String(body.value);
    const version = parseInt(body.version, 10) > 0 ? parseInt(body.version, 10) : 1;
    try {
      await env.DB.prepare(
        'INSERT INTO cms_brain (scope,module,type,plan,key,value,active,version,updated_at) VALUES (?,?,?,?,?,?,1,?,datetime(\'now\')) ' +
        'ON CONFLICT(scope,module,type,plan,key) DO UPDATE SET value=excluded.value, active=1, version=excluded.version, updated_at=excluded.updated_at'
      ).bind(scope, module, type, plan, key, val, version).run();
      await logAdminAction(env, user.email, 'brain_create', scope + '/' + module + '/' + type + '/' + key);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }
  if (path.indexOf('/api/brain/') === 0) {
    const id = decodeURIComponent(path.slice('/api/brain/'.length));
    if (method === 'PUT') {
      const body = await readBody(request);
      if (!body || !body.scope || !body.module || !body.key) return json({ error: 'missing_fields', detail: 'scope, module, key required' }, 400);
      try {
        await env.DB.prepare(
          'UPDATE cms_brain SET scope=?, module=?, type=?, plan=?, key=?, value=?, version=?, updated_at=datetime(\'now\') WHERE id=?'
        ).bind(
          String(body.scope).toUpperCase(), String(body.module).toUpperCase(), String(body.type || 'BASE').toUpperCase(),
          String(body.plan || 'FREE').toUpperCase(), String(body.key).trim(),
          (body.value === undefined || body.value === null) ? '' : String(body.value),
          parseInt(body.version, 10) > 0 ? parseInt(body.version, 10) : 1,
          id
        ).run();
        await logAdminAction(env, user.email, 'brain_update', 'id=' + id);
        return json({ ok: true });
      } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM cms_brain WHERE id=?').bind(id).run();
      await logAdminAction(env, user.email, 'brain_delete', 'id=' + id);
      return json({ ok: true });
    }
  }

  if (path === '/api/admin/users' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, email, plan, expiry, created_at FROM users ORDER BY created_at DESC').all();
    return json({ ok: true, items: results });
  }

  if (path.indexOf('/api/admin/users/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/users/'.length));
    const body = await readBody(request);
    const plan = (body && body.plan === 'PRO') ? 'PRO' : 'FREE';
    const expiry = (body && body.expiry) ? String(body.expiry) : null;
    try {
      await env.DB.prepare('UPDATE users SET plan=?, expiry=?, updated_at=datetime(\'now\') WHERE id=?').bind(plan, expiry, id).run();
      await logAdminAction(env, user.email, 'user_plan', 'user_id=' + id + ' → ' + plan);
      return json({ ok: true });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Studios Control (Phase 4 — Admin က Code မပြင်ဘဲ ON/OFF ပြုလုပ်နိုင်) =====
  if (path === '/api/admin/studios' && method === 'GET') {
    try {
      const settings = await getStudioSettings(env);
      const items = Object.keys(STUDIO_REGISTRY).map((id) => ({
        id,
        name: STUDIO_REGISTRY[id].name,
        nameMy: STUDIO_REGISTRY[id].nameMy,
        enabled: settings[id] !== false,
      }));
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/admin/studios/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/studios/'.length));
    const body = await readBody(request);
    try {
      const r = await setStudioEnabled(env, id, !!(body && body.enabled));
      await logAdminAction(env, user.email, 'studio_toggle', r.id + ' → ' + (r.enabled ? 'ON' : 'OFF'));
      return json({ ok: true, id: r.id, enabled: r.enabled });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Features (Free/Pro Config — Rule 15) =====
  if (path === '/api/admin/features' && method === 'GET') {
    try {
      const settings = await getFeatureSettings(env);
      const items = Object.keys(FEATURE_REGISTRY).map((id) => ({
        id,
        name: FEATURE_REGISTRY[id].name,
        nameMy: FEATURE_REGISTRY[id].nameMy,
        desc: FEATURE_REGISTRY[id].desc || '',
        enabled: settings[id].enabled,
        access: settings[id].access,
        limit_value: settings[id].limit_value,
      }));
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path.indexOf('/api/admin/features/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/features/'.length));
    const body = await readBody(request);
    try {
      const r = await setFeatureSetting(env, id, body || {});
      await logAdminAction(env, user.email, 'feature_update', r.id + ' → enabled=' + r.enabled + ', access=' + r.access + ', limit=' + r.limit_value);
      return json({ ok: true, id: r.id, enabled: r.enabled, access: r.access, limit_value: r.limit_value });
    } catch (e) { return json({ error: 'unknown_feature', detail: String(e && e.message || e) }, 400); }
  }

  // ===== Phase C — AI Models (List / Add / Update / Delete) =====
  if (path === '/api/admin/models' && method === 'GET') {
    try {
      const items = await getAiModels(env);
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  if (path === '/api/admin/models' && method === 'POST') {
    const body = await readBody(request);
    try {
      const r = await setAiModel(env, body || {});
      await logAdminAction(env, user.email, 'model_create', r.id + ' [' + r.category + ']');
      return json({ ok: true, ...r });
    } catch (e) { return json({ error: String(e && e.message || e) === 'last_model' ? 'last_model' : 'model_error', detail: String(e && e.message || e) }, 400); }
  }

  if (path.indexOf('/api/admin/models/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(path.slice('/api/admin/models/'.length));
    const body = await readBody(request);
    try {
      const r = await setAiModel(env, Object.assign({ id }, body || {}));
      await logAdminAction(env, user.email, 'model_update', r.id + ' → enabled=' + r.enabled + ', plan=' + r.plan_access + ', default=' + r.is_default);
      return json({ ok: true, ...r });
    } catch (e) { return json({ error: String(e && e.message || e) === 'last_model' ? 'last_model' : 'model_error', detail: String(e && e.message || e) }, 400); }
  }

  if (path.indexOf('/api/admin/models/') === 0 && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('/api/admin/models/'.length));
    try {
      const r = await deleteAiModel(env, id);
      if (r.ok) {
        await logAdminAction(env, user.email, 'model_delete', id);
        return json({ ok: true });
      }
      return json({ error: 'not_found', detail: 'Model မတွေ့ပါ' }, 404);
    } catch (e) { return json({ error: 'last_model', detail: String(e && e.message || e) }, 400); }
  }

  // ===== Phase 5 — Dashboard Statistics =====
  if (path === '/api/admin/dashboard' && method === 'GET') {
    try {
      const users = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
      const pro = await env.DB.prepare("SELECT COUNT(*) AS c FROM users WHERE plan='PRO'").first();
      // Phase 13 (Option 2): Creations ကို Browser IndexedDB တွင်သာ သိမ်းသည် — Dashboard တွင် မရေတွက်တော့ပါ
      const projects = await env.DB.prepare('SELECT COUNT(*) AS c FROM projects').first();
      const aiToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='ai' AND date(created_at)=date('now')").first();
      const voiceToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='voice' AND date(created_at)=date('now')").first();
      const imageToday = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM usage WHERE category='image' AND date(created_at)=date('now')").first();
      const recent = await env.DB.prepare('SELECT email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
      return json({
        ok: true,
        stats: {
          users: (users && users.c) || 0,
          pro: (pro && pro.c) || 0,
          projects: (projects && projects.c) || 0,
          ai_today: (aiToday && aiToday.s) || 0,
          voice_today: (voiceToday && voiceToday.s) || 0,
          image_today: (imageToday && imageToday.s) || 0,
        },
        recent: (recent && recent.results) || [],
      });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Usage Statistics =====
  if (path === '/api/admin/usage' && method === 'GET') {
    try {
      const daily = await env.DB.prepare("SELECT date(created_at) AS day, category, SUM(amount) AS total FROM usage GROUP BY day, category ORDER BY day DESC LIMIT 28").all();
      const byUser = await env.DB.prepare("SELECT u.email, COUNT(*) AS calls, SUM(us.amount) AS total FROM usage us JOIN users u ON u.id=us.user_id GROUP BY us.user_id ORDER BY total DESC LIMIT 10").all();
      return json({ ok: true, daily: (daily && daily.results) || [], byUser: (byUser && byUser.results) || [] });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  // ===== Phase 5 — Admin Logs (Audit) =====
  if (path === '/api/admin/logs' && method === 'GET') {
    try {
      const items = await listAdminLogs(env, 100);
      return json({ ok: true, items });
    } catch (e) { return json({ error: 'db_error', detail: String(e && e.message || e) }, 500); }
  }

  return null;
}

async function readBody(request) { try { return await request.json(); } catch (e) { return null; } }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
