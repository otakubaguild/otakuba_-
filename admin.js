(async function(){
  const {$, esc, yen} = GuildUtils;
  const data = await GuildStorage.init();
  const SESSION='otakuba.v3.full.admin.session';
  const tabs=[['dash','📊 概要'],['menu','🍴 menu.json'],['monsters','⚔️ monsters.json'],['settings','⚙️ settings.json'],['customers','👤 customers'],['sales','💰 sales'],['export','💾 export'],['reset','🧹 reset']];
  let current='dash';
  function loginOk(){ return sessionStorage.getItem(SESSION)==='ok'; }
  function showLogin(){ $('adminLogin').classList.remove('hidden'); $('adminApp').classList.add('hidden'); }
  function showApp(){ $('adminLogin').classList.add('hidden'); $('adminApp').classList.remove('hidden'); renderTabs(); render(); }
  $('adminLoginBtn').onclick=()=>{ if($('adminPass').value === (data.settings.adminPassword || 'OTAKU')){ sessionStorage.setItem(SESSION,'ok'); showApp(); } else $('loginError').textContent='パスワードが違います'; };
  $('adminBackToIndex').onclick=()=>{ location.href='index.html'; };
  $('adminHeaderToIndex').onclick=()=>{ location.href='index.html'; };
  $('logoutBtn').onclick=()=>{ sessionStorage.removeItem(SESSION); showLogin(); };
  function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),1500); }
  function renderTabs(){ $('adminTabs').innerHTML=tabs.map(t=>`<button class="tab ${current===t[0]?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join(''); document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{current=b.dataset.tab;renderTabs();render();}); }
  function textareaEditor(key,label){ const value=JSON.stringify(data[key],null,2); $('adminContent').innerHTML=`<h2>${label}</h2><p class="tiny">ここを編集して保存。今後は巨大HTMLではなく、このJSONだけで内容変更できます。</p><textarea class="json-box" id="jsonEdit">${esc(value)}</textarea><div class="toolbar"><button class="btn gold" id="saveJson">保存</button><button class="btn" id="formatJson">整形</button></div>`; $('saveJson').onclick=()=>{ try{ data[key]=JSON.parse($('jsonEdit').value); GuildStorage.save(); toast('保存しました'); }catch(e){ toast('JSONエラー: '+e.message); } }; $('formatJson').onclick=()=>{ try{$('jsonEdit').value=JSON.stringify(JSON.parse($('jsonEdit').value),null,2);}catch(e){toast('JSONエラー');} }; }
  function render(){
    if(current==='dash'){ const c=data.customers.length, s=data.sales.reduce((a,x)=>a+(Number(x.total)||0),0), e=data.monsters[data.currentEnemyIndex]||{}; $('adminContent').innerHTML=`<h2>概要</h2><div class="grid"><div class="admin-card"><div class="admin-card-title">現在の敵</div>${esc(e.name||'-')}<br>HP ${e.hp||0}/${e.maxHp||0}</div><div class="admin-card"><div class="admin-card-title">顧客数</div>${c}</div><div class="admin-card"><div class="admin-card-title">売上累計</div>${yen(s,data.settings.currency)}</div><div class="admin-card"><div class="admin-card-title">管理方式</div>完全分割管理版</div></div>`; }
    if(current==='menu') textareaEditor('menu','menu.json');
    if(current==='monsters') textareaEditor('monsters','monsters.json');
    if(current==='settings') textareaEditor('settings','settings.json');
    if(current==='customers') textareaEditor('customers','customers.json');
    if(current==='sales') textareaEditor('sales','sales.json');
    if(current==='export'){ $('adminContent').innerHTML=`<h2>全データExport</h2><textarea class="json-box" readonly>${esc(JSON.stringify(data,null,2))}</textarea>`; }
    if(current==='reset'){ $('adminContent').innerHTML=`<h2>リセット</h2><p>討伐進行と未会計注文だけをリセットします。</p><button class="btn red" id="resetProgress">討伐進行を初期化</button>`; $('resetProgress').onclick=()=>{ if(confirm('討伐進行を初期化しますか？')){ GuildStorage.resetProgress(); toast('リセットしました'); } }; }
  }
  loginOk()?showApp():showLogin();
})();
