(()=>{
'use strict';
const TOTAL=25000;
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=el=>{const n=Number(String(el?.value??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const isEmergencyName=name=>/imprev|emerg|reserva/i.test(String(name||''));
const state={bound:false,rows:new Map(),busy:false};

function rows(){
 const list=document.getElementById('budgetList');
 if(!list)return [];
 return [...list.querySelectorAll('input[type="number"]')].map(valueInput=>{
   let row=valueInput.parentElement;
   for(let i=0;i<4&&row;i++,row=row.parentElement){
     const text=row.querySelector('input:not([type="number"]),textarea');
     if(text)return {value:valueInput,nameInput:text,name:String(text.value||text.placeholder||'').trim()};
   }
   return null;
 }).filter(Boolean);
}

function emergencyRow(rs){
 return rs.find(r=>isEmergencyName(r.name))||rs.find(r=>/convites.*imprev/i.test(r.name))||null;
}

function setInput(el,value){
 el.value=Math.max(0,Math.round(value*100)/100);
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
}

function syncStorage(rs){
 const keys=['wedding-hub-data-v3','wedding-hub-data-v2','wedding-hub-data-v1','wedding-hub-data','wedding-hub-full-2026'];
 keys.forEach(key=>{
   try{
     const raw=localStorage.getItem(key); if(!raw)return;
     const st=JSON.parse(raw); if(!st||!Array.isArray(st.sectors))return;
     st.sectors.forEach(s=>{const r=rs.find(x=>x.name===s.name);if(r)s.value=num(r.valueInput)});
     localStorage.setItem(key,JSON.stringify(st));
   }catch(e){}
 });
}

function recalc(){
 const panel=document.getElementById('budget'); if(!panel)return;
 const max=document.getElementById('budgetInput');
 const committed=document.getElementById('budgetCommitted');
 const paid=document.getElementById('budgetPaid');
 const left=document.getElementById('budgetLeft');
 if(!max||!committed||!left)return;
 const rs=rows();
 if(!rs.length)return;
 const emergency=emergencyRow(rs);
 if(!emergency)return;

 state.busy=true;
 try{
   // O orçamento do casamento é fixo em R$ 25.000,00.
   if(num(max)!==TOTAL)max.value=TOTAL;

   // Soma dos setores que não são a reserva de emergência.
   const nonEmergency=rs.filter(r=>r!==emergency);
   const used=nonEmergency.reduce((sum,r)=>sum+num(r.valueInput),0);
   let reserve=TOTAL-used;

   // Se a edição ultrapassaria os R$ 25 mil, reduzimos o setor para o máximo possível
   // e preservamos a reserva em zero. Assim a soma nunca passa de R$ 25 mil.
   if(reserve<0){
     const last=state.lastEdited;
     if(last&&last!==emergency){
       const other=nonEmergency.filter(r=>r!==last).reduce((sum,r)=>sum+num(r.valueInput),0);
       const allowed=Math.max(0,TOTAL-other);
       setInput(last.valueInput,allowed);
     }
     reserve=TOTAL-nonEmergency.reduce((sum,r)=>sum+num(r.valueInput),0);
   }

   setInput(emergency.valueInput,Math.max(0,reserve));

   const total=rs.reduce((sum,r)=>sum+num(r.valueInput),0);
   const remaining=Math.max(0,TOTAL-total);
   committed.value=money(total);
   left.value=money(remaining);
   const hBudget=document.getElementById('hBudget'),hLeft=document.getElementById('hLeft');
   if(hBudget)hBudget.textContent=money(TOTAL);
   if(hLeft)hLeft.textContent=money(remaining);
   syncStorage(rs);
 }finally{state.busy=false}
}

function onEdit(e){
 if(state.busy||!e.target.matches('#budgetList input[type="number"]'))return;
 const rs=rows();
 const edited=rs.find(r=>r.valueInput===e.target);
 if(!edited)return;
 state.lastEdited=edited;
 const old=state.rows.get(e.target);
 const now=num(e.target);
 // A diferença é retirada da reserva quando o setor aumenta;
 // quando o setor diminui, a diferença volta para a reserva.
 if(old!=null){
   const emergency=emergencyRow(rs);
   if(emergency&&edited!==emergency){
     const delta=now-old;
     const nextReserve=num(emergency.valueInput)-delta;
     if(nextReserve<0){
       // Não permite ultrapassar os R$ 25 mil.
       setInput(e.target,old+num(emergency.valueInput));
     }else{
       setInput(emergency.valueInput,nextReserve);
     }
   }
 }
 rs.forEach(r=>state.rows.set(r.valueInput,num(r.valueInput)));
 recalc();
}

function bind(){
 const panel=document.getElementById('budget'); if(!panel||state.bound)return;
 state.bound=true;
 panel.addEventListener('input',onEdit);
 panel.addEventListener('change',onEdit);
 const observer=new MutationObserver(()=>{
   if(state.busy)return;
   const rs=rows();
   rs.forEach(r=>{if(!state.rows.has(r.valueInput))state.rows.set(r.valueInput,num(r.valueInput))});
   recalc();
 });
 observer.observe(panel,{childList:true,subtree:true});
 const rs=rows();rs.forEach(r=>state.rows.set(r.valueInput,num(r.valueInput)));
 setTimeout(recalc,100);
 setTimeout(recalc,500);
 setTimeout(recalc,1200);
}
window.addEventListener('load',()=>{bind();setTimeout(bind,300);setTimeout(bind,1000);});
})();
