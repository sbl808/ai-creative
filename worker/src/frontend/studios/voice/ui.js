// AI Creative Studio — Voice Studio / ui.js (V2.1 Unified Workflow)
// Page skeleton — Mode chips + Stepper + Body (Studio Home card များ မရှိတော့ပါ)
// #voiceModel2Store: aiModelSel2 (category=transcribe) ကို Shell Script က page load တွင် populate လုပ်သည်။
//   Format screen ၏ #voiceModel2Slot ထဲသို့ ရွှေ့၍ ပြသည် (စာမျက်နှာ ပြန်ဆွဲသည့်အခါ ပြန်သိမ်းသည်)။
const HOME_HTML = `
<div class="voice-screen active" id="voiceWorkflow">
  <nav id="voiceStepper" class="voice-stepper" aria-label="Workflow progress"></nav>
  <p id="voiceStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
  <div id="voiceWorkflowBody" role="region" tabindex="-1" aria-label="Voice Studio workspace" aria-live="off"></div>
</div>
`;

export { HOME_HTML };
