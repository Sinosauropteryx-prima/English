/**
 * @module pdfCreate
 * @description HTML構造を整形し、しおり・リンク・フォントを保持したままベクトルPDFに変換して出力するモジュール
 * @example
 * import { loadingFonts, exportPDF } from './pdfCreate.js';
 * 
 * // フォントの読み込み
 * await loadingFonts({
 *     fontUrls: [
 *        { family: 'Zen Maru Gothic', url: './fonts/ZenMaruGothic-Regular.ttf', isDefault: true },
 *        { family: 'Zen Maru Gothic 700', url: './fonts/ZenMaruGothic-Bold.ttf', isDefault: false }
 *     ],
 *     msgElId: 'font-status-msg'
 * });
 * 
 * // PDFの出力
 * exportPDF({
 *    debug: false,
 *    overlayFont: 'Zen Maru Gothic 700',
 *    pagesSelector: '.a3-page',
 *    outlineStr: '1||Section 1\n1|-|Subsection 1.1\n2||Section 2',
 *    pdfFileName: 'output'
 * });
 * 
 * // PDF出力時に推奨されるスタイル
 * .pdf-print-active {
 *    background-color: #ffffff !important;
 *    margin: 0 !important;
 *    box-shadow: none !important;
 *    border-radius: 0 !important;
 * }
 * .pdf-print-active .no-print {
 *    display: none !important;
 * }
 * 
 * // 注意事項
 * // - フォントの読み込みは非同期処理であるため、PDF出力前に必ず完了させる必要があります。
 * // - PDFのサイズは、最初のページのサイズを基準に自動判定されます。必要に応じてCSSでページサイズを調整してください。
 * // - PDFに変換するページ要素には、pdf-print-activeクラスが一時的に付与されます。スタイルの調整が必要な場合は、このクラスを利用してください。
 * // - PDFに表示したくない要素には、no-printクラスを付与してください。
 * // - PDF出力時にしおり（アウトライン）を付与する場合、outlineStrのフォーマットに注意してください。
 * // - デバッグモードを有効にすると、処理時間の計測やPDF出力前の確認が可能です。
 * 
 * // 参考リンク
 * @see {@link https://github.com/lmn1919/dompdf.js/blob/main/README.md|dompdf.js}
 * @see {@link https://pdf-lib.js.org/|pdf-lib}
 * @see {@link https://github.com/lillallol/outline-pdf|outline-pdf}
 */

/**
 * @typedef {Object} fontLoadingInfo - 読み込むフォントの情報を表すオブジェクト
 * @property {string} family - フォントファミリー名
 * @property {string} url - フォントファイルのパス
 * @property {boolean} isDefault - デフォルトフォント
 */

/**
 * @typedef {Object} fontConfig - フォント設定用のオブジェクト
 * @property {string} fontConfig.fontFamily - フォントファミリー名
 * @property {string} fontConfig.fontBase64 - フォントファイルをBase64形式に変換した文字列
 * @property {string} [fontConfig.fontUrl='']
 * @property {number} [fontConfig.fontWeight=400] - フォントの太さ（400が標準）
 * @property {string} [fontConfig.fontStyle='normal'] - フォントスタイル
 * @property {boolean} fontConfig.isDefault - デフォルトフォント
 */

/** @type {fontConfig[]} フォントをBase64形式に変換後を含んだフォント設定 */
let fontBase64 = [];

/**
 * @typedef {Object} debugInfo - デバッグ情報の保持用オブジェクト
 * @property {Object} debugInfo.dompdf - dompdf.jsでの描画処理情報
 * @property {number} debugInfo.dompdf.start - 描画開始時間
 * @property {number} debugInfo.dompdf.end - 描画終了時間
 * @property {Object} debugInfo.pdfLib - pdf-libでの結合処理情報
 * @property {number} debugInfo.pdfLib.start - 結合開始時間
 * @property {number} debugInfo.pdfLib.end - 結合終了時間
 * @property {number} debugInfo.outlinePdf - しおり付きPDF生成処理情報
 * @property {number} debugInfo.outlinePdf.start - しおり付きPDF生成開始時間
 * @property {number} debugInfo.outlinePdf.end - しおり付きPDF生成終了時間
 */

