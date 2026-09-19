// AI Creative Studio — Voice Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from voice.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { HOME_HTML } from './ui.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { STATE_SCRIPT } from './state.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';

export const VOICE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Voice Studio — AI Creative Studio</title>
<style>
:root{--bg:#080c18;--card:#0d1424;--card2:#111a2e;--input:#0a1020;--border:rgba(0,229,255,.15);--strong:rgba(0,229,255,.35);--cyan:#00e5ff;--purple:#7b5cff;--text:#e8ecf4;--muted:#8b95a8;--success:#00e676;--error:#ff5252;--warn:#ffc107;--bg-card:var(--card);--bg-card2:var(--card2);--bg-input:var(--input);--border-strong:var(--strong);--text2:var(--muted)}
*{box-sizing:border-box}body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
.aics-work .voice-screen{display:none}.aics-work .voice-screen.active{display:block}.aics-work .voice-hero{text-align:center;padding:26px 12px 22px}.aics-work .voice-hero-icon{font-size:42px}.aics-work .voice-hero h1{font-size:23px;margin:5px 0;background:linear-gradient(90deg,var(--purple),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}.aics-work .voice-hero p{color:var(--muted);font-size:15px}
.aics-work .mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:760px;margin:0 auto}.aics-work .mode-card{appearance:none;text-align:left;background:linear-gradient(145deg,var(--card),var(--card2));border:1px solid var(--border);border-radius:18px;padding:22px;min-height:190px;color:var(--text);cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:.2s}.aics-work .mode-card:hover,.aics-work .mode-card:focus{border-color:var(--cyan);transform:translateY(-2px);outline:none;box-shadow:0 8px 28px rgba(0,229,255,.1)}.aics-work .mode-icon{font-size:30px}.aics-work .mode-title{font-size:17px;font-weight:700;color:var(--cyan)}.aics-work .mode-desc{color:var(--muted);font-size:13px}.aics-work .mode-action{margin-top:auto;font-weight:700;color:#fff}
.aics-work .voice-stepper{display:flex;align-items:center;justify-content:center;gap:3px;margin:0 auto 18px;max-width:820px;overflow-x:auto;padding:6px 8px}
.aics-work .vstep{border:1px solid transparent;background:none;color:#5a6478;padding:6px 9px;border-radius:8px;white-space:nowrap;font-size:12px;font-weight:600;transition:all .2s}
.aics-work .vstep.active{background:linear-gradient(90deg,rgba(123,92,255,.18),rgba(0,229,255,.08));border:1px solid rgba(123,92,255,.55);box-shadow:0 0 14px rgba(123,92,255,.25);color:#fff}
.aics-work .vstep.done{opacity:.75;color:#4ade80}
.aics-work .vstep.loading{border-color:rgba(0,229,255,.6);box-shadow:0 0 18px rgba(0,229,255,.35);color:#00e5ff}
.aics-work .vlink{height:1px;background:rgba(0,229,255,.22);width:12px;flex:0 0 12px}
.aics-work .vcard{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px}.aics-work .vtitle{font-size:16px;font-weight:700;color:var(--cyan);margin-bottom:7px}.aics-work .hint{color:var(--muted);font-size:12.5px;margin-bottom:15px}.aics-work .form-group{margin-bottom:15px}.aics-work label{display:block;color:var(--muted);font-size:12.5px;margin-bottom:6px;font-weight:600}.aics-work input,.aics-work textarea,select{width:100%;background:var(--input);border:1px solid var(--border);border-radius:12px;color:var(--text);font:inherit;padding:11px 13px;min-height:44px}.aics-work textarea{min-height:120px;resize:vertical}.aics-work input:focus,.aics-work textarea:focus,select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 2px rgba(0,229,255,.1)}.aics-work input[type=file]{padding:9px}.aics-work .btn-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:10px 17px;border-radius:9px;border:1px solid transparent;font:600 13px inherit;cursor:pointer}.btn:disabled{opacity:.5;cursor:not-allowed}.aics-work .primary{background:linear-gradient(135deg,var(--cyan),#00b8d4);color:#07101b}.aics-work .secondary{background:var(--card2);border-color:var(--strong);color:var(--cyan)}.aics-work .purple{background:linear-gradient(135deg,var(--purple),#9b7dff);color:#fff}.aics-work .ghost{background:transparent;border-color:var(--border);color:var(--muted)}.aics-work .success{background:rgba(0,230,118,.12);border-color:rgba(0,230,118,.3);color:var(--success)}.aics-work .danger{background:rgba(255,82,82,.1);border-color:rgba(255,82,82,.3);color:#ff8a8a}
.aics-work .choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.aics-work .choice-card{background:var(--card2);border:1px solid var(--border);border-radius:13px;padding:16px;text-align:left;color:var(--text);cursor:pointer}.aics-work .choice-card:hover{border-color:var(--cyan)}.aics-work .choice-card strong{display:block;color:var(--cyan);font-size:15px;margin-bottom:4px}.aics-work .choice-card span{color:var(--muted);font-size:12px}
.aics-work .process{text-align:center;padding:30px 15px}.aics-work .process-icon{font-size:34px;margin-bottom:7px}.aics-work .process h2{font-size:18px;color:var(--cyan);margin-bottom:16px}.aics-work .status-list{max-width:470px;margin:auto;text-align:left;background:var(--input);border:1px solid var(--border);border-radius:12px;padding:14px}.aics-work .status-line{padding:6px 0;color:var(--muted)}.aics-work .status-line.current{color:var(--cyan);font-weight:700}.aics-work .status-line.done{color:var(--success)}
.aics-work .audio-box{background:var(--input);border:1px solid var(--border);border-radius:12px;padding:16px}.aics-work .audio-box audio{width:100%}.aics-work .result-text{background:var(--input);border:1px solid var(--border);border-radius:10px;padding:13px;white-space:pre-wrap;min-height:120px}.aics-work .srt-box{font-family:'Courier New',monospace;font-size:12.5px;line-height:1.6;min-height:230px}.aics-work .result-label{font-weight:700;color:var(--cyan);margin:12px 0 7px}.aics-work .pro-note{color:var(--warn);font-size:12px;margin-top:10px}.aics-work .error-box{background:rgba(255,82,82,.08);border:1px solid rgba(255,82,82,.3);color:#ffb0b0;border-radius:10px;padding:12px;margin-top:12px}.aics-work .top-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.aics-work .source-note{font-size:11.5px;color:var(--muted);background:rgba(123,92,255,.08);border:1px solid rgba(123,92,255,.2);border-radius:8px;padding:8px 10px;margin-bottom:12px}
.spinner{width:28px;height:28px;border:3px solid rgba(0,229,255,.2);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:11000;background:var(--card2);border:1px solid var(--strong);padding:11px 18px;border-radius:10px;display:none;box-shadow:0 6px 24px rgba(0,0,0,.4)}.toast.show{display:block}.toast.error{border-color:var(--error);color:#ffb0b0}.toast.success{border-color:var(--success);color:#9fffc4}
@media(max-width:700px){.aics-work .mode-grid,.aics-work .choice-grid{grid-template-columns:1fr}.aics-work .mode-card{min-height:155px}.aics-work .vcard{padding:15px}.aics-work .voice-stepper{justify-content:flex-start;padding:6px 8px}.aics-work .vstep{padding:7px 10px;font-size:12.5px}.aics-work .vlink{width:18px;flex-basis:18px}.btn{flex:0 1 auto}.aics-work .top-actions .btn{width:100%}}
@media(min-width:701px) and (max-width:900px){.aics-work .mode-grid{grid-template-columns:1fr;max-width:620px}}
@media(min-width:901px) and (max-width:1000px){.aics-work .mode-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:760px}}
</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Voice Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/voice" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({id:'voice',activeId:'voice',nameMy:'အသံ Studio',desc:'Text to voice, voice to text',icon:'🎙️',modelCat:'voice',steps:[],content:HOME_HTML})}
<div class="toast" id="toast"></div>
${sidebarScript()}
<script>${CONSTANTS_SCRIPT}${STATE_SCRIPT}${HELPERS_SCRIPT}${ACTIONS_SCRIPT}</script>
</body></html>`;

export default VOICE_HTML;
