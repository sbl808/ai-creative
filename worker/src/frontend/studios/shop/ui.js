// AI Creative Studio — Shop Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/shop.js (v1).
import { aicsResultLoadingHtml } from '../../shared.js';
const STEPS = [
  { label: 'Product Information' },
  { label: 'Product Content Result', req: [1] },
];

// ===================== MAIN STEP 01 — Product Information (Product/Commerce Form) =====================
// Essential Fields — အမြဲမြင်ရမည် | Advanced Fields — Accordion အတွင်း | 2-col (Desktop/iPad) / 1-col (Mobile)
const STEP1_HTML = `
<div class="aics-step" data-step="1">
<div class="card">
<div class="card-title">&#128722; Product Information — ကုန်ပစ္စည်း အချက်အလက်</div>
<p class="hint">သင့်ကုန်ပစ္စည်း အချက်အလက်များကို ဖြည့်ပါ — AI က Product Content ကို ဖန်တီးပေးပါမည်။ (Fill in your product details — AI creates your product content.)</p>
<div class="studio-form-grid">
<div class="form-group">
<label>ကုန်ပစ္စည်း အမည် (Product Name) *</label>
<input type="text" id="prodName" placeholder="ဥပမာ - Pearl Rice Cooker 1.8L">
</div>
<div class="form-group">
<label>အမျိုးအစား (Product Category)</label>
<input type="text" id="prodCategory" placeholder="ဥပမာ - အိမ်သုံးပစ္စည်း / Kitchen Appliance">
</div>
<div class="form-group span-2">
<label>ထုတ်ကုန် ဖော်ပြချက် (Product Description) *</label>
<textarea id="prodDesc" placeholder="ဥပမာ - Non-stick coating ပါသော ဆန်/ထမင်းအိုး၊ သုံးလုံးအစုံ၊ size 3 မျိုး..."></textarea>
</div>
<div class="form-group">
<label>အဓိကအင်္ဂါရပ်များ (Key Features)</label>
<textarea id="prodFeatures" placeholder="ဥပမာ - Non-stick / 5-layer coating / Digital timer"></textarea>
</div>
<div class="form-group">
<label>အကျိုးကျေးဇူးများ (Benefits)</label>
<textarea id="prodBenefits" placeholder="ဥပမာ - ထမင်း မကျွမ်းတော့ဘဲ သန့်ရှင်းလွယ်ကူ"></textarea>
</div>
<div class="form-group">
<label>စျေးနှုန်း (Price)</label>
<input type="text" id="prodPrice" placeholder="ဥပမာ - 58,000">
</div>
<div class="form-group">
<label>ငွေကြေး (Currency)</label>
<select id="prodCurrency"><option value="MMK" selected>MMK (မြန်မာကျပ်)</option><option value="USD">USD</option><option value="THB">THB (ထိုင်းဘတ်)</option><option value="CNY">CNY (ယွမ်)</option><option value="SGD">SGD</option><option value="EUR">EUR</option><option value="JPY">JPY</option><option value="GBP">GBP</option><option value="INR">INR</option><option value="VND">VND</option><option value="MYR">MYR</option><option value="IDR">IDR</option><option value="Other">Other (အခြား)</option></select>
</div>
<div class="form-group">
<label>ပစ်မှတ်ဖောက်သည် (Target Customer)</label>
<input type="text" id="prodTarget" placeholder="ဥပမာ - မိသားစုသုံး / အမျိုးသမီးများ / လူငယ်">
</div>
<div class="form-group">
<label>အမှတ်တံဆိပ် (Brand Name)</label>
<input type="text" id="prodBrand" placeholder="ဥပမာ - MyBrand">
</div>
<div class="form-group">
<label>ဘာသာစကား (Language)</label>
<select id="prodLang"><option value="မြန်မာ" selected>မြန်မာ (Burmese)</option><option value="English">English</option><option value="တရုတ်">တရုတ် (Chinese)</option><option value="ထိုင်း">ထိုင်း (Thai)</option><option value="ဂျပန်">ဂျပန် (Japanese)</option><option value="ကိုရီးယား">ကိုရီးယား (Korean)</option><option value="အခြား">အခြား (Other)</option></select>
</div>
<div class="form-group aics-cms-type-field">
<label>Content Purpose (Content Purpose)</label>
<select id="contentPurposeSel" onchange="contentType=this.value;">
<option value="1" selected>&#128230; Product Description (Free)</option>
<option value="2">&#128176; Sales Copy (Pro)</option>
<option value="3">&#128241; Social Media (Pro)</option>
<option value="4">&#128226; Advertisement (Pro)</option>
<option value="5">&#127881; Promotional Content (Pro)</option>
</select>
</div>
</div>
<button type="button" class="aics-advanced-toggle" id="advProductToggle" aria-expanded="false" onclick="studioToggleAdvanced('advProductToggle','advProductPanel')"><span>&#9660; Advanced Product Details (အဆင့်မြင့် အချက်အလက်)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div class="aics-adv-panel adv-grid" id="advProductPanel">
<div class="form-group"><label>USP / အဓိကအားသာချက် (USP)</label><input type="text" id="advUsp" placeholder="ဥပမာ - ဈေးကွက်တွင် တစ်ခုတည်းသော ..."></div>
<div class="form-group"><label>Offer / Discount (လျှော့စျေး)</label><input type="text" id="advOffer" placeholder="ဥပမာ - ၂၀% လျှော့စျေး / Free Delivery"></div>
<div class="form-group"><label>CTA (လုပ်ဆောင်ရန် တိုက်တွန်းချက်)</label><input type="text" id="advCta" placeholder="ဥပမာ - ယခုပဲ မှာယူလိုက်ပါ"></div>
<div class="form-group"><label>Brand Tone (အမှတ်တံဆိပ် လေသံ)</label><input type="text" id="advTone" placeholder="ဥပမာ - ယုံကြည်စိတ်ချရသော / ဖော်ရွေသော"></div>
<div class="form-group"><label>Delivery Information (ပို့ဆောင်မှု)</label><input type="text" id="advDelivery" placeholder="ဥပမာ - တစ်နိုင်ငံလုံး ပို့ဆောင်ပေးပါသည်"></div>
<div class="form-group"><label>Warranty (အာမခံ)</label><input type="text" id="advWarranty" placeholder="ဥပမာ - ၁ နှစ် Warranty"></div>
<div class="form-group"><label>Shop Link (ဆိုင်လင့်)</label><input type="text" id="advShopLink" placeholder="https://..."></div>
<div class="form-group"><label>Additional Instructions (ထပ်ဆောင်း ညွှန်ကြားချက်)</label><textarea id="advInstructions" placeholder="ထည့်သွင်းလိုသော အခြား ညွှန်ကြားချက်"></textarea></div>
<div class="form-group span-2"><label>Reference (ရည်ညွှန်း)</label><textarea id="advReference" placeholder="ပြင်ပ အချက်အလက် / ရည်ညွှန်းချက်များ"></textarea></div>
</div>
<div class="form-group">
<label>&#128444; Product Reference ပုံများ ပူးတွဲရန် (Optional — အများဆုံး ၅ ပုံ / Preview + Remove လုပ်နိုင်သည်)</label>
<input type="file" id="refImgContent" accept="image/*" multiple>
<div class="ref-preview" id="refPreviewContent"></div>
</div>
<div class="btn-row" style="margin-top:6px;">
<button class="btn btn-primary" onclick="generateContent()">&#10024; Product Content ဖန်တီးရန်</button>
</div>
</div>
</div>`;

