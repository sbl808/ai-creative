// AI Creative Studio — Voice Studio / ui.js (V2.1 Unified Workflow)
// Page skeleton — Mode chips + Stepper + Body (Studio Home card များ မရှိတော့ပါ)
// #voiceModel2Store: aiModelSel2 (category=transcribe) ကို Shell Script က page load တွင် populate လုပ်သည်။
//   Format screen ၏ #voiceModel2Slot ထဲသို့ ရွှေ့၍ ပြသည် (စာမျက်နှာ ပြန်ဆွဲသည့်အခါ ပြန်သိမ်းသည်)။
const HOME_HTML = `
<div class="voice-screen active" id="voiceWorkflow">
  <div class="voice-chips" id="voiceChips" role="tablist" aria-label="Voice Studio mode"></div>
  <div id="voiceStepper" class="voice-stepper"></div>
  <div id="voiceWorkflowBody"></div>
</div>
<div id="voiceModel2Store" style="display:none">
  <div class="form-group" id="voiceModel2Group"><label>🤖 AI Model (အသံ → စာ / SRT / ဘာသာပြန်)</label><select id="aiModelSel2" data-category="transcribe"></select></div>
</div>`;

export { HOME_HTML };
