window.GuildStorage = (() => {
  const keys = {
    state:'otakuba.v3.final.state',
    old:'otakuba.v3.full.state',
    legacy:'otakubaGuildApp.v1.complete'
  };
  const files = {settings:'settings.json', menu:'menu.json', monsters:'monsters.json', customers:'customers.json', sales:'sales.json'};
  let data = {settings:{}, menu:[], monsters:[], customers:[], sales:[], currentCustomer:'', activeBill:[], currentEnemyIndex:0, partyCount:1};

  async function fetchJson(path, fallback){
    try{ const res = await fetch(`${path}?v=${Date.now()}`, {cache:'no-store'}); if(!res.ok) throw new Error(path); return await res.json(); }
    catch(e){ return fallback; }
  }
  function get(key, fallback){ try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; } }
  function set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

  function normalizeMonster(m, i){
    m = m || {}; const hpMax = Number(m.maxHp || m.hp || 500) || 500;
    return {id:m.id || GuildUtils.uid('enemy'), name:m.name || `敵${i+1}`, stage:m.stage || '草原',
      hp:Number.isFinite(Number(m.hp)) ? Math.max(0,Number(m.hp)) : hpMax, maxHp:hpMax,
      bg:m.bg || m.background || 'grass.png', background:m.bg || m.background || 'grass.png',
      image:m.image || 'slime.png', bgm:m.bgm || 'slime', sort:Number(m.sort || i)};
  }

  function normalizeMenu(p,i){
    p=p||{};
    return {id:p.id||GuildUtils.uid('menu'), cat:p.cat||p.category||'food', category:p.cat||p.category||'food',
      name:p.name||'商品', price:Number(p.price)||0, emoji:p.emoji||p.icon||'🍽️', icon:p.emoji||p.icon||'🍽️',
      image:p.image||'', desc:p.desc||'', hidden:!!p.hidden, sort:Number(p.sort||i)};
  }

  function migrateLegacy(legacy){
    if(!legacy || typeof legacy !== 'object') return null;
    return {
      settings:Object.assign({}, data.settings, legacy.settings || {}),
      menu:Array.isArray(legacy.products)?legacy.products.map(normalizeMenu):data.menu,
      monsters:legacy.settings && Array.isArray(legacy.settings.enemies)?legacy.settings.enemies.map(normalizeMonster):data.monsters,
      customers:Array.isArray(legacy.customers)?legacy.customers:data.customers,
      sales:Array.isArray(legacy.sales)?legacy.sales:data.sales,
      currentCustomer:legacy.currentCustomer || legacy.name || '',
      activeBill:Array.isArray(legacy.activeBill)?legacy.activeBill:[],
      currentEnemyIndex:Number(legacy.settings && legacy.settings.currentEnemyIndex)||0,
      partyCount:Number(legacy.partyCount || (legacy.settings && legacy.settings.partyCount) || 1)||1
    };
  }

  async function init(){
    const defaults = {
      settings: await fetchJson(files.settings, {}),
      menu: await fetchJson(files.menu, []),
      monsters: await fetchJson(files.monsters, []),
      customers: await fetchJson(files.customers, []),
      sales: await fetchJson(files.sales, []),
      currentCustomer:'', activeBill:[], currentEnemyIndex:0, partyCount:1
    };
    defaults.settings = Object.assign({
      currency:'G', coverCharge:500, levelStep:3000, adminPassword:'OTAKU', notifyOn:true, gasUrl:'', discordWebhookUrl:'',
      categories:[
        {id:'alcohol', name:'酒', icon:'🍺'}, {id:'drink', name:'ドリンク', icon:'🥤'},
        {id:'food', name:'フード', icon:'🍖'}, {id:'dessert', name:'デザート', icon:'🍰'}, {id:'event', name:'イベント', icon:'🎉'}
      ],
      audioFiles:{
        bgm:{title:'冒険への誘い.mp3',slime:'maou_bgm_fantasy15.mp3',goblin:'Baring_Their_Fangs.mp3',orc:'反撃の一矢.mp3',cave:'Rumbling.mp3',ruins:'龍太鼓.mp3',maou:'Extinguish.mp3',ending:'March_for__delightful_future.mp3'},
        se:{ok:'maou_se_system37.mp3',cancel:'maou_se_system49.mp3',bad:'maou_se_system49.mp3',add:'maou_se_onepoint16.mp3',confirm:'maou_se_system37.mp3',damage:'maou_se_onepoint20.mp3',defeat:'maou_se_system49.mp3',victory:'RPG風ファンファーレ.mp3',levelup:'レベルアップ.mp3'}
      },
      bgmVolume:0.45,seVolume:0.9
    }, defaults.settings || {});

    const existing = get(keys.state, null);
    const old = !existing ? get(keys.old, null) : null;
    const legacy = !existing && !old ? migrateLegacy(get(keys.legacy, null)) : null;
    data = Object.assign({}, defaults, existing || old || legacy || {});
    data.settings = Object.assign({}, defaults.settings, data.settings || {});
    data.menu = (Array.isArray(data.menu)&&data.menu.length?data.menu:defaults.menu).map(normalizeMenu);
    data.monsters = (Array.isArray(data.monsters)&&data.monsters.length?data.monsters:defaults.monsters).map(normalizeMonster);
    data.customers = Array.isArray(data.customers)?data.customers:[];
    data.sales = Array.isArray(data.sales)?data.sales:[];
    data.activeBill = Array.isArray(data.activeBill)?data.activeBill:[];
    data.currentEnemyIndex = GuildUtils.clamp(data.currentEnemyIndex,0,Math.max(0,data.monsters.length-1));
    data.partyCount = Math.max(1, Math.min(20, Number(data.partyCount || 1) || 1));
    save();
    return data;
  }
  function save(){ set(keys.state,data); }
  function resetProgress(){ data.currentEnemyIndex=0; data.monsters.forEach(m=>m.hp=m.maxHp); data.activeBill=[]; save(); }
  function getData(){ return data; }
  function replace(part, value){ data[part]=value; save(); }
  return {keys, init, save, getData, replace, resetProgress};
})();
