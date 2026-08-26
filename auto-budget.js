(()=>{
'use strict';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=el=>{const n=Number(String(el?.value??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0};
function updateBudget(){
 const panel=document.getElementById('budget'); if(!panel)return;
 const max=document.getElementById('budgetInput');
 const committed=document.getElementById('budgetCommitted');
 const paid=document.getElementById('budgetPaid');
 const left=document.getElementById('budgetLeft');
 const newValue=document.getElementById('newSectorValue');
 if(!max||!committed||!left)return;
 const values=[...panel.querySelectorAll('input[type="number"]')].filter(i=>i!==max&&i!==newValue&&!i.disabled&&i.offsetParent!==null).map(num);
 const total=values.reduce((a,b)=>a+b,0);
 const remaining=num(max)-total;
 committed.value=money(total);
 left.value=money(remaining);
 const hBudget=document.getElementById('hBudget'),hLeft=document.getElementById('hLeft');
 if(hBudget)hBudget.textContent=money(num(max));
 if(hLeft)hLeft.textContent=money(remaining);
 [committed,left].forEach(el=>el.dispatchEvent(new Event('change',{bubbles:true})));
}
function bind(){
 const panel=document.getElementById('budget'); if(!panel||panel.dataset.autoBudgetBound==='1')return;
 panel.dataset.autoBudgetBound='1';
 panel.addEventListener('input',e=>{if(e.target.matches('input[type="number"]'))updateBudget()});
 panel.addEventListener('change',e=>{if(e.target.matches('input[type="number"]'))updateBudget()});
 new MutationObserver(updateBudget).observe(panel,{childList:true,subtree:true});
 updateBudget();
}
window.addEventListener('load',()=>{bind();setTimeout(bind,300);setTimeout(bind,1000)});
window.addEventListener('hashchange',bind);
})();
