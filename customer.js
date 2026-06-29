window.GuildCustomer = (() => {
  function current(){ const data=GuildStorage.getData(); const name=String(data.currentCustomer||'').trim(); if(!name) return null; let c=data.customers.find(x=>x.name===name); if(!c){ c={id:GuildUtils.uid('cust'), name, level:1, title:'新米冒険者', visits:0, total:0, lastVisit:'', memo:''}; data.customers.push(c); GuildStorage.save(); } return c; }
  function setName(name){ const data=GuildStorage.getData(); data.currentCustomer=String(name||'').trim(); current(); GuildStorage.save(); }
  function levelUpByTotal(){ const data=GuildStorage.getData(); const c=current(); if(!c) return {customer:null, oldLevel:1, newLevel:1, leveled:false}; const old=Number(c.level||1); const step=Number(data.settings.levelStep||3000); c.level=Math.max(1, Math.floor((Number(c.total)||0)/step)+1); c.visits=(Number(c.visits)||0)+1; c.lastVisit=GuildUtils.todayText(); GuildStorage.save(); return {customer:c, oldLevel:old, newLevel:c.level, leveled:c.level>old}; }
  return {current, setName, levelUpByTotal};
})();
