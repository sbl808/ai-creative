// AI Creative Studio — Image Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/image.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STATE_SCRIPT = `
var token=localStorage.getItem('aics_token')||'';
var userEmail=localStorage.getItem('aics_email')||'';
var userPlan=localStorage.getItem('aics_plan')||'FREE';
var isPro=(userPlan==='PRO');

var MAX_REF=5;
var selectedImageType='1';
var refImages=[];
var originalIdea='';
var latestPrompt='';
var prepPrompt='';
var finalPromptManual=false;
var typewriterTimer=null;
var prepareBusy=false;
var generateBusy=false;
var regenBusy=false;
var statusTimers={};

// ===== IMAGE MAP State (Instruction Section 11) =====
var imageMap={
  subject:{description:'',referenceImage:null},
  style:{description:''},
  environment:{description:'',referenceImage:null},
  lighting:{description:''},
  camera:{description:''},
  finalPrompt:'',
  finalImage:null
};

`;
