// AI Creative Studio — Content Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from content.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS } from './ui.js';
import { STEPS_HTML } from './fragments.js';
import { STATE_SCRIPT } from './state.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { API_SCRIPT } from './api.js';
import { AUDIO_SCRIPT } from './audio.js';
import { SHELL_SCRIPT } from './shell.js';

export const CONTENT_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Content Studio — AI Creative Studio</title>
<style>
:root{--bg:#080c18;--bg-card:#0d1424;--bg-card2:#111a2e;--bg-input:#0a1020;--border:rgba(0,229,255,0.15);--border-strong:rgba(0,229,255,0.35);--cyan:#00e5ff;--purple:#7b5cff;--text:#e8ecf4;--text2:#8b95a8;--text3:#5a6478;--success:#00e676;--error:#ff5252;--warn:#ffc107}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
a{color:var(--cyan);text-decoration:none}
.aics-work .card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.aics-work .card-title{font-size:15px;font-weight:600;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.aics-work label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:6px;font-weight:500}
.aics-work input,.aics-work textarea,select{width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:14px;padding:11px 14px;color:var(--text);font-size:14px;font-family:inherit;transition:border-color .2s;box-sizing:border-box}
.aics-work input:focus,.aics-work textarea:focus,select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 2px rgba(0,229,255,.1)}
.aics-work textarea{resize:vertical;min-height:90px}
select{cursor:pointer}
select option{background:var(--bg-card);color:var(--text)}
.aics-work .form-group{margin-bottom:16px}
/* Stepper loading — global .loading{display:none!important} နဲ့ မတိုက်အောင် cs-busy သုံး */
.aics-step-btn.cs-busy{border-color:rgba(0,229,255,.6)!important;box-shadow:0 0 18px rgba(0,229,255,.4)!important;}
.aics-step-btn.cs-busy .aics-step-label{color:#00e5ff!important;}
.aics-step-btn.cs-busy .aics-step-loading{display:flex!important;}
/* Video result boxes (Story Studio ပုံစံ) */
.aics-work .final-char-card{background:var(--bg-card2,#0e1626);border:1px solid var(--border,#26324a);border-radius:12px;padding:16px;margin-bottom:12px;}
.aics-work .final-char-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.aics-work .final-char-name{font-weight:700;color:var(--purple,#b7a8ff);font-size:14.5px;}
.aics-work .final-prompt-label{font-size:11.5px;color:var(--cyan);font-weight:700;letter-spacing:.5px;margin:10px 0 4px;text-transform:uppercase;}
.aics-work .final-prompt-text{font-size:13px;color:var(--text);line-height:1.6;white-space:pre-wrap;word-break:break-word;background:var(--bg-input,#0a1020);padding:10px 12px;border-radius:8px;min-height:20px;}
.aics-work .final-scene-card{background:var(--bg-card2,#0e1626);border:1px solid var(--border,#26324a);border-radius:12px;padding:16px;margin-bottom:14px;}
.aics-work .final-scene-title{font-weight:700;color:var(--purple,#b7a8ff);font-size:14.5px;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid var(--border,#26324a);}
.aics-work .final-scene-box{margin-bottom:12px;}
.aics-work .final-box-label{font-size:11.5px;color:var(--cyan);font-weight:700;letter-spacing:.5px;margin-bottom:4px;text-transform:uppercase;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:44px;min-width:44px}
.btn-primary{background:linear-gradient(135deg,var(--cyan),#00b8d4);color:#080c18}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-secondary{background:var(--bg-card2);color:var(--cyan);border:1px solid var(--border-strong)}
.btn-secondary:hover{background:rgba(0,229,255,.1)}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border);padding:6px 12px;font-size:12px;min-height:32px}
.btn-ghost:hover{color:var(--cyan);border-color:var(--cyan)}
.btn-purple{background:linear-gradient(135deg,var(--purple),#9c7cff);color:#fff}
.aics-work .btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.aics-work .type-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.aics-work .type-chip{padding:10px 16px;border:1px solid var(--border);border-radius:20px;font-size:13px;cursor:pointer;color:var(--text2);transition:all .2s;user-select:none;min-height:40px;display:inline-flex;align-items:center;gap:6px}
.aics-work .type-chip:hover{border-color:var(--cyan);color:var(--cyan)}
.aics-work .result-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:16px}
.aics-work .result-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:16px}
.aics-work .result-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.aics-work .result-card-label{font-size:12px;font-weight:600;color:var(--purple);text-transform:uppercase;letter-spacing:.5px}
.aics-work .result-card-body{font-size:14px;line-height:1.7;color:var(--text);white-space:pre-wrap;word-break:break-word}
.aics-work textarea.result-card-body{white-space:pre-wrap;min-height:150px}
.aics-work .auto-expand{resize:vertical;overflow-y:hidden;min-height:110px}
.aics-work .revise-section{margin-top:20px;padding-top:20px;border-top:1px solid var(--border)}
.aics-work .revise-history{margin-bottom:14px;max-height:280px;overflow-y:auto}
.aics-work .revise-msg{background:var(--bg-input);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.aics-work .revise-msg.user{border-left:3px solid var(--purple)}
.aics-work .revise-msg .role{font-size:11px;color:var(--text3);margin-bottom:4px}
.aics-work .revise-input-row{display:flex;gap:10px;align-items:flex-end}
.aics-work .revise-input-row textarea{flex:1;min-height:60px}
.aics-work .audio-container{margin-top:12px}
.aics-work .audio-container audio{width:100%;margin-top:8px}
.aics-work .voice-hint{font-size:12px;color:var(--text3);margin-top:8px;font-style:italic}
.aics-work .srt-box{font-family:'Courier New',monospace;font-size:12.5px;min-height:120px;line-height:1.5}
.aics-work .direction-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.aics-work .direction-chip{padding:8px 14px;border:1px solid var(--border);border-radius:20px;font-size:12.5px;cursor:pointer;color:var(--text2);transition:all .2s;user-select:none;min-height:36px;display:inline-flex;align-items:center}
.aics-work .direction-chip:hover{border-color:var(--cyan);color:var(--cyan)}
.aics-work .direction-chip.selected{background:rgba(0,229,255,.12);border-color:var(--cyan);color:var(--cyan);font-weight:600}
.aics-work .divider{border:none;border-top:1px solid var(--border);margin:18px 0}
.aics-work .result-label{font-size:12px;font-weight:600;color:var(--success);margin-bottom:6px}
.aics-work .characters-list{display:flex;flex-wrap:wrap;gap:10px}
.aics-work .scene-image-area{margin-top:12px;text-align:center}
.aics-work .scene-image-area img{max-width:100%;border-radius:8px;border:1px solid var(--border)}
.aics-work .scene-image-placeholder{background:var(--bg-input);border:1px dashed var(--border);border-radius:8px;padding:20px;color:var(--text3);font-size:12px}
.aics-work .loading{display:none !important;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);align-items:center;gap:12px;color:#00e5ff;font-size:15px;font-weight:600;padding:16px 28px;border-radius:16px;background:rgba(8,12,24,.95);border:1px solid rgba(0,229,255,.4);box-shadow:0 8px 40px rgba(0,229,255,.3);z-index:99999;backdrop-filter:blur(12px);white-space:nowrap}
.aics-work .loading.show{display:flex}
.aics-work .spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.aics-work .error-box{display:none;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px}
.aics-work .error-box.show{display:block}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--bg-card2);border:1px solid var(--success);color:var(--success);padding:10px 20px;border-radius:8px;font-size:13px;z-index:1000;transition:transform .3s}
.toast.show{transform:translateX(-50%) translateY(0)}
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:16px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;text-align:center}
/* ===== Content Studio — Output Hub (Compact — Section 21) ===== */
.aics-work .aics-out-hub{margin-top:4px;padding:20px;background:linear-gradient(135deg,rgba(123,92,255,.07),rgba(0,229,255,.05));border:1px solid rgba(123,92,255,.3);border-radius:14px}
.aics-work .aics-out-hub-title{font-size:16px;font-weight:700;color:var(--purple);margin-bottom:6px;letter-spacing:.3px}
.aics-work .aics-out-hub-sub{font-size:12.5px;color:var(--text2);margin-bottom:16px}
.aics-work .aics-out-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.aics-work .aics-out-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px}
.aics-work .aics-out-icon{font-size:30px;line-height:1}
.aics-work .aics-out-title{font-size:15px;font-weight:700;color:var(--text)}
.aics-work .aics-out-desc{font-size:12.5px;color:var(--text2);line-height:1.55;flex:1}
.aics-work .aics-out-btn{margin-top:8px}
.aics-work .aics-transfer-box{background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word;max-height:340px;overflow-y:auto;margin-bottom:14px}
.aics-act:disabled{opacity:.5;cursor:not-allowed}
/* ===== Content Studio — Local Additions (Branch Stepper / Transfer Note / Selected Voice) ===== */
.aics-branch-stepper{display:flex;align-items:center;gap:2px;margin-top:-4px;}
.aics-branch-cap{display:inline-flex;align-items:center;font-size:10.5px;color:var(--purple,#b7a8ff);font-weight:700;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap;padding-right:8px;flex-shrink:0;}
.aics-work .aics-transfer-note{display:flex;align-items:center;gap:6px;background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.3);color:var(--success,#00e676);font-size:12.5px;font-weight:600;padding:8px 12px;border-radius:10px;margin-bottom:10px;}
.aics-work .selected-voice-chip{display:inline-block;background:var(--bg-input,#0a1020);border:1px solid var(--border-strong,rgba(0,229,255,.35));color:var(--cyan,#00e5ff);font-weight:700;padding:8px 14px;border-radius:10px;font-size:13px;}
/* Gender → Voice (Section 6 — single voice selection UX) */
.aics-work .gender-toggle{display:flex;gap:8px;}
.aics-work .gender-opt{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:1px solid var(--border,#26324a);border-radius:12px;cursor:pointer;color:var(--text2,#8b95a8);font-size:13.5px;font-weight:600;min-height:44px;user-select:none;background:var(--bg-input,#0a1020);transition:all .2s;}
.aics-work .gender-opt:hover{border-color:var(--cyan,#00e5ff);color:var(--cyan,#00e5ff);}
.aics-work .gender-opt input{width:auto;margin:0;accent-color:var(--cyan,#00e5ff);cursor:pointer;}
.aics-work .gender-opt:has(input:checked){border-color:var(--cyan,#00e5ff);background:rgba(0,229,255,.08);color:var(--cyan,#00e5ff);box-shadow:0 0 10px rgba(0,229,255,.15);}
/* Conditional fields (Section 8 — Content Type ပေါ်မူတည်၍ ပြသည်) */
.aics-work .conditional-fields{background:rgba(123,92,255,.05);border:1px solid rgba(123,92,255,.25);border-radius:12px;padding:14px 16px;margin-bottom:16px;}
@media(max-width:767px){.aics-work .revise-input-row{flex-direction:column;align-items:stretch}.aics-work .aics-out-cards{grid-template-columns:1fr}.aics-work .aics-out-card{padding:16px}}
</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Content Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/content" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'content',
  activeId: 'content',
  nameMy: 'Content Studio',
  desc: 'Create engaging content for any platform',
  icon: '✍️',
  modelCat: 'text',
  steps: STEPS,
  content: STEPS_HTML,
})}
${sidebarScript()}
<div class="toast" id="toast">&#9989; ကူးယူပြီးပါပြီ</div>
<style>
/* Compact Output Hub overrides (Content Studio only — higher specificity than shared) */
.aics-work .aics-out-hub{padding:14px 16px;margin-top:2px;}
.aics-work .aics-out-hub .aics-out-hub-title{font-size:14px;margin-bottom:2px;}
.aics-work .aics-out-hub .aics-out-hub-sub{font-size:11.5px;margin-bottom:10px;}
.aics-work .aics-out-hub .aics-out-cards{grid-template-columns:1fr 1fr;gap:10px;}
.aics-work .aics-out-hub .aics-out-card{min-height:0;flex-direction:row;justify-content:flex-start;text-align:left;padding:12px 14px;gap:4px;}
.aics-work .aics-out-hub .aics-out-icon{font-size:20px;}
.aics-work .aics-out-hub .aics-out-title{font-size:13.5px;}
.aics-work .aics-out-hub .aics-out-desc{font-size:11.5px;margin:0;flex:none;}
.aics-work .aics-out-hub .aics-out-btn{margin-top:0;min-height:34px;padding:6px 12px;font-size:12px;}
@media(max-width:767px){
  .aics-work .aics-out-hub .aics-out-cards{grid-template-columns:1fr 1fr;gap:8px;}
  .aics-work .aics-out-hub .aics-out-card{flex-direction:column;align-items:flex-start;padding:10px 12px;}
  .aics-work .aics-out-hub .aics-out-desc{display:none;}
}
</style>
<script>${STATE_SCRIPT}${CONSTANTS_SCRIPT}${HELPERS_SCRIPT}${API_SCRIPT}${AUDIO_SCRIPT}${SHELL_SCRIPT}</script>
</body>
</html>`;

export default CONTENT_HTML;
