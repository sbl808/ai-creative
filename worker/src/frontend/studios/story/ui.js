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

<div class="aics-section-label"><span class="aics-section-title">အခြေခံ သတ်မှတ်ချက်များ</span><span class="aics-section-sub">Essential Settings</span></div>
<div class="studio-form-grid">
<div class="form-group aics-cms-type-field">
<label for="storyTypeSel">ဇာတ်လမ်းအမျိုးအစား (Story Type)</label>
<select id="storyTypeSel" onchange="selectedStoryType=this.value;">
<option value="1" selected>ဇာတ်လမ်း (Free)</option>
<option value="2">ရုပ်ရှင် (Pro)</option>
<option value="3">ဇာတ်လမ်းတွဲ (Pro)</option>
<option value="4">ဇာတ်လမ်းတို (Pro)</option>
<option value="5">ဟာသဇာတ်လမ်း (Pro)</option>
</select>
</div>
<div class="form-group">
<label for="audSel">ပရိသတ် (Audience)</label>
<select id="audSel" onchange="window.aichAud=this.value;"><option>လူတိုင်း</option><option>လူငယ်</option><option>လူကြီး</option><option>ကလေး</option></select>
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
<textarea id="field_0" class="story-content-input" aria-required="true" placeholder="ဥပမာ — ရန်ကုန်မှာ အောင်မြင်မှုရဖို့ ကြိုးစားနေတဲ့ လူငယ်တစ်ယောက်ရဲ့ ခရီး..." oninput="onStoryContentInput()"></textarea>
<div class="form-error" id="field0Error">ဇာတ်လမ်းအကြောင်းအရာကို အနည်းဆုံး ဖြည့်ရေးပါ</div>
</div>

<button type="button" class="aics-advanced-toggle" id="advToggle" onclick="studioToggleAdvanced('advToggle','ideaFields')" aria-expanded="false"><span>&#8964; အပိုဆောင်းသတ်မှတ်ချက် (Advanced Settings)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="ideaFields" class="adv-grid aics-adv-panel" style="margin-top:2px;"></div>

<div class="error-box" id="genError"></div>
<button type="button" class="btn btn-primary story-generate-btn" id="genStoryBtn" onclick="generateStory()" disabled>&#10024; ဇာတ်လမ်းရေးသားရန်</button>
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
<div class="result-label">ဇာတ်လမ်း (Story)</div>
<textarea class="result-textarea" id="storyResult" placeholder="ဇာတ်လမ်း ဒီနေရာမှာ ပေါ်လာပါမယ်..." oninput="onStoryEdit()"></textarea>
<p class="result-hint">&#9997; ဒီနေရာမှာ တိုက်ရိုက် နှိပ်ပြီး ကိုယ်တိုင် ပြင်ဆင်နိုင်ပါတယ် — ပြင်ထားတဲ့ ဇာတ်လမ်းကို Video အဆင့်ကို အလိုအလျောက် ပို့ပေးပါမယ်</p>

