// AI Creative Studio — Content Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/content.js (v1).
import { aicsResultLoadingHtml } from '../../shared.js';
const STEPS = [
  { label: '01 အကြောင်းအရာ' },
  { label: '02 Content ရလဒ်', req: [1] },
];

// ============================================================
// Step 01 — အကြောင်းအရာ (Input)
// Essential (အမြဲမြင်ရ): Content Idea / Type / Audience / Tone / Language
// Advanced Settings (Accordion): Key Points / Main Message / Length / Generation Level / Additional Instructions
// ============================================================
const STEP1_HTML = `
<div class="aics-step" data-step="1">
<div class="card">
<div class="card-title">&#9997; အကြောင်းအရာ ရေးသားရန် (Create Content)</div>
<p class="form-help" style="margin-bottom:14px;">သင့် Content အကြံကို ထည့်ပြီး "&#10024; Content ရေးသားရန်" နှိပ်ပါ — AI က သင့်အတွက် Content ကို ရေးပေးပါမည်။</p>
<div class="form-group">
<label for="ideaInput">အကြောင်းအရာ (Content Idea) *</label>
<textarea id="ideaInput" placeholder="ဥပမာ — ကော်ဖီဆိုင်တစ်ဆိုင်အတွက် social media content ရေးပါ..." style="min-height:130px;"></textarea>
</div>
<div class="studio-form-grid">
<div class="form-group">
<label for="contentTypeSel">အမျိုးအစား (Content Type)</label>
<select id="contentTypeSel" onchange="updateConditionalFields()">
<option value="Social Media Post" selected>လူမှုမီဒီယာ Post (Social Media Post)</option>
<option value="Advertisement">ကြော်ငြာ (Advertisement)</option>
<option value="Product Promotion">ထုတ်ကုန် အရောင်းမြှင့်တင်မှု (Product Promotion)</option>
<option value="Marketing Copy">မားကတ်တင်း စာသား (Marketing Copy)</option>
<option value="Blog Post">ဘလော့ဂ် Post (Blog Post)</option>
<option value="Article">ဆောင်းပါး (Article)</option>
<option value="Educational Content">ပညာရေး အကြောင်းအရာ (Educational Content)</option>
<option value="Story / Narrative">ဇာတ်လမ်း / ပုံပြင် (Story / Narrative)</option>
<option value="Other">အခြား (Other)</option>
</select>
</div>
<div class="form-group">
<label for="audSel">ပရိသတ် (Audience)</label>
<select id="audSel">
<option>လူတိုင်း</option>
<option>လူငယ်</option>
<option>လူကြီး</option>
<option>ကလေး</option>
<option>စီးပွားရေးလုပ်ငန်း (Business)</option>
<option>ကျောင်းသား / ကျောင်းသူ (Students)</option>
<option>Gamer</option>
<option>မိဘများ (Parents)</option>
</select>
</div>
<div class="form-group">
<label for="toneSel">ရေးသားပုံစံ (Tone)</label>
<select id="toneSel">
<option>Professional</option>
<option>Friendly</option>
<option selected>Informative</option>
<option>Persuasive</option>
<option>Emotional</option>
<option>Creative</option>
<option>Casual</option>
</select>
</div>
<div class="form-group">
<label for="langSel">ဘာသာစကား (Language)</label>
<select id="langSel">
<option value="မြန်မာ" selected>မြန်မာ (Myanmar)</option>
<option value="English">English</option>
<option value="မြန်မာ + English">မြန်မာ + English</option>
<option value="中文">中文 (Chinese)</option>
<option value="ไทย">ไทย (Thai)</option>
<option value="Auto">ဘာသာစကားမရွေး (Auto)</option>
</select>
</div>
</div>
<div id="conditionalFields" class="conditional-fields" style="display:none;">
<div class="studio-form-grid">
<div class="form-group" id="platformGroup" style="display:none;">
<label for="platformSel">Platform</label>
<select id="platformSel">
<option>Facebook</option>
<option>Instagram</option>
<option>TikTok</option>
<option>X (Twitter)</option>
<option>LinkedIn</option>
<option>YouTube</option>
<option>Other</option>
</select>
</div>
<div class="form-group" id="productGroup" style="display:none;">
<label for="productInput">ထုတ်ကုန် / ဝန်ဆောင်မှု (Product / Service)</label>
<input id="productInput" placeholder="ဥပမာ — ကော်ဖီအသစ်...">
</div>
<div class="form-group" id="goalGroup" style="display:none;">
<label for="goalInput">ရည်ရွယ်ချက် (Goal)</label>
<input id="goalInput" placeholder="ဥပမာ — ရောင်းအားတိုးရန် / Brand Awareness...">
</div>
<div class="form-group" id="ctaGroup" style="display:none;">
<label for="ctaInput">CTA (လုပ်ဆောင်ရန် တိုက်တွန်းချက်)</label>
<input id="ctaInput" placeholder="ဥပမာ — အခုပဲ မှာယူပါ...">
</div>
</div>
</div>
<button type="button" class="aics-advanced-toggle" id="advToggle" onclick="studioToggleAdvanced('advToggle','advFields')" aria-expanded="false"><span>&#9881; Advanced Settings (အဆင့်မြင့် သတ်မှတ်ချက်များ)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="advFields" class="studio-form-grid aics-adv-panel">
<div class="form-group">
<label for="keyPoints">အဓိကအချက်များ (Key Points)</label>
<textarea id="keyPoints" placeholder="ထည့်သွင်းလိုသော အဓိကအချက်များ — တစ်ကြောင်းစီ ရေးပါ..."></textarea>
</div>
<div class="form-group">
<label for="mainMessage">အဓိကအကြောင်းအရာ (Main Message)</label>
<textarea id="mainMessage" placeholder="Content ရဲ့ အဓိက message တစ်ကြောင်းတည်း..."></textarea>
</div>
<div class="form-group">
<label for="lengthSel">Content အရှည် (Length)</label>
<select id="lengthSel">
<option value="Short">တို (Short)</option>
<option value="Medium" selected>အလယ်အလတ် (Medium)</option>
<option value="Long">ရှည် (Long)</option>
</select>
</div>
<div class="form-group aics-cms-type-field">
<label for="generationLevelSel">Generation Level (ထုတ်လုပ်မှုအဆင့်)</label>
<select id="generationLevelSel">
<option value="1" selected>Basic</option>
<option value="2">Standard</option>
<option value="3">Advanced</option>
<option value="4">Premium</option>
<option value="5">Ultimate</option>
</select>
<p class="form-help">Basic = FREE ၊ Standard – Ultimate = PRO သာ သုံးနိုင်ပါသည်။</p>
</div>
<div class="form-group" style="grid-column:1/-1;">
<label for="additionalInstr">ထပ်မံညွှန်ကြားချက် (Additional Instructions)</label>
<textarea id="additionalInstr" placeholder="AI ကို ထပ်မံ ညွှန်ကြားလိုသည်များ — ဥပမာ: စာကြောင်းတိုများဖြင့် ရေးပါ..."></textarea>
</div>
</div>
<button class="btn btn-primary" id="genBtn" onclick="generateContent()" style="margin-top:4px;">&#10024; Content ရေးသားရန်</button>
<div class="loading" id="genLoading"><div class="spinner"></div> AI ရေးသားနေသည်</div>
<div class="error-box" id="genError"></div>
</div>
</div>`;

