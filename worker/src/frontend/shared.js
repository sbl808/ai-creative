// ============================================================
// AI CREATIVE STUDIO — SHARED SIDEBAR COMPONENT (Phase 2 — App Shell)
// ------------------------------------------------------------
// Sidebar HTML + Sidebar Script များကို ဤနေရာတစ်ခုတည်းတွင် ထားပါသည်။
// စာမျက်နှာတိုင်းသည် renderSidebar() နှင့် sidebarScript() ကိုသာ ခေါ်ယူပါမည်။
// Studio စာရင်းကို config/studios.js (STUDIO_REGISTRY) မှ အလိုအလျောက် ယူပါသည်။
// ============================================================

import { listEnabledStudios, SITE_LINKS } from '../config/studios.js';

// ---- Sidebar အတွင်း Studio Link များ (Registry မှ ထုတ်သည်) ----
// data-studio attribute — Admin မှ Studio ပိတ်ထားပါက Script က ဤ Link ကို ဖျောက်သည် (Phase 4)
function studioLinks(activeId) {
  return listEnabledStudios()
    .map(function (s) {
      const act = s.id === activeId ? ' active' : '';
      return (
        '<a class="nav-item' + act + '" href="' + s.route + '" data-studio="' + s.id + '">' +
        '<span class="nav-icon-circle">' + s.icon + '</span> ' + s.nameMy + '</a>'
      );
    })
    .join('\n  ');
}

// ---- MY WORK / SETTINGS လင့်ခ်များ (Phase 3 — Favorites + Settings) ----
// activeId: 'creations' | 'favorites' | 'settings' — ရောက်နေသော နေရာကို Active ပြသည် (Phase 9 fix)
function myWorkLinks(activeId) {
  const creActive = activeId === 'creations' ? ' active' : '';
  const favActive = activeId === 'favorites' ? ' active' : '';
  const setActive = activeId === 'settings' ? ' active' : '';
  return (
    '<a class="nav-item' + creActive + '" href="/app/creations"><span class="nav-icon-circle">📁</span> ဖန်တီးမှုများ</a>\n' +
    '  <a class="nav-item' + favActive + '" href="/app/creations?fav=1"><span class="nav-icon-circle">⭐</span> အနှစ်သက်ဆုံး</a>'
  );
}

// ---- App Shell Sidebar (Home / Creations ပုံစံ — Hamburger + Backdrop + Brand) ----
function appShellSidebar(activeId) {
  const homeActive = activeId === 'home' ? ' active' : '';
  return (
    '<div class="backdrop" id="backdrop" onclick="toggleSidebar()"></div>\n' +
    '<nav class="sidebar" id="sidebar">\n' +
    '  <div class="sidebar-nav">\n' +
    '  <a class="nav-item' + homeActive + '" href="/app"><span class="nav-icon-circle">🏠</span> ပင်မ</a>\n' +
    '  <div class="nav-label">STUDIOS</div>\n' +
    '  ' + studioLinks(activeId) + '\n' +
    '  <div class="nav-label">MY WORK</div>\n' +
    '  ' + myWorkLinks(activeId) + '\n' +
    '  </div>\n' +
    '  <div class="sidebar-bottom">\n' +
    '    <div class="nav-label">SETTINGS</div>\n' +
    '    <a class="side-btn' + (activeId === 'settings' ? ' active' : '') + '" href="/app/settings">🛠️ ဆက်တင်များ</a>\n' +
    '    <button class="side-btn" onclick="setApiKey()">🔑 API Key Setting</button>\n' +
    '    <a class="side-btn" id="adminLink" href="/admin" style="display:none;">⚙️ Admin Panel</a>\n' +
    '    <a class="side-btn" id="tgLink" href="' + SITE_LINKS.telegram + '" target="_blank">📨 Telegram</a>\n' +
    '    <a class="side-btn" id="fbLink" href="' + SITE_LINKS.facebook + '" target="_blank">📘 Facebook</a>\n' +
    '    <button class="side-btn" onclick="logout()">🚪 Logout</button>\n' +
    '  </div>\n' +
    '</nav>'
  );
}

// ---- Studio Page Sidebar (Studio မျက်နှာများ ပုံစံ — Header ထဲက Menu Button နှင့် တွဲသည်) ----
// (Phase 4 တွင် Studio ၆ ခု၏ UI Shell ကို ဤပုံစံဖြင့် တစ်ညီတည်း ဖြစ်အောင် ပြုလုပ်ပါမည်)
function studioPageSidebar(activeId) {
  const homeActive = activeId === 'home' ? ' active' : '';
  const creActive = activeId === 'creations' ? ' active' : '';
  const favActive = activeId === 'favorites' ? ' active' : '';
  return (
    '<div class="backdrop" id="backdrop" onclick="toggleSidebar()"></div>\n' +
    '<div class="sidebar" id="sidebar" style="display:flex;flex-direction:column;">\n' +
    '  <div class="sidebar-nav">\n' +
    '  <a class="nav-item' + homeActive + '" href="/app"><span class="nav-icon-circle">🏠</span> ပင်မ</a>\n' +
    '  <div class="nav-label">STUDIOS</div>\n' +
    '  ' + studioLinks(activeId) + '\n' +
    '  <div class="nav-label">MY WORK</div>\n' +
    '  <a class="nav-item' + creActive + '" href="/app/creations"><span class="nav-icon-circle">📁</span> ဖန်တီးမှုများ</a>\n' +
    '  <a class="nav-item' + favActive + '" href="/app/creations?fav=1"><span class="nav-icon-circle">⭐</span> အနှစ်သက်ဆုံး</a>\n' +
    '  </div>\n' +
    '  <div class="sidebar-bottom">\n' +
    '  <a class="side-btn' + (activeId === 'settings' ? ' active' : '') + '" href="/app/settings">🛠️ ဆက်တင်များ</a>\n' +
    '  <a class="side-btn" onclick="setApiKey()">🔑 API Key Setting</a>\n' +
    '  <a class="side-btn" id="tgLink" href="' + SITE_LINKS.telegram + '" target="_blank">📨 Telegram</a>\n' +
    '  <a class="side-btn" id="fbLink" href="' + SITE_LINKS.facebook + '" target="_blank">📘 Facebook</a>\n' +
    '  <a class="side-btn" id="adminLink" href="/admin" style="display:none;">⚙️ Admin Panel</a>\n' +
    '  <a class="side-btn" onclick="logout()">🚪 Logout</a>\n' +
    '  </div>\n' +
    '</div>'
  );
}

// ---- Sidebar HTML Renderer ----
// activeId: 'home' | 'creations' | 'favorites' | 'settings' | studioId (ဥပမာ 'story')
// opts.variant: 'app' (Home/Creations) | 'studio' (Studio မျက်နှာများ)
export function renderSidebar(activeId, opts) {
  opts = opts || {};
  return responsiveStyles() + (opts.variant === 'studio' ? studioPageSidebar(activeId) : appShellSidebar(activeId));
}

