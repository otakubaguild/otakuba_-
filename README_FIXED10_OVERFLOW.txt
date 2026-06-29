おたく場ギルド v3.0 fixed10-overflow patch

上書きするファイル:
- index.html
- admin.html
- monsters.json

変更点:
- 敵を手持ち画像10体だけに固定
- 背景を手持ち7種だけに整理
- HP=金額として処理
- 注文金額が敵HPを超えた場合、超過分を次の敵へ順番に繰り越し
- 10000G注文でも1体ずつダメージ→撃破→次の敵→ダメージ演出を飛ばさない
- 古いlocalStorageに15体構成が残っていても、10体構成へ自動整理

確認URL:
index.html?v=3.0-fixed10-overflow
admin.html?v=3.0-fixed10-overflow
