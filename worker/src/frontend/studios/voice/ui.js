// AI Creative Studio — Voice Studio / ui.js (TTS-only workflow)
// Page skeleton — Voice Text-to-Voice အတွက် Stepper နှင့် Workspace ကိုသာ ပြသသည်။
const HOME_HTML = `
<div class="voice-screen active" id="voiceWorkflow">
  <nav id="voiceStepper" class="voice-stepper" aria-label="Voice workflow progress"></nav>
  <p id="voiceStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
  <div id="voiceWorkflowBody" role="region" tabindex="-1" aria-label="Voice Studio workspace" aria-live="off"></div>
</div>`;

export { HOME_HTML };
