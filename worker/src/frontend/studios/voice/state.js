// AI Creative Studio — Voice Studio / state.js (TTS-only workflow)
// Active Voice state is Text-to-Voice only. Restored legacy Subtitle fields are kept for migration.
export const STATE_SCRIPT = `var TOKEN=localStorage.getItem('aics_token')||'';
var USER_PLAN='FREE';
function newVoiceState(mode,source){
  return {
    voiceMode:'text-to-voice', voiceStep:1, view:'input', resultKind:null,
    voiceInput:null, audioResult:null,
    processingState:null, errorState:null, source:source||''
  };
}
var VOICE_STATE=newVoiceState('text-to-voice','');
var VOICE_INPUTS={tts:'',speaking:'',voice:'Kore',instruction:'',audience:'လူတိုင်း'};
var VOICE_DRAFT_VALUES=null;
var LAST_AUDIO={base64:'',mime:'audio/wav',url:''};
// Legacy Subtitle payload containers: retained only to avoid overwriting existing Voice drafts before Task 5D migration.
var MEDIA_AUDIO={base64:'',mime:'',fileName:''};
var translatedSrt='';
var voiceDraftKey='aics_voice_workflow_v3';
var VOICE_REQUEST_ID=0;

`;