// ============================================================
// Step 02 — Content ရလဒ် (+ Actions + Output Hub) — loading ကို ဤနေရာတွင်သာ ပြသည်
// Primary Actions: Video / Audio | Secondary: ပြန်ပြင်ရန် / Copy / သိမ်းရန်
// ============================================================
const STEP3_HTML = `
<div class="aics-step" data-step="2">
<div class="card">
<div class="card-title">&#128221; Content ရလဒ် (Result)</div>
${aicsResultLoadingHtml('contentLoading','AI ရေးသားနေသည်')}
<div id="contentResultBody">
<div id="noResultHint" class="empty-note">Result မရှိသေးပါ — "01 အကြောင်းအရာ" အဆင့်မှာ Generate နှိပ်ပါ</div>
<div class="result-grid" id="resultGrid" style="display:none;">
<div class="result-card">
<div class="result-card-header"><span class="result-card-label">ကွန်တင့် (Content)</span><button class="btn-ghost" onclick="copyText('contentOut')">&#128203; Copy</button></div>
<textarea class="result-card-body auto-expand" id="contentOut" placeholder="AI ရေးထားသော Content ကို ဤနေရာတွင် ပြပါမည် — ကိုယ်တိုင် ပြင်နိုင်ပါသည်" oninput="onContentEdit();autoGrow(this)"></textarea>
</div>
<div class="result-card">
<div class="result-card-header"><span class="result-card-label">ပြောဆိုပုံစံ (Speaking Style)</span><button class="btn-ghost" onclick="copyText('speakingOut')">&#128203; Copy</button></div>
<div class="result-card-body" id="speakingOut"></div>
</div>
<div class="result-card">
<div class="result-card-header"><span class="result-card-label">အသံပုံစံ (Voice Style)</span><button class="btn-ghost" onclick="copyText('voiceOut')">&#128203; Copy</button></div>
<div class="result-card-body" id="voiceOut"></div>
</div>
</div>
</div>
<div class="btn-row" id="resultActionsRow" style="display:none;margin-top:14px;">
<button class="btn btn-primary" onclick="openBranch('video')">&#127916; Video ဆက်ဖန်တီးရန်</button>
<button class="btn btn-secondary" onclick="openBranch('audio')">&#128266; အသံ ဆက်ဖန်တီးရန်</button>
<button class="btn-ghost" onclick="scrollToRevise()">&#9998; ပြန်ပြင်ရန်</button>
<button class="btn-ghost" onclick="copyAllResult()">&#128203; Copy</button>
<button class="btn btn-purple" onclick="saveContentResult()">&#128190; သိမ်းရန်</button>
</div>
<div class="error-box" id="genError2"></div>
<div class="btn-row" id="genRetryRow" style="display:none;justify-content:center;">
<button class="btn btn-secondary" onclick="csNav(1)">&#8592; ပြန်ပြင်ရန်</button>
<button class="btn btn-primary" onclick="generateContent()">&#128260; ပြန်လည်ကြိုးစားရန်</button>
</div>
</div>
</div>
<div class="aics-step" data-step="2b">
<div class="card">
<div class="card-title">&#128172; Edit — Quick Actions</div>
<p class="form-help" style="margin-bottom:12px;">လိုချင်တဲ့ ပြင်ဆင်မှုကို တစ်ချက်နှိပ်ရုံဖြင့် AI က ပြင်ပေးပါမယ် — သို့မဟုတ် အောက်မှာ ကိုယ်တိုင် ညွှန်ကြားချက် ရေးနိုင်ပါတယ်။</p>
<div class="type-chips" id="quickActions"></div>
<div class="revise-section" style="border-top:none;padding-top:0;">
<div class="revise-history" id="reviseHistory"></div>
<div class="revise-input-row">
<textarea id="feedbackInput" placeholder="ဘယ်လိုပြင်စေချင်လဲ? ဥပမာ — ပိုပြီး ရယ်စရာဖြစ်အောင်လုပ်ပါ..."></textarea>
<button class="btn btn-secondary" id="reviseBtn" onclick="reviseContent()">&#128260; ပြင်ပါ</button>
</div>
<div class="loading" id="revLoading"><div class="spinner"></div> ပြင်ဆင်နေပါသည်...</div>
<div class="error-box" id="revError"></div>
</div>
</div>
</div>
<div class="aics-step" data-step="2c">
<div class="aics-out-hub">
<div class="aics-out-hub-title">&#128640; ဆက်လက်ဖန်တီးရန်</div>
<p class="aics-out-hub-sub">သင့် Content ကို နောက်ထပ် Output အဖြစ် ဆက်လက်ဖန်တီးနိုင်ပါသည် — တစ်ခုချင်း သီးသန့် ရွေးနိုင်ပြီး ပြီးတိုင်း ဤနေရာသို့ ပြန်လာနိုင်ပါသည်။</p>
<div class="aics-out-cards">
<div class="aics-out-card">
<div class="aics-out-icon">&#127916;</div>
<div class="aics-out-title">Video</div>
<div class="aics-out-desc">Content &#8594; Video</div>
<button class="btn btn-primary aics-out-btn" onclick="openBranch('video')">&#127916; ဆက်ဖန်တီးရန်</button>
</div>
<div class="aics-out-card">
<div class="aics-out-icon">&#128266;</div>
<div class="aics-out-title">Audio</div>
<div class="aics-out-desc">Content &#8594; Audio</div>
<button class="btn btn-secondary aics-out-btn" onclick="openBranch('audio')">&#128266; ဆက်ဖန်တီးရန်</button>
</div>
</div>
</div>
</div>`;

