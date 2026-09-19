// AI Creative Studio — Image Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/image.js (v1).
import { aicsResultLoadingHtml } from '../../shared.js';
const STEPS = [
  { label: '01 အချက်အလက်' },
  { label: '02 Prompt ရလဒ်', req: [1] },
];

const STEP1_HTML = `
<div class="aics-step" data-step="1">
<div class="card">
<div class="card-title">&#127912; Image ဖန်တီးရန် အချက်အလက်</div>
<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">Type ရွေးပြီး ပုံအကြောင်း အပြည့်အစုံ ဖော်ပြပါ — AI က သင့်အတွက် Image Prompt ပြင်ဆင်ပေးပါမယ်။</p>
<div class="studio-form-grid">
<div class="form-group aics-cms-type-field" style="margin-bottom:0;">
<label>ဓာတ်ပုံ အမျိုးအစား</label>
<select id="imgTypeSel" onchange="selectedImageType=this.value;">
<option value="1" selected>💡 Idea To Image (Free)</option>
<option value="2">👤 Character Design (Pro)</option>
<option value="3">📱 Social Media Thumbnail (Pro)</option>
<option value="4">🛒 Product Image (Pro)</option>
<option value="5">👤🛒 Character Product Ad (Pro)</option>
</select>
</div>
<div class="form-group" style="margin-bottom:0;">
<label>ဘယ်သူအတွက်</label>
<select id="audSel" onchange="window.aichAud=this.value;"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select>
</div>
</div>
<div class="form-group">
<label>ပုံဖော်ပြချင်တဲ့ အကြောင်းအရာ *</label>
<textarea id="ideaInput" placeholder="ဥပမာ — အသက် ၂၅ နှစ် အမျိုးသား၊ အနက်ရောင် Jacket ဝတ်ထားပြီး Tokyo ညဈေးလမ်းမှာ ရပ်နေသည်..." style="min-height:120px;" oninput="autoExpand(this)"></textarea>
</div>
<div class="ref-upload-area">
<label>&#128444; Reference ပုံများ ပူးတွဲရန် (ချန်ထားလို့ရသည်)</label>
<input type="file" id="refInput" accept="image/*" multiple onchange="onRefSelected()">
<p class="ref-hint">အများဆုံး ၅ ပုံအထိ Upload တင်နိုင်ပါတယ် (ပုံတစ်ပုံချင်းစီ Max 5MB) — Image→Image Mode အတွက် နောင်တွင် အသုံးပြုနိုင်ပါမည်</p>
<div class="ref-preview" id="refPreview"></div>
</div>
<div class="error-box" id="prepareErr"></div>
</div>
</div>`;

// ============================================================
// Step 02 — Prompt ရလဒ် (Result — loading ကို ဤနေရာတွင်သာ ပြသည်)
// ============================================================
const STEP3_HTML = `
<div class="aics-step" data-step="2">
<div class="card">
<div class="card-title">&#128221; Image Prompt Result</div>
${aicsResultLoadingHtml('promptLoading','AI က သင့်အတွက် Image Prompt ကို ပြင်ဆင်နေသည်...')}
<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">AI က သင့်အချက်အလက်ကို အခြေခံပြီး Image Prompt ပြင်ဆင်ပေးပြီးပါပြီ — အောက်က Prompt ကို တိုက်ရိုက် ပြင်ဆင်နိုင်ပါတယ်။</p>
<textarea class="result-textarea" id="promptResult" placeholder="Prompt ဒီနေရာမှာ ပေါ်ပါမယ် — တိုက်ရိုက်ပြင်နိုင်ပါတယ်" oninput="onPromptEdit(this)"></textarea>
<p class="hint-note">&#9997; ပြင်ဆင်ထားသော Prompt ကို နောက်အဆင့်သို့ အလိုအလျောက် ပို့ပေးပါမည် — Copy / Paste မလိုပါ</p>
<div class="error-box" id="prepareErr2"></div>
<div class="retry-row" id="prepareRetry">
<button class="btn btn-primary" onclick="preparePrompt()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(1)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>
</div>`;

const STEP4_HTML = `
<div class="aics-step" data-step="3">
<div class="card">
<div class="card-title">&#128295; Image ဖန်တီးရန် ပြင်ဆင်ခြင်း</div>
<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">Step 02 မှာ သင်ပြင်ဆင်ထားသော နောက်ဆုံး Prompt ကို အလိုအလျောက် ထည့်ပေးထားပါသည် — လိုအပ်ရင် ထပ်ပြင်ပြီး "AI ပုံဖန်တီးရန်" နှိပ်ပါ။</p>
<div class="form-group">
<label>&#128221; အသုံးပြုမည့် နောက်ဆုံး Prompt</label>
<textarea id="prepPromptInput" placeholder="Prompt ဒီနေရာမှာ အလိုအလျောက် ရောက်ပါမယ်" style="min-height:160px;" oninput="autoExpand(this)"></textarea>
</div>
<div class="error-box" id="genErr"></div>
</div>
</div>`;

const STEP6_HTML = `
<div class="aics-step" data-step="4">
${aicsResultLoadingHtml('imageLoading','AI က သင့်အတွက် ပုံကို ဖန်တီးနေသည်...')}
<div id="imageMapArea"></div>
<div class="error-box" id="genErr5"></div>
<div class="retry-row" id="genRetry5">
<button class="btn btn-primary" onclick="startGenerate()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(3)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>`;

const STEPS_HTML = STEP1_HTML + STEP3_HTML + STEP4_HTML + STEP6_HTML;

export { STEPS, STEPS_HTML };
