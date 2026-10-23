export const NAMES = ['Benedita','Pilar','Mateus','Gabriel','Rita','Aida','Francisco','Constança','Jorge','Eva','Ema','Tomás','Beatriz','Leonor','Maria','Andreia'];
export function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }
export function initialState() { return {version:1,students:NAMES.map((name,i)=>({id:`aluno-${i+1}`,name,archived:false})),payments:{},sound:true,lastExport:null}; }
export function validateState(s) {
 if(!s || s.version!==1 || !Array.isArray(s.students) || s.students.length>500 || !s.payments || typeof s.payments!=='object' || Array.isArray(s.payments) || typeof s.sound!=='boolean') throw new Error('Formato de cópia inválido.');
 const ids=new Set(); const students=s.students.map(a=>{if(!a || typeof a.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(a.id) || ids.has(a.id) || typeof a.name!=='string' || !a.name.trim() || a.name.length>80 || typeof a.archived!=='boolean') throw new Error('Lista de alunos inválida.');ids.add(a.id);return {id:a.id,name:a.name.trim(),archived:a.archived};});
 const payments={};
 for(const [month,entries] of Object.entries(s.payments)) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !entries || typeof entries!=='object' || Array.isArray(entries)) throw new Error('Mês inválido.');
  payments[month]={}; for(const [id,date] of Object.entries(entries)) {if(!ids.has(id) || typeof date!=='string' || !Number.isFinite(Date.parse(date))) throw new Error('Pagamento inválido.');payments[month][id]=date;}
 }
 if(s.lastExport!==null && (typeof s.lastExport!=='string' || !Number.isFinite(Date.parse(s.lastExport)))) throw new Error('Data de cópia inválida.');
 return {version:1,students,payments,sound:s.sound,lastExport:s.lastExport};
}
export function setPaid(state,month,id,paid,now=new Date().toISOString()) {
 const copy=structuredClone(state);if(!copy.students.some(a=>a.id===id)) throw new Error('Aluno inexistente.');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.');
 copy.payments[month]??={};if(paid) copy.payments[month][id]=now;else delete copy.payments[month][id];return copy;
}
export function makeBackup(state) {return {app:'carla-pagamentos',version:1,exportedAt:new Date().toISOString(),data:validateState(state)};}
export function readBackup(text) {const b=JSON.parse(text);if(b.app!=='carla-pagamentos'||b.version!==1) throw new Error('Este ficheiro não é uma cópia da Carla — Pagamentos.');return validateState(b.data);}
