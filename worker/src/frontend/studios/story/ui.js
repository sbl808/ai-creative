// AI Creative Studio — Story Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/story.js (v1).
import { aicsResultLoadingHtml } from '../../shared.js';
const STEPS = [
  { label: '01 ဇာတ်လမ်းအချက်အလက်' },
  { label: '02 ဇာတ်လမ်းရလဒ်', req: [1] },
];

// ============================================================
// Step 01 — ဇာတ်လမ်းအချက်အလက် (Essential Settings + Advanced Settings Accordion)
// ============================================================
const STEP1_HTML = `
<div class="aics-step" data-step="1">
<div class="card">
<div class="card-title">&#128221; ဇာတ်လမ်းရေးရန် <span class="card-title-sub">(Story Creator)</span></div>
<p class="story-intro">ဇာတ်လမ်းအကြောင်းအရာ ဖြည့်ပြီး အောက်က <b>「ဇာတ်လမ်းရေးသားရန်」</b> ခလုတ်ကို နှိပ်လိုက်ရင် AI က သင့်အတွက် ဇာတ်လမ်းတစ်ပုဒ် အပြည့်အစုံ ရေးပေးပါမယ်။</p>

<div id="ideaHandoffPanel" class="card story-handoff-panel is-hidden" aria-live="polite">
<div class="card-title">&#128161; Idea Workspace မှ ရရှိသော Idea</div>
<div id="ideaHandoffSummary" class="story-intro story-handoff-summary"></div>
<p class="form-help">မူရင်း Idea Result ကို မပြောင်းလဲဘဲ ထားရှိပါမည်။ ဒီ Idea ကို Story အဖြစ် စတင်အသုံးပြုလိုမှ အောက်ပါခလုတ်ကို နှိပ်ပါ။</p>
<div class="story-actions-primary story-handoff-actions">
<button type="button" class="btn btn-primary" id="acceptIdeaHandoffBtn">ဒီ Idea နဲ့ Story စတင်ရန်</button>
<button type="button" class="btn btn-secondary" id="dismissIdeaHandoffBtn">မလုပ်တော့ပါ</button>
</div>
</div>

<div class="aics-section-label"><span class="aics-section-title">အခြေခံ သတ်မှတ်ချက်များ</span><span class="aics-section-sub">Essential Settings</span></div>
<div class="studio-form-grid">
<div class="form-group aics-cms-type-field">
<label for="storyTypeSel">ဇာတ်လမ်းအမျိုးအစား (Story Type)</label>
<select id="storyTypeSel" data-aics-change="story-type">
<option value="1" selected>ဇာတ်လမ်း (Free)</option>
<option value="2">ရုပ်ရှင် (Pro)</option>
<option value="3">ဇာတ်လမ်းတွဲ (Pro)</option>
<option value="4">ဇာတ်လမ်းတို (Pro)</option>
<option value="5">ဟာသဇာတ်လမ်း (Pro)</option>
</select>
</div>
<div class="form-group">
<label for="audSel">ပရိသတ် (Audience)</label>
<select id="audSel" data-aics-change="story-audience"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select>
</div>
<div class="form-group">
<label for="toneSel">ရေးသားပုံစံ (Tone)</label>
<select id="toneSel"><option>Emotional (စိတ်ခံစားမှု)</option><option>Dark (မှောင်မိုက်)</option><option>Light (ပေါ့ပါး)</option><option>Funny (ရယ်စရာ)</option><option>Epic (ခမ်းနား)</option><option>Mysterious (လျှို့ဝှက်ဆန်းကြယ်)</option></select>
</div>
<div class="form-group">
<label for="langSel">ဘာသာစကား (Language)</label>
<select id="langSel"><option>မြန်မာ (ဘာသာ)</option><option>English</option><option>မြန်မာ + English</option></select>
</div>
</div>

<div class="form-group story-content-group">
<label for="field_0">ဇာတ်လမ်းအကြောင်းအရာ (Story Content) <span class="req-star" aria-hidden="true">*</span></label>
<textarea id="field_0" class="story-content-input" aria-required="true" aria-describedby="field0Error" placeholder="ဥပမာ — ရန်ကုန်မှာ အောင်မြင်မှုရဖို့ ကြိုးစားနေတဲ့ လူငယ်တစ်ယောက်ရဲ့ ခရီး..." data-aics-input="story-content"></textarea>
<div class="form-error" id="field0Error" role="status" aria-live="polite">ဇာတ်လမ်းအကြောင်းအရာကို အနည်းဆုံး ဖြည့်ရေးပါ</div>
</div>

<button type="button" class="aics-advanced-toggle" id="advToggle" data-aics-action="story-advanced-toggle" aria-expanded="false"><span>&#8964; အပိုဆောင်းသတ်မှတ်ချက် (Advanced Settings)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="ideaFields" class="adv-grid aics-adv-panel story-idea-fields"></div>

<div class="error-box" id="genError" role="alert" aria-live="assertive"></div>
<button type="button" class="btn btn-primary story-generate-btn" id="genStoryBtn" data-aics-action="generate-story" disabled>&#10024; ဇာတ်လမ်းရေးသားရန်</button>
</div>
</div>`;

