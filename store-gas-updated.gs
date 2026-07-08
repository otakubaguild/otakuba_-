// ゲーム風メニューシステム 同期サーバー（コピー&ペースト時の事故防止用の空行）
/**
 * ゲーム風メニューシステム v8.1 同期サーバー
 * 追加:
 * - deletedCustomerIds（削除済み顧客ID）
 * - theme/store設定の初期枠
 * - uploadFile維持
 * - test（システムチェックからのテスト通知）を追加
 */

var DISCORD_WEBHOOK_URL = '';

var SHEET_NAME = 'guild_data';
var DATA_CELL  = 'A1';
var OVERWRITE_PARTS = ['settings', 'menu', 'monsters', 'salesSettings'];

function setup() {
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (!sh.getRange(DATA_CELL).getValue()) {
    sh.getRange(DATA_CELL).setValue(JSON.stringify(emptyData_()));
  }
  Logger.log('setup 完了: ' + ss.getUrl());
}

function defaultSettings_() {
  return {
    themeId: 'guild',
    storeName: 'マイストア',
    storeSubtitle: 'メニューを開きますか？',
    terms: {
      customer: '冒険者',
      party: 'パーティ',
      quest: 'クエスト',
      checkout: 'クエスト達成',
      enemy: '敵',
      boss: '魔王',
      damage: 'ダメージ',
      clear: '討伐完了'
    },
    themeAssets: {
      logo: '',
      titleImage: '',
      victoryImage: 'victory_clear.PNG',
      defaultBackground: 'background.jpg'
    }
  };
}

function emptyData_() {
  return {
    settings: defaultSettings_(),
    menu: [],
    monsters: [],
    customers: [],
    sales: [],
    deletedSaleIds: [],
    deletedCustomerIds: [],
    salesSettings: { currentMonth: '', closedMonths: [], monthlyArchives: {} },
    _updated: nowIso_()
  };
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === 'sync') return json_(readData_());
  if (params.action === 'ping') return json_({ ok: true, time: nowIso_() });
  // ===== ギルド専用アプリ連携用（読み取り専用・既存の同期方式には影響しません） =====
  if (params.action === 'guildProfile') return json_(buildGuildProfile_(params.adventurerId || params.id || ''));
  if (params.action === 'guildBoard') return json_(buildGuildBoard_());
  return json_(readData_());
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  var action = body.action || '';

  if (action === 'menuSave')      return savePart_('menu', body.menu);
  if (action === 'monstersSave')  return savePart_('monsters', body.monsters);
  if (action === 'customersSave') return savePart_('customers', body.customers);
  if (action === 'salesSave')     return savePart_('sales', body.sales);
  if (action === 'settingsSave')  return savePart_('settings', body.settings);
  if (action === 'uploadFile')    return uploadFile_(body);

  if (action === 'saveAll' || action === 'fullSave') {
    var data = readData_();

    OVERWRITE_PARTS.forEach(function (p) {
      if (body[p] !== undefined) data[p] = body[p];
    });

    data.settings = normalizeSettings_(data.settings || {});

    if (Array.isArray(body.deletedSaleIds)) {
      var delSet = {};
      (data.deletedSaleIds || []).concat(body.deletedSaleIds).forEach(function (id) {
        if (id) delSet[id] = 1;
      });
      data.deletedSaleIds = Object.keys(delSet);
    }

    if (Array.isArray(body.deletedCustomerIds)) {
      var cdelSet = {};
      (data.deletedCustomerIds || []).concat(body.deletedCustomerIds).forEach(function (id) {
        if (id) cdelSet[id] = 1;
      });
      data.deletedCustomerIds = Object.keys(cdelSet);
    }

    var deletedSales = {};
    (data.deletedSaleIds || []).forEach(function (id) { deletedSales[id] = 1; });

    var deletedCustomers = {};
    (data.deletedCustomerIds || []).forEach(function (id) { deletedCustomers[id] = 1; });

    if (Array.isArray(body.customers)) {
      var byId = {};
      (data.customers || []).forEach(function (c) {
        if (c && c.id && !deletedCustomers[c.id]) byId[c.id] = c;
      });
      body.customers.forEach(function (rc) {
        if (!rc || !rc.id || deletedCustomers[rc.id]) return;
        var local = byId[rc.id];
        if (!local) byId[rc.id] = rc;
        else byId[rc.id] = ((Number(rc.visits) || 0) >= (Number(local.visits) || 0)) ? rc : local;
      });
      data.customers = Object.keys(byId).map(function (k) { return byId[k]; });
    } else {
      data.customers = (data.customers || []).filter(function (c) {
        return c && c.id && !deletedCustomers[c.id];
      });
    }

    if (Array.isArray(body.sales)) {
      var seen = {}, merged = [];
      (data.sales || []).concat(body.sales).forEach(function (s) {
        if (!s) return;
        var id = saleKey_(s);
        if (deletedSales[id]) return;
        if (seen[id]) return;
        seen[id] = 1;
        merged.push(s);
      });
      data.sales = merged;
    }

    writeData_(data);
    return json_({ ok: true, saved: 'all-merged-v8.1' });
  }

  if (action === 'order' || action === 'checkout') {
    if (body.sale) {
      var d = readData_();
      d.sales = Array.isArray(d.sales) ? d.sales : [];
      var id = saleKey_(body.sale);
      var dup = d.sales.some(function (s) { return saleKey_(s) === id; });
      var del = (d.deletedSaleIds || []).indexOf(id) >= 0;
      if (!dup && !del) {
        d.sales.push(body.sale);
        writeData_(d);
      }
    }
    notifyDiscord_(body);
    return json_({ ok: true, notified: true });
  }

  if (action === 'test') {
    var hook = (body.webhookUrl && String(body.webhookUrl).trim()) || DISCORD_WEBHOOK_URL;
    if (!hook) return json_({ ok: false, error: 'no webhook url configured' });
    try {
      UrlFetchApp.fetch(hook, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ content: '🔔 ' + (body.message || 'テスト通知') + (body.time ? ('\n🕒 ' + body.time) : '') }),
        muteHttpExceptions: true
      });
      return json_({ ok: true, notified: true });
    } catch (e) {
      return json_({ ok: false, error: String(e) });
    }
  }

  return json_({ ok: false, error: 'unknown action', action: action });
}

