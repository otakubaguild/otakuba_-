window.GuildApp = {VERSION:'4.0.4'};
(async function(){
  const {$}=GuildUtils; const data=await GuildStorage.init();
  GuildAudio.init(data.settings); GuildBattle.init(data); GuildMenu.init(data); GuildUI.renderNotice(data.settings);
  if(data.currentCustomer) $('nameInput').value=data.currentCustomer;
  function welcomeText(text){ const sub=document.querySelector('#screenWelcome .subtitle'); if(sub) sub.textContent=text||'メニューを開きますか？'; }
  function showMasterMessage(text){ let box=$('masterMessageBox'); if(!box){ const panel=document.querySelector('#screenWelcome .panel.window'); box=document.createElement('div'); box.id='masterMessageBox'; box.className='panel master-box'; box.innerHTML=`<div class="master-grid"><div class="master-face"><img src="master.png" alt="ギルドマスター" onerror="this.replaceWith(document.createTextNode('🧙'))"></div><div><div class="master-name">ギルドマスター</div><div id="masterMessageText">冷やかしか？さっさとメニューを開け</div></div></div>`; panel.appendChild(box); } $('masterMessageText').textContent=text||'冷やかしか？さっさとメニューを開け'; box.style.display='block'; }
  function hideMasterMessage(){ const box=$('masterMessageBox'); if(box) box.style.display='none'; }
  function renderParty(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); data.partyCount=count; const charge=Number(data.settings.coverCharge??500)||0; $('partyCountView').textContent=`${count}名`; $('chargePreview').textContent=`ギルド登録料（チャージ）：${GuildUtils.yen(charge,data.settings.currency)} × ${count}名 = ${GuildUtils.yen(charge*count,data.settings.currency)}`; }
  function showChargeConfirm(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); const charge=Number(data.settings.coverCharge??500)||0; const total=charge*count; $('chargeConfirmBody').textContent=`ギルドへの登録には登録料（チャージ）が必要です。\n\n冒険者名：${data.currentCustomer||'未登録'}\nパーティ人数：${count}名\n登録料：${GuildUtils.yen(charge,data.settings.currency)} × ${count}名\n\n合計：${GuildUtils.yen(total,data.settings.currency)}\n\n登録しますか？`; GuildUI.openModal('modalChargeConfirm'); }
  function applyCoverCharge(){ const count=Math.max(1,Math.min(20,Number(data.partyCount||1)||1)); const charge=Number(data.settings.coverCharge??500)||0; const total=charge*count; data.activeBill=Array.isArray(data.activeBill)?data.activeBill:[]; data.activeBill=data.activeBill.filter(i=>i.id!=='cover_charge'); if(charge>0&&count>0){ data.activeBill.unshift({id:'cover_charge',name:'ギルド登録料（チャージ）',cat:'charge',price:charge,qty:count,subtotal:total,partyCount:count,isCharge:true}); } GuildStorage.save(); }
  GuildApp.showWelcomeBack=function(){ welcomeText('おかえりなさい、冒険者。次のクエストを受けますか？'); GuildUI.show('screenWelcome'); GuildAudio.playBgm('title'); };
  GuildApp.showLevelUp=function(oldLevel,newLevel){ const o=$('levelUpOverlay'); $('levelUpText').textContent=`Lv.${oldLevel} → Lv.${newLevel}`; o.classList.add('show'); };
  GuildApp.showVictoryClear=function(){ const o=$('victoryClearOverlay'); if(o) o.classList.add('show'); };
  if($('victoryClearClose')) $('victoryClearClose').onclick=()=>{
    const o=$('victoryClearOverlay'); if(o) o.classList.remove('show');
    GuildAudio.stopBgm();
    // 魔王討伐後はタイトルへ戻さず、討伐進行だけ最初の敵へ戻す。
    // save()経由でGASへ送信し、別端末も次回同期時にこのリセットだけ反映される。
    if(GuildStorage.resetProgress) GuildStorage.resetProgress({sync:true});
    GuildUI.show('screenMain');
    GuildBattle.render();
  };
  $('levelUpClose').onclick=()=>$('levelUpOverlay').classList.remove('show');
  $('btnStartYes').onclick=()=>{ GuildAudio.playSe('ok'); GuildAudio.playBgm('title'); hideMasterMessage(); GuildUI.show('screenName'); };
  $('btnStartNo').onclick=()=>{ GuildAudio.playSe('cancel'); showMasterMessage('冷やかしか？さっさとメニューを開け'); };
  $('btnAdmin').onclick=()=>location.href='admin.html';
  $('btnBackWelcome').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.show('screenWelcome'); };
  $('btnNameOk').onclick=()=>{ const n=$('nameInput').value.trim(); if(!n){GuildAudio.playSe('cancel'); GuildUI.toast('名前を入力してください'); return;} GuildAudio.playSe('ok'); GuildCustomer.setName(n); renderParty(); GuildUI.show('screenParty'); };
  function renderExistingList(q){ const list=GuildCustomer.list().filter(c=>!q||String(c.name||'').toLowerCase().includes(q.toLowerCase())); $('existingList').innerHTML = list.length ? list.map(c=>`<button class="btn existing-pick" data-cid="${c.id}" style="display:block;width:100%;text-align:left;margin:4px 0">${GuildUtils.esc(c.name)} <span style="opacity:.6;font-size:.85em">Lv.${c.level||1}・来店${c.visits||0}回</span></button>`).join('') : '<p style="opacity:.6;text-align:center">該当なし</p>'; document.querySelectorAll('.existing-pick').forEach(b=>b.onclick=()=>{ const c=GuildCustomer.selectExisting(b.dataset.cid); if(c){ GuildAudio.playSe('ok'); $('existingOverlay').classList.remove('show'); $('nameInput').value=c.name; renderParty(); GuildUI.show('screenParty'); } }); }
  $('btnSelectExisting').onclick=()=>{ GuildAudio.playSe('ok'); $('existingSearch').value=''; renderExistingList(''); $('existingOverlay').classList.add('show'); };
  $('existingSearch').oninput=e=>renderExistingList(e.target.value);
  $('existingClose').onclick=()=>{ GuildAudio.playSe('cancel'); $('existingOverlay').classList.remove('show'); };
  $('btnPartyMinus').onclick=()=>{ data.partyCount=Math.max(1,Number(data.partyCount||1)-1); GuildStorage.save(); renderParty(); };
  $('btnPartyPlus').onclick=()=>{ data.partyCount=Math.min(20,Number(data.partyCount||1)+1); GuildStorage.save(); renderParty(); };
  $('btnPartyBack').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.show('screenName'); };
  $('btnPartyOk').onclick=()=>{ GuildAudio.playSe('ok'); showChargeConfirm(); };
  $('btnCancelCharge').onclick=()=>GuildUI.closeModals();
  $('btnNoCharge').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); GuildUI.show('screenWelcome'); };
  $('btnDoCharge').onclick=()=>{ GuildAudio.playSe('ok'); applyCoverCharge(); GuildUI.closeModals(); GuildUI.renderNotice(data.settings); GuildUI.show('screenMain'); GuildBattle.render(); };
  $('btnBackTitle').onclick=()=>{ GuildAudio.playSe('cancel'); GuildUI.closeModals(); welcomeText('メニューを開きますか？'); GuildUI.show('screenWelcome'); GuildAudio.playBgm('title'); };
  $('btnCloseMenu').onclick=()=>GuildUI.closeModals(); $('btnCancelOrder').onclick=GuildOrder.cancelPending; $('btnNoOrder').onclick=GuildOrder.cancelPending; $('btnDoOrder').onclick=GuildOrder.confirmOrder; $('btnCheckout').onclick=GuildOrder.checkoutAsk; $('btnCancelCheckout').onclick=()=>GuildUI.closeModals(); $('btnNoCheckout').onclick=()=>GuildUI.closeModals(); $('btnDoCheckout').onclick=GuildOrder.checkoutDo;
  GuildUI.show('screenWelcome'); GuildAudio.playBgm('title');
})();
