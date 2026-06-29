window.GuildNotify = (() => {
  async function send(payload){ const data=GuildStorage.getData(); const url=(data.settings.gasUrl || data.settings.discordWebhookUrl || '').trim(); if(!url || data.settings.notifyOn===false) return {ok:false, skipped:true}; try{ await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)}); return {ok:true}; }catch(e){ return {ok:false,error:String(e)}; } }
  return {send};
})();
