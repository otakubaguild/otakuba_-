(async function(){
  const {$, esc, yen} = GuildUtils;
  if(window.GuildTheme) await GuildTheme.init();
  const data = await GuildStorage.init();
  // 他端末で選ばれたコンセプト（RPG/SF/魔法学校）と、呼び名・フォント・カラーをこの端末にも反映
  if(window.GuildTheme){
    try{
      if(data.settings.currentPresetId && GuildTheme.loadPresets){
        const presets=await GuildTheme.loadPresets();
        const p=(presets||[]).find(x=>x.id===data.settings.currentPresetId);
        if(p) GuildTheme.applyPresetTheme(p);
        else GuildTheme.clearOverride(); // 保存されているプリセットIDが見つからない場合も既定へ
      } else {
        // プリセット未使用（既定/最初のRPGテーマなど）の場合、この端末にだけ古いプリセットの色が
        // 残っていることがあるため、ここで必ず既定にリセットしてから下の個別カスタムを乗せる
        GuildTheme.clearOverride();
      }
    }catch(e){}
    try{ if(data.settings.themeWords) GuildTheme.saveWordsOverride(data.settings.themeWords); }catch(e){}
    try{ if(data.settings.themeFonts) GuildTheme.saveFontsOverride(data.settings.themeFonts); }catch(e){}
    try{ if(data.settings.themeColors) GuildTheme.saveColorsOverride(data.settings.themeColors); }catch(e){}
    try{ if(data.settings.uiTheme) GuildTheme.saveUiThemeOverride(data.settings.uiTheme); }catch(e){}
  }
  const SESSION='otakuba.v3.final.admin.session';
  // モード（Easy/Normal/Hard）: 各タブがどのモード以上で表示されるかを持つ。上位モードは下位モードのタブも全て含む（累積表示）
  const MODE_ORDER=['easy','normal','hard'];
  const MODE_LABEL={easy:'🌱 かんたん',normal:'🛠 ふつう',hard:'⚙️ くわしい'};
  const tabs=[
    ['dash','🏠 ホーム','easy'],
    ['guide','📖 使い方ガイド','easy'],
    ['syscheck','🩺 システムチェック','easy'],
    ['business','🟢 営業','easy'],
    ['themeEditor','🎭 テーマ編集','easy'],
    ['menu','🍴 メニュー','easy'],
    ['sales','💰 会計・売上','easy'],
    ['qr','🔳 QR','normal'],
    ['customers','👤 顧客','normal'],
    ['settings','⚙️ 設定','hard'],
    ['inventory','📦 在庫','hard'],
    ['sync','☁️ 同期','hard'],
    ['reset','🧹 reset','hard'],
  ];
  // テーマ編集タブ内のサブナビ（Phase4-3: 店舗情報/テキスト/画像/BGM/キャラクター/ステージ/プレビューを1画面にまとめる）
  const THEME_SUBTABS=[['store','🏪 店舗情報'],['text','✏️ テキスト'],['color','🎨 カラー'],['ui','🖼️ UIテーマ'],['effect','💥 撃破演出'],['gacha','🎰 会計ガチャ'],['image','🖼️ 画像'],['bgm','🎵 BGM'],['character','⚔️ キャラクター'],['stage','🗺️ ステージ'],['preview','👁️ プレビュー']];
  let themeSubTab='store';
  const MODE_KEY='otakuba.admin.mode';
  // 既存ユーザーの操作感を壊さないよう、初回デフォルトは「くわしい」＝これまで通り全タブ表示。新規は店側の判断でモード変更可能。
  function loadMode(){ try{ const m=localStorage.getItem(MODE_KEY); return MODE_ORDER.includes(m)?m:'hard'; }catch(e){ return 'hard'; } }
  function saveMode(m){ try{ localStorage.setItem(MODE_KEY,m); }catch(e){} }
  let currentMode=loadMode();
  function visibleTabs(){ const maxIdx=MODE_ORDER.indexOf(currentMode); return tabs.filter(t=>MODE_ORDER.indexOf(t[2])<=maxIdx); }
  let current='dash', customerQuery='', salesQuery='';
  function loginOk(){return sessionStorage.getItem(SESSION)==='ok'} function showLogin(){$('adminLogin').classList.remove('hidden');$('adminApp').classList.add('hidden')} function showApp(){$('adminLogin').classList.add('hidden');$('adminApp').classList.remove('hidden');const hn=data.settings.storeInfo&&data.settings.storeInfo.name||data.settings.storeName||data.settings.shopName||(window.GuildTheme?GuildTheme.b('shopName'):'')||'';if($('adminHeadTitle'))$('adminHeadTitle').textContent=(hn?hn+' ':'')+'管理室';renderModeBar();renderStatusBadge();renderTabs();render();startAutoRefresh()}
  let autoTimer=null;
  function startAutoRefresh(){ if(autoTimer)clearInterval(autoTimer); autoTimer=setInterval(async()=>{
    // 概要・顧客・履歴を見ている時だけ自動取得。入力中は邪魔しない
    if(!['dash','customers','sales'].includes(current))return;
    const ae=document.activeElement; if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'))return;
    const ok=await GuildStorage.pullCloud(); if(ok){renderStatusBadge();render();}
  }, 10000); }
  $('adminLoginBtn').onclick=()=>{if($('adminPass').value===(data.settings.adminPassword||'OTAKU')){sessionStorage.setItem(SESSION,'ok');playAdminAuthFx()}else $('loginError').textContent='パスワードが違います'};
  function playAdminAuthFx(){
    const fx=$('adminAuthFx');
    if(!fx){ showApp(); return; }
    fx.classList.add('on');
    setTimeout(()=>{ showApp(); },550); // 画面が暗転したタイミングで裏側を管理画面に切り替える
    setTimeout(()=>{ fx.classList.remove('on'); },1300);
  }
  $('adminBackToIndex').onclick=()=>location.href='index.html';$('adminHeaderToIndex').onclick=()=>location.href='index.html';$('logoutBtn').onclick=()=>{sessionStorage.removeItem(SESSION);showLogin()};
  if($('btnShowTerms')) $('btnShowTerms').onclick=()=>{ const b=$('termsBody'); if(b) b.innerHTML=(window.GuildTerms&&GuildTerms.html)||'利用規約が見つかりません。'; $('modalTerms').classList.add('active'); };
  if($('btnCloseTerms')) $('btnCloseTerms').onclick=()=>{ $('modalTerms').classList.remove('active'); };
  function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1500)}
  function save(){GuildStorage.save()}
  function renderStatusBadge(){
    const el=document.getElementById('bizStatusBadge'); if(!el) return;
    const open=!!(data.settings.business&&data.settings.business.open);
    el.textContent=open?'🟢 営業中':'🔴 準備中';
    el.classList.toggle('open',open);
  }
  function renderModeBar(){
    const bar=$('adminModeBar'); if(!bar) return;
    bar.innerHTML=MODE_ORDER.map(m=>`<button class="mode-btn ${currentMode===m?'active':''}" data-mode="${m}">${MODE_LABEL[m]}</button>`).join('');
    bar.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
      currentMode=b.dataset.mode; saveMode(currentMode);
      if(!visibleTabs().some(t=>t[0]===current)) current='dash';
      renderModeBar(); renderTabs(); render();
    });
  }
  function renderTabs(){const vt=visibleTabs();if(!vt.some(t=>t[0]===current))current='dash';$('adminTabs').innerHTML=vt.map(t=>`<button class="tab ${current===t[0]?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('');document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{current=b.dataset.tab;renderTabs();render()})}
  function cats(){
    const fixed=[
      {id:'beer_sour',name:'ビール・サワー',icon:'🍺'},
      {id:'shochu_cocktail',name:'焼酎・カクテル',icon:'🍸'},
      {id:'shot_bottle',name:'ショット・ボトル',icon:'🥂'},
      {id:'soft',name:'ソフトドリンク',icon:'🥤'},
      {id:'food',name:'フード',icon:'🍟'},
      {id:'dessert',name:'デザート',icon:'🍰'},
      {id:'event',name:'イベント',icon:'🎉'}
    ];
    // 既にカテゴリが保存済みならそれを尊重する（以前は毎回ここで強制的にバー向け固定リストへ戻してしまっていた）
    if(!Array.isArray(data.settings.categories) || !data.settings.categories.length){
      data.settings.categories=fixed;
    }
    return data.settings.categories;
  }
  function normalizeProduct(p,i){p=p||{};p.id=p.id||GuildUtils.uid('menu');p.cat=p.cat||p.category||'food';p.category=p.cat;p.name=p.name||'商品';p.price=Number(p.price)||0;p.emoji=p.emoji||p.icon||'🍽️';p.icon=p.emoji;p.desc=p.desc||'';p.image=p.image||'';p.hidden=!!p.hidden;p.soldOut=!!p.soldOut;p.recommended=!!p.recommended;p.limited=!!p.limited;if(p.stock===null||typeof p.stock==='undefined')p.stock='';else if(p.stock!=='')p.stock=Math.max(0,Number(p.stock)||0);p.sort=Number(p.sort||i);
    p.questName=p.questName||'';p.questRank=p.questRank||'';p.questDesc=p.questDesc||'';p.questClient=p.questClient||'';
    p.recommendedLevel=(p.recommendedLevel===''||typeof p.recommendedLevel==='undefined')?'':Number(p.recommendedLevel)||0;
    p.questExp=Number(p.questExp)||0;p.questGold=Number(p.questGold)||0;
    p.targetMonster=p.targetMonster||'';p.targetCount=Number(p.targetCount)||0;
    p.clearTitle=p.clearTitle||'';p.clearBody=p.clearBody||'';
    p.eventOnly=!!p.eventOnly;p.startAt=p.startAt||'';p.endAt=p.endAt||'';p.repeatable=p.repeatable!==false;
    p.clearSe=p.clearSe||'';p.clearImage=p.clearImage||'';
    p.isQuest=!!p.isQuest;
    return p}
  function categoryManagerHtml(cs){
    return '<div class="admin-card"><div class="admin-card-title">🗂️ カテゴリ管理</div>'+
      '<p class="tiny">お店の業態に合わせてカテゴリを自由に編集できます（アイコンは絵文字1文字）。</p>'+
      '<div id="catManagerList">'+cs.map((c,i)=>
        '<div class="row" style="align-items:center;gap:6px;margin:4px 0">'+
        '<input data-cat-icon="'+i+'" value="'+esc(c.icon||'🍽️')+'" style="flex:0 0 52px;text-align:center" maxlength="4">'+
        '<input data-cat-name="'+i+'" value="'+esc(c.name||'')+'" style="flex:2">'+
        '<button class="btn small" data-cat-up="'+i+'" '+(i===0?'disabled':'')+'>↑</button>'+
        '<button class="btn small" data-cat-down="'+i+'" '+(i===cs.length-1?'disabled':'')+'>↓</button>'+
        '<button class="btn small red" data-cat-del="'+i+'">×</button>'+
        '</div>'
      ).join('')+'</div>'+
      '<div class="toolbar"><button class="btn" id="addCategory">＋ カテゴリを追加</button><button class="btn gold" id="saveCategories">カテゴリを保存</button></div>'+
      '</div>';
  }
  function bindCategoryManager(){
    document.querySelectorAll('[data-cat-up]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.catUp; const cs=cats(); if(i>0){ [cs[i-1],cs[i]]=[cs[i],cs[i-1]]; save(); renderMenu(); } });
    document.querySelectorAll('[data-cat-down]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.catDown; const cs=cats(); if(i<cs.length-1){ [cs[i+1],cs[i]]=[cs[i],cs[i+1]]; save(); renderMenu(); } });
    document.querySelectorAll('[data-cat-del]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.catDel; const cs=cats(); const target=cs[i];
      const inUse=(data.menu||[]).some(p=>p.cat===target.id);
      if(inUse){ toast('⚠️ このカテゴリの商品が残っているため削除できません。先に商品を別カテゴリへ移してください'); return; }
      if(!confirm('「'+target.name+'」を削除しますか？'))return;
      cs.splice(i,1); save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); renderMenu();
    });
    $('addCategory').onclick=()=>{
      const cs=cats(); cs.push({id:GuildUtils.uid('cat'),name:'新しいカテゴリ',icon:'🍽️'});
      save(); renderMenu();
    };
    $('saveCategories').onclick=()=>{
      const cs=cats();
      document.querySelectorAll('[data-cat-name]').forEach(inp=>{ const i=+inp.dataset.catName; if(cs[i]) cs[i].name=inp.value.trim()||cs[i].name; });
      document.querySelectorAll('[data-cat-icon]').forEach(inp=>{ const i=+inp.dataset.catIcon; if(cs[i]) cs[i].icon=inp.value.trim()||cs[i].icon; });
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('カテゴリを保存しました（全端末に反映されます）');
      renderMenu();
    };
  }
  function renderMenu(){
    data.menu=(data.menu||[]).map(normalizeProduct);
    const cs=cats();
    const opts=cs.map(c=>`<option value="${esc(c.id)}">${esc((c.icon?c.icon+' ':'')+c.name)}</option>`).join('');
    $('adminContent').innerHTML=`<h2>🍴 メニュー管理</h2>
      ${categoryManagerHtml(cs)}
      <div class="toolbar">
        <button class="btn gold" id="addProduct">商品追加</button>
        <button class="btn green" id="saveMenu">保存</button>
        <button class="btn" id="openAll">全部開く</button>
        <button class="btn" id="closeAll">全部閉じる</button>
        <button class="btn" id="jsonMode">JSON</button>
      </div>
      <div id="newProductArea"></div>
      <div class="category-list">${cs.map((c,ci)=>{
        const items=data.menu.map((p,i)=>({p,i})).filter(x=>x.p.cat===c.id);
        return `<section class="category-block ${ci===0?'open':''}">
          <button class="category-head">
            <span>${esc((c.icon?c.icon+' ':'')+c.name)} <b>(${items.length})</b></span>
            <span class="category-toggle">${ci===0?'閉じる':'開く'}</span>
          </button>
          <div class="category-body">${items.length?items.map(({p,i})=>productCard(p,i,opts)).join(''):'<div class="empty">なし</div>'}</div>
        </section>`;
      }).join('')}</div>`;
    bindCategoryManager();

    document.querySelectorAll('.category-head').forEach(h=>h.onclick=()=>{
      const b=h.closest('.category-block');
      b.classList.toggle('open');
      h.querySelector('.category-toggle').textContent=b.classList.contains('open')?'閉じる':'開く';
    });
    document.querySelectorAll('[data-menu-index]').forEach(card=>{
      const p=data.menu[+card.dataset.menuIndex];
      card.querySelector('[data-field="cat"]').value=p.cat;
    });
    document.querySelectorAll('[data-del-product]').forEach(btn=>btn.onclick=()=>{
      if(confirm('削除しますか？')){
        data.menu.splice(+btn.dataset.delProduct,1);
        save();
        renderMenu();
      }
    });

    $('addProduct').onclick=()=>showNewProductForm(opts, cs[0].id);
    $('saveMenu').onclick=()=>{saveMenuForm();toast('保存しました')};
    $('openAll').onclick=()=>toggleCats(true);
    $('closeAll').onclick=()=>toggleCats(false);
    $('jsonMode').onclick=()=>textareaEditor('menu','menu.json');
    wireImageUploadButtons_();
  }

  function showNewProductForm(opts, defaultCat){
    const area=$('newProductArea');
    area.innerHTML=`<div class="admin-card new-product-card">
      <div class="admin-card-title">✨ 新商品追加</div>
      <div class="new-product-grid">
        <label>ジャンル<select id="newProductCat">${opts}</select></label>
        <label>商品名<input id="newProductName" placeholder="例：限定カクテル"></label>
        <label>価格<input id="newProductPrice" type="number" value="0"></label>
        <label>絵文字<input id="newProductEmoji" value="🍽️"></label>
        <label>画像<input id="newProductImage" placeholder="画像ファイル名またはURL"></label>
        <label>在庫<input id="newProductStock" type="number" min="0" placeholder="空欄=無制限"></label>
        <label class="wide-label">説明<textarea id="newProductDesc" placeholder="説明"></textarea></label>
      </div>
      <div class="toolbar">
        <button class="btn gold" id="saveNewProduct">追加して保存</button>
        <button class="btn" id="cancelNewProduct">キャンセル</button>
      </div>
    </div>`;
    $('newProductCat').value=defaultCat;
    $('newProductName').focus();

    $('cancelNewProduct').onclick=()=>{area.innerHTML='';};
    $('saveNewProduct').onclick=()=>{
      const name=$('newProductName').value.trim();
      if(!name){toast('商品名を入力してください');$('newProductName').focus();return;}
      const stockVal=$('newProductStock').value;
      const p=normalizeProduct({
        name,
        cat:$('newProductCat').value,
        price:+$('newProductPrice').value||0,
        emoji:$('newProductEmoji').value||'🍽️',
        image:$('newProductImage').value||'',
        stock:stockVal===''?'':Math.max(0,+stockVal||0),
        desc:$('newProductDesc').value||''
      },data.menu.length);
      data.menu.unshift(p);
      save();
      toast('新商品を追加しました');
      renderMenu();
    };
  }
  function toggleCats(o){document.querySelectorAll('.category-block').forEach(b=>{b.classList.toggle('open',o);b.querySelector('.category-toggle').textContent=o?'閉じる':'開く'})}
  function productCard(p,i,opts){return `<div class="admin-card product-edit-card" data-menu-index="${i}"><div class="admin-card-title">#${i+1} ${esc(p.name)}</div><label>商品名<input data-field="name" value="${esc(p.name)}"></label><label>ジャンル<select data-field="cat">${opts}</select></label><label>価格<input data-field="price" type="number" value="${p.price}"></label><label>絵文字<input data-field="emoji" value="${esc(p.emoji)}"></label><label>画像<input data-img-upload data-field="image" value="${esc(p.image)}"></label><label>在庫<input data-field="stock" type="number" min="0" placeholder="空欄=無制限" value="${p.stock===''?'':p.stock}"></label><label>説明<textarea data-field="desc">${esc(p.desc)}</textarea></label><label class="check-row"><input data-field="recommended" type="checkbox" ${p.recommended?'checked':''}>⭐おすすめ</label><label class="check-row"><input data-field="limited" type="checkbox" ${p.limited?'checked':''}>👑限定</label><label class="check-row"><input data-field="soldOut" type="checkbox" ${p.soldOut?'checked':''}>❌売切れ</label><label class="check-row"><input data-field="hidden" type="checkbox" ${p.hidden?'checked':''}>非表示</label>
    <details class="quest-fields" ${p.isQuest?'open':''}><summary>🗡️ 依頼設定（任意・ギルド連携用）</summary>
      <label class="check-row" style="margin-top:0"><input data-field="isQuest" type="checkbox" ${p.isQuest?'checked':''}> 📜 依頼として別枠に表示する（オン＝通常メニューから消え「依頼」タブ専用になります）</label>
      <label>依頼名<input data-field="questName" value="${esc(p.questName||'')}" placeholder="未入力なら商品名を使用"></label>
      <label>依頼ランク<select data-field="questRank"><option value="">未設定</option>${['F','E','D','C','B','A','S','SS','SSS'].map(r=>`<option value="${r}" ${p.questRank===r?'selected':''}>${r}</option>`).join('')}</select></label>
      <label>依頼説明<textarea data-field="questDesc" placeholder="未入力なら通常の説明を使用">${esc(p.questDesc||'')}</textarea></label>
      <label>依頼主<input data-field="questClient" value="${esc(p.questClient||'')}" placeholder="例：ギルド受付嬢"></label>
      <label>推奨レベル<input data-field="recommendedLevel" type="number" min="0" value="${p.recommendedLevel===''?'':p.recommendedLevel}"></label>
      <label>経験値<input data-field="questExp" type="number" min="0" value="${p.questExp||0}"></label>
      <label>ゴールド<input data-field="questGold" type="number" min="0" value="${p.questGold||0}"></label>
      <label>討伐対象モンスター<input data-field="targetMonster" value="${esc(p.targetMonster||'')}" placeholder="モンスター名"></label>
      <label>討伐対象数<input data-field="targetCount" type="number" min="0" value="${p.targetCount||0}"></label>
      <label>達成証タイトル<input data-field="clearTitle" value="${esc(p.clearTitle||'')}"></label>
      <label>達成証本文<textarea data-field="clearBody">${esc(p.clearBody||'')}</textarea></label>
      <label class="check-row"><input data-field="eventOnly" type="checkbox" ${p.eventOnly?'checked':''}>イベント限定</label>
      <label>開始日時<input data-field="startAt" type="datetime-local" value="${esc(p.startAt||'')}"></label>
      <label>終了日時<input data-field="endAt" type="datetime-local" value="${esc(p.endAt||'')}"></label>
      <label class="check-row"><input data-field="repeatable" type="checkbox" ${p.repeatable!==false?'checked':''}>リピート可</label>
      <label>達成時SE<input data-field="clearSe" value="${esc(p.clearSe||'')}" placeholder="例：victory / ファイル名"></label>
      <label>達成時演出画像<input data-field="clearImage" value="${esc(p.clearImage||'')}" placeholder="画像ファイル名またはURL"></label>
    </details>
    <button class="btn red small" data-del-product="${i}">削除</button></div>`}
  function saveMenuForm(){document.querySelectorAll('[data-menu-index]').forEach(card=>{const p=data.menu[+card.dataset.menuIndex];p.name=card.querySelector('[data-field="name"]').value;p.cat=card.querySelector('[data-field="cat"]').value;p.category=p.cat;p.price=+card.querySelector('[data-field="price"]').value||0;p.emoji=card.querySelector('[data-field="emoji"]').value||'🍽️';p.icon=p.emoji;p.image=card.querySelector('[data-field="image"]').value;p.desc=card.querySelector('[data-field="desc"]').value;p.stock=card.querySelector('[data-field="stock"]').value===''?'':Math.max(0,+card.querySelector('[data-field="stock"]').value||0);p.recommended=card.querySelector('[data-field="recommended"]').checked;p.limited=card.querySelector('[data-field="limited"]').checked;p.soldOut=card.querySelector('[data-field="soldOut"]').checked;p.hidden=card.querySelector('[data-field="hidden"]').checked;
    const qf=function(field){const el=card.querySelector('[data-field="'+field+'"]');return el?el.value:'';};
    const isQuestEl=card.querySelector('[data-field="isQuest"]');p.isQuest=isQuestEl?isQuestEl.checked:false;
    p.questName=qf('questName').trim();p.questRank=qf('questRank');p.questDesc=qf('questDesc');p.questClient=qf('questClient').trim();
    p.recommendedLevel=qf('recommendedLevel')===''?'':Math.max(0,+qf('recommendedLevel')||0);
    p.questExp=Math.max(0,+qf('questExp')||0);p.questGold=Math.max(0,+qf('questGold')||0);
    p.targetMonster=qf('targetMonster').trim();p.targetCount=Math.max(0,+qf('targetCount')||0);
    p.clearTitle=qf('clearTitle').trim();p.clearBody=qf('clearBody');
    const eventOnlyEl=card.querySelector('[data-field="eventOnly"]');p.eventOnly=eventOnlyEl?eventOnlyEl.checked:false;
    p.startAt=qf('startAt');p.endAt=qf('endAt');
    const repeatableEl=card.querySelector('[data-field="repeatable"]');p.repeatable=repeatableEl?repeatableEl.checked:true;
    p.clearSe=qf('clearSe').trim();p.clearImage=qf('clearImage').trim();
  });data.settings.menuPushedAt=new Date().toISOString();save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();}
  function customerListHtml(){const q=customerQuery.toLowerCase();const list=(data.customers||[]).map((c,i)=>({c,i})).filter(({c})=>!q||[c.name,c.title,c.memo,c.id].some(v=>String(v||'').toLowerCase().includes(q)));return list.length?list.map(({c,i})=>customerCard(c,i)).join(''):'<div class="empty">なし</div>';}
  function refreshCustomerList(){const box=$('customerListBox');if(box)box.innerHTML=customerListHtml();bindCustomerListEvents();}
  function bindCustomerListEvents(){document.querySelectorAll('[data-del-customer]').forEach(b=>b.onclick=()=>{if(confirm('削除しますか？')){const idx=+b.dataset.delCustomer;const c=data.customers[idx];if(c&&c.id){data.deletedCustomerIds=Array.from(new Set([...(data.deletedCustomerIds||[]),c.id]));if(GuildStorage.markCustomerDeleted)GuildStorage.markCustomerDeleted(c);}data.customers.splice(idx,1);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();refreshCustomerList();toast('削除しました')}});document.querySelectorAll('[data-sales-of]').forEach(b=>b.onclick=()=>{salesQuery=data.customers[+b.dataset.salesOf].name;current='sales';renderTabs();renderSales()});bindOpenBillEvents()}
  function renderCustomers(){$('adminContent').innerHTML=`<h2>👤 顧客管理</h2><div class="toolbar searchbar"><input id="customerSearch" placeholder="顧客検索（Enterで検索）" value="${esc(customerQuery)}" enterkeyhint="search"><button class="btn" id="customerSearchBtn">検索</button><button class="btn gold" id="addCustomer">追加</button><button class="btn green" id="saveCustomers">保存</button><button class="btn" id="jsonCustomers">JSON</button></div><div class="customer-list" id="customerListBox">${customerListHtml()}</div>`;const si=$('customerSearch');const run=()=>{customerQuery=si.value;refreshCustomerList()};si.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();si.focus()}});$('customerSearchBtn').onclick=()=>{run();si.focus()};$('addCustomer').onclick=()=>{saveCustomerForm();data.customers.unshift({id:GuildUtils.uid('cust'),name:'新規冒険者',avatar:'🙂',level:1,title:'新米冒険者',visits:0,total:0,lastVisit:'',memo:''});save();refreshCustomerList()};$('saveCustomers').onclick=()=>{saveCustomerForm();toast('保存しました')};$('jsonCustomers').onclick=()=>textareaEditor('customers','customers.json');bindCustomerListEvents()}
  function menuOptionsHtml(){
    const cs=cats();
    return cs.map(c=>{
      const items=(data.menu||[]).filter(p=>p.cat===c.id && !p.hidden && !p.soldOut);
      if(!items.length) return '';
      return '<optgroup label="'+esc((c.icon?c.icon+' ':'')+c.name)+'">'+items.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'（'+yen(p.price,data.settings.currency)+'）</option>').join('')+'</optgroup>';
    }).join('');
  }
  function customerOpenBillHtml(c,i){
    const bill=c.openBill||[];
    const total=bill.reduce((s,it)=>s+(Number(it.subtotal)||0),0);
    return '<div class="admin-card" style="border-color:var(--gold)"><div class="admin-card-title">🗣️ 口頭注文（この人専用の伝票）</div>'+
      (bill.length?'<div class="billbox">'+bill.map((it,bi)=>'・'+esc(it.name)+' ×'+it.qty+' = '+yen(it.subtotal,data.settings.currency)+' <button class="btn small red" data-openbill-del="'+i+':'+bi+'">×</button>').join('<br>')+'</div>'
        :'<p class="tiny">まだ注文はありません</p>')+
      '<div class="row" style="align-items:center;gap:6px;margin-top:6px">'+
      '<select data-openbill-item="'+i+'" style="flex:2">'+menuOptionsHtml()+'</select>'+
      '<input type="number" data-openbill-qty="'+i+'" value="1" min="1" style="flex:0 0 60px">'+
      '<button class="btn small gold" data-openbill-add="'+i+'">追加</button>'+
      '</div>'+
      (bill.length?'<div class="toolbar"><b>合計 '+yen(total,data.settings.currency)+'</b><button class="btn green" data-openbill-checkout="'+i+'">この内容で会計する</button></div>':'')+
      '</div>';
  }
  function bindOpenBillEvents(){
    document.querySelectorAll('[data-openbill-add]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.openbillAdd; const c=data.customers[i]; if(!c) return;
      const sel=document.querySelector('[data-openbill-item="'+i+'"]');
      const qtyInp=document.querySelector('[data-openbill-qty="'+i+'"]');
      const p=(data.menu||[]).find(x=>x.id===sel.value); if(!p){ toast('商品を選んでください'); return; }
      const qty=Math.max(1,+qtyInp.value||1);
      c.openBill=c.openBill||[];
      const existing=c.openBill.find(it=>it.id===p.id);
      if(existing){ existing.qty+=qty; existing.subtotal=existing.qty*p.price; }
      else c.openBill.push({id:p.id,name:p.name,price:p.price,qty,subtotal:p.price*qty});
      if(p.stock!==''&&typeof p.stock!=='undefined'){ p.stock=Math.max(0,Number(p.stock||0)-qty); if(p.stock<=0)p.soldOut=true; }
      save(); refreshCustomerList();
    });
    document.querySelectorAll('[data-openbill-del]').forEach(b=>b.onclick=()=>{
      const [i,bi]=b.dataset.openbillDel.split(':').map(Number);
      const c=data.customers[i]; if(!c||!c.openBill) return;
      c.openBill.splice(bi,1); save(); refreshCustomerList();
    });
    document.querySelectorAll('[data-openbill-checkout]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.openbillCheckout; const c=data.customers[i]; if(!c||!c.openBill||!c.openBill.length) return;
      if(!confirm(c.name+'さんの口頭注文分（'+c.openBill.length+'品）を会計しますか？'))return;
      const total=c.openBill.reduce((s,it)=>s+(Number(it.subtotal)||0),0);
      const rec={id:GuildUtils.uid('sale'),type:'checkout',customer:c.name,customerId:c.id||'',items:c.openBill,total,partyCount:1,time:new Date().toISOString(),timeText:GuildUtils.todayText(),reason:'口頭注文（管理画面入力）',accountingMonth:(salesSettings().currentMonth)};
      data.sales=data.sales||[]; data.sales.push(rec);
      c.total=(Number(c.total)||0)+total; c.lastVisit=rec.timeText;
      if(GuildCustomer&&GuildCustomer.recheckLevelAfterCheckout) GuildCustomer.recheckLevelAfterCheckout(c);
      c.openBill=[];
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('会計しました：'+yen(total,data.settings.currency));
      refreshCustomerList();
    });
  }
  function customerCard(c,i){const sales=(data.sales||[]).filter(s=>s.customer===c.name);return `<div class="admin-card customer-card" data-customer-index="${i}"><div class="customer-head"><div class="admin-card-title">${GuildUtils.avatarTag(c)}${esc(c.name)}</div><span class="badge">${esc(c.id||'')}</span></div><div class="customer-mini-grid"><label>アイコン(絵文字1文字)<input data-field="avatar" value="${esc(c.avatar||'🙂')}" maxlength="4"></label><label>名前<input data-field="name" value="${esc(c.name||'')}"></label><label>Lv<input data-field="level" type="number" value="${c.level||1}"></label><label>二つ名<input data-field="title" value="${esc(c.title||'')}"></label><label>来店<input data-field="visits" type="number" value="${c.visits||0}"></label><label>累計<input data-field="total" type="number" value="${c.total||0}"></label><label>最終<input data-field="lastVisit" value="${esc(c.lastVisit||'')}"></label></div>${c.avatarImage?'<div class="tiny">📷 この端末で撮影/選択した画像アイコンが設定されています（他の端末には表示されません）</div>':''}<label class="wide-label">メモ<textarea data-field="memo">${esc(c.memo||'')}</textarea></label>${customerOpenBillHtml(c,i)}<div class="billbox">履歴 ${sales.length}件</div><div class="toolbar"><button class="btn small" data-sales-of="${i}">履歴を見る</button><button class="btn red small" data-del-customer="${i}">削除</button></div></div>`}
  function saveCustomerForm(){document.querySelectorAll('[data-customer-index]').forEach(card=>{const c=data.customers[+card.dataset.customerIndex];c.avatar=card.querySelector('[data-field="avatar"]').value.trim()||'🙂';c.name=card.querySelector('[data-field="name"]').value;c.level=+card.querySelector('[data-field="level"]').value||1;c.title=card.querySelector('[data-field="title"]').value;c.visits=+card.querySelector('[data-field="visits"]').value||0;c.total=+card.querySelector('[data-field="total"]').value||0;c.lastVisit=card.querySelector('[data-field="lastVisit"]').value;c.memo=card.querySelector('[data-field="memo"]').value});save()}
  function saleDate(s){const raw=s.time||s.timeText||'';const d=raw?new Date(raw):null;return d&&!isNaN(d)?d:null;}
  function saleDay(s){const d=saleDate(s);return d?d.toISOString().slice(0,10):String(s.timeText||'').slice(0,10).replace(/[\/]/g,'-');}
  function monthFromDate(){return new Date().toISOString().slice(0,7)}
  function nextMonth(m){const a=String(m||monthFromDate()).split('-');const d=new Date(Number(a[0]),Number(a[1]||1),1);return d.toISOString().slice(0,7)}
  function salesSettings(){data.salesSettings=data.salesSettings||{currentMonth:monthFromDate(),closedMonths:[],monthlyArchives:{}};if(!data.salesSettings.currentMonth)data.salesSettings.currentMonth=monthFromDate();if(!Array.isArray(data.salesSettings.closedMonths))data.salesSettings.closedMonths=[];if(!data.salesSettings.monthlyArchives||typeof data.salesSettings.monthlyArchives!=='object')data.salesSettings.monthlyArchives={};return data.salesSettings;}
  function saleMonth(s){return s.accountingMonth||String(s.time||saleDay(s)||monthFromDate()).slice(0,7)}
  function activeSales(){return (data.sales||[]).filter(s=>s&&s.type==='checkout');}
  function selectedMonth(){const el=$('salesMonth');return el&&el.value?el.value:salesSettings().currentMonth;}
  function salesInRange(){const m=selectedMonth();return activeSales().filter(s=>saleMonth(s)===m);}
  function sumSales(list){return list.reduce((a,s)=>a+(+s.total||0),0);}
  function todayKey(){return new Date().toISOString().slice(0,10);}
  function rankItems(list,byCat){const map={};list.forEach(s=>(s.items||[]).forEach(it=>{const key=byCat?(it.cat||'未分類'):(it.name||'商品');if(!map[key])map[key]={name:key,qty:0,total:0};map[key].qty+=Number(it.qty||1);map[key].total+=Number(it.subtotal||0);}));return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,20);}
  function chargeTotal(list){let t=0;list.forEach(s=>(s.items||[]).forEach(it=>{if(it.isCharge||it.id==='cover-charge'||it.cat==='charge'||it.name==='席料')t+=Number(it.subtotal||0)}));return t;}
  function salesArchive(month){const ss=salesSettings();return (ss.monthlyArchives||{})[month]||null;}
  function buildMonthArchive(month){const list=activeSales().filter(s=>saleMonth(s)===month);const total=sumSales(list);const cover=chargeTotal(list);const items=rankItems(list,false);const cats=rankItems(list,true);return {month,closedAt:new Date().toISOString(),closedAtText:GuildUtils.todayText(),count:list.length,total,cover,itemTotal:total-cover,items,categories:cats};}
  function archiveHtml(){const ss=salesSettings();const keys=Object.keys(ss.monthlyArchives||{}).sort().reverse().slice(0,12);if(!keys.length)return '';const rows=keys.map(m=>{const a=ss.monthlyArchives[m];return `<tr><td>${esc(m)}</td><td>${esc(a.closedAtText||'')}</td><td>${a.count||0}</td><td>${yen(a.cover||0,data.settings.currency)}</td><td>${yen(a.total||0,data.settings.currency)}</td></tr>`}).join('');return `<div class="admin-card"><div class="admin-card-title">清算済み月別履歴</div><table class="sales-table"><thead><tr><th>月</th><th>清算日</th><th>会計</th><th>席料</th><th>総額</th></tr></thead><tbody>${rows}</tbody></table></div>`;}
  function salesSummaryHtml(){const ss=salesSettings();const list=salesInRange();const today=activeSales().filter(s=>saleDay(s)===todayKey()&&saleMonth(s)===ss.currentMonth);const total=sumSales(list);const cover=chargeTotal(list);const itemTotal=total-cover;const arc=salesArchive(selectedMonth());const closedNote=arc?`<div class="tiny">清算済み：${esc(arc.closedAtText||'')} / 清算時総額 ${yen(arc.total||0,data.settings.currency)}</div>`:'';return `<div class="admin-card"><div class="admin-card-title">現在の売上月</div><div class="big-num">${esc(ss.currentMonth)} 月分</div><div class="tiny">清算すると概要が0に戻り、次の月へ切り替わります</div></div><div class="grid sales-summary"><div class="admin-card"><div class="admin-card-title">本日売上</div><div class="big-num">${yen(sumSales(today),data.settings.currency)}</div><div class="tiny">会計 ${today.length}件 / 現在月分のみ</div></div><div class="admin-card"><div class="admin-card-title">月締め総額</div><div class="big-num">${yen(total,data.settings.currency)}</div><div class="tiny">${selectedMonth()} 月分 / 会計 ${list.length}件</div>${closedNote}</div><div class="admin-card"><div class="admin-card-title">席料合計</div><div class="big-num">${yen(cover,data.settings.currency)}</div><div class="tiny">席料設定 ${yen(data.settings.coverCharge||0,data.settings.currency)} × 人数</div></div><div class="admin-card"><div class="admin-card-title">商品売上</div><div class="big-num">${yen(itemTotal,data.settings.currency)}</div><div class="tiny">総額 − 席料</div></div></div>`;}
  function rankingHtml(){const list=salesInRange();const items=rankItems(list,false);const cats=rankItems(list,true);const row=r=>`<tr><td>${esc(r.name)}</td><td>${r.qty}</td><td>${yen(r.total,data.settings.currency)}</td></tr>`;return `<div class="grid"><div class="admin-card"><div class="admin-card-title">何が何個売れたか</div><table class="sales-table"><thead><tr><th>商品</th><th>個数</th><th>売上</th></tr></thead><tbody>${items.length?items.map(row).join(''):'<tr><td colspan="3">なし</td></tr>'}</tbody></table></div><div class="admin-card"><div class="admin-card-title">内訳</div><table class="sales-table"><thead><tr><th>区分</th><th>数</th><th>売上</th></tr></thead><tbody>${cats.length?cats.map(row).join(''):'<tr><td colspan="3">なし</td></tr>'}</tbody></table></div></div>`;}
  function monthOptions(){const set=new Set([salesSettings().currentMonth]);activeSales().forEach(s=>set.add(saleMonth(s)));return Array.from(set).sort().reverse().map(m=>`<option value="${esc(m)}" ${m===salesSettings().currentMonth?'selected':''}>${esc(m)} 月分</option>`).join('')}
  function salesListHtml(){const q=salesQuery.toLowerCase();const m=selectedMonth();const list=(data.sales||[]).map((s,i)=>({s,i})).filter(({s})=>!s.accountingMonth||saleMonth(s)===m).filter(({s})=>!q||[s.customer,s.timeText,s.reason,s.type,s.accountingMonth,(s.items||[]).map(x=>x.name).join(' ')].some(v=>String(v||'').toLowerCase().includes(q))).reverse();return list.length?list.map(({s,i})=>saleCard(s,i)).join(''):'<div class="empty">なし</div>';}
  function refreshSalesList(){const box=$('salesListBox');if(box)box.innerHTML=salesListHtml();const sum=$('salesSummaryBox');if(sum)sum.innerHTML=salesSummaryHtml()+rankingHtml()+archiveHtml();bindSalesListEvents();}
  function closeMonth(){const ss=salesSettings();const cur=ss.currentMonth;const archive=buildMonthArchive(cur);if(!confirm(cur+' 月分を清算して、概要を初期化しますか？\n清算時点の総額・席料・商品内訳は月別履歴に保存されます。\n以後の会計は翌月分になります。'))return;ss.monthlyArchives=ss.monthlyArchives||{};ss.monthlyArchives[cur]=archive;if(!ss.closedMonths.includes(cur))ss.closedMonths.push(cur);ss.currentMonth=nextMonth(cur);salesQuery='';save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('清算しました。概要は '+ss.currentMonth+' 月分で初期化されました');renderSales();}
  function bindSalesListEvents(){document.querySelectorAll('[data-del-sale]').forEach(b=>b.onclick=()=>{if(confirm('削除しますか？')){const s=data.sales[+b.dataset.delSale];if(GuildStorage.markSaleDeleted)GuildStorage.markSaleDeleted(s);data.sales.splice(+b.dataset.delSale,1);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();refreshSalesList();toast('削除しました')}});document.querySelectorAll('[data-cancel-sale]').forEach(b=>b.onclick=()=>{const s=data.sales[+b.dataset.cancelSale];s.type='cancel';s.reason=(s.reason||'')+' キャンセル';save();refreshSalesList()})}
  function renderSales(){$('adminContent').innerHTML=`<h2>💰 売上管理</h2><div class="toolbar searchbar"><input id="salesSearch" placeholder="履歴検索（Enterで検索）" value="${esc(salesQuery)}" enterkeyhint="search"><button class="btn" id="salesSearchBtn">検索</button><button class="btn" id="clearSales">解除</button></div><div class="toolbar searchbar"><label>売上月<select id="salesMonth">${monthOptions()}</select></label><button class="btn gold" id="applySalesRange">集計更新</button><button class="btn green" id="exportSalesCsv">CSV出力</button><button class="btn red" id="closeSalesMonth">清算して翌月へ</button><button class="btn" id="addManualSale">手入力売上</button><button class="btn" id="jsonSales">JSON</button></div><div id="salesSummaryBox">${salesSummaryHtml()+rankingHtml()+archiveHtml()}</div><h3>注文履歴から作った売上</h3><div class="toolbar"><button class="btn green" id="saveSales">履歴を保存</button></div><div class="sales-list" id="salesListBox">${salesListHtml()}</div>`;const si=$('salesSearch');const run=()=>{salesQuery=si.value;refreshSalesList()};si.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();si.focus()}});$('salesSearchBtn').onclick=()=>{run();si.focus()};$('clearSales').onclick=()=>{salesQuery='';renderSales()};$('applySalesRange').onclick=refreshSalesList;$('salesMonth').onchange=refreshSalesList;$('closeSalesMonth').onclick=closeMonth;$('saveSales').onclick=()=>{saveSalesForm();toast('保存しました');refreshSalesList()};$('jsonSales').onclick=()=>textareaEditor('sales','sales.json');$('exportSalesCsv').onclick=exportCsv;$('addManualSale').onclick=addManualSale;bindSalesListEvents()}
  function addManualSale(){const customer=prompt('顧客名','店頭売上')||'店頭売上';const total=Number(prompt('売上金額','0')||0);if(!total){toast('金額が0です');return;}const rec={id:GuildUtils.uid('sale'),type:'checkout',customer,customerId:'',items:[{id:'manual',name:'手入力売上',cat:'manual',price:total,qty:1,subtotal:total}],total,partyCount:1,time:new Date().toISOString(),timeText:GuildUtils.todayText(),accountingMonth:salesSettings().currentMonth,reason:'管理画面で手入力'};data.sales.push(rec);save();toast('手入力売上を追加しました');renderSales();}
  function exportCsv(){const rows=[['売上月','日時','種別','顧客','人数','商品','数量','小計','合計','メモ']];salesInRange().forEach(s=>{const items=s.items&&s.items.length?s.items:[{name:'',qty:'',subtotal:''}];items.forEach((it,idx)=>rows.push([saleMonth(s),s.timeText||s.time||'',s.type||'',s.customer||'',s.partyCount||'',it.name||'',it.qty||'',it.subtotal||'',idx===0?(s.total||0):'',s.reason||'']));});const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='otakuba_sales_'+selectedMonth()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function saleCard(s,i){const items=(s.items||[]).map(it=>`・${esc(it.name)} ×${it.qty||1} = ${yen(it.subtotal||0,data.settings.currency)}`).join('<br>');return `<div class="admin-card sale-card" data-sale-index="${i}"><div class="customer-head"><div class="admin-card-title">${s.type==='cancel'?'❌':(s.type==='order'?'🧾':'💰')} ${esc(s.customer||'')}</div><span class="badge">${esc(s.accountingMonth||saleMonth(s))} / ${esc(s.type||'checkout')}</span></div><div class="customer-mini-grid"><label>顧客<input data-field="customer" value="${esc(s.customer||'')}"></label><label>種別<select data-field="type"><option value="checkout" ${s.type==='checkout'?'selected':''}>会計</option><option value="order" ${s.type==='order'?'selected':''}>注文</option><option value="cancel" ${s.type==='cancel'?'selected':''}>キャンセル</option></select></label><label>売上月<input data-field="accountingMonth" value="${esc(s.accountingMonth||saleMonth(s))}"></label><label>合計<input data-field="total" type="number" value="${s.total||0}"></label><label>人数<input data-field="partyCount" type="number" value="${s.partyCount||1}"></label><label class="wide-label">日時<input data-field="timeText" value="${esc(s.timeText||'')}"></label></div><div class="billbox">${items||'明細なし'}</div><label class="wide-label">メモ<textarea data-field="reason">${esc(s.reason||'')}</textarea></label><div class="toolbar"><button class="btn small" data-cancel-sale="${i}">キャンセル扱い</button><button class="btn red small" data-del-sale="${i}">削除</button></div></div>`}
  function saveSalesForm(){document.querySelectorAll('[data-sale-index]').forEach(card=>{const s=data.sales[+card.dataset.saleIndex];s.customer=card.querySelector('[data-field="customer"]').value;s.type=card.querySelector('[data-field="type"]').value;s.accountingMonth=card.querySelector('[data-field="accountingMonth"]').value||salesSettings().currentMonth;s.total=+card.querySelector('[data-field="total"]').value||0;s.partyCount=+card.querySelector('[data-field="partyCount"]').value||1;s.timeText=card.querySelector('[data-field="timeText"]').value;s.reason=card.querySelector('[data-field="reason"]').value});save()}
  function textareaEditor(key,label){$('adminContent').innerHTML=`<h2>${label}</h2><textarea class="json-box" id="jsonEdit">${esc(JSON.stringify(data[key],null,2))}</textarea><div class="toolbar"><button class="btn gold" id="saveJson">保存</button><button class="btn" id="formatJson">整形</button></div>`;$('saveJson').onclick=()=>{try{data[key]=JSON.parse($('jsonEdit').value);save();toast('保存しました');render()}catch(e){toast('JSONエラー')}};$('formatJson').onclick=()=>{try{$('jsonEdit').value=JSON.stringify(JSON.parse($('jsonEdit').value),null,2)}catch(e){toast('JSONエラー')}}}

  // ===== 討伐（モンスター）ボタン編集 =====
  // 2026-07: 実際のファイル名と突き合わせて総点検。存在しないファイル（拡張子違い/(1)重複サフィックス/フォルダ抜け）を全部除去した
  var BG_LIST=[
    'presets/rpg/background.jpg','presets/rpg/grass.png','presets/rpg/forest.png','presets/rpg/cave.png','presets/rpg/mountain.png','presets/rpg/ruins.png','presets/rpg/volcano.png','presets/rpg/castle.png','presets/rpg/victory_clear.PNG',
    'presets/space/start.png','presets/space/clear.png','presets/space/bg_orbit.png','presets/space/bg_belt.png','presets/space/bg_colony.png','presets/space/bg_fortress.png','presets/space/bg_star.png','presets/space/bg_mothership.png',
    'presets/magic/start.png','presets/magic/clear.png','presets/magic/bg_yard.png','presets/magic/bg_greenhouse.png','presets/magic/bg_ritual.png'
  ];
  var IMG_LIST=[
    'presets/rpg/slime.png','presets/rpg/goblin.png','presets/rpg/orc.png','presets/rpg/skeleton.png','presets/rpg/gargoyle.png','presets/rpg/minotaur.png','presets/rpg/mimic.png','presets/rpg/dragon.png','presets/rpg/dark_wizard.png','presets/rpg/maou.png','presets/rpg/maou_new.png',
    'presets/space/drone.png','presets/space/fighter.png','presets/space/gunship.png','presets/space/alien.png','presets/space/mine.png','presets/space/ancient_sentinel.png','presets/space/satellite.png','presets/space/kaiju.png','presets/space/pirate.png','presets/space/pirate_king.png','presets/space/mother_ai.png',
    'presets/magic/magic_slime.png','presets/magic/fairy.png','presets/magic/Wight.png','presets/magic/armor.png','presets/magic/golem.png','presets/magic/ghost.png','presets/magic/cursed_book.png','presets/magic/vampire.png','presets/magic/dark_mage.png','presets/magic/summoned_dragon.png','presets/magic/master.png'
  ];
  var BGM_LIST=['title','slime','goblin','orc','cave','ruins','maou','daimaou','ending'];
  for(var _bi=1;_bi<=59;_bi++){ BGM_LIST.push('bgm/bgm_'+_bi+'.mp3'); }
  for(var _hi=1;_hi<=28;_hi++){ BGM_LIST.push('bgm/horror_'+_hi+'.mp3'); }
  var SE_LIST_ALL=[]; for(var _si=1;_si<=23;_si++){ SE_LIST_ALL.push('se/se_'+_si+'.mp3'); }
  var RPG_BARE_FILES=['slime.png','goblin.png','orc.png','skeleton.png','mimic.png','minotaur.png','gargoyle.png','dragon.png','dark_wizard.png','maou.png','maou_new.png','grass.png','forest.png','cave.png','ruins.png','volcano.png','castle.png','victory_clear.PNG','background.jpg'];
  var PRESET_LABELS={rpg:'⚔️ RPG',space:'🚀 SF',magic:'🪄 魔法学校'};
  function activePresetId(){ return (data.settings&&data.settings.currentPresetId)||'rpg'; }
  function scopedList(list,presetId){ var prefix='presets/'+presetId+'/'; return list.filter(function(v){ return v.indexOf(prefix)===0; }); }
  function themeScopedBgList(){ return scopedList(BG_LIST,activePresetId()); }
  function themeScopedImgList(){ return scopedList(IMG_LIST,activePresetId()); }
  function fixAssetPath(v){ return (v && RPG_BARE_FILES.indexOf(v)!==-1) ? ('presets/rpg/'+v) : v; }
  function normalizeMonster(m,i){m=m||{};var hpMax=Number(m.maxHp||m.hp||500)||500;m.id=m.id||GuildUtils.uid('enemy');m.name=m.name||('敵'+(i+1));m.stage=m.stage||'草原';m.maxHp=hpMax;m.hp=Number.isFinite(Number(m.hp))?Number(m.hp):hpMax;m.bg=fixAssetPath(m.bg||m.background)||'presets/rpg/grass.png';m.background=m.bg;m.image=fixAssetPath(m.image)||'presets/rpg/slime.png';m.bgm=m.bgm||'slime';m.sort=Number(m.sort||i);m.texts=(m.texts&&typeof m.texts==='object')?m.texts:{};['appear','damage','defeat'].forEach(function(c){if(!Array.isArray(m.texts[c]))m.texts[c]=[];});return m;}
  function optList(arr,sel){return arr.map(function(v){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(v)+'</option>';}).join('');}
  var BGM_LABELS={title:'タイトル',slime:'序盤・スライム系',goblin:'中盤・ゴブリン系',orc:'オーク系',cave:'洞窟',ruins:'遺跡',maou:'魔王',daimaou:'大魔王',ending:'ファンファーレ（クリア）'};
  const BGM_SOURCE_LABELS={
    'bgm/bgm_1.mp3':'ファンタジー07','bgm/bgm_2.mp3':'ファンタジー10','bgm/bgm_3.mp3':'ネオロック83','bgm/bgm_4.mp3':'ファンタジー02',
    'bgm/bgm_5.mp3':'ファンタジー11','bgm/bgm_6.mp3':'ファンタジー06','bgm/bgm_7.mp3':'ファンタジー14','bgm/bgm_8.mp3':'ファンタジー09',
    'bgm/bgm_9.mp3':'大魔王（パンダの中のパンダ）','bgm/bgm_10.mp3':'スライム（魔王魂・元ファイル不明）',
    'bgm/bgm_11.mp3':'ファンタジー12','bgm/bgm_12.mp3':'ファンタジー05','bgm/bgm_13.mp3':'ファンタジー01','bgm/bgm_14.mp3':'ファンタジー04',
    'bgm/bgm_15.mp3':'ファンタジー13','bgm/bgm_16.mp3':'ファンタジー08','bgm/bgm_17.mp3':'ファンタジー03','bgm/bgm_18.mp3':'サイバー45',
    'bgm/bgm_19.mp3':'オーケストラ23','bgm/bgm_20.mp3':'戦闘24','bgm/bgm_21.mp3':'戦闘25','bgm/bgm_22.mp3':'戦闘22','bgm/bgm_23.mp3':'戦闘23',
    'bgm/bgm_24.mp3':'戦闘28','bgm/bgm_25.mp3':'戦闘26','bgm/bgm_26.mp3':'オーケストラ25','bgm/bgm_27.mp3':'戦闘20','bgm/bgm_28.mp3':'オーケストラ26',
    'bgm/bgm_29.mp3':'オーケストラ24','bgm/bgm_30.mp3':'戦闘27','bgm/bgm_31.mp3':'オーケストラ19','bgm/bgm_32.mp3':'オーケストラ20',
    'bgm/bgm_33.mp3':'オーケストラ17','bgm/bgm_34.mp3':'オーケストラ18','bgm/bgm_35.mp3':'オーケストラ22','bgm/bgm_36.mp3':'オーケストラ21',
    'bgm/bgm_37.mp3':'戦闘30','bgm/bgm_38.mp3':'戦闘31','bgm/bgm_39.mp3':'戦闘35','bgm/bgm_40.mp3':'戦闘32','bgm/bgm_41.mp3':'戦闘36',
    'bgm/bgm_42.mp3':'戦闘33','bgm/bgm_43.mp3':'戦闘37','bgm/bgm_44.mp3':'ボス07','bgm/bgm_45.mp3':'ボス08','bgm/bgm_46.mp3':'ボス01',
    'bgm/bgm_47.mp3':'戦闘34','bgm/bgm_48.mp3':'ボス05','bgm/bgm_49.mp3':'ボス06','bgm/bgm_50.mp3':'ボス02','bgm/bgm_51.mp3':'戦闘29',
    'bgm/bgm_52.mp3':'ボス03','bgm/bgm_53.mp3':'ボス04','bgm/bgm_54.mp3':'ラスボス01',
    'bgm/bgm_55.mp3':'ラスボス04','bgm/bgm_56.mp3':'ラスボス03','bgm/bgm_57.mp3':'メドレー01','bgm/bgm_58.mp3':'メドレー02','bgm/bgm_59.mp3':'ラスボス02',
    'bgm/bgm_60.mp3':'ファミコン風15','bgm/bgm_61.mp3':'ファミコン風02','bgm/bgm_62.mp3':'ファミコン風16','bgm/bgm_63.mp3':'ファミコン風01','bgm/bgm_64.mp3':'ファミコン風04',
    'bgm/bgm_65.mp3':'ファミコン風03','bgm/bgm_66.mp3':'ファミコン風20','bgm/bgm_67.mp3':'ファミコン風08','bgm/bgm_68.mp3':'ファミコン風06','bgm/bgm_69.mp3':'ファミコン風07',
    'bgm/bgm_70.mp3':'ファミコン風19','bgm/bgm_71.mp3':'ファミコン風05','bgm/bgm_72.mp3':'ファミコン風17','bgm/bgm_73.mp3':'ファミコン風18','bgm/bgm_74.mp3':'ファミコン風10',
    'bgm/bgm_75.mp3':'ファミコン風14','bgm/bgm_76.mp3':'ファミコン風09','bgm/bgm_77.mp3':'ファミコン風11','bgm/bgm_78.mp3':'ファミコン風12','bgm/bgm_79.mp3':'ファミコン風13',
    'bgm/bgm_80.mp3':'ファミコン風21','bgm/bgm_81.mp3':'ファミコン風27','bgm/bgm_82.mp3':'ファミコン風28','bgm/bgm_83.mp3':'ファミコン風25',
    'bgm/bgm_84.mp3':'ファミコン風22','bgm/bgm_85.mp3':'ファミコン風26','bgm/bgm_86.mp3':'ファミコン風23','bgm/bgm_87.mp3':'ファミコン風24',
    'bgm/horror_1.mp3':'ホラー01','bgm/horror_2.mp3':'ホラー02','bgm/horror_3.mp3':'ホラー03','bgm/horror_4.mp3':'ホラー04','bgm/horror_5.mp3':'ホラー05',
    'bgm/horror_6.mp3':'ホラー06','bgm/horror_7.mp3':'ホラー07','bgm/horror_8.mp3':'ホラー08','bgm/horror_9.mp3':'ホラー09','bgm/horror_10.mp3':'ホラー10',
    'bgm/horror_11.mp3':'ホラー11','bgm/horror_12.mp3':'ホラー12','bgm/horror_13.mp3':'ホラー13','bgm/horror_14.mp3':'ホラー14','bgm/horror_15.mp3':'ホラー15',
    'bgm/horror_16.mp3':'ホラー16','bgm/horror_17.mp3':'ホラー17','bgm/horror_18.mp3':'ホラー18','bgm/horror_19.mp3':'ホラー19','bgm/horror_20.mp3':'ホラー20',
    'bgm/horror_21.mp3':'ホラー21','bgm/horror_22.mp3':'ホラー22','bgm/horror_23.mp3':'ホラー23','bgm/horror_24.mp3':'ホラー24','bgm/horror_25.mp3':'ホラー25',
    'bgm/horror_26.mp3':'ホラー26','bgm/horror_27.mp3':'ホラー27','bgm/horror_28.mp3':'ホラー28'
  };
  const SE_SOURCE_LABELS={
    'se/se_1.mp3':'決定音','se/se_2.mp3':'会計・勝利音','se/se_3.mp3':'システム05','se/se_4.mp3':'ダメージ音','se/se_5.mp3':'システム04',
    'se/se_6.mp3':'キャンセル音','se/se_7.mp3':'撃破音','se/se_8.mp3':'追加音','se/se_9.mp3':'レベルアップ音',
    'se/se_10.mp3':'システム18','se/se_11.mp3':'システム25','se/se_12.mp3':'システム24','se/se_13.mp3':'システム13','se/se_14.mp3':'システム16',
    'se/se_15.mp3':'システム10','se/se_16.mp3':'システム03','se/se_17.mp3':'システム01','se/se_18.mp3':'システム02',
    'se/se_19.mp3':'エフェクト11','se/se_20.mp3':'エフェクト06','se/se_21.mp3':'エフェクト08','se/se_22.mp3':'エフェクト09','se/se_23.mp3':'エフェクト10'
  };
  function bgmLabelFor(v){
    if(BGM_LABELS[v]) return BGM_LABELS[v];
    if(BGM_SOURCE_LABELS[v]) return BGM_SOURCE_LABELS[v]+'（'+v.split('/').pop()+'）';
    if(SE_SOURCE_LABELS[v]) return SE_SOURCE_LABELS[v]+'（'+v.split('/').pop()+'）';
    var m=/bgm_(\d+)\.mp3$/.exec(v); if(m) return '曲 No.'+m[1];
    var s=/se_(\d+)\.mp3$/.exec(v); if(s) return '効果音 No.'+s[1];
    return v;
  }
  function audioSelectHtml(kind,key,currentValue,list,dataAttr){
    var known=list.indexOf(currentValue)!==-1;
    var selVal=currentValue?(known?currentValue:'__custom__'):'';
    var opts='<option value="">未設定</option>'+list.map(function(v){return '<option value="'+esc(v)+'"'+(v===selVal?' selected':'')+'>'+esc(bgmLabelFor(v))+'</option>';}).join('')+'<option value="__custom__"'+(selVal==='__custom__'?' selected':'')+'>その他（ファイル名 / URLを自由入力）</option>';
    var customVisible=selVal==='__custom__';
    return '<select data-'+dataAttr+'-select="'+esc(key)+'">'+opts+'</select>'+
      '<input data-'+dataAttr+'-key="'+esc(key)+'" placeholder="ファイル名 / https://...mp3" value="'+esc(customVisible?currentValue:'')+'" style="margin-top:6px'+(customVisible?'':';display:none')+'">';
  }
  function bindAudioSelects(dataAttr,map){
    document.querySelectorAll('[data-'+dataAttr+'-select]').forEach(function(sel){
      sel.onchange=function(){
        var key=sel.getAttribute('data-'+dataAttr+'-select');
        var custom=document.querySelector('[data-'+dataAttr+'-key="'+key+'"]');
        if(!custom) return;
        if(sel.value==='__custom__'){ custom.style.display=''; custom.focus(); }
        else{ custom.style.display='none'; custom.value=sel.value; }
      };
    });
  }
  function bgmOptList(arr,sel){
    var cats=arr.filter(function(v){return !!BGM_LABELS[v];});
    var files=arr.filter(function(v){return !BGM_LABELS[v];});
    var out='';
    if(cats.length) out+='<optgroup label="用途カテゴリ（テーマ編集→BGMで割り当て先を変更）">'+cats.map(function(v){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(bgmLabelFor(v))+'</option>';}).join('')+'</optgroup>';
    if(files.length) out+='<optgroup label="個別の曲・効果音を直接指定">'+files.map(function(v){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(bgmLabelFor(v))+'</option>';}).join('')+'</optgroup>';
    return out;
  }
  function textCatBlock(m,i,cat,label,ph){
    var arr=(m.texts&&m.texts[cat])||[];
    var rows=arr.map(function(t){return '<div class="text-row" style="display:flex;gap:6px;margin:4px 0">'+
      '<input data-text-input style="flex:1" value="'+esc(t)+'" placeholder="'+esc(ph)+'">'+
      '<button type="button" class="btn small red" data-text-remove>×</button></div>';}).join('');
    return '<div class="text-cat-block" style="margin:8px 0">'+
      '<div class="tiny" style="font-weight:800;margin-bottom:4px">'+esc(label)+'</div>'+
      '<div class="text-list" data-text-cat="'+cat+'">'+rows+'</div>'+
      '<button type="button" class="btn small" data-text-add="'+cat+'">＋ セリフを追加</button>'+
    '</div>';
  }
  function monsterCard(m,i){var thumb=m.image?('<img src="'+esc(GuildUtils.driveImg(m.image))+'" alt="" style="width:36px;height:36px;object-fit:contain;vertical-align:middle;margin-right:8px" onerror="this.style.display=\'none\'">'):'';return '<section class="category-block" data-monster-index="'+i+'"><button type="button" class="category-head" data-monster-toggle="'+i+'"><span>'+thumb+(i+1)+'. '+esc(m.name)+' <b style="opacity:.7;font-weight:normal">'+esc(m.stage)+'</b></span><span class="category-toggle">開く</span></button><div class="category-body">'+
    '<label>敵名<input data-field="name" value="'+esc(m.name)+'"></label>'+
    '<label>ステージ<input data-field="stage" value="'+esc(m.stage)+'"></label>'+
    '<label>BGM（一覧から選択）<select data-field="bgm">'+bgmOptList(BGM_LIST.concat(BGM_LIST.includes(m.bgm)||!m.bgm?[]:[m.bgm]),m.bgm)+'</select></label>'+
    '<div class="toolbar"><button class="btn small" data-bgm-play="'+i+'">▶ このBGMを試聴</button><button class="btn small" data-bgm-stop="'+i+'">■ 停止</button></div>'+
    '<label>BGM URL / ファイル名（GitHubのbgmフォルダに直接アップした音源のファイル名を入力。例：bgm/horror_1.mp3）<input data-field="bgmUrl" value="'+esc(/^(https?:|bgm\/)/i.test(m.bgm)?m.bgm:'')+'" placeholder="bgm/曲名.mp3"></label>'+
    '<label>現在HP<input data-field="hp" type="number" value="'+(m.hp||0)+'"></label>'+
    '<label>最大HP<input data-field="maxHp" type="number" value="'+(m.maxHp||500)+'"></label>'+
    '<label>背景（一覧から選択）<select data-field="bg">'+optList(themeScopedBgList().concat(themeScopedBgList().includes(m.bg)||!m.bg||/^https?:/i.test(m.bg)?[]:[m.bg]),m.bg)+'</select></label>'+
    '<label>背景 URL（アップした画像を使う場合はここに貼る）<input data-img-upload data-field="bgUrl" value="'+esc(/^https?:/i.test(m.bg)?m.bg:'')+'" placeholder="https://drive.google.com/..."></label>'+
    '<label>敵画像（一覧から選択）<select data-field="image">'+optList(themeScopedImgList().concat(themeScopedImgList().includes(m.image)||!m.image||/^https?:/i.test(m.image)?[]:[m.image]),m.image)+'</select></label>'+
    '<label>敵画像 URL（アップした画像を使う場合はここに貼る）<input data-img-upload data-field="imageUrl" value="'+esc(/^https?:/i.test(m.image)?m.image:'')+'" placeholder="https://drive.google.com/..."></label>'+
    '<div class="enemy-preview" data-preview="'+i+'" style="position:relative;width:min(72vw,230px);height:min(40dvh,230px);margin:8px auto;border:2px solid rgba(255,246,223,.5);border-radius:12px;overflow:hidden;background:#000 center/cover no-repeat;background-image:url('+esc(GuildUtils.driveImg(m.bg))+')"><img data-preview-img src="'+esc(GuildUtils.driveImg(m.image))+'" style="position:absolute;left:50%;top:50%;max-width:100%;max-height:100%;object-fit:contain;transform:translate(calc(-50% + '+(Number(m.offsetX)||0)+'%),calc(-50% + '+(Number(m.offsetY)||0)+'%)) scale('+((Number(m.scale)||70)/100)+')" onerror="this.style.display=\'none\'"></div>'+
    '<p class="tiny" style="margin-top:-4px">※実際のお客様画面と同じ縦横比のプレビューです（画面サイズにより多少前後します）</p>'+
    '<label>大きさ <span data-scale-val>'+(Number(m.scale)||70)+'</span>%<input data-field="scale" type="range" min="30" max="250" value="'+(Number(m.scale)||70)+'"></label>'+
    '<label>左右 <span data-ox-val>'+(Number(m.offsetX)||0)+'</span>%<input data-field="offsetX" type="range" min="-60" max="60" value="'+(Number(m.offsetX)||0)+'"></label>'+
    '<label>上下 <span data-oy-val>'+(Number(m.offsetY)||0)+'</span>%<input data-field="offsetY" type="range" min="-60" max="60" value="'+(Number(m.offsetY)||0)+'"></label>'+
    '<div class="admin-card" style="margin:10px 0"><div class="admin-card-title">💥 撃破演出画像（この敵専用・任意）</div>'+
    '<p class="tiny">未入力なら、テーマ編集→撃破演出で設定した共通画像が使われます。エフェクトのスタイル（フラッシュ／リングなど）は共通設定のまま、画像だけこの敵専用に差し替えられます。</p>'+
    '<label>撃破画像 URL / ファイル名<input data-img-upload data-field="defeatImage" value="'+esc(m.defeatImage||'')+'" placeholder="例：defeat_slime.png / https://..."></label>'+
    (m.defeatImage?('<div style="text-align:center;margin-top:6px"><img src="'+esc(GuildUtils.driveImg(m.defeatImage))+'" style="max-width:120px;max-height:120px;border:2px solid rgba(246,200,79,.4);border-radius:10px;background:#000" onerror="this.style.display=\'none\'"></div>'):'')+
    '</div>'+
    '<div class="admin-card" style="margin:10px 0"><div class="admin-card-title">🗨️ 専用セリフ（未入力なら何も表示されません）</div>'+
    textCatBlock(m,i,'appear','登場時のセリフ','例：よくぞ来たな、冒険者よ')+
    textCatBlock(m,i,'damage','ダメージを受けた時のセリフ','例：ぐぬぬ…！')+
    textCatBlock(m,i,'defeat','倒された時のセリフ','例：まさか…このわしが…')+
    '<p class="tiny">複数追加した場合は、その中からランダムで1つ表示されます。</p></div>'+
    '<div class="toolbar"><button class="btn gold small" data-save-monster="'+i+'">この敵を保存</button><button class="btn small" data-current-monster="'+i+'">現在の敵にする</button><button class="btn small" data-dup-monster="'+i+'">複製</button><button class="btn red small" data-del-monster="'+i+'">削除</button></div></div></section>';}
  function monstersListHtml(){data.monsters=(data.monsters||[]).map(normalizeMonster);return data.monsters.length?data.monsters.map(function(m,i){return monsterCard(m,i);}).join(''):'<div class="empty">なし</div>';}
  function readMonsterCard(card){var m=data.monsters[+card.dataset.monsterIndex];m.name=card.querySelector('[data-field=name]').value;m.stage=card.querySelector('[data-field=stage]').value;var bgmUrl=(card.querySelector('[data-field=bgmUrl]')||{}).value||'';m.bgm=bgmUrl.trim()?bgmUrl.trim():card.querySelector('[data-field=bgm]').value;m.hp=+card.querySelector('[data-field=hp]').value||0;m.maxHp=+card.querySelector('[data-field=maxHp]').value||500;m.bg=(function(){var bgUrl=(card.querySelector('[data-field=bgUrl]')||{}).value||'';return bgUrl.trim()?bgUrl.trim():card.querySelector('[data-field=bg]').value;})();m.background=m.bg;var imgUrl=(card.querySelector('[data-field=imageUrl]')||{}).value||'';m.image=imgUrl.trim()?imgUrl.trim():card.querySelector('[data-field=image]').value;m.scale=+card.querySelector('[data-field=scale]').value||70;m.offsetX=+card.querySelector('[data-field=offsetX]').value||0;m.offsetY=+card.querySelector('[data-field=offsetY]').value||0;m.defeatImage=(card.querySelector('[data-field=defeatImage]')||{}).value||'';m.texts=m.texts&&typeof m.texts==='object'?m.texts:{};['appear','damage','defeat'].forEach(function(cat){var list=card.querySelector('[data-text-cat="'+cat+'"]');m.texts[cat]=list?Array.from(list.querySelectorAll('[data-text-input]')).map(function(inp){return inp.value.trim();}).filter(function(v){return !!v;}):[];});return m;}
  function saveMonsterForm(){document.querySelectorAll('[data-monster-index]').forEach(readMonsterCard);save();}
  let monsterContainerId='adminContent';
  function renderMonsters(containerId){monsterContainerId=containerId||monsterContainerId;$(monsterContainerId).innerHTML='<h2>⚔️ 討伐モンスター管理</h2><div class="admin-card"><div class="admin-card-title">現在のテーマ：'+esc(PRESET_LABELS[activePresetId()]||activePresetId())+'</div><p class="tiny">背景・敵画像の選択肢は、このテーマの素材だけに絞り込んで表示されます。テーマを変えたい場合は「テーマ編集」の上部から選び直してください。</p></div><div class="toolbar"><button class="btn gold" id="addMonster">追加</button><button class="btn green" id="saveMonsters">全体保存</button><button class="btn" id="monOpenAll">全部開く</button><button class="btn" id="monCloseAll">全部閉じる</button><button class="btn" id="jsonMonsters">JSON</button></div><div class="category-list" id="monsterListBox">'+monstersListHtml()+'</div>';bindMonsterEvents();
    $('addMonster').onclick=function(){saveMonsterForm();data.monsters.push(normalizeMonster({name:'新しい敵',maxHp:500},data.monsters.length));save();renderMonsters();};
    $('saveMonsters').onclick=function(){saveMonsterForm();toast('保存しました');if(GuildStorage.pushCloud)GuildStorage.pushCloud();};
    $('monOpenAll').onclick=function(){document.querySelectorAll('#monsterListBox .category-block').forEach(function(b){b.classList.add('open');var t=b.querySelector('.category-toggle');if(t)t.textContent='閉じる';});};
    $('monCloseAll').onclick=function(){document.querySelectorAll('#monsterListBox .category-block').forEach(function(b){b.classList.remove('open');var t=b.querySelector('.category-toggle');if(t)t.textContent='開く';});};
    $('jsonMonsters').onclick=function(){textareaEditor('monsters','monsters.json');};}
  function updatePreview(card){var img=card.querySelector('[data-preview-img]');var box=card.querySelector('[data-preview]');if(!img||!box)return;var sc=(+card.querySelector('[data-field=scale]').value||70)/100;var ox=+card.querySelector('[data-field=offsetX]').value||0;var oy=+card.querySelector('[data-field=offsetY]').value||0;var imgSrc=card.querySelector('[data-field=image]').value;var imgUrlField=(card.querySelector('[data-field=imageUrl]')||{}).value||'';var finalImg=imgUrlField.trim()?imgUrlField.trim():imgSrc;var bgSrc=card.querySelector('[data-field=bg]').value;var bgUrlField=(card.querySelector('[data-field=bgUrl]')||{}).value||'';var finalBg=bgUrlField.trim()?bgUrlField.trim():bgSrc;img.src=GuildUtils.driveImg(finalImg);img.style.display='';box.style.backgroundImage='url('+GuildUtils.driveImg(finalBg)+')';img.style.transform='translate(calc(-50% + '+ox+'%),calc(-50% + '+oy+'%)) scale('+sc+')';var sv=card.querySelector('[data-scale-val]');if(sv)sv.textContent=+card.querySelector('[data-field=scale]').value||70;var oxv=card.querySelector('[data-ox-val]');if(oxv)oxv.textContent=ox;var oyv=card.querySelector('[data-oy-val]');if(oyv)oyv.textContent=oy;}
  function bindMonsterEvents(){
    document.querySelectorAll('[data-bgm-play]').forEach(function(b){b.onclick=function(){
      var card=b.closest('[data-monster-index]');
      var urlField=(card.querySelector('[data-field=bgmUrl]')||{}).value||'';
      var key=card.querySelector('[data-field=bgm]').value;
      var target=urlField.trim()?urlField.trim():key;
      previewAudioTarget(target);
    };});
    document.querySelectorAll('[data-bgm-stop]').forEach(function(b){b.onclick=stopAudioPreview;});
    document.querySelectorAll('[data-monster-toggle]').forEach(function(h){h.onclick=function(){var b=h.closest('.category-block');b.classList.toggle('open');h.querySelector('.category-toggle').textContent=b.classList.contains('open')?'閉じる':'開く';};});
    document.querySelectorAll('[data-monster-index]').forEach(function(card){['scale','offsetX','offsetY'].forEach(function(f){var el=card.querySelector('[data-field='+f+']');if(el)el.addEventListener('input',function(){updatePreview(card);});});var imgSel=card.querySelector('[data-field=image]');if(imgSel)imgSel.addEventListener('change',function(){updatePreview(card);});var imgUrlEl=card.querySelector('[data-field=imageUrl]');if(imgUrlEl)imgUrlEl.addEventListener('input',function(){updatePreview(card);});var bgSel=card.querySelector('[data-field=bg]');if(bgSel)bgSel.addEventListener('change',function(){updatePreview(card);});var bgUrlEl=card.querySelector('[data-field=bgUrl]');if(bgUrlEl)bgUrlEl.addEventListener('input',function(){updatePreview(card);});});
    document.querySelectorAll('[data-save-monster]').forEach(function(b){b.onclick=function(){var card=b.closest('[data-monster-index]');readMonsterCard(card);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('保存しました');var orig=b.textContent;b.textContent='✓ 保存しました';b.classList.add('green');setTimeout(function(){b.textContent=orig;b.classList.remove('green');},1400);};});
    document.querySelectorAll('[data-current-monster]').forEach(function(b){b.onclick=function(){saveMonsterForm();data.currentEnemyIndex=+b.dataset.currentMonster;save();toast('現在の敵にしました');if(GuildStorage.pushCloud)GuildStorage.pushCloud();};});
    document.querySelectorAll('[data-dup-monster]').forEach(function(b){b.onclick=function(){saveMonsterForm();var src=data.monsters[+b.dataset.dupMonster];var copy=JSON.parse(JSON.stringify(src));copy.id=GuildUtils.uid('enemy');copy.name=src.name+'（複製）';data.monsters.splice(+b.dataset.dupMonster+1,0,copy);save();renderMonsters();};});
    document.querySelectorAll('[data-del-monster]').forEach(function(b){b.onclick=function(){if(confirm('削除しますか？')){saveMonsterForm();data.monsters.splice(+b.dataset.delMonster,1);save();renderMonsters();}};});
    var listBox=document.getElementById('monsterListBox');
    if(listBox){
      listBox.addEventListener('click',function(e){
        var addBtn=e.target.closest('[data-text-add]');
        if(addBtn){
          var cat=addBtn.getAttribute('data-text-add');
          var block=addBtn.previousElementSibling;
          if(block && block.getAttribute('data-text-cat')===cat){
            var row=document.createElement('div');
            row.className='text-row'; row.style.cssText='display:flex;gap:6px;margin:4px 0';
            row.innerHTML='<input data-text-input style="flex:1" placeholder="セリフを入力"><button type="button" class="btn small red" data-text-remove>×</button>';
            block.appendChild(row);
            var inp=row.querySelector('input'); if(inp) inp.focus();
          }
          return;
        }
        var rmBtn=e.target.closest('[data-text-remove]');
        if(rmBtn){ var row2=rmBtn.closest('.text-row'); if(row2) row2.remove(); return; }
      });
    }
    wireImageUploadButtons_();
  }

  // ===== 設定ボタン編集 =====
  function levelThresholdRowsHtml(s){
    const th=(Array.isArray(s.levelThresholds)&&s.levelThresholds.length)?s.levelThresholds.map(Number):[Number(s.levelStep)||3000];
    return th.map((v,i)=>'<div class="row" style="align-items:center;gap:6px;margin:4px 0">'+
      '<span style="min-width:78px">Lv'+(i+1)+'→Lv'+(i+2)+'</span>'+
      '<input type="number" data-lv-th="'+i+'" value="'+(v||0)+'" style="flex:1">'+
      '<button class="btn small gold" data-lv-save="'+i+'">保存</button>'+
      (th.length>1?'<button class="btn small" data-lv-del="'+i+'">×</button>':'')+
    '</div>').join('');
  }
  function renderSettings(){var s=data.settings;s.notice=Object.assign({enabled:true,title:'本日のお知らせ',body:'',position:'top'},s.notice||{});
    var mg=Object.assign({enabled:true,games:{action:true,slot:false,shooting:false}},s.minigame||{}); mg.games=Object.assign({action:true,slot:false,shooting:false},mg.games||{});
    $('adminContent').innerHTML='<h2>⚙️ 設定</h2>'+
    '<div class="admin-card"><div class="admin-card-title">🎮 ゲームモード</div>'+
    '<label class="check-row"><input id="setGameMode" type="checkbox" '+(s.gameMode!==false?'checked':'')+'>ゲームモードON（討伐バトル演出つきのモバイルオーダー）</label>'+
    '<p class="tiny">オン＝今まで通り、注文するたびに敵にダメージが入るRPG演出つきのモバイルオーダー。オフ＝演出なしの、ただのメニュー＋カート＋会計（お客様の名前登録・レベル・討伐画面は出ません）。カバーチャージや会計・注文履歴の保存はオフでも引き続き動きます。</p>'+
    '<label class="check-row"><input id="setAllowGameToggle" type="checkbox" '+(s.allowCustomerGameToggle!==false?'checked':'')+'>お客様がタイトル画面でゲーム/通常メニューを選べるようにする</label>'+
    '<p class="tiny">オン＝タイトル画面に切替ボタンが出て、お客様一人一人が「ゲームで注文」か「通常メニューで注文」かをその場で選べます（上のON/OFFは、その時の初期選択状態になります）。オフ＝切替ボタンを出さず、上のON/OFFが全員に固定で適用されます。</p>'+
    '<label class="check-row"><input id="setGameNoticeEnabled" type="checkbox" '+((s.gameModeNotice&&s.gameModeNotice.enabled!==false)?'checked':'')+'>ゲームで注文を選んだ時、最初にメニューを開いた時だけ注意喚起を表示する</label>'+
    '<label>注意喚起の文言<textarea id="setGameNoticeText" placeholder="例：演出をお楽しみいただくのは大歓迎ですが、実際に召し上がる予定のないご注文はお控えください。">'+esc((s.gameModeNotice&&s.gameModeNotice.text)||'')+'</textarea></label>'+
    '<p class="tiny">「ゲームで注文」を選んだお客様が最初にメニューを開いた時だけ、1回表示されます（同じ来店中に再度メニューへ戻っても再表示されません）。演出目的で実際には飲食しないご注文を防ぐための注意喚起として使えます。</p>'+
    '<div class="toolbar"><button class="btn gold" id="saveGameMode">この項目だけ保存</button></div>'+
    '</div>'+
    '<div class="admin-card"><div class="admin-card-title">🎮 待ち時間ミニゲーム</div>'+
    '<p class="tiny">注文が確定してダメージ演出が終わった後、「待ち時間にミニゲームしませんか？」と案内します。残機はご来店からの注文数と連動します。</p>'+
    '<label class="check-row"><input id="setMinigameEnabled" type="checkbox" '+(mg.enabled!==false?'checked':'')+'>待ち時間ミニゲームの案内を表示する</label>'+
    '<label class="check-row"><input id="setMinigameAction" type="checkbox" '+(mg.games.action?'checked':'')+'>アクション（ランナー）を使う</label>'+
    '<label class="check-row"><input id="setMinigameSlot" type="checkbox" '+(mg.games.slot?'checked':'')+'>スロットを使う（ファイル未追加の場合はOFFのままにしてください）</label>'+
    '<label class="check-row"><input id="setMinigameShooting" type="checkbox" '+(mg.games.shooting?'checked':'')+'>弾幕シューティングを使う（ファイル未追加の場合はOFFのままにしてください）</label>'+
    '<div class="toolbar"><button class="btn gold" id="saveMinigame">この項目だけ保存</button></div>'+
    '</div>'+
    '<div class="admin-card"><div class="admin-card-title">🏪 基本設定</div>'+
    '<label>通貨単位<input id="setCurrency" value="'+esc(s.currency||'G')+'"></label>'+
    '<label>チャージ（1人）<input id="setCover" type="number" value="'+(s.coverCharge??500)+'"></label>'+
    '<label>管理パスワード（半角英数字のみ）<input id="setPass" value="'+esc(s.adminPassword||'OTAKU')+'" pattern="[A-Za-z0-9]*" inputmode="latin" autocapitalize="off" autocorrect="off" spellcheck="false"></label>'+
    '<label class="check-row"><input id="setCartMode" type="checkbox" '+(s.cartMode?'checked':'')+'>カートモード（複数商品をまとめて注文できるようにする）</label>'+
    '<p class="tiny">オフ＝今まで通り、商品ごとに即注文（バー向け）。オン＝カートに追加してからまとめて注文（複数人・フード店など向け）。</p>'+
    '<label class="check-row"><input id="setQuestMode" type="checkbox" '+(s.questMode?'checked':'')+'>依頼タブ（メニューとは別枠で「📜 依頼」を表示する）</label>'+
    '<p class="tiny">オン＝「📜 依頼として別枠に表示する」をつけた商品だけが、通常メニューから消えて専用の「依頼」タブにまとまります。それ以外の商品は今まで通りです。</p>'+
    '<div class="toolbar"><button class="btn gold" id="saveBasic">この項目だけ保存</button></div>'+
    '<button class="btn" id="resetSetupWizard">初回セットアップを確認する</button>'+
    '</div><div class="admin-card"><div class="admin-card-title">🔔 通知・連携</div>'+
    '<label class="check-row"><input id="setNotify" type="checkbox" '+(s.notifyOn!==false?'checked':'')+'>通知ON</label>'+
    '<label>GAS URL<input id="setGas" value="'+esc(s.gasUrl||'')+'" placeholder="https://script.google.com/.../exec"></label>'+
    '<label>Discord通知URL（この店の通知先）<input id="setHook" value="'+esc(s.discordWebhookUrl||'')+'" placeholder="https://discord.com/api/webhooks/..."></label>'+
    '<div class="tiny">Discordのチャンネル設定→連携サービス→ウェブフックで作ったURLを貼ると、注文/会計の通知がその店のDiscordに届きます。空欄ならGAS側の設定が使われます。</div>'+
    '<div class="toolbar"><button class="btn gold" id="saveNotify">この項目だけ保存</button></div>'+
    '</div><div class="admin-card"><div class="admin-card-title">🆙 レベル計算方式</div>'+
    '<p class="tiny">冒険者(お客様)のレベルをどう計算するか選べます。</p>'+
    '<select id="setLevelMode"><option value="visits" '+((s.levelMode||'visits')==='visits'?'selected':'')+'>来店回数（来店1回でLv+1）</option><option value="total" '+(s.levelMode==='total'?'selected':'')+'>合計金額（レベルごとに金額を設定）</option></select>'+
    '<div id="levelThresholdBox" style="'+(s.levelMode==='total'?'':'display:none')+'">'+
      '<p class="tiny">各レベルに必要な「累計金額」を自由に設定できます。行ごとに保存でき、その場でクラウド(GAS)にも送信されます。</p>'+
      '<div id="levelThresholdList">'+levelThresholdRowsHtml(s)+'</div>'+
      '<div class="toolbar"><button class="btn" id="addLevelThreshold">＋ レベルを追加</button></div>'+
    '</div>'+
    '</div><div class="admin-card notice-admin"><div class="admin-card-title">📢 本日のお知らせ</div>'+
    '<label class="check-row"><input id="noticeEnabled" type="checkbox" '+(s.notice.enabled!==false?'checked':'')+'>一般画面に表示する</label>'+
    '<label>見出し<input id="noticeTitle" value="'+esc(s.notice.title||'本日のお知らせ')+'"></label>'+
    '<label>本文<textarea id="noticeBody" placeholder="例：本日は20時からイベントクエスト開催！">'+esc(s.notice.body||'')+'</textarea></label>'+ 
    '<label>表示位置<select id="noticePosition"><option value="top" '+(s.notice.position!=='bottom'?'selected':'')+'>上に表示</option><option value="bottom" '+(s.notice.position==='bottom'?'selected':'')+'>下に表示</option></select></label>'+ 
    '<div class="toolbar"><button class="btn gold" id="saveNotice">この項目だけ保存</button></div>'+
    '</div><div class="toolbar"><button class="btn" id="jsonSettings">詳細JSON</button></div>';
    function pushToast(msg){ save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); toast(msg+'（クラウドにも送信）'); }
    $('saveGameMode').onclick=function(){ s.gameMode=$('setGameMode').checked; s.allowCustomerGameToggle=$('setAllowGameToggle').checked; s.gameModeNotice={enabled:$('setGameNoticeEnabled').checked, text:$('setGameNoticeText').value.trim()}; pushToast('ゲームモードを保存しました'); };
    $('saveMinigame').onclick=function(){
      s.minigame={enabled:$('setMinigameEnabled').checked, games:{action:$('setMinigameAction').checked, slot:$('setMinigameSlot').checked, shooting:$('setMinigameShooting').checked}};
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      pushToast('待ち時間ミニゲームの設定を保存しました');
    };
    if($('setPass')) $('setPass').addEventListener('input',function(){ const c=this.value.replace(/[^A-Za-z0-9]/g,''); if(c!==this.value) this.value=c; });
    $('saveBasic').onclick=function(){ s.currency=$('setCurrency').value||'G'; s.coverCharge=+$('setCover').value||0; s.adminPassword=($('setPass').value||'OTAKU').replace(/[^A-Za-z0-9]/g,'')||'OTAKU'; s.cartMode=$('setCartMode').checked; s.questMode=$('setQuestMode').checked; pushToast('基本設定を保存しました'); };
    $('saveNotify').onclick=function(){ s.notifyOn=$('setNotify').checked; s.gasUrl=$('setGas').value.trim(); s.discordWebhookUrl=$('setHook').value.trim(); pushToast('通知・連携設定を保存しました'); };
    $('saveNotice').onclick=function(){ s.notice={enabled:$('noticeEnabled').checked,title:$('noticeTitle').value||'本日のお知らせ',body:$('noticeBody').value||'',position:$('noticePosition').value||'top'}; pushToast('お知らせを保存しました'); };
    $('setLevelMode').onchange=function(){s.levelMode=$('setLevelMode').value; $('levelThresholdBox').style.display=s.levelMode==='total'?'':'none'; pushToast('レベル計算方式を保存しました');};
    function ensureThresholds(){ if(!Array.isArray(s.levelThresholds)||!s.levelThresholds.length) s.levelThresholds=[Number(s.levelStep)||3000]; return s.levelThresholds; }
    function bindLevelThresholdRows(){
      document.querySelectorAll('[data-lv-save]').forEach(btn=>btn.onclick=function(){
        const i=+btn.dataset.lvSave; const th=ensureThresholds(); const inp=document.querySelector('[data-lv-th="'+i+'"]');
        th[i]=Math.max(0,+inp.value||0); s.levelThresholds=th; s.levelStep=th[0]||s.levelStep;
        save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
        toast('Lv'+(i+2)+'の必要金額を保存しました（クラウドにも送信）');
      });
      document.querySelectorAll('[data-lv-del]').forEach(btn=>btn.onclick=function(){
        const i=+btn.dataset.lvDel; const th=ensureThresholds(); if(th.length<=1)return;
        th.splice(i,1); s.levelThresholds=th; save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
        $('levelThresholdList').innerHTML=levelThresholdRowsHtml(s); bindLevelThresholdRows(); toast('削除しました');
      });
    }
    bindLevelThresholdRows();
    $('addLevelThreshold').onclick=function(){
      const th=ensureThresholds(); const last=th[th.length-1]||3000; th.push(last+(Number(s.levelStep)||3000));
      s.levelThresholds=th; save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      $('levelThresholdList').innerHTML=levelThresholdRowsHtml(s); bindLevelThresholdRows(); toast('レベルを追加しました');
    };
    $('jsonSettings').onclick=function(){textareaEditor('settings','settings.json');};if($('resetSetupWizard'))$('resetSetupWizard').onclick=function(){const base=location.href.replace(/admin\.html.*$/,'index.html').replace(/\?.*$/,'');const url=base+'?setup=1';if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).catch(function(){});}alert('このURLを開くと、購入者が最初に見る初回セットアップ画面を確認できます（GAS連携済みでも必ず表示されます）。\n\n'+url+'\n\nリンクをコピーしました。');};}

  function conceptTemplateFromPreset(p){
    p=p||{};
    var id=p.id||'';
    var t=p.theme||{};
    var assets=t.assets||p.assets||{};
    var messages=t.messages||{};
    var brand=t.brand||{};
    var enemies=Array.isArray(p.enemies)?p.enemies:[];
    var first=enemies[0]||{};
    var last=enemies.length?enemies[enemies.length-1]:{};
    var folder=id?('presets/'+id+'/'):'';

    function val(){
      for(var i=0;i<arguments.length;i++){
        var v=arguments[i];
        if(v!==undefined && v!==null && String(v).trim()!=='') return v;
      }
      return '';
    }
    function asset(name, fallback){
      var v=val(assets[name], fallback);
      if(!v) return '';
      if(/^https?:/i.test(v) || String(v).indexOf('/')>=0 || !folder) return v;
      return folder+v;
    }
    return {
      startTitle: val(messages.titleWelcome, brand.shopName ? brand.shopName+'へ<br>ようこそ' : ''),
      startSubtitle: val(messages.openMenu, 'メニューを開きますか？'),
      startBg: asset('startBg', asset('welcomeBg', first.bg||'')),
      startBgm: val(assets.startBgm, assets.titleBgm, 'title'),

      victoryBg: asset('victoryBg', asset('clearBg', last.bg||'')),
      victoryImage: asset('victoryImage', asset('clearImage', '')),
      victoryTitle: val(messages.victoryTitle, messages.clearTitle, ''),
      victorySubtitle: val(messages.victorySubtitle, messages.peace, ''),
      victoryTextPosition: val(messages.victoryTextPosition, 'middle'),
      victoryBgm: val(assets.victoryBgm, assets.clearBgm, 'ending'),

      masterName: val(brand.masterName, 'ギルドマスター'),
      masterImage: asset('masterImage', brand.masterImage||'master_no.jpeg'),
      masterMessage: val(messages.masterDefault, '冷やかしか？さっさとメニューを開け')
    };
  }

  function applyConceptTemplateToSettings(p){
    data.settings.themeCustom=Object.assign({}, data.settings.themeCustom||{}, conceptTemplateFromPreset(p));
    if(p&&p.theme&&p.theme.brand){
      var b=p.theme.brand;
      if(b.shopName){
        data.settings.shopName=b.shopName;
        data.settings.storeName=b.shopName;
      }
    }
  }

  function ensureThemeCustom(){
    const s=data.settings;
    s.themeCustom=Object.assign({
      startTitle:'', startSubtitle:'', startBg:'', startBgm:'title',
      victoryBg:'', victoryImage:'victory_clear.PNG', victoryTitle:'', victorySubtitle:'', victoryTextPosition:'middle', victoryBgm:'ending',
      masterName:'ギルドマスター', masterImage:'master_no.jpeg', masterMessage:'冷やかしか？さっさとメニューを開け'
    },s.themeCustom||{});
    return s.themeCustom;
  }

  // ===== テーマ編集（Phase4-3）：店舗情報/テキスト/画像/BGM/キャラクター/ステージ/プレビューを1画面にまとめる =====
  function renderThemeEditor(){
    $('adminContent').innerHTML='<h2>🎭 テーマ編集</h2>'+
      '<div class="admin-card"><p class="tiny">店舗情報・文言・画像・BGM・キャラクターをここでまとめて編集できます。JSON編集やGitHub編集は不要です。</p></div>'+
      '<div class="admin-card"><div class="admin-card-title">📸 マイテーマ（自分だけの保存テーマ）</div>'+
      '<p class="tiny">今のテーマ(色・呼び名・フォント・画像・BGM・キャラクター構成)に名前を付けて保存できます。イベントで大きく変えても、保存したテーマにボタン一つで戻せます。</p>'+
      '<div id="myThemeList"></div>'+
      '<label>新しく保存する名前<input id="myThemeName" placeholder="例：いつもの／夏祭りイベント"></label>'+
      '<div class="toolbar"><button class="btn gold" id="saveMyTheme">今のテーマを保存</button><button class="btn" id="exportMyTheme">JSONで書き出し（バックアップ用）</button></div>'+
      '</div>'+
      '<h3>コンセプト一括切替（サンプルテーマから作り直す）</h3>'+
      '<div id="presetList" class="grid"><div class="tiny">読み込み中...</div></div>'+
      '<div class="admin-card"><div class="admin-card-title">元に戻す</div><p class="tiny">選んだコンセプトを解除して、既定(theme.json)に戻します。</p><button class="btn" id="clearPreset">コンセプトを解除</button></div>'+
      '<nav class="theme-subnav" id="themeSubNav"></nav>'+
      '<div id="themeSubContent"></div>';
    renderMyThemeList();
    renderPresetPicker();
    renderThemeSubNav();
    renderThemeSub();
    $('saveMyTheme').onclick=function(){
      const name=$('myThemeName').value.trim();
      if(!name){ toast('名前を入力してください'); return; }
      data.settings.themeSnapshots=data.settings.themeSnapshots||{};
      data.settings.themeSnapshots[name]=captureThemeSnapshot();
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('「'+name+'」として保存しました');
      $('myThemeName').value='';
      renderMyThemeList();
    };
    $('exportMyTheme').onclick=function(){
      const snap=captureThemeSnapshot();
      const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download='theme_backup_'+Date.now()+'.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('ダウンロードしました');
    };
  }
  function captureThemeSnapshot(){
    const s=data.settings;
    return {
      currentPresetId:s.currentPresetId||'',
      themeColors:s.themeColors?JSON.parse(JSON.stringify(s.themeColors)):{},
      themeWords:s.themeWords?JSON.parse(JSON.stringify(s.themeWords)):{},
      themeFonts:s.themeFonts?JSON.parse(JSON.stringify(s.themeFonts)):{},
      themeCustom:s.themeCustom?JSON.parse(JSON.stringify(s.themeCustom)):{},
      uiTheme:s.uiTheme?JSON.parse(JSON.stringify(s.uiTheme)):{},
      defeatEffect:s.defeatEffect?JSON.parse(JSON.stringify(s.defeatEffect)):{},
      audioFiles:s.audioFiles?JSON.parse(JSON.stringify(s.audioFiles)):{},
      monsters:JSON.parse(JSON.stringify(data.monsters||[])),
      savedAt:new Date().toISOString()
    };
  }
  async function applyThemeSnapshot(snap){
    if(!snap) return;
    const s=data.settings;
    // まず土台をリセットする：スナップショットが特定のプリセットを指していればそのプリセットの素の値へ、
    // 指していなければ既定(theme.json)へ。これをやらないと、直前まで使っていた別コンセプトの
    // 店名・呼び名・色などが一部残ったまま重なってしまい、「切り替えても反映されない」ことになる。
    if(window.GuildTheme){
      let resetDone=false;
      if(snap.currentPresetId && GuildTheme.loadPresets){
        try{
          const presets=await GuildTheme.loadPresets();
          const preset=(presets||[]).find(x=>x.id===snap.currentPresetId);
          if(preset){ GuildTheme.applyPresetTheme(preset); resetDone=true; }
        }catch(e){}
      }
      if(!resetDone) GuildTheme.clearOverride();
    }
    s.currentPresetId=snap.currentPresetId||'';
    if(snap.themeColors && Object.keys(snap.themeColors).length){ s.themeColors=snap.themeColors; if(window.GuildTheme) GuildTheme.saveColorsOverride(snap.themeColors); } else { delete s.themeColors; }
    if(snap.themeWords && Object.keys(snap.themeWords).length){ s.themeWords=snap.themeWords; if(window.GuildTheme) GuildTheme.saveWordsOverride(snap.themeWords); } else { delete s.themeWords; }
    if(snap.themeFonts && Object.keys(snap.themeFonts).length){ s.themeFonts=snap.themeFonts; if(window.GuildTheme) GuildTheme.saveFontsOverride(snap.themeFonts); } else { delete s.themeFonts; }
    if(snap.themeCustom) s.themeCustom=snap.themeCustom;
    if(snap.uiTheme){ s.uiTheme=snap.uiTheme; if(window.GuildTheme) GuildTheme.saveUiThemeOverride(snap.uiTheme); }
    if(snap.defeatEffect) s.defeatEffect=snap.defeatEffect;
    if(snap.audioFiles) s.audioFiles=snap.audioFiles;
    if(Array.isArray(snap.monsters)) data.monsters=snap.monsters.map(normalizeMonster);
    save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
    toast('テーマを切り替えました（全端末に反映されます）');
    renderThemeEditor();
  }
  function renderMyThemeList(){
    const box=$('myThemeList'); if(!box) return;
    const snaps=data.settings.themeSnapshots||{};
    const names=Object.keys(snaps);
    box.innerHTML = names.length ? names.map(name=>
      '<div class="row" style="align-items:center;gap:6px;margin:4px 0">'+
      '<span style="flex:2">🏷️ '+esc(name)+'</span>'+
      '<button class="btn small gold" data-theme-apply="'+esc(name)+'">適用</button>'+
      '<button class="btn small red" data-theme-del="'+esc(name)+'">削除</button>'+
      '</div>'
    ).join('') : '<p class="tiny">まだ保存されたテーマはありません</p>';
    document.querySelectorAll('[data-theme-apply]').forEach(b=>b.onclick=async()=>{
      if(!confirm('「'+b.dataset.themeApply+'」を適用しますか？今の状態は上書きされます（先に保存推奨）'))return;
      await applyThemeSnapshot(snaps[b.dataset.themeApply]);
    });
    document.querySelectorAll('[data-theme-del]').forEach(b=>b.onclick=()=>{
      if(!confirm('「'+b.dataset.themeDel+'」を削除しますか？'))return;
      delete data.settings.themeSnapshots[b.dataset.themeDel];
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      renderMyThemeList();
    });
  }
  function renderThemeSubNav(){
    $('themeSubNav').innerHTML=THEME_SUBTABS.map(t=>`<button class="tab subtab ${themeSubTab===t[0]?'active':''}" data-subtab="${t[0]}">${t[1]}</button>`).join('');
    document.querySelectorAll('[data-subtab]').forEach(b=>b.onclick=()=>{themeSubTab=b.dataset.subtab;renderThemeSubNav();renderThemeSub();});
  }
  function renderThemeColors(){
    const col=(window.GuildTheme?GuildTheme.all().color:{})||{};
    const COLOR_FIELDS=[['gold','メインカラー（見出し・ボタンなど）'],['green','サブカラー（決定ボタンなど）'],['white','文字色（明るい背景用）'],['red','警告・危険表示色'],['bgDark','背景の暗さ']];
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">🎨 テーマカラー</div>'+
      '<p class="tiny">プリセットの色そのものを自由に変更できます。ここを変えるだけで、既存のRPG/SF/魔法学校とは違う「自分だけの配色」が作れます。</p>'+
      COLOR_FIELDS.map(([k,label])=>'<label>'+esc(label)+'<input type="color" data-color-key="'+k+'" value="'+esc(col[k]||'#f6c84f')+'" style="height:44px;padding:2px"></label>').join('')+
      '<div class="toolbar"><button class="btn gold" id="saveThemeColors">カラーを保存</button><button class="btn" id="resetThemeColors">プリセットの色に戻す</button></div>'+
      '</div>';
    $('saveThemeColors').onclick=function(){
      const partial={};
      document.querySelectorAll('[data-color-key]').forEach(inp=>{ partial[inp.dataset.colorKey]=inp.value; });
      if(window.GuildTheme) GuildTheme.saveColorsOverride(partial);
      data.settings.themeColors=Object.assign({},data.settings.themeColors||{},partial);
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('カラーを保存しました（全端末に反映されます）');
    };
    $('resetThemeColors').onclick=function(){
      if(!confirm('今のコンセプト本来の色に戻しますか？'))return;
      delete data.settings.themeColors;
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      GuildTheme.resetColorsOnly();
      toast('色を元に戻しました');
      renderThemeColors();
    };
  }
  const UI_BORDER_COLOR_OPTS=[['gold','金'],['silver','銀'],['blue','青'],['red','赤'],['green','緑'],['custom','カスタムカラー']];
  const UI_PANEL_BG_OPTS=[['black','黒'],['blackTrans','半透明黒'],['blueTrans','半透明青'],['parchment','羊皮紙'],['wood','木目'],['glass','ガラス風'],['custom','カスタム画像']];
  const UI_BTN_STYLE_OPTS=[['rpg','RPG'],['sf','SF'],['magic','魔法学校'],['wa','和風']];
  function renderThemeUi(){
    const ui=Object.assign({borderColor:'gold',borderColorCustom:'',panelBg:'black',panelBgCustom:'',btnStyle:'rpg',btnRadius:9,borderWidth:3,borderRadius:12,btnShadow:true,blur:true}, data.settings.uiTheme||{});
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">🖼️ UIテーマエディター</div>'+
      '<p class="tiny">枠・パネル背景・ボタンの見た目をまとめて変えられます。色そのものを変える「🎨 カラー」タブとは別に、質感・形の部分を調整します。</p>'+

      '<label>枠線の色<select id="uiBorderColor">'+UI_BORDER_COLOR_OPTS.map(([k,l])=>'<option value="'+k+'" '+(ui.borderColor===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
      '<label id="uiBorderColorCustomWrap" style="'+(ui.borderColor==='custom'?'':'display:none')+'">カスタム枠色<input type="color" id="uiBorderColorCustom" value="'+esc(ui.borderColorCustom||'#f6c84f')+'" style="height:44px;padding:2px"></label>'+

      '<label>枠内背景<select id="uiPanelBg">'+UI_PANEL_BG_OPTS.map(([k,l])=>'<option value="'+k+'" '+(ui.panelBg===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
      '<label id="uiPanelBgCustomWrap" style="'+(ui.panelBg==='custom'?'':'display:none')+'">カスタム背景画像URL<input id="uiPanelBgCustom" value="'+esc(ui.panelBgCustom||'')+'" placeholder="https://... または画像ファイル名"></label>'+

      '<label>ボタンスタイル<select id="uiBtnStyle">'+UI_BTN_STYLE_OPTS.map(([k,l])=>'<option value="'+k+'" '+(ui.btnStyle===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+

      '<label>ボタン角丸（<span id="uiBtnRadiusVal">'+esc(String(ui.btnRadius))+'</span>px）<input type="range" id="uiBtnRadius" min="0" max="30" value="'+esc(String(ui.btnRadius))+'"></label>'+
      '<label class="check-row"><input type="checkbox" id="uiBtnShadow" '+(ui.btnShadow?'checked':'')+'> ボタンに影を付ける</label>'+

      '<label>枠の太さ（<span id="uiBorderWidthVal">'+esc(String(ui.borderWidth))+'</span>px）<input type="range" id="uiBorderWidth" min="1" max="6" value="'+esc(String(ui.borderWidth))+'"></label>'+
      '<label>枠の角丸（<span id="uiBorderRadiusVal">'+esc(String(ui.borderRadius))+'</span>px）<input type="range" id="uiBorderRadius" min="0" max="30" value="'+esc(String(ui.borderRadius))+'"></label>'+
      '<label class="check-row"><input type="checkbox" id="uiBlur" '+(ui.blur?'checked':'')+'> 背景ぼかし（半透明＋blur、高級感が出ます）</label>'+

      '<div class="toolbar"><button class="btn gold" id="saveUiTheme">UIテーマを保存</button><button class="btn" id="resetUiTheme">既定に戻す</button></div>'+
      '</div>';

    $('uiBorderColor').onchange=function(){ $('uiBorderColorCustomWrap').style.display=this.value==='custom'?'':'none'; };
    $('uiPanelBg').onchange=function(){ $('uiPanelBgCustomWrap').style.display=this.value==='custom'?'':'none'; };
    $('uiBtnRadius').oninput=function(){ $('uiBtnRadiusVal').textContent=this.value; };
    $('uiBorderWidth').oninput=function(){ $('uiBorderWidthVal').textContent=this.value; };
    $('uiBorderRadius').oninput=function(){ $('uiBorderRadiusVal').textContent=this.value; };

    $('saveUiTheme').onclick=function(){
      const partial={
        borderColor:$('uiBorderColor').value,
        borderColorCustom:$('uiBorderColorCustom')?$('uiBorderColorCustom').value:'',
        panelBg:$('uiPanelBg').value,
        panelBgCustom:$('uiPanelBgCustom')?$('uiPanelBgCustom').value.trim():'',
        btnStyle:$('uiBtnStyle').value,
        btnRadius:Number($('uiBtnRadius').value)||0,
        btnShadow:$('uiBtnShadow').checked,
        borderWidth:Number($('uiBorderWidth').value)||3,
        borderRadius:Number($('uiBorderRadius').value)||0,
        blur:$('uiBlur').checked
      };
      if(window.GuildTheme) GuildTheme.saveUiThemeOverride(partial);
      data.settings.uiTheme=Object.assign({}, data.settings.uiTheme||{}, partial);
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('UIテーマを保存しました（全端末に反映されます）');
      renderThemeUi();
    };
    $('resetUiTheme').onclick=function(){
      if(!confirm('UIテーマを既定（RPG標準の見た目）に戻しますか？'))return;
      delete data.settings.uiTheme;
      if(window.GuildTheme) GuildTheme.clearUiOverride();
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('UIテーマを既定に戻しました');
      renderThemeUi();
    };
  }
  const DEFEAT_STYLE_OPTS=[['pop','通常（ポップ）'],['flash','フラッシュ（画面明滅）'],['ring','リング（衝撃波）']];
  function renderThemeEffect(){
    const fx=Object.assign({style:'pop',image:'',imageEnabled:false}, data.settings.defeatEffect||{});
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">💥 撃破演出</div>'+
      '<p class="tiny">敵を倒した瞬間の演出です。演出スタイル（フラッシュ・リングなど）はすべての敵で共通です。画像は下で共通の1枚を設定できますが、敵ごとに個別の画像を設定したい場合は「⚔️ キャラクター」タブの各モンスター編集内「撃破演出画像」で上書きできます（そちらを設定した敵は、その敵専用の画像が優先されます）。</p>'+

      '<label>演出スタイル<select id="fxStyle">'+DEFEAT_STYLE_OPTS.map(([k,l])=>'<option value="'+k+'" '+(fx.style===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+

      '<label class="check-row"><input type="checkbox" id="fxImageEnabled" '+(fx.imageEnabled?'checked':'')+'> 撃破時に画像を表示する</label>'+
      '<label>撃破画像URL / ファイル名（共通・敵ごとの設定がなければこちらが使われます）<input data-img-upload id="fxImage" value="'+esc(fx.image||'')+'" placeholder="例：defeat_stamp.png / https://..."></label>'+
      '<p class="tiny">「倒した敵の画像」でも「撃破スタンプ風の1枚絵」でも構いません。画像ファイルはGitHubに置いて、ファイル名かURLをここに入力してください。</p>'+
      (fx.image?'<div class="fx-preview" style="text-align:center;margin:8px 0"><img src="'+esc(GuildUtils.driveImg(fx.image))+'" style="max-width:140px;max-height:140px;border:2px solid rgba(246,200,79,.45);border-radius:10px;background:#000" onerror="this.style.display=\'none\'"></div>':'')+

      '<div class="toolbar"><button class="btn gold" id="saveFxTheme">撃破演出を保存</button><button class="btn" id="resetFxTheme">既定に戻す</button></div>'+
      '</div>';

    $('saveFxTheme').onclick=function(){
      const partial={
        style:$('fxStyle').value,
        imageEnabled:$('fxImageEnabled').checked,
        image:$('fxImage').value.trim()
      };
      data.settings.defeatEffect=Object.assign({}, data.settings.defeatEffect||{}, partial);
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('撃破演出を保存しました（全端末に反映されます）');
      renderThemeEffect();
    };
    $('resetFxTheme').onclick=function(){
      if(!confirm('撃破演出を既定（通常のポップのみ）に戻しますか？'))return;
      data.settings.defeatEffect={style:'pop',image:'',imageEnabled:false};
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('撃破演出を既定に戻しました');
      renderThemeEffect();
    };
    wireImageUploadButtons_();
  }
  const GACHA_DEFAULT_RARITIES=[
    {id:'n',name:'ノーマル',weight:60,color:'#b7b7b7',images:[],flashy:false},
    {id:'r',name:'レア',weight:30,color:'#6cc7ff',images:[],flashy:false},
    {id:'sr',name:'スーパーレア',weight:8,color:'#caa6ff',images:[],flashy:true},
    {id:'ssr',name:'超激レア',weight:2,color:'#f6c84f',images:[],flashy:true}
  ];
  // 古い形式（image:単一文字列）で保存されていたものも、images配列として扱えるようにする
  function gachaRarityImages_(r){
    if(Array.isArray(r.images)) return r.images.filter(Boolean);
    if(r.image) return [r.image];
    return [];
  }
  function gachaCfg(){ const g=Object.assign({enabled:false,rarities:null},data.settings.gachaEffect||{}); if(!Array.isArray(g.rarities)||!g.rarities.length) g.rarities=JSON.parse(JSON.stringify(GACHA_DEFAULT_RARITIES)); g.rarities=g.rarities.map(r=>Object.assign({},r,{images:gachaRarityImages_(r)})); return g; }
  function renderThemeGacha(){
    const g=gachaCfg();
    let html='<div class="admin-card"><div class="admin-card-title">🎰 会計ガチャ</div>'+
      '<p class="tiny">会計（お客様が退店・支払い完了）のタイミングで、抽選演出を挟んでからレシートを表示します。レアリティごとに確率（%）・色・画像を自由に設定できます。合計が100%になるように調整してください（100%からズレていても動作はしますが、実際の出現率が意図とズレます）。1つのレアリティに複数の画像を登録すると、当たった時にその中から完全ランダムで1枚が使われます（同じレアリティでも毎回違う絵が出せます）。</p>'+
      '<label class="check-row"><input type="checkbox" id="gachaEnabled" '+(g.enabled?'checked':'')+'> 会計ガチャを有効にする</label>'+
      '<div id="gachaTotalLabel" class="tiny mt" style="font-weight:800"></div>'+
      '<div id="gachaRarityList" class="mt"></div>'+
      '<div class="toolbar"><button class="btn" id="addGachaRarity">＋ レアリティを追加</button></div>'+
      '<div class="toolbar"><button class="btn gold" id="saveGacha">会計ガチャを保存</button><button class="btn" id="resetGacha">既定に戻す</button></div>'+
      '</div>';
    $('themeSubContent').innerHTML=html;
    function updateTotalLabel(){
      const rows=Array.from(document.querySelectorAll('[data-rarity-row]'));
      const total=rows.reduce((s,row)=>s+(Number(row.querySelector('[data-r-weight]').value)||0),0);
      const el=$('gachaTotalLabel'); if(!el) return;
      const ok=Math.abs(total-100)<0.05;
      el.textContent='合計：'+total+'%'+(ok?'（OK）':'（100%になるよう調整してください）');
      el.style.color=ok?'var(--green)':'var(--red)';
    }
    function renderRarityRows(){
      $('gachaRarityList').innerHTML=g.rarities.map((r,i)=>{
        const imgs=gachaRarityImages_(r);
        return '<div class="admin-card" data-rarity-row="'+i+'" style="margin:8px 0">'+
        '<div class="grid">'+
        '<label>名前<input data-r-name value="'+esc(r.name||'')+'" placeholder="例：SSR"></label>'+
        '<label>確率（%）<input data-r-weight type="number" min="0" max="100" step="0.1" value="'+(Number(r.weight)||0)+'"></label>'+
        '</div>'+
        '<label>色<input data-r-color type="color" value="'+esc(r.color||'#f6c84f')+'" style="height:40px;padding:2px"></label>'+
        '<label>画像URL / ファイル名（1行に1枚。複数入れておくと、その中からランダムで1枚が使われます）<textarea data-img-upload-multi data-r-images rows="'+Math.max(3,imgs.length+1)+'" placeholder="例：\ngacha_ssr_1.png\ngacha_ssr_2.png\nhttps://...">'+esc(imgs.join('\n'))+'</textarea></label>'+
        (imgs.length?('<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">'+imgs.map(function(u){return '<img src="'+esc(GuildUtils.driveImg(u))+'" style="max-width:100px;max-height:100px;border:2px solid rgba(246,200,79,.4);border-radius:10px;background:#000" onerror="this.style.display=\'none\'">';}).join('')+'</div>'):'')+
        '<label class="check-row"><input data-r-flashy type="checkbox" '+(r.flashy?'checked':'')+'> 豪華演出にする（光の演出が増えます。レア度が高いものにおすすめ）</label>'+
        '<div class="toolbar"><button class="btn small red" data-remove-rarity="'+i+'">このレアリティを削除</button></div>'+
        '</div>';
      }).join('');
      $('gachaRarityList').querySelectorAll('[data-remove-rarity]').forEach(b=>b.onclick=function(){
        g.rarities.splice(Number(this.dataset.removeRarity),1);
        renderRarityRows();
      });
      $('gachaRarityList').querySelectorAll('[data-r-weight]').forEach(inp=>inp.oninput=updateTotalLabel);
      updateTotalLabel();
      wireImageUploadButtons_();
    }
    renderRarityRows();
    $('addGachaRarity').onclick=function(){
      g.rarities.push({id:GuildUtils.uid('rarity'),name:'新しいレアリティ',weight:10,color:'#f6c84f',images:[],flashy:false});
      renderRarityRows();
    };
    $('saveGacha').onclick=function(){
      const rows=Array.from(document.querySelectorAll('[data-rarity-row]'));
      const rarities=rows.map(function(row,i){
        const images=row.querySelector('[data-r-images]').value.split('\n').map(s=>s.trim()).filter(Boolean);
        return {
          id:(g.rarities[i]&&g.rarities[i].id)||GuildUtils.uid('rarity'),
          name:row.querySelector('[data-r-name]').value.trim()||'名称未設定',
          weight:Math.max(0,Number(row.querySelector('[data-r-weight]').value)||0),
          color:row.querySelector('[data-r-color]').value||'#f6c84f',
          images:images,
          flashy:row.querySelector('[data-r-flashy]').checked
        };
      });
      data.settings.gachaEffect={enabled:$('gachaEnabled').checked, rarities};
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('会計ガチャを保存しました（全端末に反映されます）');
      renderThemeGacha();
    };
    $('resetGacha').onclick=function(){
      if(!confirm('会計ガチャの内容を既定（N/R/SR/SSRの4段階）に戻しますか？'))return;
      data.settings.gachaEffect={enabled:false, rarities:JSON.parse(JSON.stringify(GACHA_DEFAULT_RARITIES))};
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('会計ガチャを既定に戻しました');
      renderThemeGacha();
    };
  }
  function renderThemeSub(){
    if(themeSubTab==='store') renderStoreInfoAdmin('themeSubContent');
    if(themeSubTab==='text') renderThemeText();
    if(themeSubTab==='color') renderThemeColors();
    if(themeSubTab==='ui') renderThemeUi();
    if(themeSubTab==='effect') renderThemeEffect();
    if(themeSubTab==='gacha') renderThemeGacha();
    if(themeSubTab==='image') renderThemeImage();
    if(themeSubTab==='bgm') renderThemeBgm();
    if(themeSubTab==='character') renderMonsters('themeSubContent');
    if(themeSubTab==='stage') renderThemeStage();
    if(themeSubTab==='preview') renderThemePreview();
  }
  function renderPresetPicker(){
    if(!window.GuildTheme){ $('presetList').innerHTML='<div class="tiny">テーマ機能が読み込まれていません</div>'; return; }
    GuildTheme.loadPresets().then(function(presets){
      if(!presets.length){ $('presetList').innerHTML='<div class="tiny">presets.json が見つかりません。GitHubに置いてください。</div>'; return; }
      $('presetList').innerHTML=presets.map(function(p,i){
        var boss=(p.enemies&&p.enemies.length)?p.enemies[p.enemies.length-1].name:'-';
        var cust=(p.theme&&p.theme.words&&p.theme.words.customer)||'';
        var c2=(p.theme&&p.theme.color)||{};
        return '<div class="admin-card" style="border-color:'+(c2.gold||'#f6c84f')+'"><div class="admin-card-title">'+esc(p.label||p.id)+'</div>'+
          '<div class="tiny">呼び名: '+esc(cust)+' ／ ラスボス: '+esc(boss)+' ／ 敵 '+((p.enemies||[]).length)+'体</div>'+
          '<div style="display:flex;gap:6px;margin:8px 0">'+['gold','green','red','white'].map(function(k){return '<span style="width:22px;height:22px;border-radius:50%;background:'+(c2[k]||'#888')+';border:1px solid #0008"></span>';}).join('')+'</div>'+
          '<button class="btn gold" data-apply-preset="'+i+'">このコンセプトにする</button></div>';
      }).join('');
      document.querySelectorAll('[data-apply-preset]').forEach(function(btn){
        btn.onclick=function(){
          var p=presets[+btn.dataset.applyPreset];
          if(!confirm('「'+(p.label||p.id)+'」に切り替えますか？\n\n・店名/色/呼び名が変わります\n・敵の構成が'+((p.enemies||[]).length)+'体に入れ替わります（今の敵設定は上書き）\n・メニュー/顧客/売上は残ります'))return;
          GuildTheme.applyPresetTheme(p);
          applyConceptTemplateToSettings(p);
          data.settings.currentPresetId=p.id;
          // 古いプリセットで個別カスタムしていたカラー/文言/フォントの上書きが残っていると、
          // 新しいプリセットに切り替えたつもりでも次回読み込み時に古い値が乗ってきてしまうため、ここで消す
          delete data.settings.themeColors;
          delete data.settings.themeWords;
          delete data.settings.themeFonts;
          if(Array.isArray(p.enemies)){
            data.monsters=p.enemies.map(function(e,idx){ return normalizeMonster({ id:GuildUtils.uid('enemy'), name:e.name, stage:e.stage, maxHp:e.maxHp, hp:e.maxHp, bg:e.bg, image:e.image, bgm:e.bgm, scale:e.scale||70, offsetX:e.offsetX||0, offsetY:e.offsetY||0 }, idx); });
            data.currentEnemyIndex=0;
          }
          if(p.theme&&p.theme.brand&&p.theme.brand.shopName){ data.settings.shopName=p.theme.brand.shopName; }
          if(p.theme&&p.theme.brand){
            var pb=p.theme.brand;
            data.settings.themeCustom=data.settings.themeCustom||{};
            if(pb.victoryImage!==undefined) data.settings.themeCustom.victoryImage=pb.victoryImage;
            if(pb.victoryTitle!==undefined) data.settings.themeCustom.victoryTitle=pb.victoryTitle;
            if(pb.victorySubtitle!==undefined) data.settings.themeCustom.victorySubtitle=pb.victorySubtitle;
            if(pb.titleBg!==undefined) data.settings.themeCustom.startBg=pb.titleBg;
          }
          save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
          toast('「'+(p.label||p.id)+'」に切り替えました');
          renderThemeEditor();
        };
      });
    });
    $('clearPreset').onclick=function(){
      if(!confirm('コンセプトを解除して既定に戻しますか？'))return;
      data.settings.currentPresetId='';
      delete data.settings.themeColors;
      delete data.settings.themeWords;
      delete data.settings.themeFonts;
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      GuildTheme.clearOverride();
      toast('既定のテーマに戻しました');
      renderThemeEditor();
    };
  }
  const FONT_TARGETS=[
    ['brand','🏪 店名・見出し用'],['battle','⚔️ 討伐・戦闘UI用（敵名/撃破文字/HP等）'],['button','🔘 ボタンの文字']
  ];
  const FONT_PRESETS=[
    ['','指定なし（既定のフォント）'],
    ['游ゴシック','游ゴシック（標準・読みやすい）'],
    ['游明朝','游明朝（上品・和風）'],
    ['DotGothic16','ドット文字（レトロゲーム風・RPG向け）'],
    ['Zen Maru Gothic','丸ゴシック（かわいい系）'],
    ['Kaisei Decol','ゲーム見出し風（装飾的）'],
    ['Yusei Magic','手書き風（魔法・ファンタジー向け）'],
    ['Shippori Mincho','上品な明朝（和風・カフェ向け）'],
    ['Potta One','丸くてポップ'],
    ['Cinzel','重厚な洋風英字（ファンタジー向け）'],
    ['Orbitron','近未来英字（SF向け）'],
    ['__custom__','その他（フォント名を自由入力）']
  ];
  function fontSelectHtml(id,currentValue){
    const known=FONT_PRESETS.some(function(p){return p[0]===currentValue;});
    const selVal=currentValue? (known?currentValue:'__custom__') : '';
    const opts=FONT_PRESETS.map(function(p){return '<option value="'+esc(p[0])+'" '+(p[0]===selVal?'selected':'')+'>'+esc(p[1])+'</option>';}).join('');
    const customVisible=selVal==='__custom__';
    return '<select data-font-select="'+id+'">'+opts+'</select>'+
      '<input data-font-custom="'+id+'" placeholder="Google Fontsの名前を入力（例：Kosugi Maru）" value="'+esc(customVisible?currentValue:'')+'" style="margin-top:6px'+(customVisible?'':';display:none')+'">';
  }
  let fontMode='bulk';
  function fontCardHtml(){
    const fonts=(window.GuildTheme?GuildTheme.all().fonts:{})||{};
    fontMode = fontMode || fonts.mode || 'bulk';
    const modeBtns='<div class="toolbar"><button class="btn '+(fontMode==='bulk'?'gold':'')+'" data-font-mode="bulk">一括</button><button class="btn '+(fontMode==='detail'?'gold':'')+'" data-font-mode="detail">詳細</button></div>';
    let fields;
    if(fontMode==='bulk'){
      fields='<label>フォント（サイト全体に適用）'+fontSelectHtml('base',fonts.base||'')+'</label>';
    }else{
      fields='<label>基本フォント（他が空欄の時のフォールバック）'+fontSelectHtml('base',fonts.base||'')+'</label>'+
        FONT_TARGETS.map(([k,label])=>'<label>'+esc(label)+fontSelectHtml(k,fonts[k]||'')+'</label>').join('');
    }
    return '<div class="admin-card"><div class="admin-card-title">🔤 フォント設定</div>'+
      '<p class="tiny">一覧から選ぶだけでOK。Google Fontsは自動で読み込みます。リストにない名前を使いたい時だけ「その他」を選んで入力してください。一括はサイト全体、詳細は場所ごとに変えられます。</p>'+
      modeBtns+fields+
      '<div class="toolbar"><button class="btn gold" id="saveThemeFonts">フォントを保存</button></div></div>';
  }
  function bindFontCard(){
    document.querySelectorAll('[data-font-mode]').forEach(b=>b.onclick=()=>{ fontMode=b.dataset.fontMode; renderThemeText(); });
    document.querySelectorAll('[data-font-select]').forEach(sel=>sel.onchange=()=>{
      const custom=document.querySelector('[data-font-custom="'+sel.dataset.fontSelect+'"]');
      if(!custom) return;
      if(sel.value==='__custom__'){ custom.style.display=''; custom.focus(); }
      else{ custom.style.display='none'; custom.value=''; }
    });
    function readFont(id){
      const sel=document.querySelector('[data-font-select="'+id+'"]');
      if(!sel) return '';
      if(sel.value==='__custom__'){ const c=document.querySelector('[data-font-custom="'+id+'"]'); return c?c.value.trim():''; }
      return sel.value;
    }
    $('saveThemeFonts').onclick=function(){
      let partial;
      if(fontMode==='bulk'){
        partial={ mode:'bulk', base:readFont('base'), brand:'', battle:'', button:'' };
      }else{
        partial={ mode:'detail', base:readFont('base') };
        FONT_TARGETS.forEach(([k])=>{ partial[k]=readFont(k); });
      }
      if(window.GuildTheme) GuildTheme.saveFontsOverride(partial);
      data.settings.themeFonts=Object.assign({},data.settings.themeFonts||{},partial);
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('フォントを保存しました（全端末に反映されます）');
    };
  }
  const WORD_FIELDS=[
    ['customer','対象の呼び方（例：冒険者）'],['boss','ラスボス呼び方（例：魔王）'],['enemy','敵の呼び方（例：敵）'],
    ['quest','注文の呼び方（例：クエスト）'],['questClear','クリア文字（例：クエスト達成）'],['defeat','撃破文字（例：撃破）'],
    ['bossDefeatText','ラスボス撃破文字（例：魔王討伐！）'],['subjugation','討伐の呼び方'],['battle','戦闘の呼び方'],
    ['party','パーティ（人数）の呼び方'],['guild','店・ギルドの呼び方'],['customerRegister','登録料ラベル'],
    ['adventurerInfo','対象情報ラベル'],['stage','ステージの呼び方'],['hpLabel','HP表示名'],
    ['checkoutButton','会計ボタンの文字'],['menuTitleDefault','メニュー初期タイトル'],['awakenText','覚醒演出のセリフ（例：魔王が覚醒する——！）']
  ];
  function renderThemeText(){
    const c=ensureThemeCustom();
    const words=(window.GuildTheme?GuildTheme.all().words:{})||{};
    $('themeSubContent').innerHTML=
      fontCardHtml()+
      '<div class="admin-card"><div class="admin-card-title">🏷️ 呼び名・固定文字</div>'+
      '<p class="tiny">画面のあちこちに出てくる固定の言葉をここでまとめて変えられます。例：「冒険者」→「お客様」、「魔王」→「ラスボス」など。</p>'+
      WORD_FIELDS.map(([k,label])=>'<label>'+esc(label)+'<input data-word-key="'+k+'" value="'+esc(words[k]||'')+'"></label>').join('')+
      '<div class="toolbar"><button class="btn gold" id="saveThemeWords">呼び名を保存</button></div>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🎬 スタート画面</div>'+
      '<label>タイトルHTML<textarea id="tcStartTitle" placeholder="例：ギルドへ&lt;br&gt;ようこそ">'+esc(c.startTitle||'')+'</textarea></label>'+
      '<label>サブメッセージ<input id="tcStartSubtitle" value="'+esc(c.startSubtitle||'')+'" placeholder="例：メニューを開きますか？"></label>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🏆 討伐完了画面</div>'+
      '<label>追加タイトル<input id="tcVictoryTitle" value="'+esc(c.victoryTitle||'')+'" placeholder="例：MISSION COMPLETE"></label>'+
      '<label>追加メッセージ<textarea id="tcVictorySubtitle" placeholder="例：ご来店ありがとうございました">'+esc(c.victorySubtitle||'')+'</textarea></label>'+
      '<label>メッセージの表示位置<select id="tcVictoryTextPos">'+
        '<option value="top"'+(c.victoryTextPosition==='top'?' selected':'')+'>上</option>'+
        '<option value="middle"'+(c.victoryTextPosition!=='top'&&c.victoryTextPosition!=='bottom'?' selected':'')+'>中央</option>'+
        '<option value="bottom"'+(c.victoryTextPosition==='bottom'?' selected':'')+'>下（戻るボタンのすぐ上）</option>'+
      '</select></label>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🌀 覚醒演出（ラスボス直前）</div>'+
      '<p class="tiny">敵が2体以上いる場合、ラスボスの1つ前を倒すと画面が揺れてセリフが出る演出です。テーマによって合わない場合はオフにできます（呼び名の「覚醒演出のセリフ」で文言も変更可）。</p>'+
      '<label class="check-row"><input type="checkbox" id="tcAwakenEnabled" '+(c.awakenEnabled!==false?'checked':'')+'> 演出を有効にする</label>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🧙 いいえ選択時のマスター</div>'+
      '<label>表示名<input id="tcMasterName" value="'+esc(c.masterName||'ギルドマスター')+'" placeholder="例：ギルドマスター / 店長 / 校長"></label>'+
      '<label>セリフ<input id="tcMasterMessage" value="'+esc(c.masterMessage||'冷やかしか？さっさとメニューを開け')+'"></label>'+
      '</div>'+
      '<div class="toolbar"><button class="btn gold" id="saveThemeText">テキストを保存</button><button class="btn" id="clearThemeCustom">すべて初期化</button></div>';
    bindFontCard();
    $('saveThemeWords').onclick=function(){
      const partial={};
      document.querySelectorAll('[data-word-key]').forEach(inp=>{ const v=inp.value.trim(); if(v) partial[inp.dataset.wordKey]=v; });
      if(window.GuildTheme) GuildTheme.saveWordsOverride(partial);
      data.settings.themeWords=Object.assign({},data.settings.themeWords||{},partial);
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('呼び名を保存しました（全端末に反映されます）');
    };
    $('saveThemeText').onclick=function(){
      Object.assign(c,{
        startTitle:$('tcStartTitle').value.trim(),
        startSubtitle:$('tcStartSubtitle').value.trim(),
        victoryTitle:$('tcVictoryTitle').value.trim(),
        victorySubtitle:$('tcVictorySubtitle').value,
        victoryTextPosition:$('tcVictoryTextPos').value,
        awakenEnabled:$('tcAwakenEnabled').checked,
        masterName:$('tcMasterName').value.trim()||'ギルドマスター',
        masterMessage:$('tcMasterMessage').value.trim()||'冷やかしか？さっさとメニューを開け'
      });
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); toast('テキストを保存しました');
    };
    bindThemeCustomReset();
  }
  function renderThemeImage(){
    const c=ensureThemeCustom();
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">🎬 スタート画面 背景</div>'+
      '<label>背景画像URL / ファイル名<input data-img-upload id="tcStartBg" value="'+esc(c.startBg||'')+'" placeholder="例：start_bg.png / https://..."></label></div>'+
      '<div class="admin-card"><div class="admin-card-title">🏆 討伐完了画面</div>'+
      '<label>背景画像URL / ファイル名<input data-img-upload id="tcVictoryBg" value="'+esc(c.victoryBg||'')+'" placeholder="例：victory_bg.png / https://..."></label>'+
      '<label>中央画像URL / ファイル名<input data-img-upload id="tcVictoryImage" value="'+esc(c.victoryImage||'victory_clear.PNG')+'" placeholder="例：victory_clear.PNG / https://..."></label></div>'+
      '<div class="admin-card"><div class="admin-card-title">🧙 マスター画像</div>'+
      '<label>マスター画像URL / ファイル名<input data-img-upload id="tcMasterImage" value="'+esc(c.masterImage||'master_no.jpeg')+'" placeholder="例：master_no.jpeg / https://..."></label></div>'+
      '<div class="toolbar"><button class="btn gold" id="saveThemeImage">画像設定を保存</button><button class="btn" id="clearThemeCustom">すべて初期化</button></div>'+
      '<h3>画像をアップロードする</h3>'+uploadWidgetHtml();
    $('saveThemeImage').onclick=function(){
      Object.assign(c,{
        startBg:$('tcStartBg').value.trim(),
        victoryBg:$('tcVictoryBg').value.trim(),
        victoryImage:$('tcVictoryImage').value.trim()||'victory_clear.PNG',
        masterImage:$('tcMasterImage').value.trim()||'master_no.jpeg'
      });
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); toast('画像設定を保存しました');
    };
    bindThemeCustomReset();
    bindUploadWidget();
    wireImageUploadButtons_();
  }
  // BGM/SEの試聴共通処理。target はキー名(例:'slime')・生ファイル名・URLのどれでもOK
  function previewAudioTarget(target){
    target=(target||'').trim();
    if(!target){ toast('⚠️ 音源が指定されていません'); return; }
    var af=(data.settings.audioFiles||{});
    var file=(af.bgm&&af.bgm[target])||(af.se&&af.se[target])||(/^https?:|\.(mp3|wav|ogg|m4a)$/i.test(target)?target:'');
    if(!file){ toast('⚠️「'+target+'」に対応する音源が見つかりません'); return; }
    try{
      if(window._bgmTest){ window._bgmTest.pause(); window._bgmTest=null; }
      var src=file;
      if(window.GuildUtils&&GuildUtils.driveImg&&/drive\.google/.test(src)) src=GuildUtils.driveImg(src);
      var a=new Audio(src); window._bgmTest=a;
      a.play().then(function(){ toast('▶ 再生中: '+file); }).catch(function(e){ toast('❌ 再生失敗: '+file+'（'+e.name+'）'); });
    }catch(e){ toast('❌ エラー: '+e); }
  }
  function stopAudioPreview(){ if(window._bgmTest){ window._bgmTest.pause(); window._bgmTest=null; toast('■ 停止'); } }
  function renderThemeBgm(){
    const c=ensureThemeCustom();
    const s=data.settings;
    s.audioFiles=s.audioFiles||{};
    s.audioFiles.bgm=Object.assign({title:'bgm/bgm_4.mp3',slime:'bgm/bgm_10.mp3',goblin:'bgm/bgm_1.mp3',orc:'bgm/bgm_2.mp3',cave:'bgm/bgm_5.mp3',ruins:'bgm/bgm_7.mp3',maou:'bgm/bgm_16.mp3',ending:'bgm/bgm_17.mp3',daimaou:'bgm/bgm_9.mp3'},s.audioFiles.bgm||{});
    s.audioFiles.se=Object.assign({ok:'se/se_1.mp3',cancel:'se/se_6.mp3',bad:'se/se_5.mp3',add:'se/se_8.mp3',confirm:'se/se_3.mp3',damage:'se/se_4.mp3',defeat:'se/se_7.mp3',victory:'se/se_2.mp3',levelup:'se/se_9.mp3'},s.audioFiles.se||{});
    const bgmMap=s.audioFiles.bgm;
    const seMap=s.audioFiles.se;
    const SE_LABELS={ok:'決定',cancel:'キャンセル',bad:'エラー・売切れ',add:'注文追加',confirm:'確認',damage:'ダメージ',defeat:'撃破',victory:'会計・勝利',levelup:'レベルアップ'};
    const bgmVol=Math.round((s.bgmVolume??0.45)*100);
    const seVol=Math.round((s.seVolume??0.9)*100);
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">🔊 音量</div>'+
      '<label>BGM音量（<span id="bgmVolVal">'+bgmVol+'</span>%）<input type="range" id="tcBgmVolume" min="0" max="100" value="'+bgmVol+'"></label>'+
      '<label>効果音（SE）音量（<span id="seVolVal">'+seVol+'</span>%）<input type="range" id="tcSeVolume" min="0" max="100" value="'+seVol+'"></label>'+
      '<div class="toolbar"><button class="btn gold" id="saveVolume">音量を保存</button></div>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🎬 場面BGM</div>'+
      '<label>スタート画面BGM（キー or URL）<input id="tcStartBgm" value="'+esc(c.startBgm||'title')+'" placeholder="例：title / https://...mp3"></label>'+
      '<div class="toolbar"><button class="btn small" data-preview-input="tcStartBgm">▶ 試聴</button><button class="btn small" data-preview-stop="1">■ 停止</button></div>'+
      '<label>討伐完了BGM（キー or URL）<input id="tcVictoryBgm" value="'+esc(c.victoryBgm||'ending')+'" placeholder="例：ending / https://...mp3"></label>'+
      '<div class="toolbar"><button class="btn small" data-preview-input="tcVictoryBgm">▶ 試聴</button><button class="btn small" data-preview-stop="1">■ 停止</button></div>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">⚔️ ステージ別BGM（キャラクターのBGM欄で呼び出す名前）</div>'+
      '<p class="tiny">キャラクター編集画面のBGM欄に、ここで決めたキー名（例：slime）を入れると自動で使われます。59曲全部から直接選べます。</p>'+
      Object.keys(bgmMap).map(k=>`<label>${esc(k)}${audioSelectHtml('bgm',k,bgmMap[k]||'',BGM_LIST,'bgm')}</label><div class="toolbar"><button class="btn small" data-preview-input="bgm-${esc(k)}">▶ 試聴</button><button class="btn small" data-preview-stop="1">■ 停止</button></div>`).join('')+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🔔 効果音（SE）</div>'+
      '<p class="tiny">ボタン操作や攻撃・撃破などの短い効果音です。23個から直接選べます。</p>'+
      Object.keys(seMap).map(k=>`<label>${esc(SE_LABELS[k]||k)}${audioSelectHtml('se',k,seMap[k]||'',SE_LIST_ALL,'se')}</label><div class="toolbar"><button class="btn small" data-preview-input="se-${esc(k)}">▶ 試聴</button><button class="btn small" data-preview-stop="1">■ 停止</button></div>`).join('')+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">📝 音源クレジット表記</div>'+
      '<p class="tiny">配布サイトの規約でクレジット表記が必須の音源を使っている場合、ここに書いておくとタイトル画面に小さく表示されます。音源を全部自分の物や表記不要の物に差し替えた場合は空欄でOKです。</p>'+
      '<input id="tcAudioCredit" value="'+esc(s.audioCredit!==undefined?s.audioCredit:'音楽：魔王魂 / パンダの中のパンダ / BGMer')+'" placeholder="例：音楽：魔王魂">'+
      '</div>'+
      '<div class="toolbar"><button class="btn gold" id="saveThemeBgm">BGM・SE設定を保存</button><button class="btn" id="clearThemeCustom">場面BGMを初期化</button></div>'+
      '<h3>音源をアップロードする</h3>'+uploadWidgetHtml();
    bindAudioSelects('bgm'); bindAudioSelects('se');
    $('tcBgmVolume').oninput=()=>{ $('bgmVolVal').textContent=$('tcBgmVolume').value; };
    $('tcSeVolume').oninput=()=>{ $('seVolVal').textContent=$('tcSeVolume').value; };
    $('saveVolume').onclick=()=>{
      s.bgmVolume=(+$('tcBgmVolume').value)/100;
      s.seVolume=(+$('tcSeVolume').value)/100;
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('音量を保存しました（全端末に反映されます）');
    };
    function currentAudioValue(dataAttr,key){
      var sel=document.querySelector('[data-'+dataAttr+'-select="'+key+'"]');
      if(!sel) return '';
      if(sel.value==='__custom__'){ var c=document.querySelector('[data-'+dataAttr+'-key="'+key+'"]'); return c?c.value.trim():''; }
      return sel.value;
    }
    document.querySelectorAll('[data-preview-input]').forEach(function(btn){
      btn.onclick=function(){
        var key=btn.dataset.previewInput;
        var val='';
        if(key==='tcStartBgm'||key==='tcVictoryBgm'){ var el=$(key); val=el?el.value:''; }
        else if(key.indexOf('bgm-')===0) val=currentAudioValue('bgm',key.slice(4));
        else if(key.indexOf('se-')===0) val=currentAudioValue('se',key.slice(3));
        previewAudioTarget(val);
      };
    });
    document.querySelectorAll('[data-preview-stop]').forEach(function(btn){ btn.onclick=stopAudioPreview; });
    $('saveThemeBgm').onclick=function(){
      Object.assign(c,{ startBgm:$('tcStartBgm').value.trim()||'title', victoryBgm:$('tcVictoryBgm').value.trim()||'ending' });
      Object.keys(bgmMap).forEach(k=>{ const v=currentAudioValue('bgm',k); bgmMap[k]=v||bgmMap[k]; });
      Object.keys(seMap).forEach(k=>{ const v=currentAudioValue('se',k); seMap[k]=v||seMap[k]; });
      s.audioCredit=$('tcAudioCredit').value.trim();
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); toast('BGM・SE設定を保存しました');
    };
    bindThemeCustomReset();
    bindUploadWidget();
  }
  function bindThemeCustomReset(){
    const btn=$('clearThemeCustom'); if(!btn) return;
    btn.onclick=function(){
      if(!confirm('スタート/討伐完了/マスターのカスタム設定（テキスト・画像・BGM）をすべて初期化しますか？'))return;
      data.settings.themeCustom={};
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('初期化しました');
      renderThemeSub();
    };
  }
  function renderThemeStage(){
    data.monsters=(data.monsters||[]).map(normalizeMonster);
    $('themeSubContent').innerHTML='<div class="admin-card"><p class="tiny">討伐の並び順にステージ名だけをまとめて編集できます。詳しいHP・画像などは「キャラクター」タブへ。</p></div>'+
      '<div class="category-list" id="stageListBox">'+data.monsters.map((m,i)=>`<div class="admin-card"><div class="admin-card-title">${i+1}. ${esc(m.name)}</div><label>ステージ名<input data-stage-index="${i}" value="${esc(m.stage||'')}"></label></div>`).join('')+'</div>'+
      '<div class="toolbar"><button class="btn gold" id="saveStages">ステージ名を保存</button></div>';
    $('saveStages').onclick=function(){
      document.querySelectorAll('[data-stage-index]').forEach(inp=>{ const m=data.monsters[+inp.dataset.stageIndex]; if(m) m.stage=inp.value.trim()||m.stage; });
      save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud(); toast('ステージ名を保存しました'); renderThemeStage();
    };
  }
  function renderThemePreview(){
    $('themeSubContent').innerHTML='<div class="admin-card"><div class="admin-card-title">👁️ プレビュー</div>'+
      '<p class="tiny">編集した内容は保存後、一般画面を開くとすぐ反映されます。画面内リアルタイムプレビューはPhase4-8で対応予定です。</p>'+
      '<div class="toolbar"><button class="btn gold" id="openLivePreview">一般画面を新しいタブで開く</button></div></div>';
    $('openLivePreview').onclick=function(){ window.open('index.html','_blank'); };
  }

  function renderStoreInfoAdmin(containerId){
    containerId=containerId||'adminContent';
    const s=data.settings;
    s.storeInfo=Object.assign({name:'',address:'',hours:'',phone:'',instagram:'',x:'',youtube:'',website:'',mapUrl:'',description:'',logo:''},s.storeInfo||{});
    const i=s.storeInfo;
    $(containerId).innerHTML='<h2>🏪 店舗情報</h2>'+
      '<div class="admin-card"><p class="tiny">一般画面の「店舗情報」ボタンに表示されます。営業時間・SNS・地図など、お客様に見せたい情報を登録できます。</p></div>'+
      '<div class="admin-card">'+
      '<label>店舗名<input id="infoName" value="'+esc(i.name||s.storeName||s.shopName||'')+'" placeholder="例：〇〇バー / △△カフェ"></label>'+
      '<label>店舗ロゴ画像URL（アップロードした画像や外部URLを貼り付け）<input data-img-upload id="infoLogo" value="'+esc(i.logo||'')+'" placeholder="https://drive.google.com/... または https://...png"></label>'+
      '<div id="infoLogoPreview" style="margin:6px 0 12px">'+(i.logo?('<img src="'+esc(GuildUtils.driveImg(i.logo))+'" alt="ロゴ" style="max-width:120px;max-height:120px;border-radius:10px;border:1px solid rgba(246,200,79,.4)" onerror="this.style.display=\'none\'">'):'<span class="tiny">未設定（タイトル画面・店舗情報にはロゴなしで表示されます）</span>')+'</div>'+
      '<label>紹介文<textarea id="infoDesc" placeholder="例：ゲームを遊びながら注文できるバーです">'+esc(i.description||'')+'</textarea></label>'+
      '<label>営業時間<textarea id="infoHours" placeholder="例：20:00〜LAST / 定休日：月曜">'+esc(i.hours||'')+'</textarea></label>'+
      '<label>住所<textarea id="infoAddress" placeholder="例：〇〇県〇〇市〇〇1-2-3 △△ビル2F">'+esc(i.address||'')+'</textarea></label>'+
      '<label>電話番号<input id="infoPhone" value="'+esc(i.phone||'')+'" placeholder="例：00-0000-0000"></label>'+
      '<label>Instagram URL<input id="infoInstagram" value="'+esc(i.instagram||'')+'" placeholder="https://instagram.com/..."></label>'+
      '<label>X URL<input id="infoX" value="'+esc(i.x||'')+'" placeholder="https://x.com/..."></label>'+
      '<label>YouTube URL<input id="infoYoutube" value="'+esc(i.youtube||'')+'" placeholder="https://youtube.com/@..."></label>'+
      '<label>公式サイトURL<input id="infoWebsite" value="'+esc(i.website||'')+'" placeholder="https://..."></label>'+
      '<label>Google Map URL<input id="infoMap" value="'+esc(i.mapUrl||'')+'" placeholder="https://maps.app.goo.gl/..."></label>'+
      '<div class="toolbar"><button class="btn gold" id="saveStoreInfo">店舗情報を保存</button></div>'+
      '</div>';
    $('saveStoreInfo').onclick=function(){
      s.storeInfo={
        name:$('infoName').value.trim(),
        logo:$('infoLogo').value.trim(),
        description:$('infoDesc').value,
        hours:$('infoHours').value,
        address:$('infoAddress').value,
        phone:$('infoPhone').value.trim(),
        instagram:$('infoInstagram').value.trim(),
        x:$('infoX').value.trim(),
        youtube:$('infoYoutube').value.trim(),
        website:$('infoWebsite').value.trim(),
        mapUrl:$('infoMap').value.trim()
      };
      if(s.storeInfo.name){ s.storeName=s.storeInfo.name; s.shopName=s.storeInfo.name; }
      save();
      if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      toast('店舗情報を保存しました');
      renderStoreInfoAdmin(containerId);
    };
    if($('infoLogo')) $('infoLogo').addEventListener('input',function(){
      const box=$('infoLogoPreview'); const v=this.value.trim();
      box.innerHTML=v?('<img src="'+esc(GuildUtils.driveImg(v))+'" alt="ロゴ" style="max-width:120px;max-height:120px;border-radius:10px;border:1px solid rgba(246,200,79,.4)" onerror="this.style.display=\'none\'">'):'<span class="tiny">未設定（タイトル画面・店舗情報にはロゴなしで表示されます）</span>';
    });
    wireImageUploadButtons_();
  }

  function renderQR(){
    const s=data.settings||{};
    const base=(location.origin+location.pathname.replace(/\/admin\.html$/,'/'));
    const storeUrl=s.storeId ? (base+'?store='+encodeURIComponent(s.storeId)) : '';
    const gasUrl=s.gasUrl ? (base+'?gas='+encodeURIComponent(s.gasUrl)) : '';
    const activeUrl=storeUrl||gasUrl||base;
    const qrSrc='https://api.qrserver.com/v1/create-qr-code/?size=360x360&data='+encodeURIComponent(activeUrl);
    $('adminContent').innerHTML='<h2>🔳 QRコード管理</h2>'+
      '<div class="admin-card"><p class="tiny">店舗IDを使う場合は stores.json に店舗IDとGAS URLを登録します。すぐ使うならGAS直指定URLでもOKです。</p></div>'+
      '<div class="admin-card">'+
      '<label>店舗ID（推奨）<input id="qrStoreId" value="'+esc(s.storeId||'')+'" placeholder="例：otakuba"></label>'+
      '<label>GAS URL<input id="qrGasUrl" value="'+esc(s.gasUrl||'')+'" placeholder="https://script.google.com/.../exec"></label>'+
      '<label>QRにするURL<select id="qrMode"><option value="store" '+(storeUrl?'selected':'')+'>店舗ID方式（?store=）</option><option value="gas" '+(!storeUrl?'selected':'')+'>GAS直指定方式（?gas=）</option></select></label>'+
      '<div class="toolbar"><button class="btn gold" id="saveQrSettings">保存してQR更新</button></div>'+
      '</div>'+
      '<div class="admin-card qr-card"><div class="admin-card-title">表示用QR</div>'+
      '<input id="qrUrlText" readonly value="'+esc(activeUrl)+'">'+
      '<div class="qr-box"><img id="qrImg" src="'+qrSrc+'" alt="QRコード"></div>'+
      '<div class="toolbar"><button class="btn" id="copyQrUrl">URLコピー</button><button class="btn" id="openQrUrl">開く</button><a class="btn gold" id="downloadQr" href="'+qrSrc+'" download="game-menu-qr.png">QR保存</a></div>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">印刷メモ</div><p class="tiny">QRを保存して、テーブルPOPやメニュー表に貼って使えます。店舗ID方式ならURLが短く、GAS直指定方式なら stores.json 編集なしで使えます。</p></div>';

    function refresh(){
      const sid=$('qrStoreId').value.trim();
      const gas=$('qrGasUrl').value.trim();
      const mode=$('qrMode').value;
      const url=(mode==='store'&&sid)?(base+'?store='+encodeURIComponent(sid)):(gas?(base+'?gas='+encodeURIComponent(gas)):base);
      $('qrUrlText').value=url;
      const src='https://api.qrserver.com/v1/create-qr-code/?size=360x360&data='+encodeURIComponent(url);
      $('qrImg').src=src;
      $('downloadQr').href=src;
    }
    $('qrStoreId').oninput=refresh;
    $('qrGasUrl').oninput=refresh;
    $('qrMode').onchange=refresh;
    $('saveQrSettings').onclick=function(){
      s.storeId=$('qrStoreId').value.trim();
      s.gasUrl=$('qrGasUrl').value.trim();
      save();
      if(GuildStorage.pushCloud)GuildStorage.pushCloud();
      refresh();
      toast('QR設定を保存しました');
    };
    $('copyQrUrl').onclick=async function(){
      try{ await navigator.clipboard.writeText($('qrUrlText').value); toast('コピーしました'); }
      catch(e){ $('qrUrlText').select(); toast('URLを選択しました'); }
    };
    $('openQrUrl').onclick=function(){ window.open($('qrUrlText').value,'_blank'); };
  }

  // ===== 各画像入力欄に直接アップロードボタンを付ける共通の仕組み =====
  // ファイルを1つアップロードしてURLを返す（在庫タブのdoUploadと同じ経路を共通化したもの）
  async function uploadImageFileGeneric_(file, labelHint){
    const url=(data.settings.gasUrl||'').trim();
    if(!url){ toast('先に☁️同期タブでGAS URLを設定してください'); return null; }
    if(file.size>8*1024*1024){ if(!confirm('8MBを超えています。GAS経由だと失敗しやすいですが試しますか？')) return null; }
    const label=(labelHint||file.name.replace(/\.[^.]+$/,'')).replace(/[^\w\-]/g,'_').slice(0,40);
    const ext=(file.name.match(/\.[^.]+$/)||[''])[0]||'.png';
    const filename=label+'_'+Date.now()+ext;
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'uploadFile',filename,mimeType:file.type,data:b64})});
      const j=await res.json();
      if(j&&j.ok&&j.url){
        data.settings.uploadHistory=data.settings.uploadHistory||[]; data.settings.uploadHistory.push({name:filename,url:j.url,at:new Date().toISOString()}); save();
        return j.url;
      }
      toast('❌ アップロード失敗：'+((j&&j.error)||'不明なエラー'));
      return null;
    }catch(e){ toast('❌ 通信失敗：'+String(e)); return null; }
  }
  // 画面内の「data-img-upload」付き<input>（単一URL用）と「data-img-upload-multi」付き<textarea>（複数行・末尾追記用）に
  // それぞれ「📤 端末から画像を選ぶ」ボタンを自動で差し込む。各render関数の最後で呼び出す。
  function wireImageUploadButtons_(){
    document.querySelectorAll('[data-img-upload]').forEach(function(input){
      if(input.dataset.uploadWired) return; input.dataset.uploadWired='1';
      const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:8px;align-items:center;margin:4px 0 10px';
      const btn=document.createElement('label'); btn.className='btn small'; btn.style.cssText='cursor:pointer;white-space:nowrap'; btn.textContent='📤 端末から画像を選ぶ';
      const file=document.createElement('input'); file.type='file'; file.accept='image/*'; file.style.display='none';
      btn.appendChild(file);
      const status=document.createElement('span'); status.className='tiny';
      file.onchange=async function(){
        const f=file.files[0]; if(!f) return;
        status.textContent='アップロード中…';
        const url=await uploadImageFileGeneric_(f, input.name||input.id||'image');
        if(url){ input.value=url; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); status.textContent='✅ 完了'; setTimeout(()=>{status.textContent='';},1800); }
        else status.textContent='';
        file.value='';
      };
      wrap.appendChild(btn); wrap.appendChild(status);
      input.insertAdjacentElement('afterend', wrap);
    });
    document.querySelectorAll('[data-img-upload-multi]').forEach(function(textarea){
      if(textarea.dataset.uploadWired) return; textarea.dataset.uploadWired='1';
      const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:8px;align-items:center;margin:4px 0 10px';
      const btn=document.createElement('label'); btn.className='btn small'; btn.style.cssText='cursor:pointer;white-space:nowrap'; btn.textContent='📤 端末から画像を追加';
      const file=document.createElement('input'); file.type='file'; file.accept='image/*'; file.style.display='none';
      btn.appendChild(file);
      const status=document.createElement('span'); status.className='tiny';
      file.onchange=async function(){
        const f=file.files[0]; if(!f) return;
        status.textContent='アップロード中…';
        const url=await uploadImageFileGeneric_(f, textarea.name||textarea.id||'image');
        if(url){ const cur=textarea.value.trim(); textarea.value=cur?(cur+'\n'+url):url; textarea.dispatchEvent(new Event('input',{bubbles:true})); status.textContent='✅ 追加しました'; setTimeout(()=>{status.textContent='';},1800); }
        else status.textContent='';
        file.value='';
      };
      wrap.appendChild(btn); wrap.appendChild(status);
      textarea.insertAdjacentElement('afterend', wrap);
    });
  }

  function uploadWidgetHtml(){
    return `<div class="admin-card"><div class="tiny">敵画像・背景・メニュー写真をここからアップできます。アップ後に出るURLを、上の画像欄に貼れば使えます。<br>⚠️BGM/SE（音声ファイル）は、この仕組みだと再生できない不具合があるため、ここからはアップロードしないでください。音声を追加・差し替えたい場合は、GitHubリポジトリの<code>bgm</code>フォルダに直接ファイルをアップロードし、ファイル名（例：<code>bgm/曲名.mp3</code>）をBGM欄に入力してください。</div></div>
    <div class="admin-card">
      <label>ファイルを選択（画像のみ）<input id="upFile" type="file" accept="image/*"></label>
      <label>用途メモ（任意・ファイル名に使います）<input id="upLabel" placeholder="例：slime2 / menu_beer"></label>
      <div class="toolbar"><button class="btn gold" id="upBtn">アップロード</button></div>
      <div id="upProgress" class="tiny"></div>
    </div>
    <div id="upResult"></div>
    <div class="admin-card"><div class="admin-card-title">アップ済み一覧（この端末の履歴）</div><div id="upHistory">${uploadHistoryHtml()}</div></div>`;
  }
  function bindUploadWidget(){ $('upBtn').onclick=doUpload; bindUploadHistoryEvents(); }
  function uploadHistoryHtml(){const h=(data.settings.uploadHistory||[]).slice().reverse();return h.length?h.map((u,i)=>`<div class="billbox" style="margin:4px 0"><b>${esc(u.name)}</b><br><input readonly value="${esc(u.url)}" data-up-url="${i}" onclick="this.select();this.setSelectionRange(0,99999)" style="width:100%;font-size:.8em"><button class="btn small" data-copy-url="${i}">URLコピー</button></div>`).join(''):'<div class="tiny">まだありません</div>';}
  function copyText(text,btn){
    let ok=false;
    try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text); ok=true; } }catch(e){}
    if(!ok){ try{ const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0,99999); document.execCommand('copy'); document.body.removeChild(ta); ok=true; }catch(e){} }
    if(btn){ const o=btn.textContent; btn.textContent='✓ コピー済み'; setTimeout(()=>btn.textContent=o,1200); }
    toast(ok?'コピーしました':'長押しで選択してコピーしてください');
  }
  function bindUploadHistoryEvents(){
    const h=(data.settings.uploadHistory||[]).slice().reverse();
    document.querySelectorAll('[data-copy-url]').forEach(b=>{ b.onclick=()=>{ const u=h[+b.dataset.copyUrl]; if(u) copyText(u.url,b); }; });
  }
  async function doUpload(){
    const f=$('upFile').files[0]; if(!f){toast('ファイルを選んでください');return;}
    if(f.type.startsWith('audio')){ toast('⚠️音声ファイルはこの仕組みだと再生できません。GitHubのbgmフォルダに直接アップロードしてください'); return; }
    const url=(data.settings.gasUrl||'').trim(); if(!url){toast('先に同期タブでGAS URLを設定してください');return;}
    if(f.size>8*1024*1024){ if(!confirm('8MBを超えています。GAS経由だと失敗しやすいですが試しますか？'))return; }
    const label=($('upLabel').value.trim()||f.name.replace(/\.[^.]+$/,'')).replace(/[^\w\-]/g,'_');
    const ext=(f.name.match(/\.[^.]+$/)||[''])[0]||(f.type.startsWith('audio')?'.mp3':'.png');
    const filename=label+ext;
    $('upProgress').textContent='読み込み中...';
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
      $('upProgress').textContent='アップロード中...（GAS経由・数秒かかります）';
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'uploadFile',filename,mimeType:f.type,data:b64})});
      const j=await res.json();
      if(j&&j.ok&&j.url){
        data.settings.uploadHistory=data.settings.uploadHistory||[]; data.settings.uploadHistory.push({name:filename,url:j.url,at:new Date().toISOString()}); save();
        $('upProgress').textContent='';
        $('upResult').innerHTML=`<div class="admin-card"><div class="admin-card-title">✅ アップ完了</div><div class="tiny">このURLを画像欄に貼ってください</div><input readonly value="${esc(j.url)}" onclick="this.select();this.setSelectionRange(0,99999)" style="width:100%"><div class="toolbar"><button class="btn gold" id="upCopy">URLをコピー</button></div><img src="${esc(GuildUtils.driveImg(j.url))}" style="max-width:100%;max-height:200px;margin-top:8px" onerror="this.style.display='none'"></div>`;
        $('upCopy').onclick=()=>copyText(j.url,$('upCopy'));
        if($('upHistory')){ $('upHistory').innerHTML=uploadHistoryHtml(); bindUploadHistoryEvents(); }
      }else{ $('upProgress').textContent=''; $('upResult').innerHTML=`<div class="admin-card">❌ 失敗：${esc((j&&j.error)||'不明なエラー')}</div>`; }
    }catch(e){ $('upProgress').textContent=''; $('upResult').innerHTML=`<div class="admin-card">❌ 通信失敗：${esc(String(e))}</div>`; }
  }
  async function renderSync(){const summary=`GAS URL: ${data.settings.gasUrl||'未設定'}`;$('adminContent').innerHTML=`<h2>☁️ GAS同期</h2><div class="admin-card"><label>GAS URL（/exec で終わるURL）<input id="syncGasUrl" value="${esc(data.settings.gasUrl||'')}" placeholder="https://script.google.com/.../exec"></label><div class="toolbar"><button class="btn gold" id="syncSaveUrl">URLを保存</button><button class="btn" id="syncTest">接続テスト</button></div></div><div class="billbox">${esc(summary)}</div><div class="toolbar"><button class="btn gold" id="syncPull">GASから全取得</button><button class="btn green" id="syncPushAll">全データ送信</button></div><div class="toolbar"><button class="btn" id="syncPushMenu">メニューのみ送信</button><button class="btn" id="syncPushMonsters">敵のみ送信</button></div><pre id="syncResult" class="json-box" style="min-height:24dvh"></pre>`;
    $('syncSaveUrl').onclick=()=>{data.settings.gasUrl=$('syncGasUrl').value.trim();save();toast('GAS URLを保存しました');renderSync();};
    $('syncTest').onclick=async()=>{const url=$('syncGasUrl').value.trim();if(!url){$('syncResult').textContent='URLを入力してください';return;}data.settings.gasUrl=url;save();$('syncResult').textContent='接続テスト中...';try{const res=await fetch(url+(url.includes('?')?'&':'?')+'action=ping&v='+Date.now(),{cache:'no-store'});const j=await res.json();$('syncResult').textContent=j&&j.ok?'✅ 接続成功！GASとつながっています。\n'+JSON.stringify(j):'⚠️ 応答が想定外です:\n'+JSON.stringify(j);}catch(e){$('syncResult').textContent='❌ 接続失敗。URLが正しいか、デプロイのアクセス権が「全員」か確認してください。\n'+String(e);}};
    $('syncPull').onclick=async()=>{$('syncResult').textContent='取得中...';const ok=await GuildStorage.pullCloud();render();$('syncResult').textContent=ok?'GASから取得して反映しました。\n（この端末の表示も更新済み）':'取得失敗。GAS URLとデプロイを確認してください。'};
    $('syncPushAll').onclick=()=>{GuildStorage.pushCloud();toast('全データを送信しました')};
    $('syncPushMenu').onclick=()=>{GuildNotify.send({action:'menuSave',menu:data.menu});toast('メニュー送信')};
    $('syncPushMonsters').onclick=()=>{GuildNotify.send({action:'monstersSave',monsters:data.monsters});toast('敵送信')}}

  // ===== v4 営業・在庫 =====
  function business(){data.settings.business=Object.assign({open:false,openedAt:'',closedAt:'',dailyReports:[]},data.settings.business||{});if(!Array.isArray(data.settings.business.dailyReports))data.settings.business.dailyReports=[];return data.settings.business;}
  function daySales(day){return activeSales().filter(s=>saleDay(s)===day);}
  function saleGroups(list){return new Set(list.map(s=>s.customer+'|'+saleDay(s)+'|'+(s.partyCount||1))).size;}
  function guestCount(list){return list.reduce((a,s)=>a+(Number(s.partyCount)||1),0);}
  function catName(id){const c=cats().find(x=>x.id===id);return c?((c.icon?c.icon+' ':'')+c.name):id;}
  function salesByKind(list,kind){let t=0;list.forEach(s=>(s.items||[]).forEach(it=>{if(kind==='charge'&&(it.isCharge||it.cat==='charge'||it.id==='cover-charge'))t+=Number(it.subtotal||0);else if(kind!=='charge'&&it.cat===kind)t+=Number(it.subtotal||0)}));return t;}
  function makeDailyReport(day){const list=daySales(day);const total=sumSales(list);const cover=chargeTotal(list);const guests=guestCount(list);const groups=saleGroups(list);const items=rankItems(list,false).slice(0,5);const cats=rankItems(list,true);return {id:GuildUtils.uid('report'),day,createdAt:new Date().toISOString(),createdAtText:GuildUtils.todayText(),total,cover,itemTotal:total-cover,guests,groups,orderCount:list.length,items,categories:cats};}
  function reportHtml(r){return `<div class="admin-card"><div class="admin-card-title">📅 ${esc(r.day)} 日報</div><div class="grid sales-summary"><div>売上<br><b>${yen(r.total||0,data.settings.currency)}</b></div><div>席料<br><b>${yen(r.cover||0,data.settings.currency)}</b></div><div>組数<br><b>${r.groups||0}</b></div><div>人数<br><b>${r.guests||0}</b></div></div><div class="tiny">人気TOP5：${(r.items||[]).map((x,i)=>`${i+1}.${esc(x.name)}×${x.qty}`).join(' / ')||'なし'}</div></div>`;}
  function renderBusiness(){const b=business();const today=todayKey();const r=makeDailyReport(today);const reports=(b.dailyReports||[]).slice().reverse().slice(0,10);$('adminContent').innerHTML=`<h2>🟢 営業管理</h2><div class="grid"><div class="admin-card"><div class="admin-card-title">営業状態</div><div class="big-num">${b.open?'営業中':'営業終了中'}</div><div class="tiny">開始：${esc(b.openedAt||'-')}</div><div class="toolbar"><button class="btn green" id="openBusiness">営業開始</button><button class="btn red" id="closeBusiness">営業終了・日報作成</button></div></div>${reportHtml(r)}</div><h3>保存済み日報</h3>${reports.length?reports.map(reportHtml).join(''):'<div class="empty">まだ日報はありません</div>'}`;
    $('openBusiness').onclick=()=>{
      b.open=true;b.openedAt=GuildUtils.todayText();
      if(GuildStorage.settleAbandonedBill) GuildStorage.settleAbandonedBill();
      if(GuildStorage.resetProgress) GuildStorage.resetProgress({sync:true});
      save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('営業開始');renderBusiness();renderStatusBadge();
    };
    $('closeBusiness').onclick=()=>{
      const rep=makeDailyReport(todayKey());
      const msg='営業を終了しますか？\n\n本日の売上\n'+yen(rep.total,data.settings.currency)+'\n注文数\n'+rep.orderCount+'件\n\n新規のご注文はできなくなります（会計待ちのお客様は会計可能です）。';
      if(!confirm(msg))return;
      b.open=false;b.closedAt=GuildUtils.todayText();b.dailyReports=(b.dailyReports||[]).filter(x=>x.day!==rep.day);b.dailyReports.push(rep);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('日報を保存しました');renderBusiness();renderStatusBadge();
    };
  }
  function inventoryRowsFor(items){return items.map(({p,i})=>`<tr data-inv-index="${i}"><td>${esc(p.emoji||'')} ${esc(p.name)}</td><td><input data-field="stock" type="number" min="0" placeholder="無制限" value="${p.stock===''?'':p.stock}"></td><td><label><input data-field="recommended" type="checkbox" ${p.recommended?'checked':''}>⭐</label></td><td><label><input data-field="limited" type="checkbox" ${p.limited?'checked':''}>👑</label></td><td><label><input data-field="soldOut" type="checkbox" ${p.soldOut?'checked':''}>❌</label></td></tr>`).join('');}
  function renderInventory(){data.menu=(data.menu||[]).map(normalizeProduct);const cs=cats();$('adminContent').innerHTML=`<h2>📦 在庫・状態管理</h2><div class="toolbar"><button class="btn green" id="saveInventory">保存</button><button class="btn" id="invOpenAll">全部開く</button><button class="btn" id="invCloseAll">全部閉じる</button><button class="btn" id="clearSoldOut">売切れ解除</button><button class="btn" id="clearStock">在庫を全て無制限</button></div><div class="category-list">${cs.map((c,ci)=>{const items=data.menu.map((p,i)=>({p,i})).filter(x=>x.p.cat===c.id);return `<section class="category-block ${ci===0?'open':''}"><button type="button" class="category-head inv-head"><span>${esc((c.icon?c.icon+' ':'')+c.name)} <b>(${items.length})</b></span><span class="category-toggle">${ci===0?'閉じる':'開く'}</span></button><div class="category-body">${items.length?`<table class="sales-table"><thead><tr><th>商品</th><th>在庫</th><th>⭐</th><th>👑</th><th>❌</th></tr></thead><tbody>${inventoryRowsFor(items)}</tbody></table>`:'<div class="empty">なし</div>'}</div></section>`;}).join('')}</div>`;
    document.querySelectorAll('.inv-head').forEach(h=>h.onclick=()=>{const b=h.closest('.category-block');b.classList.toggle('open');h.querySelector('.category-toggle').textContent=b.classList.contains('open')?'閉じる':'開く';});
    $('saveInventory').onclick=()=>{saveInventoryForm();toast('保存しました')};$('clearSoldOut').onclick=()=>{data.menu.forEach(p=>p.soldOut=false);save();renderInventory();};$('clearStock').onclick=()=>{if(confirm('全商品の在庫を無制限にしますか？')){data.menu.forEach(p=>{p.stock='';p.soldOut=false});save();renderInventory();}};
    $('invOpenAll').onclick=()=>{document.querySelectorAll('.category-block').forEach(b=>{b.classList.add('open');const t=b.querySelector('.category-toggle');if(t)t.textContent='閉じる';});};
    $('invCloseAll').onclick=()=>{document.querySelectorAll('.category-block').forEach(b=>{b.classList.remove('open');const t=b.querySelector('.category-toggle');if(t)t.textContent='開く';});};
  }
  function saveInventoryForm(){document.querySelectorAll('[data-inv-index]').forEach(row=>{const p=data.menu[+row.dataset.invIndex];p.stock=row.querySelector('[data-field="stock"]').value===''?'':Math.max(0,+row.querySelector('[data-field="stock"]').value||0);p.recommended=row.querySelector('[data-field="recommended"]').checked;p.limited=row.querySelector('[data-field="limited"]').checked;p.soldOut=row.querySelector('[data-field="soldOut"]').checked;});save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();}
  function resetInventory(){if(!confirmReset('在庫データ','在庫数を無制限に戻し、売切れ・おすすめ・限定を解除します。'))return;data.menu.forEach(p=>{p.stock='';p.soldOut=false;p.recommended=false;p.limited=false;});pushAfterReset('在庫データを初期化しました');}
  function resetDailyReports(){if(!confirmReset('日報データ','保存済みの日報と営業状態を初期化します。'))return;data.settings.business={open:false,openedAt:'',closedAt:'',dailyReports:[]};pushAfterReset('日報データを初期化しました');}

  // ===== 個別リセット =====
  function saleKeyLocal(s){return s&&(s.id||s.saleId||(String(s.time||'')+'|'+String(s.customer||'')+'|'+String(s.total||'')+'|'+JSON.stringify(s.items||[])));}
  function pushAfterReset(msg){save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast(msg||'初期化しました');renderReset();}
  function confirmReset(title, detail){return confirm(title+'を初期化しますか？\n'+(detail||'この操作は取り消せません。'));}
  function resetOrderHistory(){
    if(!confirmReset('注文履歴', 'GAS同期で復活しないよう、既存の注文IDも削除済みに記録します。'))return;
    const ids=(data.sales||[]).map(saleKeyLocal).filter(Boolean);
    data.deletedSaleIds=Array.from(new Set([...(data.deletedSaleIds||[]),...ids]));
    data.sales=[];
    data.activeBill=[];
    pushAfterReset('注文履歴を初期化しました');
  }
  function resetSalesOverview(){
    if(!confirmReset('売上概要', '今月売上・月別履歴・商品内訳・席料集計を0からにします。注文履歴も同時に空になります。'))return;
    const ids=(data.sales||[]).map(saleKeyLocal).filter(Boolean);
    data.deletedSaleIds=Array.from(new Set([...(data.deletedSaleIds||[]),...ids]));
    data.sales=[];
    data.salesSettings={currentMonth:monthFromDate(),closedMonths:[],monthlyArchives:{}};
    data.activeBill=[];
    salesQuery='';
    pushAfterReset('売上概要を初期化しました');
  }
  function resetActiveBill(){
    if(!confirmReset('現在の注文中データ', '未会計の商品・現在の冒険者選択・人数だけを空にします。履歴や売上は残ります。'))return;
    data.activeBill=[];data.currentCustomer='';data.partyCount=1;
    pushAfterReset('現在の注文中データを初期化しました');
  }
  function resetCustomers(){
    if(!confirmReset('顧客データ', '冒険者名・二つ名・来店回数・累計などを空にします。注文履歴と売上は残ります。'))return;
    const ids=(data.customers||[]).map(c=>c&&c.id).filter(Boolean);
    data.deletedCustomerIds=Array.from(new Set([...(data.deletedCustomerIds||[]),...ids]));
    data.customers=[];data.currentCustomer='';customerQuery='';
    pushAfterReset('顧客データを初期化しました');
  }
  function resetMenuData(){
    if(!confirmReset('メニューデータ', '商品一覧を空にします。本番メニューへ入れ替える前の整理用です。'))return;
    data.menu=[];
    pushAfterReset('メニューデータを初期化しました');
  }
  function resetNotice(){
    if(!confirmReset('本日のお知らせ', 'お知らせ本文を空にして、表示はONのままにします。'))return;
    data.settings.notice={enabled:true,title:'本日のお知らせ',body:'',position:'top'};
    pushAfterReset('本日のお知らせを初期化しました');
  }
  function resetAllLocal(){
    if(!confirm('全データを初期化しますか？\nメニュー・敵・設定・GAS URL以外の運用データを空にします。\nこの操作は取り消せません。'))return;
    const ids=(data.sales||[]).map(saleKeyLocal).filter(Boolean);
    data.deletedSaleIds=Array.from(new Set([...(data.deletedSaleIds||[]),...ids]));
    data.sales=[];data.salesSettings={currentMonth:monthFromDate(),closedMonths:[],monthlyArchives:{}};
    data.customers=[];data.activeBill=[];data.currentCustomer='';data.partyCount=1;
    data.currentEnemyIndex=0;(data.monsters||[]).forEach(m=>m.hp=m.maxHp);
    customerQuery='';salesQuery='';
    pushAfterReset('運用データをまとめて初期化しました');
  }
  function doBackupExport(){
    try{
      const payload={ _type:'otakuba_guild_backup', _version:'4.0', _exportedAt:new Date().toISOString(), data:data };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const d=new Date(); const stamp=d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'_'+('0'+d.getHours()).slice(-2)+('0'+d.getMinutes()).slice(-2);
      a.href=url; a.download='otakuba_backup_'+stamp+'.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      data.settings.lastBackupAt=new Date().toISOString(); save();
      const m=$('backupMsg'); if(m) m.textContent='✅ バックアップを保存しました（ダウンロード先を確認してください）';
      toast('バックアップを保存しました');
    }catch(e){ const m=$('backupMsg'); if(m) m.textContent='❌ 保存に失敗しました: '+e; }
  }
  function doBackupImport(ev){
    const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const parsed=JSON.parse(r.result);
        const incoming=(parsed&&parsed.data)?parsed.data:parsed;
        if(!incoming||typeof incoming!=='object'||(!incoming.menu&&!incoming.monsters&&!incoming.settings)){ toast('このファイルはバックアップとして読めません'); return; }
        const cnt=`メニュー${(incoming.menu||[]).length}件 / 敵${(incoming.monsters||[]).length}件 / 顧客${(incoming.customers||[]).length}件 / 売上${(incoming.sales||[]).length}件`;
        if(!confirm('現在のデータを、このバックアップで置き換えます。\n\n'+cnt+'\n\n※今のデータは上書きされます。よろしいですか？')){ ev.target.value=''; return; }
        Object.keys(incoming).forEach(k=>{ data[k]=incoming[k]; });
        save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
        const m=$('backupMsg'); if(m) m.textContent='✅ 復元しました（'+cnt+'）';
        toast('復元しました');
        render();
      }catch(e){ toast('復元に失敗しました: '+e); }
      ev.target.value='';
    };
    r.readAsText(f);
  }
  // ===== テーマパック（配布用）：見た目・演出だけを書き出す/読み込む =====
  // 店舗名・GAS URL・管理パスワード・営業設定・顧客・売上・メニュー（商品）には一切触らない。
  // 「敵」と「見た目・演出まわりの設定」だけを対象にする。
  const THEME_PACK_SETTINGS_KEYS=['themeCustom','audioFiles','uiTheme','gachaEffect','defeatEffect'];
  // テーマパック内で「bgm/xxx.mp3」「se/xxx.mp3」のような相対パス参照を全部拾い出す。
  // これらは颯さんのGitHub内にしか実体がないため、テーマパックのJSONだけ渡しても購入者側では無音になる。
  // 実物のファイルも一緒に送る必要がある、という案内に使う。
  function collectThemeAudioFileRefs_(themeSettings, monsters){
    const refs=new Set();
    const isLocalAudioPath=(v)=> typeof v==='string' && /^(bgm|se)\//i.test(v);
    if(themeSettings.audioFiles){
      Object.values(themeSettings.audioFiles).forEach(group=>{
        if(group && typeof group==='object'){ Object.values(group).forEach(v=>{ if(isLocalAudioPath(v)) refs.add(v); }); }
        else if(isLocalAudioPath(group)) refs.add(group);
      });
    }
    (monsters||[]).forEach(m=>{ if(m && isLocalAudioPath(m.bgm)) refs.add(m.bgm); });
    return Array.from(refs);
  }
  function doThemePackExport(){
    try{
      const themeSettings={};
      THEME_PACK_SETTINGS_KEYS.forEach(k=>{ if(data.settings[k]!==undefined) themeSettings[k]=data.settings[k]; });
      const monsters=data.monsters||[];
      const payload={
        _type:'otakuba_theme_pack', _version:'1.0', _exportedAt:new Date().toISOString(),
        theme:{ monsters, settings:themeSettings }
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const name=(prompt('テーマパックのファイル名（例：horror）', 'theme')||'theme').replace(/[^\w\-]/g,'_');
      a.href=url; a.download='themepack_'+name+'.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      const audioRefs=collectThemeAudioFileRefs_(themeSettings, monsters);
      if(audioRefs.length){
        alert('⚠️このテーマは以下のBGM/SEファイルを使っています。JSONファイルだけでは音声の実体は含まれないので、下記のファイルの中身（mp3）も一緒に購入者へ送り、購入者のGitHubのbgm/seフォルダに同じファイル名で置いてもらってください：\n\n'+audioRefs.join('\n'));
      }
      toast('テーマパックを書き出しました（店舗情報・顧客・売上・メニューは含まれません）');
    }catch(e){ toast('書き出しに失敗しました: '+e); }
  }
  function doThemePackImport(ev){
    const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const parsed=JSON.parse(r.result);
        const incoming=(parsed&&parsed.theme)?parsed.theme:parsed;
        if(!incoming||typeof incoming!=='object'||(!incoming.monsters&&!incoming.settings)){ toast('このファイルはテーマパックとして読めません'); ev.target.value=''; return; }
        const cnt=`敵${(incoming.monsters||[]).length}体 / 見た目・演出設定`;
        if(!confirm('このテーマパックを適用します。\n\n'+cnt+'\n\n※店舗名・GAS URL・管理パスワード・営業設定・顧客・売上・メニュー（商品）は変更されません。敵と見た目・演出だけが変わります。よろしいですか？')){ ev.target.value=''; return; }
        if(Array.isArray(incoming.monsters)) data.monsters=incoming.monsters;
        if(incoming.settings){
          THEME_PACK_SETTINGS_KEYS.forEach(k=>{ if(incoming.settings[k]!==undefined) data.settings[k]=incoming.settings[k]; });
        }
        save(); if(GuildStorage.pushCloud)GuildStorage.pushCloud();
        const m=$('backupMsg'); if(m) m.textContent='✅ テーマパックを適用しました（'+cnt+'）';
        toast('テーマパックを適用しました');
        render();
        // BGM/SEの実ファイルが、このサイトのbgm/seフォルダにちゃんと置かれているか確認する
        const audioRefs=collectThemeAudioFileRefs_(incoming.settings||{}, incoming.monsters||[]);
        if(audioRefs.length){
          Promise.all(audioRefs.map(function(path){
            return fetch(path,{method:'HEAD'}).then(function(res){ return {path:path, ok:res.ok}; }).catch(function(){ return {path:path, ok:false}; });
          })).then(function(results){
            const missing=results.filter(function(r){return !r.ok;}).map(function(r){return r.path;});
            if(missing.length){
              alert('⚠️このテーマが使うBGM/SEのうち、下記のファイルがこのサイトに見つかりませんでした。テーマの提供元から実物のmp3ファイルをもらい、GitHubの該当フォルダに同じファイル名で追加してください：\n\n'+missing.join('\n'));
            }
          });
        }
      }catch(e){ toast('読み込みに失敗しました: '+e); }
      ev.target.value='';
    };
    r.readAsText(f);
  }
  function sysRow(status,label,detail){
    const icon=status==='ok'?'🟢':status==='warn'?'🟡':status==='bad'?'🔴':'⚪';
    return '<div class="admin-card" style="display:flex;align-items:flex-start;gap:10px;margin:8px 0">'+
      '<div style="font-size:22px;line-height:1">'+icon+'</div>'+
      '<div style="flex:1"><div style="font-weight:800">'+esc(label)+'</div>'+(detail?('<div class="tiny" style="margin-top:2px">'+detail+'</div>'):'')+'</div>'+
    '</div>';
  }
  async function renderSysCheck(){
    const s=data.settings||{};
    const gasSet=!!(s.gasUrl&&s.gasUrl.trim());
    const box=$('adminContent');
    box.innerHTML='<h2>🩺 システムチェック</h2>'+
      '<p class="tiny">お店のシステムがちゃんと動いているか、まとめて確認できます。困ったときはまずここを見てください。</p>'+
      '<div id="sysRows">'+sysRow('ok','GitHub Pages（このページ自体）','この画面が表示できている時点で正常に公開されています。')+'</div>'+
      '<div class="toolbar"><button class="btn gold" id="sysRecheck">🔄 再チェック</button></div>';
    const rows=$('sysRows');
    function append(html){ rows.innerHTML+=html; }
    // ライセンス（お支払い状況）
    if(window.GuildLicense && GuildLicense.serverUrl){
      append(sysRow('','お支払い状況','確認中…'));
      try{
        await GuildLicense.checkLicense(data);
        const st=GuildLicense.status;
        if(GuildLicense.offline){
          rows.lastElementChild.outerHTML=sysRow('warn','お支払い状況','確認サーバーと通信できませんでした（一時的な可能性があります。この間はサービスは止まりません）。');
        } else if(st==='suspended'){
          rows.lastElementChild.outerHTML=sysRow('bad','お支払い状況','サービスが停止しています。お支払い状況をご確認のうえ、サポートまでご連絡ください。');
        } else if(st==='grace'){
          rows.lastElementChild.outerHTML=sysRow('warn','お支払い状況','お支払いの確認が取れていません。あと'+(GuildLicense.graceDaysLeft!=null?GuildLicense.graceDaysLeft+'日':'数日')+'で利用停止になります。お早めにご確認ください。');
        } else {
          rows.lastElementChild.outerHTML=sysRow('ok','お支払い状況','正常です。');
        }
      }catch(e){
        rows.lastElementChild.outerHTML=sysRow('warn','お支払い状況','確認できませんでした。');
      }
    }
    // GAS
    if(!gasSet){
      append(sysRow('warn','GAS連携','未設定です。1台だけで使う場合は問題ありませんが、複数端末での同期やDiscord通知を使うには「☁️ 同期」タブでGAS URLを設定してください。'));
    } else {
      append(sysRow('','GAS連携','接続確認中…'));
      try{
        const res=await fetch(s.gasUrl+(s.gasUrl.includes('?')?'&':'?')+'action=ping&v='+Date.now(),{cache:'no-store'});
        const j=await res.json();
        const ok=j&&j.ok;
        rows.lastElementChild.outerHTML=sysRow(ok?'ok':'bad', 'GAS連携', ok?'正常に接続できています。':'応答はありましたが内容が想定外です。「☁️ 同期」タブのURLを確認してください。');
      }catch(e){
        rows.lastElementChild.outerHTML=sysRow('bad','GAS連携','接続できませんでした。URLが正しいか、GASのデプロイが「全員がアクセス可」になっているか確認してください。');
      }
    }
    // QR設定（店舗ID方式を使っているのに stores.json に登録が無い場合の事故防止）
    if(s.storeId && s.storeId.trim()){
      append(sysRow('','QR設定','確認中…'));
      try{
        const stores=await fetch('stores.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json());
        let rec=null;
        if(stores){
          if(Array.isArray(stores.stores)) rec=stores.stores.find(x=>x&&x.id===s.storeId);
          else if(stores.stores && stores.stores[s.storeId]) rec=stores.stores[s.storeId];
          else if(stores[s.storeId]) rec=stores[s.storeId];
        }
        if(!rec){
          rows.lastElementChild.outerHTML=sysRow('bad','QR設定','店舗ID「'+esc(s.storeId)+'」方式のQRを使っていますが、stores.jsonに対応する登録がありません。このままだと、QRで初めて開いた端末がGAS URLを認識できず「準備中」のまま同期できません。「🔳 QR」タブで「GAS直指定方式（?gas=）」に切り替えるか、stores.jsonに登録してください。');
        } else if(!rec.gasUrl || rec.gasUrl.trim()!==((s.gasUrl||'').trim())){
          rows.lastElementChild.outerHTML=sysRow('warn','QR設定','stores.jsonの登録内容が、今設定しているGAS URLと一致していません。QRで開いた端末が別のGASに繋がる可能性があります。stores.jsonの内容を確認してください。');
        } else {
          rows.lastElementChild.outerHTML=sysRow('ok','QR設定','店舗ID「'+esc(s.storeId)+'」はstores.jsonに正しく登録されています。');
        }
      }catch(e){
        rows.lastElementChild.outerHTML=sysRow('warn','QR設定','stores.jsonを確認できませんでした。');
      }
    }
    // Discord
    if(!gasSet){
      append(sysRow('warn','Discord通知','GAS連携が未設定のため通知は送信されません。'));
    } else if((s.notifyOn===false)){
      append(sysRow('warn','Discord通知','「⚙️ 設定」タブで通知がOFFになっています。'));
    } else if(s.discordWebhookUrl&&s.discordWebhookUrl.trim()){
      append(sysRow('ok','Discord通知','この店専用のWebhook URLが設定されています。下のボタンでテスト送信できます。'));
    } else {
      append(sysRow('','Discord通知','この店専用のURLは未設定です（GAS側の既定の通知先が使われます）。下のボタンでテスト送信できます。'));
    }
    // 営業状態
    const bizOpen=!!(s.business&&s.business.open);
    append(sysRow(bizOpen?'ok':'warn','営業状態',bizOpen?'現在「営業中」です。お客様は注文できます。':'現在「準備中」です。お客様の画面には準備中の案内が表示され、新規注文はできません。'));
    // バックアップ
    if(!s.lastBackupAt){
      append(sysRow('warn','バックアップ','まだ一度もバックアップを取っていません。「🧹 reset」タブから保存できます。'));
    } else {
      const days=Math.floor((Date.now()-new Date(s.lastBackupAt).getTime())/86400000);
      const st=days>=14?'bad':days>=7?'warn':'ok';
      append(sysRow(st,'バックアップ','最終バックアップ：'+new Date(s.lastBackupAt).toLocaleString('ja-JP')+'（'+days+'日前）'+(st!=='ok'?'　そろそろ新しいバックアップを取ることをおすすめします。':'')));
    }
    box.insertAdjacentHTML('beforeend','<div class="toolbar"><button class="btn" id="sysDiscordTest">🔔 Discordへテスト通知を送る</button></div><div id="sysDiscordMsg" class="tiny"></div>');
    $('sysRecheck').onclick=renderSysCheck;
    $('sysDiscordTest').onclick=async function(){
      const m=$('sysDiscordMsg'); m.textContent='送信中…';
      try{
        if(window.GuildNotify&&GuildNotify.send){
          await GuildNotify.send({action:'test', message:'🩺 システムチェックからのテスト通知です', time:new Date().toLocaleString('ja-JP')});
          m.textContent='送信しました。Discordの通知チャンネルを確認してください（GAS側が未対応のactionの場合、届かないことがあります）。';
        } else { m.textContent='通知機能が読み込まれていません。'; }
      }catch(e){ m.textContent='送信に失敗しました：'+e; }
    };
  }
  function renderGuide(){
    const sec=(title,body)=>`<details class="guide-section"><summary>${title}</summary><div class="guide-body">${body}</div></details>`;
    $('adminContent').innerHTML='<h2>📖 使い方ガイド</h2>'+
      '<div class="guide-note">困ったときはまずここを開いてください。各項目をタップすると詳しい説明が開きます。</div>'+
      sec('① 最初にやること（初回セットアップ）',
        '<ol>'+
        '<li>画面上部の「🌱 かんたん／🛠 ふつう／⚙️ くわしい」で表示するタブの数を選べます。慣れないうちは「かんたん」がおすすめです。</li>'+
        '<li>「⚙️ 設定」タブの<b>「初回セットアップを確認する」</b>ボタンから、コンセプト（RPG/宇宙/魔法学校）・呼び名・お店情報を最初から選び直せます。</li>'+
        '<li>まずは「🎭 テーマ編集」で世界観を決めてから、「🍴 メニュー」で商品を登録するのがおすすめの順番です。</li>'+
        '</ol>'
      )+
      sec('🎭 テーマ編集タブ（世界観・見た目の設定）',
        '<p>画面上部のサブタブで切り替えます。</p><ul>'+
        '<li><b>🏪 店舗情報</b>：お店の名前・住所・営業時間など、お客様向け画面にも表示される基本情報。</li>'+
        '<li><b>✏️ テキスト</b>：タイトル画面の呼びかけ文や「冒険者」「戦闘」などの呼び名を変更できます。</li>'+
        '<li><b>🎨 カラー</b>：画面の配色（ゴールドなど基調色）そのものを変更できます。</li>'+
        '<li><b>🖼️ UIテーマ</b>：枠線の色・パネルの背景（半透明黒／羊皮紙／ガラス風など）・ボタンの見た目（RPG／SF／魔法学校／和風）・角丸や影・背景ぼかしを設定できます。「🎨 カラー」が色そのものの変更なのに対し、こちらは形・質感の変更です。詳しくは下の「🖼️ UIテーマ」の項目をご覧ください。</li>'+
        '<li><b>💥 撃破演出</b>：敵を倒した瞬間の見せ方（フラッシュ・リングなど）と、演出用の画像を設定します。詳しくは下の「💥 撃破演出」の項目をご覧ください。</li>'+
        '<li><b>🎰 会計ガチャ</b>：会計時の抽選演出を設定します。詳しくは下の「🎰 会計ガチャ」の項目をご覧ください。</li>'+
        '<li><b>🖼️ 画像</b>：タイトル背景・戦闘背景などの画像を差し替えます。</li>'+
        '<li><b>🎵 BGM</b>：タイトル画面・戦闘・討伐後（エンディング）などのBGMを個別に設定できます。</li>'+
        '<li><b>⚔️ キャラクター</b>：注文に応じて登場する「敵」の名前・画像・体力（何注文で倒れるか）・大きさ（未設定の敵は自動で70%表示）を設定します。各敵ごとに「登場時／被弾時／撃破時」のセリフを自由に追加でき、複数登録するとその中からランダムで1つ表示されます（未入力なら何も表示されません）。さらに敵ごとに「撃破演出画像」を個別設定でき、設定しておくとその敵を倒した時だけ専用の画像が表示されます（未設定の敵は共通画像が使われます）。</li>'+
        '<li><b>🗺️ ステージ</b>：ボスの出現条件や演出まわりの設定です。</li>'+
        '<li><b>👁️ プレビュー</b>：変更内容をお客様目線で確認できます。保存前に必ずここでチェックしてください。</li>'+
        '</ul><div class="guide-note">画像はご自身で用意したファイルをアプリ内から直接アップロードして使えます（ファイル形式に迷ったらPNG/JPGが安全です）。⚠️BGM/SE（音声ファイル）は、アプリ内アップロードだと再生できない不具合があるため、GitHubリポジトリの<code>bgm</code>フォルダに直接ファイルをアップロードし、ファイル名（例：<code>bgm/曲名.mp3</code>）を各BGM欄に入力してください。</div>'
      )+
      sec('🖼️ UIテーマ（枠・パネル・ボタンの見た目）',
        '<p>お客様画面の「質素感」を減らすための設定です。特に効果が大きいのは<b>枠内背景を「半透明黒」にして背景ぼかしをONにする</b>組み合わせで、これだけで高級感がかなり変わります。</p><ul>'+
        '<li><b>枠線の色</b>：金・銀・青・赤・緑・カスタムカラーから選べます。</li>'+
        '<li><b>枠内背景</b>：黒／半透明黒／半透明青／羊皮紙／木目／ガラス風／カスタム画像。</li>'+
        '<li><b>ボタンスタイル</b>：RPG／SF／魔法学校／和風の4種類で、ボタンの角の丸さや質感が変わります。</li>'+
        '<li><b>ボタン角丸・枠の太さ・枠の角丸</b>：スライダーで細かく調整できます。</li>'+
        '<li><b>ボタン影・背景ぼかし</b>：ON/OFFの切り替えです。</li>'+
        '</ul><p class="tiny">「既定に戻す」を押すと、いつでも標準の見た目に戻せます。</p>'
      )+
      sec('💥 撃破演出（敵を倒した時の見せ方）',
        '<p>敵を倒した瞬間の演出です。<b>演出スタイル</b>（通常のポップ／フラッシュ／リング）は全ての敵で共通です。</p>'+
        '<p><b>撃破画像</b>は「撃破時に画像を表示する」をONにすると使えます。ここで設定した画像が全ての敵の共通画像になりますが、「⚔️ キャラクター」タブの各モンスター編集内で敵ごとに専用の撃破画像を設定すると、その敵だけはそちらが優先されます（雑魚は共通画像、ボスだけ専用の絵、といった使い方もできます）。</p>'
      )+
      sec('🎰 会計ガチャ（会計時の抽選演出）',
        '<p>会計（お客様の退店・お支払い完了）のタイミングで抽選演出を挟んでから、レシート画面を表示する機能です。</p><ul>'+
        '<li><b>ON/OFF</b>：使わない場合はOFFのままでOKです（今まで通り、会計後すぐレシートが出ます）。</li>'+
        '<li><b>レアリティ</b>：好きな数だけ追加・削除できます。それぞれに名前・<b>確率（%）</b>・色・画像を設定します。全レアリティの確率の合計が100%になるように調整してください（画面にリアルタイムで合計が表示されます）。</li>'+
        '<li><b>画像は1つのレアリティに複数登録できます</b>（1行に1枚）。複数登録しておくと、そのレアリティが当たるたびに、その中から完全ランダムで1枚が選ばれます（同じ「SSR」でも毎回違う絵が出せます）。</li>'+
        '<li><b>豪華演出にする</b>：チェックを入れたレアリティは、当たった時に光の放射線とキラキラエフェクトが追加されます。SR・SSRなど当たりにくいものに付けるのがおすすめです。</li>'+
        '<li>会計金額が0円（未注文のまま退店）の時はガチャは出ません。</li>'+
        '<li>お客様側は、出てきたカード画像を「📥 画像を保存」ボタンからご自身のスマホに保存できます（写真として保存／ファイルとして保存、どちらも選べます）。</li>'+
        '</ul>'
      )+
      sec('🍴 メニュータブ（商品登録）',
        '<p>ビール・サワー／焼酎・カクテル／ショット・ボトル／ソフトドリンク／フードなどのカテゴリごとに商品を登録・編集・削除できます。商品名・価格・ダメージ量（1杯で敵にどれだけダメージが入るか）を設定してください。</p>'
      )+
      sec('🟢 営業タブ（営業中/準備中の切り替え）',
        '<p>「営業開始」を押すと注文受付が始まり、お客様のQR画面も通常のタイトル画面に切り替わります。全ての敵のHPもこのタイミングで全回復し、新しい1日として始まります。</p>'+
        '<p>「営業終了」を押すと、売上・注文数を確認するダイアログが出ます。確定すると当日の日報が保存され、それ以降お客様のQR画面は「本日は準備中です」の案内表示になり、新規注文はできなくなります（すでに会計待ちのお客様は会計だけ可能です）。</p>'+
        '<div class="guide-note">管理画面の右上には常に🟢営業中／🔴準備中のバッジが表示されるので、今の状態が一目で分かります。</div>'
      )+
      sec('💰 会計・売上タブ',
        '<p>お客様ごとの会計内容や、期間ごとの売上集計を確認できます。会計確定後、お客様の画面には明細と合計金額が表示され、「確認完了」を押すまで最初の画面には戻りません。</p>'
      )+
      sec('🔳 QRタブ',
        '<p>お客様がスマホから注文画面を開くためのQRコードを発行できます。テーブルに設置する用途を想定しています。</p>'
      )+
      sec('🩺 システムチェックタブ',
        '<p>GAS連携・Discord通知・営業状態・バックアップの状態をまとめて確認できます。🟢は正常、🟡は注意、🔴は要対応です。トラブルが起きた時はまずここを開いてください。Discordのテスト通知もここから送れます。契約プランによっては、お支払い状況もここに表示されます。</p>'+
        '<p>店舗ID方式（?store=）のQRを使っている場合は、<b>QR設定</b>の項目もここに表示されます。stores.jsonへの登録漏れがあると🔴で警告されるので、「QRで開くと準備中のまま」といった事故に事前に気づけます。</p>'
      )+
      sec('🏪 店舗ロゴについて',
        '<p>「🎭 テーマ編集 → 🏪 店舗情報」で店舗ロゴ画像のURLを登録すると、お客様のタイトル画面と「店舗情報」ボタンの両方にロゴが表示されます。未設定の場合は何も表示されません。</p>'
      )+
      sec('🧑‍🤝‍🧑 パーティ人数・同行者登録について',
        '<p>お客様がパーティ人数を入力する画面で、代表者以外の人数分「名前・アイコン」を入力する欄が自動で表示されます（任意入力、空欄でもOK）。</p><ul>'+
        '<li>入力された同行者は、その場でLv.1・来店1回として顧客リストに登録されます。</li>'+
        '<li>同じ名前がすでに登録済みの場合は、確認なしでその人として来店回数だけ+1されます（代表者の登録時のような確認ダイアログは出ません）。</li>'+
        '<li>一度登録しておくと、次回その同行者が一人だけで来店した時も、名前入力画面の「📋 登録済みの冒険者から選ぶ」からその人を選べば、レベルや来店回数を引き継げます。</li>'+
        '</ul>'
      )+
      sec('👤 顧客タブ',
        '<p>来店したお客様の一覧・レベル・来店回数を確認できます。名前で検索も可能です。パーティ人数画面で登録した同行者も、ここに同じ顧客として一覧表示されます。</p>'
      )+
      sec('⚙️ 設定タブ（重要な設定はここに集約）',
        '<ul>'+
        '<li><b>🎮 ゲームモード</b>：ONなら今まで通りの討伐演出つきモバイルオーダー、OFFなら演出なしの「ただのメニュー＋カート＋会計」になります（お客様の名前登録・レベル・討伐画面は出ません）。カバーチャージや会計・注文履歴の保存はOFFでも引き続き動きます。あわせて「お客様がタイトル画面でゲーム/通常メニューを選べるようにする」もONにしておくと、タイトル画面に切替ボタンが出て、<b>お客様一人一人がその場でどちらか選べます</b>（選択はその来店だけの一時的なもので、会計が終わるとリセットされ、次のお客様はまた自由に選べます）。イベント等で店側が一つのモードに統一したい時は、この切替ボタンの表示だけOFFにできます。さらに「注意喚起を表示する」をONにしておくと、<b>ゲームモードを選んで最初にメニューを開いた時だけ</b>、演出目的の注文を控えてもらうための注意文が1回だけ表示されます（同じ来店中にメニューへ戻っても再表示されず、会計後の次のお客様にはまた新しく表示されます）。</li>'+
        '<li><b>基本設定</b>：通貨単位、チャージ料金、<b>管理パスワード</b>（この管理画面に入るためのパスワードです。必ず初期値から変更してください）、カートモードのON/OFF。</li>'+
        '<li><b>通知・連携</b>：<b>GAS URL</b>（Googleスプレッドシートと連携するためのURL）と、<b>Discord通知URL</b>（注文や会計をDiscordに通知したい場合のウェブフックURL）を設定します。</li>'+
        '<li><b>レベル計算方式</b>：お客様のレベルを「来店回数」か「合計金額」のどちらで上げるか選べます。</li>'+
        '<li><b>本日のお知らせ</b>：お客様の注文画面に表示するお知らせ文を設定できます。</li>'+
        '</ul>'
      )+
      sec('📜 利用規約について',
        '<p>初回セットアップ画面の一番下と、管理画面ヘッダーの「📜 利用規約」ボタンから、いつでも内容を確認できます。文言を直したい場合は<b>terms.js</b>というファイルの中身を書き換えれば、両方の表示に同時に反映されます。</p>'
      )+
      sec('☁️ 同期タブ（データのバックアップ・連携）',
        '<p>GAS URLを保存すると「接続テスト」ができます。<b>GASから全取得</b>で他端末のデータをこの端末に反映、<b>全データ送信</b>でこの端末の内容をクラウドに送れます。複数端末（スマホ+タブレットなど）で使う場合はここで同期してください。</p>'
      )+
      sec('🧹 resetタブ（取り扱い注意）',
        '<div class="guide-note">⚠️ ここでのリセット操作は元に戻せません。テスト運用のデータを消して本番運用を始めたいときなど、内容をよく確認してから使ってください。</div>'
      )+
      sec('⚠️ 著作権について（画像・BGMを差し替える前に）',
        '<div class="guide-note">背景・キャラクター画像・BGMは自由に差し替えできますが、差し替える素材の権利関係はご自身でご確認ください。</div>'+
        '<ul>'+
        '<li>アニメ・ゲーム・漫画などの<b>公式の画像やキャラクターをそのまま使用する</b>ことは著作権侵害にあたる可能性があります。SNS投稿などで公開する場合は特に注意してください。</li>'+
        '<li><b>フリー音源・フリー画像素材を使う場合も、それぞれのサイトの利用規約を必ず確認してください。</b>「商用利用可」でも「クレジット表記が必須」「加工禁止」「一定数以上の同時使用禁止」など、サイトごとにルールが異なります。</li>'+
        '<li>例：本テンプレートに標準搭載しているBGM・SEは「魔王魂」様の素材で、規約上クレジット表記（作曲者名の記載）で利用可能です。ただし<b>差し替え用に別サイトの音源を使う場合、そのサイトのルールは魔王魂とは別物</b>です。無料だからといって同じ条件とは限りません。</li>'+
        '<li>心配な場合は、その素材サイトの「利用規約」「よくある質問」ページを一度読んでからのご利用をおすすめします。</li>'+
        '</ul>'
      )+
      sec('よくある質問',
        '<div id="guideFaqBody"><ul>'+
        '<li><b>Q. お客様の画面と管理画面は同じURLですか？</b><br>A. いいえ。お客様は index.html（トップ画面）、店舗側は admin.html（管理画面）を使います。</li>'+
        '<li><b>Q. 画像やBGMを変えても反映されません</b><br>A. ブラウザのキャッシュが原因のことがあります。ページを再読み込みしてみてください。</li>'+
        '<li><b>Q. 複数端末で内容がズレます</b><br>A. 「☁️ 同期」タブでGAS URLを設定し、こまめに送信/取得を行ってください。</li>'+
        '</ul></div>'
      )+
      sec('📩 お問い合わせ',
        '<div id="guideSupportBody"><p class="tiny">ガイドを見ても解決しない場合は、販売元にお問い合わせください。</p></div>'
      );
    // ここから先は中央サーバーから最新のFAQ/お問い合わせ先を取得し、上の内容を上書きする。
    // 取得できない場合（未設定・オフライン等）は、上で表示した内容のまま変わらない。
    if(window.GuildLicense && GuildLicense.serverUrl){
      fetch(GuildLicense.serverUrl+(GuildLicense.serverUrl.includes('?')?'&':'?')+'action=guideContent&v='+Date.now(),{cache:'no-store'})
        .then(r=>r.json())
        .then(j=>{
          if(!j || !j.ok) return;
          if(Array.isArray(j.faq) && j.faq.length && $('guideFaqBody')){
            $('guideFaqBody').innerHTML='<ul>'+j.faq.map(function(item){
              return '<li><b>Q. '+esc(item.q||'')+'</b><br>A. '+esc(item.a||'')+'</li>';
            }).join('')+'</ul>';
          }
          if(j.supportDiscordUrl && $('guideSupportBody')){
            $('guideSupportBody').innerHTML='<p class="tiny">ガイドを見ても解決しない場合は、こちらのDiscordからお問い合わせください。</p>'+
              '<div class="toolbar"><a class="btn gold" href="'+esc(j.supportDiscordUrl)+'" target="_blank" rel="noopener">💬 サポートDiscordを開く</a></div>';
          }
        })
        .catch(function(){ /* 取得失敗時は元の表示のまま。何もしない */ });
    }
  }
  function renderReset(){
    const ss=salesSettings();
    const monthList=activeSales().filter(x=>saleMonth(x)===ss.currentMonth);
    const orderCount=(data.sales||[]).length;
    const monthTotal=sumSales(monthList);
    $('adminContent').innerHTML=`<h2>🧹 個別初期化</h2>
      <div class="admin-card" style="border-color:var(--gold)">
        <div class="admin-card-title">💾 バックアップ / 復元</div>
        <p class="tiny">全データ（メニュー・敵・顧客・売上・設定・営業記録）をファイルに保存できます。初期化やスマホ変更の前に取っておくと安心です。</p>
        <div class="toolbar">
          <button class="btn gold" id="backupExport">バックアップを保存</button>
          <label class="btn green" style="cursor:pointer">復元（ファイル選択）<input id="backupImport" type="file" accept="application/json,.json" style="display:none"></label>
        </div>
        <div id="backupMsg" class="tiny"></div>
      </div>
      <div class="admin-card" style="border-color:var(--gold)">
        <div class="admin-card-title">🎨 テーマパック（見た目・演出だけ配布用）</div>
        <p class="tiny">敵・配色・用語・BGM/SE・ボタンの見た目・撃破演出・ガチャの画像だけをファイルにまとめます。<b>店舗名・GAS URL・管理パスワード・営業設定・顧客・売上・メニュー（商品）は一切含まれません／変更されません。</b>ホラー・戦国・お伽話…のようにテーマごとにファイルを分けて配布できます。</p>
        <div class="toolbar">
          <button class="btn gold" id="themePackExport">今のテーマをパックとして書き出す</button>
          <label class="btn green" style="cursor:pointer">テーマパックを読み込む（ファイル選択）<input id="themePackImport" type="file" accept="application/json,.json" style="display:none"></label>
        </div>
      </div>
      <div class="billbox">必要なものだけ初期化できます。メニューや敵データは、押した項目以外は残ります。</div>
      <div class="grid">
        <div class="admin-card"><div class="admin-card-title">討伐進行</div><p class="tiny">現在の敵・HP・注文中データをリセット</p><button class="btn red" id="resetProgress">討伐進行を初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">現在の注文中</div><p class="tiny">未会計の商品・選択中冒険者・人数だけ初期化</p><button class="btn red" id="resetActiveBill">注文中データを初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">注文履歴</div><p class="tiny">現在 ${orderCount} 件。GAS同期で復活しないよう削除済みIDも保存</p><button class="btn red" id="resetOrderHistory">注文履歴を初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">売上概要</div><p class="tiny">${esc(ss.currentMonth)} / 今月 ${yen(monthTotal,data.settings.currency)}。月別履歴も初期化</p><button class="btn red" id="resetSalesOverview">売上概要を初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">顧客データ</div><p class="tiny">冒険者 ${data.customers.length} 件。来店回数・累計も空にします</p><button class="btn red" id="resetCustomers">顧客データを初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">メニュー</div><p class="tiny">テストメニューを消して、本番メニューへ入れ替える時用</p><button class="btn red" id="resetMenuData">メニューを空にする</button></div>
        <div class="admin-card"><div class="admin-card-title">本日のお知らせ</div><p class="tiny">タイトル・本文・表示位置を初期状態へ戻します</p><button class="btn red" id="resetNotice">お知らせを初期化</button></div>
        <div class="admin-card"><div class="admin-card-title">在庫・状態</div><p class="tiny">在庫数・売切れ・おすすめ・限定を初期化</p><button class="btn red" id="resetInventory">在庫を初期化</button></div><div class="admin-card"><div class="admin-card-title">日報・営業</div><p class="tiny">営業状態と保存済み日報を初期化</p><button class="btn red" id="resetDailyReports">日報を初期化</button></div><div class="admin-card"><div class="admin-card-title">運用データ一括</div><p class="tiny">メニュー・敵・設定・GAS URLは残して、履歴/売上/顧客/進行を初期化</p><button class="btn red" id="resetAllLocal">運用データをまとめて初期化</button></div>
      </div>`;
    $('backupExport').onclick=doBackupExport;
    $('backupImport').onchange=doBackupImport;
    $('themePackExport').onclick=doThemePackExport;
    $('themePackImport').onchange=doThemePackImport;
    $('resetProgress').onclick=()=>{if(confirmReset('討伐進行','現在の敵を最初に戻し、敵HPと注文中データを初期化します。')){GuildStorage.resetProgress();toast('討伐進行を初期化しました');renderReset();}};
    $('resetActiveBill').onclick=resetActiveBill;
    $('resetOrderHistory').onclick=resetOrderHistory;
    $('resetSalesOverview').onclick=resetSalesOverview;
    $('resetCustomers').onclick=resetCustomers;
    $('resetMenuData').onclick=resetMenuData;
    $('resetNotice').onclick=resetNotice;
    $('resetInventory').onclick=resetInventory;
    $('resetDailyReports').onclick=resetDailyReports;
    $('resetAllLocal').onclick=resetAllLocal;
  }
  function goto(tabId,subTab){ current=tabId; if(subTab) themeSubTab=subTab; renderTabs(); render(); }
  function renderDash(){
    const ss=salesSettings();
    const monthList=activeSales().filter(x=>saleMonth(x)===ss.currentMonth);
    const today=activeSales().filter(s=>saleDay(s)===todayKey()&&saleMonth(s)===ss.currentMonth);
    const total=sumSales(monthList);
    const todayTotal=sumSales(today);
    const cover=chargeTotal(monthList);
    const e=data.monsters[data.currentEnemyIndex]||{};
    const shopName=(data.settings.storeInfo&&data.settings.storeInfo.name)||data.settings.storeName||data.settings.shopName||(window.GuildTheme?GuildTheme.b('shopName'):'')||'-';
    const themeName=(window.GuildTheme?GuildTheme.b('appName'):'')||shopName||'-';
    const activeBillTotal=(data.activeBill||[]).reduce((a,i)=>a+(Number(i.subtotal)||0),0);
    const activeBillCount=(data.activeBill||[]).length;
    const curCustomer=data.currentCustomer||'-';
    const pwWarning = (data.settings.adminPassword||'')==='OTAKU' ? `<div class="admin-card" style="border-color:var(--red)"><div class="admin-card-title" style="color:var(--red)">⚠️ 管理パスワードが初期値のままです</div><p class="tiny">このテンプレート共通の初期パスワード「OTAKU」のままだと、他の人にも管理画面を開かれてしまう可能性があります。上のモード切替を「くわしい」にして、「設定」→「基本設定」から今すぐ変更してください。</p></div>` : '';
    $('adminContent').innerHTML=`
      <h2>ホーム</h2>
      ${pwWarning}
      <div class="grid dash-grid">
        <div class="admin-card"><div class="admin-card-title">🏪 店舗名</div>${esc(shopName)}</div>
        <div class="admin-card"><div class="admin-card-title">🎭 現在テーマ</div>${esc(themeName)}</div>
        <div class="admin-card"><div class="admin-card-title">💰 本日の売上</div>${yen(todayTotal,data.settings.currency)}<br><span class="tiny">会計 ${today.length}件</span></div>
        <div class="admin-card"><div class="admin-card-title">🧾 現在会計</div>${activeBillCount?yen(activeBillTotal,data.settings.currency):'なし'}<br><span class="tiny">${esc(curCustomer)} / ${activeBillCount}品</span></div>
        <div class="admin-card"><div class="admin-card-title">⚔️ 現在対象</div>${esc(e.name||'-')}<br><span class="tiny">HP ${e.hp||0}/${e.maxHp||0}</span></div>
        <div class="admin-card"><div class="admin-card-title">👤 登録顧客数</div>${data.customers.length}名</div>
        <div class="admin-card"><div class="admin-card-title">📅 今月売上</div>${yen(total,data.settings.currency)}<br><span class="tiny">${esc(ss.currentMonth)} / 席料 ${yen(cover,data.settings.currency)}</span></div>
      </div>
      <h3 class="dash-sub-h">まずはこちら</h3>
      <div class="grid dash-quick">
        <button class="admin-card quick-card" data-goto="themeEditor" data-sub="store"><div class="quick-icon">🏪</div>店舗</button>
        <button class="admin-card quick-card" data-goto="themeEditor" data-sub="text"><div class="quick-icon">🎭</div>テーマ</button>
        <button class="admin-card quick-card" data-goto="menu"><div class="quick-icon">🍴</div>メニュー</button>
        <button class="admin-card quick-card" data-goto="sales"><div class="quick-icon">💰</div>会計</button>
      </div>`;
    document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>goto(b.dataset.goto,b.dataset.sub));
  }
  function render(){if(current==='dash')renderDash(); if(current==='guide')renderGuide(); if(current==='syscheck')renderSysCheck(); if(current==='business')renderBusiness(); if(current==='menu')renderMenu(); if(current==='inventory')renderInventory(); if(current==='settings')renderSettings(); if(current==='themeEditor')renderThemeEditor(); if(current==='qr')renderQR(); if(current==='customers')renderCustomers(); if(current==='sales')renderSales(); if(current==='sync')renderSync(); if(current==='reset')renderReset();}
  loginOk()?showApp():showLogin();
})();