// ---- Shared Responsive CSS (Phase 6 — Rule 7) ----
// Desktop ≥1200px / iPad 769–1199px (Compact Sidebar) / Phone ≤768px (Topbar + Drawer Sidebar + Touch)
// စာမျက်နှာတိုင်း ဤ Style ကို ရရှိသောကြောင့် Responsive ကို နေရာတစ်ခုတည်းမှ ထိန်းချုပ်သည်
function responsiveStyles() {
  return '<style>\n' +
    '/* ===== AI Creative Studio — SINGLE RESPONSIVE SHELL ===== */\n' +
    'html,body{margin:0;padding:0;min-height:100%;}\n' +
    'body{overflow-x:hidden;}\n' +
    '.aics-app{min-height:100vh;background:#080c18;}\n' +
    '.aics-app .layout{display:flex;align-items:stretch;min-height:calc(100vh - 63px);width:100%;}\n' +
    '.aics-app .layout > .sidebar{width:220px;flex:0 0 220px;background:#0d1425;border:1px solid rgba(0,229,255,.10);border-radius:16px;margin:14px 12px;padding:14px 12px;box-sizing:border-box;height:calc(100vh - 91px);position:sticky;top:77px;z-index:90;overflow:hidden;}\n' +
    '.aics-app .layout > .sidebar .sidebar-nav{width:100%;box-sizing:border-box;}\n' +
    '.aics-app .nav-label{font-size:11px;color:#5a6478;letter-spacing:1.5px;margin:16px 0 6px 8px;text-transform:uppercase;}\n' +
    '.aics-app .nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;box-sizing:border-box;border-radius:10px;color:#c6cede;text-decoration:none;cursor:pointer;font-size:13.5px;margin-bottom:2px;border:1px solid transparent;transition:all .2s;line-height:1.35;}\n' +
    '.aics-app .nav-item:hover{background:#161d30;color:#fff;}\n' +
    '.aics-app .nav-item.active{background:linear-gradient(90deg,rgba(123,92,255,.18),rgba(0,229,255,.08));color:#fff;border-color:#7b5cff;box-shadow:0 0 14px rgba(123,92,255,.22);}\n' +
    '.aics-app .nav-icon-circle{width:30px;height:30px;min-width:30px;border-radius:9px;background:#1a2138;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}\n' +
    '.aics-app .sidebar-nav{flex:1 1 auto;overflow-y:auto;min-height:0;}\n' +
    '.aics-app .sidebar-bottom{flex-shrink:0;margin-top:16px;padding-top:14px;border-top:1px solid rgba(0,229,255,.15);width:100%;box-sizing:border-box;}\n' +
    '.aics-app .side-btn{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;text-align:left;padding:8px 10px;min-height:38px;border-radius:10px;background:#161d30;color:#c6cede;border:1px solid rgba(0,229,255,.12);font-size:12.5px;cursor:pointer;margin-bottom:5px;text-decoration:none;transition:all .2s;font-family:inherit;}\n' +
    '.aics-app .side-btn:hover{background:#1e2740;border-color:#00e5ff;color:#fff;}\n' +
    '.aics-app .aics-main{flex:1 1 auto;min-width:0;max-width:none;margin:0;padding:20px 24px;box-sizing:border-box;}\n' +
    '.aics-app .main-content{flex:1 1 auto;min-width:0;max-width:none;margin:0;padding:20px 24px;box-sizing:border-box;}\n' +
    '.aics-app .backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:298;}\n' +
    '.aics-app .backdrop.show{display:block;}\n' +
    '.aics-menu-btn,.hamburger,.menu-btn{display:none;position:fixed;top:14px;left:14px;z-index:300;width:44px;height:44px;border-radius:10px;background:#151b2b;border:1px solid #2a3350;color:#fff;font-size:20px;cursor:pointer;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.45);padding:0;line-height:1;}\n' +
    '.aics-app .aics-header{display:flex;align-items:center;gap:14px;padding:10px 20px;min-height:63px;background:linear-gradient(135deg,#0a1628,#0d1f3c);border-bottom:1px solid rgba(0,229,255,.12);position:sticky;top:0;z-index:150;width:100%;box-sizing:border-box;}\n' +
    '.aics-app .aics-brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}\n' +
    '.aics-app .aics-title{font-size:17px;font-weight:800;letter-spacing:.3px;background:linear-gradient(90deg,#00e5ff,#7b5cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
    '.aics-app .aics-brand-icon{font-size:20px;flex-shrink:0;}\n' +
    '.aics-app .aics-pro{padding:6px 16px;border-radius:999px;background:linear-gradient(135deg,#7b5cff,#00e5ff);color:#fff;font-size:12px;font-weight:700;letter-spacing:.5px;flex-shrink:0;box-shadow:0 2px 12px rgba(123,92,255,.35);}\n' +
    '.aics-app .quick-grid,.aics-app .recent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}\n' +
    '@media (min-width:768px) and (max-width:1199px){\n' +
    '  .aics-app .layout > .sidebar{width:210px;flex-basis:210px;margin:12px 10px;padding:12px 10px;top:75px;height:calc(100vh - 87px);}\n' +
    '  .aics-app .aics-main,.aics-app .main-content{padding:18px 18px;}\n' +
    '  .aics-app .quick-grid,.aics-app .recent-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}\n' +
    '}\n' +
    '@media (max-width:767px){\n' +
    '  .aics-app .aics-header{min-height:57px;padding:8px 12px 8px 64px;gap:10px;}\n' +
    '  .aics-menu-btn,.hamburger,.menu-btn{display:flex;top:14px;left:14px;}\n' +
    '  .aics-app .aics-title{font-size:15px;}\n' +
    '  .aics-app .aics-brand-icon{font-size:17px;}\n' +
    '  .aics-app .aics-pro{padding:5px 12px;font-size:11px;}\n' +
    '  .aics-app .layout{display:block;min-height:calc(100vh - 57px);}\n' +
    '  .aics-app .layout > .sidebar{position:fixed;left:-280px;top:57px;bottom:0;width:256px;max-width:82vw;height:auto;min-height:0;margin:0;padding:16px 14px;z-index:299;border-radius:0 16px 16px 0;transition:left .25s ease;overflow:hidden;}\n' +
    '  .aics-app .layout > .sidebar.open{left:0;}\n' +
    '  .aics-app .aics-main,.aics-app .main-content{width:100%;max-width:none;margin:0;padding:14px;}\n' +
    '  .aics-app .quick-grid,.aics-app .recent-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}\n' +
    '}\n' +
    '</style>';
}

