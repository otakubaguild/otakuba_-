window.GuildUtils = (() => {
  function $(id){ return document.getElementById(id); }
  function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`; }
  function yen(n, currency='G'){ return `${(Number(n)||0).toLocaleString('ja-JP')}${currency}`; }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function todayText(){ return new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'}); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, Number(n)||0)); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  return {$, uid, yen, esc, todayText, clamp, sleep};
})();
