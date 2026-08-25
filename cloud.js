import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://xjzwacvpmfsydbcaikyd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LTtvzFYUcwVvcdAiVml4bw_q6wqJOJ4';
const TABLE = 'wedding_hub_data';
const LOCAL_KEYS = ['wedding-hub-data-v3','wedding-hub-data-v2','wedding-hub-data-v1','wedding-hub-data'];
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let syncing = false;
let saveTimer = null;
let authReady = false;

const $ = (id) => document.getElementById(id);

function localData(){
  for(const key of LOCAL_KEYS){
    const raw = localStorage.getItem(key);
    if(raw){ try { return JSON.parse(raw); } catch(e){} }
  }
  return null;
}

function localKey(){ return 'wedding-hub-data-v3'; }

function toast(msg){
  let t=$('cloudToast');
  if(!t){ t=document.createElement('div'); t.id='cloudToast'; t.style='position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;background:#3c3324;color:#fff;padding:10px 16px;border-radius:999px;font:600 13px Arial;box-shadow:0 5px 20px #0003'; document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1'; clearTimeout(t._timer); t._timer=setTimeout(()=>t.style.opacity='0',1800);
}

function overlay(){
  if($('cloudAuth')) return;
  const el=document.createElement('div'); el.id='cloudAuth'; el.innerHTML=`
  <div style="position:fixed;inset:0;background:#fbf7ecf5;backdrop-filter:blur(5px);z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,sans-serif">
    <div style="width:min(420px,100%);background:#fff;border:1px solid #e3d6b8;border-radius:18px;padding:26px;box-shadow:0 12px 45px #0002">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#3f5b44;font-weight:700">Wedding Hub</div>
      <h2 style="font-family:Georgia,serif;color:#3c3324;margin:7px 0 8px">Seus dados, em todos os aparelhos</h2>
      <p style="color:#8a7d64;font-size:13px;line-height:1.5">Entre na sua conta para sincronizar convidados, orçamento, pagamentos e todo o planejamento entre computador e celular.</p>
      <div style="display:flex;gap:7px;margin:16px 0 10px"><button id="cloudLoginTab" style="flex:1;padding:9px;border:0;border-radius:8px;background:#3c3324;color:#fff;font-weight:700">Entrar</button><button id="cloudSignupTab" style="flex:1;padding:9px;border:1px solid #e3d6b8;border-radius:8px;background:#fff;color:#3c3324;font-weight:700">Criar conta</button></div>
      <label style="font-size:11px;color:#8a7d64;font-weight:700">E-mail</label><input id="cloudEmail" type="email" autocomplete="email" style="width:100%;padding:10px;margin:4px 0 10px;border:1px solid #e3d6b8;border-radius:8px;box-sizing:border-box">
      <label style="font-size:11px;color:#8a7d64;font-weight:700">Senha</label><input id="cloudPass" type="password" autocomplete="current-password" style="width:100%;padding:10px;margin:4px 0 10px;border:1px solid #e3d6b8;border-radius:8px;box-sizing:border-box">
      <button id="cloudSubmit" style="width:100%;padding:11px;border:0;border-radius:8px;background:#3f5b44;color:#fff;font-weight:700;cursor:pointer">Entrar</button>
      <div id="cloudMsg" style="font-size:12px;color:#a14b4b;margin-top:10px;min-height:18px"></div>
    </div>
  </div>`;
  document.body.appendChild(el);
  let mode='login';
  const setMode=m=>{mode=m; $('cloudLoginTab').style.background=m==='login'?'#3c3324':'#fff'; $('cloudLoginTab').style.color=m==='login'?'#fff':'#3c3324'; $('cloudSignupTab').style.background=m==='signup'?'#3c3324':'#fff'; $('cloudSignupTab').style.color=m==='signup'?'#fff':'#3c3324'; $('cloudSubmit').textContent=m==='login'?'Entrar':'Criar conta'; $('cloudPass').autocomplete=m==='login'?'current-password':'new-password'; $('cloudMsg').textContent='';};
  $('cloudLoginTab').onclick=()=>setMode('login'); $('cloudSignupTab').onclick=()=>setMode('signup');
  $('cloudSubmit').onclick=async()=>{
    const email=$('cloudEmail').value.trim(), password=$('cloudPass').value;
    if(!email||password.length<6){$('cloudMsg').textContent='Informe um e-mail e uma senha de pelo menos 6 caracteres.';return;}
    $('cloudSubmit').disabled=true; $('cloudMsg').textContent='Aguarde...';
    try{
      let result;
      if(mode==='signup') result=await supabase.auth.signUp({email,password});
      else result=await supabase.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      if(mode==='signup' && !result.data.session){$('cloudMsg').style.color='#3f5b44';$('cloudMsg').textContent='Conta criada. Verifique seu e-mail para confirmar e depois entre.';return;}
      await syncFromCloudOrUploadLocal(result.data.session?.user?.id);
      location.reload();
    }catch(err){$('cloudMsg').style.color='#a14b4b';$('cloudMsg').textContent=err.message||'Não foi possível entrar.';}
    finally{$('cloudSubmit').disabled=false;}
  };
}

async function syncFromCloudOrUploadLocal(userId){
  if(!userId) return;
  syncing=true;
  const {data,error}=await supabase.from(TABLE).select('data,updated_at').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  const local=localData();
  if(data?.data && Object.keys(data.data).length){
    localStorage.setItem(localKey(),JSON.stringify(data.data));
  }else if(local){
    const {error:upErr}=await supabase.from(TABLE).upsert({user_id:userId,data:local,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(upErr) throw upErr;
    localStorage.setItem(localKey(),JSON.stringify(local));
  }
  syncing=false;
}

async function pushLocal(){
  if(!authReady || syncing) return;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return;
  const data=localData();
  if(!data) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    const {error}=await supabase.from(TABLE).upsert({user_id:user.id,data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error) console.error('Wedding Hub sync:',error);
  },500);
}

function patchStorage(){
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    original.call(this,key,value);
    if(LOCAL_KEYS.includes(key)) pushLocal();
  };
}

async function boot(){
  patchStorage();
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){ overlay(); return; }
  try{
    await syncFromCloudOrUploadLocal(session.user.id);
    authReady=true;
    toast('Dados sincronizados na nuvem');
  }catch(e){
    console.error(e);
    toast('Não foi possível sincronizar agora');
  }
  supabase.auth.onAuthStateChange((_event,newSession)=>{ if(!newSession){location.reload();} });
}

window.addEventListener('load',boot);
