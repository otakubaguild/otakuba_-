window.GuildNotify = (() => {
  async function send(payload){
    const data=GuildStorage.getData(); const url=(data.settings.gasUrl || data.settings.discordWebhookUrl || '').trim();
    if(!url || data.settings.notifyOn===false) return {ok:false, skipped:true};
    try{ await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)}); return {ok:true}; }
    catch(e){ return {ok:false,error:String(e)}; }
  }
  async function sync(){
    const data=GuildStorage.getData(); const url=(data.settings.gasUrl || '').trim(); if(!url) return null;
    try{ const res=await fetch(url + (url.includes('?')?'&':'?') + 'action=sync&v=' + Date.now(), {cache:'no-store'}); return await res.json(); }
    catch(e){ return null; }
  }
  return {send, sync};
})();
