// AI Creative Studio — Short Studio / state.js (V2 refactor)
// Browser-side state — extracted VERBATIM from frontend/short.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const STATE_SCRIPT = `
var token=localStorage.getItem('aics_token')||'';
var userEmail=localStorage.getItem('aics_email')||'';
var userPlan=localStorage.getItem('aics_plan')||'FREE';
var isPro=(userPlan==='PRO');

// ===================== Short-specific State (Story နှင့် သီးခြား) =====================
var selectedShortType='1';
var currentShort='';        // Final Short Script (User နောက်ဆုံး ပြင်ထားသော Script)
var currentShortIdea='';
var currentScenes=[];
var currentCharacters=[];
var imgCache={};
var videoStarted=false;
var shortBusy=false;
var planBusy=false;
var typewriterTimer=null;
var refImages=[];
var MAX_REF_IMAGES=5;

`;
