// AI Creative Studio — Voice Studio / state.js (V2.1 Unified Workflow)
// Browser-side state. V2.1: mode chips (စာမျက်နှာတစ်ခုတည်း) + 4-step flow (Input/Format/Generate/Result).
// VOICE_INPUTS = Input/Format ဖောင်တန်ဖိုးများ (Step/Mode ပြောင်းလည်း မပျောက်စေရန် သီးသန့်သိမ်းသည်)
export const STATE_SCRIPT = `var TOKEN=localStorage.getItem('aics_token')||'';
var USER_PLAN='FREE';
function newVoiceState(mode,source){
  return {
    voiceMode:mode||'text-to-voice', voiceStep:1, view:'input', resultKind:null,
    voiceInput:null, voiceResult:null, audioResult:null,
    srtResult:null, translationDirection:'MY_TO_CN', translationResult:null,
    mediaOutput:'text', srtSource:null, transSource:null,
    processingState:null, errorState:null, source:source||''
  };
}
var VOICE_STATE=newVoiceState('text-to-voice','');
var VOICE_INPUTS={tts:'',speaking:'',voice:'Kore',instruction:'',audience:'လူတိုင်း',srt:''};
var VOICE_DRAFT_VALUES=null;
var LAST_AUDIO={base64:'',mime:'audio/wav',url:''};
var MEDIA_AUDIO={base64:'',mime:'',fileName:''};
var translatedSrt='';
var voiceDraftKey='aics_voice_workflow_v3';
var VOICE_REQUEST_ID=0;

`;
