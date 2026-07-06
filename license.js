// 中央ライセンスサーバーとやり取りするクライアント側ロジック。
// license-config.js の serverUrl が空の場合は何もせず、常に「利用可能」として扱う
// （＝販売前の開発・検証中はこのファイルがあっても一切影響しない）。
window.GuildLicense = window.GuildLicense || {};
(function(){
  const state = window.GuildLicense;
  state.status = 'active';       // 'active' | 'grace' | 'suspended'
  state.graceDaysLeft = null;
  state.offline = false;

  function ensureStoreId(data){
    data.settings = data.settings || {};
    if(!data.settings.licenseStoreId){
      data.settings.licenseStoreId = 'lic_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    }
    return data.settings.licenseStoreId;
  }

  async function registerStore(data){
    if(!state.serverUrl) return;
    try{
      const id = ensureStoreId(data);
      await fetch(state.serverUrl, {
        method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({
          action:'registerStore',
          storeId:id,
          storeName:(data.settings.storeInfo&&data.settings.storeInfo.name)||data.settings.storeName||'',
          contactEmail: data.settings.licenseContactEmail||'',
          siteUrl: location.origin+location.pathname,
          gasUrl: data.settings.gasUrl||''
        })
      });
      if(window.GuildStorage && GuildStorage.save) GuildStorage.save();
    }catch(e){}
  }

  async function checkLicense(data){
    if(!state.serverUrl){ state.status='active'; return state; } // サーバー未設定＝制限なし（開発中はここで抜ける）
    const id = data.settings && data.settings.licenseStoreId;
    if(!id){ state.status='active'; return state; } // まだ登録前＝通す
    try{
      const url = state.serverUrl+(state.serverUrl.includes('?')?'&':'?')+'action=licenseCheck&storeId='+encodeURIComponent(id)+'&v='+Date.now();
      const res = await fetch(url, {cache:'no-store'});
      const j = await res.json();
      state.status = (j && j.status) || 'active';
      state.graceDaysLeft = (j && j.graceDaysLeft!=null) ? j.graceDaysLeft : null;
      state.offline = false;
    }catch(e){
      // 通信できない時にお客様を締め出すのは危険なので、フェイルオープン（＝通常営業扱い）にする。
      // 管理画面側の「システムチェック」で通信不可であることは分かるようにする。
      state.status = 'active';
      state.offline = true;
    }
    return state;
  }

  state.ensureStoreId = ensureStoreId;
  state.registerStore = registerStore;
  state.checkLicense = checkLicense;
})();
