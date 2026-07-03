window.GuildCustomer = (() => {
  function current(){ const data=GuildStorage.getData(); const id=String(data.currentCustomerId||'').trim(); if(id){ const byId=data.customers.find(x=>x.id===id); if(byId) return byId; } return null; }
  // レベル計算方式：来店回数（既定）／合計金額。店舗が管理画面から選べる
  // 合計金額モードは levelThresholds（レベルごとの必要累計金額、昇順の配列）があればそれを優先。
  // 無ければ levelStep（一律いくらごと）にフォールバックする
  function computeLevel(c, settings){
    settings = settings || (GuildStorage.getData().settings)||{};
    if((settings.levelMode||'visits')==='total'){
      const total = Number(c&&c.total)||0;
      const th = Array.isArray(settings.levelThresholds) ? settings.levelThresholds.map(Number).filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b) : [];
      if(th.length){ let lv=1; for(let i=0;i<th.length;i++){ if(total>=th[i]) lv=i+2; else break; } return lv; }
      const step = Number(settings.levelStep)||3000;
      return Math.max(1, Math.floor(total/step)+1);
    }
    return Math.max(1, Number(c&&c.visits)||1);
  }
  function setName(name){ const data=GuildStorage.getData(); const nm=String(name||'').trim(); data.currentCustomer=nm; if(!nm){ data.currentCustomerId=''; GuildStorage.save(); return null; } const c={id:GuildUtils.uid('cust'), name:nm, level:1, title:'新米冒険者', visits:1, total:0, lastVisit:GuildUtils.todayText(), memo:'', checkedOut:false}; data.customers.push(c); data.currentCustomerId=c.id; GuildStorage.save(); return c; }
  function selectExisting(id){ const data=GuildStorage.getData(); const c=data.customers.find(x=>x.id===id); if(!c) return null; const old=Number(c.level||1);
    // 前回会計(退店)済みなら新しい来店としてカウント。会計せず入り直しただけなら据え置き
    const isNewVisit = (c.checkedOut !== false); // 未定義(初期)や true は新規来店とみなす
    if(isNewVisit){ c.visits=(Number(c.visits)||0)+1; c.lastVisit=GuildUtils.todayText(); c.checkedOut=false; }
    c.level=computeLevel(c, data.settings);
    data.currentCustomer=c.name; data.currentCustomerId=c.id; GuildStorage.save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
    c._levelUp={oldLevel:old, newLevel:c.level, leveled:c.level>old}; return c; }
  // 合計金額モードは会計のたびにtotalが増えるので、会計直後にもレベルアップを判定する
  function recheckLevelAfterCheckout(c){
    if(!c) return {leveled:false};
    const data=GuildStorage.getData(); const old=Number(c.level||1);
    c.level=computeLevel(c, data.settings); GuildStorage.save();
    return {oldLevel:old, newLevel:c.level, leveled:c.level>old};
  }
  function list(){ const data=GuildStorage.getData(); return (data.customers||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja')); }
  return {current, setName, selectExisting, list, computeLevel, recheckLevelAfterCheckout};
})();
