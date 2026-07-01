/**
 * おたく場ギルド v8 同期サーバー（素材アップロード対応）
 * Code.gs を丸ごとこれに差し替え → setup() 実行 → 新バージョンでデプロイ更新
 */
var DISCORD_WEBHOOK_URL = '';

var SHEET_NAME = 'guild_data';
var DATA_CELL  = 'A1';
var ASSET_FOLDER_NAME = 'otakuba_guild_assets';
var OVERWRITE_PARTS = ['settings', 'menu', 'monsters', 'salesSettings'];

function setup() {
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (!sh.getRange(DATA_CELL).getValue()) sh.getRange(DATA_CELL).setValue(JSON.stringify(emptyData_()));
  getAssetFolder_();
  Logger.log('setup 完了: ' + ss.getUrl());
}

function emptyData_() {
  return {
    settings: {}, menu: [], monsters: [], customers: [], sales: [],
    deletedSaleIds: [], deletedCustomerIds: [],
    salesSettings: { currentMonth: '', closedMonths: [], monthlyArchives: {} },
    _updated: nowIso_()
  };
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === 'sync') return json_(readData_());
  if (params.action === 'ping') return json_({ ok: true, time: nowIso_() });
  return json_(readData_());
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  var action = body.action || '';

  if (action === 'assetUpload') return assetUpload_(body);

  if (action === 'menuSave')      return savePart_('menu', body.menu);
  if (action === 'monstersSave')  return savePart_('monsters', body.monsters);
  if (action === 'customersSave') return savePart_('customers', body.customers);
  if (action === 'salesSave')     return savePart_('sales', body.sales);
  if (action === 'settingsSave')  return savePart_('settings', body.settings);

  if (action === 'saveAll' || action === 'fullSave') {
    var data = readData_();
    OVERWRITE_PARTS.forEach(function (p) { if (body[p] !== undefined) data[p] = body[p]; });

    if (Array.isArray(body.deletedSaleIds)) {
      var delSet = {};
      (data.deletedSaleIds || []).concat(body.deletedSaleIds).forEach(function (id) { if (id) delSet[id] = 1; });
      data.deletedSaleIds = Object.keys(delSet);
    }
    if (Array.isArray(body.deletedCustomerIds)) {
      var cdSet = {};
      (data.deletedCustomerIds || []).concat(body.deletedCustomerIds).forEach(function (id) { if (id) cdSet[id] = 1; });
      data.deletedCustomerIds = Object.keys(cdSet);
    }

    var deletedCustomers = {};
    (data.deletedCustomerIds || []).forEach(function (id) { deletedCustomers[id] = 1; });

    if (Array.isArray(body.customers)) {
      var byId = {};
      (data.customers || []).forEach(function (c) { if (c && c.id && !deletedCustomers[c.id]) byId[c.id] = c; });
      body.customers.forEach(function (rc) {
        if (!rc || !rc.id || deletedCustomers[rc.id]) return;
        var local = byId[rc.id];
        if (!local) byId[rc.id] = rc;
        else byId[rc.id] = ((Number(rc.visits) || 0) >= (Number(local.visits) || 0)) ? rc : local;
      });
      data.customers = Object.keys(byId).map(function (k) { return byId[k]; });
    }

    var deleted = {};
    (data.deletedSaleIds || []).forEach(function (id) { deleted[id] = 1; });
    if (Array.isArray(body.sales)) {
      var seen = {}, merged = [];
      (data.sales || []).concat(body.sales).forEach(function (s) {
        if (!s) return;
        var id = s.id || JSON.stringify(s);
        if (deleted[id]) return;
        if (seen[id]) return;
        seen[id] = 1; merged.push(s);
      });
      data.sales = merged;
    }

    writeData_(data);
    return json_({ ok: true, saved: 'all-merged-v8' });
  }

  if (action === 'order' || action === 'checkout') {
    if (body.sale) {
      var d = readData_();
      d.sales = Array.isArray(d.sales) ? d.sales : [];
      var dup = d.sales.some(function (s) { return s && s.id === body.sale.id; });
      var del = (d.deletedSaleIds || []).indexOf(body.sale.id) >= 0;
      if (!dup && !del) { d.sales.push(body.sale); writeData_(d); }
    }
    notifyDiscord_(body);
    return json_({ ok: true, notified: true });
  }

  return json_({ ok: false, error: 'unknown action', action: action });
}

