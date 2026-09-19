// AI Creative Studio — Image Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from image.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS, STEPS_HTML } from './ui.js';
import { STATE_SCRIPT } from './state.js';
import { API_SCRIPT } from './api.js';
import { ACTIONS_SCRIPT } from './actions.js';
import { STEPPER_SCRIPT } from './stepper.js';

export const IMAGE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image Studio — AI Creative Studio</title>
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
.aics-work textarea{resize:vertical;min-height:70px}
select{cursor:pointer}
select option{background:var(--bg-card);color:var(--text)}
.aics-work .form-group{margin-bottom:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:44px;min-width:44px}
.btn-primary{background:linear-gradient(135deg,var(--cyan),#00b8d4);color:#080c18}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-success{background:linear-gradient(135deg,#00e676,#00c853);color:#080c18}
.btn-purple{background:linear-gradient(135deg,var(--purple),#9c7cff);color:#fff}
.btn-secondary{background:var(--bg-card2);color:var(--cyan);border:1px solid var(--border-strong)}
.btn-secondary:hover{background:rgba(0,229,255,.1)}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border);padding:6px 12px;font-size:12px;min-height:32px}
.btn-ghost:hover{color:var(--cyan);border-color:var(--cyan)}
.aics-work .btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.aics-work .ref-upload-area{margin-top:14px}
.aics-work .ref-upload-area input[type="file"]{padding:10px;background:var(--bg-input);color:var(--text2);border:1px dashed var(--border-strong);border-radius:8px;font-size:13px}
.aics-work .ref-hint{color:var(--text3);font-size:12px;margin-top:6px;line-height:1.5}
.aics-work .ref-preview{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.aics-work .ref-thumb{position:relative;width:72px;height:72px}
.aics-work .ref-thumb img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.aics-work .ref-thumb .remove-x{position:absolute;top:-7px;right:-7px;width:24px;height:24px;border-radius:50%;background:var(--error);color:#fff;border:none;font-size:13px;line-height:24px;text-align:center;cursor:pointer;padding:0;min-height:24px;min-width:24px}
.aics-work .result-textarea{width:100%;min-height:160px;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);font-size:14px;line-height:1.7;font-family:inherit;resize:vertical;box-sizing:border-box;overflow:hidden}
.aics-work .result-textarea:focus{outline:none;border-color:var(--cyan)}
.aics-work .hint-note{color:var(--text3);font-size:12px;margin-top:10px;font-style:italic}
.aics-work .error-box{display:none;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px;white-space:pre-wrap}
.aics-work .error-box.show{display:block}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--bg-card2);border:1px solid var(--success);color:var(--success);padding:10px 20px;border-radius:8px;font-size:13px;z-index:1000;transition:transform .3s}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast.error{border-color:var(--error);color:var(--error)}
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:16px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;text-align:center}
/* ===== Loading Cards (Step 02 / 05) ===== */
.aics-work .loading-card{text-align:center;padding:40px 16px}
.aics-work .loading-card .spinner{width:38px;height:38px;border-width:4px;margin:0 auto 18px}
.aics-work .spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.aics-work .loading-title{font-size:17px;font-weight:700;color:var(--cyan);margin-bottom:6px}
.aics-work .loading-sub{color:var(--text2);font-size:13px;margin-bottom:16px}
.aics-work .status-list{max-width:440px;margin:0 auto;text-align:left}
.aics-work .st-line{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;color:var(--text2);font-size:14px;opacity:.5;transition:all .2s}
.aics-work .st-line .st-marker{width:22px;text-align:center;flex-shrink:0;font-weight:700;color:var(--text3)}
.aics-work .st-line.active{opacity:1;color:var(--text);background:rgba(0,229,255,.06)}
.aics-work .st-line.active .st-marker{color:var(--cyan)}
.aics-work .st-line.done{opacity:1;color:var(--text)}
.aics-work .st-line.done .st-marker{color:var(--success)}
.aics-work .retry-row{display:none;justify-content:center;margin-top:16px}
.aics-work .retry-row.show{display:flex}
/* ===== IMAGE MAP (Step 06) ===== */
.aics-work .map-intro{text-align:center;margin-bottom:18px}
.aics-work .map-title-lg{font-size:20px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,var(--purple),var(--cyan));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.aics-work .map-intro p{color:var(--text2);font-size:13px;margin-top:4px}
.aics-work .map-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden}
.aics-work .map-card-head{display:flex;align-items:center;gap:10px;padding:13px 16px;background:linear-gradient(90deg,rgba(123,92,255,.10),rgba(0,229,255,.04));border-bottom:1px solid var(--border)}
.aics-work .map-icon{font-size:17px;flex-shrink:0}
.aics-work .map-title{font-size:13.5px;font-weight:700;letter-spacing:.8px;color:var(--text);flex:1}
.aics-work .map-edit-btn{margin-left:auto;background:rgba(0,229,255,.10);border:1px solid rgba(0,229,255,.35);color:var(--cyan);padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;transition:all .2s}
.aics-work .map-edit-btn:hover{background:rgba(0,229,255,.2)}
.aics-work .map-card-body{padding:14px 16px}
.aics-work .map-desc{color:var(--text);font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.aics-work .map-desc.map-empty{color:var(--text3);font-style:italic}
.aics-work .map-edit-ta{width:100%;min-height:90px;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:10px;padding:12px;color:var(--text);font-size:14px;line-height:1.6;font-family:inherit;box-sizing:border-box}
.aics-work .map-edit-ta:focus{outline:none;border-color:var(--cyan)}
.aics-work .map-edit-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.aics-work .map-regen-btn{margin-top:12px}
.aics-work .map-final-img img{width:100%;border-radius:10px;border:1px solid var(--border-strong);display:block}
.aics-work .map-img-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.aics-work .map-img-actions .btn{flex:1;min-width:120px;padding:10px 12px;font-size:13px}
.aics-work .map-loading{text-align:center;padding:30px 16px}
.aics-work .map-loading .spinner{width:34px;height:34px;border-width:4px;margin:0 auto 14px}
.aics-work .map-card .error-box{margin-top:12px}
@media(max-width:767px){.aics-work .map-img-actions{flex-direction:column}.aics-work .map-img-actions .btn{width:100%}.aics-work .card{padding:14px}.aics-work .map-card-head{padding:12px 14px}.aics-work .map-card-body{padding:12px 14px}}
</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Image Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/image" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'image',
  activeId: 'image',
  nameMy: 'ပုံ Studio',
  desc: 'Generate stunning images with AI',
  icon: '🖼️',
  modelCat: 'image',
  steps: STEPS,
  content: STEPS_HTML,
})}
${sidebarScript()}
<div class="toast" id="toast">&#9989; အောင်မြင်ပါသည်</div>
<script>${STATE_SCRIPT}${API_SCRIPT}${ACTIONS_SCRIPT}${STEPPER_SCRIPT}</script>
</body>
</html>`;

export default IMAGE_HTML;
