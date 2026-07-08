// テーマ辞書を読み込み、CSS変数に色を適用し、文言を引けるようにする。
// 辞書に無い項目はフォールバック(既定の言葉)を返すので、壊れない。
window.GuildTheme = (() => {
  const FALLBACK = {
    brand:{ appName:'冒険者ギルド', shopName:'冒険者ギルド', masterName:'ギルドマスター', masterImage:'master.png', masterFallbackEmoji:'🧙' },
    color:{ gold:'#f6c84f', green:'#7bd88f', white:'#fff6df', red:'#e26d6d', bgDark:'#0d0b1a' },
    words:{ customer:'冒険者', customerRegister:'ギルド登録料（チャージ）', guild:'ギルド', quest:'クエスト', questClear:'クエスト達成', subjugation:'討伐', boss:'魔王', enemy:'敵', battle:'戦闘', defeat:'撃破', party:'パーティ', adventurerInfo:'冒険者情報', stage:'ステージ', hpLabel:'HP', checkoutButton:'クエスト達成（会計）', bossDefeatText:'魔王討伐！', menuTitleDefault:'メニュー', awakenText:'魔王が覚醒する——！' },
    messages:{ titleWelcome:'ギルドへ<br>ようこそ', registerTitle:'冒険者登録', selectTitle:'冒険者を選択', partyTitle:'パーティ人数', welcome:'ようこそ、いらっしゃいませ。', welcomeBack:'おかえりなさい、冒険者。次のクエストを受けますか？', openMenu:'メニューを開きますか？', masterDefault:'冷やかしか？さっさとメニューを開け', checkoutDone:'おかえりなさい。クエスト達成（会計）を送信しました', peace:'魔王を倒し、平和が訪れた。' },
    // フォント（Phase4-4追記）：空なら既定のフォントのまま。mode は管理画面が「一括/詳細」どちらの入力欄を出すかの表示用メモ
    fonts:{ mode:'bulk', base:'', brand:'', battle:'', button:'' }
  };
  let theme = JSON.parse(JSON.stringify(FALLBACK));
  // 「土台」の記録：既定(theme.json)の値と、直近に適用したプリセット「そのまま」の値を separately 保持しておく。
  // これが無いと、プリセット切替後に個別カラー等をカスタムした状態から「元に戻す」を押した時、
  // 何を基準に戻せばいいか分からず、古いカスタム値が残り続けてしまう（＝コンセプトを切り替えても反映されない不具合の原因）。
  let baseTheme = JSON.parse(JSON.stringify(FALLBACK));
  let presetBaseTheme = null;

  // ===== UIテーマ（Phase5：枠・パネル背景・ボタンスタイル・角丸・影・ぼかし）=====
  const UI_FALLBACK = {
    borderColor:'gold', borderColorCustom:'',
    panelBg:'black', panelBgCustom:'',
    btnStyle:'rpg',
    btnRadius:9, borderWidth:3, borderRadius:12,
    btnShadow:true, blur:true
  };
  let uiTheme = Object.assign({}, UI_FALLBACK);
  const BORDER_COLORS = { gold:'#f6c84f', silver:'#c9d3dc', blue:'#6cc7ff', red:'#ff6767', green:'#7bd88f' };
  const PANEL_BGS = {
    black:'linear-gradient(180deg,rgba(7,12,20,.66),rgba(0,3,8,.78))',
    blackTrans:'linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,.55))',
    blueTrans:'linear-gradient(180deg,rgba(4,16,32,.52),rgba(0,8,20,.62))',
    parchment:'linear-gradient(180deg,rgba(70,52,28,.55),rgba(40,28,14,.68))',
    wood:'linear-gradient(180deg,rgba(46,30,16,.6),rgba(24,14,6,.72))',
    glass:'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03))'
  };

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
          messages: Object.assign({}, FALLBACK.messages, j.messages||{}),
          fonts: Object.assign({}, FALLBACK.fonts, j.fonts||{})
        };
      }
    }catch(e){ /* 失敗してもフォールバックで動く */ }
    // ここまでで確定した「既定(theme.json)」の値を土台として記録しておく（後で「元に戻す」時の基準になる）
    baseTheme = JSON.parse(JSON.stringify(theme));
    // プリセットで選んで保存したテーマがあれば、それを最優先で使う
    loadOverride();
    loadUiOverride();
    applyColors();
    applyFonts();
    applyDomText();
    applyUiTheme(uiTheme);
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

  // ===== UIテーマの適用 =====
  function applyUiTheme(partial){
    uiTheme = Object.assign({}, UI_FALLBACK, uiTheme, partial||{});
    try{
      const r = document.documentElement.style;
      const bc = uiTheme.borderColor==='custom' ? (uiTheme.borderColorCustom||BORDER_COLORS.gold) : (BORDER_COLORS[uiTheme.borderColor]||BORDER_COLORS.gold);
      r.setProperty('--panel-border-color', bc);
      const bg = (uiTheme.panelBg==='custom' && uiTheme.panelBgCustom)
        ? `linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55)), url("${uiTheme.panelBgCustom}") center/cover`
        : (PANEL_BGS[uiTheme.panelBg]||PANEL_BGS.black);
      r.setProperty('--panel-bg', bg);
      r.setProperty('--panel-blur', uiTheme.blur ? '8px' : '0px');
      r.setProperty('--btn-radius', (Number(uiTheme.btnRadius)||0)+'px');
      r.setProperty('--panel-radius', (Number(uiTheme.borderRadius)||0)+'px');
      r.setProperty('--panel-border-width', (Number(uiTheme.borderWidth)||0)+'px');
      r.setProperty('--btn-border-width', Math.max(2,Math.min(4,Number(uiTheme.borderWidth)||3))+'px');
      r.setProperty('--btn-shadow', uiTheme.btnShadow ? 'inset 0 -4px 0 rgba(255,255,255,.08), 0 4px 0 rgba(0,0,0,.45)' : 'none');
      document.body.dataset.btnStyle = uiTheme.btnStyle || 'rpg';
    }catch(e){}
  }
  function saveUiThemeOverride(partial){
    uiTheme = Object.assign({}, UI_FALLBACK, uiTheme, partial||{});
    applyUiTheme(uiTheme);
    try{ localStorage.setItem('otakuba.uitheme.override', JSON.stringify(uiTheme)); }catch(e){}
  }
  function loadUiOverride(){
    try{ const s=localStorage.getItem('otakuba.uitheme.override'); if(s){ const o=JSON.parse(s); if(o&&typeof o==='object'){ uiTheme=Object.assign({},UI_FALLBACK,o); return true; } } }catch(e){}
    return false;
  }
  function clearUiOverride(){ try{ localStorage.removeItem('otakuba.uitheme.override'); }catch(e){} uiTheme=Object.assign({},UI_FALLBACK); applyUiTheme(uiTheme); }
  function getUiTheme(){ return Object.assign({}, uiTheme); }

  // フォントをCSS変数に反映。空欄の項目は var() のフォールバック連鎖でbase→既定フォントに自動で落ちる
  const loadedFonts={};
  function loadGoogleFont(name){
    const n=String(name||'').trim();
    if(!n || loadedFonts[n]) return;
    loadedFonts[n]=true;
    try{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(n).replace(/%20/g,'+')+'&display=swap';
      link.onerror=function(){}; // Googleフォントに無い名前（システムフォント名等）でも静かに無視される
      document.head.appendChild(link);
    }catch(e){}
  }
  function applyFonts(){
    try{
      const r=document.documentElement.style;
      const f=theme.fonts||{};
      ['base','brand','battle','button'].forEach(function(key){
        const v=(f[key]||'').trim();
        if(v){ r.setProperty('--font-'+key, '"'+v+'"'); loadGoogleFont(v); }
        else r.removeProperty('--font-'+key);
      });
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
      messages: Object.assign({}, FALLBACK.messages, preset.theme.messages||{}),
      fonts: Object.assign({}, FALLBACK.fonts, preset.theme.fonts||{})
    };
    // このプリセット「そのまま」の値を土台として記録（後で個別カラー等をカスタムしても、ここへ戻せるように）
    presetBaseTheme = JSON.parse(JSON.stringify(theme));
    applyColors();
    applyFonts();
    applyDomText();
    // 選んだテーマを端末に保存し、次回起動時も維持
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
    // プリセットがUIテーマも指定していれば、それも一緒に切り替える
    if(preset.uiTheme) saveUiThemeOverride(preset.uiTheme);
  }
  // 管理画面から「呼称・固定文字」だけを部分保存する（Phase4-4）。他の項目(色/画像等)は保持したまま words だけ上書き。
  function saveWordsOverride(partialWords){
    theme = { brand:Object.assign({},theme.brand), color:Object.assign({},theme.color), words:Object.assign({},theme.words,partialWords||{}), messages:Object.assign({},theme.messages), fonts:Object.assign({},theme.fonts) };
    applyColors(); applyDomText();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // 管理画面から「フォント」だけを部分保存する。他の項目は保持したまま fonts だけ上書き
  function saveFontsOverride(partialFonts){
    theme = { brand:Object.assign({},theme.brand), color:Object.assign({},theme.color), words:Object.assign({},theme.words), messages:Object.assign({},theme.messages), fonts:Object.assign({},theme.fonts,partialFonts||{}) };
    applyFonts();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // 管理画面から「テーマカラー」だけを部分保存する。他の項目は保持したまま color だけ上書き
  function saveColorsOverride(partialColors){
    theme = { brand:Object.assign({},theme.brand), color:Object.assign({},theme.color,partialColors||{}), words:Object.assign({},theme.words), messages:Object.assign({},theme.messages), fonts:Object.assign({},theme.fonts) };
    applyColors();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // 起動時、保存済みテーマがあればそれを優先
  function loadOverride(){
    try{ const s=localStorage.getItem('otakuba.theme.override'); if(s){ const o=JSON.parse(s); if(o&&o.words){ theme=o; return true; } } }catch(e){}
    return false;
  }
  // 「元に戻す」の実体：直近のプリセットが分かればその素の値へ、無ければ既定(theme.json)へ、その場で（リロード不要で）戻す
  function resetToBase(){
    theme = JSON.parse(JSON.stringify(baseTheme));
    presetBaseTheme = null;
    applyColors();
    applyFonts();
    applyDomText();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  // カラーだけを「今のプリセット本来の色（プリセット未使用なら既定色）」に戻す。brand/words/fontsは変更しない
  function resetColorsOnly(){
    const src = presetBaseTheme || baseTheme;
    theme = Object.assign({}, theme, { color: Object.assign({}, src.color) });
    applyColors();
    try{ localStorage.setItem('otakuba.theme.override', JSON.stringify(theme)); }catch(e){}
  }
  function clearOverride(){ try{ localStorage.removeItem('otakuba.theme.override'); }catch(e){} resetToBase(); }

  return { init, w, m, b, all, applyColors, applyFonts, applyDomText, lookup, loadPresets, applyPresetTheme, saveWordsOverride, saveFontsOverride, saveColorsOverride, loadOverride, clearOverride, resetToBase, resetColorsOnly, applyUiTheme, saveUiThemeOverride, loadUiOverride, clearUiOverride, getUiTheme };
})();
