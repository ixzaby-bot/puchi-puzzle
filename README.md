# ぷちぷち日和

HTML・CSS・JavaScriptだけで動く、無限プチプチゲームです。ビルド、追加ライブラリ、サーバー側のプログラム、APIキーは不要です。

## 遊び方

- 8×8の64個の丸を押すと「ぷにっ」と沈み、指を離すと「ぷちゅっ」と潰れます。マウスでも同じ操作で遊べます。
- 指を大きくずらすとキャンセルできます。盤面の上はスクロールせずに遊べるので、ページをスクロールするときは盤面の外を使ってください。
- 対応するスマートフォンでは、潰した瞬間に短く振動します。振動が使えない端末でも音とアニメーションで遊べます。
- 色ごとに違う音が鳴り、上下左右へ色が飛び散ります。
- ダメージが3つたまった丸は自動で割れ、連鎖します。
- 連鎖が増えるほど演出が派手になり、10連鎖で特別演出が出ます。
- 黒ぷには各マスの生成時に0.5％の確率で現れ、斜めを含む周囲8マスを一気に割ります。
- 潰れた丸は約2.5秒で自動復活します。合計カウントは増え続けます。
- 「♪ 音 ON」で消音に切り替え、「カウントをリセット」で最初から遊べます。

音は最初のクリック／タップ後に鳴ります。音声ファイルのダウンロードはありません。再読み込みするとゲームの状態やカウントはリセットされます。

## ファイル構成

```text
puchi-puzzle/
├── index.html   … ゲーム画面（公開ページの入口）
├── style.css    … 色・配置・アニメーション
├── script.js    … 操作・音・連鎖・自動復活
├── .nojekyll    … Jekyllの変換処理を行わず静的ファイルを公開する設定
├── .gitignore   … Gitで管理しない作業用ファイルの指定
└── README.md    … この説明書
```

画像や外部フォント、外部サービスには依存していません。CSSとJavaScriptは相対パスで読み込むため、GitHub Pagesのリポジトリ名付きURLでも動作する構成です。

## パソコンで試す

`index.html` をダブルクリックしてブラウザで開いてください。インストールは不要です。

## GitHubへアップロードする（ブラウザだけでOK）

### 1. 公開用のリポジトリを作る

1. [GitHub](https://github.com/) にログインします。未登録ならアカウントを作成します。
2. 右上の「＋」→「New repository」を開きます。
3. Repository nameを `puchi-puzzle` にします（別の名前でも構いません）。
4. 「Public」を選びます。無料アカウントで公開するための設定です。
5. 「Add a README file」を有効にして「Create repository」を押します。

リポジトリとは、ゲームのファイルをGitHub上に保存する場所です。

### 2. このフォルダーの中身をアップロードする

1. 作ったリポジトリの「Code」タブを開きます。
2. 「Add file」→「Upload files」を選びます。
3. このフォルダー内の上記6ファイルをまとめてドラッグ＆ドロップします。
4. メッセージ欄に「ゲームを追加」などと入力します。
5. 個人用の新規リポジトリでは、直接 `main` に保存できる場合はそれを選び、「Commit changes」を押します。新しいブランチに保存する設定の場合は、「Propose changes」からPull Requestを作成し、「Merge pull request」で `main` に取り込んでください。
6. 「Code」タブで `main` のファイル一覧を確認します。

**フォルダー自体やZIPファイルではなく、中身のファイルをアップロードしてください。** リポジトリを開いた最初の階層に `index.html` が見える状態にします。作成時のREADMEは今回の説明書で置き換えて構いません。

Windowsで `.nojekyll` などが見えない場合は、エクスプローラーの「表示」→「表示」→「隠しファイル」を有効にしてください。アップロードできなかった場合は、GitHubの「Add file」→「Create new file」でファイル名を `.nojekyll` にして作成します。内容は空で構いません（空で保存できない場合は改行を1つ入力してください）。末尾に `.txt` を付けないでください。

## GitHub Pagesを有効にする

このゲームでは、ブランチから直接公開する方式を使います。独自のGitHub Actions設定ファイルやnpmの設定は不要です。

1. リポジトリの「Settings」を開きます。
2. 左側の「Pages」を選びます。
3. 「Build and deployment」を次のように設定します。

| 項目 | 選択する値 |
| --- | --- |
| Source | Deploy from a branch |
| Branch | main |
| Folder | / (root) |

4. 「Save」を押します。
5. 公開処理が終わるまで待ちます。反映には数分かかることがあります。
6. 「Settings」→「Pages」に表示される公開URL（「Visit site」）を開きます。

通常のリポジトリ名を使った場合、公開URLの形は `https://あなたのユーザー名.github.io/puchi-puzzle/` です。実際のURLはPages画面の表示を使ってください。リポジトリ名を変更した場合はURLの末尾も変わります。

「Actions」タブの `pages build and deployment` が成功していることも確認できます。「Deploy from a branch」を使った場合も、GitHub側の公開処理はActionsに表示されます。

## 公開後の確認

- 公開URLを開くと64個の丸が表示される。
- タップ／クリックで音とアニメーションが出る（端末側の消音設定も確認）。
- 約2.5秒後に潰れた丸が復活する。
- スマートフォンでも画面に収まり、操作できる。
- リセットと音の切り替えが使える。

実際のGitHub Pages上の確認は、上記の公開設定後に行ってください。

## ゲームを更新する

パソコンでファイルを編集したら、同じリポジトリの「Add file」→「Upload files」で変更したファイルを再アップロードし、`main` に保存します。公開設定をやり直す必要はありません。公開処理が完了したらページを更新してください。

古い表示が残る場合、Windowsでは `Ctrl + F5`、スマートフォンではページを再読み込みするかプライベートタブで確認します。

## 困ったとき

| 症状 | 確認すること |
| --- | --- |
| 404になる | 公開完了を待つ／Pagesに表示されたURLを使う／`main` の直下に小文字の `index.html` があるか確認する |
| mainが選べない | 先にファイルをコミットし、`main` ブランチを作成する |
| 画面だけ出て丸がない／デザインがない | `script.js`・`style.css` が `index.html` と同じ階層にあるか、ファイル名の大文字・小文字が一致するか確認する |
| Pagesが設定できない | リポジトリの管理権限と公開設定（Public）を確認する |
| 公開処理が失敗する | 「Actions」タブで失敗した処理のログを確認する |
| 音が出ない | 一度丸を押す／ゲーム内の音をONにする／端末やブラウザの消音設定を確認する |

## 公式の参考資料

- [GitHub Pagesの公開元を設定する](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHubへファイルを追加する](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [GitHub Pagesサイトを作成する](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
