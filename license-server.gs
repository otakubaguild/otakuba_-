/**
 * ============================================================
 * おたくば ギルドメニュー - 中央ライセンス管理サーバー
 * ============================================================
 *
 * これは「各店舗のGAS」とは別に、颯さん(販売者)が1つだけ作る
 * 専用のGoogle Apps Scriptプロジェクトに貼り付けるコードです。
 *
 * 役割：
 *   ・全購入店舗の支払い状況を1つのスプレッドシートで一元管理
 *   ・各店舗のアプリが起動時に「今は使える状態か」を問い合わせてくる
 *   ・Stripeからの支払い成功/失敗のWebhookを受け取って状態を自動更新
 *
 * ─────────────────────────────────────────
 * セットアップ手順
 * ─────────────────────────────────────────
 * 1. script.google.com で「新しいプロジェクト」を作成し、このファイルの中身を貼り付ける
 * 2. このプロジェクトに紐づくスプレッドシートは自動作成されないので、
 *    先に空のGoogleスプレッドシートを1つ作り、そのIDを下の SHEET_ID に貼る
 * 3. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      - 実行するユーザー：自分
 *      - アクセスできるユーザー：全員
 *    でデプロイし、発行されたURL(.../exec)を控える
 * 4. StripeのWebhook設定で、上記URLを送信先として登録する
 *      （イベント：checkout.session.completed / invoice.paid /
 *        invoice.payment_failed / customer.subscription.deleted）
 * 5. Stripeの「Webhook署名シークレット」を下の STRIPE_WEBHOOK_SECRET に貼る
 * 6. 各店舗のテンプレート内 license-config.js の serverUrl に、4のURLを設定する
 * 7. DASHBOARD_KEY に好きな合言葉を決めて設定する
 *
 * ─────────────────────────────────────────
 * 管理ダッシュボードの使い方（コード知識は不要です）
 * ─────────────────────────────────────────
 * デプロイしたURLの後ろに次を付けてブラウザで開くだけです：
 *   .../exec?action=dashboard&key=（DASHBOARD_KEYに設定した合言葉）
 * 一覧が表示され、店舗ごとの「有効化／猶予中にする／停止」ボタンを押すだけで反映されます。
 * このURLはブックマークしておくと便利です（合言葉が入っているので他人に共有しないこと）。
 * ─────────────────────────────────────────
 */

const SHEET_ID = 'ここにスプレッドシートIDを貼る';
const SHEET_NAME = 'Stores';
const STRIPE_WEBHOOK_SECRET = 'ここにStripeのWebhook署名シークレットを貼る（whsec_...）';
const DEFAULT_GRACE_DAYS = 3; // 未払い時、何日間は使わせ続けるか（管理画面から手動で変えたい場合はシート側の値を優先）

const COLUMNS = [
  'storeId','storeName','contactEmail','siteUrl','gasUrl',
  'plan','monthlyStatus','graceDays','graceStartAt','lastPaymentAt',
  'stripeCustomerId','stripeSubscriptionId','setupFeePaid',
  'createdAt','updatedAt','note'
];

function getSheet_(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if(!sh){
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLUMNS);
  } else if(sh.getLastRow()===0){
    sh.appendRow(COLUMNS);
  }
  return sh;
}

function findRow_(sh, storeId){
  const values = sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    if(String(values[i][0])===String(storeId)) return i+1; // シート上の行番号(1始まり)
  }
  return -1;
}

function rowToObject_(sh, rowIndex){
  const values = sh.getRange(rowIndex,1,1,COLUMNS.length).getValues()[0];
  const obj = {};
  COLUMNS.forEach((c,i)=> obj[c]=values[i]);
  return obj;
}

function upsertStore_(fields){
  const sh = getSheet_();
  let rowIndex = findRow_(sh, fields.storeId);
  const now = new Date().toISOString();
  if(rowIndex === -1){
    const row = COLUMNS.map(c=>{
      if(c==='createdAt') return now;
      if(c==='updatedAt') return now;
      if(c==='monthlyStatus') return fields.monthlyStatus || 'active'; // 登録直後は使える状態にしておく
      if(c==='graceDays') return fields.graceDays || DEFAULT_GRACE_DAYS;
      if(c==='setupFeePaid') return fields.setupFeePaid || false;
      return fields[c] !== undefined ? fields[c] : '';
    });
    sh.appendRow(row);
  } else {
    const current = rowToObject_(sh, rowIndex);
    const merged = Object.assign({}, current, fields, {updatedAt: now});
    const row = COLUMNS.map(c=>merged[c] !== undefined ? merged[c] : '');
    sh.getRange(rowIndex,1,1,COLUMNS.length).setValues([row]);
  }
}

