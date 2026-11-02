const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
const own=(o,k)=>Object.hasOwn(o,k);
const dict=v=>v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,max=100000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export const key=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-PT');
export const excluded=name=>['gabriel','pedro cunha'].includes(key(name));
export function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function initialState(){return {version:2,students:[],payments:{},lessons:{},sound:true,lastExport:null};}
export function validateState(input){
 if(!dict(input)||![1,2].includes(input.version)||!Array.isArray(input.students)||input.students.length>500||!dict(input.payments)||typeof input.sound!=='boolean')throw Error('Formato de cópia inválido.');
 const legacy=input.version===1,s=initialState(),ids=new Set();s.sound=input.sound;s.lastExport=input.lastExport;
 if(s.lastExport!==null&&(typeof s.lastExport!=='string'||!Number.isFinite(Date.parse(s.lastExport))))throw Error('Data de cópia inválida.');
 s.students=input.students.map(a=>{
  if(!dict(a)||typeof a.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(a.id)||own(Object.prototype,a.id)||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>80||typeof a.archived!=='boolean'||(!legacy&&!integer(a.rateCents)))throw Error('Lista de alunos inválida.');
  ids.add(a.id);return {id:a.id,name:a.name.trim(),archived:a.archived||excluded(a.name),rateCents:legacy?0:a.rateCents};
 });
 for(const [m,entries] of Object.entries(input.payments)){
  if(!MONTH.test(m)||!dict(entries))throw Error('Mês inválido.');s.payments[m]={};
  for(const [id,date] of Object.entries(entries)){if(!ids.has(id)||typeof date!=='string'||!Number.isFinite(Date.parse(date)))throw Error('Pagamento inválido.');s.payments[m][id]=date;}
 }
 if(!legacy){
  if(!dict(input.lessons))throw Error('Registos de aulas inválidos.');
  for(const [m,entries] of Object.entries(input.lessons)){
   if(!MONTH.test(m)||!dict(entries))throw Error('Mês de aulas inválido.');s.lessons[m]={};
   for(const [id,b] of Object.entries(entries)){if(!ids.has(id)||!dict(b)||!integer(b.count,10000)||!integer(b.rateCents)||!Number.isSafeInteger(b.count*b.rateCents))throw Error('Registo de aulas inválido.');s.lessons[m][id]={count:b.count,rateCents:b.rateCents};}
  }
 }
 return s;
}
export function bill(state,month,id){const student=state.students.find(a=>a.id===id);if(!student)throw Error('Aluno inexistente.');return state.lessons[month]?.[id]??{count:0,rateCents:student.rateCents};}
export function setLessons(state,month,id,count,rateCents=bill(state,month,id).rateCents){
 if(!MONTH.test(month)||!integer(count,10000)||!integer(rateCents))throw Error('Aulas ou preço inválidos.');
 const next=structuredClone(state);if(next.payments[month]?.[id])throw Error('Anula o pagamento antes de alterar as aulas ou o preço deste mês.');
 next.lessons[month]??={};next.lessons[month][id]={count,rateCents};return validateState(next);
}
export function setPaid(state,month,id,paid,now=new Date().toISOString()){
 const next=structuredClone(state);if(!MONTH.test(month)||!next.students.some(a=>a.id===id))throw Error('Aluno ou mês inválido.');
 // Freeze the rate for this month before a later price edit.
 next.lessons[month]??={};next.lessons[month][id]??=bill(state,month,id);
 next.payments[month]??={};if(paid)next.payments[month][id]=now;else delete next.payments[month][id];return validateState(next);
}
export function totals(state,month){return state.students.filter(a=>!a.archived).reduce((t,a)=>{const b=bill(state,month,a.id),v=b.count*b.rateCents;t.total+=v;t[state.payments[month]?.[a.id]?'paid':'pending']+=v;return t;},{total:0,paid:0,pending:0});}
export function clearPayments(state,month){if(!MONTH.test(month))throw Error('Mês inválido.');const next=structuredClone(state);next.payments[month]={};return next;}
export function makeBackup(state){return {app:'carla-pagamentos',version:2,exportedAt:new Date().toISOString(),data:validateState(state)};}
export function readBackup(text){const b=JSON.parse(text);if(b.app!=='carla-pagamentos'||![1,2].includes(b.version)||b.data?.version!==b.version)throw Error('Este ficheiro não é uma cópia compatível da Carla.');return validateState(b.data);}
export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');if(!text.trim())throw Error('O CSV está vazio.');
 const first=text.split(/\r?\n/)[0],delimiter=(first.match(/;/g)?.length??0)>(first.match(/,/g)?.length??0)?';':',';
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c==='"'){if(cell||closed)throw Error('Aspas inválidas no CSV.');quoted=true;}
  else if(c===delimiter){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closed=false;}
  else {if(closed&&!/\s/.test(c))throw Error('CSV inválido após aspas.');cell+=c;}
 }
 if(quoted)throw Error('Aspas por fechar no CSV.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 const headers=rows.shift()?.map(key);if(!headers||!['aluno','total','aulas','estado'].every(h=>headers.includes(h)))throw Error('Usa o CSV de resumo da CARLA PRO com Aluno, Total, Aulas e Estado.');
 const seen=new Set(),out=[];
 for(const r of rows){if(r.length!==headers.length)throw Error('Há uma linha com colunas em falta ou a mais.');const get=h=>r[headers.indexOf(h)].trim(),name=get('aluno'),k=key(name);if(!name||name.length>80)throw Error('Nome de aluno inválido.');if(seen.has(k))throw Error(`Aluno repetido no CSV: ${name}.`);seen.add(k);
  const amount=get('total').replace(/\u20ac/g,'').replace(/\s/g,'');if(!/^\d+(?:[,.]\d{1,2})?$/.test(amount))throw Error(`Total inválido para ${name}.`);
  const cents=Math.round(Number(amount.replace(',','.'))*100),count=Number(get('aulas')),status=key(get('estado'));
  if(!/^\d+$/.test(get('aulas'))||!integer(count,10000)||!integer(cents)||!['pago','paga','pendente','por pagar','nao pago'].includes(status))throw Error(`Aulas ou estado inválidos para ${name}.`);
  if((!count&&cents)||(count&&cents%count!==0))throw Error(`Não é possível calcular um preço por aula exato para ${name}.`);
  out.push({name,count,rateCents:count?cents/count:null,paid:['pago','paga'].includes(status),excluded:excluded(name)});
 }
 if(!out.length)throw Error('O CSV não contém alunos.');return out;
}
export function importCSV(state,rows,month,now=new Date().toISOString()){
 if(!MONTH.test(month))throw Error('Escolhe o mês a que corresponde o CSV.');
 const next=structuredClone(state),report={added:0,updated:0,excluded:0,protected:0,paid:0};
 for(const r of rows){if(r.excluded){report.excluded++;continue;}const matches=next.students.filter(a=>key(a.name)===key(r.name));if(matches.length>1)throw Error(`Existem alunos com o mesmo nome: ${r.name}. Corrige os nomes antes de importar.`);
  let a=matches[0];if(!a){a={id:crypto.randomUUID(),name:r.name,archived:false,rateCents:r.rateCents??0};next.students.push(a);report.added++;}else report.updated++;
  // A pending CSV entry must never undo a payment or rewrite its settled bill.
  const alreadyPaid=!!next.payments[month]?.[a.id];
  if(alreadyPaid){report.protected++;if(own(next.lessons[month]??{},a.id))continue;}
  // Legacy payments have no amounts. Fill their first bill from the CSV,
  // keeping the original payment timestamp. Established bills stay frozen.
  const rate=r.rateCents??a.rateCents;if(r.rateCents!==null)a.rateCents=rate;
  next.lessons[month]??={};next.lessons[month][a.id]={count:r.count,rateCents:rate};
  if(r.paid&&!alreadyPaid){next.payments[month]??={};next.payments[month][a.id]=now;report.paid++;}
 }
 return {data:validateState(next),report};
}
