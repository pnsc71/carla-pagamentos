import {initialState,monthKey,setPaid,makeBackup,readBackup,validateState,bill,totals,setLessons,clearPayments,parseCSV,importCSV,key} from './model.mjs';
import {openStore,loadState,saveState,listSnapshots} from './storage.mjs';
const $=id=>document.getElementById(id);
let state=initialState(),revision=0,month=monthKey(),filter='all',busy=true,ready=false,editId=null,pendingAudio,toastTimer,tab='payments';
const money=cents=>new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
const formatMonth=value=>new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(new Date(`${value}-15T12:00:00`));
const formatDate=value=>new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function render(){
 $('month-title').textContent=formatMonth(month);$('month-picker').value=month;
 const active=state.students.filter(a=>!a.archived);const paid=state.payments[month]??{};const count=active.filter(a=>paid[a.id]).length;
 $('values-note').hidden=!active.some(a=>paid[a.id]&&!Object.hasOwn(state.lessons[month]??{},a.id));
 const sums=totals(state,month);$('total-sum').textContent=money(sums.total);$('paid-sum').textContent=money(sums.paid);$('pending-sum').textContent=money(sums.pending);$('page-title').textContent=tab==='payments'?'Pagamentos':'Registar aulas';$('tap-hint').textContent=tab==='payments'?'Toca num cartão para marcar ou anular o pagamento.':'Cada aula corresponde a uma hora. Guarda o número de aulas antes de marcar pago.';$('students').classList.toggle('lesson-grid',tab==='lessons');$('clear-payments').disabled=busy||!ready;
 $('paid-count').textContent=count;$('pending-count').textContent=active.length-count;$('total-count').textContent=active.length;$('progress').style.width=`${active.length?count/active.length*100:0}%`;
 const query=$('search').value.trim().toLocaleLowerCase('pt-PT');const visible=active.filter(a=>a.name.toLocaleLowerCase('pt-PT').includes(query)&&(filter==='all'||(filter==='paid'?!!paid[a.id]:!paid[a.id])));
 const list=$('students');list.replaceChildren();
 for(const a of visible){
  const isPaid=!!paid[a.id],b=bill(state,month,a.id),row=node(tab==='payments'?'button':'article',`student${isPaid?' paid':''}`);
  if(tab==='payments'){row.type='button';row.disabled=busy||!ready;row.setAttribute('aria-label',`${a.name}, ${isPaid?'pago':'por pagar'}, ${money(b.count*b.rateCents)}`);row.onclick=()=>togglePaid(a);}
  row.append(node('span','avatar',a.name.charAt(0)),node('span','student-name',a.name),node('strong','student-amount',money(b.count*b.rateCents)),node('span','student-caption',`${b.count} aulas · ${money(b.rateCents)} / aula`),node('span','badge',isPaid?'✓ Pago':'Por pagar'));
  if(tab==='lessons'){
   const form=node('form','lesson-form'),label=node('label','','Aulas de 1 hora'),input=node('input');input.type='number';input.min='0';input.max='10000';input.step='1';input.value=b.count;input.required=true;input.setAttribute('aria-label',`Número de aulas de ${a.name}`);input.disabled=busy||!ready||isPaid;
   label.append(input);const calculation=node('output','calculation',`Total: ${money(b.count*b.rateCents)}`);input.oninput=()=>{calculation.textContent=input.validity.valid?`Total: ${money(Number(input.value)*b.rateCents)}`:'Número de aulas inválido';};
   const save=node('button','secondary','Guardar aulas');save.type='submit';save.disabled=busy||!ready||isPaid;
   form.onsubmit=async e=>{e.preventDefault();try{if(await commit(setLessons(state,month,a.id,Number(input.value)),'Antes de alterar aulas'))toast('Aulas guardadas.');}catch(e){toast(e.message);}};
   const pay=node('button','primary',isPaid?'Anular pagamento':'Marcar pago');pay.type='button';pay.disabled=busy||!ready;pay.onclick=()=>{if(!isPaid&&Number(input.value)!==b.count){toast('Guarda primeiro as alterações às aulas.');return;}togglePaid(a);};
   form.append(label,calculation,save,pay);row.append(form);
  }
  list.append(row);
 }
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
async function commit(next,label){if(busy||!ready)return false;busy=true;render();try{const clean=validateState(next);revision=await saveState(clean,revision,label);state=clean;return true;}catch(e){toast(e.message);return false;}finally{busy=false;render();}}
function confirmAction(title,text){return new Promise(resolve=>{const d=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm-yes').onclick=()=>{d.close('yes');};$('confirm-no').onclick=()=>d.close('no');d.onclose=()=>resolve(d.returnValue==='yes');d.returnValue='';d.showModal();});}
// Start a fresh audio session in each user gesture. Safari can leave an old
// AudioContext interrupted even when resume() resolves or never settles.
function prepareAudio(){
 pendingAudio?.close();
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  const context=new Context();let closed=false;
  const audio={context,ready:null,close(){if(closed)return;closed=true;clearTimeout(audio.timeout);context.close().catch(()=>{});if(pendingAudio===audio)pendingAudio=null;}};
  pendingAudio=audio;
  // Keep the new context active while the payment is saved, without a sound.
  const silence=context.createBufferSource();silence.buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);silence.connect(context.destination);silence.start();
  audio.ready=Promise.race([context.resume().then(()=>context.state==='running').catch(()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),1200))]);
  audio.timeout=setTimeout(()=>audio.close(),5000);
  return audio;
 }catch{return null;}
}
async function ring(audio){
 if(!state.sound){audio?.close();return;}
 if(!audio || !(await audio.ready)){audio?.close();toast('O som não arrancou. Confirma o modo silencioso e o volume do iPhone.');return;}
 try{
  const context=audio.context;const t=context.currentTime+.015;
  for(const [frequency,start,duration,volume] of [[180,0,.06,.12],[2400,.07,.65,.12],[3200,.08,.45,.055],[3000,.23,.8,.1],[4000,.24,.65,.035]]){
   const o=context.createOscillator(),g=context.createGain();o.type=frequency===180?'square':'sine';o.frequency.value=frequency;
   g.gain.setValueAtTime(volume,t+start);g.gain.exponentialRampToValueAtTime(.001,t+start+duration);o.connect(g);g.connect(context.destination);o.start(t+start);o.stop(t+start+duration);
   o.onended=()=>{o.disconnect();g.disconnect();};
  }
  clearTimeout(audio.timeout);audio.timeout=setTimeout(()=>audio.close(),1600);
 }catch{audio.close();toast('Não foi possível reproduzir o som. Tenta em «Testar som» nas definições.');}
}
async function togglePaid(a){
 if(busy||!ready)return;const selectedMonth=month;const wasPaid=!!state.payments[selectedMonth]?.[a.id];
 if(wasPaid&&!(await confirmAction('Anular pagamento?',`${a.name} volta a ficar por pagar em ${formatMonth(selectedMonth)}.`)))return;
 // Resume synchronously inside the tap; saving never waits for audio.
 const audio=!wasPaid&&state.sound?prepareAudio():null;
 if(await commit(setPaid(state,selectedMonth,a.id,!wasPaid),wasPaid?'Antes de anular um pagamento':'Antes de registar um pagamento')){
  if(wasPaid)toast('Pagamento anulado.');else{ring(audio);$('surprise-detail').textContent=`${a.name} já está em dia em ${formatMonth(selectedMonth)}.`;$('surprise').showModal();}
 }else audio?.close();
}
function renderManagement(){const list=$('manage-students');list.replaceChildren();for(const a of state.students){const row=node('div',`manage-row${a.archived?' archived':''}`);row.append(node('span','',a.name+(a.archived?' · arquivado':'')));const edit=node('button','','Editar');edit.disabled=busy||!ready;edit.onclick=()=>openEdit(a);const archive=node('button','',a.archived?'Reativar':'Arquivar');archive.disabled=busy||!ready;archive.setAttribute('aria-label',`${a.archived?'Reativar':'Arquivar'} ${a.name}`);archive.onclick=async()=>{if(!a.archived&&!(await confirmAction('Arquivar aluno?',`${a.name} sai da lista. Os pagamentos anteriores ficam guardados e podes reativar o aluno a qualquer momento.`)))return;const next=structuredClone(state);next.students.find(s=>s.id===a.id).archived=!a.archived;await commit(next,'Antes de alterar a lista de alunos');};row.append(edit,archive);list.append(row);}}
function openEdit(a){editId=a?.id??null;$('edit-title').textContent=a?'Editar aluno':'Novo aluno';$('student-name').value=a?.name??'';$('student-rate').value=((a?.rateCents??0)/100).toFixed(2);$('edit-dialog').showModal();$('student-name').focus();}
$('edit-form').onsubmit=async event=>{event.preventDefault();const name=$('student-name').value.trim();const rateCents=Math.round(Number($('student-rate').value)*100);if(!name||!Number.isSafeInteger(rateCents)||rateCents<0)return;if(state.students.some(a=>a.id!==editId&&key(a.name)===key(name))){toast('Já existe um aluno com esse nome.');return;}const next=structuredClone(state);if(editId){const a=next.students.find(a=>a.id===editId);a.name=name;a.rateCents=rateCents;}else next.students.push({id:crypto.randomUUID(),name,archived:false,rateCents});if(await commit(next,'Antes de editar alunos'))$('edit-dialog').close();};
$('add-student').onclick=()=>openEdit();
$('sound').onchange=async()=>{const next=structuredClone(state);next.sound=$('sound').checked;const audio=next.sound?prepareAudio():null;if(await commit(next,'Antes de alterar o som')){if(next.sound)ring(audio);else pendingAudio?.close();}else audio?.close();};
$('test-sound').onclick=()=>{if(!state.sound){toast('Liga o som no interruptor acima para testar.');return;}ring(prepareAudio());};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pendingAudio?.close();});
function changeMonth(delta){const d=new Date(`${month}-15T12:00:00`);d.setMonth(d.getMonth()+delta);if(d.getFullYear()<1900||d.getFullYear()>9999)return;month=monthKey(d);render();}
$('previous').onclick=()=>changeMonth(-1);$('next').onclick=()=>changeMonth(1);
$('month-title').onclick=()=>{$('month-picker').hidden=!$('month-picker').hidden;if(!$('month-picker').hidden)$('month-picker').focus();};
$('month-picker').onchange=()=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test($('month-picker').value)){month=$('month-picker').value;$('month-picker').hidden=true;render();}};
$('search').oninput=render;
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;for(const other of document.querySelectorAll('[data-filter]')){other.classList.toggle('active',b===other);other.setAttribute('aria-pressed',String(b===other));}render();};
$('settings').onclick=()=>{$('settings-dialog').showModal();};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
async function exportBackup(mode='auto'){
 if(!ready||busy)return;
 const exportedRevision=revision;
 const file=new File([JSON.stringify(makeBackup(state),null,2)],`carla-pagamentos-${new Date().toISOString().slice(0,10)}.json`,{type:'application/json'});
 try{if(mode!=='download'&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Cópia de segurança — Carla'});}else{const url=URL.createObjectURL(file);const a=node('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 if(revision===exportedRevision){const next=structuredClone(state);next.lastExport=new Date().toISOString();await commit(next,'Antes de exportar uma cópia');}toast('Cópia preparada. Confirma que guardaste o ficheiro em Ficheiros ou iCloud Drive.');
 }catch(e){if(e.name!=='AbortError')toast('Não foi possível exportar a cópia. Tenta novamente.');}
}
$('export').onclick=()=>exportBackup();$('quick-backup').onclick=()=>exportBackup();$('download-backup').onclick=()=>exportBackup('download');
$('import').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>5_000_000){toast('Ficheiro demasiado grande. O limite é 5 MB.');return;}try{const imported=readBackup(await file.text());if(await confirmAction('Restaurar esta cópia?',`Contém ${imported.students.filter(a=>!a.archived).length} alunos ativos e ${Object.keys(imported.payments).length} meses de histórico. Substitui os dados atuais. Guardaremos a versão atual nas versões locais.`)){if(await commit(imported,'Antes de importar uma cópia'))toast('Cópia restaurada.');}}catch(e){toast(`Não foi possível importar: ${e.message}`);}};
$('local-backups').onclick=async()=>{try{const snapshots=await listSnapshots();const list=$('versions');list.replaceChildren();if(!snapshots.length)list.append(node('p','','Ainda não há versões anteriores.'));for(const s of snapshots){const row=node('div','manage-row');row.append(node('span','',`${formatDate(s.date)} · ${s.label}`));const b=node('button','','Recuperar');b.onclick=async()=>{try{const data=validateState(s.data);if(await confirmAction('Recuperar versão?',`Vais recuperar a versão de ${formatDate(s.date)}. A versão atual será guardada.`)){if(await commit(data,'Antes de recuperar uma versão')){$('versions-dialog').close();toast('Versão recuperada.');}}}catch(e){toast(e.message);}};row.append(b);list.append(row);}$('versions-dialog').showModal();}catch{toast('Não foi possível abrir as versões locais.');}};
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{tab=button.dataset.tab;for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}render();};
$('clear-payments').onclick=async()=>{const selected=month;if(await confirmAction('Limpar pagamentos?',`Todos os pagamentos de ${formatMonth(selected)} voltam a ficar por pagar. Os alunos, os preços, as aulas e os outros meses mantêm-se. É guardada uma versão local para recuperação.`)){if(await commit(clearPayments(state,selected),'Antes de limpar pagamentos'))toast('Pagamentos deste mês limpos.');}};
let pendingCSV=null;
$('csv-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>5000000){toast('O limite é 5 MB.');return;}try{pendingCSV=parseCSV(await file.text());$('csv-month').value='';$('csv-preview').textContent=`${pendingCSV.filter(r=>!r.excluded).length} alunos a importar. ${pendingCSV.filter(r=>r.excluded).length} excluídos. O ficheiro não indica o mês. Escolhe o mês das aulas antes de continuar.`;$('csv-dialog').showModal();}catch(e){toast(e.message);}};
$('csv-form').onsubmit=async event=>{event.preventDefault();if(!pendingCSV)return;try{const selected=$('csv-month').value;const {data,report}=importCSV(state,pendingCSV,selected);if(!(await confirmAction('Importar aulas?',`${formatMonth(selected)}: ${report.added} novos alunos, ${report.updated} alunos já existentes, ${report.protected} pagamentos preservados e ${report.excluded} excluídos. Os valores e aulas dos alunos por pagar deste mês serão substituídos pelos do CSV. Os alunos ausentes do CSV e os outros meses mantêm-se.`)))return;if(await commit(data,'Antes de importar CSV')){month=selected;pendingCSV=null;$('csv-dialog').close();toast('CSV importado. Os pagamentos existentes foram preservados.');render();}}catch(e){toast(e.message);}};
async function setupOffline(){if(!('serviceWorker' in navigator)){ $('offline-status').textContent='Este navegador não permite preparar o modo sem internet.';return;}try{const reg=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline-status').textContent='Pronto para usar sem internet neste dispositivo.';const showUpdate=()=>{if(reg.waiting){$('refresh-app').hidden=false;$('refresh-app').onclick=()=>reg.waiting.postMessage('ACTIVATE');}};showUpdate();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',showUpdate));let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});}catch{$('offline-status').textContent='O modo sem internet ainda não está pronto. Volta a abrir com ligação.';}}
async function start(){render();try{await openStore();const loaded=await loadState();state=loaded.data;revision=loaded.revision;if(!revision||loaded.migrated)revision=await saveState(state,revision,loaded.migrated?'Antes da migração para a versão 2':'Primeira abertura');ready=true;try{await navigator.storage?.persist?.();}catch{}}catch(e){toast(`Não foi possível abrir os dados locais. ${e.message}`);$('offline-status').textContent='Permite o armazenamento do site e reabre a aplicação.';}finally{busy=false;render();}setupOffline();}
start();
