// Story Video Plan — dedicated form and result UI fragments.
import { aicsResultLoadingHtml } from '../../../shared.js';

// Step 03 — Video Branch: Video Setup Form
// (Story Result ကို အလိုအလျောက် ထည့်ပေးထားသည် — Essential + Advanced accordion)
// ============================================================
const STEP4_HTML = `
<div class="aics-step" data-step="1">
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

<div class="error-box" id="planError" role="alert" aria-live="assertive"></div>
<button type="button" class="btn btn-primary video-generate-btn" id="videoPlanBtn" onclick="generateVideoPlan()">&#127916; Video ဇာတ်လမ်း ဖန်တီးရန်</button>
</div>
</div>`;

// ============================================================
// Step 04 — Video Branch Result (loading ကို ဤနေရာတွင်သာ ပြသည်)
// ============================================================
const STEP6_HTML = `
<div class="aics-step" data-step="2">
${aicsResultLoadingHtml('planLoading','AI ပြင်ဆင်နေသည်...')}
<div id="finalResult"></div>
<div class="error-box" id="planError5" role="alert" aria-live="assertive"></div>
<div class="retry-row" id="planRetry5">
<button class="btn btn-primary" onclick="generateVideoPlan()">&#128260; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="studioGoStep(1)">&#8592; ပြန်ပြင်ရန်</button>
</div>
</div>`;


const VIDEO_PLAN_CONTENT_HTML = STEP4_HTML + STEP6_HTML;

export { STEP4_HTML, STEP6_HTML, VIDEO_PLAN_CONTENT_HTML };
