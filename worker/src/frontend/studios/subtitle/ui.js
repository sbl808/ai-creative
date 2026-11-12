// AI Creative Studio — Subtitle Studio UI
export const SUBTITLE_HOME_HTML = `
<main class="subtitle-screen" id="subtitleWorkflow">
  <header class="subtitle-hero"><div class="subtitle-hero-icon" aria-hidden="true">💬</div><div><h1>Subtitle Studio</h1><p>Audio / Video မှ SRT ဖန်တီးခြင်းနှင့် ပြင်ဆင်ခြင်းကို တစ်နေရာတည်းတွင် ပြုလုပ်ပါ။</p></div></header>
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
    <div class="subtitle-actions"><button type="button" class="subtitle-button secondary" id="subtitleDownloadBtn">.srt ဖိုင် သိမ်းရန်</button></div>
  </section>
  <p class="subtitle-status" id="subtitleStatus" role="status" aria-live="polite">Media ဖိုင်ရွေးပြီး SRT ဖန်တီးနိုင်ပါသည်။</p>
</main>`;