/** 
 * @type {debugInfo}
 * @see exportPDF この関数で使用
 */
let debugInfo = {
    dompdf: {},
    pdfLib: {},
    outlinePdf: {}
};

/**
 * フォントファイルの読み込み関数
 * @public
 * @param {Object} config - 設定オブジェクト
 * @param {fontLoadingInfo[]} config.fontUrls - フォント情報のオブジェクト配列
 * @param {string} [config.msgElId=''] - 読み込みメッセージを表示する要素のid
 * @returns {void}
 */
export async function loadingFonts(config = {}) {
    const {fontUrls, msgElId = ''} = config;
    const msgEl = document.getElementById(msgElId);
    try {
        // Promise.all の結果を配列として受け取ることで、フォントの格納順序を完全に固定
        fontBase64 = await Promise.all(fontUrls.map(async (info) => {
            let fontUrl = await fetchFontAsBase64(info.url);
            return {
                fontFamily: info.family,
                fontBase64: fontUrl,
                fontUrl: '',
                fontWeight: 400,  // すべてnormal扱い
                fontStyle: 'normal',
                isDefault: info.isDefault
            };
        }));
        if (msgEl) {
            msgEl.textContent = '✓ フォントファイルの読み込みに成功しました。';
            msgEl.style.color = '#218838';
        }
    } catch (e) {
        if (msgEl) {
            msgEl.textContent = '⚠️ フォントファイルが見つかりません。今回は標準フォント（Helvetica）で代用し、検証用PDFを作成します。';
            msgEl.style.color = '#c0392b';
        }
    }
}

/**
 * フォントをBase64に変換する関数
 * @private
 * @param {string} url - フォントファイルのパス 
 * @returns {string} - Base64形式のフォント
 * @see loadingFonts この関数内で使用
 */
async function fetchFontAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * クリックされるまで待つ関数（デバッグ用）
 * @private
 * @param {string} buttonId - クリックボタンのid
 * @returns {Promise<void>} 完了のタイミングを返す（戻り値自体はなし）
 * @see exportPDF デバッグモードの時に使用
 */
function waitForClick(buttonId) {
    return new Promise((resolve) => {
        const button = document.getElementById(buttonId);
        button.addEventListener('click', resolve, { once: true });
    });
}


/**
 * HTML構造を整形し、しおり・リンク・フォントを保持したままベクトルPDFに変換して出力
 * @public
 * @param {Object} config - PDFの設定用オブジェクト
 * @param {boolean} [config.debug=false] - デバッグモード
 * @param {string} [config.overlayFont=''] - ローディング画面のフォントファミリー名
 * @param {string} config.pagesSelector - 印刷対象となるページ要素のCSSセレクタ
 * @param {string} [config.outlineStr=''] - アウトラインの文字列（詳細は{@link https://github.com/lillallol/outline-pdf|こちら}）
 * @param {string} config.pdfFileName - PDFのファイル名
 * @returns {void}
 */
