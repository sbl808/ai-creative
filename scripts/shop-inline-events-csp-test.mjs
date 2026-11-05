import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='worker/src/frontend/studios/shop/';
for(const file of ['ui.js','actions.js','video.js','image.js','page.js']){
 const source=fs.readFileSync(root+file,'utf8');
 assert.doesNotMatch(source,/<[^>]*\son(?:click|input|change|keypress|keydown|keyup|submit)\s*=/i,file+' inline event attributes');
 assert.doesNotMatch(source,/<[^>]*\sstyle\s*=/i,file+' inline style attributes');
}
const actions=fs.readFileSync(root+'actions.js','utf8');
assert.match(actions,/installShopDelegatedEvents/);
assert.match(actions,/addEventListener\(type,dispatch\)/);
const ui=fs.readFileSync(root+'ui.js','utf8');
assert.match(ui,/data-shop-action="generateContent"/);
assert.match(ui,/data-shop-event="keydown"/);
assert.match(ui,/data-shop-arg2="advProductPanel"/);
const video=fs.readFileSync(root+'video.js','utf8');
assert.match(video,/data-shop-action="genImage"/);
assert.match(video,/data-shop-index=/);
const page=fs.readFileSync(root+'page.js','utf8');
assert.match(page,/aics-shop-login-hidden/);
for(const cls of ['shop-hidden','shop-style-mt-6','shop-style-minh-120','shop-style-mt-16','shop-style-audio-player','shop-style-mt-2','shop-style-inline-margin','shop-style-mt-8'])assert.ok(page.includes('.'+cls),'missing '+cls);
console.log('Shop CSP static contract checks passed.');
