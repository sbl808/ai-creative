// AI Creative Studio — Short Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/short.js (v1).
import { aicsResultLoadingHtml } from '../../shared.js';
const STEPS = [
  { label: '01 Short အချက်အလက်' },
  { label: '02 Short Script ရလဒ်', req: [1] },
];

const STEP1_HTML = `
<div class="aics-step" data-step="1">
<div class="card">
<div class="card-title">&#128221;&#65039; Short အချက်အလက် ဖြည့်ရန်</div>
<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">Short Video / Short Content ရေးသားရန် လိုအပ်သော အချက်အလက်များကို အောက်တွင် ဖြည့်ပါ — Generate နှိပ်လိုက်ရင် AI က Short Script ရေးပေးပါမယ်။</p>
<div class="studio-form-grid">
<div class="form-group aics-cms-type-field" style="margin-bottom:0;">
<label>Short Type</label>
<select id="shortTypeSel"></select>
</div>
<div class="form-group" style="margin-bottom:0;">
<label>Duration</label>
<select id="durSel"></select>
</div>
</div>
<div class="studio-form-grid">
<div class="form-group" style="margin-bottom:0;">
<label>Tone</label>
<select id="toneSel"></select>
</div>
<div class="form-group" style="margin-bottom:0;">
<label>Language</label>
<select id="langSel"></select>
</div>
</div>
<div class="form-group">
<label>Topic / Idea *</label>
<textarea id="field_0" placeholder="ဥပမာ — မြန်မာပြည်ရဲ့ လက်ဖက်ရည်ဆိုင်ယဉ်ကျေးမှု အကြောင်း 30 စက္ကန့် Short..." style="min-height:110px;resize:vertical;"></textarea>
</div>
<div class="form-group">
<label>Target Audience</label>
<input type="text" id="audInput" placeholder="ဥပမာ — လူငယ်များ / Gen Z / စီးပွားရေးလုပ်ငန်းရှင်များ">
</div>
<div class="form-group">
<label>Main Message</label>
<textarea id="mainMsg" placeholder="ဥပမာ — ရိုးရာလက်ဖက်ရည်ဆိုင်က မြန်မာလူမှုဘဝရဲ့ နွေးထွေးမှုကို ဖော်ပြသည်" style="min-height:70px;"></textarea>
</div>
<div class="form-group">
<label>Additional Instructions</label>
<textarea id="extraInstr" placeholder="ဥပမာ — စိတ်ခံစားချက်ကို ပိုဖော်ပြပါ / အဆုံးမှာ Follow လုပ်ဖို့ တိုက်တွန်းပါ" style="min-height:70px;"></textarea>
</div>
<button type="button" class="aics-advanced-toggle" id="advToggle" onclick="studioToggleAdvanced('advToggle','advFields')" aria-expanded="false"><span>အပိုဆောင်းသတ်မှတ်ချက် (Advanced Options)</span><span class="aics-adv-arrow">▼</span></button>
<div id="advFields" class="adv-grid aics-adv-panel">
<div class="form-group"><label>Hook</label><textarea id="advHook" placeholder="ဥပမာ — "ဒီနေ့ မင်းတို့ကို မြန်မာတစ်ပြည်လုံး ချစ်တဲ့ လက်ဖက်ရည်ဆိုင် ပြပေးမယ်"" style="min-height:60px;"></textarea></div>
<div class="form-group"><label>Call To Action</label><textarea id="advCta" placeholder="ဥပမာ — Follow + Like နှိပ်ဖို့ မမေ့နဲ့နော်" style="min-height:60px;"></textarea></div>
<div class="form-group"><label>Character Information</label><textarea id="advCharInfo" placeholder="ဥပမာ — အသက် ၄၅ နှစ် ဆိုင်ရှင် ဦးဘ" style="min-height:60px;"></textarea></div>
<div class="form-group"><label>Location</label><input type="text" id="advLocation" placeholder="ဥပမာ — ရန်ကုန် / ကျေးရွာ"></div>
<div class="form-group"><label>Visual Style</label><input type="text" id="advVisualStyle" placeholder="ဥပမာ — Warm Tone / Cinematic"></div>
<div class="form-group"><label>Ending Style</label><input type="text" id="advEnding" placeholder="ဥပမာ — ပြုံးရွှင်သော အဆုံးသတ်"></div>
</div>
<div class="error-box" id="genError"></div>
</div>
</div>`;