/**
 * 起動時のライセンス確認（各店舗アプリ→このサーバーへのGETリクエスト）
 * GET ?action=licenseCheck&storeId=xxxx
 */
function handleLicenseCheck_(storeId){
  const sh = getSheet_();
  const rowIndex = findRow_(sh, storeId);
  if(rowIndex === -1){
    // 未登録＝まだ購入直後などで台帳にいない可能性があるため、締め出さない
    return {ok:true, status:'active', reason:'not_registered'};
  }
  const s = rowToObject_(sh, rowIndex);
  let status = s.monthlyStatus || 'active';
  let graceDaysLeft = null;

  if(status === 'grace'){
    const graceDays = Number(s.graceDays)||DEFAULT_GRACE_DAYS;
    const start = s.graceStartAt ? new Date(s.graceStartAt).getTime() : Date.now();
    const elapsedDays = (Date.now()-start)/86400000;
    graceDaysLeft = Math.max(0, Math.ceil(graceDays - elapsedDays));
    if(elapsedDays > graceDays){
      status = 'suspended';
      upsertStore_({storeId, monthlyStatus:'suspended'}); // 猶予切れを確定させる
    }
  }
  return {ok:true, status, graceDaysLeft, storeName:s.storeName||''};
}

/**
 * 各店舗の初回セットアップ時の自動登録
 * POST {action:'registerStore', storeId, storeName, contactEmail, siteUrl, gasUrl}
 */
function handleRegisterStore_(body){
  if(!body.storeId) return {ok:false, error:'storeId is required'};
  upsertStore_({
    storeId: body.storeId,
    storeName: body.storeName||'',
    contactEmail: body.contactEmail||'',
    siteUrl: body.siteUrl||'',
    gasUrl: body.gasUrl||''
  });
  return {ok:true};
}

/**
 * ⚠️ 重要な制約：
 * Google Apps ScriptのWebアプリ(doPost)は、Stripeが送ってくる
 * 「Stripe-Signature」ヘッダーを読み取ることができません（GASの仕様上の制限）。
 * そのため、Stripe公式のHMAC署名検証はGAS単体では実装できません。
 *
 * 代わりに、StripeでWebhookエンドポイントを登録する際のURLに
 * 秘密の合言葉をクエリパラメータとして付けておく方式にします。
 *   例）https://script.google.com/.../exec?key=颯さんだけが知る文字列
 * これにより「URLと合言葉の両方を知っている人しか送れない」状態にできます。
 * より厳密な検証をしたい場合は、Cloudflare Worker等でStripeの署名検証をしてから
 * このGASへ中継する構成にしてください。
 */
const WEBHOOK_SHARED_SECRET = 'ここに自分だけの合言葉を決めて入れる（他人に教えない）';

// 改ざん警告が出た店舗が「解除コード」を入力してきた時に照合する値。
// 颯さんが決めた1つの文字列。定期的に変えたい場合はここを書き換えてデプロイし直すだけでOK。
const TAMPER_UNLOCK_CODE = 'ここに颯さんが決めた解除コードを入れる';


/**
 * Stripe Webhookイベントの処理
 * 事前に、Stripe側のCheckout/Subscriptionの metadata に storeId を必ず入れておくこと。
 */
function handleStripeEvent_(evt){
  const type = evt.type;
  const obj = evt.data && evt.data.object || {};
  const storeId = (obj.metadata && obj.metadata.storeId) ||
                   (obj.subscription_details && obj.subscription_details.metadata && obj.subscription_details.metadata.storeId) || '';
  if(!storeId) return {ok:true, skipped:'no storeId in metadata'};

  if(type === 'checkout.session.completed'){
    const isSubscription = obj.mode === 'subscription';
    upsertStore_({
      storeId,
      stripeCustomerId: obj.customer || '',
      stripeSubscriptionId: obj.subscription || '',
      setupFeePaid: !isSubscription ? true : undefined,
      monthlyStatus: 'active',
      lastPaymentAt: new Date().toISOString()
    });
  } else if(type === 'invoice.paid'){
    upsertStore_({ storeId, monthlyStatus:'active', lastPaymentAt: new Date().toISOString(), graceStartAt:'' });
  } else if(type === 'invoice.payment_failed'){
    upsertStore_({ storeId, monthlyStatus:'grace', graceStartAt: new Date().toISOString() });
  } else if(type === 'customer.subscription.deleted'){
    upsertStore_({ storeId, monthlyStatus:'suspended' });
  }
  return {ok:true};
}

// 管理ダッシュボードにアクセスする時の合言葉（URLに ?action=dashboard&key=... で使う）
// ブラウザでこのURLを開けば、スプレッドシートを直接触らなくても状態を切り替えられます。
const DASHBOARD_KEY = 'ここに颯さんだけが知るダッシュボード用の合言葉を入れる';