<div class="story-actions-primary">
<button class="btn btn-primary story-action-primary" onclick="goToVideoForm()">&#127916; Video ဆက်ဖန်တီးရန်</button>
</div>
<div class="story-actions-secondary">
<button class="btn btn-secondary" onclick="focusRevise()">&#9999;&#65039; ပြန်ပြင်ရန်</button>
<button class="btn btn-secondary" onclick="copyStory()">&#128203; Copy</button>
<button class="btn btn-secondary" onclick="saveStory()">&#128190; သိမ်းရန်</button>
</div>
</div>
<div class="error-box" id="genError2"></div>
<div class="retry-row" id="genRetry2">
<button class="btn btn-primary" onclick="generateStory()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(1)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>
<div class="card revise-section" id="revise-section">
<button type="button" class="aics-advanced-toggle" id="reviseToggle" onclick="studioToggleAdvanced('reviseToggle','revisePanel')" aria-expanded="false"><span>&#8964; AI ကို ဆက်ညွှန်ကြားရန် (Revise with AI)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="revisePanel" class="aics-adv-panel revise-panel">
<p class="form-help" style="margin-bottom:10px;">ဥပမာ — 「နိဂုံးကို ပိုစိတ်လှုပ်ရှားစရာဖြစ်အောင် ပြင်ပါ」 ဆိုပြီး ရေးပြီး ပြင်ပါ ကို နှိပ်ပါ။</p>
<div class="revise-history" id="reviseHistory"></div>
<div class="revise-input-row">
<input type="text" id="feedbackInput" placeholder="ဥပမာ — နိဂုံးကို ပိုစိတ်ခံစားရအောင်ပြင်ပေးပါ" style="flex:1;" onkeypress="if(event.key==='Enter'){reviseStory();}">
<button class="btn btn-secondary" id="reviseBtn" onclick="reviseStory()">&#128260; ပြင်ပါ</button>
</div>
<div class="loading" id="revLoading"><div class="spinner"></div> ပြင်ဆင်နေပါသည်...</div>
<div class="error-box" id="revError"></div>
</div>
</div>
</div>`;

// ============================================================
// Step 03 — Video Branch: Video Setup Form
// (Story Result ကို အလိုအလျောက် ထည့်ပေးထားသည် — Essential + Advanced accordion)
// ============================================================
const STEP4_HTML = `
<div class="aics-step" data-step="3">
<div class="card">
<div class="card-title">&#127916; Video ဇာတ်လမ်းဖန်တီးရန် <span class="card-title-sub">(Video Creation)</span></div>
<div class="story-auto-status">&#10004; Story Result ကို အလိုအလျောက် ထည့်ထားသည်</div>
<p class="story-intro">Step 02 မှ ဇာတ်လမ်းကို အောက်မှာ Preview ကြည့်နိုင်ပါသည်။ Video အတွက် ဆက်တင်များ ရွေးပြီး ဖန်တီးပါ။</p>
<div class="form-group">
<label for="videoStoryInput">အသုံးပြုမည့် ဇာတ်လမ်း (Story to Use)</label>
<textarea id="videoStoryInput" class="video-story-input" oninput="autoExpand(this)"></textarea>
</div>

<div class="aics-section-label"><span class="aics-section-title">ဗီဒီယို သတ်မှတ်ချက်များ</span><span class="aics-section-sub">Video Settings</span></div>
<div class="vf-grid">
<div class="form-group"><label for="vidWorkflowSel">Video Workflow (Video တည်ဆောက်ပုံ)</label><select id="vidWorkflowSel"></select></div>
<div class="form-group"><label for="vidDurationSel">Video ကြာချိန် (Video Duration)</label><select id="vidDurationSel"></select></div>
<div class="form-group"><label for="vidSceneSel">Scene ကြာချိန် (Scene Duration)</label><select id="vidSceneSel"></select></div>
<div class="form-group"><label for="vidRatioSel">ပုံရိပ်အချိုး (Aspect Ratio)</label><select id="vidRatioSel"></select></div>
<div class="form-group"><label for="vidStyleSel">Visual Style (အမြင်ပုံစံ)</label><select id="vidStyleSel"></select></div>
<div class="form-group"><label for="vidCamSel">ကင်မရာစတိုင် (Camera Style)</label><select id="vidCamSel"></select></div>
<div class="form-group"><label for="vidLangSel">ဘာသာစကား (Language)</label><select id="vidLangSel"></select></div>
</div>