// ---- Shared Sidebar Script (Browser တွင် လုပ်ဆောင်သည်) ----
// toggleSidebar / logout / setApiKey / User Info Hydration / Admin Link
// ကိုယ်ပိုင် Token ဖတ်သောကြောင့် Page Script နှင့် အစဉ်လိုက် မမှီခိုပါ။
export function sidebarScript() {
  return '<script>\n' +
    '// ===== AI Creative Studio — Client-side Creations Store (Phase 13 — Option 2) =====\n' +
    '// User ဖန်တီးမှုအားလုံးကို Browser IndexedDB တွင် သိမ်းသည်။ Server/D1 သို့ မပို့ပါ။\n' +
    'function __aicsDbOpen() {\n' +
    '  return new Promise(function (resolve, reject) {\n' +
    '    if (window.__aicsDb) return resolve(window.__aicsDb);\n' +
    '    if (!window.indexedDB) { reject(new Error(\'no_indexeddb\')); return; }\n' +
    '    var req = indexedDB.open(\'aics_creations_v1\', 1);\n' +
    '    req.onupgradeneeded = function () {\n' +
    '      var db = req.result;\n' +
    '      if (!db.objectStoreNames.contains(\'creations\')) {\n' +
    '        var s = db.createObjectStore(\'creations\', { keyPath: \'id\' });\n' +
    '        s.createIndex(\'user_id\', \'user_id\', { unique: false });\n' +
    '      }\n' +
    '    };\n' +
    '    req.onsuccess = function () { window.__aicsDb = req.result; resolve(req.result); };\n' +
    '    req.onerror = function () { reject(req.error); };\n' +
    '  });\n' +
    '}\n' +
    'function __aicsUserId() {\n' +
    '  var t = \'\';\n' +
    '  try { t = localStorage.getItem(\'aics_token\') || \'\'; } catch (e) {}\n' +
    '  if (!t) return \'\';\n' +
    '  try {\n' +
    '    var part = t.split(\'.\')[1] || \'\';\n' +
    '    part = part.replace(/-/g, \'+\').replace(/_/g, \'/\');\n' +
    '    while (part.length % 4) part += \'=\';\n' +
    '    var p = JSON.parse(atob(part));\n' +
    '    return p.sub || p.user_id || \'\';\n' +
    '  } catch (e) { return \'\'; }\n' +
    '}\n' +
    'function __aicsTx(mode, fn) {\n' +
    '  return __aicsDbOpen().then(function (db) {\n' +
    '    return new Promise(function (resolve, reject) {\n' +
    '      var t = db.transaction(\'creations\', mode);\n' +
    '      var s = t.objectStore(\'creations\');\n' +
    '      var out = null;\n' +
    '      try { out = fn(s); } catch (e) { reject(e); return; }\n' +
    '      t.oncomplete = function () { resolve(out); };\n' +
    '      t.onerror = function () { reject(t.error); };\n' +
    '      t.onabort = function () { reject(t.error); };\n' +
    '    });\n' +
    '  });\n' +
    '}\n' +
    'function __aicsGenId() { return \'c\' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }\n' +
    'window.AICS_CREATIONS = {\n' +
    '  save: function (rec) {\n' +
    '    var now = new Date().toISOString();\n' +
    '    var item = {\n' +
    '      id: rec.id || __aicsGenId(),\n' +
    '      user_id: __aicsUserId(),\n' +
    '      studio: rec.studio || \'UNKNOWN\',\n' +
    '      type: String(rec.type || \'1\'),\n' +
    '      title: rec.title || \'Untitled\',\n' +
    '      original_prompt: rec.original_prompt || \'\',\n' +
    '      ai_output: rec.ai_output || \'\',\n' +
    '      media_type: rec.media_type || \'\',\n' +
    '      media_mime: rec.media_mime || \'\',\n' +
    '      media_data: rec.media_data || \'\',\n' +
    '      is_favorite: rec.is_favorite ? 1 : 0,\n' +
    '      created_at: rec.created_at || now,\n' +
    '      updated_at: now\n' +
    '    };\n' +
    '    return __aicsTx(\'readwrite\', function (s) { s.put(item); return item; });\n' +
    '  },\n' +
    '  list: function () {\n' +
    '    var uid = __aicsUserId();\n' +
    '    return __aicsDbOpen().then(function (db) {\n' +
    '      return new Promise(function (resolve, reject) {\n' +
    '        var t = db.transaction(\'creations\', \'readonly\');\n' +
    '        var req = t.objectStore(\'creations\').getAll();\n' +
    '        req.onsuccess = function () {\n' +
    '          var items = (req.result || []).filter(function (c) { return !uid || (c.user_id || \'\') === uid; });\n' +
    '          items.sort(function (a, b) { return ((b.created_at || \'\') > (a.created_at || \'\')) ? 1 : (((b.created_at || \'\') < (a.created_at || \'\')) ? -1 : 0); });\n' +
    '          resolve(items);\n' +
    '        };\n' +
    '        req.onerror = function () { reject(req.error); };\n' +
    '      });\n' +
    '    });\n' +
    '  },\n' +
    '  remove: function (id) {\n' +
    '    return __aicsTx(\'readwrite\', function (s) { s.delete(id); return true; });\n' +
    '  },\n' +
    '  toggleFav: function (id) {\n' +
    '    return __aicsDbOpen().then(function (db) {\n' +
    '      return new Promise(function (resolve, reject) {\n' +
    '        var t = db.transaction(\'creations\', \'readwrite\');\n' +
    '        var s = t.objectStore(\'creations\');\n' +
    '        var g = s.get(id);\n' +
    '        g.onsuccess = function () {\n' +
    '          var c = g.result;\n' +
    '          if (!c) { reject(new Error(\'not_found\')); return; }\n' +
    '          c.is_favorite = c.is_favorite ? 0 : 1;\n' +
    '          c.updated_at = new Date().toISOString();\n' +
    '          s.put(c);\n' +
    '          t.oncomplete = function () { resolve({ favorite: c.is_favorite === 1 }); };\n' +
    '        };\n' +
    '        g.onerror = function () { reject(g.error); };\n' +
    '      });\n' +
    '    });\n' +
    '  }\n' +
    '};\n' +
    '// ===== AI Creative Studio — Shared Sidebar Script (Phase 2 — App Shell) =====\n' +
    '// Phase 12 — Google Login ပြီးနောက် #token ကို ကမ္ဘာလုံးဆိုင်ရာ သိမ်းသည် (App စာမျက်နှာအားလုံးအတွက်)\n' +
    '(function () {\n' +
    '  var h = location.hash || \'\';\n' +
    '  if (h.indexOf(\'#token=\') === 0) {\n' +
    '    try { localStorage.setItem(\'aics_token\', decodeURIComponent(h.slice(7))); } catch (e) {}\n' +
    '    try { history.replaceState(null, \'\', location.pathname); } catch (e) {}\n' +
    '    location.reload();\n' +
    '  }\n' +
    '})();\n' +
    'var SB_TOKEN = localStorage.getItem(\'aics_token\') || \'\';\n' +
    '// Phase 12-fix — Remember Session: localStorage မရှိသော်လည်း Cookie ရှိလျှင် Token ပြန်ရယူသည် (Rule 14)\n' +
    'if (!SB_TOKEN) {\n' +
    '  fetch(\'/api/auth/session\').then(function (r) { return r.json(); }).then(function (d) {\n' +
    '    if (d && d.token) {\n' +
    '      try { localStorage.setItem(\'aics_token\', d.token); } catch (e) {}\n' +
    '      location.reload();\n' +
    '    }\n' +
    '  }).catch(function () {});\n' +
    '}\n' +
    'function __sbToast(msg, isError) {\n' +
    '  try { if (typeof showToast === \'function\') { showToast(msg, isError ? \'error\' : \'success\'); return; } } catch (e) {}\n' +
    '  try {\n' +
    '    var t = document.getElementById(\'toast\');\n' +
    '    if (t) { t.textContent = msg; t.className = \'toast show\' + (isError ? \' error\' : \'\'); setTimeout(function(){ t.className = \'toast\'; }, 2500); return; }\n' +
    '  } catch (e2) {}\n' +
    '  alert(msg);\n' +
    '}\n' +
    'function toggleSidebar() {\n' +
    '  var sb = document.getElementById(\'sidebar\');\n' +
    '  if (!sb) return;\n' +
    '  sb.classList.toggle(\'open\');\n' +
    '  var bd = document.getElementById(\'backdrop\');\n' +
    '  if (bd) bd.classList.toggle(\'show\');\n' +
    '}\n' +
    'function logout() {\n' +
    '  if (!confirm(\'Logout လုပ်မှာလား?\')) return;\n' +
    '  localStorage.removeItem(\'aics_token\'); localStorage.removeItem(\'aics_email\'); localStorage.removeItem(\'aics_plan\');\n' +
    '  location.href = \'/api/auth/logout\';\n' +
    '}\n' +
    'function setApiKey() {\n' +
    '  var key = prompt(\'မင်းရဲ့ Gemini API Key ကို ထည့်ပါ (aistudio.google.com ကနေ ရနိုင်ပါတယ်):\');\n' +
    '  if (!key) return;\n' +
    '  if (!SB_TOKEN) { __sbToast(\'Login လုပ်ပြီးမှ API Key သိမ်းလို့ရပါတယ်\', true); return; }\n' +
    '  fetch(\'/api/user/apikey\', {\n' +
    '    method: \'POST\',\n' +
    '    headers: { \'Content-Type\': \'application/json\', \'Authorization\': \'Bearer \' + SB_TOKEN },\n' +
    '    body: JSON.stringify({ key: key })\n' +
    '  }).then(function (r) { return r.json(); }).then(function (d) {\n' +
    '    if (d.error) { __sbToast(\'Save မအောင်မြင်\', true); return; }\n' +
    '    __sbToast(\'✓ API Key သိမ်းပြီးပါပြီ\', false);\n' +
    '  }).catch(function () { __sbToast(\'Network error\', true); });\n' +
    '}\n' +
    '(function () {\n' +
    '  if (!SB_TOKEN) return;\n' +
    '  fetch(\'/api/users/me\', { headers: { \'Authorization\': \'Bearer \' + SB_TOKEN } })\n' +
    '    .then(function (r) { return r.json(); })\n' +
    '    .then(function (d) {\n' +
    '      if (!d) return;\n' +
    '      if (d.error) { localStorage.removeItem(\'aics_token\'); location.href = \'/api/auth/logout\'; return; }\n' +
    '      var badge = document.getElementById(\'licenseBadge\') || document.getElementById(\'sidePlan\');\n' +
    '      if (badge) {\n' +
    '        if (d.plan === \'PRO\') { badge.innerText = \'⭐ PRO Plan\'; badge.classList.add(\'pro\'); }\n' +
    '        else { badge.innerText = \'FREE Plan\'; }\n' +
    '      }\n' +
    '      var se = document.getElementById(\'sideEmail\');\n' +
    '      if (se) se.textContent = d.email || \'—\';\n' +
    '      var sn = document.getElementById(\'sideName\');\n' +
    '      if (sn) {\n' +
    '        var disp = d.name || (d.email || \'\').split(\'@\')[0] || \'User\';\n' +
    '        sn.textContent = disp;\n' +
    '        var av = document.getElementById(\'sideAvatar\');\n' +
    '        if (av) av.textContent = disp.charAt(0).toUpperCase();\n' +
    '      }\n' +
    '      var ue = document.getElementById(\'userEmail\');\n' +
    '      if (ue) ue.textContent = d.email || \'\';\n' +
    '      var pb = document.getElementById(\'planBadge\');\n' +
    '      if (pb) pb.textContent = d.plan || \'FREE\';\n' +
    '      var al = document.getElementById(\'adminLink\');\n' +
    '      if (al) al.style.display = d.is_admin ? \'\' : \'none\';\n' +
    '      var ss = d.studio_settings || null;\n' +
    '      if (ss) {\n' +
    '        var links = document.querySelectorAll(\'[data-studio]\');\n' +
    '        for (var i = 0; i < links.length; i++) {\n' +
    '          var sid = links[i].getAttribute(\'data-studio\');\n' +
    '          if (ss[sid] === false) links[i].style.display = \'none\';\n' +
    '        }\n' +
    '      }\n' +
    '      localStorage.setItem(\'aics_email\', d.email || \'\'); localStorage.setItem(\'aics_plan\', d.plan || \'\');\n' +
    '    }).catch(function () {});\n' +
    '})();\n' +
    '// Favorites စာမျက်နှာ (fav=1) — Sidebar ထဲက "အနှစ်သက်ဆုံး" လင့်ခ်ကို Active ပြသည် (Phase 9 fix)\n' +
    '(function () {\n' +
    '  if (location.search.indexOf(\'fav=1\') === -1) return;\n' +
    '  var sbL = document.querySelectorAll(\'.sidebar .nav-item\');\n' +
    '  for (var j = 0; j < sbL.length; j++) {\n' +
    '    var h = sbL[j].getAttribute(\'href\') || \'\';\n' +
    '    if (h.indexOf(\'fav=1\') > -1) sbL[j].classList.add(\'active\');\n' +
    '    else if (h === \'/app/creations\') sbL[j].classList.remove(\'active\');\n' +
    '  }\n' +
    '})();\n' +
    '// ===== Phase C — Studio AI Model Selector (User ရွေးသုံးနိုင်သည်) =====\n' +
    '// စာမျက်နှာထဲတွင် <select id="aiModelSel" data-category="..."> (Voice Studio မှာ aiModelSel2 ပါ) ရှိပါက အလိုအလျောက် ဖြည့်ပေးသည်\n' +
    '(function () {\n' +
    '  var sels = document.querySelectorAll(\'select[id^="aiModelSel"]\');\n' +
    '  if (!sels || sels.length === 0) return;\n' +
    '  for (var k = 0; k < sels.length; k++) {\n' +
    '    (function (sel) {\n' +
    '      var cat = sel.getAttribute(\'data-category\') || \'text\';\n' +
    '      var key = sel.id === \'aiModelSel\' ? \'aics_default_model\' : \'aics_default_model_\' + cat;\n' +
    '      var saved = \'\';\n' +
    '      try { saved = localStorage.getItem(key) || \'\'; } catch (e) {}\n' +
    '      function fill(opts, selected) {\n' +
    '        if (!opts || opts.length === 0) { sel.innerHTML = \'<option value="">(Model မရှိ)</option>\'; return; }\n' +
    '        var html = \'\';\n' +
    '        for (var i = 0; i < opts.length; i++) {\n' +
    '          var m = opts[i];\n' +
    '          var isSel = m.id === selected;\n' +
    '          html += \'<option value="\' + m.id + \'"\' + (isSel ? \' selected\' : \'\') + \'>\' + String(m.name || m.id) + \'</option>\';\n' +
    '        }\n' +
    '        sel.innerHTML = html;\n' +
    '        if (!sel.value) sel.value = opts[0].id;\n' +
    '      }\n' +
    '      fetch(\'/api/ai-models?category=\' + encodeURIComponent(cat), { headers: { \'Authorization\': \'Bearer \' + SB_TOKEN } })\n' +
    '        .then(function (r) { return r.json(); })\n' +
    '        .then(function (d) {\n' +
    '          if (!d || d.error || !d.items || d.items.length === 0) { sel.innerHTML = \'<option value="">(Model မရှိ)</option>\'; return; }\n' +
    '          fill(d.items, saved);\n' +
    '        })\n' +
    '        .catch(function () { sel.innerHTML = \'<option value="">(Default)</option>\'; });\n' +
    '      sel.addEventListener(\'change\', function () {\n' +
    '        try { localStorage.setItem(key, sel.value); } catch (e) {}\n' +
    '      });\n' +
    '    })(sels[k]);\n' +
    '  }\n' +
    '})();\n' +
    '// ===== Unified Result Loading UI — shared page-script helper (all Studios) =====\n' +
    '// Loading state ကို Result section အတွင်းတွင်သာ ပြချေဖျက်ရန် တစ်နေရာတည်းမှ ထိန်းချုပ်သည်\n' +
    'window.studioToggleAdvanced = function (btnId, panelId) {\n' +
    '  var btn = document.getElementById(btnId);\n' +
    '  var p = document.getElementById(panelId);\n' +
    '  if (!btn || !p) return;\n' +
    '  var open = p.classList.toggle(\'open\');\n' +
    '  btn.classList.toggle(\'open\', open);\n' +
    '  btn.setAttribute(\'aria-expanded\', open ? \'true\' : \'false\');\n' +
    '  var arrow = btn.querySelector(\'.aics-adv-arrow\');\n' +
    '  if (arrow) arrow.textContent = open ? \'▲\' : \'▼\';\n' +
    '};\n' +
    'window.aicsResultLoading = {\n' +
    '  show: function (id, msg, hint) {\n' +
    '    var box = document.getElementById(id); if (!box) return;\n' +
    '    if (msg) { var m = box.querySelector(\'.aics-result-loading-msg\'); if (m) m.textContent = msg; }\n' +
    '    var h = box.querySelector(\'.aics-result-loading-hint\');\n' +
    '    if (h) {\n' +
    '      var t = hint == null ? \'\' : String(hint).replace(/\\s+/g, \' \').trim();\n' +
    '      if (t) { if (t.length > 90) t = t.slice(0, 87) + \'…\'; h.textContent = \'“\' + t + \'”\'; h.style.display = \'\'; }\n' +
    '      else { h.textContent = \'\'; h.style.display = \'none\'; }\n' +
    '    }\n' +
    '    box.classList.add(\'show\');\n' +
    '  },\n' +
    '  hide: function (id) {\n' +
    '    var box = document.getElementById(id); if (!box) return;\n' +
    '    box.classList.remove(\'show\');\n' +
    '  }\n' +
    '};\n' +
    '</script>';
}

