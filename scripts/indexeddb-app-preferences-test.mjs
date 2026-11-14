import assert from 'node:assert/strict';
import vm from 'node:vm';
import { appPreferencesRepositoryScript } from '../worker/src/frontend/storage/repositories/app-preferences.js';
const records = new Map();
const db = { transaction() {
  const tx = {};
  const store = {
    get(key) { const request = {}; queueMicrotask(() => { request.result=records.get(key); request.onsuccess&&request.onsuccess(); queueMicrotask(()=>tx.oncomplete&&tx.oncomplete()); }); return request; },
    put(record) { const request = {}; queueMicrotask(() => { records.set(record.key,record); request.onsuccess&&request.onsuccess(); queueMicrotask(()=>tx.oncomplete&&tx.oncomplete()); }); return request; }
  };
  tx.objectStore=()=>store; return tx;
}};
const context={window:{},__aicsDbOpen:()=>Promise.resolve(db),__aicsStorageError:(code,cause)=>Object.assign(new Error(code),{code,cause}),Date,Promise,Object,String,Array};
vm.runInNewContext(appPreferencesRepositoryScript(),context);
const prefs=context.window.AICS_APP_PREFERENCES;
assert.equal(prefs.getDefaultLanguage(),'zh-CN');
assert.deepEqual(Array.from(prefs.getSupportedLanguages()),['my','zh-CN','en']);
assert.equal(await prefs.getLanguage(),'zh-CN');
assert.equal(await prefs.setLanguage('my-MM'),'my');
assert.equal(await prefs.getLanguage(),'my');
assert.equal(await prefs.setLanguage('zh_CN'),'zh-CN');
assert.equal(await prefs.getLanguage(),'zh-CN');
assert.equal(await prefs.setLanguage('en-GB'),'en');
assert.equal(await prefs.getLanguage(),'en');
assert.equal(records.size,1);
assert.equal(records.get('app_language').value,'en');
assert.equal(typeof records.get('app_language').updatedAt,'string');
console.log('IndexedDB App Preferences tests passed.');
