(async function(){
  const {$, esc, yen} = GuildUtils;
  if(window.GuildTheme) await GuildTheme.init();
  const data = await GuildStorage.init();
  const SESSION='otakuba.v3.final.admin.session';
  // モード（Easy/Normal/Hard）: 各タブがどのモード以上で表示されるかを持つ。上位モードは下位モードのタブも全て含む（累積表示）
  const MODE_ORDER=['easy','normal','hard'];
  const MODE_LABEL={easy:'🌱 かんたん',normal:'🛠 ふつう',hard:'⚙️ くわしい'};
  const tabs=[
    ['dash','🏠 ホーム','easy'],
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
  const THEME_SUBTABS=[['store','🏪 店舗情報'],['text','✏️ テキスト'],['image','🖼️ 画像'],['bgm','🎵 BGM'],['character','⚔️ キャラクター'],['stage','🗺️ ステージ'],['preview','👁️ プレビュー']];
  let themeSubTab='store';
  const MODE_KEY='otakuba.admin.mode';
  // 既存ユーザーの操作感を壊さないよう、初回デフォルトは「くわしい」＝これまで通り全タブ表示。新規は店側の判断でモード変更可能。
  function loadMode(){ try{ const m=localStorage.getItem(MODE_KEY); return MODE_ORDER.includes(m)?m:'hard'; }catch(e){ return 'hard'; } }
  function saveMode(m){ try{ localStorage.setItem(MODE_KEY,m); }catch(e){} }
  let currentMode=loadMode();
  function visibleTabs(){ const maxIdx=MODE_ORDER.indexOf(currentMode); return tabs.filter(t=>MODE_ORDER.indexOf(t[2])<=maxIdx); }
  let current='dash', customerQuery='', salesQuery='';
  function loginOk(){return sessionStorage.getItem(SESSION)==='ok'} function showLogin(){$('adminLogin').classList.remove('hidden');$('adminApp').classList.add('hidden')} function showApp(){$('adminLogin').classList.add('hidden');$('adminApp').classList.remove('hidden');const hn=data.settings.storeInfo&&data.settings.storeInfo.name||data.settings.storeName||data.settings.shopName||(window.GuildTheme?GuildTheme.b('shopName'):'')||'';if($('adminHeadTitle'))$('adminHeadTitle').textContent=(hn?hn+' ':'')+'管理室';renderModeBar();renderTabs();render();startAutoRefresh()}
  let autoTimer=null;
  function startAutoRefresh(){ if(autoTimer)clearInterval(autoTimer); autoTimer=setInterval(async()=>{
    // 概要・顧客・履歴を見ている時だけ自動取得。入力中は邪魔しない
    if(!['dash','customers','sales'].includes(current))return;
    const ae=document.activeElement; if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'))return;
    const ok=await GuildStorage.pullCloud(); if(ok)render();
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
  function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1500)}
  function save(){GuildStorage.save()}
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
    data.settings.categories=fixed;
    return fixed;
  }
  function normalizeProduct(p,i){p=p||{};p.id=p.id||GuildUtils.uid('menu');p.cat=p.cat||p.category||'food';p.category=p.cat;p.name=p.name||'商品';p.price=Number(p.price)||0;p.emoji=p.emoji||p.icon||'🍽️';p.icon=p.emoji;p.desc=p.desc||'';p.image=p.image||'';p.hidden=!!p.hidden;p.soldOut=!!p.soldOut;p.recommended=!!p.recommended;p.limited=!!p.limited;if(p.stock===null||typeof p.stock==='undefined')p.stock='';else if(p.stock!=='')p.stock=Math.max(0,Number(p.stock)||0);p.sort=Number(p.sort||i);return p}
  function renderMenu(){
    data.menu=(data.menu||[]).map(normalizeProduct);
    const cs=cats();
    const opts=cs.map(c=>`<option value="${esc(c.id)}">${esc((c.icon?c.icon+' ':'')+c.name)}</option>`).join('');
    $('adminContent').innerHTML=`<h2>🍴 メニュー管理</h2>
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
  function productCard(p,i,opts){return `<div class="admin-card product-edit-card" data-menu-index="${i}"><div class="admin-card-title">#${i+1} ${esc(p.name)}</div><label>商品名<input data-field="name" value="${esc(p.name)}"></label><label>ジャンル<select data-field="cat">${opts}</select></label><label>価格<input data-field="price" type="number" value="${p.price}"></label><label>絵文字<input data-field="emoji" value="${esc(p.emoji)}"></label><label>画像<input data-field="image" value="${esc(p.image)}"></label><label>在庫<input data-field="stock" type="number" min="0" placeholder="空欄=無制限" value="${p.stock===''?'':p.stock}"></label><label>説明<textarea data-field="desc">${esc(p.desc)}</textarea></label><label class="check-row"><input data-field="recommended" type="checkbox" ${p.recommended?'checked':''}>⭐おすすめ</label><label class="check-row"><input data-field="limited" type="checkbox" ${p.limited?'checked':''}>👑限定</label><label class="check-row"><input data-field="soldOut" type="checkbox" ${p.soldOut?'checked':''}>❌売切れ</label><label class="check-row"><input data-field="hidden" type="checkbox" ${p.hidden?'checked':''}>非表示</label><button class="btn red small" data-del-product="${i}">削除</button></div>`}
  function saveMenuForm(){document.querySelectorAll('[data-menu-index]').forEach(card=>{const p=data.menu[+card.dataset.menuIndex];p.name=card.querySelector('[data-field="name"]').value;p.cat=card.querySelector('[data-field="cat"]').value;p.category=p.cat;p.price=+card.querySelector('[data-field="price"]').value||0;p.emoji=card.querySelector('[data-field="emoji"]').value||'🍽️';p.icon=p.emoji;p.image=card.querySelector('[data-field="image"]').value;p.desc=card.querySelector('[data-field="desc"]').value;p.stock=card.querySelector('[data-field="stock"]').value===''?'':Math.max(0,+card.querySelector('[data-field="stock"]').value||0);p.recommended=card.querySelector('[data-field="recommended"]').checked;p.limited=card.querySelector('[data-field="limited"]').checked;p.soldOut=card.querySelector('[data-field="soldOut"]').checked;p.hidden=card.querySelector('[data-field="hidden"]').checked});data.settings.menuPushedAt=new Date().toISOString();save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();}
  function customerListHtml(){const q=customerQuery.toLowerCase();const list=(data.customers||[]).map((c,i)=>({c,i})).filter(({c})=>!q||[c.name,c.title,c.memo,c.id].some(v=>String(v||'').toLowerCase().includes(q)));return list.length?list.map(({c,i})=>customerCard(c,i)).join(''):'<div class="empty">なし</div>';}
  function refreshCustomerList(){const box=$('customerListBox');if(box)box.innerHTML=customerListHtml();bindCustomerListEvents();}
  function bindCustomerListEvents(){document.querySelectorAll('[data-del-customer]').forEach(b=>b.onclick=()=>{if(confirm('削除しますか？')){data.customers.splice(+b.dataset.delCustomer,1);save();refreshCustomerList()}});document.querySelectorAll('[data-sales-of]').forEach(b=>b.onclick=()=>{salesQuery=data.customers[+b.dataset.salesOf].name;current='sales';renderTabs();renderSales()})}
  function renderCustomers(){$('adminContent').innerHTML=`<h2>👤 顧客管理</h2><div class="toolbar searchbar"><input id="customerSearch" placeholder="顧客検索（Enterで検索）" value="${esc(customerQuery)}" enterkeyhint="search"><button class="btn" id="customerSearchBtn">検索</button><button class="btn gold" id="addCustomer">追加</button><button class="btn green" id="saveCustomers">保存</button><button class="btn" id="jsonCustomers">JSON</button></div><div class="customer-list" id="customerListBox">${customerListHtml()}</div>`;const si=$('customerSearch');const run=()=>{customerQuery=si.value;refreshCustomerList()};si.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();si.focus()}});$('customerSearchBtn').onclick=()=>{run();si.focus()};$('addCustomer').onclick=()=>{saveCustomerForm();data.customers.unshift({id:GuildUtils.uid('cust'),name:'新規冒険者',avatar:'🙂',level:1,title:'新米冒険者',visits:0,total:0,lastVisit:'',memo:''});save();refreshCustomerList()};$('saveCustomers').onclick=()=>{saveCustomerForm();toast('保存しました')};$('jsonCustomers').onclick=()=>textareaEditor('customers','customers.json');bindCustomerListEvents()}
  function customerCard(c,i){const sales=(data.sales||[]).filter(s=>s.customer===c.name);return `<div class="admin-card customer-card" data-customer-index="${i}"><div class="customer-head"><div class="admin-card-title">${GuildUtils.avatarTag(c)}${esc(c.name)}</div><span class="badge">${esc(c.id||'')}</span></div><div class="customer-mini-grid"><label>アイコン(絵文字1文字)<input data-field="avatar" value="${esc(c.avatar||'🙂')}" maxlength="4"></label><label>名前<input data-field="name" value="${esc(c.name||'')}"></label><label>Lv<input data-field="level" type="number" value="${c.level||1}"></label><label>二つ名<input data-field="title" value="${esc(c.title||'')}"></label><label>来店<input data-field="visits" type="number" value="${c.visits||0}"></label><label>累計<input data-field="total" type="number" value="${c.total||0}"></label><label>最終<input data-field="lastVisit" value="${esc(c.lastVisit||'')}"></label></div>${c.avatarImage?'<div class="tiny">📷 この端末で撮影/選択した画像アイコンが設定されています（他の端末には表示されません）</div>':''}<label class="wide-label">メモ<textarea data-field="memo">${esc(c.memo||'')}</textarea></label><div class="billbox">履歴 ${sales.length}件</div><div class="toolbar"><button class="btn small" data-sales-of="${i}">履歴を見る</button><button class="btn red small" data-del-customer="${i}">削除</button></div></div>`}
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
  var RPG_BARE_FILES=['slime.png','goblin.png','orc.png','skeleton.png','mimic.png','minotaur.png','gargoyle.png','dragon.png','dark_wizard.png','maou.png','maou_new.png','grass.png','forest.png','cave.png','ruins.png','volcano.png','castle.png','victory_clear.PNG','background.jpg'];
  var PRESET_LABELS={rpg:'⚔️ RPG',space:'🚀 SF',magic:'🪄 魔法学校'};
  function activePresetId(){ return (data.settings&&data.settings.currentPresetId)||'rpg'; }
  function scopedList(list,presetId){ var prefix='presets/'+presetId+'/'; return list.filter(function(v){ return v.indexOf(prefix)===0; }); }
  function themeScopedBgList(){ return scopedList(BG_LIST,activePresetId()); }
  function themeScopedImgList(){ return scopedList(IMG_LIST,activePresetId()); }
  function fixAssetPath(v){ return (v && RPG_BARE_FILES.indexOf(v)!==-1) ? ('presets/rpg/'+v) : v; }
  function normalizeMonster(m,i){m=m||{};var hpMax=Number(m.maxHp||m.hp||500)||500;m.id=m.id||GuildUtils.uid('enemy');m.name=m.name||('敵'+(i+1));m.stage=m.stage||'草原';m.maxHp=hpMax;m.hp=Number.isFinite(Number(m.hp))?Number(m.hp):hpMax;m.bg=fixAssetPath(m.bg||m.background)||'presets/rpg/grass.png';m.background=m.bg;m.image=fixAssetPath(m.image)||'presets/rpg/slime.png';m.bgm=m.bgm||'slime';m.sort=Number(m.sort||i);return m;}
  function optList(arr,sel){return arr.map(function(v){return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(v)+'</option>';}).join('');}
  var BGM_LABELS={title:'タイトル',slime:'序盤・スライム系',goblin:'中盤・ゴブリン系',orc:'オーク系',cave:'洞窟',ruins:'遺跡',maou:'魔王',daimaou:'大魔王',ending:'ファンファーレ（クリア）'};
  function bgmOptList(arr,sel){return arr.map(function(v){var label=BGM_LABELS[v]||v;return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(label)+'</option>';}).join('');}
  function monsterCard(m,i){var thumb=m.image?('<img src="'+esc(GuildUtils.driveImg(m.image))+'" alt="" style="width:36px;height:36px;object-fit:contain;vertical-align:middle;margin-right:8px" onerror="this.style.display=\'none\'">'):'';return '<section class="category-block" data-monster-index="'+i+'"><button type="button" class="category-head" data-monster-toggle="'+i+'"><span>'+thumb+(i+1)+'. '+esc(m.name)+' <b style="opacity:.7;font-weight:normal">'+esc(m.stage)+'</b></span><span class="category-toggle">開く</span></button><div class="category-body">'+
    '<label>敵名<input data-field="name" value="'+esc(m.name)+'"></label>'+
    '<label>ステージ<input data-field="stage" value="'+esc(m.stage)+'"></label>'+
    '<label>BGM（一覧から選択）<select data-field="bgm">'+bgmOptList(BGM_LIST.concat(BGM_LIST.includes(m.bgm)||!m.bgm?[]:[m.bgm]),m.bgm)+'</select></label>'+
    '<div class="toolbar"><button class="btn small" data-bgm-play="'+i+'">▶ このBGMを試聴</button><button class="btn small" data-bgm-stop="'+i+'">■ 停止</button></div>'+
    '<label>BGM URL（アップした音源を使う場合はここに貼る）<input data-field="bgmUrl" value="'+esc(/^https?:/i.test(m.bgm)?m.bgm:'')+'" placeholder="https://drive.google.com/..."></label>'+
    '<label>現在HP<input data-field="hp" type="number" value="'+(m.hp||0)+'"></label>'+
    '<label>最大HP<input data-field="maxHp" type="number" value="'+(m.maxHp||500)+'"></label>'+
    '<label>背景<select data-field="bg">'+optList(themeScopedBgList().concat(themeScopedBgList().includes(m.bg)||!m.bg?[]:[m.bg]),m.bg)+'</select></label>'+
    '<label>敵画像（一覧から選択）<select data-field="image">'+optList(themeScopedImgList().concat(themeScopedImgList().includes(m.image)||!m.image||/^https?:/i.test(m.image)?[]:[m.image]),m.image)+'</select></label>'+
    '<label>敵画像 URL（アップした画像を使う場合はここに貼る）<input data-field="imageUrl" value="'+esc(/^https?:/i.test(m.image)?m.image:'')+'" placeholder="https://drive.google.com/..."></label>'+
    '<div class="enemy-preview" data-preview="'+i+'" style="position:relative;width:100%;height:180px;border:2px solid rgba(255,246,223,.5);border-radius:12px;overflow:hidden;margin:8px 0;background:#000 center/cover no-repeat;background-image:url('+esc(GuildUtils.driveImg(m.bg))+')"><img data-preview-img src="'+esc(GuildUtils.driveImg(m.image))+'" style="position:absolute;left:50%;top:50%;max-width:60%;max-height:80%;object-fit:contain;transform:translate(calc(-50% + '+(Number(m.offsetX)||0)+'%),calc(-50% + '+(Number(m.offsetY)||0)+'%)) scale('+((Number(m.scale)||100)/100)+')" onerror="this.style.display=\'none\'"></div>'+
    '<label>大きさ <span data-scale-val>'+(Number(m.scale)||100)+'</span>%<input data-field="scale" type="range" min="30" max="250" value="'+(Number(m.scale)||100)+'"></label>'+
    '<label>左右 <span data-ox-val>'+(Number(m.offsetX)||0)+'</span>%<input data-field="offsetX" type="range" min="-60" max="60" value="'+(Number(m.offsetX)||0)+'"></label>'+
    '<label>上下 <span data-oy-val>'+(Number(m.offsetY)||0)+'</span>%<input data-field="offsetY" type="range" min="-60" max="60" value="'+(Number(m.offsetY)||0)+'"></label>'+
    '<div class="toolbar"><button class="btn gold small" data-save-monster="'+i+'">この敵を保存</button><button class="btn small" data-current-monster="'+i+'">現在の敵にする</button><button class="btn small" data-dup-monster="'+i+'">複製</button><button class="btn red small" data-del-monster="'+i+'">削除</button></div></div></section>';}
  function monstersListHtml(){data.monsters=(data.monsters||[]).map(normalizeMonster);return data.monsters.length?data.monsters.map(function(m,i){return monsterCard(m,i);}).join(''):'<div class="empty">なし</div>';}
  function readMonsterCard(card){var m=data.monsters[+card.dataset.monsterIndex];m.name=card.querySelector('[data-field=name]').value;m.stage=card.querySelector('[data-field=stage]').value;var bgmUrl=(card.querySelector('[data-field=bgmUrl]')||{}).value||'';m.bgm=bgmUrl.trim()?bgmUrl.trim():card.querySelector('[data-field=bgm]').value;m.hp=+card.querySelector('[data-field=hp]').value||0;m.maxHp=+card.querySelector('[data-field=maxHp]').value||500;m.bg=card.querySelector('[data-field=bg]').value;m.background=m.bg;var imgUrl=(card.querySelector('[data-field=imageUrl]')||{}).value||'';m.image=imgUrl.trim()?imgUrl.trim():card.querySelector('[data-field=image]').value;m.scale=+card.querySelector('[data-field=scale]').value||100;m.offsetX=+card.querySelector('[data-field=offsetX]').value||0;m.offsetY=+card.querySelector('[data-field=offsetY]').value||0;return m;}
  function saveMonsterForm(){document.querySelectorAll('[data-monster-index]').forEach(readMonsterCard);save();}
  let monsterContainerId='adminContent';
  function renderMonsters(containerId){monsterContainerId=containerId||monsterContainerId;$(monsterContainerId).innerHTML='<h2>⚔️ 討伐モンスター管理</h2><div class="admin-card"><div class="admin-card-title">現在のテーマ：'+esc(PRESET_LABELS[activePresetId()]||activePresetId())+'</div><p class="tiny">背景・敵画像の選択肢は、このテーマの素材だけに絞り込んで表示されます。テーマを変えたい場合は「テーマ編集」の上部から選び直してください。</p></div><div class="toolbar"><button class="btn gold" id="addMonster">追加</button><button class="btn green" id="saveMonsters">全体保存</button><button class="btn" id="monOpenAll">全部開く</button><button class="btn" id="monCloseAll">全部閉じる</button><button class="btn" id="jsonMonsters">JSON</button></div><div class="category-list" id="monsterListBox">'+monstersListHtml()+'</div>';bindMonsterEvents();
    $('addMonster').onclick=function(){saveMonsterForm();data.monsters.push(normalizeMonster({name:'新しい敵',maxHp:500},data.monsters.length));save();renderMonsters();};
    $('saveMonsters').onclick=function(){saveMonsterForm();toast('保存しました');if(GuildStorage.pushCloud)GuildStorage.pushCloud();};
    $('monOpenAll').onclick=function(){document.querySelectorAll('#monsterListBox .category-block').forEach(function(b){b.classList.add('open');var t=b.querySelector('.category-toggle');if(t)t.textContent='閉じる';});};
    $('monCloseAll').onclick=function(){document.querySelectorAll('#monsterListBox .category-block').forEach(function(b){b.classList.remove('open');var t=b.querySelector('.category-toggle');if(t)t.textContent='開く';});};
    $('jsonMonsters').onclick=function(){textareaEditor('monsters','monsters.json');};}
  function updatePreview(card){var img=card.querySelector('[data-preview-img]');var box=card.querySelector('[data-preview]');if(!img||!box)return;var sc=(+card.querySelector('[data-field=scale]').value||100)/100;var ox=+card.querySelector('[data-field=offsetX]').value||0;var oy=+card.querySelector('[data-field=offsetY]').value||0;var imgSrc=card.querySelector('[data-field=image]').value;var imgUrlField=(card.querySelector('[data-field=imageUrl]')||{}).value||'';var finalImg=imgUrlField.trim()?imgUrlField.trim():imgSrc;var bgSrc=card.querySelector('[data-field=bg]').value;img.src=GuildUtils.driveImg(finalImg);img.style.display='';box.style.backgroundImage='url('+GuildUtils.driveImg(bgSrc)+')';img.style.transform='translate(calc(-50% + '+ox+'%),calc(-50% + '+oy+'%)) scale('+sc+')';var sv=card.querySelector('[data-scale-val]');if(sv)sv.textContent=+card.querySelector('[data-field=scale]').value||100;var oxv=card.querySelector('[data-ox-val]');if(oxv)oxv.textContent=ox;var oyv=card.querySelector('[data-oy-val]');if(oyv)oyv.textContent=oy;}
  function bindMonsterEvents(){
    document.querySelectorAll('[data-bgm-play]').forEach(function(b){b.onclick=function(){
      var card=b.closest('[data-monster-index]');
      var urlField=(card.querySelector('[data-field=bgmUrl]')||{}).value||'';
      var key=card.querySelector('[data-field=bgm]').value;
      var target=urlField.trim()?urlField.trim():key;
      // 実際に鳴らすファイルパスを解決して表示
      var resolved='';
      try{ resolved=GuildAudio.resolvePath?GuildAudio.resolvePath('bgm',target):target; }catch(e){}
      var af=(data.settings.audioFiles||{}); var file=(af.bgm&&af.bgm[target])||af[target]||(/^https?:|\.(mp3|wav|ogg|m4a)$/i.test(target)?target:'');
      if(!file){ toast('⚠️「'+target+'」に対応する音源が未登録です'); return; }
      try{
        if(window._bgmTest){ window._bgmTest.pause(); window._bgmTest=null; }
        var src=/^https?:|\.(mp3|wav|ogg|m4a)$/i.test(file)?file:file;
        if(window.GuildUtils&&GuildUtils.driveImg&&/drive\.google/.test(src)) src=GuildUtils.driveImg(src);
        var a=new Audio(src); window._bgmTest=a; a.play().then(function(){ toast('▶ 再生中: '+file); }).catch(function(e){ toast('❌ 再生失敗: '+file+'（'+e.name+'）'); });
      }catch(e){ toast('❌ エラー: '+e); }
    };});
    document.querySelectorAll('[data-bgm-stop]').forEach(function(b){b.onclick=function(){ if(window._bgmTest){ window._bgmTest.pause(); window._bgmTest=null; toast('■ 停止'); } };});
    document.querySelectorAll('[data-monster-toggle]').forEach(function(h){h.onclick=function(){var b=h.closest('.category-block');b.classList.toggle('open');h.querySelector('.category-toggle').textContent=b.classList.contains('open')?'閉じる':'開く';};});
    document.querySelectorAll('[data-monster-index]').forEach(function(card){['scale','offsetX','offsetY'].forEach(function(f){var el=card.querySelector('[data-field='+f+']');if(el)el.addEventListener('input',function(){updatePreview(card);});});var imgSel=card.querySelector('[data-field=image]');if(imgSel)imgSel.addEventListener('change',function(){updatePreview(card);});var imgUrlEl=card.querySelector('[data-field=imageUrl]');if(imgUrlEl)imgUrlEl.addEventListener('input',function(){updatePreview(card);});var bgSel=card.querySelector('[data-field=bg]');if(bgSel)bgSel.addEventListener('change',function(){updatePreview(card);});});
    document.querySelectorAll('[data-save-monster]').forEach(function(b){b.onclick=function(){var card=b.closest('[data-monster-index]');readMonsterCard(card);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('保存しました');var orig=b.textContent;b.textContent='✓ 保存しました';b.classList.add('green');setTimeout(function(){b.textContent=orig;b.classList.remove('green');},1400);};});
    document.querySelectorAll('[data-current-monster]').forEach(function(b){b.onclick=function(){saveMonsterForm();data.currentEnemyIndex=+b.dataset.currentMonster;save();toast('現在の敵にしました');if(GuildStorage.pushCloud)GuildStorage.pushCloud();};});
    document.querySelectorAll('[data-dup-monster]').forEach(function(b){b.onclick=function(){saveMonsterForm();var src=data.monsters[+b.dataset.dupMonster];var copy=JSON.parse(JSON.stringify(src));copy.id=GuildUtils.uid('enemy');copy.name=src.name+'（複製）';data.monsters.splice(+b.dataset.dupMonster+1,0,copy);save();renderMonsters();};});
    document.querySelectorAll('[data-del-monster]').forEach(function(b){b.onclick=function(){if(confirm('削除しますか？')){saveMonsterForm();data.monsters.splice(+b.dataset.delMonster,1);save();renderMonsters();}};});}

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
  function renderSettings(){var s=data.settings;s.notice=Object.assign({enabled:true,title:'本日のお知らせ',body:'',position:'top'},s.notice||{});$('adminContent').innerHTML='<h2>⚙️ 設定</h2>'+
    '<div class="admin-card"><div class="admin-card-title">🏪 基本設定</div>'+
    '<label>通貨単位<input id="setCurrency" value="'+esc(s.currency||'G')+'"></label>'+
    '<label>チャージ（1人）<input id="setCover" type="number" value="'+(s.coverCharge??500)+'"></label>'+
    '<label>管理パスワード<input id="setPass" value="'+esc(s.adminPassword||'OTAKU')+'"></label>'+
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
    $('saveBasic').onclick=function(){ s.currency=$('setCurrency').value||'G'; s.coverCharge=+$('setCover').value||0; s.adminPassword=$('setPass').value||'OTAKU'; pushToast('基本設定を保存しました'); };
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
      victoryBg:'', victoryImage:'victory_clear.PNG', victoryTitle:'', victorySubtitle:'', victoryBgm:'ending',
      masterName:'ギルドマスター', masterImage:'master_no.jpeg', masterMessage:'冷やかしか？さっさとメニューを開け'
    },s.themeCustom||{});
    return s.themeCustom;
  }

  // ===== テーマ編集（Phase4-3）：店舗情報/テキスト/画像/BGM/キャラクター/ステージ/プレビューを1画面にまとめる =====
  function renderThemeEditor(){
    $('adminContent').innerHTML='<h2>🎭 テーマ編集</h2>'+
      '<div class="admin-card"><p class="tiny">店舗情報・文言・画像・BGM・キャラクターをここでまとめて編集できます。JSON編集やGitHub編集は不要です。</p></div>'+
      '<h3>コンセプト一括切替</h3>'+
      '<div id="presetList" class="grid"><div class="tiny">読み込み中...</div></div>'+
      '<div class="admin-card"><div class="admin-card-title">元に戻す</div><p class="tiny">選んだコンセプトを解除して、既定(theme.json)に戻します。</p><button class="btn" id="clearPreset">コンセプトを解除</button></div>'+
      '<nav class="theme-subnav" id="themeSubNav"></nav>'+
      '<div id="themeSubContent"></div>';
    renderPresetPicker();
    renderThemeSubNav();
    renderThemeSub();
  }
  function renderThemeSubNav(){
    $('themeSubNav').innerHTML=THEME_SUBTABS.map(t=>`<button class="tab subtab ${themeSubTab===t[0]?'active':''}" data-subtab="${t[0]}">${t[1]}</button>`).join('');
    document.querySelectorAll('[data-subtab]').forEach(b=>b.onclick=()=>{themeSubTab=b.dataset.subtab;renderThemeSubNav();renderThemeSub();});
  }
  function renderThemeSub(){
    if(themeSubTab==='store') renderStoreInfoAdmin('themeSubContent');
    if(themeSubTab==='text') renderThemeText();
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
          if(Array.isArray(p.enemies)){
            data.monsters=p.enemies.map(function(e,idx){ return normalizeMonster({ id:GuildUtils.uid('enemy'), name:e.name, stage:e.stage, maxHp:e.maxHp, hp:e.maxHp, bg:e.bg, image:e.image, bgm:e.bgm, scale:e.scale||100, offsetX:e.offsetX||0, offsetY:e.offsetY||0 }, idx); });
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
    $('clearPreset').onclick=function(){ if(!confirm('コンセプトを解除して既定に戻しますか？'))return; GuildTheme.clearOverride(); toast('解除しました。再読み込みで既定に戻ります'); };
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
      toast('フォントを保存しました（この端末に反映）');
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
      toast('呼び名を保存しました（この端末に反映）');
    };
    $('saveThemeText').onclick=function(){
      Object.assign(c,{
        startTitle:$('tcStartTitle').value.trim(),
        startSubtitle:$('tcStartSubtitle').value.trim(),
        victoryTitle:$('tcVictoryTitle').value.trim(),
        victorySubtitle:$('tcVictorySubtitle').value,
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
      '<label>背景画像URL / ファイル名<input id="tcStartBg" value="'+esc(c.startBg||'')+'" placeholder="例：start_bg.png / https://..."></label></div>'+
      '<div class="admin-card"><div class="admin-card-title">🏆 討伐完了画面</div>'+
      '<label>背景画像URL / ファイル名<input id="tcVictoryBg" value="'+esc(c.victoryBg||'')+'" placeholder="例：victory_bg.png / https://..."></label>'+
      '<label>中央画像URL / ファイル名<input id="tcVictoryImage" value="'+esc(c.victoryImage||'victory_clear.PNG')+'" placeholder="例：victory_clear.PNG / https://..."></label></div>'+
      '<div class="admin-card"><div class="admin-card-title">🧙 マスター画像</div>'+
      '<label>マスター画像URL / ファイル名<input id="tcMasterImage" value="'+esc(c.masterImage||'master_no.jpeg')+'" placeholder="例：master_no.jpeg / https://..."></label></div>'+
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
  }
  function renderThemeBgm(){
    const c=ensureThemeCustom();
    const s=data.settings;
    s.audioFiles=s.audioFiles||{};
    s.audioFiles.bgm=Object.assign({title:'bgm_4.mp3',slime:'bgm_10.mp3',goblin:'bgm_1.mp3',orc:'bgm_2.mp3',cave:'bgm_5.mp3',ruins:'bgm_7.mp3',maou:'bgm_16.mp3',ending:'bgm_17.mp3',daimaou:'bgm_9.mp3'},s.audioFiles.bgm||{});
    s.audioFiles.se=Object.assign({ok:'se_1.mp3',cancel:'se_6.mp3',bad:'se_5.mp3',add:'se_8.mp3',confirm:'se_3.mp3',damage:'se_4.mp3',defeat:'se_7.mp3',victory:'se_2.mp3',levelup:'se_9.mp3'},s.audioFiles.se||{});
    const bgmMap=s.audioFiles.bgm;
    const seMap=s.audioFiles.se;
    const SE_LABELS={ok:'決定',cancel:'キャンセル',bad:'エラー・売切れ',add:'注文追加',confirm:'確認',damage:'ダメージ',defeat:'撃破',victory:'会計・勝利',levelup:'レベルアップ'};
    $('themeSubContent').innerHTML=
      '<div class="admin-card"><div class="admin-card-title">🎬 場面BGM</div>'+
      '<label>スタート画面BGM（キー or URL）<input id="tcStartBgm" value="'+esc(c.startBgm||'title')+'" placeholder="例：title / https://...mp3"></label>'+
      '<label>討伐完了BGM（キー or URL）<input id="tcVictoryBgm" value="'+esc(c.victoryBgm||'ending')+'" placeholder="例：ending / https://...mp3"></label>'+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">⚔️ ステージ別BGM（キャラクターのBGM欄で呼び出す名前）</div>'+
      '<p class="tiny">キャラクター編集画面のBGM欄に、ここで決めたキー名（例：slime）を入れると自動で使われます。空欄にすると既定のBGMのまま動きます。</p>'+
      Object.keys(bgmMap).map(k=>`<label>${esc(k)}<input data-bgm-key="${esc(k)}" value="${esc(bgmMap[k]||'')}" placeholder="ファイル名 / https://...mp3"></label>`).join('')+
      '</div>'+
      '<div class="admin-card"><div class="admin-card-title">🔔 効果音（SE）</div>'+
      '<p class="tiny">ボタン操作や攻撃・撃破などの短い効果音です。ファイル名またはURLを指定できます。</p>'+
      Object.keys(seMap).map(k=>`<label>${esc(SE_LABELS[k]||k)}<input data-se-key="${esc(k)}" value="${esc(seMap[k]||'')}" placeholder="ファイル名 / https://...mp3"></label>`).join('')+
      '</div>'+
      '<div class="toolbar"><button class="btn gold" id="saveThemeBgm">BGM・SE設定を保存</button><button class="btn" id="clearThemeCustom">場面BGMを初期化</button></div>'+
      '<h3>音源をアップロードする</h3>'+uploadWidgetHtml();
    $('saveThemeBgm').onclick=function(){
      Object.assign(c,{ startBgm:$('tcStartBgm').value.trim()||'title', victoryBgm:$('tcVictoryBgm').value.trim()||'ending' });
      document.querySelectorAll('[data-bgm-key]').forEach(inp=>{ bgmMap[inp.dataset.bgmKey]=inp.value.trim()||bgmMap[inp.dataset.bgmKey]; });
      document.querySelectorAll('[data-se-key]').forEach(inp=>{ seMap[inp.dataset.seKey]=inp.value.trim()||seMap[inp.dataset.seKey]; });
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
    s.storeInfo=Object.assign({name:'',address:'',hours:'',phone:'',instagram:'',x:'',youtube:'',website:'',mapUrl:'',description:''},s.storeInfo||{});
    const i=s.storeInfo;
    $(containerId).innerHTML='<h2>🏪 店舗情報</h2>'+
      '<div class="admin-card"><p class="tiny">一般画面の「店舗情報」ボタンに表示されます。営業時間・SNS・地図など、お客様に見せたい情報を登録できます。</p></div>'+
      '<div class="admin-card">'+
      '<label>店舗名<input id="infoName" value="'+esc(i.name||s.storeName||s.shopName||'')+'" placeholder="例：〇〇バー / △△カフェ"></label>'+
      '<label>紹介文<textarea id="infoDesc" placeholder="例：ゲームを遊びながら注文できるバーです">'+esc(i.description||'')+'</textarea></label>'+
      '<label>営業時間<textarea id="infoHours" placeholder="例：20:00〜LAST / 定休日：月曜">'+esc(i.hours||'')+'</textarea></label>'+
      '<label>住所<textarea id="infoAddress" placeholder="例：青森県むつ市...">'+esc(i.address||'')+'</textarea></label>'+
      '<label>電話番号<input id="infoPhone" value="'+esc(i.phone||'')+'" placeholder="例：0175-..."></label>'+
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
    };
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

  function uploadWidgetHtml(){
    return `<div class="admin-card"><div class="tiny">敵画像・背景・BGM・メニュー写真をここからアップできます。アップ後に出るURLを、上の画像欄・BGM欄に貼れば使えます。</div></div>
    <div class="admin-card">
      <label>ファイルを選択<input id="upFile" type="file"></label>
      <label>用途メモ（任意・ファイル名に使います）<input id="upLabel" placeholder="例：slime2 / bgm_boss / menu_beer"></label>
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
        $('upResult').innerHTML=`<div class="admin-card"><div class="admin-card-title">✅ アップ完了</div><div class="tiny">このURLを画像欄/BGM欄に貼ってください</div><input readonly value="${esc(j.url)}" onclick="this.select();this.setSelectionRange(0,99999)" style="width:100%"><div class="toolbar"><button class="btn gold" id="upCopy">URLをコピー</button></div><img src="${esc(GuildUtils.driveImg(j.url))}" style="max-width:100%;max-height:200px;margin-top:8px" onerror="this.style.display='none'"></div>`;
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
    $('openBusiness').onclick=()=>{b.open=true;b.openedAt=GuildUtils.todayText();save();toast('営業開始');renderBusiness();};
    $('closeBusiness').onclick=()=>{if(!confirm('営業終了して本日の日報を保存しますか？'))return;const rep=makeDailyReport(todayKey());b.open=false;b.closedAt=GuildUtils.todayText();b.dailyReports=(b.dailyReports||[]).filter(x=>x.day!==rep.day);b.dailyReports.push(rep);save();if(GuildStorage.pushCloud)GuildStorage.pushCloud();toast('日報を保存しました');renderBusiness();};
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
    const pwWarning = (data.settings.adminPassword||'')==='OTAKU' ? `<div class="admin-card" style="border-color:var(--red)"><div class="admin-card-title" style="color:var(--red)">⚠️ 管理パスワードが初期値のままです</div><p class="tiny">このテンプレート共通の初期パスワード「OTAKU」のままだと、他の人にも管理画面を開かれてしまう可能性があります。「設定」→「基本設定」から今すぐ変更してください。</p></div>` : '';
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
  function render(){if(current==='dash')renderDash(); if(current==='business')renderBusiness(); if(current==='menu')renderMenu(); if(current==='inventory')renderInventory(); if(current==='settings')renderSettings(); if(current==='themeEditor')renderThemeEditor(); if(current==='qr')renderQR(); if(current==='customers')renderCustomers(); if(current==='sales')renderSales(); if(current==='sync')renderSync(); if(current==='reset')renderReset();}
  loginOk()?showApp():showLogin();
})();