// ============================================================
// Video Branch — Step 12 (Video Input) / 14 (Result) — AI Processing Step မရှိ
// Essential: Video Type / Duration / Aspect Ratio / Visual Style / Camera Style / Language
// Advanced Accordion: Scene Settings / Visual Settings / Reference / Additional Instructions
// ============================================================
const STEP12_HTML = `
<div class="aics-step" data-step="12">
<div class="card">
<div class="card-title">&#127916; Video ပြင်ဆင်ရန် (Video Setup)</div>
<div class="aics-transfer-note">&#10003; Content Result ကို အလိုအလျောက် ထည့်ထားသည်</div>
<div class="aics-transfer-box" id="videoContentPreview" style="display:none;"></div>
<div class="form-group">
<label for="videoContentText">ဗီဒီယိုအတွက် Content (Content for Video)</label>
<textarea id="videoContentText" class="auto-expand" placeholder="Content ကို အလိုအလျောက် ထည့်ပေးပါမည် — ကိုယ်တိုင်လည်း ပြင်နိုင်ပါသည်" oninput="autoGrow(this)"></textarea>
</div>
<div class="studio-form-grid">
<div class="form-group">
<label for="videoTypeSel">Video Type (ဗီဒီယိုအမျိုးအစား)</label>
<select id="videoTypeSel">
<option>Explainer</option>
<option>Tutorial</option>
<option selected>Product Showcase</option>
<option>Story / Narrative</option>
<option>Advertisement</option>
<option>Social Short</option>
<option>Documentary</option>
<option>Other</option>
</select>
</div>
<div class="form-group">
<label for="videoDuration">ကြာချိန် (Duration) — စက္ကန့်</label>
<input id="videoDuration" type="number" min="5" max="600" step="5" placeholder="ဥပမာ — 60" />
</div>
<div class="form-group">
<label for="videoAspect">အချိုးအစား (Aspect Ratio)</label>
<select id="videoAspect">
<option value="16:9" selected>16:9 (Landscape)</option>
<option value="9:16">9:16 (Vertical)</option>
<option value="1:1">1:1 (Square)</option>
<option value="4:3">4:3</option>
<option value="21:9">21:9 (Cinematic)</option>
</select>
</div>
<div class="form-group">
<label for="videoVisualStyle">ရုပ်ပုံပုံစံ (Visual Style)</label>
<select id="videoVisualStyle">
<option>Realistic</option>
<option>Cinematic</option>
<option>3D Animation</option>
<option>2D Animation</option>
<option>Anime</option>
<option>Minimalist</option>
<option>Vlog Style</option>
<option>Documentary</option>
</select>
</div>
<div class="form-group">
<label for="videoCameraStyle">ကင်မရာပုံစံ (Camera Style)</label>
<select id="videoCameraStyle">
<option selected>Static</option>
<option>Pan</option>
<option>Tilt</option>
<option>Tracking</option>
<option>Dolly</option>
<option>Zoom</option>
<option>Handheld</option>
<option>Drone</option>
</select>
</div>
<div class="form-group">
<label for="videoLanguage">ဘာသာစကား (Language)</label>
<select id="videoLanguage">
<option value="မြန်မာ" selected>မြန်မာ (Myanmar)</option>
<option value="English">English</option>
<option value="မြန်မာ + English">မြန်မာ + English</option>
<option value="中文">中文 (Chinese)</option>
<option value="ไทย">ไทย (Thai)</option>
<option value="Auto">ဘာသာစကားမရွေး (Auto)</option>
</select>
</div>
</div>
<button type="button" class="aics-advanced-toggle" id="videoAdvToggle" onclick="studioToggleAdvanced('videoAdvToggle','videoAdvFields')" aria-expanded="false"><span>&#9881; Advanced Settings (Scene / Visual / Reference)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="videoAdvFields" class="studio-form-grid aics-adv-panel">
<div class="form-group">
<label for="videoSceneSettings">Scene Settings (ဖြစ်စဉ် သတ်မှတ်ချက်)</label>
<textarea id="videoSceneSettings" placeholder="Scene အရေအတွက် / နေရာ / အချိန် စသည်တို့..."></textarea>
</div>
<div class="form-group">
<label for="videoVisualSettings">Visual Settings (ရုပ်ပုံ သတ်မှတ်ချက်)</label>
<textarea id="videoVisualSettings" placeholder="အရောင် / Lighting / Effect များ..."></textarea>
</div>
<div class="form-group">
<label for="videoMotion">Motion / Speed (လှုပ်ရှားမှု / အမြန်နှုန်း)</label>
<textarea id="videoMotion" placeholder="ဥပမာ — Slow Motion / Fast Cut / Timelapse..."></textarea>
</div>
<div class="form-group">
<label for="videoReference">ကိုးကားချက် (Reference)</label>
<textarea id="videoReference" placeholder="Video ဖန်တီးရာတွင် ကိုးကားလိုသည်များ..."></textarea>
</div>
<div class="form-group">
<label for="videoAdditionalInstructions">ထပ်မံညွှန်ကြားချက် (Additional Instructions)</label>
<textarea id="videoAdditionalInstructions" placeholder="AI ကို ထပ်မံ ညွှန်ကြားလိုသည်များ..."></textarea>
</div>
<div class="form-group aics-cms-type-field">
<label for="videoGenerationLevelSel">Generation Level (ထုတ်လုပ်မှုအဆင့်)</label>
<select id="videoGenerationLevelSel">
<option value="1" selected>Basic</option>
<option value="2">Standard</option>
<option value="3">Advanced</option>
<option value="4">Premium</option>
<option value="5">Ultimate</option>
</select>
</div>
</div>
<button class="btn btn-primary" id="videoGenBtn" onclick="generateVideo()">&#9654; Video Plan ဖန်တီးမယ်</button>
<div class="loading" id="videoGenLoading"><div class="spinner"></div> ဗီဒီယိုအစီအစဉ် ရေးဆွဲနေပါသည်...</div>
<div class="error-box" id="videoError"></div>
</div>
</div>`;

