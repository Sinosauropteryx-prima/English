# dompdf.min.js

元ファイルは[こちら](https://github.com/lmn1919/dompdf.js/blob/main/README.md)

---

## ライブラリのカスタマイズ（修正内容）

本プロジェクトでは、HTMLからPDFを高精度に書き出すため、ライブラリ `dompdf.min.js`（`dompdf.js`）に独自の拡張・バグ修正を施しています。

---

### 1. `dompdf.min.js` のマルチウェイト対応およびマッチング機能の追加

#### ■ 背景と目的
標準の `dompdf.js` には、以下の仕様制限および不具合が存在します。
* **フォント登録の不具合**: フォントを読み込む際、設定ファイル（`fontConfig`）内の `fontStyle` や `fontWeight` の指定を無視し、内部で一律 `"normal"`（400）として jsPDF に登録してしまう。
* **バリデーション制限**: `400`（normal）と `700`（bold）以外のウェイト（例: 300, 500, 900 など）を設定すると、検証フェーズでエラーとなり除外される。
* **フォントマッチングの不具合**: CSS上の `font-family` を厳密に照合せず、最初に見つかった「太さが一致するフォント」を適用してしまい、複数フォントの出し分けが困難になる。

これらの制限を解除し、複数のカスタムフォントをウェイト（100〜900）ごとに厳密に出し分けられるようにするため、以下の3つの修正を行っています。

---

#### ■ 具体的な修正箇所

##### ① フォント登録処理の修正 (`addFontToJsPDF` の変更)
フォント登録時に固定値 `"normal"` ではなく、設定された `fontStyle` と `fontWeight` を正確に引き渡すように変更します。

* **検索対象（修正前）**:
  ```javascript
  mB(this.options.fontConfig)||((yB(this.options.fontConfig)?[this.options.fontConfig]:this.options.fontConfig).forEach((function(t){A.jspdfCtx.addFileToVFS(t.fontFamily+".ttf",t.fontBase64),A.jspdfCtx.addFont(t.fontFamily+".ttf",t.fontFamily,"normal"),A.jspdfCtx.setFont(t.fontFamily)}))
  ```
* **置換対象（修正後）**:
  ```javascript
  mB(this.options.fontConfig)||((yB(this.options.fontConfig)?[this.options.fontConfig]:this.options.fontConfig).forEach((function(t){A.jspdfCtx.addFileToVFS(t.fontFamily+".ttf",t.fontBase64),A.jspdfCtx.addFont(t.fontFamily+".ttf",t.fontFamily,t.fontStyle,t.fontWeight),A.jspdfCtx.setFont(t.fontFamily)}))
  ```

##### ② バリデータ制限の解除（マルチウェイト対応）
`400` と `700` 以外のウェイトが登録時にブロックされる制限を解除し、`100`〜`900` までの登録を可能にします。

* **検索対象（修正前）**:
  ```javascript
  if(![400,700].includes(r.fontWeight))return!1;
  ```
* **置換対象（修正後）**:
  ```javascript
  if(![100,200,300,400,500,600,700,800,900].includes(r.fontWeight))return!1;
  ```

##### ③ フォントマッチング処理の高度化 (`setTextFont` の変更)
CSSに定義された `font-family` と登録フォント名を厳密に照合した上で、指定された太さに最も近いフォントを数学的（近傍値計算）に選出するインテリジェントなマッチング処理に置き換えます。

* **検索対象（修正前）**:
  ```javascript
  e.prototype.setTextFont=function(A){var t,e,r,n;if(mB(this.options.fontConfig))return"";var i=A.fontWeight+"-"+A.fontStyle+"-"+A.fontFamily.join(","),s=this.textFontCache.get(i);if(void 0!==s)return s&&this.jspdfCtx.setFont(s),s;var o,a=this.options.fontConfig,c=a.find((function(A){return A.iconFont})),l=a.filter((function(A){return!A.iconFont}));return o=c&&A.fontFamily.some((function(A){return A.includes(c.fontFamily)}))?null!==(t=c.fontFamily)&&void 0!==t?t:"":1===l.length?null!==(e=l[0].fontFamily)&&void 0!==e?e:"":null!==(n=null===(r=l.find((function(t){return t.fontWeight===(A.fontWeight>500?700:400)&&t.fontStyle===A.fontStyle})))||void 0===r?void 0:r.fontFamily)&&void 0!==n?n:"",o&&(this.jspdfCtx.setFont(o),this.currentFontFamily=o),this.textFontCache.set(i,o),o}
  ```
* **置換対象（修正後）**:
  ```javascript
  e.prototype.setTextFont=function(A){if(mB(this.options.fontConfig))return"";var i=A.fontWeight+"-"+A.fontStyle+"-"+A.fontFamily.join(","),s=this.textFontCache.get(i);if(void 0!==s)return s&&this.jspdfCtx.setFont(s),s;var o,a=this.options.fontConfig,h=a.filter((function(t){return A.fontFamily.some((function(A){return A.includes(t.fontFamily)}))})),B=null,f=null;return h.length>0&&(B=h.find((function(t){return t.fontWeight===A.fontWeight&&t.fontStyle===A.fontStyle})),B||(f=h.filter((function(t){return t.fontStyle===A.fontStyle})),f.length>0?(f.sort((function(t,e){return Math.abs(t.fontWeight-A.fontWeight)-Math.abs(e.fontWeight-A.fontWeight)})),B=f[0]):B=h[0])),B||(B=a.find((function(t){return t.isDefault}))||a[0]),o=B?B.fontFamily:"",o&&(this.jspdfCtx.setFont(o,this.getCombinedFontStyle(B.fontStyle,B.fontWeight)),this.currentFontFamily=o),this.textFontCache.set(i,o),o}
  ```

---

#### ■ 運用上の推奨設計（注意点）
上記のライブラリ修正を行うことでマルチウェイトフォントが利用可能になりますが、jsPDFおよびブラウザの仕様上、HTML上のスタイルと登録フォントのウェイト設定に不整合が生じると、以下のエラーが発生する場合があります。

> **エラー例**: `Unable to look up font label for font 'Zen Maru Gothic 700', 'normal'.`

これは、「要素に `font-weight` が指定されていない（または `normal` の）状態で描画を行う際、ライブラリが対象フォントの `normal`（400）スタイルを探すものの、JavaScript側でそのフォントが `700`（bold）としてしか登録されていない」ために発生します。

この不整合によるエラーを防ぎ、意図したウェイトで安定して描画するために、以下の**「太さごとに別フォントファミリー名として登録・運用するアプローチ」**を推奨します。

##### 1. フォント設定（JavaScript）の定義
すべてのウェイトをそれぞれ独立した「異なるファミリー名」として設定し、バグの発生を防ぐために登録上のウェイトを一律 `400`（normal）に統一します。

```javascript
const fontUrls = [
    { family: 'Zen Maru Gothic 400', style: 'normal', weight: 400, url: 'fonts/ZenMaruGothic-Regular.ttf' },
    { family: 'Zen Maru Gothic 500', style: 'normal', weight: 400, url: 'fonts/ZenMaruGothic-Medium.ttf' },
    { family: 'Zen Maru Gothic 700', style: 'normal', weight: 400, url: 'fonts/ZenMaruGothic-Bold.ttf' },
    { family: 'Share Tech Mono 400', style: 'normal', weight: 400, url: 'fonts/ShareTechMono-Regular.ttf' }
];
```

##### 2. CSSでの適用
フォントファイル（.ttf）自体がすでに各太さの実データを持っているため、CSS側ではそれぞれのファミリー名を指定した上で、ブラウザの自動太字変換処理やノーマル探索によるクラッシュを避けるために一律 `font-weight: normal !important` を指定します。

```css
@font-face {
  font-family: 'Zen Maru Gothic 400';
  src: url('fonts/ZenMaruGothic-Regular.ttf') format('truetype');
}
@font-face {
  font-family: 'Zen Maru Gothic 500';
  src: url('fonts/ZenMaruGothic-Medium.ttf') format('truetype');
}
@font-face {
  font-family: 'Zen Maru Gothic 700';
  src: url('fonts/ZenMaruGothic-Bold.ttf') format('truetype');
}

/* ベースの標準テキスト */
body, .font-zen-maru {
  font-family: 'Zen Maru Gothic 400', sans-serif;
}

/* 太字（Medium / Bold）にしたい要素 */
strong, h1, h2, h3, h4, h5, h6, .font-bold {
  font-family: 'Zen Maru Gothic 700', sans-serif !important;
  font-weight: normal !important; /* 不整合とエラーを防ぐためnormalを強制 */
}
```

---

### 2. `dompdf.min.js` のSVGベクトル描画対応（ラスター化の防止）

#### ■ 背景と目的
標準の `dompdf.js` では、HTML上の `<svg>` 要素（`path` などのベクター形式で直接書かれた図形）をレンダリングする際、内部で一時的に `canvas` に描き出し、それをPNG画像（ラスター画像）に変換してPDFに埋め込む仕様になっています。
そのため、PDFを出力した際にSVG部分だけがボヤけてしまったり、拡大時に画質が劣化する問題がありました。

外部の非同期ライブラリ（`svg2pdf.js` など）を呼び出す方法では、`dompdf.js` の非同期ステートマシン（ジェネレータ）との実行順序の制御が難しく、描画が間に合わずに白紙化する傾向があります。
そこで、ライブラリ内部に**「完全に同期して動作する高精度なSVGパス解析・ベクター描画処理」**を直接組み込み、外部依存なしにベクターデータのままPDFを出力できるように修正を行います。

このエンジンは、以下の技術要件に対応しています。
* 数値内の指数表記（`1e-5` など）を破壊しない高精度なマスタートークナイザーの搭載
* `dompdf.js` 側のコンテキストが非対応である `arc` / `ellipse` の挙動を、3次ベジエ曲線群（4本のベジエ曲線）による真円・楕円エミュレーションで補完
* 円弧（`A` / `a` コマンド）を数理変換によりベジエ曲線群として展開
* 制御点対称反転（`S`/`s`、`T`/`t` コマンド）の追従
* `<g transform="...">` など、入れ子状になった各種トランスフォーム行列の解析サポート
* `<defs>` などの描画対象外タグのスキップ処理

---

#### ■ 具体的な修正箇所

##### ① クローン生成時のSVG参照保持 (`un` 処理の修正)
描画フェーズで元のSVGのDOMノード（クローン）を解析できるように、データモデル上に `element` 参照を追加します。

* **検索対象（修正前）**:
  ```javascript
  un = (function (A) {
          function e(t, e) {
            var r = A.call(this, t, e) || this;
            var n = new XMLSerializer(),
                i = IA(t, e);
            return (
              e.setAttribute("width", i.width + "px"),
              e.setAttribute("height", i.height + "px"),
              (r.svg = "data:image/svg+xml," + encodeURIComponent(n.serializeToString(e))),
              (r.intrinsicWidth = e.width.baseVal.value),
              (r.intrinsicHeight = e.height.baseVal.value),
              r.context.cache.addImage(r.svg),
              r
            );
          }
          return (t(e, A), e);
        })(Xr),
  ```
* **置換対象（修正後）**:
  ```javascript
  un = (function (A) {
          function e(t, e) {
            var r = A.call(this, t, e) || this;
            var n = new XMLSerializer(),
                i = IA(t, e);
            return (
              e.setAttribute("width", i.width + "px"),
              e.setAttribute("height", i.height + "px"),
              (r.svg = "data:image/svg+xml," + encodeURIComponent(n.serializeToString(e))),
              (r.intrinsicWidth = e.width.baseVal.value),
              (r.intrinsicHeight = e.height.baseVal.value),
              (r.element = e), // ★ クローンされたSVG要素（DOM）の参照を保持
              r.context.cache.addImage(r.svg),
              r
            );
          }
          return (t(e, A), e);
        })(Xr),
  ```

##### ② ベクター描画エンジンの埋め込み (`renderReplacedJsPdfSvg` の変更)
描画処理時に A.bounds（生ピクセル値）に基づき、パスデータを解析して直接ベクターとして描画する処理をインジェクションします。

* **検索対象（修正前）**:
  ```javascript
  e.prototype.renderReplacedJsPdfSvg = function (A, t) {
    var e = this.getPdfBounds(A),
      r = e.x,
      n = e.y,
      i = e.width,
      s = e.height,
      o = document.createElement("canvas");
    ((o.width = i), (o.height = s));
    var a = o.getContext("2d");
    if (a) {
      (a.clearRect(0, 0, i, s), a.drawImage(t, 0, 0, i, s));
      var c = o.toDataURL("image/png", NB);
      this.addImagePdf(c, "PNG", r, n, i, s);
    }
  };
  ```
* **置換対象（修正後）**:
  ```javascript
  e.prototype.renderReplacedJsPdfSvg = function (A, t) {
    var r = A.bounds.left,
      n = A.bounds.top,
      i = A.bounds.width,
      s = A.bounds.height;

    // 高精度・完全同期型 SVGベクター描画エンジン
    if (A.element) {
      var ctx = this.context2dCtx;
      ctx.save();
      
      // ビューポートと拡大縮小率の計算
      var viewBoxAttr = A.element.getAttribute("viewBox");
      var svgW = parseFloat(A.element.getAttribute("width")) || A.intrinsicWidth || i;
      var svgH = parseFloat(A.element.getAttribute("height")) || A.intrinsicHeight || s;
      var minX = 0, minY = 0, vbW = svgW, vbH = svgH;
      if (viewBoxAttr) {
        var vb = viewBoxAttr.split(/[\s,]+/).map(Number);
        if (vb.length === 4 && vb.every(function(x){ return !isNaN(x); })) {
          minX = vb[0];
          minY = vb[1];
          vbW = vb[2];
          vbH = vb[3];
        }
      }
      
      ctx.translate(r, n);
      ctx.scale(i / vbW, s / vbH);
      ctx.translate(-minX, -minY);

      // transform属性のパーサー
      var parseTransform = function (transformAttr, c2d) {
        if (!transformAttr) return;
        var matches = transformAttr.match(/(\w+)\(([^)]+)\)/g);
        if (!matches) return;
        for (var i = 0; i < matches.length; i++) {
          var m = matches[i].match(/(\w+)\(([^)]+)\)/);
          if (!m) continue;
          var type = m[1].toLowerCase();
          var args = m[2].split(/[\s,]+/).map(Number);
          if (type === "translate") {
            c2d.translate(args[0] || 0, args[1] || 0);
          } else if (type === "scale") {
            c2d.scale(args[0] || 1, args[1] !== undefined ? args[1] : args[0]);
          } else if (type === "rotate") {
            var angle = (args[0] || 0) * Math.PI / 180;
            if (args.length === 3) {
              c2d.translate(args[1], args[2]);
              c2d.rotate(angle);
              c2d.translate(-args[1], -args[2]);
            } else {
              c2d.rotate(angle);
            }
          } else if (type === "matrix" && args.length === 6) {
            c2d.transform(args[0], args[1], args[2], args[3], args[4], args[5]);
          }
        }
      };

      // 円弧(Arc)をベジエ曲線に変換して描画するヘルパー
      var drawArc = function (c2d, x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
        if (rx === 0 || ry === 0) {
          c2d.lineTo(x2, y2);
          return;
        }
        rx = Math.abs(rx); ry = Math.abs(ry);
        var cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
        var dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
        var x1p = cosPhi * dx + sinPhi * dy;
        var y1p = -sinPhi * dx + cosPhi * dy;
        var rx2 = rx * rx, ry2 = ry * ry, x1p2 = x1p * x1p, y1p2 = y1p * y1p;
        var lambda = x1p2 / rx2 + y1p2 / ry2;
        if (lambda > 1) {
          rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda);
          rx2 = rx * rx; ry2 = ry * ry;
        }
        var sign = largeArc === sweep ? -1 : 1;
        var num = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
        var den = rx2 * y1p2 + ry2 * x1p2;
        var factor = num < 0 ? 0 : sign * Math.sqrt(num / den);
        var cxp = factor * (rx * y1p) / ry;
        var cyp = factor * -(ry * x1p) / rx;
        var cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
        var cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
        var theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
        var theta2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
        var deltaTheta = theta2 - theta1;
        if (sweep && deltaTheta < 0) deltaTheta += 2 * Math.PI;
        else if (!sweep && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
        var segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
        for (var k = 0; k < segments; k++) {
          var th1 = theta1 + k * deltaTheta / segments;
          var th2 = theta1 + (k + 1) * deltaTheta / segments;
          var t = Math.tan((th2 - th1) / 4);
          var alpha = Math.sin(th2 - th1) * (Math.sqrt(4 + 3 * t * t) - 1) / 3;
          var cosTh1 = Math.cos(th1), sinTh1 = Math.sin(th1);
          var cosTh2 = Math.cos(th2), sinTh2 = Math.sin(th2);
          var cp1x = cx + cosPhi * rx * (cosTh1 - alpha * sinTh1) - sinPhi * ry * (sinTh1 + alpha * cosTh1);
          var cp1y = cy + sinPhi * rx * (cosTh1 - alpha * sinTh1) + cosPhi * ry * (sinTh1 + alpha * cosTh1);
          var cp2x = cx + cosPhi * rx * (cosTh2 + alpha * sinTh2) - sinPhi * ry * (sinTh2 - alpha * cosTh2);
          var cp2y = cy + sinPhi * rx * (cosTh2 + alpha * sinTh2) + cosPhi * ry * (sinTh2 - alpha * cosTh2);
          var endX = cx + cosPhi * rx * cosTh2 - sinPhi * ry * sinTh2;
          var endY = cy + sinPhi * rx * cosTh2 + cosPhi * ry * sinTh2;
          c2d.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        }
      };

      // 円・楕円をベジエ曲線で再現して描画するヘルパー
      var drawEllipse = function (c2d, cx, cy, rx, ry) {
        var kappa = 0.5522848;
        var ox = rx * kappa, oy = ry * kappa;
        c2d.moveTo(cx - rx, cy);
        c2d.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
        c2d.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
        c2d.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
        c2d.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
      };

      // 高精度パスパーサー（指数表記eを保護するマスタートークナイザー）
      var parsePath = function (d, c2d) {
        var tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
        if (!tokens) return;
        var curX = 0, curY = 0, startX = 0, startY = 0;
        var lastCtrlX = 0, lastCtrlY = 0, lastCmd = "";
        var idx = 0;
        while (idx < tokens.length) {
          var token = tokens[idx];
          var cmd = isNaN(Number(token)) ? (idx++, token) : (lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd);
          if (!cmd) break;
          var nextFloat = function () {
            return idx < tokens.length && !isNaN(Number(tokens[idx])) ? Number(tokens[idx++]) : 0;
          };
          switch (cmd) {
            case 'M':
              curX = nextFloat(); curY = nextFloat();
              c2d.moveTo(curX, curY); startX = curX; startY = curY;
              lastCmd = 'M'; break;
            case 'm':
              curX += nextFloat(); curY += nextFloat();
              c2d.moveTo(curX, curY); startX = curX; startY = curY;
              lastCmd = 'm'; break;
            case 'L':
              curX = nextFloat(); curY = nextFloat();
              c2d.lineTo(curX, curY); lastCmd = 'L'; break;
            case 'l':
              curX += nextFloat(); curY += nextFloat();
              c2d.lineTo(curX, curY); lastCmd = 'l'; break;
            case 'H':
              curX = nextFloat(); c2d.lineTo(curX, curY); lastCmd = 'H'; break;
            case 'h':
              curX += nextFloat(); c2d.lineTo(curX, curY); lastCmd = 'h'; break;
            case 'V':
              curY = nextFloat(); c2d.lineTo(curX, curY); lastCmd = 'V'; break;
            case 'v':
              curY += nextFloat(); c2d.lineTo(curX, curY); lastCmd = 'v'; break;
            case 'C':
              var x1 = nextFloat(), y1 = nextFloat(), x2 = nextFloat(), y2 = nextFloat();
              curX = nextFloat(); curY = nextFloat();
              c2d.bezierCurveTo(x1, y1, x2, y2, curX, curY);
              lastCtrlX = x2; lastCtrlY = y2; lastCmd = 'C'; break;
            case 'c':
              var x1 = curX + nextFloat(), y1 = curY + nextFloat(), x2 = curX + nextFloat(), y2 = curY + nextFloat();
              curX += nextFloat(); curY += nextFloat();
              c2d.bezierCurveTo(x1, y1, x2, y2, curX, curY);
              lastCtrlX = x2; lastCtrlY = y2; lastCmd = 'c'; break;
            case 'S':
              var x2 = nextFloat(), y2 = nextFloat(), x1 = curX, y1 = curY;
              if (['C','c','S','s'].indexOf(lastCmd) >= 0) { x1 = 2 * curX - lastCtrlX; y1 = 2 * curY - lastCtrlY; }
              curX = nextFloat(); curY = nextFloat();
              c2d.bezierCurveTo(x1, y1, x2, y2, curX, curY);
              lastCtrlX = x2; lastCtrlY = y2; lastCmd = 'S'; break;
            case 's':
              var dx2 = nextFloat(), dy2 = nextFloat(), x2 = curX + dx2, y2 = curY + dy2, x1 = curX, y1 = curY;
              if (['C','c','S','s'].indexOf(lastCmd) >= 0) { x1 = 2 * curX - lastCtrlX; y1 = 2 * curY - lastCtrlY; }
              curX += nextFloat(); curY += nextFloat();
              c2d.bezierCurveTo(x1, y1, x2, y2, curX, curY);
              lastCtrlX = x2; lastCtrlY = y2; lastCmd = 's'; break;
            case 'Q':
              var x1 = nextFloat(), y1 = nextFloat(); curX = nextFloat(); curY = nextFloat();
              c2d.quadraticCurveTo(x1, y1, curX, curY);
              lastCtrlX = x1; lastCtrlY = y1; lastCmd = 'Q'; break;
            case 'q':
              var x1 = curX + nextFloat(), y1 = curY + nextFloat(); curX += nextFloat(); curY += nextFloat();
              c2d.quadraticCurveTo(x1, y1, curX, curY);
              lastCtrlX = x1; lastCtrlY = y1; lastCmd = 'q'; break;
            case 'T':
              var x1 = curX, y1 = curY;
              if (['Q','q','T','t'].indexOf(lastCmd) >= 0) { x1 = 2 * curX - lastCtrlX; y1 = 2 * curY - lastCtrlY; }
              curX = nextFloat(); curY = nextFloat();
              c2d.quadraticCurveTo(x1, y1, curX, curY);
              lastCtrlX = x1; lastCtrlY = y1; lastCmd = 'T'; break;
            case 't':
              var x1 = curX, y1 = curY;
              if (['Q','q','T','t'].indexOf(lastCmd) >= 0) { x1 = 2 * curX - lastCtrlX; y1 = 2 * curY - lastCtrlY; }
              curX += nextFloat(); curY += nextFloat();
              c2d.quadraticCurveTo(x1, y1, curX, curY);
              lastCtrlX = x1; lastCtrlY = y1; lastCmd = 't'; break;
            case 'A':
            case 'a':
              var rx = nextFloat(), ry = nextFloat(), xAxisRotation = nextFloat() * Math.PI / 180;
              var largeArcFlag = nextFloat(), sweepFlag = nextFloat(), targetX = nextFloat(), targetY = nextFloat();
              if (cmd === 'a') { targetX += curX; targetY += curY; }
              drawArc(c2d, curX, curY, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, targetX, targetY);
              curX = targetX; curY = targetY; lastCmd = cmd; break;
            case 'Z':
            case 'z':
              c2d.closePath(); curX = startX; curY = startY; lastCmd = 'Z'; break;
            default: idx++;
          }
        }
      };

      // 無効なタグ（defs等）を検知して非表示にするフィルタ
      var shouldSkip = function (el) {
        var cur = el;
        while (cur) {
          var tag = cur.tagName.toLowerCase();
          if (tag === "defs" || tag === "lineargradient" || tag === "radialgradient" || tag === "clippath") return true;
          cur = cur.parentElement;
        }
        return false;
      };

      // 各要素の再帰的なベクトル描画
      var drawElement = function (el, inheritedFill, inheritedStroke, inheritedStrokeWidth) {
        var tagName = el.tagName.toLowerCase();
        var style = window.getComputedStyle(el);
        var fill = el.getAttribute("fill") || (el.style.fill !== "" ? el.style.fill : null) || inheritedFill || "black";
        var stroke = el.getAttribute("stroke") || (el.style.stroke !== "" ? el.style.stroke : null) || inheritedStroke || "none";
        var strokeWidthAttr = el.getAttribute("stroke-width") || (el.style.strokeWidth !== "" ? el.style.strokeWidth : null);
        var strokeWidth = strokeWidthAttr ? parseFloat(strokeWidthAttr) : (inheritedStrokeWidth || 1);
        
        ctx.save();
        
        var transform = el.getAttribute("transform");
        if (transform) parseTransform(transform, ctx);
        
        if (shouldSkip(el)) {
          if (tagName !== "defs") {
            for (var j = 0; j < el.children.length; j++) {
              drawElement(el.children[j], fill, stroke, strokeWidth);
            }
          }
          ctx.restore();
          return;
        }

        if (fill !== "none") ctx.fillStyle = fill;
        if (stroke !== "none") {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
        }
        
        if (tagName === "path") {
          var d = el.getAttribute("d");
          if (d) {
            ctx.beginPath();
            parsePath(d, ctx);
            if (fill !== "none") ctx.fill();
            if (stroke !== "none") ctx.stroke();
          }
        } else if (tagName === "rect") {
          var rx = parseFloat(el.getAttribute("x") || 0);
          var ry = parseFloat(el.getAttribute("y") || 0);
          var rw = parseFloat(el.getAttribute("width") || 0);
          var rh = parseFloat(el.getAttribute("height") || 0);
          ctx.beginPath(); ctx.rect(rx, ry, rw, rh);
          if (fill !== "none") ctx.fill();
          if (stroke !== "none") ctx.stroke();
        } else if (tagName === "circle") {
          var cx = parseFloat(el.getAttribute("cx") || 0);
          var cy = parseFloat(el.getAttribute("cy") || 0);
          var radius = parseFloat(el.getAttribute("r") || 0);
          ctx.beginPath(); drawEllipse(ctx, cx, cy, radius, radius);
          if (fill !== "none") ctx.fill();
          if (stroke !== "none") ctx.stroke();
        } else if (tagName === "ellipse") {
          var cx = parseFloat(el.getAttribute("cx") || 0);
          var cy = parseFloat(el.getAttribute("cy") || 0);
          var rx = parseFloat(el.getAttribute("rx") || 0);
          var ry = parseFloat(el.getAttribute("ry") || 0);
          ctx.beginPath(); drawEllipse(ctx, cx, cy, rx, ry);
          if (fill !== "none") ctx.fill();
          if (stroke !== "none") ctx.stroke();
        } else if (tagName === "line") {
          var x1 = parseFloat(el.getAttribute("x1") || 0);
          var y1 = parseFloat(el.getAttribute("y1") || 0);
          var x2 = parseFloat(el.getAttribute("x2") || 0);
          var y2 = parseFloat(el.getAttribute("y2") || 0);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          if (stroke !== "none") ctx.stroke();
        } else if (tagName === "polygon" || tagName === "polyline") {
          var pointsAttr = el.getAttribute("points");
          if (pointsAttr) {
            var pts = pointsAttr.trim().split(/[\s,]+/).map(Number);
            if (pts.length >= 2) {
              ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
              for (var k = 2; k < pts.length; k += 2) {
                ctx.lineTo(pts[k], pts[k+1]);
              }
              if (tagName === "polygon") ctx.closePath();
              if (fill !== "none" && tagName === "polygon") ctx.fill();
              if (stroke !== "none") ctx.stroke();
            }
          }
        }
        
        for (var j = 0; j < el.children.length; j++) {
          drawElement(el.children[j], fill, stroke, strokeWidth);
        }
        
        ctx.restore();
      };
      
      drawElement(A.element, null, null, null);
      ctx.restore();
      return; // ベクトルレンダリングが完了したため、処理を終了
    }

    // 従来のフォールバック処理（万が一パースに失敗した場合の画像埋め込み）
    var o = document.createElement("canvas");
    ((o.width = i), (o.height = s));
    var a = o.getContext("2d");
    if (a) {
      (a.clearRect(0, 0, i, s), a.drawImage(t, 0, 0, i, s));
      var c = o.toDataURL("image/png", NB);
      this.addImagePdf(c, "PNG", r, n, i, s);
    }
  };
  ```

  ---

### 3. テキストの縦方向の位置ズレ（ベースライン）の補正

#### ■ 背景と目的
PDF出力時、特に日本語カスタムフォント（「Zen Maru Gothic」など）において、文字が全体的に数ピクセル上に浮いてしまい、Webプレビュー上の表示位置と一致しない不具合がありました。この現象には、以下の2つの根本原因が存在します。

* **測定不具合（ベースライン計算の失敗）**:
  元の `dompdf.js`（内部の `html2canvas`）は、画面外に見えない `div` / `span` / `img` 要素を生成し、それぞれの上端の差分（`offsetTop`）を引き算するアナログなアプローチで文字の基準線（ベースライン）の高さを測っていました。しかし、和文フォントは欧文フォントと文字重心や余白の仕様が異なるため、ブラウザ上での引き算の計算結果に狂いが生じ、基準位置を実際より上に誤認していました。
* **描画時の位置ズレ（`textBaseline` の不一致）**:
  PDFの描画に使用する Canvas コンテキストの `textBaseline` 設定が初期値で `"bottom"`（文字の領域の最下部）に設定されていました。そのため、算出された座標が文字の底を基準として処理され、行間や文字の下側のはみ出し分（ディセント）が考慮されず、二重に上に押し上げられるズレを発生させていました。

この不具合を抜本的に修正するため、
1. `textBaseline` を本来のWeb標準規格である `"alphabetic"` に揃え、
2. 古いDOM要素を用いた不正確な計測処理を排除し、Canvas 2D API の `measureText()` でフォント自体の本来の基準値（`fontBoundingBoxAscent`）を正確に読み出すロジック（未対応ブラウザ用にはフォントサイズ×0.88の計算値による安全な代替ロジックを搭載）に書き換えます。

---

#### ■ 具体的な修正箇所

##### ① キャンバス描画基準（`textBaseline`）の修正（合計4箇所）
`dompdf.min.js` 内を検索し、以下の `textBaseline` を `"bottom"` に指定している4箇所すべてを、ベースライン基準の `"alphabetic"` に書き換えます。

* **1箇所目修正（PDFレンダラー初期化部）**:
  * 検索対象（修正前）: `(r.context2dCtx.textBaseline = "bottom"),`
  * 置換対象（修正後）: `(r.context2dCtx.textBaseline = "alphabetic"),`

* **2箇所目修正（PDFレンダラー リスト描画リセット部）**:
  * 検索対象（修正前）: `(this.context2dCtx.textBaseline = "bottom"),`
  * 置換対象（修正後）: `(this.context2dCtx.textBaseline = "alphabetic"),`

* **3箇所目修正（Canvasレンダラー初期化部）**:
  * 検索対象（修正前）: `(r.ctx.textBaseline = "bottom"),`
  * 置換対象（修正後）: `(r.ctx.textBaseline = "alphabetic"),`

* **4箇所目修正（Canvasレンダラー リスト描画リセット部）**:
  * 検索対象（修正前）: `(this.ctx.textBaseline = "bottom"),`
  * 置換対象（修正後）: `(this.ctx.textBaseline = "alphabetic"),`

##### ② ベースライン計測ロジックの Canvas 2D API 化（合計2箇所）
フォントの高さ測定ロジック（`parseMetrics` 関数）から古いDOM生成と引き算の処理を削除し、Canvas の `measureText()` を使用してフォント本来のメトリクスを瞬時に測定・キャッシュする処理に置き換えます。

* **1箇所目修正（定数 `CB` を使用する計測ロジック部）**:
  * **検索対象（修正前）**:
    ```javascript
    var e = this._document.createElement("div"),
                r = this._document.createElement("img"),
                n = this._document.createElement("span"),
                i = this._document.body;
              ((e.style.visibility = "hidden"),
                (e.style.fontFamily = A),
                (e.style.fontSize = t),
                (e.style.margin = "0"),
                (e.style.padding = "0"),
                (e.style.whiteSpace = "nowrap"),
                i.appendChild(e),
                (r.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
                (r.width = 1),
                (r.height = 1),
                (r.style.margin = "0"),
                (r.style.padding = "0"),
                (r.style.verticalAlign = "baseline"),
                (n.style.fontFamily = A),
                (n.style.fontSize = t),
                (n.style.margin = "0"),
                (n.style.padding = "0"),
                n.appendChild(this._document.createTextNode(CB)),
                e.appendChild(n),
                e.appendChild(r));
              var s = r.offsetTop - n.offsetTop + 2;
              (e.removeChild(n), e.appendChild(this._document.createTextNode(CB)), (e.style.lineHeight = "normal"), (r.style.verticalAlign = "super"));
              var o = r.offsetTop - e.offsetTop + 2;
              return (i.removeChild(e), { baseline: s, middle: o });
    ```
  * **置換対象（修正後）**:
    ```javascript
    var c = this._document.createElement("canvas").getContext("2d");
              c.font = t + " " + A;
              c.textBaseline = "alphabetic";
              var m = c.measureText(CB);
              var s = m.fontBoundingBoxAscent;
              if (s === void 0) { s = parseFloat(t) * 0.88; }
              var o = parseFloat(t) * 0.50;
              return { baseline: s, middle: o };
    ```

* **2箇所目修正（定数 `Xm` を使用する計測ロジック部）**:
  * **検索対象（修正前）**:
    ```javascript
    var e = this._document.createElement("div"),
                r = this._document.createElement("img"),
                n = this._document.createElement("span"),
                i = this._document.body;
              ((e.style.visibility = "hidden"),
                (e.style.fontFamily = A),
                (e.style.fontSize = t),
                (e.style.margin = "0"),
                (e.style.padding = "0"),
                (e.style.whiteSpace = "nowrap"),
                i.appendChild(e),
                (r.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
                (r.width = 1),
                (r.height = 1),
                (r.style.margin = "0"),
                (r.style.padding = "0"),
                (r.style.verticalAlign = "baseline"),
                (n.style.fontFamily = A),
                (n.style.fontSize = t),
                (n.style.margin = "0"),
                (n.style.padding = "0"),
                n.appendChild(this._document.createTextNode(Xm)),
                e.appendChild(n),
                e.appendChild(r));
              var s = r.offsetTop - n.offsetTop + 2;
              (e.removeChild(n), e.appendChild(this._document.createTextNode(Xm)), (e.style.lineHeight = "normal"), (r.style.verticalAlign = "super"));
              var o = r.offsetTop - e.offsetTop + 2;
              return (i.removeChild(e), { baseline: s, middle: o });
    ```
  * **置換対象（修正後）**:
    ```javascript
    var c = this._document.createElement("canvas").getContext("2d");
              c.font = t + " " + A;
              c.textBaseline = "alphabetic";
              var m = c.measureText(Xm);
              var s = m.fontBoundingBoxAscent;
              if (s === void 0) { s = parseFloat(t) * 0.88; }
              var o = parseFloat(t) * 0.50;
              return { baseline: s, middle: o };
    ```