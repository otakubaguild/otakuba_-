window.GuildMenu = (() => {
  const {$, esc, yen} = GuildUtils;
  let data;
  const qtyMap = {};
  function init(d){ data=d; renderCategoryButtons(); }
  function categoryInfo(cat){ return (data.settings.categories||[]).find(c=>c.id===cat) || {id:cat,name:cat,icon:'🍽️'}; }
  function renderCategoryButtons(){
    const box=$('categoryButtons'); box.innerHTML='';
    (data.settings.categories||[]).forEach(c=>{
      const b=document.createElement('button'); b.className='btn'; b.textContent=`${c.icon||''} ${c.name}`;
      b.onclick=()=>openCategory(c.id); box.appendChild(b);
    });
  }
  function openCategory(cat){
    const info=categoryInfo(cat); $('menuTitle').textContent=`${info.icon||''} ${info.name}`;
    const list=$('productList'); const items=(data.menu||[]).filter(p=>(p.cat||p.category)===cat && p.hidden!==true).sort((a,b)=>(a.sort||0)-(b.sort||0));
    list.innerHTML=items.length?'':'<div class="empty">このカテゴリの商品はありません</div>';
    items.forEach(p=>{
      const id=p.id; qtyMap[id]=qtyMap[id]||1;
      const el=document.createElement('div'); el.className='panel product';
      const stockNum = p.stock === '' || typeof p.stock === 'undefined' ? null : Number(p.stock);
      const isSoldOut = p.soldOut || (stockNum !== null && stockNum <= 0);
      const badges = `${p.recommended?'<span class="menu-badge">⭐おすすめ</span>':''}${p.limited?'<span class="menu-badge">👑限定</span>':''}${isSoldOut?'<span class="menu-badge sold">❌売切れ</span>':''}${stockNum!==null && !isSoldOut?`<span class="menu-badge">残${stockNum}</span>`:''}`;
      el.className = 'panel product' + (isSoldOut ? ' sold-out' : '');
      const cartMode=(window.GuildOrder&&GuildOrder.isCartMode&&GuildOrder.isCartMode());
      el.innerHTML=`<div class="product-info"><div class="product-name">${p.image?`<img src="${esc(GuildUtils.driveImg(p.image))}" alt="" class="menu-thumb">`:esc(p.emoji||p.icon||'🍽️')} ${esc(p.name)}</div><div class="menu-badges">${badges}</div><div class="product-desc">${esc(p.desc||'')}</div><div class="product-price">${yen(p.price,data.settings.currency)}</div></div>
      <div class="product-controls"><div class="qty-row"><button class="btn small" type="button" data-minus ${isSoldOut?'disabled':''}>−</button><span class="qty-num">${qtyMap[id]}</span><button class="btn small" type="button" data-plus ${isSoldOut?'disabled':''}>＋</button></div><button type="button" class="btn gold small" data-order ${isSoldOut?'disabled':''}>${isSoldOut?'売切れ':(cartMode?'🛒 追加':'注文')}</button></div>`;
      const num=el.querySelector('.qty-num');
      el.querySelector('[data-minus]').onclick=()=>{ qtyMap[id]=Math.max(1,(qtyMap[id]||1)-1); num.textContent=qtyMap[id]; };
      el.querySelector('[data-plus]').onclick=()=>{ const max=p.stock===''||typeof p.stock==='undefined'?99:Math.max(1,Number(p.stock)||1); qtyMap[id]=Math.min(max,(qtyMap[id]||1)+1); num.textContent=qtyMap[id]; };
      el.querySelector('[data-order]').onclick=()=>{ if(cartMode){ GuildOrder.addToCart(p, qtyMap[id]||1); } else { GuildOrder.askOrder(p, qtyMap[id]||1); } };
      list.appendChild(el);
    });
    GuildUI.openModal('modalMenu');
    if(window.GuildOrder&&GuildOrder.updateCartBadge) GuildOrder.updateCartBadge();
  }
  return {init, openCategory, renderCategoryButtons};
})();
