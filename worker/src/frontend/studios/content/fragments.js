// AI Creative Studio — Content Studio / fragments.js (V2 refactor)
// Additional HTML step fragments — extracted VERBATIM from frontend/content.js (v1).
// Split from ui.js so no generated file exceeds 500 lines (rule 9).
import { STEP1_HTML } from './ui.js';
import { STEP3_HTML } from './ui.js';
import { STEP12_HTML } from './ui.js';
import { STEP14_HTML } from './ui.js';import { aicsResultLoadingHtml } from '../../shared.js';
const STEP22_HTML = `
<div class="aics-step" data-step="22">
<div class="card">
<div class="card-title">&#128266; Audio ပြင်ဆင်ရန် (Audio Setup)</div>
<div class="aics-transfer-note">&#10003; Content Result ကို အလိုအလျောက် ထည့်ထားသည်</div>
<div class="aics-transfer-box" id="audioContentPreview" style="display:none;"></div>
<div class="form-group">
<label for="ttsText">အသံပြောင်းရန် Text (Text for Voice)</label>
<textarea id="ttsText" class="auto-expand" placeholder="Voice ပြောင်းလိုသော Text ကို အလိုအလျောက် ထည့်ပေးပါမည် — ကိုယ်တိုင်လည်း ပြင်နိုင်ပါသည်" oninput="autoGrow(this)"></textarea>
</div>
<div class="studio-form-grid">
<div class="form-group">
<label>Gender (ကျား / မ)</label>
<div class="gender-toggle" id="audioGender">
<label class="gender-opt"><input type="radio" name="audioGender" value="male" checked onchange="setVoiceGender('male')"><span>&#9794; Male</span></label>
<label class="gender-opt"><input type="radio" name="audioGender" value="female" onchange="setVoiceGender('female')"><span>&#9792; Female</span></label>
</div>
</div>
<div class="form-group">
<label for="voiceSel">အသံ (Voice)</label>
<select id="voiceSel" onchange="setEffectiveVoice()"></select>
</div>
<div class="form-group">
<label for="audioVoiceStyleSel">အသံပုံစံ (Voice Style)</label>
<select id="audioVoiceStyleSel">
<option>Natural</option>
<option>Animated</option>
<option>Calm</option>
<option>Energetic</option>
<option>Professional</option>
<option>Friendly</option>
<option>Serious</option>
<option>Warm</option>
</select>
</div>
<div class="form-group">
<label for="audioLangSel">ဘာသာစကား (Language)</label>
<select id="audioLangSel">
<option value="မြန်မာ" selected>မြန်မာ (Myanmar)</option>
<option value="English">English</option>
<option value="မြန်မာ + English">မြန်မာ + English</option>
<option value="中文">中文 (Chinese)</option>
<option value="ไทย">Thai</option>
</select>
</div>
<div class="form-group">
<label for="audioSpeed">Speed (အမြန်နှုန်း)</label>
<input id="audioSpeed" type="number" min="0.5" max="2" step="0.1" value="1" placeholder="1.0" />
</div>
<div class="form-group">
<label for="audioPitch">Pitch (အသံအနိမ့်အမြင့်)</label>
<input id="audioPitch" type="number" min="-10" max="10" step="1" value="0" placeholder="0" />
</div>
</div>
<div class="form-group" style="margin-top:2px;">
<label>လက်ရှိရွေးထားသော အသံ (Selected Voice)</label>
<div class="selected-voice-chip" id="effectiveVoiceLabel">Kore</div>
</div>
<button type="button" class="aics-advanced-toggle" id="audioAdvToggle" onclick="studioToggleAdvanced('audioAdvToggle','audioAdvFields')" aria-expanded="false"><span>&#9881; Advanced Settings (Voice Direction / Emotion / Pronunciation)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div id="audioAdvFields" class="studio-form-grid aics-adv-panel">
<div class="form-group">
<label for="audioDirection">Voice Direction (အသံလမ်းညွှန်)</label>
<textarea id="audioDirection" placeholder="ဥပမာ — နှေးနှေးနဲ့ ရှင်းရှင်းပြောပါ / စိတ်လှုပ်ရှားနေသလို ပြောပါ..."></textarea>
</div>
<div class="form-group">
<label for="audioEmotion">Emotion (စိတ်ခံစားမှု)</label>
<select id="audioEmotion">
<option value="Neutral" selected>Neutral</option>
<option value="Happy">Happy</option>
<option value="Sad">Sad</option>
<option value="Excited">Excited</option>
<option value="Calm">Calm</option>
<option value="Serious">Serious</option>
<option value="Warm">Warm</option>
</select>
</div>
<div class="form-group" style="grid-column:1/-1;">
<label for="audioPronunciation">Pronunciation (အသံထွက်)</label>
<textarea id="audioPronunciation" placeholder="အထူးထွက်ရမည့် စကားလုံးများ / အသံထွက်မှတ်စုများ..."></textarea>
</div>
</div>
<button class="btn btn-secondary" id="voiceBtn" onclick="generateVoice()">&#127908; Generate Voice</button>
<div class="loading" id="voiceGenLoading"><div class="spinner"></div> အသံဖန်တီးနေပါသည်...</div>
<div class="error-box" id="voiceError"></div>
</div>
</div>`;