// ============================================================
// AI CREATIVE STUDIO — SHARED STUDIO SHELL (Master Instruction — Phase 4)
// ------------------------------------------------------------
// တူညီသော Studio UI အခွံ — Studio Header + Workflow Stepper
// + Work Area / Preview Grid + Bottom Action Bar
// Studio စာမျက်နှာများသည် renderStudioShell(opts) ကို ခေါ်ယူရုံဖြင့်
// ပုံစံတူ layout ကို ရရှိပြီး မိမိ step အကြောင်းအရာများကို
// <div class="aics-step" data-step="N"> ထဲတွင် ထည့်ပါသည်။
// Page Script မှ သုံးနိုင်သော Global Helpers:
//   studioGoStep(n) / studioMarkDone(n) / studioSetActions(list)
//   studioPreview(html) / studioSaveDraft() / studioReset()
//   studioCollectDraft() / studioRestoreDraft(data) / studioOnStep(n)
// ============================================================

function aicsDesignPatchCss() {
  return (
    '<style>\n' +
    '/* ===== Personal Studio UX/UI — v1.0 (shared across all studios) ===== */\n' +
    '.aics-app .aics-main{padding:20px 24px 34px;}\n' +
    '.aics-app .aics-work{max-width:1080px!important;width:100%;margin:0 auto;}\n' +
    '.aics-work .card{border-radius:16px;border-color:rgba(148,163,184,.16);box-shadow:0 10px 30px rgba(0,0,0,.10);padding:20px;}\n' +
    '.aics-work .card-title{display:flex;align-items:center;gap:8px;font-size:15.5px;line-height:1.4;margin-bottom:14px;}\n' +
    '.aics-work .form-group{margin-bottom:16px;}\n' +
    '.aics-work label{display:block;font-size:12.5px;color:#a8b3c7;margin:0 0 7px;font-weight:600;line-height:1.4;}\n' +
    '.aics-work input:not([type=checkbox]):not([type=radio]),.aics-work textarea,.aics-work select{min-height:46px;background:rgba(6,12,25,.78);border:1px solid rgba(148,163,184,.20);border-radius:12px;padding:11px 13px;color:#e8ecf4;font-size:14px;line-height:1.5;box-sizing:border-box;transition:border-color .18s,box-shadow .18s,background .18s;}\n' +
    '.aics-work textarea{min-height:108px;}\n' +
    '.aics-work input:not([type=checkbox]):not([type=radio]):hover,.aics-work textarea:hover,.aics-work select:hover{border-color:rgba(0,229,255,.30);background:rgba(8,16,32,.92);}\n' +
    '.aics-work input:not([type=checkbox]):not([type=radio]):focus,.aics-work textarea:focus,.aics-work select:focus{outline:none;border-color:rgba(0,229,255,.75);box-shadow:0 0 0 3px rgba(0,229,255,.10);background:#0a1020;}\n' +
    '.aics-work select{cursor:pointer;appearance:auto;}\n' +
    '.aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;}\n' +
    '.aics-work .studio-form-grid .form-group,.aics-work .adv-grid .form-group,.aics-work .vf-grid .form-group{min-width:0;}\n' +
    '.aics-work .aics-cms-type-field{grid-column:1 / -1 !important;position:relative;padding:10px 12px 12px;border:1px solid rgba(0,229,255,.20);border-radius:14px;background:linear-gradient(135deg,rgba(0,229,255,.055),rgba(123,92,255,.075));box-shadow:0 8px 28px rgba(0,0,0,.10),inset 0 1px 0 rgba(255,255,255,.035);}\n' +
    '.aics-work .aics-cms-type-field label{display:flex;align-items:center;gap:7px;margin-bottom:7px;font-weight:700;color:#dffcff;}\n' +
    '.aics-work .aics-cms-type-field label:after{content:"CMS TYPE";font-size:9px;letter-spacing:.10em;padding:3px 6px;border-radius:999px;color:#dffcff;background:linear-gradient(90deg,rgba(0,229,255,.20),rgba(123,92,255,.22));border:1px solid rgba(0,229,255,.24);}\n' +
    '.aics-work .aics-cms-type-field select{width:min(360px,100%);max-width:360px;min-height:42px;padding:9px 12px;border-radius:11px;background:linear-gradient(135deg,rgba(0,229,255,.13),rgba(123,92,255,.16));border:1px solid rgba(0,229,255,.42);color:#f2fbff;font-weight:700;box-shadow:0 0 0 1px rgba(123,92,255,.08),0 8px 24px rgba(0,229,255,.07);outline:none;}\n' +
    '.aics-work .aics-cms-type-field select:hover{border-color:rgba(0,229,255,.72);background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(123,92,255,.22));}\n' +
    '.aics-work .aics-cms-type-field select:focus{border-color:rgba(0,229,255,.95);box-shadow:0 0 0 3px rgba(0,229,255,.13),0 8px 26px rgba(123,92,255,.10);}\n' +
    '.aics-work .aics-advanced-toggle{margin:4px 0 12px;background:rgba(123,92,255,.07);border-color:rgba(123,92,255,.28);color:#c7bbff;}\n' +
    '.aics-work .aics-advanced-toggle:hover{background:rgba(123,92,255,.13);border-color:rgba(123,92,255,.52);}\n' +
    '.aics-work .aics-adv-panel{padding:14px;background:rgba(8,14,28,.52);border:1px solid rgba(148,163,184,.12);border-radius:14px;margin-bottom:16px;}\n' +
    '.aics-work .aics-out-cards,.aics-work .branch-action-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}\n' +
    '.aics-work .aics-out-card,.aics-work .branch-action-card{min-height:150px;border-radius:16px;padding:20px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;transition:transform .18s,border-color .18s,box-shadow .18s;}\n' +
    '.aics-work .aics-out-card:hover,.aics-work .branch-action-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,229,255,.10);border-color:rgba(0,229,255,.65); }\n' +
    '.aics-work .aics-out-btn{min-height:46px;border-radius:11px;}\n' +
    '.aics-work .result-textarea,.aics-work .shop-result,.aics-work .srt-editable{border-radius:14px;line-height:1.7;}\n' +
    '.aics-work .btn-row{gap:10px;}\n' +
    '.aics-work .btn,.aics-work button:not(.aics-step-btn):not(.aics-advanced-toggle){min-height:44px;border-radius:11px;}\n' +
    '.aics-work .hint,.aics-work .form-help{line-height:1.55;}\n' +
    '@media (min-width:768px) and (max-width:1199px){\n' +
    '  .aics-app .aics-main{padding:18px 18px 28px;}\n' +
    '  .aics-work .card{padding:18px;}\n' +
    '  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{gap:12px;}\n' +
    '}\n' +
    '@media (max-width:767px){\n' +
    '  .aics-app .aics-main{padding:12px 12px 24px;}\n' +
    '  .aics-work .card{padding:16px;border-radius:14px;}\n' +
    '  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid,.aics-work .aics-out-cards,.aics-work .branch-action-grid{grid-template-columns:1fr;}\n' +
    '  .aics-work .aics-cms-type-field select{width:min(100%,340px);max-width:340px;}\n' +
    '  .aics-work input:not([type=checkbox]):not([type=radio]),.aics-work textarea,.aics-work select{min-height:48px;}\n' +
    '  .aics-work textarea{min-height:104px;}\n' +
    '  .aics-work .btn-row{display:grid;grid-template-columns:1fr;gap:8px;}\n' +
    '  .aics-work .btn-row .btn{width:100%;}\n' +
    '  .aics-work .aics-out-card,.aics-work .branch-action-card{min-height:128px;}\n' +
    '}\n' +
    '</style>'
  );
}

