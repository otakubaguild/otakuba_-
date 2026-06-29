window.GuildMenu = (() => {
  const {$, esc, yen} = GuildUtils;
  let data;
  function init(d){ data=d; renderCategoryButtons(); }
  function categoryInfo(cat){ return (data.settings.categories||[]).find(c=>c.id===cat) || {id:cat,name:cat,icon:'🍽️'}; }
  function renderCategoryButtons(){ const box=$('categoryButtons'); box.innerHTML=''; (data.settings.categories||[]).forEach(c=>{ const b=document.createElement('button'); b.className='btn'; b.textContent=`${c.icon||''} ${c.name}`; b.onclick=()=>openCategory(c.id); box.appendChild(b); }); }
  function openCategory(cat){ const info=categoryInfo(cat); $('menuTitle').textContent=`${info.icon||''} ${info.name}`; const list=$('productList'); const items=(data.menu||[]).filter(p=>(p.cat||p.category)===cat && p.hidden!==true); list.innerHTML=items.length?'':'<div class="empty">このカテゴリの商品はありません</div>'; items.forEach(p=>{ const el=document.createElement('div'); el.className='panel product'; el.innerHTML=`<div class="product-info"><div class="product-name">${p.image?`<img src="${esc(p.image)}" alt="" class="menu-thumb">`:esc(p.emoji||p.icon||'🍽️')} ${esc(p.name)}</div><div class="product-desc">${esc(p.desc||'')}</div><div class="product-price">${yen(p.price,data.settings.currency)}</div></div><button type="button" class="btn gold small">注文</button>`; el.querySelector('button').onclick=()=>GuildOrder.askOrder(p); list.appendChild(el); }); GuildUI.openModal('modalMenu'); }
  return {init, openCategory, renderCategoryButtons};
})();