const STEP14_HTML = `
<div class="aics-step" data-step="14">
<div class="card">
<div class="card-title">&#127916; Video ရလဒ်</div>
${aicsResultLoadingHtml('videoLoading','AI က သင့်အတွက် Video ကို ပြင်ဆင်နေသည်...')}
<div id="videoResult" style="display:none;">
<div class="card" id="charactersCard" style="display:none;margin-top:16px;">
<div class="card-title">&#128100; ဇာတ်ကောင်များ (Characters)</div>
<div id="charactersList" class="characters-list"></div>
</div>
<div class="card">
<div class="card-title">&#127916; ဖြစ်စဉ်များ (Scenes)</div>
<div id="scenesList"></div>
</div>
</div>
<div class="error-box" id="videoError2"></div>
<div class="btn-row" id="videoRetryRow" style="display:none;justify-content:center;">
<button class="btn btn-secondary" onclick="csNav(12)">&#8592; ပြန်ပြင်ရန်</button>
<button class="btn btn-primary" onclick="generateVideo()">&#128260; ပြန်လည်ကြိုးစားရန်</button>
</div>
<div class="btn-row">
<button class="btn btn-secondary" onclick="backToContentResult()">&#8592; Content ရလဒ်သို့ ပြန်ရန်</button>
<button class="btn btn-purple" onclick="saveContentResult()">&#128190; ဖန်တီးမှုသိမ်းပါ</button>
</div>
</div>
</div>`;

// ============================================================
// Audio Branch — Step 22 (Audio Input) / 24 (Result) — AI Processing Step မရှိ
// Essential: အမျိုးသားအသံ / အမျိုးသမီးအသံ / Voice Style / Language / Speed / Pitch
// Advanced Accordion: Voice Direction / Emotion / Pronunciation
// ============================================================

export { STEPS, STEP1_HTML, STEP3_HTML, STEP12_HTML, STEP14_HTML };