function aicsShellCss() {
  return (
    '<style>\n' +
    '/* ===== AI Creative Studio — Shared Studio Shell (Phase 4) ===== */\n' +
    '.aics-login-overlay{position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:var(--bg,#080c18);padding:20px;}\n' +
    '.aics-login-box{background:#0d1424;border:1px solid rgba(0,229,255,.2);border-radius:16px;padding:40px 32px;max-width:400px;width:100%;text-align:center;}\n' +
    '.aics-login-box h2{color:#00e5ff;margin-bottom:10px;font-size:18px;}\n' +
    '.aics-login-box p{color:#94a3b8;font-size:13.5px;margin-bottom:22px;}\n' +
    '.aics-header{display:flex;align-items:center;gap:14px;padding:10px 20px;background:linear-gradient(135deg,#0a1628,#0d1f3c);border-bottom:1px solid rgba(0,229,255,.12);position:sticky;top:0;z-index:100;width:100%;box-sizing:border-box;}\n' +
    '.aics-menu-btn{transition:all .2s;}\n' +
    '.aics-menu-btn:hover{background:rgba(0,229,255,.14);}\n' +
    '.aics-brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}\n' +
    '.aics-brand-icon{font-size:20px;flex-shrink:0;}\n' +
    '.aics-title{font-size:17px;font-weight:800;letter-spacing:.3px;background:linear-gradient(90deg,#00e5ff,#7b5cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
    '.aics-pro{padding:6px 16px;border-radius:999px;background:linear-gradient(135deg,#7b5cff,#00e5ff);color:#fff;font-size:12px;font-weight:700;letter-spacing:.5px;flex-shrink:0;box-shadow:0 2px 12px rgba(123,92,255,.35);}\n' +
    '.aics-header-left{display:flex;align-items:center;gap:12px;min-width:0;}\n' +
    '.aics-back{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:1px solid rgba(0,229,255,.28);color:#00e5ff;background:rgba(0,229,255,.06);font-size:17px;text-decoration:none;flex-shrink:0;transition:all .2s;}\n' +
    '.aics-back:hover{background:rgba(0,229,255,.14);transform:translateX(-2px);}\n' +
    '.aics-title{font-size:16.5px;font-weight:800;letter-spacing:.3px;background:linear-gradient(90deg,#00e5ff,#7b5cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;}\n' +
    '.aics-desc{font-size:11.5px;color:#8b95a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;}\n' +
    '.aics-header-right{display:flex;align-items:center;gap:10px;}\n' +
    '.aics-model{display:flex;align-items:center;gap:8px;}\n' +
    '.aics-model-label{font-size:11.5px;color:#8b95a8;font-weight:600;white-space:nowrap;}\n' +
    '.aics-model select{width:auto;min-width:150px;max-width:210px;padding:8px 10px;}\n' +
    '.aics-hd-save{display:inline-flex;align-items:center;gap:6px;background:#111a2e;border:1px solid rgba(0,229,255,.35);color:#00e5ff;padding:8px 14px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;min-height:38px;transition:all .2s;}\n' +
    '.aics-hd-save:hover{background:rgba(0,229,255,.12);}\n' +
    '.aics-user{display:flex;align-items:center;gap:8px;}\n' +
    '.aics-gear{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:1px solid rgba(0,229,255,.28);color:#00e5ff;background:rgba(0,229,255,.06);font-size:17px;text-decoration:none;flex-shrink:0;transition:all .2s;}\n' +
    '.aics-gear:hover{background:rgba(0,229,255,.14);}\n' +
    '.aics-userblock{display:flex;align-items:center;gap:9px;}\n' +
    '.aics-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#7b5cff,#00e5ff);color:#041018;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n' +
    '.aics-username{font-size:13px;font-weight:600;color:#e8ecf4;white-space:nowrap;}\n' +
    '.aics-planbadge{font-size:10.5px;font-weight:700;color:#00e5ff;border:1px solid rgba(0,229,255,.4);border-radius:999px;padding:2px 9px;white-space:nowrap;}\n' +
    '.aich-label{font-size:11.5px;color:#8b95a8;font-weight:700;letter-spacing:.4px;margin:16px 0 8px;}\n' +
    '.aich-chips{display:flex;flex-wrap:wrap;gap:8px;}\n' +
    '.aich-chip{display:inline-flex;align-items:center;gap:6px;background:#111a2e;border:1px solid #26324a;color:#c7d0e0;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;}\n' +
    '.aich-chip:hover{border-color:rgba(0,229,255,.45);color:#fff;}\n' +
    '.aich-chip.active{background:rgba(0,229,255,.12);border-color:#00e5ff;color:#00e5ff;}\n' +
    '.aich-chip.pro{border-color:rgba(123,92,255,.4);color:#b7a8ff;}\n' +
    '.aich-chip.pro.active{background:rgba(123,92,255,.16);color:#b7a8ff;}\n' +
    '.aich-model-wrap{margin-top:16px;}\n' +
    '.aich-model-wrap select{width:100%;padding:11px 12px;border-radius:10px;background:#0d1424;border:1px solid #26324a;color:#fff;font-size:13.5px;font-family:inherit;}\n' +
    '.aics-main{max-width:1280px;margin:0 auto;width:100%;padding:20px 24px;}\n' +
    '.aics-stepper{margin-bottom:14px;background:#0d1424;border:1px solid rgba(0,229,255,.12);border-radius:10px;padding:6px 8px;overflow-x:auto;}.aics-stepper:empty{display:none;}\n' +
    '.aics-stepper-inner{display:flex;align-items:center;gap:3px;min-width:max-content;}\n' +
    '.aics-step-btn{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:none;border:1px solid transparent;color:#5a6478;padding:6px 9px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;white-space:nowrap;transition:all .2s;}\n' +
    '.aics-step-btn .aics-step-label{font-weight:600;color:#94a3b8;font-size:12px;}\n' +
    '.aics-step-btn:hover .aics-step-label{color:#e8ecf4;}\n' +
    '.aics-step-btn.active{background:linear-gradient(90deg,rgba(123,92,255,.18),rgba(0,229,255,.08));border:1px solid rgba(123,92,255,.55);box-shadow:0 0 14px rgba(123,92,255,.25);}\n' +
    '.aics-step-btn.active .aics-step-label{color:#fff;}\n' +
    '.aics-step-btn.done{opacity:.75;}\n' +
    '.aics-step-btn.done .aics-step-label{color:#4ade80;}\n' +
    '.aics-step-btn.done .aics-step-label::before{content:"\\2713 ";color:#4ade80;font-weight:700;}\n' +
    '.aics-step-btn.todo{cursor:not-allowed;opacity:.4;}\n' +
    '.aics-step-btn.error{border-color:rgba(255,82,82,.65);box-shadow:0 0 14px rgba(255,82,82,.22);}\n' +
    '.aics-step-btn.error .aics-step-label{color:#ff8a8a;}\n' +
    '.aics-step-btn .aics-step-loading{display:none;font-size:11px;color:#00e5ff;font-weight:700;align-items:center;gap:5px;margin-top:3px;white-space:nowrap;}\n' +
    '.aics-step-btn.aics-loading .aics-step-loading{display:flex;}\n' +
    '.aics-step-btn.aics-loading{border-color:rgba(0,229,255,.6);box-shadow:0 0 18px rgba(0,229,255,.4);}\n' +
    '.aics-step-btn.aics-loading .aics-step-label{color:#00e5ff;}\n' +
    '.aics-step-btn .aics-step-spinner{width:12px;height:12px;border:2px solid rgba(0,229,255,.25);border-top-color:#00e5ff;border-radius:50%;animation:spin .7s linear infinite;}\n' +
    '.aics-step-link{width:12px;height:1px;background:rgba(0,229,255,.22);flex-shrink:0;}\n' +
    '/* ===== Unified Result Loading UI (Shared across ALL Studios — Result-section loading) ===== */\n' +
    '/* AI processing-status steps များကို Stepper ထဲတွင် မပြတော့ဘဲ — Result section အတွင်း၌သာ တူညီသော loading UI ပြသည် */\n' +
    '.aics-result-loading{display:none;align-items:center;justify-content:center;padding:36px 14px;margin-bottom:16px;background:linear-gradient(135deg,rgba(123,92,255,.10),rgba(0,229,255,.06));border:1px dashed rgba(0,229,255,.35);border-radius:14px;box-sizing:border-box;}\n' +
    '.aics-result-loading.show{display:flex;}\n' +
    '.aics-result-loading-inner{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:560px;width:100%;text-align:center;}\n' +
    '.aics-result-loading-spinner{width:30px;height:30px;flex:0 0 30px;border:3px solid rgba(0,229,255,.2);border-top-color:#00e5ff;border-radius:50%;animation:spin .8s linear infinite;}\n' +
    '.aics-result-loading-msg{color:#e8ecf4;font-size:14.5px;font-weight:600;line-height:1.5;}\n' +
    '.aics-result-loading-hint{color:#7fd8ff;font-size:13px;font-style:italic;opacity:.88;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n' +
    '.aics-grid{display:block;}\n' +
    '.aics-work{min-width:0;}\n' +
    '.aics-step{display:none;}\n' +
    '.aics-step.active{display:block;}\n' +
    '.aics-pv-label{font-size:11px;color:#8b95a8;font-weight:700;letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase;}\n' +
    '.aics-pv-card{background:#0a1020;border:1px solid rgba(0,229,255,.12);border-radius:10px;padding:12px 14px;margin-bottom:10px;}\n' +
    '.aics-pv-card h4{margin:0 0 4px;color:#00e5ff;font-size:13px;}\n' +
    '.aics-pv-card p{margin:0 0 6px;color:#e8ecf4;font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}\n' +
    '.aics-pv-card .aics-pv-sub{color:#8b95a8;font-size:11.5px;}\n' +
    '.aics-pv-img{max-width:100%;border-radius:8px;border:1px solid rgba(0,229,255,.15);margin-top:6px;}\n' +
    '.aics-actions{position:sticky;bottom:10px;margin-top:18px;background:rgba(21,27,43,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(0,229,255,.22);border-radius:14px;padding:12px 16px;z-index:50;box-shadow:0 6px 24px rgba(0,0,0,.4);}\n' +
    '.aics-actions-inner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;}\n' +
    '.aics-actions-model{display:flex;align-items:center;gap:8px;flex-shrink:0;}\n' +
    '.aics-actions-model-label{font-size:11.5px;color:#94a3b8;font-weight:700;white-space:nowrap;letter-spacing:.4px;}\n' +
    '.aics-actions-model select{min-width:130px;max-width:200px;padding:9px 10px;background:rgba(123,92,255,.12);border:1px solid rgba(123,92,255,.4);color:#c4b5fd;border-radius:12px;font-size:13px;font-family:inherit;}\n' +
    '.aics-actions-model select:hover{border-color:rgba(123,92,255,.7);background:rgba(123,92,255,.18);}\n' +
    '.aics-actions-inner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;}\n' +
    '.aics-act{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:12px;border:none;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;min-height:44px;transition:all .2s;}\n' +
    '.aics-act.primary{background:linear-gradient(135deg,#00e5ff,#00b8d4);color:#080c18;box-shadow:0 2px 14px rgba(0,229,255,.3);}\n' +
    '.aics-act.primary:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,229,255,.4);}\n' +
    '.aics-act.success{background:linear-gradient(135deg,#00e676,#00c853);color:#080c18;box-shadow:0 2px 14px rgba(0,230,118,.3);}\n' +
    '.aics-act.success:hover{opacity:.92;transform:translateY(-1px);}\n' +
    '.aics-act.purple{background:linear-gradient(135deg,#7b5cff,#9c7cff);color:#fff;box-shadow:0 2px 14px rgba(123,92,255,.3);}\n' +
    '.aics-act.purple:hover{opacity:.92;transform:translateY(-1px);}\n' +
    '.aics-act.secondary{background:rgba(255,159,43,.1);color:#ffb84d;border:1px solid rgba(255,159,43,.35);}\n' +
    '.aics-act.secondary:hover{background:rgba(0,229,255,.16);}\n' +
    '.aics-act.ghost{background:rgba(255,255,255,.04);color:#94a3b8;border:1px solid rgba(148,163,184,.25);}\n' +
    '.aics-act.ghost:hover{color:#00e5ff;border-color:rgba(0,229,255,.4);background:rgba(0,229,255,.06);}\n' +
    '@media (min-width:768px) and (max-width:1199px){.aics-desc{max-width:200px;}}\n' +
    '@media (max-width:767px){\n' +
    '  .aics-title{font-size:15px;}\n' +
    '  .aics-brand-icon{font-size:17px;}\n' +
    '  .aics-pro{padding:5px 12px;font-size:11px;}\n' +
    '  .aics-desc{display:none;}\n' +
    '  .aics-user .user-email{display:none;}\n' +
    '  .aics-model-label{display:none;}\n' +
    '  .aics-model select{min-width:0;max-width:120px;padding:7px 8px;font-size:12px;}\n' +
    '  .aics-hd-save{padding:8px 10px;font-size:12px;}\n' +
    '  .aics-actions{position:sticky;bottom:8px;padding:10px 12px;}\n' +
    '  .aics-actions-inner{justify-content:flex-end;gap:8px;}\n' +
    '  .aics-actions-model{flex:0 0 auto;}\n' +
    '  .aics-actions-model select{min-width:0;max-width:130px;padding:8px;font-size:12px;}\n' +
    '  .aics-actions-model-label{font-size:10.5px;}\n' +
    '  .aics-act{flex:1;padding:10px 8px;font-size:12.5px;min-height:42px;}\n' +
    '  .aics-stepper{padding:6px 8px;}\n' +
    '  .aics-step-btn{padding:7px 10px;}\n' +
    '  .aics-step-btn .aics-step-label{font-size:12.5px;}\n' +
    '  .aics-result-loading{padding:24px 12px;}\n' +
    '  .aics-result-loading-msg{font-size:13.5px;}\n' +
    '  .aics-result-loading-spinner{width:26px;height:26px;flex-basis:26px;}\n' +
    '}\n' +
    '/* ===== AI Creative Studio — Shared Form / Input / Accordion Standards ===== */\n' +
    '/* 1) Two-column form grid (Desktop/iPad) → 1-column on mobile */\n' +
    '.studio-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px;}\n' +
    '.studio-form-grid .form-group{margin-bottom:0;}\n' +
    '@media (max-width:767px){.studio-form-grid{grid-template-columns:1fr;gap:12px;}}\n' +
    '/* 2) Consistent Accordion (Advanced / Optional settings) */\n' +
    '.aics-advanced-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(0,229,255,.07);border:1px solid rgba(0,229,255,.25);color:#00e5ff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;min-height:44px;margin-bottom:12px;text-align:left;transition:background .2s,border-color .2s;box-sizing:border-box;}\n' +
    '.aics-advanced-toggle:hover{background:rgba(0,229,255,.13);border-color:rgba(0,229,255,.45);}\n' +
    '.aics-advanced-toggle:focus{outline:none;border-color:#00e5ff;box-shadow:0 0 0 2px rgba(0,229,255,.18);}\n' +
    '.aics-advanced-toggle .aics-adv-arrow{display:inline-block;font-size:11px;flex-shrink:0;transition:transform .2s;}\n' +
    '.aics-advanced-toggle.open .aics-adv-arrow{transform:rotate(180deg);}\n' +
    '.aics-adv-panel{display:none;}\n' +
    '.aics-adv-panel.open{display:grid;}\n' +
    '/* 3) Standard input states — focus / disabled / error / helper */\n' +
    '.aics-work input:disabled,.aics-work textarea:disabled,.aics-work select:disabled,.aics-work button:disabled{opacity:.5;cursor:not-allowed;}\n' +
    '.aics-work .form-help{font-size:11.5px;color:#5a6478;margin-top:5px;line-height:1.55;}\n' +
    '.aics-work .form-group.has-error input,.aics-work .form-group.has-error textarea,.aics-work .form-group.has-error select{border-color:rgba(255,82,82,.65);box-shadow:0 0 0 2px rgba(255,82,82,.12);}\n' +
    '.aics-work .form-error{display:none;color:#ff8a8a;font-size:12px;margin-top:5px;line-height:1.5;}\n' +
    '.aics-work .form-group.has-error .form-error{display:block;}\n' +
    '/* 4) Mobile touch targets ≥44px for in-card small buttons */\n' +
    '@media (max-width:767px){\n' +
    '  .aics-work .btn-ghost,.aics-work .btn-sm,.aics-work .btn-row .btn{min-height:44px;padding-top:10px;padding-bottom:10px;}\n' +
    '  .aics-advanced-toggle{min-height:48px;}\n' +
    '  .aics-work .ref-upload-area input[type=file]{min-height:48px;}\n' +
    '}\n' +
    '</style>'
  );
}