// ===================== MAIN STEP 02 — Product Content ရလဒ် + Output Hub + Branch ၃ ခု =====================
const STEP3_HTML = `
<div class="aics-step" data-step="2">

<!-- ===== BRANCH STEPPER (Main Stepper အောက်တွင် သီးခြားပြသည် — Branch ထဲဝင်မှသာ မြင်ရမည်) ===== -->
<div class="shop-branch-stepper" id="shopBranchStepper" style="display:none;"></div>

<!-- ===== VIEW: Product Content Result + Output Hub ===== -->
<div id="viewContent">
<div class="shop-view-head">
<span class="shop-view-title">&#128221; Product Content ရလဒ် (Product Content Result)</span>
</div>
<div class="card">
<div class="card-title">&#9997;&#65039; AI ရေးသားထားသော Product Content <span class="edit-hint">&#9999;&#65039; ပြင်ဆင်လို့ရသည်</span></div>
${aicsResultLoadingHtml('contentLoading','AI ရေးသားနေသည်...')}
<div id="shopContentResultBody">
<textarea class="shop-result" id="resultContent" placeholder="(Generate လုပ်ပြီးရင် ဒီနေရာမှာ ပေါ်ပါမယ် — တိုက်ရိုက် ပြင်ဆင်နိုင်ပါတယ်)" oninput="onContentEdit()"></textarea>
<div class="btn-row">
<button class="btn btn-green btn-sm" onclick="copyResult()">&#128203; Copy</button>
<button class="btn btn-purple btn-sm" onclick="saveContent()">&#128190; သိမ်းရန်</button>
<button class="btn btn-secondary btn-sm" onclick="toggleChat()">&#9999;&#65039; ပြန်ပြင်ရန်</button>
</div>
<div class="chat-section" id="chatSection">
<div class="chat-log" id="chatLog"></div>
<div class="chat-input-row">
<input type="text" id="chatInput" placeholder="ဥပမာ - ပိုစိတ်ခံစားရအောင် ပြင်ပေးပါ" onkeypress="if(event.key==='Enter')sendRevision()">
<button class="btn btn-primary btn-sm" onclick="sendRevision()">ပြင်ပါ</button>
</div>
<div class="loading" id="loadingChat">&#9203; ပြင်ဆင်နေပါသည်...</div>
</div>
</div>
<div class="error-box" id="step2Err"></div>
<div class="retry-row" id="step2Retry">
<button class="btn btn-primary" onclick="retryContent()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="studioGoStep(1)">&#8592; နောက်သို့</button>
</div>
</div>

<!-- ===== OUTPUT HUB — ဘာဆက်ဖန်တီးမလဲ? ===== -->
<div class="shop-out-hub">
<div class="shop-out-hub-title">&#10067; ဘာဆက်ဖန်တီးမလဲ? (What would you like to create next?)</div>
<div class="shop-out-cards">
<div class="branch-action-card" onclick="goVideoBranch()">
<div class="ba-icon">&#127916;</div>
<div class="ba-title">Video ဆက်ဖန်တီးရန်</div>
<div class="ba-sub">Product / Character / Scene — Video Plan</div>
</div>
<div class="branch-action-card" onclick="goAudioBranch()">
<div class="ba-icon">&#128266;</div>
<div class="ba-title">အသံ ဆက်ဖန်တီးရန်</div>
<div class="ba-sub">Voice / SRT / ဘာသာပြန်</div>
</div>
<div class="branch-action-card" onclick="goImageBranch()">
<div class="ba-icon">&#128444;</div>
<div class="ba-title">Image ဆက်ဖန်တီးရန်</div>
<div class="ba-sub">Product Image / Showcase / Ad Visual</div>
</div>
</div>
</div>
</div>

<!-- ===== VIEW: VIDEO BRANCH ===== -->
<div id="viewVideo" style="display:none;">
<div class="card" id="videoSetupCard">
<div class="card-title">&#127916; Video ပြင်ဆင်ရန် (Video Setup)</div>
<div class="auto-note">&#9989; Product Content Result ကို အလိုအလျောက် ထည့်ထားသည်</div>
<div class="form-group">
<label>Product Content * (Video ဖန်တီးရန် Content)</label>
<textarea id="videoText" class="shop-result" style="min-height:120px;" oninput="onVideoTextEdit()"></textarea>
</div>
<div class="studio-form-grid">
<div class="form-group">
<label>Video Purpose (Video Purpose)</label>
<select id="videoPurposeSel"><option value="Product Promotion" selected>Product Promotion</option><option value="Brand Story">Brand Story</option><option value="Product Showcase">Product Showcase</option><option value="Social Media Ad">Social Media Ad</option><option value="Tutorial / Demo">Tutorial / Demo</option></select>
</div>
<div class="form-group">
<label>Video Type (Video Type)</label>
<div class="type-chips" id="videoTypes"></div>
</div>
</div>
<button type="button" class="aics-advanced-toggle" id="advVideoToggle" aria-expanded="false" onclick="studioToggleAdvanced('advVideoToggle','advVideoPanel')"><span>&#9660; Advanced Video Settings (အဆင့်မြင့် ဆက်တင်များ)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div class="aics-adv-panel adv-grid" id="advVideoPanel">
<div class="form-group"><label>Duration (ကြာချိန်)</label><select id="videoDuration"><option value="15">15 sec</option><option value="30" selected>30 sec</option><option value="45">45 sec</option><option value="60">60 sec</option><option value="90">90 sec</option><option value="120">120 sec</option></select></div>
<div class="form-group"><label>Aspect Ratio (ပုံအချိုး)</label><select id="videoRatio"><option value="9:16" selected>9:16 (Vertical)</option><option value="16:9">16:9 (Horizontal)</option><option value="1:1">1:1 (Square)</option><option value="4:5">4:5</option><option value="21:9">21:9 (Cinematic)</option></select></div>
<div class="form-group"><label>Visual Style (ပုံစံ)</label><input type="text" id="videoVisualStyle" placeholder="ဥပမာ - Cinematic / Bright / Minimal"></div>
<div class="form-group"><label>Camera Style (ကင်မရာပုံစံ)</label><input type="text" id="videoCameraStyle" placeholder="ဥပမာ - Close-up / Product Orbit / Slow pan"></div>
<div class="form-group"><label>Platform (ပလက်ဖောင်း)</label><select id="videoPlatform"><option value="Facebook" selected>Facebook</option><option value="TikTok">TikTok</option><option value="YouTube">YouTube</option><option value="Instagram">Instagram</option><option value="Shop Page">Shop Page</option><option value="Website">Website</option></select></div>
<div class="form-group"><label>Scene Direction (Scene ညွှန်ကြားချက်)</label><textarea id="videoSceneDir" placeholder="ဥပမာ - Product ကို အရင်ပြပြီး နောက်ဆုံးမှာ CTA"></textarea></div>
<div class="form-group span-2"><label>Additional Instructions (ထပ်ဆောင်း ညွှန်ကြားချက်)</label><textarea id="videoInstructions" placeholder="လိုအပ်သော အခြား ညွှန်ကြားချက်များ"></textarea></div>
</div>
<div class="form-group">
<label>&#128444; Product Reference ပုံများ ပူးတွဲရန် (ချန်ထားလို့ရသည် — အများဆုံး ၅ ပုံ)</label>
<input type="file" id="refImgVideo" accept="image/*" multiple>
<div class="ref-preview" id="refPreviewVideo"></div>
</div>
<div class="error-box" id="videoErr"></div>
<div class="btn-row">
<button class="btn btn-primary" id="genVideoBtn" onclick="generateVideo()">&#127916; Video Plan ဖန်တီးရန်</button>
</div>
</div>

<div class="card" id="videoResultCard" style="display:none;">
<div class="card-title">&#127916; Video Plan ရလဒ် — Story Map</div>
${aicsResultLoadingHtml('videoLoading','AI ပြင်ဆင်နေသည်...')}
<div id="videoResultMap"></div>
<div class="error-box" id="videoLoadingErr"></div>
<div class="retry-row" id="videoLoadingRetry">
<button class="btn btn-primary" onclick="retryVideo()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="backFromVideoLoading()">&#8592; နောက်သို့</button>
</div>
<div class="btn-row" style="margin-top:16px;">
<button class="btn btn-green" onclick="copyAllVideo()">&#128203; Copy</button>
<button class="btn btn-purple" onclick="saveAllVideo()">&#128190; ဖန်တီးမှုအားလုံးသိမ်း</button>
</div>
</div>
</div>

<!-- ===== VIEW: AUDIO BRANCH ===== -->
<div id="viewAudio" style="display:none;">
<div class="card" id="audioSetupCard">
<div class="card-title">&#128266; Audio ပြင်ဆင်ရန် (Audio Setup)</div>
<div class="auto-note">&#9989; Product Content Result ကို အလိုအလျောက် ထည့်ထားသည်</div>
<div class="form-group">
<label>အသံဖတ်ရန် စာသား * (Product Content)</label>
<textarea id="audioText" class="shop-result" style="min-height:120px;" oninput="onAudioTextEdit()"></textarea>
</div>
<div class="studio-form-grid">
<div class="form-group">
<label>Audio Purpose (Audio Purpose)</label>
<select id="audioPurposeSel"><option value="Product Description" selected>Product Description</option><option value="Sales Voice">Sales Voice</option><option value="Promotional Voice">Promotional Voice</option><option value="Advertisement Voice">Advertisement Voice</option><option value="Social Media Voice">Social Media Voice</option></select>
</div>
<div class="form-group">
<label>Voice Gender (အသံ — ကျား / မ)</label>
<div class="gender-toggle" id="audioGender">
<label class="gender-opt"><input type="radio" name="audioGender" value="male" checked onchange="setVoiceGender('male')"><span>&#9794; Male</span></label>
<label class="gender-opt"><input type="radio" name="audioGender" value="female" onchange="setVoiceGender('female')"><span>&#9792; Female</span></label>
</div>
</div>
</div>
<div class="form-group">
<label>&#127908; Voice ရွေးချယ်ရန် (Voice Selection)</label>
<select id="voiceSelect" onchange="onVoiceChange()"></select>
</div>
<button type="button" class="aics-advanced-toggle" id="advAudioToggle" aria-expanded="false" onclick="studioToggleAdvanced('advAudioToggle','advAudioPanel')"><span>&#9660; Advanced Audio Settings (အဆင့်မြင့် ဆက်တင်များ)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div class="aics-adv-panel adv-grid" id="advAudioPanel">
<div class="form-group"><label>Voice Style (အသံပုံစံ)</label><input type="text" id="audioVoiceStyleSel" placeholder="ဥပမာ - Friendly / Professional / Energetic"></div>
<div class="form-group"><label>Language (ဘာသာစကား)</label><select id="audioLangSel"><option value="မြန်မာ" selected>မြန်မာ</option><option value="English">English</option><option value="တရုတ်">တရုတ်</option><option value="ထိုင်း">ထိုင်း</option><option value="ဂျပန်">ဂျပန်</option></select></div>
<div class="form-group"><label>Speed (အမြန်နှုန်း)</label><select id="audioSpeed"><option value="0.75">0.75x (နှေး)</option><option value="1.0" selected>1.0x (ပုံမှန်)</option><option value="1.25">1.25x (အနည်းငယ် မြန်)</option><option value="1.5">1.5x (မြန်)</option><option value="2.0">2.0x (အမြန်)</option></select></div>
<div class="form-group"><label>Pitch (အသံနိမ့်မြင့်)</label><select id="audioPitch"><option value="Low">Low</option><option value="Normal" selected>Normal</option><option value="High">High</option></select></div>
<div class="form-group"><label>Emotion (စိတ်ခံစားချက်)</label><select id="audioEmotion"><option value="Neutral" selected>Neutral</option><option value="Happy">Happy</option><option value="Excited">Excited</option><option value="Calm">Calm</option><option value="Serious">Serious</option><option value="Warm">Warm</option></select></div>
<div class="form-group"><label>Pronunciation (အသံထွက်)</label><textarea id="audioPronunciation" placeholder="အသံထွက် သတ်မှတ်ချက်များ"></textarea></div>
<div class="form-group span-2"><label>Additional Instructions (ထပ်ဆောင်း ညွှန်ကြားချက်)</label><textarea id="audioInstructions" placeholder="အသံဖတ်ရာတွင် ထည့်သွင်းလိုသော ညွှန်ကြားချက်"></textarea></div>
</div>
<div class="error-box" id="audioErr"></div>
<div class="btn-row">
<button class="btn btn-primary" id="genAudioBtn" onclick="generateAudio()">&#128266; အသံ ဖန်တီးရန်</button>
<button class="btn btn-green btn-sm" onclick="copyAudioText()">&#128203; Copy</button>
</div>
</div>

<div class="card" id="audioResultCard" style="display:none;">
<div class="card-title">&#128266; Audio ရလဒ် (Audio Result)</div>
${aicsResultLoadingHtml('audioLoading','AI ပြင်ဆင်နေသည်...')}
<div class="audio-player-row">
<button class="btn btn-primary" id="audioPlayBtn" onclick="toggleAudioPlay()">&#9654; Play</button>
<audio id="audioPlayer" controls style="flex:1;min-width:220px;"></audio>
</div>
<div class="audio-info" id="audioInfo">Audio မရှိသေးပါ</div>
<div class="btn-row">
<button class="btn btn-secondary btn-sm" onclick="downloadAudio()">&#128190; Save Audio</button>
</div>
<hr class="divider">
<div class="srt-label">&#128221; မူရင်း SRT စာတန်းထိုး ဖန်တီးရန် <span class="pro-tag">PRO</span></div>
<p class="hint">Audio ကနေ SRT Subtitle ကို ထုတ်နိုင်ပါတယ်။</p>
<button class="btn btn-secondary btn-sm" id="genSrtBtn" onclick="generateSrt()">&#128260; မူရင်း SRT စာတန်းထိုး ဖန်တီးရန်</button>
<div class="pro-lock-note" id="srtLockNote"></div>
<div class="error-box" id="audioLoadingErr"></div>
<div class="retry-row" id="audioLoadingRetry">
<button class="btn btn-primary" onclick="retryAudio()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="backFromAudioLoading()">&#8592; နောက်သို့</button>
</div>
</div>

<div class="card" id="srtResultCard" style="display:none;">
<div class="shop-view-subhead">
<button class="btn btn-secondary btn-sm" onclick="backToAudioResult()">&#8592; Audio Result</button>
<span class="shop-view-title">&#128221; မူရင်း SRT</span>
</div>
${aicsResultLoadingHtml('srtLoading','AI ပြင်ဆင်နေသည်...')}
<div class="srt-label">&#127916; မူရင်း SRT <span class="edit-hint">&#9999;&#65039; ပြင်ဆင်လို့ရသည်</span></div>
<textarea class="srt-editable" id="srtOriginal" placeholder="(Generate SRT နှိပ်ပြီးမှ ဒီနေရာမှာ ပေါ်ပါမယ်)" oninput="onSrtEdit()"></textarea>
<div class="btn-row">
<button class="btn btn-green btn-sm" onclick="copySrt()">&#128203; Copy</button>
<button class="btn btn-secondary btn-sm" onclick="downloadSrt()">&#128190; Save .srt</button>
</div>
<hr class="divider">
<div class="card-title" style="margin-top:2px;">&#127760; ဘာသာပြန် <span class="pro-tag">PRO</span></div>
<div class="form-group">
<label>ဘာသာစကား (Language)</label>
<select id="transLangSel" onchange="onTransLangChange()">
<option value="my">မြန်မာ</option>
<option value="cn">တရုတ်</option>
</select>
</div>
<div class="dir-row">
<label style="margin:0 8px 0 0;display:inline;">Direction:</label>
<label class="dir-radio"><input type="radio" name="transDir" value="MY_TO_CN" checked onchange="onTransDirChange(this)"><span>မြန်မာ &#8594; တရုတ်</span></label>
<label class="dir-radio"><input type="radio" name="transDir" value="CN_TO_MY" onchange="onTransDirChange(this)"><span>တရုတ် &#8594; မြန်မာ</span></label>
</div>
<div class="btn-row">
<button class="btn btn-primary" id="translateBtn" onclick="translateSrt()">ဘာသာပြန်ရန်</button>
</div>
<div class="pro-lock-note" id="transLockNote"></div>
<div class="error-box" id="srtLoadingErr"></div>
<div class="retry-row" id="srtLoadingRetry">
<button class="btn btn-primary" onclick="retrySrt()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="backFromSrtLoading()">&#8592; နောက်သို့</button>
</div>
</div>

<div class="card" id="transResultCard" style="display:none;">
<div class="shop-view-subhead">
<button class="btn btn-secondary btn-sm" onclick="backToSrtResult()">&#8592; Original SRT</button>
<span class="shop-view-title">&#127760; Translated SRT</span>
</div>
${aicsResultLoadingHtml('transLoading','AI ပြင်ဆင်နေသည်...')}
<div class="srt-label">&#9989; ဘာသာပြန်ထားသော SRT (line-by-line)</div>
<div class="trans-view" id="transResultView"></div>
<div class="error-box" id="transLoadingErr"></div>
<div class="retry-row" id="transLoadingRetry">
<button class="btn btn-primary" onclick="retryTrans()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="backFromTransLoading()">&#8592; နောက်သို့</button>
</div>
<div class="btn-row">
<button class="btn btn-green btn-sm" onclick="copyTranslated()">&#128203; Copy</button>
<button class="btn btn-secondary btn-sm" onclick="downloadTranslated()">&#128190; Save .srt</button>
</div>
</div>
</div>

<!-- ===== VIEW: IMAGE BRANCH (အသစ်) ===== -->
<div id="viewImage" style="display:none;">
<div class="card" id="imageSetupCard">
<div class="card-title">&#128444; Image ပြင်ဆင်ရန် (Image Setup)</div>
<div class="auto-note">&#9989; Product Content Result နှင့် Product Reference ပုံများကို အလိုအလျောက် ထည့်ထားသည်</div>
<div class="form-group">
<label>Product Content * (Image ဖန်တီးရန် Content)</label>
<textarea id="imageText" class="shop-result" style="min-height:120px;" oninput="onImageTextEdit()"></textarea>
</div>
<div class="form-group">
<label>Image Purpose (Image Purpose)</label>
<select id="imagePurposeSel"><option value="Product Image" selected>Product Image</option><option value="Product Showcase">Product Showcase</option><option value="Social Media Visual">Social Media Visual</option><option value="Advertisement Visual">Advertisement Visual</option><option value="Promotional Image">Promotional Image</option></select>
</div>
<button type="button" class="aics-advanced-toggle" id="advImageToggle" aria-expanded="false" onclick="studioToggleAdvanced('advImageToggle','advImagePanel')"><span>&#9660; Advanced Image Settings (အဆင့်မြင့် ဆက်တင်များ)</span><span class="aics-adv-arrow">&#9660;</span></button>
<div class="aics-adv-panel adv-grid" id="advImagePanel">
<div class="form-group"><label>Image Style (ပုံစံ)</label><input type="text" id="imageStyleSel" placeholder="ဥပမာ - Photorealistic / Minimal / Cinematic"></div>
<div class="form-group"><label>Background (နောက်ခံ)</label><input type="text" id="imageBg" placeholder="ဥပမာ - White studio / Nature / Urban"></div>
<div class="form-group"><label>Composition (ဖွဲ့စည်းပုံ)</label><input type="text" id="imageComposition" placeholder="ဥပမာ - Center product / Rule of thirds"></div>
<div class="form-group"><label>Lighting (အလင်းရောင်)</label><input type="text" id="imageLighting" placeholder="ဥပမာ - Soft daylight / Dramatic"></div>
<div class="form-group"><label>Aspect Ratio (ပုံအချိုး)</label><select id="imageRatio"><option value="1:1" selected>1:1 (Square)</option><option value="4:5">4:5 (Portrait)</option><option value="3:4">3:4</option><option value="9:16">9:16 (Story)</option><option value="16:9">16:9 (Wide)</option></select></div>
<div class="form-group"><label>Additional Instructions (ထပ်ဆောင်း ညွှန်ကြားချက်)</label><textarea id="imageInstructions" placeholder="ပုံတွင် ထည့်သွင်းလိုသော အသေးစိတ်များ"></textarea></div>
</div>
<div class="form-group">
<label>&#128444; Product Reference ပုံများ (Product Content မှ အလိုအလျောက် ကူးထည့်ထားသည် — အများဆုံး ၅ ပုံ)</label>
<input type="file" id="refImgImage" accept="image/*" multiple>
<div class="ref-preview" id="refPreviewImage"></div>
</div>
<div class="error-box" id="imageErr"></div>
<div class="btn-row">
<button class="btn btn-primary" id="genImageBtn" onclick="generateImage()">&#128444; Image ဖန်တီးရန်</button>
</div>
</div>

<div class="card" id="imageResultCard" style="display:none;">
<div class="card-title">&#128444; Image ရလဒ် (Image Result)</div>
${aicsResultLoadingHtml('imageLoading','AI ဖန်တီးနေသည်...')}
<div id="imageResultView"></div>
<div class="error-box" id="imageLoadingErr"></div>
<div class="retry-row" id="imageLoadingRetry">
<button class="btn btn-primary" onclick="retryImage()">&#8635; ပြန်ကြိုးစားရန်</button>
<button class="btn btn-secondary" onclick="backFromImageLoading()">&#8592; နောက်သို့</button>
</div>
</div>
</div>

</div>`;

const STEPS_HTML = STEP1_HTML + STEP3_HTML;

export { STEPS, STEPS_HTML };
