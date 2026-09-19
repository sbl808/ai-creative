// AI Creative Studio — Shop Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from shop.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS, STEPS_HTML } from './ui.js';
import { STATE_SCRIPT } from './state.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';
import { VIDEO_SCRIPT } from './video.js';
import { AUDIO_SCRIPT } from './audio.js';
import { IMAGE_SCRIPT } from './image.js';
import { SHELL_SCRIPT } from './shell.js';

export const SHOP_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shop Studio — AI Creative Studio</title>
<style>
:root{--bg:#080c18;--bg-card:#0d1424;--bg-card2:#111a2e;--bg-input:#0a1020;--border:rgba(0,229,255,0.15);--border-strong:rgba(0,229,255,0.35);--cyan:#00e5ff;--purple:#7b5cff;--text:#e8ecf4;--text2:#8b95a8;--text3:#5a6478;--success:#00e676;--error:#ff5252;--warn:#ffc107;--orange:#ff9f2b}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
a{color:var(--cyan);text-decoration:none}
.aics-work .card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.aics-work .card-title{font-size:15px;font-weight:600;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.aics-work .pro-tag{background:rgba(123,92,255,.2);color:var(--purple);font-size:11px;padding:2px 8px;border-radius:6px;font-weight:600}
.aics-work label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:6px;font-weight:500}
.aics-work input,.aics-work textarea,select{width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:14px;padding:11px 14px;color:var(--text);font-size:14px;font-family:inherit;transition:border-color .2s;box-sizing:border-box}
.aics-work input:focus,.aics-work textarea:focus,select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 2px rgba(0,229,255,.1)}
.aics-work textarea{resize:vertical;min-height:80px}
select{cursor:pointer}
select option{background:var(--bg-card);color:var(--text)}
.aics-work input[type="file"]{padding:10px;cursor:pointer;font-size:13px}
.aics-work .form-group{margin-bottom:14px}
.aics-work .type-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.aics-work .type-chip{padding:8px 14px;background:var(--bg-input);border:2px solid var(--border);border-radius:20px;cursor:pointer;font-size:12.5px;transition:all .2s;color:var(--text2);user-select:none}
.aics-work .type-chip:hover{border-color:var(--cyan)}
.aics-work .type-chip.active{border-color:var(--cyan);background:rgba(0,229,255,.1);color:var(--text)}
.aics-work .type-chip.pro{opacity:.7}
.aics-work .type-chip.locked{opacity:.4;cursor:not-allowed}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:44px;min-width:44px}
.btn-primary{background:linear-gradient(135deg,var(--cyan),#00b8d4);color:#080c18}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-secondary{background:var(--bg-card2);color:var(--cyan);border:1px solid var(--border-strong)}
.btn-secondary:hover{background:rgba(0,229,255,.1)}
.btn-purple{background:linear-gradient(135deg,var(--purple),#9b7dff);color:#fff}
.btn-green{background:rgba(0,230,118,.15);color:var(--success);border:1px solid rgba(0,230,118,.3)}
.btn-orange{background:rgba(255,159,43,.15);color:var(--orange);border:1px solid rgba(255,159,43,.3)}
.btn-sm{padding:8px 16px;font-size:12.5px;min-height:36px}
.aics-work .btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.aics-work .hint{font-size:12.5px;color:var(--text2);margin-bottom:14px;line-height:1.5}
.aics-work .loading{display:none !important;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);align-items:center;gap:12px;color:#00e5ff;font-size:15px;font-weight:600;padding:16px 28px;border-radius:16px;background:rgba(8,12,24,.95);border:1px solid rgba(0,229,255,.4);box-shadow:0 8px 40px rgba(0,229,255,.3);z-index:99999;backdrop-filter:blur(12px);white-space:nowrap}
.aics-work .loading.show{display:flex}
.aics-work .ref-preview{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.aics-work .ref-thumb{position:relative;width:72px;height:72px}
.aics-work .ref-thumb img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.aics-work .ref-thumb .remove-x{position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:50%;background:var(--error);color:#fff;border:none;font-size:12px;line-height:22px;text-align:center;cursor:pointer;padding:0}
.aics-work .chat-section{margin-top:20px;border-top:1px solid var(--border);padding-top:16px;display:none}
.aics-work .chat-log{max-height:240px;overflow-y:auto;background:var(--bg-input);border-radius:10px;padding:12px;margin-bottom:10px}
.aics-work .chat-bubble{padding:8px 12px;border-radius:10px;margin-bottom:8px;max-width:85%;line-height:1.4;font-size:13px}
.aics-work .chat-user{background:rgba(0,229,255,.1);margin-left:auto;text-align:right}
.aics-work .chat-ai{background:var(--bg-card2);margin-right:auto;color:var(--success)}
.aics-work .chat-input-row{display:flex;gap:8px}
.aics-work .chat-input-row input{flex:1}
.aics-work .srt-editable{width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text);font-family:'Courier New',monospace;font-size:12.5px;line-height:1.6;resize:vertical;min-height:140px;margin-top:8px;box-sizing:border-box}
.aics-work .srt-editable:focus{outline:none;border-color:var(--cyan)}
.aics-work .srt-label{font-size:13px;font-weight:600;color:var(--cyan);margin-top:16px;display:flex;align-items:center;gap:8px}
.aics-work .edit-hint{font-size:10.5px;color:var(--text2);background:var(--bg-card2);padding:2px 8px;border-radius:6px;font-weight:normal}
.aics-work .dir-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
.aics-work .divider{border:none;border-top:1px solid var(--border);margin:18px 0}
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:14px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px}
.aics-work audio{width:100%;margin-top:10px}
.aics-work .pro-lock-note{color:var(--warn);font-size:12.5px;margin-top:12px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-card2);border:1px solid var(--border-strong);color:var(--text);padding:12px 24px;border-radius:10px;font-size:13.5px;z-index:1000;display:none;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.toast.show{display:block}
.toast.error{border-color:var(--error);color:var(--error)}
.toast.success{border-color:var(--success);color:var(--success)}
/* ===== Main Stepper: done state ✓ ကို shared.js ၏ ::before ဖြင့် ပြသသည် (duplicate မဖြစ်စေရန် local rule ကို ဖယ်သည်) ===== */
/* ===== Branch Stepper (Video / Audio / Image — Main Stepper အောက်တွင် သီးခြားပြသည်) ===== */
/* Main Stepper (#aicsStepper) ကို မဖျောက်ဘဲ Branch Stepper ကို အောက်တွင် သီးခြား ထပ်ပြသည် */
.aics-work .shop-branch-stepper{margin:8px 0 14px;background:#0f1830;border:1px solid rgba(123,92,255,.3);border-radius:10px;padding:6px 8px;overflow-x:auto}
.aics-work .shop-branch-stepper .shop-branch-label{font-size:10.5px;color:var(--purple);letter-spacing:1px;font-weight:700;padding:2px 4px 4px;text-transform:uppercase;display:block}
.aics-work .shop-branch-inner{display:flex;align-items:center;gap:3px;min-width:max-content}
.aics-work .shop-bstep{display:flex;align-items:center;gap:5px;padding:6px 9px;border-radius:8px;border:1px solid transparent;color:#5a6478;font-size:12px;white-space:nowrap}
.aics-work .shop-bstep .shop-bstep-marker{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:#1a2138;color:#5a6478;flex-shrink:0}
.aics-work .shop-bstep.done{color:#4ade80}
.aics-work .shop-bstep.done .shop-bstep-marker{background:rgba(0,230,118,.15);color:#00e676}
.aics-work .shop-bstep.active{background:linear-gradient(90deg,rgba(123,92,255,.2),rgba(0,229,255,.08));border-color:rgba(123,92,255,.55);color:#fff}
.aics-work .shop-bstep.active .shop-bstep-marker{background:rgba(123,92,255,.35);color:#fff}
.aics-work .shop-bstep-link{width:12px;height:1px;background:rgba(123,92,255,.3);flex-shrink:0}
/* ===== Auto Transfer Note (Product Content → Branch) ===== */
.aics-work .auto-note{display:flex;align-items:center;gap:8px;background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.3);color:var(--success);border-radius:10px;padding:9px 14px;font-size:12.5px;margin-bottom:14px;line-height:1.5}
/* ===== Output Hub (ဘာဆက်ဖန်တီးမလဲ? — 3 Cards) ===== */
.aics-work .shop-out-hub{margin-top:6px}
.aics-work .shop-out-hub-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.aics-work .shop-out-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
@media(max-width:767px){
.aics-work .shop-out-cards{grid-template-columns:1fr;gap:10px}
}
/* ===== Product Form — Span 2 columns (Description / long fields) ===== */
.aics-work .studio-form-grid .form-group.span-2,.aics-work .adv-grid .form-group.span-2{grid-column:1/-1}
/* ===== Image Result ===== */
.aics-work .image-result-box{text-align:center;padding:8px 0}
.aics-work .image-result-box img{max-width:100%;max-height:560px;border-radius:12px;border:1px solid var(--border-strong);display:block;margin:0 auto 12px;box-shadow:0 8px 30px rgba(0,0,0,.35)}
.aics-work .image-prompt-box{margin-top:14px;text-align:left}
.aics-work .image-prompt-box .sm-txt{white-space:pre-wrap}
/* ===== Gender Toggle (Content Studio style — Gender → Voice) ===== */
.aics-work .gender-toggle{display:flex;gap:8px}
.aics-work .gender-opt{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;cursor:pointer;color:var(--text2);font-size:13.5px;font-weight:600;min-height:46px;user-select:none;background:var(--bg-input);transition:all .2s}
.aics-work .gender-opt:hover{border-color:var(--cyan);color:var(--cyan)}
.aics-work .gender-opt input{width:auto;margin:0;accent-color:var(--cyan);cursor:pointer;min-height:0}
.aics-work .gender-opt:has(input:checked){border-color:var(--cyan);background:rgba(0,229,255,.08);color:var(--cyan);box-shadow:0 0 10px rgba(0,229,255,.15)}
/* ===== View Head / Branch Head ===== */
.aics-work .shop-view-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.aics-work .shop-view-subhead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.aics-work .shop-view-title{font-size:15px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
/* ===== Content Result / Setup textarea (auto-expand) ===== */
.aics-work .shop-result{width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);font-size:14px;line-height:1.7;font-family:inherit;resize:vertical;min-height:120px;box-sizing:border-box;overflow:hidden}
.aics-work .shop-result:focus{outline:none;border-color:var(--cyan)}
/* ===== Branch Action Cards ===== */
.aics-work .branch-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px}
.aics-work .branch-action-card{background:linear-gradient(135deg,#111a2e,#0d1424);border:1px solid var(--border-strong);border-radius:16px;padding:22px 18px;text-align:center;cursor:pointer;transition:all .2s}
.aics-work .branch-action-card:hover{transform:translateY(-2px);border-color:var(--cyan);box-shadow:0 6px 24px rgba(0,229,255,.15)}
.aics-work .ba-icon{font-size:34px;margin-bottom:8px}
.aics-work .ba-title{font-size:15px;font-weight:700;color:var(--text)}
.aics-work .ba-sub{font-size:12px;color:var(--text2);margin-top:4px}
/* ===== Loading (status lines) ===== */
.aics-work .shop-loading-card{text-align:center;padding:28px 16px}
.aics-work .shop-loading-card .spinner{width:36px;height:36px;border-width:4px;margin:0 auto 16px}
.aics-work .spinner{width:20px;height:20px;border:3px solid rgba(0,229,255,.2);border-top-color:#00e5ff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.aics-work .shop-loading-title{font-size:17px;font-weight:700;color:var(--cyan);margin-bottom:18px}
.aics-work .shop-status-list{max-width:440px;margin:0 auto;text-align:left}
.aics-work .st-line{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;color:var(--text2);font-size:13.5px;opacity:.5;transition:all .2s}
.aics-work .st-line .st-marker{width:22px;text-align:center;flex-shrink:0;font-weight:700;color:var(--text3)}
.aics-work .st-line.active{opacity:1;color:var(--text);background:rgba(0,229,255,.06)}
.aics-work .st-line.active .st-marker{color:var(--cyan)}
.aics-work .st-line.done{opacity:1;color:var(--text)}
.aics-work .st-line.done .st-marker{color:var(--success)}
.aics-work .error-box{display:none;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px;line-height:1.7;white-space:pre-line;text-align:left}
.aics-work .error-box.show{display:block}
.aics-work .retry-row{display:none;justify-content:center;gap:10px;margin-top:16px;flex-wrap:wrap}
.aics-work .retry-row.show{display:flex}
/* ===== Story Map (Video Result) ===== */
.aics-work .story-map .sm-section{margin-top:22px}
.aics-work .story-map .sm-section:first-child{margin-top:0}
.aics-work .sm-section-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.aics-work .sm-card{background:var(--bg-input);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:14px}
.aics-work .sm-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.aics-work .sm-card-name{font-weight:700;color:var(--cyan);font-size:14px}
.aics-work .sm-id{font-size:10.5px;color:var(--purple);background:rgba(123,92,255,.12);border:1px solid rgba(123,92,255,.3);padding:2px 10px;border-radius:20px;font-family:'Courier New',monospace;word-break:break-all}
.aics-work .sm-lbl{font-size:11.5px;color:var(--text2);font-weight:700;letter-spacing:.4px;margin:10px 0 6px;text-transform:uppercase}
.aics-work .sm-txt{white-space:pre-wrap;line-height:1.6;background:var(--bg-card);padding:10px 12px;border-radius:8px;font-size:13px;word-break:break-word}
.aics-work .sm-meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--text2);padding:8px 0;margin-bottom:4px}
.aics-work .sm-meta-item{display:inline-flex;align-items:center;gap:5px}
.aics-work .sm-meta-item b{color:var(--text);font-weight:600}
.aics-work .sm-scene{position:relative;padding:0 0 22px 26px;margin-left:6px;border-left:2px solid rgba(123,92,255,.35)}
.aics-work .sm-scene:last-child{border-left-color:transparent;padding-bottom:0}
.aics-work .sm-scene::before{content:'';position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--purple);box-shadow:0 0 0 3px rgba(123,92,255,.15)}
.aics-work .sm-scene-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.aics-work .sm-scene-title{font-weight:700;color:var(--purple);font-size:14.5px}
.aics-work .sm-box{margin-top:10px}
.aics-work .shop-gen-img{width:100%;max-width:420px;border-radius:8px;border:1px solid var(--border);margin-top:8px;display:block}
/* ===== Audio ===== */
.aics-work .audio-player-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:4px}
.aics-work .audio-player-row audio{flex:1;min-width:220px;margin-top:0}
.aics-work .audio-info{font-size:12.5px;color:var(--text2);margin-top:10px}
/* ===== Translation (line-by-line) ===== */
.aics-work .trans-view{margin-top:10px}
.aics-work .trans-pair{background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:10px}
.aics-work .trans-ts{font-size:11px;color:var(--text3);font-family:'Courier New',monospace;margin-bottom:6px}
.aics-work .trans-src{font-size:13.5px;color:var(--cyan);line-height:1.6;word-break:break-word}
.aics-work .trans-out{font-size:13.5px;color:var(--success);line-height:1.6;margin-top:4px;padding-top:4px;border-top:1px dashed rgba(0,230,118,.2);word-break:break-word}
.aics-work .dir-radio{display:inline-flex;align-items:center;gap:6px;background:var(--bg-input);border:1px solid var(--border);border-radius:20px;padding:8px 14px;font-size:12.5px;color:var(--text2);cursor:pointer;user-select:none}
.aics-work .dir-radio input{width:auto;margin:0;accent-color:var(--cyan);min-height:0;padding:0}
.aics-work .dir-radio.selected{border-color:var(--cyan);background:rgba(0,229,255,.1);color:var(--text)}
/* ===== Responsive ===== */
@media(max-width:767px){
.aics-work .branch-action-grid{grid-template-columns:1fr}
.aics-work .sm-meta{gap:4px 12px}
.aics-work .audio-player-row audio{min-width:100%}
.aics-work .shop-view-title{font-size:13.5px}
.aics-work .card{padding:14px}
}
</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Shop Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/shop" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'shop',
  activeId: 'shop',
  nameMy: 'ဈေး Studio',
  desc: 'Marketing content & product videos',
  icon: '🛒',
  modelCat: 'text',
  steps: STEPS,
  content: STEPS_HTML,
})}
${sidebarScript()}
<div class="toast" id="toast"></div>
<script>${STATE_SCRIPT}${CONSTANTS_SCRIPT}${HELPERS_SCRIPT}${ACTIONS_SCRIPT}${VIDEO_SCRIPT}${AUDIO_SCRIPT}${IMAGE_SCRIPT}${SHELL_SCRIPT}</script>
</body>
</html>`;

export default SHOP_HTML;
