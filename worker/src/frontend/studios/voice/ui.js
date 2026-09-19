// AI Creative Studio — Voice Studio / ui.js (V2 refactor)
// HTML step fragments — extracted VERBATIM from frontend/voice.js (v1).
const HOME_HTML = `
<div class="voice-screen active" id="voiceHome">
  <div class="voice-hero">
    <div class="voice-hero-icon">🎙️</div>
    <h1>VOICE STUDIO</h1>
    <p>ဘာလုပ်ချင်ပါသလဲ?</p>
  </div>
  <div class="mode-grid">
    <button type="button" class="mode-card" onclick="voiceStartMode('text-to-voice')">
      <span class="mode-icon">📝</span><span class="mode-title">စာသား → အသံ</span>
      <span class="mode-desc">စာသားကို AI အသံအဖြစ် ဖန်တီးရန်</span><span class="mode-action">စတင်ရန် →</span>
    </button>
    <button type="button" class="mode-card" onclick="voiceStartMode('media-to-text')">
      <span class="mode-icon">🎧</span><span class="mode-title">အသံ / Video → စာသား</span>
      <span class="mode-desc">အသံ သို့မဟုတ် Video မှ စာသား / SRT ဖန်တီးရန်</span><span class="mode-action">စတင်ရန် →</span>
    </button>
  </div>
</div>

<div class="voice-screen" id="voiceWorkflow">
  <div id="voiceStepper" class="voice-stepper"></div>
  <div id="voiceWorkflowBody"></div>
</div>`;

export { HOME_HTML };