const STEP24_HTML = `
<div class="aics-step" data-step="24">
<div class="card">
<div class="card-title">&#128266; Audio ရလဒ်</div>
${aicsResultLoadingHtml('audioLoading','AI က သင့်အတွက် အသံကို ပြင်ဆင်နေသည်...')}
<div class="audio-container" id="audioContainer"></div>
<div class="error-box" id="voiceError2"></div>
<div class="btn-row" id="voiceRetryRow" style="display:none;justify-content:center;">
<button class="btn btn-secondary" onclick="csNav(22)">&#8592; ပြန်ပြင်ရန်</button>
<button class="btn btn-primary" onclick="generateVoice()">&#128260; ပြန်လည်ကြိုးစားရန်</button>
</div>
<div class="btn-row">
<button class="btn-ghost" onclick="downloadAudio()">&#128190; Save Audio</button>
</div>
</div>
<div class="card">
<div class="card-title">&#127760; SRT &amp; ဘာသာပြန်</div>
<p class="voice-hint">Generate Voice နှိပ်ပြီးပြီးရင် SRT ကို အလိုအလျောက် ထုတ်နိုင်ပါတယ်။ Box ထဲမှာ တိုက်ရိုက် ပြင်ဆင်နိုင်ပါတယ်။</p>
<div class="btn-row" style="margin-top:12px;">
<button class="btn btn-secondary" id="srtBtn" onclick="generateSrt()">&#128221; Generate SRT (မူရင်း)</button>
</div>
<div class="loading" id="srtLoading"><div class="spinner"></div> SRT ထုတ်နေပါသည်...</div>
<div class="error-box" id="srtError"></div>
<textarea class="srt-box" id="resultSrt" placeholder="Generate Voice ပြီးရင် (သို့) ဒီခလုတ်ကို နှိပ်ရင် SRT ဒီနေရာမှာ ပေါ်ပါမယ်"></textarea>
<div class="btn-row">
<button class="btn-ghost" onclick="copyText('resultSrt')">&#128203; Copy SRT</button>
<button class="btn-ghost" onclick="downloadSrt('resultSrt','content_subtitle.srt')">&#128190; Save .srt</button>
</div>
<hr class="divider">
<p class="voice-hint">ဘာသာပြန်လိုသော ဘက်ကို ရွေးပြီး "ဘာသာပြန်ရန်" နှိပ်ပါ —</p>
<div class="direction-row">
<button class="btn btn-secondary" id="translateBtn" onclick="translateSrt()">&#127760; ဘာသာပြန်ရန်</button>
<div class="direction-chip selected" data-dir="my-to-cn" onclick="selectDirection(this)">&#127480;&#127415; &#8594; &#127464;&#127475; မြန်မာ &#8594; တရုတ်</div>
<div class="direction-chip" data-dir="cn-to-my" onclick="selectDirection(this)">&#127464;&#127475; &#8594; &#127480;&#127415; တရုတ် &#8594; မြန်မာ</div>
</div>
<div class="loading" id="translateLoading"><div class="spinner"></div> ဘာသာပြန်နေပါသည်...</div>
<div class="error-box" id="translateError"></div>
<div class="result-label" id="translatedLabel" style="display:none;">&#9989; ဘာသာပြန်ထားသော SRT</div>
<textarea class="srt-box" id="resultSrtTranslated" placeholder="('ဘာသာပြန်ရန်' ခလုတ်ကို နှိပ်ပါက ဒီနေရာတွင် ပေါ်ပါမည်)"></textarea>
<div class="btn-row">
<button class="btn-ghost" onclick="copyText('resultSrtTranslated')">&#128203; Copy SRT</button>
<button class="btn-ghost" onclick="downloadSrt('resultSrtTranslated','content_subtitle_translated.srt')">&#128190; Save .srt</button>
</div>
</div>
<div class="btn-row">
<button class="btn btn-secondary" onclick="backToContentResult()">&#8592; Content ရလဒ်သို့ ပြန်ရန်</button>
<button class="btn btn-purple" onclick="saveContentResult()">&#128190; ဖန်တီးမှုသိမ်းပါ</button>
</div>
</div>`;

const STEPS_HTML = STEP1_HTML + STEP3_HTML + STEP12_HTML + STEP14_HTML + STEP22_HTML + STEP24_HTML;

export { STEPS_HTML };