function getSS_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = SpreadsheetApp.create('guild_menu_data');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function sheet_() {
  var ss = getSS_();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function readData_() {
  var raw = sheet_().getRange(DATA_CELL).getValue();
  if (!raw) return emptyData_();
  try {
    var d = JSON.parse(raw);

    d.settings = normalizeSettings_(d.settings || {});
    if (!Array.isArray(d.menu)) d.menu = [];
    if (!Array.isArray(d.monsters)) d.monsters = [];
    if (!Array.isArray(d.customers)) d.customers = [];
    if (!Array.isArray(d.sales)) d.sales = [];

    if (!d.deletedSaleIds) d.deletedSaleIds = [];
    if (!d.deletedCustomerIds) d.deletedCustomerIds = [];

    if (!d.salesSettings) d.salesSettings = { currentMonth: '', closedMonths: [], monthlyArchives: {} };
    if (!Array.isArray(d.salesSettings.closedMonths)) d.salesSettings.closedMonths = [];
    if (!d.salesSettings.monthlyArchives || typeof d.salesSettings.monthlyArchives !== 'object') d.salesSettings.monthlyArchives = {};

    var deletedCustomers = {};
    (d.deletedCustomerIds || []).forEach(function (id) { deletedCustomers[id] = 1; });
    d.customers = (d.customers || []).filter(function (c) {
      return c && c.id && !deletedCustomers[c.id];
    });

    return d;
  } catch (e) {
    return emptyData_();
  }
}

function normalizeSettings_(settings) {
  var def = defaultSettings_();
  settings = settings || {};
  if (!settings.themeId) settings.themeId = def.themeId;
  if (!settings.storeName) settings.storeName = def.storeName;
  if (!settings.storeSubtitle) settings.storeSubtitle = def.storeSubtitle;
  settings.terms = Object.assign({}, def.terms, settings.terms || {});
  settings.themeAssets = Object.assign({}, def.themeAssets, settings.themeAssets || {});
  return settings;
}

function writeData_(data) {
  data.settings = normalizeSettings_(data.settings || {});
  data._updated = nowIso_();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) {}
  sheet_().getRange(DATA_CELL).setValue(JSON.stringify(data));
  try { lock.releaseLock(); } catch (e) {}
}

