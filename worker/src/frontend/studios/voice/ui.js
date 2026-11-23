// AI Creative Studio — Voice Studio / ui.js
// Voice Studio UI သည် Text → Voice (TTS) workflow တစ်ခုတည်းကို ပြသသည်။
const HOME_HTML = `
<div class="voice-screen active" id="voiceWorkflow">
  <nav id="voiceStepper" class="voice-stepper" aria-label="Workflow progress"></nav>
  <p id="voiceStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
  <div id="voiceWorkflowBody" role="region" tabindex="-1" aria-label="Voice Studio workspace" aria-live="off"></div>
</div>
`;

export { HOME_HTML };
