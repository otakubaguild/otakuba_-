RPGフォルダ移動対応 修正ファイル

原因:
RPG画像をリポジトリ直下から presets/rpg/ に移動したため、
presets.json がまだ slime.png / grass.png のように直下を参照していて反映されなくなっていました。

修正:
- RPGプリセットの bg / image を presets/rpg/xxx.png に変更
- 管理画面の背景/敵画像リストにも presets/rpg/ を追加

アップロード:
- presets.json
- admin.js
をGitHub直下へ上書きしてください。