function assetUpload_(body) {
  if (!body || !body.base64 || !body.filename) return json_({ ok:false, error:'no file' });

  var kind = body.kind || 'file';
  var key = body.key || '';
  var safe = safeName_(body.filename);
  var mime = body.mimeType || 'application/octet-stream';
  var bytes = Utilities.base64Decode(body.base64);
  var blob = Utilities.newBlob(bytes, mime, safe);
  var folder = getAssetFolder_();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var id = file.getId();
  var url = (kind === 'background')
    ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600'
    : 'https://drive.google.com/uc?export=download&id=' + id;

  var d = readData_();
  d.settings = d.settings || {};
  d.settings.audioFiles = d.settings.audioFiles || {};
  d.settings.audioFiles.bgm = d.settings.audioFiles.bgm || {};
  d.settings.backgroundFiles = d.settings.backgroundFiles || {};

  if (kind === 'bgm') {
    d.settings.audioFiles.bgm[key] = url;
  } else if (kind === 'background') {
    d.settings.backgroundFiles[key] = url;
    if (Array.isArray(d.monsters)) {
      d.monsters.forEach(function (m) {
        if (!m) return;
        if (m.bg === key || m.background === key) {
          m.bg = url;
          m.background = url;
        }
      });
    }
  }

  writeData_(d);
  return json_({ ok:true, kind:kind, key:key, url:url, fileId:id, filename:safe });
}

/* ===================== 内部 ===================== */

function getSS_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = SpreadsheetApp.create('otakuba_guild_data');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function getAssetFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ASSET_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(ASSET_FOLDER_NAME);
  props.setProperty('ASSET_FOLDER_ID', f.getId());
  return f;
}

function safeName_(name) {
  name = String(name || 'asset');
  name = name.replace(/[\\\/:*?"<>|#%&{}$!'@+=`]/g, '_');
  return name;
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
    if (!d.deletedSaleIds) d.deletedSaleIds = [];
    if (!d.deletedCustomerIds) d.deletedCustomerIds = [];
    if (!d.salesSettings) d.salesSettings = { currentMonth: '', closedMonths: [], monthlyArchives: {} };
    return d;
  } catch (e) { return emptyData_(); }
}

function writeData_(data) {
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
  writeData_(d);
  return json_({ ok: true, saved: part, count: (value && value.length) || 0 });
}

function notifyDiscord_(body) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    var lines = [];
    var who = body.adventurer || body.name || '未登録';
    var head = body.action === 'checkout' ? '💰 会計' : '🍺 注文';
    lines.push('**' + head + '** / ' + who + ' (Lv' + (body.level || 1) + ')');
    if (body.partyCount) lines.push('人数: ' + body.partyCount);
    (body.items || []).forEach(function (it) {
      lines.push('・' + it.name + ' ×' + (it.qty || 1) + ' = ' + (it.subtotal || 0) + 'G');
    });
    lines.push('合計: **' + (body.total || 0) + 'G**');
    if (body.enemy) lines.push('敵: ' + body.enemy.name + ' HP ' + body.enemy.hp + '/' + body.enemy.maxHp);
    if (body.time) lines.push('🕒 ' + body.time);
    UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ content: lines.join('\n') }),
      muteHttpExceptions: true
    });
  } catch (e) { Logger.log('Discord通知失敗: ' + e); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss");
}

function testDiscord() {
  var res = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ content: 'テスト' }), muteHttpExceptions: true
  });
  Logger.log('ステータス: ' + res.getResponseCode());
  Logger.log('応答: ' + res.getContentText());
}