// ============================================================
// Step 02 — ဇာတ်လမ်းရလဒ် (Result — loading ကို ဤနေရာတွင်သာ ပြသည်)
// ============================================================
const STEP3_HTML = `
<div class="aics-step" data-step="2">
<div class="card">
<div class="card-title">&#128214; ဇာတ်လမ်းရလဒ် <span class="card-title-sub">(Story Result)</span></div>
${aicsResultLoadingHtml('storyLoading','AI ရေးသားနေသည်...')}
<div id="storyResultBody">
<label class="result-label" for="storyResult">ဇာတ်လမ်း (Story)</label>
<textarea class="result-textarea" id="storyResult" aria-describedby="storyResultHint" placeholder="ဇာတ်လမ်း ဒီနေရာမှာ ပေါ်လာပါမယ်..." data-aics-input="story-edit"></textarea>
<p class="result-hint" id="storyResultHint">&#9997; ဒီနေရာမှာ တိုက်ရိုက် နှိပ်ပြီး ကိုယ်တိုင် ပြင်ဆင်နိုင်ပါတယ် — ပြင်ထားတဲ့ ဇာတ်လမ်းကို Video အဆင့်ကို အလိုအလျောက် ပို့ပေးပါမယ်</p>

<div class="story-actions-primary">
<button class="btn btn-primary story-action-primary" data-aics-action="go-to-video-plan">&#127916; Video ဆက်ဖန်တီးရန်</button>
</div>
<div class="story-actions-secondary">
<button class="btn btn-secondary" data-aics-action="focus-revise">&#9999;&#65039; ပြန်ပြင်ရန်</button>
<button class="btn btn-secondary" data-aics-action="copy-story">&#128203; Copy</button>
<button class="btn btn-secondary" data-aics-action="save-story">&#128190; သိမ်းရန်</button>
</div>
</div>
<div class="error-box" id="genError2" role="alert" aria-live="assertive"></div>
<div class="retry-row" id="genRetry2">
<button class="btn btn-primary" data-aics-action="generate-story">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" data-aics-action="story-back-to-edit">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>
<div class="card revise-section" id="revise-section">
<button type="button" class="aics-advanced-toggle" id="reviseToggle" data-aics-action="revise-advanced-toggle" aria-expanded="false"><span>&#8964; AI ကို ဆက်ညွှန်ကြားရန် (Revise with AI)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="revisePanel" class="aics-adv-panel revise-panel">
<p class="form-help story-revise-help">ဥပမာ — 「နိဂုံးကို ပိုစိတ်လှုပ်ရှားစရာဖြစ်အောင် ပြင်ပါ」 ဆိုပြီး ရေးပြီး ပြင်ပါ ကို နှိပ်ပါ။</p>
<div class="revise-history" id="reviseHistory"></div>
<div class="revise-input-row">
<input type="text" id="feedbackInput" class="story-revise-input" placeholder="ဥပမာ — နိဂုံးကို ပိုစိတ်ခံစားရအောင်ပြင်ပေးပါ" data-aics-keydown="revise-story">
<button class="btn btn-secondary" id="reviseBtn" data-aics-action="revise-story">&#128260; ပြင်ပါ</button>
</div>
<div class="loading" id="revLoading"><div class="spinner"></div> ပြင်ဆင်နေပါသည်...</div>
<div class="error-box" id="revError" role="alert" aria-live="assertive"></div>
</div>
</div>
</div>`;

// ============================================================
const CONTENT_HTML = STEP1_HTML + STEP3_HTML;

export { STEPS, CONTENT_HTML };
