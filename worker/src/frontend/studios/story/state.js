// AI Creative Studio — Story Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STATE_SCRIPT = `
var token=localStorage.getItem('aics_token')||'';
var userEmail=localStorage.getItem('aics_email')||'';
var userPlan=localStorage.getItem('aics_plan')||'FREE';
var isPro=(userPlan==='PRO');
var selectedStoryType='1';
var selectedWorkflow='CINEMATIC_FEATURE';
var currentStoryFacts={};
var currentStory='';
var currentStoryIdea='';
var currentCharacters=[];
var currentScenes=[];
// Preserve legacy Video Plan form data while Story Studio no longer renders those controls.
var legacyVideoForm={};
var imgCache={};
var storySessionId=null;
var storySaveQueue=Promise.resolve();
var storyImageResultIds={};
var videoStarted=false;
var storyBusy=false;
var planBusy=false;

// GLOBAL RESULT UI — Story result uses the shared Global Result Box (state machine lives in shared-ui.js)
function storyResultBox(){ return window.aicsResultBox.create({ id:'storyResult', type:'text', collapsible:true, previewMax:280 }); }

`;
