import {initialState,monthKey,setPaid,makeBackup,readBackup,validateState} from './model.mjs';
import {openStore,loadState,saveState,listSnapshots} from './storage.mjs';
const $=id=>document.getElementById(id);
let state=initialState(),revision=0,month=monthKey(),filter='all',busy=true,ready=false,editId=null,audioContext,toastTimer;
const formatMonth=value=>new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(new Date(`${value}-15T12:00:00`));
const formatDate=value=>new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function render(){
 $('month-title').textContent=formatMonth(month);$('month-picker').value=month;
 const active=state.students.filter(a=>!a.archived);const paid=state.payments[month]??{};const count=active.filter(a=>paid[a.id]).length;
 $('paid-count').textContent=count;$('pending-count').textContent=active.length-count;$('total-count').textContent=active.length;$('progress').style.width=`${active.length?count/active.length*100:0}%`;
 const query=$('search').value.trim().toLocaleLowerCase('pt-PT');const visible=active.filter(a=>a.name.toLocaleLowerCase('pt-PT').includes(query)&&(filter==='all'||(filter==='paid'?!!paid[a.id]:!paid[a.id])));
 const list=$('students');list.replaceChildren();
 for(const a of visible){const isPaid=!!paid[a.id];const row=node('button',`student${isPaid?' paid':''}`);row.type='button';row.disabled=busy||!ready;row.setAttribute('aria-label',`${a.name}, ${isPaid?'pago. Toca para anular o pagamento':'por pagar. Toca para marcar como pago'}`);
 const info=node('span','student-info');info.append(node('span','student-name',a.name),node('span','student-caption',isPaid?`Registado a ${new Date(paid[a.id]).toLocaleDateString('pt-PT')}`:'Aulas presenciais'));
 const avatar=node('span','avatar',a.name.charAt(0));avatar.setAttribute('aria-hidden','true');row.append(avatar,info,node('span','badge',isPaid?'Pago':'Por pagar'));row.onclick=()=>togglePaid(a);list.append(row);}
 if(!visible.length)list.append(node('p','empty',active.length?'Nenhum aluno neste filtro.':'Adiciona os teus alunos nas definições.'));
 const needsBackup=!state.lastExport||Date.now()-Date.parse(state.lastExport)>7*86400000;
 $('backup-reminder').hidden=!needsBackup;$('backup-dot').hidden=!needsBackup;
 $('sound').checked=state.sound;$('sound').disabled=!ready||busy;
 $('last-export').textContent=state.lastExport?`Última exportação preparada: ${formatDate(state.lastExport)}. Confirma que guardaste o ficheiro.`:'Ainda não exportaste uma cópia.';
 $('saved-status').textContent=busy?'A guardar…':ready?'✓ Guardado neste dispositivo':'Armazenamento indisponível';
 for(const id of ['export','quick-backup','add-student'])$(id).disabled=busy||!ready;
 $('import').disabled=busy||!ready;
 renderManagement();
}
async function commit(next,label){if(busy||!ready)return false;busy=true;render();try{revision=await saveState(next,revision,label);state=next;return true;}catch(e){toast(e.message);return false;}finally{busy=false;render();}}
function confirmAction(title,text){return new Promise(resolve=>{const d=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm-yes').onclick=()=>{d.close('yes');};$('confirm-no').onclick=()=>d.close('no');d.onclose=()=>resolve(d.returnValue==='yes');d.returnValue='';d.showModal();});}
function ring(){
 if(!state.sound)return;
 try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const t=audioContext.currentTime;
 // A mechanical click followed by the bright double bell of a till.
 for(const [frequency,start,duration,volume] of [[180,0,.06,.12],[2400,.07,.65,.12],[3200,.08,.45,.055],[3000,.23,.8,.1],[4000,.24,.65,.035]]){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=frequency===180?'square':'sine';o.frequency.value=frequency;g.gain.setValueAtTime(volume,t+start);g.gain.exponentialRampToValueAtTime(.001,t+start+duration);o.connect(g);g.connect(audioContext.destination);o.start(t+start);o.stop(t+start+duration);}
 }catch{ /* Payments still work when audio is unavailable. */ }
}
async function togglePaid(a){
 if(busy||!ready)return;const selectedMonth=month;const wasPaid=!!state.payments[selectedMonth]?.[a.id];
 if(wasPaid&&!(await confirmAction('Anular pagamento?',`${a.name} volta a ficar por pagar em ${formatMonth(selectedMonth)}.`)))return;
 // Unlock audio during the user gesture, before waiting for IndexedDB.
 if(!wasPaid&&state.sound){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}catch{}}
 if(await commit(setPaid(state,selectedMonth,a.id,!wasPaid),wasPaid?'Antes de anular um pagamento':'Antes de registar um pagamento')){
  if(wasPaid)toast('Pagamento anulado.');else{ring();$('surprise-detail').textContent=`${a.name} já está em dia em ${formatMonth(selectedMonth)}.`;$('surprise').showModal();}
 }
}
function renderManagement(){const list=$('manage-students');list.replaceChildren();for(const a of state.students){const row=node('div',`manage-row${a.archived?' archived':''}`);row.append(node('span','',a.name+(a.archived?' · arquivado':'')));const edit=node('button','','Editar');edit.disabled=busy||!ready;edit.onclick=()=>openEdit(a);const archive=node('button','',a.archived?'Reativar':'Arquivar');archive.disabled=busy||!ready;archive.setAttribute('aria-label',`${a.archived?'Reativar':'Arquivar'} ${a.name}`);archive.onclick=async()=>{if(!a.archived&&!(await confirmAction('Arquivar aluno?',`${a.name} sai da lista. Os pagamentos anteriores ficam guardados e podes reativar o aluno a qualquer momento.`)))return;const next=structuredClone(state);next.students.find(s=>s.id===a.id).archived=!a.archived;await commit(next,'Antes de alterar a lista de alunos');};row.append(edit,archive);list.append(row);}}
function openEdit(a){editId=a?.id??null;$('edit-title').textContent=a?'Editar aluno':'Novo aluno';$('student-name').value=a?.name??'';$('edit-dialog').showModal();$('student-name').focus();}
$('edit-form').onsubmit=async event=>{event.preventDefault();const name=$('student-name').value.trim();if(!name)return;const next=structuredClone(state);if(editId)next.students.find(a=>a.id===editId).name=name;else next.students.push({id:crypto.randomUUID(),name,archived:false});if(await commit(next,'Antes de editar alunos'))$('edit-dialog').close();};
$('add-student').onclick=()=>openEdit();
$('sound').onchange=async()=>{const next=structuredClone(state);next.sound=$('sound').checked;if(await commit(next,'Antes de alterar o som')){if(next.sound)ring();}};
function changeMonth(delta){const d=new Date(`${month}-15T12:00:00`);d.setMonth(d.getMonth()+delta);if(d.getFullYear()<1900||d.getFullYear()>9999)return;month=monthKey(d);render();}
$('previous').onclick=()=>changeMonth(-1);$('next').onclick=()=>changeMonth(1);
$('month-title').onclick=()=>{$('month-picker').hidden=!$('month-picker').hidden;if(!$('month-picker').hidden)$('month-picker').focus();};
$('month-picker').onchange=()=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test($('month-picker').value)){month=$('month-picker').value;$('month-picker').hidden=true;render();}};
$('search').oninput=render;
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;for(const other of document.querySelectorAll('[data-filter]')){other.classList.toggle('active',b===other);other.setAttribute('aria-pressed',String(b===other));}render();};
$('settings').onclick=()=>{$('settings-dialog').showModal();};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
async function exportBackup(){
 if(!ready||busy)return;
 const exportedRevision=revision;
 const file=new File([JSON.stringify(makeBackup(state),null,2)],`carla-pagamentos-${new Date().toISOString().slice(0,10)}.json`,{type:'application/json'});
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Cópia de segurança — Carla'});}else{const url=URL.createObjectURL(file);const a=node('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 if(revision===exportedRevision){const next=structuredClone(state);next.lastExport=new Date().toISOString();await commit(next,'Antes de exportar uma cópia');}toast('Cópia preparada. Confirma que guardaste o ficheiro em Ficheiros ou iCloud Drive.');
 }catch(e){if(e.name!=='AbortError')toast('Não foi possível exportar a cópia. Tenta novamente.');}
}
$('export').onclick=exportBackup;$('quick-backup').onclick=exportBackup;
$('import').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>5_000_000){toast('Ficheiro demasiado grande. O limite é 5 MB.');return;}try{const imported=readBackup(await file.text());if(await confirmAction('Restaurar esta cópia?',`Contém ${imported.students.filter(a=>!a.archived).length} alunos ativos e ${Object.keys(imported.payments).length} meses de histórico. Substitui os dados atuais. Guardaremos a versão atual nas versões locais.`)){if(await commit(imported,'Antes de importar uma cópia'))toast('Cópia restaurada.');}}catch(e){toast(`Não foi possível importar: ${e.message}`);}};
$('local-backups').onclick=async()=>{try{const snapshots=await listSnapshots();const list=$('versions');list.replaceChildren();if(!snapshots.length)list.append(node('p','','Ainda não há versões anteriores.'));for(const s of snapshots){const row=node('div','manage-row');row.append(node('span','',`${formatDate(s.date)} · ${s.label}`));const b=node('button','','Recuperar');b.onclick=async()=>{try{const data=validateState(s.data);if(await confirmAction('Recuperar versão?',`Vais recuperar a versão de ${formatDate(s.date)}. A versão atual será guardada.`)){if(await commit(data,'Antes de recuperar uma versão')){$('versions-dialog').close();toast('Versão recuperada.');}}}catch(e){toast(e.message);}};row.append(b);list.append(row);}$('versions-dialog').showModal();}catch{toast('Não foi possível abrir as versões locais.');}};
async function setupOffline(){if(!('serviceWorker' in navigator)){ $('offline-status').textContent='Este navegador não permite preparar o modo sem internet.';return;}try{const reg=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline-status').textContent='Pronto para usar sem internet neste dispositivo.';const showUpdate=()=>{if(reg.waiting){$('refresh-app').hidden=false;$('refresh-app').onclick=()=>reg.waiting.postMessage('ACTIVATE');}};showUpdate();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',showUpdate));let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});}catch{$('offline-status').textContent='O modo sem internet ainda não está pronto. Volta a abrir com ligação.';}}
async function start(){render();try{await openStore();const loaded=await loadState();state=loaded.data;revision=loaded.revision;if(!revision)revision=await saveState(state,0,'Primeira abertura');ready=true;try{await navigator.storage?.persist?.();}catch{}}catch(e){toast(`Não foi possível abrir os dados locais. ${e.message}`);$('offline-status').textContent='Permite o armazenamento do site e reabre a aplicação.';}finally{busy=false;render();}setupOffline();}
start();
