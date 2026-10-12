# 穴埋め公社 — 掘るなとは言っていない。

人間は自分の事情で穴を掘り、ロボットは与えられた規則で穴を埋める。
プレイヤーは公社の運用責任者として、その組み合わせから生じる問題に対処する3D箱庭シミュレーション。

- 32×32の高さグリッド。掘ればマスが凹み、土は保存される（竣工でも陥没でも土は増減しない）
- A*経路探索、ロボット同士の渋滞と経路の再計算
- 物流の分担：運搬機が採土場・残土の山 → 土砂置き場、埋戻機は置き場からのみ補給
- ロボットをタップすると作業・積載・目的地・経路・停止理由を表示
- 評価項目に独自統計「迷走記録」（埋めたあと掘り返された土砂、採土場へ戻された土砂、渋滞待ち、無駄足）

## 遊ぶ

GitHub Pages：https://kitune2go.github.io/anaume-kousha/

または `dist/anaume.html` をブラウザで開く。モデルとテクスチャを埋め込んだ単一ファイルで、three.js だけCDNから読み込む。

## シーズン1

| 話 | 題 | 状態 |
|---|---|---|
| 第1話 | 穴が開いております | 遊べる（5分） |
| 第2話 | 掘るなとは言っていない | 遊べる（8分） |
| 第3話 | ここは私の土地です | 準備中 |
| 第4話 | 土はどこへ行った | 準備中 |
| 最終話 | 担当者は休暇中 | 準備中 |

各話は `src/anaume.template.html` の `STAGES` に定義データとして書かれている。
期間・初期資金・乱数シード・ロボット台数・人間と登場時刻・使える道具・イベント・陥没頻度・クリア条件を差し替えるだけで新しい話になる。
シミュレーションは0.05秒の固定刻みで進み、話ごとの乱数シードで同じ操作から同じ結果が出る。

## 構成

```
src/anaume.template.html   ゲーム本体（HTML/CSS/JS、ステージ定義を含む）
assets/models/             glTFモデル（CC0）
assets/skins/              人物のスキン（CC0）
tools/build.py             assets を埋め込んで dist/anaume.html を生成
tools/sim-test.js          各話を複数の遊び方で早送りし、結果と土量誤差を表で出す
docs/                      企画書2.0、シーズン1計画、MVPレビュー、開発記録
prototypes/                前身の試作（制度の柱、年度政策版の穴埋め公社）
```

## ビルドとテスト

```sh
python3 tools/build.py          # dist/anaume.html
npm install                     # playwright と three@0.128.0（テストをオフラインで動かすため）
npx playwright install chromium
npm test                        # build --test → sim-test.js
```

`npm test` は土量誤差が0でないか、ページでエラーが出た場合に失敗する。

## クレジット

- Kenney「Nature Kit」「Fantasy Town Kit」「Car Kit」「Blocky Characters」— CC0（www.kenney.nl）
- RobotExpressive — Tomás Laulhé（Quaternius）、改変 Don McCurdy — CC0
- three.js r128 — MIT

各ライセンス文は `assets/LICENSE-*` に同梱。