// ============================================================
// Step 02 — Short Script ရလဒ် (Result — loading ကို ဤနေရာတွင်သာ ပြသည်)
// ============================================================
const STEP3_HTML = `
<div class="aics-step" data-step="2">
<div class="card">
<div class="card-title">&#128241; Short Script ရလဒ်</div>
${aicsResultLoadingHtml('shortLoading','AI က သင့်အတွက် Short Script ကို ရေးသားနေသည်...')}
<div id="shortResultBody">
<textarea class="result-textarea" id="shortResult" placeholder="Short Script ဒီနေရာမှာ ပေါ်လာပါမယ်..." oninput="onShortEdit()"></textarea>
<p style="color:var(--text3);font-size:12px;margin-top:6px;font-style:italic;">&#9997;&#65039; ဒီနေရာမှာ တိုက်ရိုက် နှိပ်ပြီး ကိုယ်တိုင် ပြင်ဆင်နိုင်ပါတယ် — ပြင်ထားတဲ့ Script ကို "Final Short Script" အဖြစ် Video အဆင့်ကို အလိုအလျောက် ပို့ပေးပါမယ်</p>
<div class="btn-row">
<button class="btn btn-success" onclick="copyShort()">&#128203; Copy Short</button>
<button class="btn btn-purple" onclick="saveShort()">&#128190; ဖန်တီးမှုသိမ်းပါ</button>
<button class="btn btn-secondary" onclick="focusRevise()">&#9999;&#65039; ပြန်ပြင်ရန်</button>
<button class="btn btn-primary" onclick="goToVideoForm()">&#127916; Video ဆက်ဖန်တီးရန်</button>
</div>
</div>
<div class="error-box" id="genError2"></div>
<div class="retry-row" id="genRetry2">
<button class="btn btn-primary" onclick="generateShort()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(1)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>
<div class="card revise-section" id="revise-section">
<div class="card-title">&#129302; AI ကို ဆက်ညွှန်ကြားရန် (Revise)</div>
<div class="revise-history" id="reviseHistory"></div>
<div class="revise-input-row">
<textarea id="feedbackInput" placeholder="ဥပမာ — Hook ကို ပိုပြင်းထန်အောင် ပြင်ပေးပါ" onkeypress="if(event.key==='Enter'){reviseShort();}"></textarea>
<button class="btn btn-secondary" id="reviseBtn" onclick="reviseShort()">&#128260; ပြင်ပါ</button>
</div>
<div class="loading" id="revLoading"><div class="spinner"></div> ပြင်ဆင်နေပါသည်...</div>
<div class="error-box" id="revError"></div>
</div>
</div>`;

const STEP4_HTML = `
<div class="aics-step" data-step="3">
<div class="card">
<div class="card-title">&#127916; Short Video ဖန်တီးရန်</div>
<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">Step 02 မှာ ရရှိထားသော Final Short Script ကို အလိုအလျောက် ထည့်ပေးထားပါသည် — Video အတွက် ဆက်တင်များရွေးပြီး ဖန်တီးပါ။</p>
<div class="form-group">
<label>&#128241; အသုံးပြုမည့် Short Script</label>
<textarea id="videoScriptInput" style="min-height:150px;" oninput="autoExpand(this)"></textarea>
</div>
<div class="vf-grid">
<div class="form-group"><label>Video Style</label><select id="vidStyleSel"></select></div>
<div class="form-group"><label>Aspect Ratio</label><select id="vidRatioSel"></select></div>
<div class="form-group"><label>Duration</label><select id="vidDurationSel"></select></div>
<div class="form-group"><label>Scene Duration</label><select id="vidSceneSel"></select></div>
<div class="form-group"><label>Visual Style</label><select id="vidVisualSel"></select></div>
<div class="form-group"><label>Camera Style</label><select id="vidCamSel"></select></div>
<div class="form-group"><label>Language</label><select id="vidLangSel"></select></div>
</div>
<label style="display:flex;align-items:center;gap:8px;margin:2px 0 16px;cursor:pointer;color:var(--text2);">
<input type="checkbox" id="vidContinuity" checked style="width:18px;height:18px;flex-shrink:0;accent-color:var(--cyan);"> &#10004; Maintain Same Character (Character Continuity)
</label>
<div class="form-group">
<label>Additional Instructions</label>
<textarea id="vidExtra" placeholder="ဥပမာ — နောက်ဆုံး Scene မှာ Logo ပြပါ / Background Music အရှိန်မြှင့်ပါ..." style="min-height:80px;"></textarea>
</div>
<div class="ref-upload-area">
<label>&#128444;&#65039; Reference ပုံများ ပူးတွဲရန် (ချန်ထားလို့ရသည်)</label>
<input type="file" id="refImageInput" accept="image/*" multiple onchange="onRefImageSelected()">
<p class="ref-hint">အများဆုံး ၅ ပုံအထိ Upload တင်နိုင်ပါတယ် (ပုံတစ်ပုံချင်းစီ Max 5MB) — Character/Scene ပုံများ တင်ထားရင် AI က ထိုပုံများကို ကိုးကားပြီး ဒီပုံနှင့် ကိုက်ညီသော Reference Prompt ရေးပေးပါမယ်။</p>
<div class="ref-preview" id="refPreview"></div>
</div>
<div class="error-box" id="planError"></div>
<div class="btn-row" style="margin-top:14px;">
<button class="btn btn-primary" id="shortVideoBtn" onclick="generateShortVideoPlan()" style="flex:1;">&#127916; Short Video ဖန်တီးရန်</button>
</div>
</div>
</div>`;

const STEP6_HTML = `
<div class="aics-step" data-step="4">
${aicsResultLoadingHtml('planLoading','AI က သင့်အတွက် Short Video ကို ပြင်ဆင်နေသည်...')}
<div id="finalResult"></div>
<div class="error-box" id="planError5"></div>
<div class="retry-row" id="planRetry5">
<button class="btn btn-primary" onclick="generateShortVideoPlan()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(3)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>`;

const CONTENT_HTML = STEP1_HTML + STEP3_HTML + STEP4_HTML + STEP6_HTML;

export { STEPS, CONTENT_HTML };
