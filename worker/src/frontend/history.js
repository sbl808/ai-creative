import { renderSidebar, sidebarScript } from './shared.js';

export const HISTORY_HTML = `<!doctype html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>History — AI Creative Studio</title>
<style>
:root{color-scheme:light dark;--bg:#f6f8fb;--surface:#fff;--text:#172033;--muted:#667085;--line:#e5eaf1;--primary:#5b5bd6;--soft:#f0efff;--danger:#b42318}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.6 Inter,"Noto Sans Myanmar",system-ui,sans-serif}
main{width:100%;max-width:1120px;margin:0 auto;padding:24px}
h1{font-size:25px;margin:0 0 6px}
.subtitle{color:var(--muted);margin:0 0 22px}
.toolbar{display:grid;grid-template-columns:minmax(0,1fr) 190px 160px;gap:10px;margin-bottom:16px}
.toolbar input,.toolbar select{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);font:inherit}
.count{color:var(--muted);font-size:12px;margin:0 0 12px}
.history-list{display:grid;gap:12px}
.history-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.card-title{font-size:16px;font-weight:700;overflow-wrap:anywhere}
.card-meta{font-size:12px;color:var(--muted);margin-top:4px}
.card-preview{margin:10px 0 0;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.actions button,.actions a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-size:13px;text-decoration:none;cursor:pointer}
.actions .primary{background:var(--soft);border-color:#d9d6fe;color:var(--primary);font-weight:650}
.actions .danger{color:var(--danger)}
.actions button:disabled{opacity:.55;cursor:wait}
.empty{padding:48px 18px;text-align:center;color:var(--muted);background:var(--surface);border:1px dashed var(--line);border-radius:14px}
.status{padding:12px;color:var(--muted)}
:where(button,a,input,select):focus-visible{outline:3px solid rgba(91,91,214,.35);outline-offset:2px}
@media(min-width:768px) and (max-width:1199px){main{padding:20px}.toolbar{grid-template-columns:minmax(0,1fr) 170px 140px}}
@media(max-width:767px){main{padding:16px 12px 32px}h1{font-size:22px}.toolbar{grid-template-columns:1fr;gap:8px}.history-card{padding:14px}.card-top{display:block}.actions>*{flex:1 1 auto}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<div class="aics-app">
<header class="aics-header">
<button type="button" class="aics-menu-btn" data-aics-sidebar-action="toggle" aria-label="Menu ဖွင့်ရန် / ပိတ်ရန်" aria-controls="sidebar" aria-expanded="false">&#9776;</button>
<div class="aics-brand"><span class="aics-brand-icon">🕘</span><span class="aics-title">AI Creative Studio</span></div>
<div class="aics-pro" id="sidePlan">FREE</div>
</header>
<div class="layout">
${renderSidebar('history',{variant:'studio'})}
<main class="main-content aics-main">
<h1>History</h1>
<p class="subtitle">သင်ဖန်တီးထားသော Creation၊ Idea၊ Studio Result နှင့် Draft များကို ရက်စွဲအလိုက် ကြည့်ရှုနိုင်ပါသည်။ Data များကို သင့် Browser IndexedDB ထဲမှာသာ ဖတ်ရှုပါသည်။</p>
<div id="historyLoading" class="status" role="status" aria-live="polite">History ဖတ်နေသည်…</div>
<section id="historyContent" hidden>
<div class="toolbar">
<input id="historySearch" type="search" placeholder="ခေါင်းစဉ်၊ အကြောင်းအရာ၊ Studio ဖြင့် ရှာရန်" aria-label="History ရှာရန်">
<select id="historyType" aria-label="အမျိုးအစား စစ်ထုတ်ရန်">
<option value="all">အမျိုးအစားအားလုံး</option>
<option value="creation">Creation</option>
<option value="idea">Idea</option>
<option value="result">Studio Result</option>
<option value="session">Session</option>
<option value="draft">Draft</option>
</select>
<select id="historyFavorite" aria-label="Favorite စစ်ထုတ်ရန်">
<option value="all">အားလုံး</option>
<option value="favorites">⭐ အနှစ်သက်ဆုံးသာ</option>
</select>
</div>
<p class="count" id="historyCount" aria-live="polite"></p>
<div id="historyList" class="history-list"></div>
<div id="historyEmpty" class="empty" hidden>မှတ်တမ်း မတွေ့ပါ။ ရှာဖွေမှု သို့မဟုတ် စစ်ထုတ်မှုကို ပြောင်းကြည့်ပါ။</div>
</section>
</main>
</div>
</div>
${sidebarScript()}
<script>
(function(){
'use strict';
var allItems=[];
var listNode=document.getElementById('historyList');
var loadingNode=document.getElementById('historyLoading');
var contentNode=document.getElementById('historyContent');
var countNode=document.getElementById('historyCount');
var emptyNode=document.getElementById('historyEmpty');
function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function dateLabel(value){if(!value)return '';var d=new Date(value);return isNaN(d.getTime())?'':d.toLocaleString()}
function studioPath(value){var studio=String(value||'').toLowerCase();return ['story','content','short','image','voice','shop'].indexOf(studio)!==-1?'/app/'+studio:'/app'}
function itemLabel(kind){return ({creation:'Creation',idea:'Idea',result:'Studio Result',session:'Session',draft:'Draft'})[kind]||'Item'}
function itemHref(item){
 if(item.kind==='creation')return '/app/creations';
 if(item.kind==='idea')return '/app/ideas?edit='+encodeURIComponent(item.sourceId);
 if(item.kind==='result'||item.kind==='session'||item.kind==='draft')return studioPath(item.studio);
 return '/app';
}
function itemActionLabel(item){
 if(item.kind==='creation')return 'ဖန်တီးမှုများတွင် ကြည့်ရန်';
 if(item.kind==='idea')return 'Idea ပြန်ဖွင့်ရန်';
 if(item.kind==='result')return 'သက်ဆိုင်ရာ Studio ဖွင့်ရန်';
 if(item.kind==='session')return 'Session ၏ Studio ဖွင့်ရန်';
 if(item.kind==='draft')return 'Draft Studio ဖွင့်ရန်';
 return 'ဖွင့်ရန်';
}
function visibleItems(){
 var kind=document.getElementById('historyType').value;
 var favorite=document.getElementById('historyFavorite').value;
 var query=document.getElementById('historySearch').value.trim().toLowerCase();
 return allItems.filter(function(item){
  if(kind!=='all'&&item.kind!==kind)return false;
  if(favorite==='favorites'&&!item.isFavorite)return false;
  if(query&&[item.title,item.preview,item.studio,item.kind].join(' ').toLowerCase().indexOf(query)===-1)return false;
  return true;
 });
}
function render(){
 var items=visibleItems();
 listNode.innerHTML='';
 countNode.textContent='မှတ်တမ်း '+items.length+' ခု';
 emptyNode.hidden=items.length!==0;
 items.forEach(function(item){
  var card=document.createElement('article');
  card.className='history-card';
  var studio=item.studio?(' · '+esc(item.studio)):'';
  var favoriteButton=(item.kind==='creation'||item.kind==='idea')
   ?'<button type="button" data-history-action="favorite" data-kind="'+esc(item.kind)+'" data-id="'+esc(item.sourceId)+'">'+(item.isFavorite?'⭐ Favorite ဖြုတ်ရန်':'☆ Favorite ထည့်ရန်')+'</button>':'';
  card.innerHTML='<div class="card-top"><div><div class="card-title">'+esc(item.title||'Untitled')+'</div><div class="card-meta">'+esc(itemLabel(item.kind))+studio+' · '+esc(dateLabel(item.updatedAt||item.createdAt))+'</div></div></div>'+
   (item.preview?'<p class="card-preview">'+esc(item.preview)+'</p>':'')+
   '<div class="actions"><a class="primary" href="'+esc(itemHref(item))+'">'+esc(itemActionLabel(item))+'</a>'+favoriteButton+
   '<button type="button" class="danger" data-history-action="delete" data-kind="'+esc(item.kind)+'" data-id="'+esc(item.sourceId)+'" data-studio="'+esc(item.studio||'')+'">ဖျက်ရန်</button></div>';
  listNode.appendChild(card);
 });
}
function reload(){
 loadingNode.hidden=false;contentNode.hidden=true;
 return window.AICS_HISTORY.list().then(function(items){
  allItems=Array.isArray(items)?items:[];
  loadingNode.hidden=true;contentNode.hidden=false;render();
 }).catch(function(){
  loadingNode.textContent='History ကို ဖတ်မရပါ။ Login နှင့် Browser Storage ကို စစ်ဆေးပြီး ပြန်ဖွင့်ကြည့်ပါ။';
 });
}
function removeItem(item,button){
 var message=item.kind==='session'?'ဒီ Session နှင့် ၎င်း၏ Result များကိုပါ ဖျက်မည်ဖြစ်သည်။ ဆက်လုပ်မလား?':'ဒီမှတ်တမ်းကို ဖျက်မှာ သေချာပါသလား?';
 if(!window.confirm(message))return;
 button.disabled=true;
 var operation;
 if(item.kind==='creation')operation=window.AICS_CREATIONS.remove(item.sourceId);
 else if(item.kind==='idea')operation=window.AICS_IDEAS.remove(item.sourceId);
 else if(item.kind==='result')operation=window.AICS_SESSION_RESULTS.remove(item.sourceId);
 else if(item.kind==='session')operation=window.AICS_SESSIONS.remove(item.sourceId);
 else if(item.kind==='draft')operation=window.AICS_DRAFTS.remove(item.studio);
 else {button.disabled=false;return}
 Promise.resolve(operation).then(reload).catch(function(){button.disabled=false;window.alert('ဖျက်မရပါ။ Browser Storage ကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။')});
}
listNode.addEventListener('click',function(event){
 var button=event.target.closest('[data-history-action]');
 if(!button)return;
 var kind=button.getAttribute('data-kind');
 var id=button.getAttribute('data-id');
 var item=allItems.find(function(entry){return entry.kind===kind&&entry.sourceId===id});
 if(!item)return;
 var action=button.getAttribute('data-history-action');
 button.disabled=true;
 if(action==='delete'){removeItem(item,button);return}
 var operation=kind==='creation'?window.AICS_CREATIONS.toggleFav(id):window.AICS_IDEAS.toggleFavorite(id);
 Promise.resolve(operation).then(reload).catch(function(){button.disabled=false;window.alert('Favorite ပြောင်းမရပါ။')});
});
['historySearch','historyType','historyFavorite'].forEach(function(id){
 var node=document.getElementById(id);
 node.addEventListener(id==='historySearch'?'input':'change',render);
});
var token='';try{token=localStorage.getItem('aics_token')||''}catch(error){}
if(!token){loadingNode.textContent='History ကြည့်ရန် Login ဝင်ထားရန် လိုအပ်ပါသည်။';}
else reload();
})();
</script>
</body>
</html>`;

