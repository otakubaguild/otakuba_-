window.GuildOrder = (() => {
  const {$, yen, esc, todayText} = GuildUtils;
  let pending=null;
  function itemFromProduct(p){ return {id:p.id, name:p.name, cat:p.cat||p.category||'food', price:Number(p.price)||0, qty:1, subtotal:Number(p.price)||0}; }
  function askOrder(product){ pending=itemFromProduct(product); GuildAudio.playSe('add'); $('orderConfirmBody').textContent=`このクエストを受注しますか？\n\n・${pending.name} ×1 = ${yen(pending.subtotal, GuildStorage.getData().settings.currency)}\n\n注文確定で敵にダメージが入ります。`; GuildUI.openModal('modalOrderConfirm'); }
  function addToBill(item){ const data=GuildStorage.getData(); data.activeBill=data.activeBill||[]; const old=data.activeBill.find(x=>x.id===item.id); if(old){ old.qty+=item.qty; old.subtotal+=item.subtotal; } else data.activeBill.push(Object.assign({},item)); GuildStorage.save(); }
  function record(type, items, total, reason=''){
    const data=GuildStorage.getData();
    const c=GuildCustomer.current() || {name:'未登録',level:1,title:''};
    const rec={id:GuildUtils.uid(type==='checkout'?'sale':'order'), type, customer:c.name, items, total, time:new Date().toISOString(), timeText:todayText(), reason};
    // 売上は会計時だけ保存。注文確定は厨房/GAS通知と討伐ダメージのみ。
    if(type==='checkout'){
      data.sales.push(rec);
      c.total=(Number(c.total)||0)+Number(total||0);
      c.lastVisit=rec.timeText;
      GuildStorage.save();
    }
    return rec;
  }
  function payload(type, sale, items, total, extra={}){ const c=GuildCustomer.current(); const e=GuildBattle.enemy(); return Object.assign({action:'order',type,orderId:sale.id,sale,adventurerId:c&&c.id||'',adventurer:c&&c.name||sale.customer||'未登録',name:c&&c.name||sale.customer||'未登録',title:c&&c.title||'',level:c&&c.level||1,visits:c&&c.visits||0,items,total,enemy:e?{name:e.name,hp:e.hp,maxHp:e.maxHp,defeated:false}:null,source:'index',appVersion:GuildApp.VERSION,time:todayText()},extra); }
  async function confirmOrder(){ if($('screenMain').classList.contains('combat-lock'))return; if(!pending){ GuildUI.toast('注文がありません'); return; } const item=Object.assign({},pending); pending=null; $('btnDoOrder').disabled=true; const sale=record('order',[item],item.subtotal); addToBill(item); GuildNotify.send(payload('order',sale,[item],item.subtotal,{orderDamage:item.subtotal,directOrder:true})); GuildUI.closeModals(); GuildUI.show('screenMain'); await GuildBattle.applyDamage(item.subtotal,(defeated,finalDefeated)=>{ GuildStorage.save(); GuildBattle.render(); $('screenMain').classList.remove('combat-lock'); $('damagePop').classList.remove('on'); $('btnDoOrder').disabled=false; GuildUI.toast(finalDefeated?'魔王を討伐した！':(defeated?'撃破！ 注文完了':'注文完了！')); }); }
  function checkoutAsk(){ const data=GuildStorage.getData(); const all=(data.activeBill||[]).slice(); const total=all.reduce((s,i)=>s+Number(i.subtotal||0),0); $('checkoutConfirmBody').textContent = all.length ? `帰還しますか？\n\n${all.map(i=>`・${i.name} ×${Number(i.qty||1)} = ${yen(i.subtotal,data.settings.currency)}`).join('\n')}\n\n会計合計 ${yen(total,data.settings.currency)}\n\n会計のみ行います。ダメージは注文確定時に入ります。` : '未会計の注文はありません。帰還しますか？'; GuildUI.openModal('modalCheckoutConfirm'); }
  function checkoutDo(){ const data=GuildStorage.getData(); const all=(data.activeBill||[]).slice(); const total=all.reduce((s,i)=>s+Number(i.subtotal||0),0); const before=GuildCustomer.current()?Number(GuildCustomer.current().level||1):1; const sale=record('checkout',all,total); GuildNotify.send(payload('checkout',sale,all,total,{checkoutOnly:true})); const lv=GuildCustomer.levelUpByTotal(); if(lv.leveled) GuildAudio.playSe('levelup'); data.activeBill=[]; GuildStorage.save(); GuildBattle.render(); GuildUI.closeModals(); $('screenMain').classList.remove('combat-lock'); GuildUI.toast('クエスト達成（会計）を送信しました'); setTimeout(()=>GuildUI.show('screenWelcome'),900); }
  function cancelPending(){ pending=null; GuildAudio.playSe('cancel'); GuildUI.closeModals(); }
  return {askOrder, confirmOrder, checkoutAsk, checkoutDo, cancelPending, record};
})();
