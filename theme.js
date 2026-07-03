// テーマ辞書を読み込み、CSS変数に色を適用し、文言を引けるようにする。
// 辞書に無い項目はフォールバック(既定の言葉)を返すので、壊れない。
window.GuildTheme = (() => {
  const FALLBACK = {
    brand:{ appName:'おたく場ギルド', shopName:'おたく場ギルド', masterName:'ギルドマスター', masterImage:'master.png', masterFallbackEmoji:'🧙' },
    color:{ gold:'#f6c84f', green:'#7bd88f', white:'#fff6df', red:'#e26d6d', bgDark:'#0d0b1a' },
    words:{ customer:'冒険者', customerRegister:'ギルド登録料（チャージ）', guild:'ギルド', quest:'クエスト', questClear:'クエスト達成', subjugation:'討伐', boss:'魔王', enemy:'敵', battle:'戦闘', defeat:'撃破', party:'パーティ', adventurerInfo:'冒険者情報', stage:'ステージ', hpLabel:'HP', checkoutButton:'クエスト達成（会計）', bossDefeatText:'魔王討伐！', menuTitleDefault:'メニュー' },
    messages:{ welcome:'ようこそ、いらっしゃいませ。', welcomeBack:'おかえりなさい、冒険者。次のクエストを受けますか？', openMenu:'メニューを開きますか？', masterDefault:'冷やかしか？さっさとメニューを開け', checkoutDone:'おかえりなさい。クエスト達成（会計）を送信しました', peace:'魔王を倒し、平和が訪れた。' }
  };
  let theme = JSON.parse(JSON.stringify(FALLBACK));

  async function init(){
    try{
      const res = await fetch('theme.json?v=' + Date.now(), {cache:'no-store'});
      if(res.ok){
        const j = await res.json();
        // 深いマージ（辞書に無い項目はフォールバックのまま）
        theme = {
          brand: Object.assign({}, FALLBACK.brand, j.brand||{}),
          color: Object.assign({}, FALLBACK.color, j.color||{}),
          words: Object.assign({}, FALLBACK.words, j.words||{}),
          messages: Object.assign({}, FALLBACK.messages, j.messages||{})
        };
      }
    }catch(e){ /* 失敗してもフォールバックで動く */ }
    // プリセットで選んで保存したテーマがあれば、それを最優先で使う
    loadOverride();
    applyColors();
    applyDomText();
    return theme;
  }

  function applyColors(){
    try{
      const r = document.documentElement.style;
      const c = theme.color||{};
      if(c.gold) r.setProperty('--gold', c.gold);
      if(c.green) r.setProperty('--green', c.green);
      if(c.white) r.setProperty('--white', c.white);
      if(c.red) r.setProperty('--red', c.red);
      if(c.bgDark) r.setProperty('--bg-dark', c.bgDark);
    }catch(e){}
  }

  // 文言を引く：w('customer') → '冒険者'
  function w(key){ return (theme.words && theme.words[key]) || FALLBACK.words[key] || key; }
  // メッセージを引く
  function m(key){ return (theme.messages && theme.messages[key]) || FALLBACK.messages[key] || ''; }
  // ブランド情報
  function b(key){ return (theme.brand && theme.brand[key]) || FALLBACK.brand[key] || ''; }
  function all(){ return theme; }

  // HTML内の [data-theme-text="words.customer"] などを一括で置換
  function applyDomText(){
    try{
      document.querySelectorAll('[data-theme-text]').forEach(el=>{
        const path=el.getAttribute('data-theme-text');
        const val=lookup(path);
        if(val) el.textContent=val;
      });
      // HTMLタグを含む文言（<br>など）はinnerHTMLで
      document.querySelectorAll('[data-theme-html]').forEach(el=>{
        const path=el.getAttribute('data-theme-html');
        const val=lookup(path);
        if(val) el.innerHTML=val;
      });
      // タイトルタグ
      const t=document.querySelector('title[data-theme-title]');
      if(t){ document.title=b('appName'); }
    }catch(e){}
  }
  function lookup(path){
    if(!path) return '';
    const parts=path.split('.');
    let cur=theme;
    for(const p of parts){ if(cur&&typeof cur==='object'&&p in cur) cur=cur[p]; else return ''; }
    return typeof cur==='string'?cur:'';
  }

  // ===== プリセット（コンセプト一括切替）=====
  async function loadPresets(){
    try{ const res=await fetch('presets.json?v='+Date.now(),{cache:'no-store'}); if(res.ok){ const j=await res.json(); return (j&&j.presets)||[]; } }catch(e){}
    return [];
  }
  // プリセットのthemeをtheme.jsonに書き出す代わりに、実行中のthemeへ反映＋保存
  function applyPresetTheme(preset){
    if(!preset||!preset.theme) return;
    theme = {
      brand: Object.assign({}, FALLBACK.brand, preset.theme.brand||{}),
      color: Object.assign({}, FALLBACK.color, preset.theme.color||{}),
      words: Object.assign({}, FALLBACK.words, preset.theme.words||{}),
      messages: Object.assign({}, FALLBACK.messages, preset.theme.messages||{})
    };
    applyColors();
    applyDomText();
    // 選んだテーマを端末に保存し、次回起動時も維持
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // 管理画面から「呼称・固定文字」だけを部分保存する（Phase4-4）。他の項目(色/画像等)は保持したまま words だけ上書き。
  function saveWordsOverride(partialWords){
    theme = { brand:Object.assign({},theme.brand), color:Object.assign({},theme.color), words:Object.assign({},theme.words,partialWords||{}), messages:Object.assign({},theme.messages) };
    applyColors(); applyDomText();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // 起動時、保存済みテーマがあればそれを優先
  function loadOverride(){
    try{ const s=localStorage.getItem('otakuba.theme.override'); if(s){ const o=JSON.parse(s); if(o&&o.words){ theme=o; return true; } } }catch(e){}
    return false;
  }
  function clearOverride(){ try{ localStorage.removeItem('otakuba.theme.override'); }catch(e){} }

  return { init, w, m, b, all, applyColors, applyDomText, lookup, loadPresets, applyPresetTheme, saveWordsOverride, loadOverride, clearOverride };
})();
