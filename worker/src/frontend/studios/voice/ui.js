// AI Creative Studio — Voice Studio / ui.js (V2.1 Unified Workflow)
// Page skeleton — Mode chips + Stepper + Body (Studio Home card များ မရှိတော့ပါ)
// #voiceModel2Store: aiModelSel2 (category=transcribe) ကို Shell Script က page load တွင် populate လုပ်သည်။
//   Format screen ၏ #voiceModel2Slot ထဲသို့ ရွှေ့၍ ပြသည် (စာမျက်နှာ ပြန်ဆွဲသည့်အခါ ပြန်သိမ်းသည်)။
const HOME_HTML = `
<div class="voice-screen active" id="voiceWorkflow">
  <div class="voice-chips" id="voiceChips" role="group" aria-label="Voice Studio mode"></div>
  <nav id="voiceStepper" class="voice-stepper" aria-label="Workflow progress"></nav>
  <p id="voiceStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
  <div id="voiceWorkflowBody" role="region" tabindex="-1" aria-label="Voice Studio workspace" aria-live="off"></div>
</div>
<div id="voiceModel2Store" style="display:none">
  <div class="form-group" id="voiceModel2Group"><label for="aiModelSel2">AI Model (အသံ → စာ / SRT / ဘာသာပြန်)</label><select id="aiModelSel2" data-category="transcribe"></select></div>
</div>`;

export { HOME_HTML };
