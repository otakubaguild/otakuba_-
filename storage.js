window.GuildStorage = (() => {
  const keys = {
    state:'otakuba.v3.full.state',
    settings:'otakuba.v3.full.settings',
    menu:'otakuba.v3.full.menu',
    monsters:'otakuba.v3.full.monsters',
    customers:'otakuba.v3.full.customers',
    sales:'otakuba.v3.full.sales',
    old:'otakubaGuildApp.v1.complete'
  };
  const files = {
    settings:'data/settings.json', menu:'data/menu.json', monsters:'data/monsters.json', customers:'data/customers.json', sales:'data/sales.json'
  };
  let data = {settings:{}, menu:[], monsters:[], customers:[], sales:[], currentCustomer:'', activeBill:[], currentEnemyIndex:0};
  async function fetchJson(path, fallback){
    try{ const res = await fetch(`${path}?v=${Date.now()}`, {cache:'no-store'}); if(!res.ok) throw new Error(path); return await res.json(); }
    catch(e){ return fallback; }
  }
  function get(key, fallback){ try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; } }
  function set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function normalizeMonster(m, i){
    m = m || {}; const hpMax = Number(m.maxHp || m.hp || 500) || 500;
    return {id:m.id || GuildUtils.uid('enemy'), name:m.name || `敵${i+1}`, stage:m.stage || '草原', hp:Number.isFinite(Number(m.hp))?Math.max(0,Number(m.hp)):hpMax, maxHp:hpMax, bg:m.bg || m.background || 'assets/bg/grass.png', image:m.image || 'assets/monsters/slime.png', bgm:m.bgm || 'slime'};
  }
  function migrateLegacy(legacy){
    if(!legacy || typeof legacy !== 'object') return null;
    return {
      settings: Object.assign({}, data.settings, legacy.settings || {}),
      menu: Array.isArray(legacy.products) ? legacy.products.map(p => ({id:p.id||GuildUtils.uid('menu'), cat:p.cat||p.category||'food', name:p.name||'商品', price:Number(p.price)||0, emoji:p.emoji||p.icon||'🍽️', desc:p.desc||'', image:p.image||'', hidden:!!p.hidden})) : data.menu,
      monsters: legacy.settings && Array.isArray(legacy.settings.enemies) ? legacy.settings.enemies.map(normalizeMonster) : data.monsters,
      customers: Array.isArray(legacy.customers) ? legacy.customers : data.customers,
      sales: Array.isArray(legacy.sales) ? legacy.sales : data.sales,
      currentCustomer: legacy.currentCustomer || legacy.name || '',
      activeBill: Array.isArray(legacy.activeBill) ? legacy.activeBill : [],
      currentEnemyIndex: Number(legacy.settings && legacy.settings.currentEnemyIndex) || 0
    };
  }
  async function init(){
    const defaults = {
      settings: await fetchJson(files.settings, {}),
      menu: await fetchJson(files.menu, []),
      monsters: await fetchJson(files.monsters, []),
      customers: await fetchJson(files.customers, []),
      sales: await fetchJson(files.sales, []),
      currentCustomer:'', activeBill:[], currentEnemyIndex:0
    };
    data = defaults;
    const existing = get(keys.state, null);
    const legacy = !existing ? migrateLegacy(get(keys.old, null)) : null;
    data = Object.assign({}, defaults, existing || legacy || {});
    data.settings = Object.assign({}, defaults.settings, data.settings || {});
    data.menu = Array.isArray(data.menu) && data.menu.length ? data.menu : defaults.menu;
    data.monsters = (Array.isArray(data.monsters) && data.monsters.length ? data.monsters : defaults.monsters).map(normalizeMonster);
    data.customers = Array.isArray(data.customers) ? data.customers : [];
    data.sales = Array.isArray(data.sales) ? data.sales : [];
    data.activeBill = Array.isArray(data.activeBill) ? data.activeBill : [];
    data.currentEnemyIndex = GuildUtils.clamp(data.currentEnemyIndex,0,Math.max(0,data.monsters.length-1));
    save();
    return data;
  }
  function save(){ set(keys.state, data); set(keys.settings, data.settings); set(keys.menu, data.menu); set(keys.monsters, data.monsters); set(keys.customers, data.customers); set(keys.sales, data.sales); }
  function resetProgress(){ data.currentEnemyIndex=0; data.monsters.forEach(m=>m.hp=m.maxHp); data.activeBill=[]; save(); }
  function getData(){ return data; }
  function replace(part, value){ data[part] = value; save(); }
  return {keys, init, save, getData, replace, resetProgress};
})();
