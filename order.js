window.GuildOrder = (() => {
  const {$, yen, todayText} = GuildUtils;
  let pending=null;
  let cart=[]; // カートモード用（今までの単一注文フローとは別に、複数商品をためておく）
  function isEventActiveNow(p){
    if(!p || !p.eventOnly) return true;
    const now=Date.now();
    if(p.startAt){ const s=new Date(p.startAt).getTime(); if(Number.isFinite(s) && now<s) return false; }
    if(p.endAt){ const e=new Date(p.endAt).getTime(); if(Number.isFinite(e) && now>e) return false; }
    return true;
  }
  function itemFromProduct(p, qty=1){
    const price=Number(p.price)||0; const q=Number(qty)||1;
    const item={id:p.id,name:p.name,cat:p.cat||p.category||'food',price,qty:q,subtotal:price*q};
    // ===== 依頼(クエスト)拡張メタデータ（既存の注文/会計フローには影響しない付加情報） =====
    if(p.questName||p.questRank||p.questExp||p.questGold||p.targetMonster){
      item.questId=p.id;
      item.questRank=p.questRank||'';
      item.orderedAt=new Date().toISOString();
      item.completedAt=item.orderedAt; // このテンプレートの注文は即時反映のため、受注と同時に達成扱い
      item.completionStatus='completed';
      item.gainedExp=(Number(p.questExp)||0)*q;
      item.gainedGold=(Number(p.questGold)||0)*q;
      item.killedMonster=p.targetMonster||'';
      item.killedCount=(Number(p.targetCount)||0)*q;
    }
    return item;
  }
  function isCartMode(){ const data=GuildStorage.getData(); return !!(data.settings&&data.settings.cartMode); }
  function isGameModeOn(){ const data=GuildStorage.getData(); return !!(data.settings && data.settings.gameMode!==false); }
  function askOrder(product, qty=1){ const data=GuildStorage.getData(); if(!(data.settings.business && data.settings.business.open)){ GuildUI.toast('只今準備中のため、新規のご注文はできません'); return; } const fresh=(data.menu||[]).find(x=>x.id===product.id)||product; if(!isEventActiveNow(fresh)){ GuildUI.toast('この依頼は現在受付期間外です'); return; } const stock=fresh.stock===''||typeof fresh.stock==='undefined'?null:Number(fresh.stock); if(fresh.soldOut || (stock!==null && stock<=0)){GuildUI.toast('売切れです');return;} if(stock!==null && qty>stock){GuildUI.toast('在庫は残り'+stock+'です'); qty=stock;} pending=itemFromProduct(fresh, qty); GuildAudio.playSe('add'); const questStyle=!!fresh.isQuest; $('orderConfirmBody').textContent=`この${questStyle?'依頼':'クエスト'}を受注しますか？\n\n・${pending.name} ×${pending.qty} = ${yen(pending.subtotal,data.settings.currency)}\n\n注文確定で敵にダメージが入ります。`; GuildUI.openModal('modalOrderConfirm'); }
  // ===== カートモード =====
  function cartCount(){ return cart.reduce((s,i)=>s+i.qty,0); }
  function cartTotal(){ return cart.reduce((s,i)=>s+i.subtotal,0); }
  function updateCartBadge(){ const b=$('cartBadge'); const btn=$('btnCartOpen'); if(!btn) return; const n=cartCount(); if(b) b.textContent=n; btn.style.display=n>0?'':'none'; }
  function addToCart(product, qty=1){
    const data=GuildStorage.getData(); const fresh=(data.menu||[]).find(x=>x.id===product.id)||product;
    if(!isEventActiveNow(fresh)){ GuildUI.toast('この依頼は現在受付期間外です'); return; }
    const stock=fresh.stock===''||typeof fresh.stock==='undefined'?null:Number(fresh.stock);
    if(fresh.soldOut || (stock!==null && stock<=0)){GuildUI.toast('売切れです');return;}
    const alreadyInCart=(cart.find(i=>i.id===fresh.id)||{qty:0}).qty;
    if(stock!==null && (alreadyInCart+qty)>stock){ GuildUI.toast('在庫は残り'+stock+'です'); qty=Math.max(0,stock-alreadyInCart); if(qty<=0)return; }
    const existing=cart.find(i=>i.id===fresh.id);
    if(existing){ existing.qty+=Number(qty)||1; existing.subtotal=existing.qty*existing.price; }
    else cart.push(itemFromProduct(fresh, qty));
    GuildAudio.playSe('add');
    updateCartBadge();
    GuildUI.toast((fresh.name)+' をカートに追加');
  }
  function removeFromCart(id){ cart=cart.filter(i=>i.id!==id); updateCartBadge(); if(cart.length===0) GuildUI.closeModals(); else renderCartReview(); }
  function renderCartReview(){
    const data=GuildStorage.getData();
    const body=$('cartReviewBody');
    if(!body) return;
    if(!cart.length){ body.innerHTML='<p class="tiny">カートは空です</p>'; return; }
    body.innerHTML = cart.map(it=>
      `<div class="row" style="align-items:center;gap:6px;margin:4px 0">
        <span style="flex:2">${GuildUtils.esc(it.name)} ×${it.qty} = ${yen(it.subtotal,data.settings.currency)}</span>
        <button class="btn small red" data-cart-remove="${it.id}">×</button>
      </div>`
    ).join('') + `<div class="toolbar"><b>合計 ${yen(cartTotal(),data.settings.currency)}</b></div>`;
    body.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>removeFromCart(b.dataset.cartRemove));
  }
  function openCartReview(){
    if(!cart.length){ GuildUI.toast('カートは空です'); return; }
    renderCartReview();
    GuildUI.openModal('modalCartReview');
  }
  async function confirmCart(){
    if($('screenMain').classList.contains('combat-lock'))return;
    if(!cart.length){ GuildUI.toast('カートは空です'); return; }
    const items=cart.map(i=>Object.assign({},i));
    const total=items.reduce((s,i)=>s+i.subtotal,0);
    cart=[]; updateCartBadge();
    $('btnCartConfirm').disabled=true;
    items.forEach(decrementStock);
    const sale=record('order',items,total);
    items.forEach(addToBill);
    GuildNotify.send(payload('order',sale,items,total,{orderDamage:total,directOrder:true,cartOrder:true}));
    if(GuildStorage.pushCloud)GuildStorage.pushCloud();
    GuildUI.closeModals();
    if(!isGameModeOn()){
      // ゲームモードOFF：討伐演出を出さず、そのままメニューに戻って完了だけ知らせる
      GuildUI.show('screenMain');
      $('btnCartConfirm').disabled=false;
      GuildUI.toast('ご注文を承りました');
      if(window.GuildApp&&GuildApp.offerMinigame) GuildApp.offerMinigame();
      return;
    }
    GuildUI.show('screenMain');
    await GuildBattle.applyDamage(total,(defeated,finalDefeated)=>{
      GuildStorage.save();GuildBattle.render();
      $('screenMain').classList.remove('combat-lock');$('damagePop').classList.remove('on');
      $('btnCartConfirm').disabled=false;
      GuildUI.toast(finalDefeated?(window.GuildTheme?GuildTheme.w('bossDefeatText'):'魔王を討伐した！'):(defeated?((window.GuildTheme?GuildTheme.w('defeat'):'撃破')+'！ 注文完了'):((window.GuildTheme?GuildTheme.w('questClear'):'クエスト達成')+'！')));
      if(window.GuildApp&&GuildApp.offerMinigame) GuildApp.offerMinigame();
    });
  }
  function cancelCartReview(){ GuildUI.closeModals(); }
  function decrementStock(item){ const data=GuildStorage.getData(); const p=(data.menu||[]).find(x=>x.id===item.id); if(!p || p.stock==='' || typeof p.stock==='undefined') return; p.stock=Math.max(0, Number(p.stock||0)-Number(item.qty||1)); if(p.stock<=0)p.soldOut=true; }
  function addToBill(item){ const data=GuildStorage.getData(); data.activeBill=data.activeBill||[]; const old=data.activeBill.find(x=>x.id===item.id && !x.isCharge); if(old){old.qty+=item.qty;old.subtotal+=item.subtotal;}else data.activeBill.push(Object.assign({},item)); GuildStorage.save(); }
  function currentSalesMonth(){ const data=GuildStorage.getData(); data.salesSettings=data.salesSettings||{}; if(!data.salesSettings.currentMonth)data.salesSettings.currentMonth=new Date().toISOString().slice(0,7); return data.salesSettings.currentMonth; }
  function withCoverCharge(items){ const data=GuildStorage.getData(); const list=(items||[]).slice(); if(list.some(i=>i.isCharge)) return list; const cover=Number(data.settings&&data.settings.coverCharge)||0; const party=Math.max(1,Number(data.partyCount||1)||1); if(cover>0){ const label=(window.GuildTheme?GuildTheme.w('customerRegister'):'席料'); list.unshift({id:'cover-charge',name:label,cat:'charge',price:cover,qty:party,subtotal:cover*party,isCharge:true}); } return list; }
  // ===== 会計ガチャ（Phase8）：重み付き抽選で1つレアリティを選ぶ =====
  function pickGachaRarity(){
    const data=GuildStorage.getData();
    const cfg=(data.settings&&data.settings.gachaEffect)||{enabled:false,rarities:[]};
    const list=(Array.isArray(cfg.rarities)?cfg.rarities:[]).filter(r=>Number(r.weight)>0);
    if(!list.length) return null;
    const total=list.reduce((s,r)=>s+Number(r.weight||0),0);
    let roll=Math.random()*total;
    for(const r of list){ roll-=Number(r.weight||0); if(roll<=0) return r; }
    return list[list.length-1];
  }
  function record(type, items, total, reason=''){ const data=GuildStorage.getData(); const c=GuildCustomer.current()||{name:'未登録',level:1,title:'',id:''}; const rec={id:GuildUtils.uid(type==='checkout'?'sale':'order'),type,customer:c.name,customerId:c.id||'',items,total,partyCount:data.partyCount||1,time:new Date().toISOString(),timeText:todayText(),reason}; if(type==='checkout'){ rec.accountingMonth=currentSalesMonth(); data.sales.push(rec); c.total=(Number(c.total)||0)+Number(total||0); c.lastVisit=rec.timeText; GuildStorage.save(); } return rec; }
  function payload(type,sale,items,total,extra={}){
    const data=GuildStorage.getData(); const c=GuildCustomer.current(); const e=(isGameModeOn()&&GuildBattle.enemy)?GuildBattle.enemy():null;
    const gt=window.GuildTheme;
    return Object.assign({
      action:type,type,orderId:sale.id,sale,
      adventurerId:c&&c.id||'',adventurer:c&&c.name||sale.customer||'未登録',name:c&&c.name||sale.customer||'未登録',
      title:c&&c.title||'',level:c&&c.level||1,visits:c&&c.visits||0,partyCount:data.partyCount||1,
      items,total,enemy:e?{name:e.name,hp:e.hp,maxHp:e.maxHp,defeated:false}:null,
      source:'index',appVersion:GuildApp.VERSION,time:todayText(),
      // Discord通知の文言をテーマに合わせるためのラベル（GAS側はこれがあれば優先的に使う）
      orderLabel:gt?gt.w('quest'):'注文',
      checkoutLabel:gt?gt.w('checkoutButton'):'会計',
      enemyLabel:gt?gt.w('enemy'):'敵',
      customerLabel:gt?gt.w('customer'):'冒険者'
    },extra);
  }
  async function confirmOrder(){
    if($('screenMain').classList.contains('combat-lock'))return;
    if(!pending){GuildUI.toast('注文がありません');return;}
    const item=Object.assign({},pending); pending=null;
    $('btnDoOrder').disabled=true;
    decrementStock(item);
    const sale=record('order',[item],item.subtotal);
    addToBill(item);
    GuildNotify.send(payload('order',sale,[item],item.subtotal,{orderDamage:item.subtotal,directOrder:true}));
    if(GuildStorage.pushCloud)GuildStorage.pushCloud();
    GuildUI.closeModals();
    if(!isGameModeOn()){
      // ゲームモードOFF：討伐演出を出さず、そのままメニューに戻って完了だけ知らせる
      GuildUI.show('screenMain');
      $('btnDoOrder').disabled=false;
      GuildUI.toast('ご注文を承りました');
      if(window.GuildApp&&GuildApp.offerMinigame) GuildApp.offerMinigame();
      return;
    }
    GuildUI.show('screenMain');
    await GuildBattle.applyDamage(item.subtotal,(defeated,finalDefeated)=>{GuildStorage.save();GuildBattle.render();$('screenMain').classList.remove('combat-lock');$('damagePop').classList.remove('on');$('btnDoOrder').disabled=false;GuildUI.toast(finalDefeated?(window.GuildTheme?GuildTheme.w('bossDefeatText'):'魔王を討伐した！'):(defeated?((window.GuildTheme?GuildTheme.w('defeat'):'撃破')+'！ 注文完了'):((window.GuildTheme?GuildTheme.w('questClear'):'クエスト達成')+'！')));if(window.GuildApp&&GuildApp.offerMinigame) GuildApp.offerMinigame();});
  }
  function checkoutAsk(){ const data=GuildStorage.getData(); const base=(data.activeBill||[]).slice(); const all=withCoverCharge(base); const total=all.reduce((s,i)=>s+Number(i.subtotal||0),0); $('checkoutConfirmBody').textContent=all.length?`帰還しますか？\n\n${all.map(i=>`・${i.name} ×${Number(i.qty||1)} = ${yen(i.subtotal,data.settings.currency)}`).join('\n')}\n\n会計合計 ${yen(total,data.settings.currency)}\n売上月 ${currentSalesMonth()} 月分\n\n会計のみ行います。ダメージは注文確定時に入ります。`:'未会計の注文はありません。帰還しますか？'; GuildUI.openModal('modalCheckoutConfirm'); }
  function checkoutDo(){
    const data=GuildStorage.getData();
    // 席料だけでなく、実際に何か注文していたかどうか（ガチャの発生条件に使う）
    const hadRealOrder = Array.isArray(data.activeBill) && data.activeBill.some(i=>i && !i.isCharge);
    const all=withCoverCharge((data.activeBill||[]).slice());
    const total=all.reduce((s,i)=>s+Number(i.subtotal||0),0);
    const c=GuildCustomer.current();
    const custName=(c&&c.name)||data.currentCustomer||'';
    const sale=record('checkout',all,total);
    GuildNotify.send(payload('checkout',sale,all,total,{checkoutOnly:true}));
    if(GuildStorage.pushCloud)GuildStorage.pushCloud();
    if(c){
      const cust=(data.customers||[]).find(x=>x.id===c.id||x.name===c.name);
      if(cust){
        cust.checkedOut=true; cust.total=(Number(cust.total)||0)+total;
        if(GuildCustomer.recheckLevelAfterCheckout){
          const lu=GuildCustomer.recheckLevelAfterCheckout(cust);
          if(lu.leveled){ GuildAudio.playSe('levelup'); if(window.GuildApp&&GuildApp.showLevelUp) GuildApp.showLevelUp(lu.oldLevel,lu.newLevel); }
        }
      }
    }
    data.activeBill=[];
    GuildStorage.save(); if(isGameModeOn()) GuildBattle.render();
    $('screenMain').classList.remove('combat-lock');
    const gcfg=(data.settings&&data.settings.gachaEffect)||{enabled:false};
    if(gcfg.enabled && hadRealOrder && window.GuildApp && GuildApp.showGacha){
      const rarity=pickGachaRarity();
      if(rarity){ GuildApp.showGacha(rarity, ()=>showReceipt(all,total,custName)); return; }
    }
    showReceipt(all,total,custName);
  }
  function showReceipt(items,total,custName){
    const data=GuildStorage.getData();
    const body=$('receiptBody');
    if(body){
      const rows=(items||[]).map(i=>`・${GuildUtils.esc(i.name)} ×${Number(i.qty||1)} = ${yen(i.subtotal,data.settings.currency)}`).join('<br>');
      body.innerHTML = (custName?`<div>${GuildUtils.esc(custName)} 様</div>`:'') +
        `<div class="mt">${rows||'（明細なし）'}</div>` +
        `<div class="mt" style="font-size:1.2em;font-weight:900">合計　${yen(total,data.settings.currency)}</div>`;
    }
    GuildUI.openModal('modalReceipt');
  }
  function cancelPending(){ pending=null; GuildAudio.playSe('cancel'); GuildUI.closeModals(); }
  return {askOrder, confirmOrder, checkoutAsk, checkoutDo, cancelPending, record, isCartMode, addToCart, removeFromCart, openCartReview, confirmCart, cancelCartReview, cartCount, updateCartBadge};
})();
