window.GuildStorage = (() => {
  const keys = {
    state:'otakuba.v3.final.state',
    old:'otakuba.v3.full.state',
    legacy:'otakubaGuildApp.v1.complete'
  };
  const files = {settings:'settings.json', menu:'menu.json', monsters:'monsters.json', customers:'customers.json', sales:'sales.json'};
  let data = {settings:{}, menu:[], monsters:[], customers:[], sales:[], deletedSaleIds:[], salesSettings:{currentMonth:'', closedMonths:[], monthlyArchives:{}}, currentCustomer:'', activeBill:[], currentEnemyIndex:0, partyCount:1};

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
      image:m.image || 'slime.png', bgm:m.bgm || 'slime', sort:Number(m.sort || i),
      scale:Number.isFinite(Number(m.scale))?Number(m.scale):100, offsetX:Number.isFinite(Number(m.offsetX))?Number(m.offsetX):0, offsetY:Number.isFinite(Number(m.offsetY))?Number(m.offsetY):0};
  }

  function normalizeMenu(p,i){
    p=p||{};
    const stockRaw = p.stock === '' || p.stock === null || typeof p.stock === 'undefined' ? '' : Number(p.stock);
    const stock = stockRaw === '' || !Number.isFinite(stockRaw) ? '' : Math.max(0, stockRaw);
    return {id:p.id||GuildUtils.uid('menu'), cat:p.cat||p.category||'food', category:p.cat||p.category||'food',
      name:p.name||'商品', price:Number(p.price)||0, emoji:p.emoji||p.icon||'🍽️', icon:p.emoji||p.icon||'🍽️',
      image:p.image||'', desc:p.desc||'', hidden:!!p.hidden, sort:Number(p.sort||i),
      soldOut:!!p.soldOut, recommended:!!p.recommended, limited:!!p.limited, stock:stock};
  }

  function migrateLegacy(legacy){
    if(!legacy || typeof legacy !== 'object') return null;
    return {
      settings:Object.assign({}, data.settings, legacy.settings || {}),
      menu:Array.isArray(legacy.products)?legacy.products.map(normalizeMenu):data.menu,
      monsters:legacy.settings && Array.isArray(legacy.settings.enemies)?legacy.settings.enemies.map(normalizeMonster):data.monsters,
      customers:Array.isArray(legacy.customers)?legacy.customers:data.customers,
      sales:Array.isArray(legacy.sales)?legacy.sales:data.sales,
      deletedSaleIds:Array.isArray(legacy.deletedSaleIds)?legacy.deletedSaleIds:[],
      salesSettings:legacy.salesSettings||data.salesSettings||{currentMonth:'',closedMonths:[],monthlyArchives:{}},
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
      deletedSaleIds:[],
      salesSettings:{currentMonth:'', closedMonths:[], monthlyArchives:{}},
      currentCustomer:'', activeBill:[], currentEnemyIndex:0, partyCount:1
    };
    defaults.settings = Object.assign({
      currency:'G', coverCharge:500, levelStep:3000, adminPassword:'OTAKU', notifyOn:true, gasUrl:'', discordWebhookUrl:'',
      categories:[
        {id:'beer_sour', name:'ビール・サワー', icon:'🍺'}, {id:'shochu_cocktail', name:'焼酎・カクテル', icon:'🍸'},
        {id:'shot_bottle', name:'ショット・ボトル', icon:'🥂'}, {id:'soft', name:'ソフトドリンク', icon:'🥤'},
        {id:'food', name:'フード', icon:'🍟'}
      ],
      audioFiles:{
        bgm:{title:'冒険への誘い.mp3',slime:'maou_bgm_fantasy15.mp3',goblin:'Baring_Their_Fangs.mp3',orc:'反撃の一矢.mp3',cave:'Rumbling.mp3',ruins:'龍太鼓.mp3',maou:'Extinguish.mp3',ending:'March_for__delightful_future.mp3'},
        se:{ok:'maou_se_system37.mp3',cancel:'maou_se_system49.mp3',bad:'maou_se_system49.mp3',add:'maou_se_onepoint16.mp3',confirm:'maou_se_system37.mp3',damage:'maou_se_onepoint20.mp3',defeat:'maou_se_system49.mp3',victory:'RPG風ファンファーレ.mp3',levelup:'レベルアップ.mp3'}
      },
      bgmVolume:0.45,seVolume:0.9,
      notice:{enabled:true,title:'本日のお知らせ',body:'',position:'top'},
      business:{open:false,openedAt:'',closedAt:'',dailyReports:[]}
    }, defaults.settings || {});
    data.settings.notice = Object.assign({enabled:true,title:'本日のお知らせ',body:'',position:'top'}, data.settings.notice || {});
    data.settings.business = Object.assign({open:false,openedAt:'',closedAt:'',dailyReports:[]}, data.settings.business || {});
    if(!Array.isArray(data.settings.business.dailyReports)) data.settings.business.dailyReports=[];

    const existing = get(keys.state, null);
    const old = !existing ? get(keys.old, null) : null;
    const legacy = !existing && !old ? migrateLegacy(get(keys.legacy, null)) : null;
    data = Object.assign({}, defaults, existing || old || legacy || {});
    data.settings = Object.assign({}, defaults.settings, data.settings || {});
    const hasFullMenu = Array.isArray(data.menu) && data.menu.length >= 20;
    data.menu = (hasFullMenu ? data.menu : defaults.menu).map(normalizeMenu);
    data.monsters = (Array.isArray(data.monsters)&&data.monsters.length?data.monsters:defaults.monsters).map(normalizeMonster);
    data.customers = Array.isArray(data.customers)?data.customers:[];
    data.sales = Array.isArray(data.sales)?data.sales:[];
    data.deletedSaleIds = Array.isArray(data.deletedSaleIds)?data.deletedSaleIds:[];
    data.sales = data.sales.filter(s=>!data.deletedSaleIds.includes(saleKey(s)));
    data.salesSettings = data.salesSettings && typeof data.salesSettings==='object' ? data.salesSettings : {currentMonth:'', closedMonths:[], monthlyArchives:{}};
    if(!Array.isArray(data.salesSettings.closedMonths)) data.salesSettings.closedMonths=[];
    if(!data.salesSettings.monthlyArchives || typeof data.salesSettings.monthlyArchives!=='object') data.salesSettings.monthlyArchives={};
    if(!data.salesSettings.currentMonth) data.salesSettings.currentMonth = new Date().toISOString().slice(0,7);
    data.sales.forEach(s=>{ if(s && s.type==='checkout' && !s.accountingMonth) s.accountingMonth = String(s.time||new Date().toISOString()).slice(0,7); });
    data.activeBill = Array.isArray(data.activeBill)?data.activeBill:[];
    data.settings.business = Object.assign({open:false,openedAt:'',closedAt:'',dailyReports:[]}, data.settings.business || {});
    if(!Array.isArray(data.settings.business.dailyReports)) data.settings.business.dailyReports=[];
    data.currentEnemyIndex = GuildUtils.clamp(data.currentEnemyIndex,0,Math.max(0,data.monsters.length-1));
    data.partyCount = Math.max(1, Math.min(20, Number(data.partyCount || 1) || 1));
    set(keys.state,data);
    // 画面を待たせない：GAS同期はバックグラウンドで実行し、終わったらUIを更新
    setTimeout(()=>{ pullCloud().then(ok=>{ if(ok && window.GuildApp && GuildApp.onSynced) GuildApp.onSynced(); }); }, 50);
    return data;
  }
  // --- クラウド同期（GAS）---
  let pushTimer=null;
  function gasUrl(){ return (data.settings && (data.settings.gasUrl||'').trim()) || ''; }
  // 共有すべき管理データだけを送る（戦闘の一時状態は端末ローカルのまま）
  function saleKey(s){ return s && (s.id || s.saleId || (String(s.time||'')+'|'+String(s.customer||'')+'|'+String(s.total||'')+'|'+JSON.stringify(s.items||[]))); }
  function sharedPayload(){
    return {action:'saveAll', settings:data.settings, menu:data.menu, monsters:data.monsters, customers:data.customers, sales:data.sales, deletedSaleIds:data.deletedSaleIds||[], salesSettings:data.salesSettings};
  }
  function pushCloud(){
    const url=gasUrl(); if(!url) return;
    try{ fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(sharedPayload())}); }catch(e){}
  }
  // 保存が連続しても1.2秒に1回だけ送る（GASの負荷・遅延対策）
  function schedulePush(){ if(!gasUrl())return; clearTimeout(pushTimer); pushTimer=setTimeout(pushCloud,1200); }
  // 起動時：クラウドの管理データで上書き（端末固有の進行状態は維持）
  async function pullCloud(){
    const url=gasUrl(); if(!url) return false;
    try{
      const res=await fetch(url+(url.includes('?')?'&':'?')+'action=sync&v='+Date.now(),{cache:'no-store'});
      const remote=await res.json(); if(!remote||typeof remote!=='object') return false;
      if(remote.settings && Object.keys(remote.settings).length){ data.settings=Object.assign({},data.settings,remote.settings); }
      // メニューは「管理画面で保存した正データ」がGASにある時だけ採用。
      // remote.settings.menuPushedAt が無い＝昔の残骸とみなし、ローカルのmenu.jsonを優先（本番を壊さない）
      if(Array.isArray(remote.menu)&&remote.menu.length && remote.settings && remote.settings.menuPushedAt){
        data.menu=remote.menu.map(normalizeMenu);
      }
      if(Array.isArray(remote.monsters)&&remote.monsters.length){
        const idx=data.currentEnemyIndex, curHp=(data.monsters[idx]||{}).hp;
        data.monsters=remote.monsters.map(normalizeMonster);
        // 戦闘中の現在HPは端末側を尊重（メニュー定義だけ同期したい場合の保険）
        if(typeof curHp==='number' && data.monsters[idx]) data.monsters[idx].hp=curHp;
      }
      if(Array.isArray(remote.customers)){
        // IDで突合してマージ。両方にあれば来店回数が多い方（=新しい記録）を残す
        const byId={}; (data.customers||[]).forEach(c=>{ if(c&&c.id) byId[c.id]=c; });
        remote.customers.forEach(rc=>{ if(!rc||!rc.id){ return; } const local=byId[rc.id]; if(!local){ byId[rc.id]=rc; } else { const lv=(Number(local.visits)||0), rv=(Number(rc.visits)||0); byId[rc.id]=(rv>=lv)?rc:local; } });
        data.customers=Object.keys(byId).map(k=>byId[k]);
      }
      if(remote.salesSettings && typeof remote.salesSettings==='object'){ data.salesSettings=Object.assign({},data.salesSettings||{},remote.salesSettings); if(!Array.isArray(data.salesSettings.closedMonths))data.salesSettings.closedMonths=[]; if(!data.salesSettings.monthlyArchives||typeof data.salesSettings.monthlyArchives!=='object')data.salesSettings.monthlyArchives={}; if(!data.salesSettings.currentMonth)data.salesSettings.currentMonth=new Date().toISOString().slice(0,7); }
      if(Array.isArray(remote.deletedSaleIds)){
        const delSet=new Set([...(data.deletedSaleIds||[]), ...remote.deletedSaleIds]);
        data.deletedSaleIds=Array.from(delSet);
      }
      if(Array.isArray(remote.sales)){
        // 売上IDで重複を除いて統合。ただし削除済みIDはGASから戻ってきても復活させない
        const deleted=new Set(data.deletedSaleIds||[]);
        const seen={}; const merged=[];
        (data.sales||[]).concat(remote.sales).forEach(s=>{ if(!s) return; const id=saleKey(s); if(deleted.has(id)) return; if(!seen[id]){ seen[id]=1; merged.push(s); } });
        data.sales=merged;
      }
      data.currentEnemyIndex=GuildUtils.clamp(data.currentEnemyIndex,0,Math.max(0,data.monsters.length-1));
      set(keys.state,data);
      return true;
    }catch(e){ return false; }
  }

  function save(){ set(keys.state,data); schedulePush(); }
  function resetProgress(){ data.currentEnemyIndex=0; data.monsters.forEach(m=>m.hp=m.maxHp); data.activeBill=[]; save(); }
  function getData(){ return data; }
  function replace(part, value){ data[part]=value; save(); }
  function markSaleDeleted(s){ const id=saleKey(s); if(!id)return; data.deletedSaleIds=data.deletedSaleIds||[]; if(!data.deletedSaleIds.includes(id)) data.deletedSaleIds.push(id); }
  return {keys, init, save, getData, replace, resetProgress, pullCloud, pushCloud, markSaleDeleted};
})();
