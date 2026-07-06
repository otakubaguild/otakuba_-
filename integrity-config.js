// 改ざん検知の「正解」データです。ここは買った人が触る場所ではありません。
// 配布用マスターテンプレートを完成させたら、最後に generate-integrity-hashes.js を実行して
// このファイルを自動生成し直してください（中身を書き換えるたびに再生成が必要です）。
//
// expectedHashes が空のままなら、改ざん検知は一切動作しません（開発中はこの状態でOK）。
window.GuildIntegrity = window.GuildIntegrity || {};
window.GuildIntegrity.expectedHashes = {
  // 例: 'license.js': 'ここにSHA-256ハッシュ値（16進数）',
};
