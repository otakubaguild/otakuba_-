// 改ざん検知（あくまで「気づけるようにする」ための軽い仕組みで、本格的なコピー対策ではありません）。
// integrity-config.js の expectedHashes が空の場合は何もしません（開発中は無効）。
window.GuildIntegrity = window.GuildIntegrity || {};
(function(){
  const cfg = window.GuildIntegrity;

  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function approvedKey(file){ return 'guild_integrity_approved_'+file; }

  async function checkFile(file, expected){
    try{
      const res = await fetch(file+'?_ic='+Date.now(), {cache:'no-store'});
      const text = await res.text();
      const actual = await sha256(text);
      if(actual === expected) return {ok:true};
      // すでにこの内容で「解除コード」による承認済みなら、再度は警告しない
      const approved = localStorage.getItem(approvedKey(file));
      if(approved === actual) return {ok:true, approved:true};
      return {ok:false, file, actual};
    }catch(e){
      return {ok:true, error:String(e)}; // 通信できない時は締め出さない（フェイルオープン）
    }
  }

  async function runCheck(){
    const expected = cfg.expectedHashes||{};
    const files = Object.keys(expected);
    if(!files.length) return {tampered:false};
    for(const file of files){
      const r = await checkFile(file, expected[file]);
      if(!r.ok) return {tampered:true, file:r.file, actual:r.actual};
    }
    return {tampered:false};
  }

  async function verifyUnlockCode(code, mismatch){
    if(!window.GuildLicense || !GuildLicense.serverUrl) return false;
    try{
      const res = await fetch(GuildLicense.serverUrl, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({action:'verifyUnlockCode', code})
      });
      const j = await res.json();
      if(j && j.ok){
        localStorage.setItem(approvedKey(mismatch.file), mismatch.actual);
        return true;
      }
      return false;
    }catch(e){ return false; }
  }

  cfg.runCheck = runCheck;
  cfg.verifyUnlockCode = verifyUnlockCode;
})();
