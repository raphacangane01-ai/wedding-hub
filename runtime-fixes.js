(()=>{
'use strict';
const WEDDING_DATE=new Date('2028-07-08T17:00:00');
function updateCountdown(){
  const now=new Date(),diff=Math.max(0,WEDDING_DATE-now);
  const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value).padStart(id==='cdD'?1:2,'0')};
  set('cdD',d);set('cdH',h);set('cdM',m);set('cdS',s);
}
function installPwa(){
  let deferred;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=document.getElementById('install');if(b){b.style.display='inline-block';b.onclick=async()=>{deferred.prompt();await deferred.userChoice;deferred=null;b.style.display='none'}}});
  window.addEventListener('appinstalled',()=>{const b=document.getElementById('install');if(b)b.style.display='none'});
}
window.addEventListener('load',()=>{updateCountdown();setInterval(updateCountdown,1000);installPwa();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=12').catch(()=>{})});
})();
