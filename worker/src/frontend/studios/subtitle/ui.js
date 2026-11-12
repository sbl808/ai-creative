// AI Creative Studio — Subtitle Studio / ui.js
// Initial page skeleton only. Workflow actions and API integration are added in later subtasks.
export const SUBTITLE_HOME_HTML = `
<main class="subtitle-screen" id="subtitleWorkflow">
  <header class="subtitle-hero">
    <div class="subtitle-hero-icon" aria-hidden="true">💬</div>
    <div>
      <h1>Subtitle Studio</h1>
      <p>Audio / Video မှ စာတန်းထိုးဖန်တီးခြင်း၊ SRT ပြင်ဆင်ခြင်းနှင့် ဘာသာပြန်ခြင်းတို့ကို တစ်နေရာတည်းတွင် ပြုလုပ်ပါ။</p>
    </div>
  </header>

  <section class="subtitle-grid" aria-label="Subtitle Studio လုပ်ဆောင်ချက်များ">
    <article class="subtitle-card">
      <h2>🎧 Audio / Video မှ SRT ဖန်တီးရန်</h2>
      <p>အသံ သို့မဟုတ် ဗီဒီယိုဖိုင်မှ Timestamp ပါသော Subtitle ထုတ်ယူရန်။</p>
      <label for="subtitleMediaFile">Media ဖိုင်ရွေးရန်</label>
      <input id="subtitleMediaFile" type="file" accept="audio/*,video/*">
      <p class="subtitle-note">ဖိုင်ကို ရွေးချယ်ထားရုံသာဖြစ်ပြီး ယခုအဆင့်တွင် Upload သို့မဟုတ် Processing မလုပ်သေးပါ။</p>
    </article>

    <article class="subtitle-card">
      <h2>📄 SRT ပြင်ဆင်ရန်</h2>
      <p>ရှိပြီးသား SRT ကို ထည့်သွင်းပြီး စာသားနှင့် Timestamp များကို ပြင်ဆင်ရန်။</p>
      <label for="subtitleSrtInput">SRT စာသား</label>
      <textarea id="subtitleSrtInput" class="subtitle-srt-input" placeholder="1&#10;00:00:00,000 --> 00:00:03,000&#10;မင်္ဂလာပါ" spellcheck="false"></textarea>
    </article>

    <article class="subtitle-card">
      <h2>🌐 SRT ဘာသာပြန်ရန်</h2>
      <p>မူရင်း Subtitle Number နှင့် Timestamp များကို ထိန်းသိမ်းပြီး စာသားကို ဘာသာပြန်ရန်။</p>
      <p class="subtitle-note">ဘာသာပြန် Workflow ကို နောက်အဆင့်တွင် ချိတ်ဆက်ပါမည်။</p>
    </article>
  </section>

  <p class="subtitle-status" id="subtitleStatus" role="status" aria-live="polite">
    Subtitle Studio အခြေခံ UI ကို ပြင်ဆင်ထားပါသည်။ လုပ်ဆောင်ချက်များကို နောက်အဆင့်များတွင် ချိတ်ဆက်ပါမည်။
  </p>
</main>`;