<button type="button" class="aics-advanced-toggle" id="vidAdvToggle" onclick="studioToggleAdvanced('vidAdvToggle','vidAdvFields')" aria-expanded="false"><span>&#8964; အပိုဆောင်း Video Settings (Advanced Video Settings)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="vidAdvFields" class="adv-grid aics-adv-panel" style="margin-top:2px;">
<div class="form-group adv-check">
<span class="group-label">ဇာတ်ကောင် ဆက်လက်ထားရှိမှု (Character Continuity)</span>
<label class="aics-check-row" for="vidContinuity"><input type="checkbox" id="vidContinuity" checked> Scene တိုင်းတွင် ဇာတ်ကောင် ID တူညီစွာ ထားပါ</label>
</div>
<div class="form-group adv-check">
<span class="group-label">ဇာတ်ကောင် ပုံစံတူညီမှု (Character Consistency)</span>
<label class="aics-check-row" for="vidConsistency"><input type="checkbox" id="vidConsistency" checked> ဇာတ်ကောင်အသွင်အပြင်ကို Scene တိုင်း တစ်သမတ်တည်း ဖော်ပြပါ</label>
</div>
<div class="form-group">
<label for="vidCharDir">&#127917; ဇာတ်ကောင် ဦးတည်ချက် (Character Direction)</label>
<input type="text" id="vidCharDir" placeholder="ဥပမာ — ရိုးရာ ဗုဒ္ဓဝတ်စုံ၊ လေးစားတဲ့ အမူအရာ...">
</div>
<div class="form-group">
<label for="vidCamDir">&#127909; Camera ဦးတည်ချက် (Camera Direction)</label>
<input type="text" id="vidCamDir" placeholder="ဥပမာ — slow dolly-in, close-up shots...">
</div>
<div class="form-group">
<label for="vidLighting">&#128161; အလင်းရောင် (Lighting)</label>
<input type="text" id="vidLighting" placeholder="ဥပမာ — soft golden hour, early dawn...">
</div>
<div class="form-group">
<label for="vidColorMood">&#127912; အရောင် / ခံစားချက် (Color / Mood)</label>
<input type="text" id="vidColorMood" placeholder="ဥပမာ — warm nostalgic tones, bittersweet...">
</div>
<div class="form-group">
<label for="vidEnvDetails">&#127757; ပတ်ဝန်းကျင် အသေးစိတ် (Environment Details)</label>
<input type="text" id="vidEnvDetails" placeholder="ဥပမာ — ရန်ကုန် ရပ်ကွက်၊ မိုးသစ်ပြီး...">
</div>
<div class="form-group">
<label for="vidTransition">&#127916; ကူးပြောင်း / အရှိန် (Transition / Pacing)</label>
<input type="text" id="vidTransition" placeholder="ဥပမာ — soft cross-fade, slow pacing...">
</div>
<div class="form-group adv-full">
<label for="vidAudio">&#128266; အသံ / အသံလမ်းညွှန် (Audio / Sound Direction)</label>
<textarea id="vidAudio" placeholder="ဥပမာ — နောက်ခံ ဇာတ်လမ်းသံ၊ မိုးသံ၊ ညင်သာတဲ့ တေးသံ..." style="min-height:64px;"></textarea>
</div>
<div class="form-group adv-full">
<label for="vidExtra">အပိုဆောင်း ညွှန်ကြားချက် (Additional Instructions)</label>
<textarea id="vidExtra" placeholder="ဥပမာ — နောက်ဆုံး Scene မှာ မိုးရွာပြီး စိတ်ခံစားချက်ကို ပိုဖော်ပြပါ..." style="min-height:70px;"></textarea>
</div>
</div>

<div class="error-box" id="planError"></div>
<button type="button" class="btn btn-primary video-generate-btn" id="videoPlanBtn" onclick="generateVideoPlan()">&#127916; Video ဇာတ်လမ်း ဖန်တီးရန်</button>
</div>
</div>`;

// ============================================================
// Step 04 — Video Branch Result (loading ကို ဤနေရာတွင်သာ ပြသည်)
// ============================================================
const STEP6_HTML = `
<div class="aics-step" data-step="4">
${aicsResultLoadingHtml('planLoading','AI ပြင်ဆင်နေသည်...')}
<div id="finalResult"></div>
<div class="error-box" id="planError5"></div>
<div class="retry-row" id="planRetry5">
<button class="btn btn-primary" onclick="generateVideoPlan()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="stGoForce(3)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>`;

const CONTENT_HTML = STEP1_HTML + STEP3_HTML + STEP4_HTML + STEP6_HTML;

export { STEPS, CONTENT_HTML };
