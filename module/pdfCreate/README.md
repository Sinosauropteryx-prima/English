# pdfCreate.js

`pdfCreate.js` は、ブラウザ（クライアントサイド）上でHTMLの構造を解析・整形し、しおり（アウトライン）、ハイパーリンク、カスタムフォントを保持したままベクトルPDFに変換して出力するためのESモジュールです。

内部的に `dompdf.js`、`pdf-lib`、`@lillallol/outline-pdf` を組み合わせることで、解像度に依存しないテキスト選択・検索が可能なPDFドキュメントを生成します。

---

## 主な機能と特徴

- **ベクトルPDF出力**: ページ内のテキスト情報を画像化せず、ベクターデータとして直接PDFにマッピングします。そのため、拡大しても文字がぼやけず、テキストの選択や検索が可能です。
- **しおり（目次）対応**: `outlineStr` の指定に基づいて、閲覧用アプリケーション（Acrobat Reader等）のサイドバーに表示されるしおりツリーを構築します。
- **リンクの再構築**: HTML内の `<a>` タグの絶対座標・スケールを算出し、PDF上のリンクアノテーションにマッピングしてリンクの機能を保持します。
- **カスタムフォントの埋め込み**: ローカルまたはサーバー上のフォントファイル（.ttfなど）をBase64に自動エンコードし、PDFに埋め込んで表示崩れを防ぎます。

---

## 動作要件・前提条件

本モジュールは、一部のライブラリがグローバルスコープ（`window` オブジェクト）に存在することを前提としています。モジュールを読み込む前に、HTML側で以下のスクリプトをロードしてください。

```html
<!-- PDF描画コアエンジン -->
<!-- dompdf.min.jsはカスタマイズしたものがdompdf.minフォルダにあるのでそれを使用 -->
<script src="./dompdf.min.js"></script>

<!-- PDF結合・アノテーション操作ライブラリ -->
<script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>
```

> **注意**: しおり（アウトライン）の生成時に使用する `@lillallol/outline-pdf` は、モジュール内部でCDN（jsDelivr）から動的にインポートされます（`outlineStr` が指定されている場合のみ実行）。

---

## 基本的な使い方

### 1. フォントファイルの読み込み
フォントのフェッチやBase64への変換は非同期で行われるため、必ずPDF出力の処理（`exportPDF`）を実行する前に完了させてください。

```javascript
import { loadingFonts, exportPDF } from './pdfCreate.js';

// 初期化時や画面読み込み時に実行することを推奨します
await loadingFonts({
    fontUrls: [
        { family: 'Zen Maru Gothic', url: './fonts/ZenMaruGothic-Regular.ttf', isDefault: true },
        { family: 'Zen Maru Gothic 700', url: './fonts/ZenMaruGothic-Bold.ttf', isDefault: false }
    ],
    msgElId: 'font-status-msg' // メッセージを挿入する要素のID（任意）
});
```

### 2. PDFの出力
印刷対象となるコンテナ要素のCSSセレクタ、出力時の設定を指定して呼び出します。

```javascript
await exportPDF({
    debug: false,
    overlayFont: 'Zen Maru Gothic 700',
    pagesSelector: '.a3-page', // 対象となるページのCSSセレクタ
    outlineStr: '1||セクション 1\n1|-|サブセクション 1.1\n2||セクション 2', // しおり用の階層テキスト
    pdfFileName: 'output_document' // 保存時のファイル名 (拡張子.pdfは自動付与)
});
```

---

## 推奨されるCSSスタイル

PDFを変換・出力する際、対象の要素には一時的に `.pdf-print-active` というクラスが付与されます。背景色の固定や、非印刷コンポーネント（印刷ボタンやナビゲーション）の制御のために、以下のスタイルシートを定義しておくことを推奨します。

```css
/* PDF出力時に各ページ要素に強制するレイアウト */
.pdf-print-active {
    background-color: #ffffff !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}

/* 印刷時に非表示にする要素の制御 */
.pdf-print-active .no-print {
    display: none !important;
}
```

---

## API リファレンス

### `loadingFonts(config)`
フォントファイルのロードとBase64化を行います。

- **引数**:
  - `config` `{Object}`
    - `fontUrls` `{fontLoadingInfo[]}`: 読み込むフォント情報の配列
    - `msgElId` `{string}` *(任意)*: 処理進捗を表示するHTML要素のID
- **戻り値**: `Promise<void>`

#### `fontLoadingInfo` オブジェクトの構成
| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `family` | `string` | 登録するフォントファミリー名 |
| `url` | `string` | サーバー上のフォントファイルのURLまたは相対パス |
| `isDefault` | `boolean` | デフォルトフォントに設定するかどうか |

---

### `exportPDF(config)`
HTML構造を読み取り、ベクトルPDFを作成・ダウンロードします。

- **引数**:
  - `config` `{Object}`
    - `pagesSelector` `{string}`: PDF化する対象ページのCSSセレクタ
    - `pdfFileName` `{string}`: 出力されるPDFファイル名（拡張子不要）
    - `debug` `{boolean}` *(任意/デフォルト: false)*: `true`の場合、各処理の所要時間をコンソールに出力し、保存前に「PDF出力」確認ボタンを表示します。
    - `overlayFont` `{string}` *(任意)*: ローディング時に表示されるインジケーターテキストのフォント名
    - `outlineStr` `{string}` *(任意)*: しおり階層定義の文字列
- **戻り値**: `Promise<void>`

---

## 技術的な考慮事項・実装仕様

1. **ページサイズと方向の自動調整**
   本モジュールは、最初に見つかった対象ページ要素（`pagesSelector` で指定された要素）の `getBoundingClientRect()` から、幅と高さを動的に読み取ります。この寸法を基準にして、PDFの判型（A4、A3など）および用紙方向（縦・横）を決定します。

2. **座標系の変換 (HTML vs PDF)**
   HTML上のリンク要素の位置をPDFアノテーションへ変換する際、**HTML（左上基準）**と**PDF（左下基準）**の座標原点の相違を解決するため、以下の補正処理が実行されます。
   $$\text{scale} = \frac{\text{PDFPageWidth}}{\text{HTMLPageWidth}}$$
   $$x_1 = (rect.left - parentRect.left) \times \text{scale}$$
   $$y_1 = \text{PDFPageHeight} - (rect.bottom - parentRect.top) \times \text{scale}$$

3. **エラー時のフォールバック**
   指定されたフォントURLからの取得に失敗した場合は、例外を内部的にキャッチし、標準フォントである `Helvetica` で代替レンダリングを試みるよう安全にフォールバックされます。
