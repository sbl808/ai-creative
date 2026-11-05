// Idea Workspace — category-driven browser UI.
import { renderSidebar, sidebarScript } from './shared.js';
import { ideaFormsScript } from './ideas/forms.js';

export const IDEAS_HTML = `<!doctype html>
<html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Idea Workspace — AI Creative Studio</title>
<style>
:root{color-scheme:dark;--bg:#080c18;--card:#111a2e;--line:rgba(0,229,255,.2);--cyan:#00e5ff;--text:#e8ecf4;--muted:#9aa6bb;--red:#ff7272}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 'Noto Sans Myanmar',system-ui,sans-serif}
main{max-width:1000px;margin:auto;padding:24px 16px 56px}.hero{padding:18px 0 22px}.hero h1{margin:0 0 8px;font-size:28px;color:var(--cyan)}.muted{color:var(--muted)}.panel,.idea{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.field{display:flex;flex-direction:column;gap:6px}.field.full{grid-column:1/-1}label{font-weight:650}input,textarea,select{width:100%;background:#080f20;color:var(--text);border:1px solid #35425b;border-radius:9px;padding:11px;font:inherit}textarea{min-height:88px;resize:vertical}
button{border:0;border-radius:10px;padding:10px 15px;font:inherit;font-weight:700;cursor:pointer;background:var(--cyan);color:#041018}button.secondary{background:#26334b;color:var(--text);border:1px solid #44516a}button.danger{background:#512832;color:#fff}button:disabled{opacity:.55;cursor:wait}.actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.status{padding:10px 12px;border-radius:9px;background:#15233a;margin:12px 0;white-space:pre-wrap}.status.error{color:#ffaaaa;border:1px solid #7a3942}.ideas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.idea{margin:0}.idea h3{color:var(--cyan);margin:0 0 8px}.idea h4{margin:12px 0 3px;font-size:13px;color:#b5c2d7}.idea p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.saved-item{padding:12px 0;border-bottom:1px solid #2b3850}.saved-item:last-child{border-bottom:0}.small{font-size:13px}.handoff-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.handoff-actions button{font-size:12px;padding:8px 10px}
@media(max-width:760px){.grid,.ideas{grid-template-columns:1fr}.hero h1{font-size:23px}}
</style></head><body>
${renderSidebar('ideas')}
<main>
<header class="hero"><h1>💡 Idea Workspace</h1><p class="muted">Brief တစ်ခုမှ Idea ၃ ခု ထုတ်ပြီး ကိုယ့် Browser ထဲမှာ သီးခြားသိမ်းထားပါ။ Idea များကို Server/D1 တွင် မသိမ်းပါ။</p></header>
<section class="panel"><h2>Idea Brief</h2>
<div class="field full"><label for="ideaCategory">Idea အမျိုးအစား</label>
<select id="ideaCategory"><option value="story" selected>Story</option><option value="content">Content</option><option value="short">Short</option><option value="image">Image</option><option value="shop">Shop</option></select></div>
<div id="ideaFields" class="idea-fields"></div>
<div class="actions"><button id="generateBtn">Idea ၃ ခု ထုတ်ရန်</button></div><div id="status" class="status" hidden role="status"></div>
</section>
<section><h2>ထုတ်ပေးထားသော Ideas</h2><div id="results" class="ideas"><p class="muted">Brief ဖြည့်ပြီး Generate ကိုနှိပ်ပါ။</p></div></section>
<section class="panel"><h2>သိမ်းထားသော Ideas</h2><p class="muted small">ဒီစာရင်းက ဒီ Browser ရဲ့ IndexedDB ထဲမှာပဲ သိမ်းထားပါတယ်။ Browser data ဖျက်လျှင် ပျောက်နိုင်ပါတယ်။</p><div id="saved"><p class="muted">ဖတ်နေသည်…</p></div></section>
<section class="panel" id="ideaEditor" hidden><h2>Idea ပြင်ဆင်ရန်</h2><div class="grid">
<div class="field"><label for="editTitle">ခေါင်းစဉ်</label><input id="editTitle" maxlength="500"></div>
<div class="field"><label for="editStudio">အကြံပြု Studio</label><select id="editStudio"><option>story</option><option>content</option><option>short</option><option>image</option><option>voice</option><option>shop</option></select></div>
<div class="field full"><label for="editConcept">Concept</label><textarea id="editConcept"></textarea></div>
<div class="field full"><label for="editHook">Hook</label><textarea id="editHook"></textarea></div>
<div class="field full"><label for="editOutline">Outline</label><textarea id="editOutline"></textarea></div>
</div><div id="editCategoryFields"></div><div class="actions"><button id="saveEditBtn">ပြင်ဆင်ချက် သိမ်းရန်</button><button class="secondary" id="cancelEditBtn">မလုပ်တော့ပါ</button></div></section>
</main>
${sidebarScript()}
${ideaFormsScript()}
<script>
(function(){
'use strict';
var generated=[];
var categorySelect=el('ideaCategory');
window.AICS_IDEA_FORMS.mount(el('ideaFields'), categorySelect.value);
categorySelect.addEventListener('change',function(){window.AICS_IDEA_FORMS.mount(el('ideaFields'),categorySelect.value)});
function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')}
function showStatus(message,isError){var s=el('status');s.hidden=false;s.textContent=message;s.className='status'+(isError?' error':'')}
var generatedBrief=null;
var editingCategory='story';\nfunction makeResult(idea){return {title:idea.title,concept:idea.concept,hook:idea.hook,outline:idea.outline,suggestedStudio:idea.suggestedStudio}}
function saveIdea(idea){return window.AICS_IDEAS.create({category:generatedBrief&&generatedBrief.category||'story',fields:generatedBrief&&generatedBrief.formData||{},result:makeResult(idea)})}
function loadSaved(){return window.AICS_IDEAS.list()}
var editingIdeaId=null;
function closeEditor(){editingIdeaId=null;el('ideaEditor').hidden=true}
function openEditor(item){
 editingIdeaId=item.id;editingCategory=item.category;var result=item.result||{};
 el('editTitle').value=result.title||'';el('editStudio').value=result.suggestedStudio||'story';
 el('editConcept').value=result.concept||'';el('editHook').value=result.hook||'';el('editOutline').value=result.outline||'';
 window.AICS_IDEA_FORMS.mount(el('editCategoryFields'),item.category);
 Object.keys(item.fields||{}).forEach(function(key){var input=el('editCategoryFields').querySelector('#'+key);if(input)input.value=item.fields[key]});
 el('ideaEditor').hidden=false;el('ideaEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderSaved(){
 loadSaved().then(function(items){var target=el('saved');if(!items.length){target.innerHTML='<p class="muted">Idea မသိမ်းရသေးပါ။</p>';return}
 target.innerHTML=items.map(function(x){var r=x.result||{};return '<article class="saved-item"><strong>'+esc(r.title)+'</strong><p>'+esc(r.concept)+'</p><p class="muted small">'+esc(x.category)+' · '+(x.isFavorite?'⭐ Favorite':'')+' · '+esc(x.updatedAt||x.createdAt)+'</p><div class="actions"><button class="secondary" data-edit="'+esc(x.id)+'">ပြင်ရန်</button><button class="secondary" data-favorite="'+esc(x.id)+'">'+(x.isFavorite?'Favorite ဖြုတ်ရန်':'Favorite ထည့်ရန်')+'</button><button class="danger" data-delete="'+esc(x.id)+'">ဖျက်ရန်</button></div></article>'}).join('');
 target.querySelectorAll('[data-edit]').forEach(function(btn){btn.addEventListener('click',function(){var item=items.find(function(x){return x.id===btn.getAttribute('data-edit')});if(item)openEditor(item)})});
 target.querySelectorAll('[data-favorite]').forEach(function(btn){btn.addEventListener('click',function(){window.AICS_IDEAS.toggleFavorite(btn.getAttribute('data-favorite')).then(renderSaved).catch(function(){showStatus('Favorite ပြင်မရပါ။',true)})})});
 target.querySelectorAll('[data-delete]').forEach(function(btn){btn.addEventListener('click',function(){if(!confirm('ဒီ Idea ကို ဖျက်မှာ သေချာပါသလား?'))return;window.AICS_IDEAS.remove(btn.getAttribute('data-delete')).then(function(){if(editingIdeaId===btn.getAttribute('data-delete'))closeEditor();renderSaved()}).catch(function(){showStatus('Idea ဖျက်မရပါ။',true)})})});
 }).catch(function(){el('saved').innerHTML='<p class="muted">IndexedDB ကို ဖွင့်မရပါ။ Login ဝင်ထားမှုနှင့် Browser Storage ကို စစ်ဆေးပါ။</p>'})
}
el('saveEditBtn').addEventListener('click',function(){
 if(!editingIdeaId)return;
 var editorFields=el('editCategoryFields');var check=window.AICS_IDEA_FORMS.validate(editingCategory,editorFields);if(!check.ok){showStatus('လိုအပ်သော အချက်အလက် ဖြည့်ပါ။ ('+check.label+')',true);return}var fields=window.AICS_IDEA_FORMS.read(editingCategory,editorFields);
 var result={title:el('editTitle').value.trim(),concept:el('editConcept').value.trim(),hook:el('editHook').value.trim(),outline:el('editOutline').value.trim(),suggestedStudio:el('editStudio').value};
 if(Object.keys(fields).length===0||!result.title||!result.concept||!result.hook||!result.outline){showStatus('လိုအပ်သော အချက်အလက်အားလုံး ဖြည့်ပါ။',true);return}
 var btn=el('saveEditBtn');btn.disabled=true;
 window.AICS_IDEAS.update(editingIdeaId,{fields:fields,result:result}).then(function(){closeEditor();showStatus('Idea ပြင်ဆင်ချက် သိမ်းပြီးပါပြီ။');renderSaved()}).catch(function(){showStatus('ပြင်ဆင်ချက် သိမ်းမရပါ။',true)}).finally(function(){btn.disabled=false})
});
el('cancelEditBtn').addEventListener('click',closeEditor);
var TARGET_STUDIOS=[{id:'story',label:'Story'},{id:'content',label:'Content'},{id:'short',label:'Short'},{id:'image',label:'Image'},{id:'voice',label:'Voice'},{id:'shop',label:'Shop'}];
function ideaPayload(idea){return 'Idea: '+idea.title+'\\n\\nConcept: '+idea.concept+'\\n\\nHook: '+idea.hook+'\\n\\nOutline: '+idea.outline;}
function targetDraftKey(studio){return studio==='voice'?'aics_voice_workflow_v3':('aics_draft_'+studio);}
function targetHasDraft(studio){try{return !!(localStorage.getItem(targetDraftKey(studio))||(studio==='voice'&&localStorage.getItem('aics_draft_voice')))}catch(e){return true}}
function makeTargetDraft(studio,idea,payload){
 var now=new Date().toISOString();
 if(studio==='short')return {key:'aics_draft_short',value:{step:1,data:{stepNow:1,mode:'main',shortType:'1',fields:{0:payload},aud:'',dur:'',tone:'',lang:'',mainMsg:'',extraInstr:'',adv:{},short:'',shortIdea:payload,videoStarted:false,characters:[],scenes:[]},savedAt:now}};
 if(studio==='image')return {key:'aics_draft_image',value:{step:1,data:{stepNow:1,mode:'main',imageType:'1',aud:'',idea:payload,ideaText:payload,refCount:0,latestPrompt:'',prepPrompt:'',resultText:'',map:{subject:'',style:'',environment:'',lighting:'',camera:'',finalPrompt:''},finalPromptManual:false,hasFinalImage:false,finalImage:null},savedAt:now}};
 if(studio==='content')return {key:'aics_draft_content',value:{step:1,data:{mode:'content',csCur:1,idea:payload,generationLevel:'1',aud:'လူတိုင်း',contentType:'Social Media Post',tone:'',lang:'Burmese',platform:'Facebook',product:'',goal:'',cta:'',keyPoints:'',mainMessage:'',length:'',additionalInstr:'',videoContent:'',videoGenerationLevel:'1',videoTypeSel:'',videoDuration:'',videoAspect:'',videoVisualStyle:'',videoCameraStyle:'',videoMotion:'',videoLanguage:'',videoSceneSettings:'',videoVisualSettings:'',videoReference:'',videoAdditionalInstructions:'',ttsText:'',srt:'',srtTranslated:'',direction:'MY_TO_CN',lastResult:null,videoPlan:null,audio:null},savedAt:now}};
 if(studio==='shop')return {key:'aics_draft_shop',value:{step:1,data:{shopState:{mainStep:1,view:'content',content:{input:{idea:payload,type:'1',images:[]},result:''},video:{step:1,input:{text:'',type:'1',images:[],purpose:'Product Promotion'},result:{product:null,characters:[],scenes:[]}},audio:{step:1,input:{text:'',voiceName:'Puck',voiceGender:'male',purpose:'Product Description',settings:''},result:{data:'',mimeType:'audio/wav',url:'',voiceName:''},srt:{text:''},translation:{dir:'MY_TO_CN',srt:'',text:''}},image:{step:1,input:{text:'',images:[],purpose:'Product Image'},result:{data:'',mimeType:'image/png',url:'',prompt:''}}},contentType:'1',videoType:'1',fields:{prodDesc:payload},purpose:'1'},savedAt:now}};
 return null;
}
function handoffIdea(index,studio){
 var idea=generated[index];if(!idea){showStatus('Idea မရှိပါ။',true);return}
 var target=TARGET_STUDIOS.find(function(s){return s.id===studio});if(!target)return;
 var payload=ideaPayload(idea);
 if(studio==='story'){
  if(!window.AICS_HANDOFFS){showStatus('Idea ပို့ဆောင်မှု မရရှိပါ။ Page ကို ပြန်ဖွင့်ပြီး စမ်းပါ။',true);return}
  window.AICS_HANDOFFS.create({contractVersion:1,source:'ideas',target:'story',payload:idea})
   .then(function(result){showStatus('Idea Result ကို Story Studio သို့ ပို့နေပါသည်။');location.href='/app/story?handoff='+encodeURIComponent(result.id);})
   .catch(function(){showStatus('Idea Result ကို ပို့မရပါ။ Browser Storage ကို စစ်ဆေးပါ။',true)});
  return;
 }
 if(targetHasDraft(studio)&&!confirm(target.label+' Studio မှာ Draft ရှိပြီးသားပါ။ ဒီ Idea နဲ့ အစားထိုးမှာ သေချာပါသလား?\\n\\nCancel လုပ်လျှင် မူလ Draft ကို မပြောင်းပါ။'))return;
 try{
  if(studio==='voice')localStorage.setItem('aics_voice_transfer',JSON.stringify({text:payload,source:'ideas',audience:'လူတိုင်း'}));
  else{var draft=makeTargetDraft(studio,idea,payload);if(!draft)throw new Error('unsupported_studio');localStorage.setItem(draft.key,JSON.stringify(draft.value));}
  showStatus('Idea ကို '+target.label+' Studio သို့ လွှဲပို့နေပါသည်။');location.href='/app/'+studio;
 }catch(e){showStatus('Studio သို့ လွှဲမပို့နိုင်ပါ။ Browser Storage နေရာလွတ်နှင့် permission ကို စစ်ပါ။',true)}
}
function renderIdeas(){var target=el('results');if(!generated.length){target.innerHTML='<p class="muted">Idea မရှိသေးပါ။</p>';return}target.innerHTML=generated.map(function(x,i){return '<article class="idea"><h3>'+(i+1)+'. '+esc(x.title)+'</h3><h4>Concept</h4><p>'+esc(x.concept)+'</p><h4>Hook</h4><p>'+esc(x.hook)+'</p><h4>Outline</h4><p>'+esc(x.outline)+'</p><h4>အကြံပြု Studio</h4><p>'+esc(x.suggestedStudio)+'</p><div class="actions"><button data-save="'+i+'">Idea သိမ်းရန်</button></div><div class="handoff-actions">'+TARGET_STUDIOS.map(function(s){return '<button type="button" class="secondary" data-handoff="'+i+'" data-studio="'+s.id+'">→ '+s.label+'</button>'}).join('')+'</div></article>'}).join('');target.querySelectorAll('[data-save]').forEach(function(btn){btn.addEventListener('click',function(){var item=generated[Number(btn.getAttribute('data-save'))];btn.disabled=true;saveIdea(item).then(function(){showStatus('Idea ကို Local IndexedDB ထဲ သိမ်းပြီးပါပြီ။');renderSaved()}).catch(function(){showStatus('Idea မသိမ်းနိုင်ပါ။ Browser Storage နေရာလွတ်နှင့် permission ကို စစ်ပါ။',true)}).finally(function(){btn.disabled=false})})});target.querySelectorAll('[data-handoff]').forEach(function(btn){btn.addEventListener('click',function(){handoffIdea(Number(btn.getAttribute('data-handoff')),btn.getAttribute('data-studio'))})})}
el('generateBtn').addEventListener('click',function(){var category=categorySelect.value;var validation=window.AICS_IDEA_FORMS.validate(category);if(!validation.ok){showStatus('လိုအပ်သော အချက်အလက်ကို ဖြည့်ပါ။ ('+validation.label+')',true);return}var formData=window.AICS_IDEA_FORMS.read(category);var brief={category:category,formData:formData,idea:formData.idea,audience:formData.audience,goal:formData.goal,language:formData.language,platform:formData.platform,contentType:formData.contentType,count:3};var token='';try{token=localStorage.getItem('aics_token')||''}catch(e){}if(!token){showStatus('Login မဝင်ရသေးပါ။ အရင် Login ဝင်ပါ။',true);return}var btn=el('generateBtn');btn.disabled=true;btn.textContent='ထုတ်နေသည်…';showStatus('Idea ၃ ခု ထုတ်နေပါသည်။');fetch('/api/ideas/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(brief)}).then(function(res){return res.json().catch(function(){return {error:'invalid_response'}}).then(function(data){if(!res.ok){var e=new Error(data.error||'generation_failed');e.status=res.status;throw e}return data})}).then(function(data){if(!data||data.count!==3||!Array.isArray(data.ideas)||data.ideas.length!==3)throw new Error('invalid_ai_output');generated=data.ideas;generatedBrief=brief;renderIdeas();showStatus('Idea ၃ ခု ရရှိပါပြီ။ သိမ်းလိုသော Idea တစ်ခုချင်းစီကို Save လုပ်ပါ။')}).catch(function(e){var msg=e.message==='cms_prompt_missing'?'Admin CMS မှာ IDEAS Prompt ကို အရင်ထည့်သွင်းပါ။':e.message==='feature_disabled'?'Idea Workspace ကို Admin မှ ပိတ်ထားပါသည်။':e.message==='feature_settings_unavailable'?'Feature Settings ကို စစ်ဆေးမရပါ။ နောက်မှ ပြန်ကြိုးစားပါ။':e.message==='unauthorized'||e.message==='invalid_token'?'Session သက်တမ်းကုန်သွားနိုင်ပါသည်။ ပြန် Login ဝင်ပါ။':'Idea ထုတ်မရပါ ('+e.message+'). ခဏနေမှ ပြန်ကြိုးစားပါ။';showStatus(msg,true)}).finally(function(){btn.disabled=false;btn.textContent='Idea ၃ ခု ထုတ်ရန်'})});
renderSaved();
})();
</script></body></html>`;