function savePart_(part, value) {
  if (value === undefined) return json_({ ok: false, error: 'no value for ' + part });
  var d = readData_();
  d[part] = value;
  if (part === 'settings') d.settings = normalizeSettings_(d.settings);
  writeData_(d);
  return json_({ ok: true, saved: part, count: (value && value.length) || 0 });
}

function saleKey_(s) {
  return s && (s.id || s.saleId || (String(s.time || '') + '|' + String(s.customer || '') + '|' + String(s.total || '') + '|' + JSON.stringify(s.items || [])));
}

function notifyDiscord_(body) {
  var hook = (body && body.webhookUrl) ? String(body.webhookUrl).trim() : DISCORD_WEBHOOK_URL;
  if (!hook) return;
  try {
    var lines = [];
    var who = body.adventurer || body.name || '未登録';
    var orderLabel = body.orderLabel || '注文';
    var checkoutLabel = body.checkoutLabel || '会計';
    var enemyLabel = body.enemyLabel || '敵';
    var head = body.action === 'checkout' ? ('💰 ' + checkoutLabel) : ('📦 ' + orderLabel);
    lines.push('**' + head + '** / ' + who + ' (Lv' + (body.level || 1) + ')');
    if (body.partyCount) lines.push('人数: ' + body.partyCount);
    (body.items || []).forEach(function (it) {
      lines.push('・' + it.name + ' ×' + (it.qty || 1) + ' = ' + (it.subtotal || 0) + 'G');
    });
    lines.push('合計: **' + (body.total || 0) + 'G**');
    if (body.enemy) lines.push(enemyLabel + ': ' + body.enemy.name + ' HP ' + body.enemy.hp + '/' + body.enemy.maxHp);
    if (body.time) lines.push('🕒 ' + body.time);
    UrlFetchApp.fetch(hook, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ content: lines.join('\n') }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Discord通知失敗: ' + e);
  }
}

