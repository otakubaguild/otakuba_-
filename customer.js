window.GuildCustomer = (() => {
  function current(){ const data=GuildStorage.getData(); const id=String(data.currentCustomerId||'').trim(); if(id){ const byId=data.customers.find(x=>x.id===id); if(byId) return byId; } return null; }
  function setName(name){ const data=GuildStorage.getData(); const nm=String(name||'').trim(); data.currentCustomer=nm; if(!nm){ data.currentCustomerId=''; GuildStorage.save(); return null; } const c={id:GuildUtils.uid('cust'), name:nm, level:1, title:'新米冒険者', visits:0, total:0, lastVisit:'', memo:''}; data.customers.push(c); data.currentCustomerId=c.id; GuildStorage.save(); return c; }
  function selectExisting(id){ const data=GuildStorage.getData(); const c=data.customers.find(x=>x.id===id); if(!c) return null; data.currentCustomer=c.name; data.currentCustomerId=c.id; GuildStorage.save(); return c; }
  function list(){ const data=GuildStorage.getData(); return (data.customers||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja')); }
  function levelUpByTotal(){ const data=GuildStorage.getData(); const c=current(); if(!c) return {customer:null, oldLevel:1, newLevel:1, leveled:false}; const old=Number(c.level||1); c.visits=(Number(c.visits)||0)+1; c.total=(Number(c.total)||0); c.level=Math.max(1, Number(c.visits)||1); c.lastVisit=GuildUtils.todayText(); GuildStorage.save(); return {customer:c, oldLevel:old, newLevel:c.level, leveled:c.level>old}; }
  return {current, setName, selectExisting, list, levelUpByTotal};
})();
