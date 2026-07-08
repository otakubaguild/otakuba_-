window.GuildMenu = (() => {
  const {$, esc, yen} = GuildUtils;
  let data;
  const qtyMap = {};
  function init(d){ data=d; renderCategoryButtons(); const lb=$('imageLightbox'); if(lb && !lb.dataset.bound){ lb.dataset.bound='1'; lb.onclick=()=>lb.classList.remove('show'); } }
  function categoryInfo(cat){ return (data.settings.categories||[]).find(c=>c.id===cat) || {id:cat,name:cat,icon:'🍽️'}; }
  function renderCategoryButtons(){
    const box=$('categoryButtons'); box.innerHTML='';
    (data.settings.categories||[]).forEach(c=>{
      const b=document.createElement('button'); b.className='btn'; b.textContent=`${c.icon||''} ${c.name}`;
      b.onclick=()=>openCategory(c.id); box.appendChild(b);
    });
    if(isQuestMode()){
      const qb=document.createElement('button'); qb.className='btn gold'; qb.textContent='📜 依頼';
      qb.onclick=()=>openQuestBoard(); box.appendChild(qb);
    }
  }
  function isQuestMode(){ return !!(data.settings && data.settings.questMode); }
  function isQuestActiveNow(p){
    if(!p.eventOnly) return true;
    const now=Date.now();
    if(p.startAt){ const s=new Date(p.startAt).getTime(); if(Number.isFinite(s) && now<s) return false; }
    if(p.endAt){ const e=new Date(p.endAt).getTime(); if(Number.isFinite(e) && now>e) return false; }
    return true;
  }
  function renderProductCards(items, questStyle){
    const list=$('productList');
    list.innerHTML=items.length?'':'<div class="empty">'+(questStyle?'現在、依頼はありません':'このカテゴリの商品はありません')+'</div>';
    items.forEach(p=>{
      const id=p.id; qtyMap[id]=qtyMap[id]||1;
      const el=document.createElement('div'); el.className='panel product';
      const stockNum = p.stock === '' || typeof p.stock === 'undefined' ? null : Number(p.stock);
      const isSoldOut = p.soldOut || (stockNum !== null && stockNum <= 0);
      const questInactive = questStyle && p.eventOnly && !isQuestActiveNow(p);
      const badges = `${p.recommended?'<span class="menu-badge">⭐おすすめ</span>':''}${p.limited?'<span class="menu-badge">👑限定</span>':''}${isSoldOut?'<span class="menu-badge sold">❌売切れ</span>':''}${stockNum!==null && !isSoldOut?`<span class="menu-badge">残${stockNum}</span>`:''}`+
        (questStyle?`${p.questRank?`<span class="menu-badge quest-rank">ランク${esc(p.questRank)}</span>`:''}${p.eventOnly?`<span class="menu-badge">🎪イベント限定</span>`:''}${questInactive?`<span class="menu-badge sold">受付期間外</span>`:''}`:'');
      el.className = 'panel product' + (isSoldOut ? ' sold-out' : '') + (questInactive ? ' sold-out' : '');
      const cartMode=(window.GuildOrder&&GuildOrder.isCartMode&&GuildOrder.isCartMode());
      const disabled = isSoldOut||questInactive;
      const displayName = questStyle ? (p.questName||p.name) : p.name;
      const displayDesc = questStyle ? (p.questDesc||p.desc||'') : (p.desc||'');
      const questMeta = questStyle ? `<div class="product-desc quest-meta">${p.questClient?`依頼主：${esc(p.questClient)} `:''}${p.recommendedLevel?`／推奨Lv${esc(String(p.recommendedLevel))}`:''}${p.targetMonster?`／討伐対象：${esc(p.targetMonster)}${p.targetCount?'×'+esc(String(p.targetCount)):''}`:''}</div>`:'';
      el.innerHTML=`<div class="product-info"><div class="product-name">${p.image?`<img src="${esc(GuildUtils.driveImg(p.image))}" alt="" class="menu-thumb" data-lightbox-img="${esc(GuildUtils.driveImg(p.image))}">`:esc(p.emoji||p.icon||'🍽️')} ${esc(displayName)}</div><div class="menu-badges">${badges}</div><div class="product-desc">${esc(displayDesc)}</div>${questMeta}<div class="product-price">${yen(p.price,data.settings.currency)}</div></div>
      <div class="product-controls"><div class="qty-row"><button class="btn small" type="button" data-minus ${disabled?'disabled':''}>−</button><span class="qty-num">${qtyMap[id]}</span><button class="btn small" type="button" data-plus ${disabled?'disabled':''}>＋</button></div><button type="button" class="btn gold small" data-order ${disabled?'disabled':''}>${isSoldOut?'売切れ':questInactive?'受付期間外':(cartMode?'🛒 追加':(questStyle?'📜 依頼受注':'注文'))}</button></div>`;
      const thumb=el.querySelector('[data-lightbox-img]');
      if(thumb) thumb.onclick=(e)=>{ e.stopPropagation(); const box=$('imageLightbox'); const img=$('imageLightboxImg'); if(box&&img){ img.src=thumb.getAttribute('data-lightbox-img'); box.classList.add('show'); } };
      const num=el.querySelector('.qty-num');
      el.querySelector('[data-minus]').onclick=()=>{ qtyMap[id]=Math.max(1,(qtyMap[id]||1)-1); num.textContent=qtyMap[id]; };
      el.querySelector('[data-plus]').onclick=()=>{ const max=p.stock===''||typeof p.stock==='undefined'?99:Math.max(1,Number(p.stock)||1); qtyMap[id]=Math.min(max,(qtyMap[id]||1)+1); num.textContent=qtyMap[id]; };
      el.querySelector('[data-order]').onclick=()=>{ if(cartMode){ GuildOrder.addToCart(p, qtyMap[id]||1); } else { GuildOrder.askOrder(p, qtyMap[id]||1); } };
      list.appendChild(el);
    });
    GuildUI.openModal('modalMenu');
    if(window.GuildOrder&&GuildOrder.updateCartBadge) GuildOrder.updateCartBadge();
  }
  function openCategory(cat){
    const info=categoryInfo(cat); $('menuTitle').textContent=`${info.icon||''} ${info.name}`;
    // 依頼として別枠に設定した商品(isQuest)は、通常カテゴリからは表示しない（📜依頼タブ専用）
    const items=(data.menu||[]).filter(p=>(p.cat||p.category)===cat && p.hidden!==true && !p.isQuest).sort((a,b)=>(a.sort||0)-(b.sort||0));
    renderProductCards(items, false);
  }
  function openQuestBoard(){
    $('menuTitle').textContent='📜 依頼';
    const items=(data.menu||[]).filter(p=>p.isQuest && p.hidden!==true).sort((a,b)=>(a.sort||0)-(b.sort||0));
    renderProductCards(items, true);
  }
  return {init, openCategory, openQuestBoard, renderCategoryButtons, isQuestMode};
})();
