// AI Creative Studio — Subtitle Studio UI
export const SUBTITLE_HOME_HTML = `
<main class="subtitle-screen" id="subtitleWorkflow">
  <header class="subtitle-hero"><div class="subtitle-hero-icon" aria-hidden="true">💬</div><div><h1>Subtitle Studio</h1><p>Audio / Video မှ SRT ဖန်တီးခြင်း၊ ပြင်ဆင်ခြင်းနှင့် ဘာသာပြန်ခြင်းကို တစ်နေရာတည်းတွင် ပြုလုပ်ပါ။</p></div></header>
  <div class="subtitle-grid">
    <section class="subtitle-card" aria-labelledby="subtitleCreateTitle">
      <h2 id="subtitleCreateTitle">🎧 Audio / Video မှ SRT ဖန်တီးရန်</h2>
      <p>ဖိုင်ကို ရွေးပြီး SRT ဖန်တီးပါ။ ဖိုင်အရွယ်အစား 5MB အထိသာ လက်ခံပါသည်။</p>
      <label for="subtitleMediaFile">Media ဖိုင်</label><input id="subtitleMediaFile" type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv">
      <label for="subtitleKnownText">ရှိပြီးသား စာသား (ရွေးချယ်နိုင်သည်)</label><textarea id="subtitleKnownText" rows="3" placeholder="ရှိပြီးသား စာသားရှိပါက ထည့်ပါ"></textarea>
      <div class="subtitle-actions"><button type="button" class="subtitle-button" id="subtitleGenerateBtn">SRT ဖန်တီးရန်</button></div>
    </section>
    <section class="subtitle-card" aria-labelledby="subtitleEditorTitle">
      <h2 id="subtitleEditorTitle">📝 SRT Editor</h2>
      <p>ဖန်တီးပြီးသော SRT သို့မဟုတ် ရှိပြီးသား SRT ကို ဒီနေရာမှာ ပြင်ဆင်နိုင်ပါသည်။</p>
      <label for="subtitleSrtInput">SRT စာသား</label><textarea id="subtitleSrtInput" class="subtitle-srt-input" rows="12" placeholder="1&#10;00:00:00,000 --> 00:00:03,000&#10;မင်္ဂလာပါ" spellcheck="false"></textarea>
      <div class="subtitle-actions"><button type="button" class="subtitle-button secondary" id="subtitleDownloadBtn">.srt ဖိုင် သိမ်းရန်</button><button type="button" class="subtitle-button secondary" id="subtitleValidateBtn">SRT စစ်ဆေးရန်</button><button type="button" class="subtitle-button" id="subtitleSendToTranslationBtn">ပြင်ထားသော SRT ကို ဘာသာပြန်ရန် ပို့မည်</button></div>
      <p class="subtitle-note" id="subtitleValidationStatus" role="status" aria-live="polite">SRT ပုံစံနှင့် Timestamp များကို စစ်ဆေးနိုင်ပါသည်။</p>
    </section>
    <section class="subtitle-card" aria-labelledby="subtitleTranslateTitle">
      <h2 id="subtitleTranslateTitle">🌐 SRT ဘာသာပြန်ရန်</h2>
      <p>မူရင်း SRT စာသားကို ထည့်ပြီး ဘာသာပြန်ဦးတည်ချက် ရွေးပါ။</p>
      <label for="subtitleTranslationDirection">ဘာသာပြန်ဦးတည်ချက်</label>
      <select id="subtitleTranslationDirection" class="subtitle-select" style="display:block;width:100%;max-width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--subtitle-border-strong);border-radius:8px;background:var(--subtitle-subtle);color:var(--subtitle-text);font:inherit;">
        <option value="MY_TO_CN">မြန်မာ → တရုတ်</option>
        <option value="CN_TO_MY">တရုတ် → မြန်မာ</option>
      </select>
      <label for="subtitleTranslationInput">မူရင်း SRT စာသား</label>
      <textarea id="subtitleTranslationInput" rows="9" placeholder="ဘာသာပြန်လိုသော SRT စာသားကို ထည့်ပါ" spellcheck="false"></textarea>
      <div class="subtitle-actions"><button type="button" class="subtitle-button" id="subtitleTranslateBtn">SRT ဘာသာပြန်ရန်</button></div>
      <label for="subtitleTranslatedOutput">ဘာသာပြန်ရလဒ်</label>
      <textarea id="subtitleTranslatedOutput" rows="9" placeholder="ဘာသာပြန်ရလဒ်ကို ဒီနေရာတွင် ပြသပါမည်" spellcheck="false" readonly></textarea>
      <div class="subtitle-actions"><button type="button" class="subtitle-button secondary" id="subtitleDownloadTranslatedBtn">ဘာသာပြန် SRT သိမ်းရန်</button></div>
    </section>
  </div>
  <p class="subtitle-status" id="subtitleStatus" role="status" aria-live="polite">Media ဖိုင်ရွေးပြီး SRT ဖန်တီးနိုင်သလို ရှိပြီးသား SRT ကိုလည်း ဘာသာပြန်နိုင်ပါသည်။</p>
</main>`;