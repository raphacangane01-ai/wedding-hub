(()=>{
'use strict';
const TOTAL=25000;
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=el=>{const n=Number(String(el?.value??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const isEmergencyName=name=>/(emerg|imprev|reserva)/i.test(String(name||''));
const state={bound:false,busy:false,values:new Map()};

function getRows(){
 const list=document.getElementById('budgetList');
 if(!list)return [];
 return [...list.querySelectorAll('input[type="number"]')].map(valueInput=>{
   let row=valueInput.parentElement;
   for(let i=0;i<5&&row;i++,row=row.parentElement){
     const text=row.querySelector('input:not([type="number"]),textarea');
     if(text)return {valueInput,nameInput:text,name:String(text.value||text.placeholder||'').trim()};
   }
   return null;
 }).filter(Boolean);
}
function emergencyRow(rs){return rs.find(r=>isEmergencyName(r.name))||null}
function silentValue(el,value){el.value=Math.max(0,Math.round(value*100)/100)}
function saveSectorValues(rs){
 const keys=['wedding-hub-data-v3','wedding-hub-data-v2','wedding-hub-data-v1','wedding-hub-data','wedding-hub-full-2026'];
 keys.forEach(key=>{try{const raw=localStorage.getItem(key);if(!raw)return;const st=JSON.parse(raw);if(!st||!Array.isArray(st.sectors))return;st.sectors.forEach(s=>{const r=rs.find(x=>x.name===s.name);if(r)s.value=num(r.valueInput)});localStorage.setItem(key,JSON.stringify(st))}catch(e){}});
}
function keepBudgetFixed(){
 const max=document.getElementById('budgetInput');
 if(max){max.value=TOTAL;max.readOnly=true;max.setAttribute('aria-readonly','true')}
}
function rebalance(edited){
 const rs=getRows();const emergency=emergencyRow(rs);if(!edited||!emergency||edited===emergency)return;
 const previous=state.values.get(edited.valueInput);
 const current=num(edited.valueInput);
 if(previous==null){state.values.set(edited.valueInput,current);return}
 const delta=current-previous;
 if(delta===0)return;
 const reserveBefore=num(emergency.valueInput);
 const reserveAfter=reserveBefore-delta;
 if(reserveAfter<0){
   // Não permite consumir mais do que existe na reserva.
   silentValue(edited.valueInput,previous+reserveBefore);
   silentValue(emergency.valueInput,0);
 }else{
   silentValue(emergency.valueInput,reserveAfter);
 }
 rs.forEach(r=>state.values.set(r.valueInput,num(r.valueInput)));
 saveSectorValues(rs);
}
function refresh(){
 const rs=getRows();
 if(!rs.length)return;
 keepBudgetFixed();
 const emergency=emergencyRow(rs);
 if(emergency&&!state.values.size){
   rs.forEach(r=>state.values.set(r.valueInput,num(r.valueInput)));
 }
}
function onEdit(e){
 if(state.busy||!e.target.matches('#budgetList input[type="number"]'))return;
 state.busy=true;
 try{const rs=getRows();const edited=rs.find(r=>r.valueInput===e.target);if(edited)rebalance(edited);keepBudgetFixed()}finally{state.busy=false}
}
function bind(){
 const panel=document.getElementById('budget');if(!panel||state.bound)return;state.bound=true;
 panel.addEventListener('input',onEdit);panel.addEventListener('change',onEdit);
 const observer=new MutationObserver(()=>{if(state.busy)return;refresh()});observer.observe(panel,{childList:true,subtree:true});
 refresh();setTimeout(refresh,200);setTimeout(refresh,700);setTimeout(refresh,1500);
}
window.addEventListener('load',()=>{bind();setTimeout(bind,300);setTimeout(bind,1000)});
window.addEventListener('hashchange',refresh);
})();