/**
 * 管理ダッシュボード（ブラウザで開くと店舗一覧と状態切り替えボタンが出るページ）
 */
function renderDashboard_(){
  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  const idx = {}; COLUMNS.forEach((c,i)=>idx[c]=i);
  let rows = '';
  for(let i=1;i<values.length;i++){
    const r = values[i];
    const storeId = r[idx.storeId];
    const status = r[idx.monthlyStatus] || 'active';
    const badge = status==='active' ? '🟢 有効' : status==='grace' ? '🟡 猶予中' : '🔴 停止';
    rows += '<tr>'+
      '<td>'+escapeHtml_(String(r[idx.storeName]||''))+'</td>'+
      '<td>'+escapeHtml_(String(r[idx.contactEmail]||''))+'</td>'+
      '<td>'+badge+'</td>'+
      '<td>'+escapeHtml_(String(r[idx.lastPaymentAt]||''))+'</td>'+
      '<td>'+
        '<form method="get" style="display:inline">'+hiddenFields_(storeId,'active')+'<button>有効化</button></form> '+
        '<form method="get" style="display:inline">'+hiddenFields_(storeId,'grace')+'<button>猶予中にする</button></form> '+
        '<form method="get" style="display:inline">'+hiddenFields_(storeId,'suspended')+'<button>停止</button></form>'+
      '</td>'+
    '</tr>';
  }
  const html = '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<style>body{font-family:sans-serif;padding:12px}table{border-collapse:collapse;width:100%}'+
    'td,th{border:1px solid #ccc;padding:6px 8px;font-size:14px;text-align:left}button{padding:4px 8px}</style>'+
    '</head><body><h2>🩺 店舗ライセンス管理</h2>'+
    '<table><tr><th>店舗名</th><th>連絡先</th><th>状態</th><th>最終入金</th><th>操作</th></tr>'+rows+'</table>'+
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('店舗ライセンス管理');
}
function hiddenFields_(storeId,status){
  return '<input type="hidden" name="action" value="setStatus">'+
    '<input type="hidden" name="key" value="'+DASHBOARD_KEY+'">'+
    '<input type="hidden" name="storeId" value="'+escapeHtml_(String(storeId))+'">'+
    '<input type="hidden" name="status" value="'+status+'">';
}
function escapeHtml_(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function doGet(e){
  const action = e.parameter.action;
  if(action === 'dashboard'){
    if((e.parameter.key||'') !== DASHBOARD_KEY) return ContentService.createTextOutput('合言葉が違います');
    return renderDashboard_();
  }
  if(action === 'setStatus'){
    if((e.parameter.key||'') !== DASHBOARD_KEY) return ContentService.createTextOutput('合言葉が違います');
    const storeId = e.parameter.storeId||'';
    const status = e.parameter.status||'';
    if(!storeId || ['active','grace','suspended'].indexOf(status)===-1){
      return ContentService.createTextOutput('パラメータが不正です');
    }
    const fields = {storeId, monthlyStatus:status};
    if(status==='active'){ fields.lastPaymentAt = new Date().toISOString(); fields.graceStartAt=''; }
    if(status==='grace'){ fields.graceStartAt = new Date().toISOString(); }
    upsertStore_(fields);
    return HtmlService.createHtmlOutput('<p>更新しました。</p><a href="?action=dashboard&key='+encodeURIComponent(DASHBOARD_KEY)+'">一覧に戻る</a>');
  }
  let result = {ok:false, error:'unknown action'};
  if(action === 'licenseCheck'){
    result = handleLicenseCheck_(e.parameter.storeId||'');
  } else if(action === 'ping'){
    result = {ok:true, pong:true};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  const raw = e.postData ? e.postData.contents : '{}';
  let result = {ok:false};
  try{
    const body = JSON.parse(raw);
    if(body && body.action === 'registerStore'){
      // 店舗アプリからの自己登録はStripeより信頼度を下げてよい処理のため合言葉チェックは任意
      result = handleRegisterStore_(body);
    } else if(body && body.action === 'verifyUnlockCode'){
      result = {ok: String(body.code||'') === TAMPER_UNLOCK_CODE};
    } else if(body && body.type && body.data){
      // Stripeイベントらしき形（type/dataを持つ）。合言葉チェックを必須にする。
      if((e.parameter && e.parameter.key) !== WEBHOOK_SHARED_SECRET){
        result = {ok:false, error:'invalid key'};
      } else {
        result = handleStripeEvent_(body);
      }
    } else {
      result = {ok:false, error:'unrecognized payload'};
    }
  }catch(err){
    result = {ok:false, error:String(err)};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
