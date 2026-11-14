// AI Creative Studio — Subtitle Studio / ui.js
// Independent mode selector and workspace container. Processing controls are added later.
export const HOME_HTML = `
<section class="subtitle-workspace" id="subtitleWorkspace" aria-labelledby="subtitleTitle">
  <header class="subtitle-hero">
    <div class="subtitle-hero-icon" aria-hidden="true">CC</div>
    <div>
      <p class="subtitle-eyebrow">AI CREATIVE STUDIO</p>
      <h1 id="subtitleTitle">Subtitle Studio</h1>
      <p class="subtitle-intro">အသံမှ စာသား၊ SRT ဖန်တီးခြင်းနှင့် ဘာသာပြန်ခြင်းကို သီးခြားလုပ်ဆောင်နိုင်ပါသည်။</p>
    </div>
  </header>

  <div class="subtitle-mode-grid" id="subtitleModeSelector" role="group" aria-label="Subtitle လုပ်ဆောင်ချက် ရွေးချယ်ရန်">
    <button type="button" class="subtitle-mode-button active" data-subtitle-mode="transcribe" aria-pressed="true">
      <span class="subtitle-mode-button-icon" aria-hidden="true">📝</span>
      <span><strong>အသံမှ စာသား</strong><small>Transcription</small></span>
    </button>
    <button type="button" class="subtitle-mode-button" data-subtitle-mode="srt" aria-pressed="false">
      <span class="subtitle-mode-button-icon" aria-hidden="true">⏱️</span>
      <span><strong>SRT ဖန်တီးရန်</strong><small>SRT Creation</small></span>
    </button>
    <button type="button" class="subtitle-mode-button" data-subtitle-mode="translate" aria-pressed="false">
      <span class="subtitle-mode-button-icon" aria-hidden="true">🌐</span>
      <span><strong>SRT ဘာသာပြန်ရန်</strong><small>SRT Translation</small></span>
    </button>
  </div>

  <section id="subtitleModePanel" class="subtitle-mode-panel-wrap" aria-live="polite" aria-atomic="true"></section>
  <p id="subtitleStatus" class="subtitle-status" role="status" aria-live="polite"></p>
</section>
`;