export async function exportPDF(config = {}) {
    const {
        debug = false,
        overlayFont = '',
        pagesSelector,
        outlineStr = '',
        pdfFileName
    } = config;


  /* 1. ローディング画面のオーバーレイを動的生成 ***************************************************/
    const overlay = document.createElement('div');
    overlay.id = 'pdf-loading-overlay';
    overlay.className = 'no-print';
    overlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(30, 27, 75, 0.85);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-family: ${overlayFont ? `${formatFontName(overlayFont)}, ` : ""}sans-serif;
    `;
    overlay.innerHTML = `
        <div id="overlay-inner" style="background: #ffffff; color: #1e1b4b; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center; max-width: 400px; width: 90%;">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900 mx-auto mb-4"></div>
            <h3 style="font-family: ${overlayFont ? `${formatFontName(overlayFont)}, ` : ""}sans-serif; font-size: 18px; margin-bottom: 8px;" id="pdf-loading-title">PDF用フォントを準備中...</h3>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;" id="pdf-loading-desc"></p>
        </div>
    `;
    document.body.appendChild(overlay);
  /*********************************************************************************************/


    try {
        document.getElementById('pdf-loading-title').textContent = 'ベクトルPDFを生成中...';
        document.getElementById('pdf-loading-desc').textContent = 'HTMLのレイアウト構造をベクターデータにマッピングしています。';

        const originalPages = Array.from(document.querySelectorAll(pagesSelector));
        const pageParent = document.getElementById('book-container');


      /* 2. 1ページずつ dompdf.js で描画 ************************************************************/
        if(debug) {
            debugInfo.dompdf.start = performance.now();
        }

        let rect;
        for (let i = 0; i < originalPages.length; i++) {
            const originalPage = originalPages[i];
            originalPage.classList.add('pdf-print-active');
            if(i == 0) {
                rect = originalPage.getBoundingClientRect();  // 最初のページのサイズを取得
            }
        }

        const pdfBlob = await dompdf(pageParent, {
            pagination: true,
            format: [rect.width, rect.height],
            orientation: rect.width > rect.height ? 'landscape' : 'portrait',
            useCORS: true,
            pageConfig: () => null,  // headerとfooterを設定しない
            fontConfig: fontBase64
        });

        if(debug) {
            debugInfo.dompdf.end = performance.now();
        }
      /*********************************************************************************************/


      /* 3. pdf-lib を利用したページの結合処理 ********************************************/
        if(debug) {
            debugInfo.pdfLib.start = performance.now();
        }

        const arrayBuffer = await pdfBlob.arrayBuffer();
        const mergedPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = mergedPdfDoc.getPages();

        injectAnnotations(mergedPdfDoc, pages, originalPages);

        if(debug) {
            debugInfo.pdfLib.end = performance.now();
        }
      /*********************************************************************************************/


      /* 4. しおり付きのPDFを作成し、エクスポート *****************************************************/
        if(debug) {
            debugInfo.outlinePdf.start = performance.now();
        }

        let outlinePdf;
        if(outlineStr != '') {  // アウトラインが必要な場合
            try {
                // アウトラインライブラリをロード
                const { outlinePdfFactory } = await import('https://cdn.jsdelivr.net/npm/@lillallol/outline-pdf@4.0.0/+esm');
                outlinePdf = outlinePdfFactory(PDFLib);
            } catch (importErr) {
                console.warn('しおり（アウトライン）生成ライブラリのロードに失敗しました。しおりなしでPDFを出力します。', importErr);
            }
        } 

        let finalPdfBytes;

        if (outlinePdf) {
            // しおり付きのPDFを生成
            const mergedPdfBytes = await mergedPdfDoc.save();
            const outlinedPdfDoc = await outlinePdf({
                pdf: mergedPdfBytes,
                outline: outlineStr.trim()
            });
            
            finalPdfBytes = await outlinedPdfDoc.save();
        } else {
            // しおり不要の場合 または しおりのロードに失敗した場合
            finalPdfBytes = await mergedPdfDoc.save();
        }

        if(debug) {
            debugInfo.outlinePdf.end = performance.now();
            console.log('デバッグ情報');
            console.table({
                'dompdf.js描画処理': `${(debugInfo.dompdf.end - debugInfo.dompdf.start).toFixed(2)/1000} s`,
                'pdf-lib結合処理': `${(debugInfo.pdfLib.end - debugInfo.pdfLib.start).toFixed(2)/1000} s`,
                'しおり付きPDF生成処理': `${(debugInfo.outlinePdf.end - debugInfo.outlinePdf.start).toFixed(2)/1000} s`
            });
        }

        if(debug) {  // PDF出力用ボタン
            const stopBtn = document.createElement('button');
            stopBtn.id = 'stopBtn';
            const overlayInner = document.getElementById('overlay-inner');
            overlayInner.appendChild(stopBtn);
            stopBtn.textContent = 'PDF出力';
            stopBtn.style = `
                background: #73bc90;
                color: white;
                font-size: 14px;
                padding: 4px 8px;
                border-radius: 8px;
                margin-top: 20px;
            `;
            await waitForClick("stopBtn");
        }

        // PDFのバイナリをエクスポートして保存
        const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(finalBlob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        
        // 保存ファイルの名前を「${pdfFileName}.pdf」に適用
        const downloadName = `${pdfFileName}.pdf`;
        a.setAttribute("download", downloadName);

        a.click();
        URL.revokeObjectURL(downloadUrl);
      /*********************************************************************************************/

    } catch (err) {
        console.error('PDF生成エラー:', err);
        alert('PDFの出力プロセス中にエラーが発生しました。コンソールログをご確認ください。');
    } finally {
        document.getElementById('pdf-loading-overlay').remove();
    }
}


/**
 * PDFにアノテーション（リンク）を注入する関数
 * @private
 * @param {PDFLib.PDFDocument} pdfDoc - PDFLib.PDFDocument
 * @param {PDFLib.PDFPage[]} pages - PDFLib.PDFPage[]
 * @param {Object[]} originalPages - 元のページ要素の配列
 * @returns {void}
 */
function injectAnnotations(pdfDoc, pages, originalPages) {
    originalPages.forEach((originalPage, pageIndex) => {
        const pdfPage = pages[pageIndex];
        if(!pdfPage) return;

        const parentRect = originalPage.getBoundingClientRect();
        const pdfPageWidth = pdfPage.getWidth();
        const pdfPageHeight = pdfPage.getHeight();

        const anchors = originalPage.querySelectorAll('a');
        anchors.forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;

            const rect = a.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // スケーリング倍率を算出し、PDFのベクターアノテーション座標へ正確に変換します
            const scale = pdfPageWidth / parentRect.width;
            const x1 = (rect.left - parentRect.left) * scale;
            const x2 = (rect.right - parentRect.left) * scale;
            const y1 = pdfPageHeight - (rect.bottom - parentRect.top) * scale;
            const y2 = pdfPageHeight - (rect.top - parentRect.top) * scale;

            let linkAnnot;
            if (href.startsWith('http://') || href.startsWith('https://')) {
            linkAnnot = pdfDoc.context.obj({
                Type: 'Annot',
                Subtype: 'Link',
                Rect: [x1, y1, x2, y2],
                Border: [0, 0, 0], // ボーダー非表示
                A: {
                Type: 'Action',
                S: 'URI',
                URI: PDFLib.PDFString.of(href)
                }
            });
            }

            if (linkAnnot) {
                const linkAnnotRef = pdfDoc.context.register(linkAnnot);
                let annots = pdfPage.node.lookupMaybe(PDFLib.PDFName.of('Annots'), PDFLib.PDFArray);
                if (!annots) {
                    annots = pdfDoc.context.obj([]);
                    pdfPage.node.set(PDFLib.PDFName.of('Annots'), annots);
                }
                annots.push(linkAnnotRef);
            }
        });

        // クラス名pdf-print-activeを消す
        originalPage.classList.remove('pdf-print-active');
    });
}

/**
 * 総称フォント名だけを除外してフォント名を '' で囲む
 * @private
 * @param {string} fontFamily - フォント名
 * @returns {string} '' で囲まれたフォント名
 */
function formatFontName(fontFamily) {
    if (!fontFamily) return "";

    // クォーテーションで囲んではいけないCSSのキーワード一覧
    const keywords = ["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui"];

    // もしキーワードに含まれているなら、そのまま返す。含まれていないなら '' で囲む
    return keywords.includes(fontFamily.toLowerCase()) ? fontFamily : `'${fontFamily}'`;
}