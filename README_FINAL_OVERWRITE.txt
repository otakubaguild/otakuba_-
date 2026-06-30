おたく場ギルド v3.0 FINAL OVERWRITE

使い方:
1. このZIPを展開
2. 中身をGitHubリポジトリ直下へ全部上書き
3. URLを開く:
   https://hayate19980821.github.io/otakuba_guild/index.html?v=3.0-final

重要:
- フォルダ不要のフラット構成です。
- 古いファイルは残っていても基本的に無視されます。
- index.html / admin.html / js / css / json / 画像 / 音源はすべて直下参照です。

GAS:
- Code_GAS_v5_complete_server.gs をGoogle Apps Scriptの Code.gs に貼り替え
- setup() を1回実行
- Webアプリでデプロイ
- 発行URLを管理画面 settings.json の gasUrl に設定

主な機能:
- 名前 → 人数 → チャージ確認 → メイン画面
- チャージ 500G × 人数
- 商品ごと数量選択 → 注文確認 → 即注文
- 注文確定時に敵へダメージ
- 会計ではダメージなし
- 会計で売上・顧客更新・レベルアップ演出
- おかえり表示
- いいえ時のギルドマスター表示
- 管理画面: メニュー、顧客、履歴、JSON編集、GAS同期
