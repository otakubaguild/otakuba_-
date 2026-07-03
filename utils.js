window.GuildUtils = (() => {
  function $(id){ return document.getElementById(id); }
  function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`; }
  function yen(n, currency='G'){ return `${(Number(n)||0).toLocaleString('ja-JP')}${currency}`; }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  // GoogleドライブのURLを、画像表示が安定するlh3形式に変換
  function driveImg(url){
    const s=String(url||'');
    let id='';
    let m=s.match(/[?&]id=([\w-]+)/); if(m) id=m[1];
    if(!id){ m=s.match(/\/d\/([\w-]+)/); if(m) id=m[1]; }
    if(id) return 'https://lh3.googleusercontent.com/d/'+id;
    return s;
  }
  function todayText(){ return new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'}); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, Number(n)||0)); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  // 顧客アバター表示用。画像があればそれを、無ければ絵文字を返す（indexとadmin両方で共通利用）
  function avatarTag(c){
    c=c||{};
    if(c.avatarImage) return `<img class="avatar-img-tag" src="${c.avatarImage}" alt="">`;
    return `<span class="avatar-tag">${esc(c.avatar||'🙂')}</span>`;
  }
  return {$, uid, yen, esc, todayText, clamp, sleep, driveImg, avatarTag};
})();
