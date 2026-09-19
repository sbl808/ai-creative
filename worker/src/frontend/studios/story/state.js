// AI Creative Studio — Story Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STATE_SCRIPT = `
var token=localStorage.getItem('aics_token')||'';
var userEmail=localStorage.getItem('aics_email')||'';
var userPlan=localStorage.getItem('aics_plan')||'FREE';
var isPro=(userPlan==='PRO');
var selectedStoryType='1';
var selectedVideoType='1';
var currentStory='';
var currentStoryIdea='';
var currentCharacters=[];
var currentScenes=[];
var imgCache={};
var videoStarted=false;
var storyBusy=false;
var planBusy=false;
var typewriterTimer=null;

`;