// ============================================================
// UNIFIED RESULT LOADING UI — Shared component (all Studios)
// ------------------------------------------------------------
// Studio တိုင်း၏ Result section အတွင်း တူညီသော loading card ကို ပြရန် —
// processing-status steps (AI ရေးသားနေသည် / AI ပြင်ဆင်နေသည် / ...) များကို
// Stepper ထဲတွင် မပြတော့ဘဲ Result နေရာတွင်သာ loading ပြသည်။
// id: loading block ၏ element id | msg: Studio အလိုက် personalized loading message
// hint ကို page script မှ window.aicsResultLoading.show(id,msg,hint) ဖြင့် ထည့်နိုင်သည်
// ============================================================
export function aicsResultLoadingHtml(id, msg) {
  return (
    '<div class="aics-result-loading" id="' + id + '">' +
    '<div class="aics-result-loading-inner">' +
    '<div class="aics-result-loading-spinner"></div>' +
    '<div class="aics-result-loading-msg">' + msg + '</div>' +
    '<div class="aics-result-loading-hint"></div>' +
    '</div>' +
    '</div>'
  );
}

// opts: { id, activeId, nameMy, desc, icon, modelCat, steps:[{label,sub,req?}], content }
export function renderStudioShell(opts) {
  opts = opts || {};
  const id = opts.id || 'studio';
  const activeId = opts.activeId || id;
  const nameMy = opts.nameMy || 'Studio';
  const desc = opts.desc || '';
  const icon = opts.icon || '🎨';
  const modelCat = opts.modelCat || 'text';
  const steps = opts.steps || [];
  const content = opts.content || '';
  const stepsJson = JSON.stringify(steps.map(function (s, i) {
    return { n: i + 1, label: s.label || 'Step ' + (i + 1), sub: s.sub || '', req: s.req || (i === 0 ? [] : [i]), lock: !!s.lock, loading: s.loading || '' };
  }));

  return (
    aicsShellCss() +
    aicsDesignPatchCss() +
    '<div class="aics-app" id="aicsApp">\n' +
    '<header class="header aics-header">\n' +
    '<button class="aics-menu-btn" aria-label="Menu ဖွင့်ရန် / ပိတ်ရန်" title="Menu" onclick="toggleSidebar()">&#9776;</button>\n' +
    '<div class="aics-brand"><span class="aics-brand-icon">' + icon + '</span><span class="aics-title">' + nameMy + '</span></div>\n' +
    '<div class="aics-pro" id="sidePlan">FREE</div>\n' +
    '</header>\n' +
    '<div class="layout">\n' +
    renderSidebar(activeId, { variant: 'studio' }) +
    '<main class="main aics-main">\n' +
    '<div class="aics-stepper" id="aicsStepper"></div>\n' +
    '<div class="aics-grid">\n' +
    '<section class="aics-work" id="aicsWork" style="max-width:820px;margin:0 auto;width:100%;">\n' +
    content +
    '</section>\n' +
    '</div>\n' +
    '<div class="aics-actions">\n' +
    '<div class="aics-actions-inner" id="aicsActionsInner"><div class="aics-actions-model"><span class="aics-actions-model-label">&#129302; AI မော်ဒယ်</span><select id="aiModelSel" data-category="' + modelCat + '"></select></div></div>\n' +
    '</div>\n' +
    '</main>\n' +
    '</div>\n' +
    '</div>\n' +
    '<script>\n' +
    '(function () {\n' +
    '  var SHELL_ID = ' + JSON.stringify(id) + ';\n' +
    '  var STEPS = ' + stepsJson + ';\n' +
    '  var draftKey = "aics_draft_" + SHELL_ID;\n' +
    '  var cur = 1;\n' +
    '  var doneMap = {};\n' +
    '  var started = false;\n' +
    '  function el(id) { return document.getElementById(id); }\n' +
    '  function toast(msg, isErr) { try { __sbToast(msg, isErr); } catch (e) { try { alert(msg); } catch (e2) {} } }\n' +
    '  function allowed(n) {\n' +
    '    if (doneMap[n]) return true;\n' +
    '    if (n === 1) return true;\n' +
    '    for (var i = 0; i < STEPS.length; i++) {\n' +
    '      if (STEPS[i].n === n) {\n' +
    '        var req = STEPS[i].req || [];\n' +
    '        for (var r = 0; r < req.length; r++) { if (!doneMap[req[r]]) return false; }\n' +
    '        return true;\n' +
    '      }\n' +
    '    }\n' +
    '    return false;\n' +
    '  }\n' +
    '  function renderStepper() {\n' +
    '    var c = el("aicsStepper"); if (!c) return;\n' +
    '    var html = \'<div class="aics-stepper-inner">\';\n' +
    '    for (var i = 0; i < STEPS.length; i++) {\n' +
    '      var s = STEPS[i];\n' +
    '      html += \'<button class="aics-step-btn" data-step="\' + s.n + \'"\' + (s.lock ? \' data-lock="1"\' : \'\') + \' onclick="studioGoStep(\' + s.n + \')">\' +\n' +
    '        \'<span class="aics-step-txt"><span class="aics-step-label">\' + s.label + \'</span></span>\' +\n' +
    '        \'<span class="aics-step-loading"><span class="aics-step-spinner"></span>ဖန်တီးနေသည်...</span></button>\';\n' +
    '      if (i < STEPS.length - 1) html += \'<span class="aics-step-link"></span>\';\n' +
    '    }\n' +
    '    html += \'</div>\';\n' +
    '    c.innerHTML = html;\n' +
    '  }\n' +
    '  function stepMeta(n) {\n' +
    '    for (var k = 0; k < STEPS.length; k++) if (STEPS[k].n === n) return STEPS[k];\n' +
    '    return null;\n' +
    '  }\n' +
    '  function scrollActiveStepIntoView(smooth) {\n' +
    '    var btn = document.querySelector(\'.aics-step-btn.active\');\n' +
    '    if (!btn) return;\n' +
    '    var container = btn.closest ? btn.closest(\'.aics-stepper\') : el(\'aicsStepper\');\n' +
    '    if (!container) container = el(\'aicsStepper\');\n' +
    '    if (!container) return;\n' +
    '    try {\n' +
    '      var cr = container.getBoundingClientRect();\n' +
    '      var br = btn.getBoundingClientRect();\n' +
    '      var fullyVisible = br.left >= cr.left && br.right <= cr.right;\n' +
    '      if (!fullyVisible) {\n' +
    '        btn.scrollIntoView({behavior: smooth === false ? \'auto\' : \'smooth\', inline: \'center\', block: \'nearest\'});\n' +
    '      }\n' +
    '    } catch (e) {\n' +
    '      try { btn.scrollIntoView({behavior:\'smooth\', inline:\'center\', block:\'nearest\'}); } catch (e2) {}\n' +
    '    }\n' +
    '  }\n' +
    '  window.studioScrollElementIntoView = function (selector, containerSelector, smooth) {\n' +
    '    var btn = typeof selector === \'string\' ? document.querySelector(selector) : selector;\n' +
    '    if (!btn) return;\n' +
    '    var container = containerSelector ? document.querySelector(containerSelector) : (btn.closest ? btn.closest(\'.aics-stepper\') : null);\n' +
    '    if (!container) container = el(\'aicsStepper\');\n' +
    '    try {\n' +
    '      var cr = container && container.getBoundingClientRect ? container.getBoundingClientRect() : null;\n' +
    '      var br = btn.getBoundingClientRect();\n' +
    '      if (!cr || br.left < cr.left || br.right > cr.right) {\n' +
    '        btn.scrollIntoView({behavior: smooth === false ? \'auto\' : \'smooth\', inline: \'center\', block: \'nearest\'});\n' +
    '      }\n' +
    '    } catch (e) {}\n' +
    '  };\n' +
    '  window.studioScrollActiveStep = scrollActiveStepIntoView;\n' +

    '  function updateStepper() {\n' +
    '    var btns = document.querySelectorAll(".aics-step-btn");\n' +
    '    for (var i = 0; i < btns.length; i++) {\n' +
    '      var n = parseInt(btns[i].getAttribute("data-step"), 10);\n' +
    '      var sm = stepMeta(n);\n' +
    '      btns[i].classList.remove("active", "done", "todo");\n' +
    '      if (n === cur) btns[i].classList.add("active");\n' +
    '      else if (doneMap[n]) btns[i].classList.add("done");\n' +
    '      else if (!allowed(n) || (sm && sm.lock)) btns[i].classList.add("todo");\n' +
    '    }\n' +
    '  }\n' +
    '  function showStep(n) {\n' +
    '    var steps = document.querySelectorAll(".aics-step");\n' +
    '    for (var i = 0; i < steps.length; i++) {\n' +
    '      var sn = parseInt(steps[i].getAttribute("data-step"), 10);\n' +
    '      steps[i].classList.toggle("active", sn === n);\n' +
    '    }\n' +
    '    var w = el("aicsWork"); if (w) w.scrollTop = 0;\n' +
    '    updateStepper();\n' +
    '    if (window.studioOnStep) { try { window.studioOnStep(n); } catch (e) {} }\n' +
    '  }\n' +
    '  var lockNav = false;\n' +
    '  window.studioGoStep = function (n) {\n' +
    '    if (!lockNav) {\n' +
    '      if (!allowed(n)) return;\n' +
    '      var sm = stepMeta(n);\n' +
    '      if (sm && sm.lock) { toast("ဤအဆင့်သည် AI ဆောင်ရွက်နေချိန် အဆင့်ဖြစ်ပြီး ကိုယ်တိုင် ရွေးချယ်၍ မရပါ"); return; }\n' +
    '    }\n' +
    '    cur = n;\n' +
    '    showStep(n);\n' +
    '  };\n' +
    '  // AI Processing Step (lock) သို့ ကိုယ်တိုင်နှိပ်ခြင်း မလိုဘဲ Program အလိုအလျောက် သွားရန် (Story Studio 02/05)\n' +
    '  window.studioForceGoStep = function (n) {\n' +
    '    lockNav = true;\n' +
    '    try { window.studioGoStep(n); } finally { lockNav = false; }\n' +
    '  };\n' +
    '  window.studioMarkDone = function (n) {\n' +
    '    doneMap[n] = true;\n' +
    '    updateStepper();\n' +
    '  };\n' +
    '  // Error ဖြစ်သော Processing Step ကို Done အဖြစ် မသတ်မှတ်စေရန် — Done အခြေအနေကို ပြန်ဖျက်သည်\n' +
    '  window.studioUnmarkDone = function (n) {\n' +
    '    doneMap[n] = false;\n' +
    '    updateStepper();\n' +
    '  };\n' +
    '  window.studioCur = function () { return cur; };\n' +
    '  // Unified loading: loading ကို Result section အတွင်း၌သာ ပြသည် (aicsResultLoading) —\n' +
    '  // Stepper ပေါ်တွင် spinner မပြတော့ပါ (compat no-op)\n' +
    '  window.studioSetLoading = function () {};\n' +
    '  window.aichAudChoices = [\'လူတိုင်း\', \'လူငယ်\', \'လူကြီး\', \'ကလေး\'];\n' +
    '  window.aichAud = \'လူတိုင်း\';\n' +
    '  window.aichBuildAud = function (containerId, selected) {\n' +
    '    var c = el(containerId); if (!c) return;\n' +
    '    window.aichAud = selected || window.aichAud;\n' +
    '    var html = \'\';\n' +
    '    for (var i = 0; i < window.aichAudChoices.length; i++) {\n' +
    '      var v = window.aichAudChoices[i];\n' +
    '      html += \'<button type="button" class="aich-chip\' + (v === window.aichAud ? \' active\' : \'\') + \'" onclick="aichPickAud(this)">\' + v + \'</button>\';\n' +
    '    }\n' +
    '    c.innerHTML = html;\n' +
    '  };\n' +
    '  window.aichPickAud = function (btn) {\n' +
    '    var p = btn.parentElement;\n' +
    '    var btns = p.querySelectorAll(".aich-chip");\n' +
    '    for (var i = 0; i < btns.length; i++) btns[i].classList.remove("active");\n' +
    '    btn.classList.add("active");\n' +
    '    window.aichAud = btn.textContent;\n' +
    '  };\n' +
    '  window.studioSetActions = function (list) {\n' +
    '    var c = el("aicsActionsInner"); if (!c) return;\n' +
    '    var model = c.querySelector(".aics-actions-model");\n' +
    '    var acts = (list || []).filter(function(a){ return a && a.label; });\n' +
    '    var html = \'\';\n' +
    '    for (var i = 0; i < acts.length; i++) {\n' +
    '      var a = acts[i];\n' +
    '      html += \'<button class="aics-act \' + (a.cls || "secondary") + \'" onclick="studioAct(\' + i + \')">\' + a.label + \'</button>\';\n' +
    '    }\n' +
    '    c.innerHTML = \'\';\n' +
    '    if (model) c.appendChild(model);\n' +
    '    c.insertAdjacentHTML("beforeend", html);\n' +
    '    window.__studioActions = acts;\n' +
    '  };\n' +
    '  window.studioAct = function (i) {\n' +
    '    var list = window.__studioActions || [];\n' +
    '    var a = list[i];\n' +
    '    if (!a) return;\n' +
    '    if (typeof a.fn === "function") { try { a.fn(); } catch (e) { toast("Action error: " + (e && e.message || ""), true); } }\n' +
    '    else if (a.fn && window[a.fn]) { try { window[a.fn](); } catch (e) { toast("Action error: " + (e && e.message || ""), true); } }\n' +
    '  };\n' +
    '  window.studioPreview = function (html) { /* preview panel removed */ };\n' +
    '  window.studioSaveDraft = function () {\n' +
    '    var data = null;\n' +
    '    if (window.studioCollectDraft) { try { data = window.studioCollectDraft(); } catch (e) { data = null; } }\n' +
    '    try {\n' +
    '      localStorage.setItem(draftKey, JSON.stringify({ step: cur, data: data, savedAt: new Date().toISOString() }));\n' +
    '      toast("&#10004; Draft သိမ်းပြီးပါပြီ");\n' +
    '    } catch (e) { toast("Save မအောင်မြင်ပါ", true); }\n' +
    '  };\n' +
    '  window.studioReset = function () {\n' +
    '    if (!confirm("ဤ Studio ရဲ့ အချက်အလက်အားလုံးကို ဖျက်ပြီး အစကပြန်စမလား?")) return;\n' +
    '    try { localStorage.removeItem(draftKey); } catch (e) {}\n' +
    '    location.reload();\n' +
    '  };\n' +
    '  function init() {\n' +
    '    renderStepper();\n' +
    '    var raw = null;\n' +
    '    try { raw = localStorage.getItem(draftKey); } catch (e) {}\n' +
    '    if (raw) {\n' +
    '      try {\n' +
    '        var d = JSON.parse(raw);\n' +
    '        if (d && d.data && window.studioRestoreDraft) { window.studioRestoreDraft(d.data); }\n' +
    '        if (d && d.step && allowed(d.step)) cur = d.step;\n' +
    '      } catch (e) {}\n' +
    '    }\n' +
    '    showStep(cur);\n' +
    '  }\n' +
    '  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);\n' +
    '  else init();\n' +
    '})();\n' +
    '</script>'
  );
}
