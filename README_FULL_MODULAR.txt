おたく場ギルド v3.0 完全分割管理版

目的
- 巨大な index.html を直接編集し続けない構成に変更
- HTMLは画面骨組みだけ
- CSSは見た目だけ
- JSは機能ごと
- データはJSON
- 画像/音源は assets 配下で整理

アップロード方法
1. このZIPを展開
2. 中身を GitHub リポジトリ直下へ全部上書き
   ※ otakuba_v3_full_modular フォルダごと入れない
3. GitHub Pagesで開く
   https://hayate19980821.github.io/otakuba_guild/index.html?v=3.0-full-modular

構成
index.html
admin.html

css/
- main.css       共通UI
- battle.css     戦闘画面
- menu.css       メニュー表示
- effects.css    フェードなど
- admin.css      管理画面

js/
- app.js         起動処理・ボタン紐付け
- utils.js       共通関数
- storage.js     JSON読込/localStorage保存/移行
- ui.js          画面切替・モーダル・背景・通知
- customer.js    冒険者/顧客
- menu.js        メニューカテゴリ/商品表示
- order.js       直接注文/会計/売上/通知
- battle.js      ダメージ/撃破/次敵/魔王撃破
- audio.js       BGM/SE
- discord.js     GAS/Discord通知
- admin.js       管理画面JSON編集

data/
- menu.json
- monsters.json
- settings.json
- customers.json
- sales.json

assets/
- bg/            背景画像
- monsters/      敵画像
- bgm/           BGM
- se/            効果音

今回の重要仕様
- 受注一覧なし
- 商品の「注文」ボタン → 確認 → 即注文
- 注文確定時に敵へダメージ
- 会計ではダメージなし
- 未会計注文は activeBill として保持
- 会計時に売上・顧客レベル更新
- 超過ダメージは次敵へ繰り越し
- 魔王撃破時は勝利SE → ED BGM

管理画面
admin.html
パスワード: OTAKU
ログイン状態は同じタブ内だけです。

編集の目安
メニュー変更: data/menu.json または 管理画面 menu.json
敵変更: data/monsters.json または 管理画面 monsters.json
音源変更: data/settings.json
戦闘演出変更: js/battle.js と css/battle.css
画面UI変更: index.html と css/main.css
注文処理変更: js/order.js

注意
- iPhone Safariでは最初のタップ後に音が鳴ります。
- GitHubにアップ後、古い表示ならURL末尾の ?v= を変えてください。
- 旧データがlocalStorageに残っている場合でも storage.js が新形式へ移行します。