function uploadFile_(body) {
  try {
    var name = String(body.filename || ('file_' + Date.now()));
    var mime = String(body.mimeType || 'application/octet-stream');
    var b64 = String(body.data || '');
    if (!b64) return json_({ ok: false, error: 'no data' });

    var comma = b64.indexOf(',');
    if (b64.indexOf('base64') >= 0 && comma >= 0) b64 = b64.substring(comma + 1);

    var folder = getUploadFolder_();
    var existing = folder.getFilesByName(name);
    while (existing.hasNext()) existing.next().setTrashed(true);

    var bytes = Utilities.base64Decode(b64);
    var blob = Utilities.newBlob(bytes, mime, name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var id = file.getId();
    var directUrl = 'https://lh3.googleusercontent.com/d/' + id;
    var altUrl = 'https://drive.google.com/uc?export=view&id=' + id;
    return json_({ ok: true, name: name, id: id, url: directUrl, altUrl: altUrl });
  } catch (e) {
    return json_({ ok: false, error: String(e) });
  }
}

function getUploadFolder_() {
  var props = PropertiesService.getScriptProperties();
  var fid = props.getProperty('UPLOAD_FOLDER_ID');
  if (fid) { try { return DriveApp.getFolderById(fid); } catch (e) {} }
  var folder = DriveApp.createFolder('guild_menu_uploads');
  props.setProperty('UPLOAD_FOLDER_ID', folder.getId());
  return folder;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===== ここから：ギルド専用アプリ連携用（追加機能。既存関数は一切変更していません） =====

// 冒険者1人分のプロフィール（冒険者カード・依頼履歴・討伐履歴などをまとめて返す）
function buildGuildProfile_(adventurerId) {
  if (!adventurerId) return { ok: false, error: 'adventurerId is required' };
  var d = readData_();
  var cust = (d.customers || []).find(function (c) { return c && c.id === adventurerId; }) || null;
  var mySales = (d.sales || []).filter(function (s) { return s && s.customerId === adventurerId; });

  var questHistory = [];
  var killMap = {};
  var totalExp = 0, totalGold = 0, completedCount = 0, orderedCount = 0;

  mySales.forEach(function (s) {
    (s.items || []).forEach(function (it) {
      if (!it || !it.questId) return; // 依頼メタデータが無い通常商品はスキップ（既存商品には影響しない）
      orderedCount++;
      questHistory.push({
        questId: it.questId, name: it.name, rank: it.questRank || '',
        qty: it.qty, orderedAt: it.orderedAt || s.time, completedAt: it.completedAt || s.time,
        status: it.completionStatus || 'completed'
      });
      if ((it.completionStatus || 'completed') === 'completed') completedCount++;
      totalExp += Number(it.gainedExp) || 0;
      totalGold += Number(it.gainedGold) || 0;
      if (it.killedMonster) {
        killMap[it.killedMonster] = (killMap[it.killedMonster] || 0) + (Number(it.killedCount) || 0);
      }
    });
  });

  return {
    ok: true,
    adventurerId: adventurerId,
    level: cust ? (cust.level || 1) : null,
    title: cust ? (cust.title || '') : '',
    visits: cust ? (cust.visits || 0) : 0,
    totalSpent: cust ? (cust.total || 0) : 0,
    lastVisit: cust ? (cust.lastVisit || '') : '',
    totalExp: totalExp,
    totalGoldEarned: totalGold,
    questHistory: questHistory,
    completionHistory: questHistory.filter(function (q) { return q.status === 'completed'; }),
    killHistory: Object.keys(killMap).map(function (m) { return { monster: m, count: killMap[m] }; }),
    killCountByMonster: killMap,
    earnedTitles: cust && cust.title ? [cust.title] : [],
    completionRate: orderedCount ? Math.round((completedCount / orderedCount) * 100) : null,
    currentActiveQuest: null, // このテンプレートは受注と同時に達成扱いのため、常に受注中の依頼は無し
    orderHistory: mySales
  };
}

// 依頼掲示板・モンスター図鑑用の全体データ（特定の冒険者に紐づかない情報）
function buildGuildBoard_() {
  var d = readData_();
  var quests = (d.menu || []).filter(function (p) {
    return p && p.isQuest;
  }).map(function (p) {
    return {
      id: p.id, questName: p.questName || p.name, rank: p.questRank || '',
      desc: p.questDesc || p.desc || '', client: p.questClient || '',
      recommendedLevel: p.recommendedLevel || '', exp: p.questExp || 0, gold: p.questGold || 0,
      targetMonster: p.targetMonster || '', targetCount: p.targetCount || 0,
      clearTitle: p.clearTitle || '', clearBody: p.clearBody || '',
      eventOnly: !!p.eventOnly, startAt: p.startAt || '', endAt: p.endAt || '',
      repeatable: p.repeatable !== false, price: p.price || 0
    };
  });
  var monsterDex = (d.monsters || []).map(function (m) {
    return { id: m.id, name: m.name, stage: m.stage || '', image: m.image || '', bg: m.bg || m.background || '' };
  });
  return { ok: true, quests: quests, monsterDex: monsterDex, updatedAt: d._updated || '' };
}

function nowIso_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss");
}

function testDiscord() {
  var res = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ content: 'テスト' }),
    muteHttpExceptions: true
  });
  Logger.log('ステータス: ' + res.getResponseCode());
  Logger.log('応答: ' + res.getContentText());
}
