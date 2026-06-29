# おたく場ギルド GAS注文台帳API v1.5

## 入れる場所
- Code.gs → Google Apps Script の Code.gs に丸ごと貼り替え
- index.html / admin.html → GitHub の同名ファイルへ上書き

## 必ずやること
1. Code.gs先頭の WEBHOOK を自分のDiscord Webhook URLに変更
2. Apps Scriptで保存
3. デプロイ → デプロイを管理 → 新しいバージョン → デプロイ
4. WebアプリURLを admin.html の通知設定/GAS注文台帳URLに保存
5. URL末尾に ?action=list を付けてブラウザで開き、JSONが返るか確認

## 追加API
GET  ?action=list または ?action=listOrders
GET  ?action=summary
POST action: order
POST action: adminUpdate
  update: done / plus / minus / itemPlus / itemMinus / itemCancel / cancel

## 注意
GASのウェブアプリ設定は「自分として実行」「アクセスできるユーザー：全員」にしてください。
