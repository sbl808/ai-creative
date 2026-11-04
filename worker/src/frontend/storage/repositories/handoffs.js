const SCRIPT = String.raw`function __aicsHandoffId(){return 'h_'+Date.now().toString(36)+Math.random().toString(36).slice(2,11);}
function __aicsValidateHandoff(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw __aicsStorageError('invalid_handoff');
 if(input.contractVersion!==1)throw __aicsStorageError('unsupported_handoff_version');
 if(typeof input.source!=='string'||!input.source||input.source.length>40)throw __aicsStorageError('invalid_handoff_source');
 if(typeof input.target!=='string'||['story','content','short','image','voice','shop'].indexOf(input.target)===-1)throw __aicsStorageError('invalid_handoff_target');
 if(!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))throw __aicsStorageError('invalid_handoff_payload');
}
window.AICS_HANDOFFS={
 create:function(input){var ownerId;try{ownerId=__aicsRequireUserId();__aicsValidateHandoff(input);}catch(error){return Promise.reject(error);}
  var record={id:__aicsHandoffId(),ownerId:ownerId,contractVersion:input.contractVersion,source:input.source,target:input.target,payload:input.payload,createdAt:input.createdAt||new Date().toISOString()};
  return __aicsDbOpen().then(function(db){return new Promise(function(resolve,reject){var tx;try{tx=db.transaction('studio_handoffs','readwrite');}catch(error){reject(__aicsStorageError('indexeddb_transaction_failed',error));return;}
   tx.oncomplete=function(){resolve({id:record.id,createdAt:record.createdAt});};tx.onerror=function(){reject(__aicsStorageError('indexeddb_transaction_failed',tx.error));};tx.onabort=function(){reject(__aicsStorageError('indexeddb_transaction_aborted',tx.error));};
   try{tx.objectStore('studio_handoffs').add(record);}catch(error){try{tx.abort();}catch(e){}reject(__aicsStorageError('indexeddb_write_failed',error));}
  });});
 },
 get:function(id){var ownerId=__aicsUserId();id=String(id||'');if(!ownerId||!id||id.length>100)return Promise.resolve(null);
  return __aicsDbOpen().then(function(db){return new Promise(function(resolve,reject){var tx;try{tx=db.transaction('studio_handoffs','readonly');}catch(error){reject(__aicsStorageError('indexeddb_transaction_failed',error));return;}
   var result=null,req=tx.objectStore('studio_handoffs').get(id);req.onsuccess=function(){var r=req.result;if(r&&String(r.ownerId||'')===String(ownerId))result=r;};req.onerror=function(){reject(__aicsStorageError('indexeddb_read_failed',req.error));};
   tx.oncomplete=function(){resolve(result);};tx.onerror=function(){reject(__aicsStorageError('indexeddb_transaction_failed',tx.error));};tx.onabort=function(){reject(__aicsStorageError('indexeddb_transaction_aborted',tx.error));};
  });});
 },
 remove:function(id){var ownerId;try{ownerId=__aicsRequireUserId();}catch(error){return Promise.reject(error);}id=String(id||'');if(!id||id.length>100)return Promise.reject(__aicsStorageError('invalid_handoff_id'));
  return __aicsDbOpen().then(function(db){return new Promise(function(resolve,reject){var tx;try{tx=db.transaction('studio_handoffs','readwrite');}catch(error){reject(__aicsStorageError('indexeddb_transaction_failed',error));return;}
   var store=tx.objectStore('studio_handoffs'),req=store.get(id);req.onsuccess=function(){var r=req.result;if(r&&String(r.ownerId||'')===ownerId)store.delete(id);};req.onerror=function(){reject(__aicsStorageError('indexeddb_read_failed',req.error));};
   tx.oncomplete=function(){resolve(true);};tx.onerror=function(){reject(__aicsStorageError('indexeddb_transaction_failed',tx.error));};tx.onabort=function(){reject(__aicsStorageError('indexeddb_transaction_aborted',tx.error));};
  });});
 }
};`;
export function handoffsRepositoryScript(){return SCRIPT;}
