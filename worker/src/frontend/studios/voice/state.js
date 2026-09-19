// AI Creative Studio — Voice Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/voice.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STATE_SCRIPT = `var TOKEN=localStorage.getItem('aics_token')||'';
var USER_PLAN='FREE';
var VOICE_STATE={
  voiceMode:null, voiceStep:0, voiceInput:null, voiceResult:null, audioResult:null,
  srtResult:null, translationDirection:'MY_TO_CN', translationResult:null,
  processingState:null, errorState:null, source:'', srtSource:null
};
var VOICE_DRAFT_VALUES=null;
var LAST_AUDIO={base64:'',mime:'audio/wav',url:''};
var MEDIA_AUDIO={base64:'',mime:'',fileName:''};
var translatedSrt='';
var voiceDraftKey='aics_voice_workflow_v2';
var VOICE_REQUEST_ID=0;

`;
