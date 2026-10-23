import {initialState,validateState} from './model.mjs';
let db;
export function openStore() {return new Promise((resolve,reject)=>{const request=indexedDB.open('carla-pagamentos-v1',1);request.onupgradeneeded=()=>{request.result.createObjectStore('current');request.result.createObjectStore('snapshots',{keyPath:'id',autoIncrement:true});};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Fecha outras janelas da Carla e volta a abrir.'));request.onsuccess=()=>{db=request.result;db.onversionchange=()=>db.close();resolve();};});}
export function loadState() {return new Promise((resolve,reject)=>{const tx=db.transaction('current','readonly');const req=tx.objectStore('current').get('state');req.onsuccess=()=>{try{const record=req.result;resolve(record?{data:validateState(record.data),revision:record.revision}:{data:initialState(),revision:0});}catch(e){reject(e);}};req.onerror=()=>reject(req.error);});}
export function saveState(data,revision,label) {
 const clean=validateState(data);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['current','snapshots'],'readwrite');let conflict=false;const current=tx.objectStore('current');const snapshots=tx.objectStore('snapshots');
  current.get('state').onsuccess=e=>{
   const old=e.target.result;if((old?.revision??0)!==revision){conflict=true;tx.abort();return;}
   if(old) snapshots.add({date:new Date().toISOString(),label,data:old.data});
   current.put({revision:revision+1,data:clean},'state');
   snapshots.getAllKeys().onsuccess=e=>{const keys=e.target.result;for(const key of keys.slice(0,Math.max(0,keys.length-30)))snapshots.delete(key);};
  };
  tx.oncomplete=()=>resolve(revision+1);tx.onabort=()=>reject(new Error(conflict?'Os dados mudaram noutra janela. Reabre a aplicação antes de continuar.':'Não foi possível guardar. A alteração não foi aplicada.'));tx.onerror=()=>{};
 });
}
export function listSnapshots(){return new Promise((resolve,reject)=>{const r=db.transaction('snapshots','readonly').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result.reverse());r.onerror=()=>reject(r.error);});}
