# English

```
English
├── batTool
│   ├── csvQuoted.bat
│   └── csvToUtf8WithBOM.bat
├── module
│   ├── dompdf.min
│   └── pdfCreate
├── source
│   ├── img
│   ├── fonts
└── CreateVocabularyBook
```


## batTool
### `csvQuoted.bat`
* 全ての項目（フィールド）を `"` で囲む

### `csvToUtf8WithBOM.bat`
* Excel用に文字コードを「BOM付きUTF-8」に変換して開く

---

## module
### dompdf.min
* HTMLからPDFを高精度に書き出すため、ライブラリ dompdf.min.js（dompdf.js）に独自の拡張・バグ修正したファイル

### pdfCreate
* ブラウザ上でHTMLの構造を解析・整形し、しおり（アウトライン）、ハイパーリンク、カスタムフォントを保持したままベクトルPDFに変換して出力するためのESモジュール

---

## source
* 共通で使用するアセット

---

## CreateVocabularyBook
* csvファイルからpdfのオリジナル単語帳を作成