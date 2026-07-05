import { exportPDF, loadingFonts } from '../../../module/pdfCreate/pdfCreate.js';

// 不規則変化に対応する内蔵英単語辞書 (ツールから完全移植)
const irregulars = {
    "am": "be", "is": "be", "are": "be", "was": "be", "were": "be", "been": "be", "being": "be",
    "has": "have", "had": "have", "having": "have",
    "does": "do", "did": "do", "done": "do", "doing": "do",
    "goes": "go", "went": "go", "gone": "go", "going": "go",
    "comes": "come", "came": "come", "coming": "come",
    "makes": "make", "made": "make", "making": "make",
    "runs": "run", "ran": "run", "running": "run",
    "sees": "see", "saw": "see", "seen": "see", "seeing": "see",
    "breaks": "break", "broke": "break", "broken": "break", "breaking": "break",
    "takes": "take", "took": "take", "taken": "take", "taking": "take",
    "gives": "give", "gave": "give", "given": "give", "giving": "give",
    "writes": "write", "wrote": "write", "written": "write", "writing": "write",
    "eats": "eat", "ate": "eat", "eaten": "eat", "eating": "eat",
    "finds": "find", "found": "find", "finding": "find",
    "keeps": "keep", "kept": "keep", "keeping": "keep",
    "sleeps": "sleep", "slept": "sleep", "sleeping": "sleep",
    "leaves": "leave", "left": "leave", "leaving": "leave",
    "meets": "meet", "met": "meet", "meeting": "meet",
    "brings": "bring", "brought": "bring", "bringing": "bring",
    "buys": "buy", "bought": "buy", "buying": "buy",
    "thinks": "think", "thought": "think", "thinking": "think",
    "teaches": "teach", "taught": "teach", "teaching": "teach",
    "catches": "catch", "caught": "catch", "catching": "catch",
    "sells": "sell", "sold": "sell", "selling": "sell",
    "tells": "tell", "told": "tell", "telling": "tell",
    "hears": "hear", "heard": "hear", "hearing": "hear",
    "says": "say", "said": "say", "saying": "say",
    "pays": "pay", "paid": "pay", "paying": "pay",
    "lays": "lay", "laid": "lay", "laying": "lay",
    "stands": "stand", "stood": "stand", "standing": "stand",
    "understands": "understand", "understood": "understand", "understanding": "understand",
    "gets": "get", "got": "get", "gotten": "get", "getting": "get",
    "loses": "lose", "lost": "lose", "losing": "lose",
    "speaks": "speak", "spoke": "speak", "spoken": "speak", "speaking": "speak",
    "chooses": "choose", "chose": "choose", "chosen": "choose", "choosing": "choose",
    "falls": "fall", "fell": "fall", "fallen": "fall", "falling": "fall",
    "flies": "fly", "flew": "fly", "flown": "fly", "flying": "fly",
    "grows": "grow", "grew": "grow", "grown": "grow", "growing": "grow",
    "knows": "know", "knew": "know", "known": "know", "knowing": "know",
    "shows": "show", "showed": "show", "shown": "show", "showing": "show",
    "begins": "begin", "began": "begin", "begun": "begin", "beginning": "begin",
    "drinks": "drink", "drank": "drink", "drunk": "drink", "drinking": "drink",
    "swims": "swim", "swam": "swim", "swum": "swim", "swimming": "swim",
    "sings": "sing", "sang": "sing", "sung": "sing", "singing": "sing",
    "rings": "ring", "rang": "ring", "rung": "ring", "ringing": "ring",
    "drives": "drive", "drove": "drive", "driven": "drive", "driving": "drive",
    "rides": "ride", "rode": "ride", "ridden": "ride", "riding": "ride",
    "rises": "rise", "rose": "rise", "risen": "rise", "rising": "rise",
    "hides": "hide", "hid": "hide", "hidden": "hide", "hiding": "hide",
    "bites": "bite", "bit": "bite", "bitten": "bite", "biting": "bite",
    "builds": "build", "built": "build", "building": "build",
    "spends": "spend", "spent": "spend", "spending": "spend",
    "sends": "send", "sent": "send", "sending": "send",
    "leads": "lead", "led": "lead", "leading": "lead",
    "reads": "read", "reading": "read",
    "cuts": "cut", "cutting": "cut",
    "puts": "put", "putting": "put",
    "sets": "set", "setting": "set",
    "hits": "hit", "hitting": "hit",
    "costs": "cost", "costing": "cost",
    "hurts": "hurt", "hurting": "hurt",
    "better": "good", "best": "good",
    "worse": "bad", "worst": "bad",
    "more": "many", "most": "many"
};

// カラーテーマ定義 (Indigo固定)
const themes = {
    indigo: { primary: 'bg-indigo-900 text-white', accent: 'border-indigo-900 text-indigo-900', badge: 'bg-indigo-50/80 text-indigo-950 border-indigo-200', light: 'bg-indigo-50/40', accentColor: '#1e1b4b', borderLine: 'border-indigo-300', hex: '#312e81' }
};

// アプリ状態・デザイン設定（不変の固定デザイン設定）
let rawData = [];
let groupedWords = [];
let fontConfigs = []; // キャッシュされたPDF用フォントオブジェクト

let wordsPerPage = 3;         // 3単語で固定
let themeColor = 'indigo';     // Indigoで固定
let fontStyle = 'zen-regular'; // Zen Maru Gothic (標準)で固定

let relatedWordPosition = 'inline'; // 品詞・意味セルの下に表示
let showFoldLine = true;       // 折り目線あり
let currentView = 'preview';   // プレビューまたは編集のビュー管理
let lastEditedWordIndex = 0;   // 編集画面で最後にアクティブだった単語のインデックス
let currentPage = 0;
let originalFileName = 'vocabulary'; // デフォルトファイル名にリセット

// ドム要素の参照
const csvFileInput = document.getElementById('file-input');
const dropZone = document.getElementById('upload-container');

// 起動時の初期化 (ESモジュールに対応する安全な呼び出し)
function init() {
    setupDragAndDrop();
    setupFileInput();
    setupBeforeUnload();
    setupEditorContainerFocus(); // エディタイベント委譲による連動監視をバインド [1]
    checkAndLoadUrlParams();     // URLパラメータのチェックとロード
    setupPDFTrigger();           // 新しい高品質PDF書き出しトリガー
    if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    }
}

// 以前のDOM状態に応じた確実な実行を維持 (CORSエラーのないプレーンスクリプト化)
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 離脱時の確認ダイアログ設定
function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
    // データが存在する場合は警告する
    if (groupedWords.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // ブラウザ標準の警告を表示
    }
    });
}

// 編集画面（editor-container）へのフォーカスイン監視をイベント委譲で完璧にバインドする [1]
function setupEditorContainerFocus() {
    const editorContainer = document.getElementById('editor-container');
    editorContainer.addEventListener('focusin', (e) => {
    const card = e.target.closest('.editor-card');
    if (card) {
        lastEditedWordIndex = parseInt(card.getAttribute('data-word-index'), 10);
    }
    });
}

// URLパラメータのチェックとロード処理（ローカルおよびGithub Pages完全対応）
function checkAndLoadUrlParams() {
    try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // id 項目が1つ以上あればロードを試みる
    const ids = urlParams.getAll('id');
    if (ids && ids.length > 0) {
        const words = urlParams.getAll('word');
        const nouns = urlParams.getAll('noun');
        const verbs = urlParams.getAll('verb');
        const adjs = urlParams.getAll('adj');
        const advs = urlParams.getAll('adv');
        const pronouns = urlParams.getAll('pronoun');
        const conjs = urlParams.getAll('conj');
        const auxs = urlParams.getAll('aux');
        const preps = urlParams.getAll('prep');
        const arts = urlParams.getAll('art');
        const inters = urlParams.getAll('inter');
        const others = urlParams.getAll('other');
        const sentences = urlParams.getAll('sentence');
        const translations = urlParams.getAll('translation');
        const fileName = urlParams.getAll('filename');

        const parsedFromUrl = [];
        const numItems = ids.length;

        for (let i = 0; i < numItems; i++) {
        // 単語名が空ならスキップ
        if (!words[i] && !ids[i]) continue;

        parsedFromUrl.push({
            id: ids[i] || '',
            word: words[i] || '',
            noun: nouns[i] || '',
            verb: verbs[i] || '',
            adj: adjs[i] || '',
            adv: advs[i] || '',
            pronoun: pronouns[i] || '',
            conj: conjs[i] || '',
            aux: auxs[i] || '',
            prep: preps[i] || '',
            art: arts[i] || '',
            inter: inters[i] || '',
            other: others[i] || '',
            sentence: sentences[i] || '',
            translation: translations[i] || ''
        });
        }

        if(fileName[0]) originalFileName = fileName;

        if (parsedFromUrl.length > 0) {
        rawData = parsedFromUrl;
        processGroupedWords();
        renderAllPages();
        }
    }
    } catch (err) {
    console.error('URLパラメータの解析に失敗しました:', err);
    }
}

// ドラッグ＆ドロップの設定
function setupDragAndDrop() {
    dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#312e81';
    dropZone.style.backgroundColor = '#f0f4ff';
    });

    dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.backgroundColor = '#ffffff';
    });

    dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#cbd5e1';
    dropZone.style.backgroundColor = '#ffffff';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        csvFileInput.files = files;
        handleFileSelect({ target: { files: files } });
    }
    });
}

function setupFileInput() {
    csvFileInput.addEventListener('change', handleFileSelect, false);
}

// アップロード時にファイル名を保持する対応
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 拡張子を除いたファイル名を抽出して保存
    originalFileName = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = function(e) {
    const text = e.target.result;
    parseCSVAndLoad(text);
    };
    reader.readAsText(file, 'utf-8');
}

// CSVパーサー (行型・列型の自動判定に対応！、CORSエラーを回避するプレーンなJavaScript化を維持)
function parseCSVAndLoad(text) {
    const cleanText = text.replace(/^\uFEFF/, '');　// BOMを削除
    const lines = cleanText.split(/\r?\n/);
    if (lines.length < 2) return;

    // まず、すべての行をパースして通常の二次元配列 (rawMatrix) を作成する
    const rawMatrix = [];
    for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
        inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
        } else {
        currentVal += char;
        }
    }
    row.push(currentVal.trim());
    rawMatrix.push(row);
    }

    if (rawMatrix.length === 0) return;

    const parsed = [];

    // 行型（従来形式）か、列型（転置形式）かをヘッダーの並びで自動判定
    // 縦方向に「番号」「単語」「名詞」が並んでいる場合は「列型（転置が必要）」
    const isColumnFormat = 
    rawMatrix[0]?.[0]?.replace(/["']/g, '') === '番号' && 
    rawMatrix[1]?.[0]?.replace(/["']/g, '') === '単語' && 
    rawMatrix[2]?.[0]?.replace(/["']/g, '') === '名詞';

    if (isColumnFormat) {
    // 【列型（転置が必要な形式）のパース処理】
    const numColumns = rawMatrix[0].length; // 列数 (項目名列 ＋ データ列数)
    for (let c = 1; c < numColumns; c++) {
        const id = rawMatrix[0]?.[c] || '';
        const word = rawMatrix[1]?.[c] || '';
        
        if (!word && !id) continue;

        parsed.push({
        id: id,
        word: word,
        noun: rawMatrix[2]?.[c] || '',
        verb: rawMatrix[3]?.[c] || '',
        adj: rawMatrix[4]?.[c] || '',
        adv: rawMatrix[5]?.[c] || '',
        pronoun: rawMatrix[6]?.[c] || '',
        conj: rawMatrix[7]?.[c] || '',
        aux: rawMatrix[8]?.[c] || '',
        prep: rawMatrix[9]?.[c] || '',
        art: rawMatrix[10]?.[c] || '',
        inter: rawMatrix[11]?.[c] || '',
        other: rawMatrix[12]?.[c] || '',
        sentence: rawMatrix[13]?.[c] || '',
        translation: rawMatrix[14]?.[c] || ''
        });
    }
    } else {
    // 【行型（従来の形式、転置不要）のパース処理】
    // 1行目はヘッダーなので2行目（インデックス1）からデータ処理
    for (let r = 1; r < rawMatrix.length; r++) {
        const id = rawMatrix[r]?.[0] || '';
        const word = rawMatrix[r]?.[1] || '';
        
        if (!word && !id) continue;

        parsed.push({
        id: id,
        word: word,
        noun: rawMatrix[r]?.[2] || '',
        verb: rawMatrix[r]?.[3] || '',
        adj: rawMatrix[r]?.[4] || '',
        adv: rawMatrix[r]?.[5] || '',
        pronoun: rawMatrix[r]?.[6] || '',
        conj: rawMatrix[r]?.[7] || '',
        aux: rawMatrix[r]?.[8] || '',
        prep: rawMatrix[r]?.[9] || '',
        art: rawMatrix[r]?.[10] || '',
        inter: rawMatrix[r]?.[11] || '',
        other: rawMatrix[r]?.[12] || '',
        sentence: rawMatrix[r]?.[13] || '',
        translation: rawMatrix[r]?.[14] || ''
        });
    }
    }
    
    if (parsed.length > 0) {
    rawData = parsed;
    processGroupedWords();
    renderAllPages();
    }
}

// CSVデータをまとめてグループ化 (1番最初での全角カッコの自動抽出に対応、全角カッコそのものを維持する対応、関連語パラメータ維持)
function processGroupedWords() {
    const groups = {};
    let lastValidId = '0000'; // 直前の有効なIDの追跡用（ID空欄関連語対応）

    rawData.forEach(item => {
    for (let key in item) {
        if (typeof item[key] === 'string') {
        item[key] = item[key].replace(/\uFF5E/g, '\u301C');  // 全角チルダを波ダッシュに置換
        }
    }

    let cleanId = String(item.id).replace(/["']/g, '').trim();
    
    if (cleanId === '') {
        cleanId = lastValidId; // 空の場合は直前の有効なIDに紐づける
    } else {
        cleanId = cleanId.padStart(4, '0');
        lastValidId = cleanId; // 有効なIDを更新
    }

    if (!groups[cleanId]) {
        groups[cleanId] = [];
    }
    groups[cleanId].push(item);
    });

    groupedWords = Object.keys(groups).sort().map(id => {
    const items = groups[id];
    const mainWord = items[0];

    // 1番最初に、列（動詞、形容詞、副詞）の最初の全角カッコ見出し語の下に配置するための処理を実行する
    mainWord._extraText = '';
    const targetKeys = ['verb', 'adj', 'adv'];
    for (let key of targetKeys) {
        if (mainWord[key]) {
        let val = String(mainWord[key]).replace(/["']/g, '').trim();
        // 全角カッコ限定でのマッチ
        const match = val.match(/^（([^）]+)）/);
        if (match) {
            const innerText = match[1];
            // このカッコ内の文字が英語（日本語を含まない）かチェック
            if (!hasJapanese(innerText)) {
            mainWord._extraText = match[0]; // 全角カッコをそのまま（innerTextではなくmatch[0]）退避
            // 元のオブジェクトの列データから、全角カッコ部分を削除（上書き）
            mainWord[key] = val.substring(match[0].length).trim();
            break; // 1単語につき抽出は最大1つまで
            }
        }
        }
    }

    const relatives = items.slice(1).map(rel => {
        return {
        word: rel.word || '',
        noun: rel.noun || '',
        verb: rel.verb || '',
        adj: rel.adj || '',
        adv: rel.adv || '',
        pronoun: rel.pronoun || '',
        conj: rel.conj || '',
        aux: rel.aux || '',
        prep: rel.prep || '',
        art: rel.art || '',
        inter: rel.inter || '',
        other: rel.other || '',
        sentence: rel.sentence || '',
        translation: rel.translation || ''
        };
    });

    return {
        id: id,
        word: mainWord.word || '',
        noun: mainWord.noun || '',
        verb: mainWord.verb || '',
        adj: mainWord.adj || '',
        adv: mainWord.adv || '',
        pronoun: mainWord.pronoun || '',
        conj: mainWord.conj || '',
        aux: mainWord.aux || '',
        prep: mainWord.prep || '',
        art: mainWord.art || '',
        inter: mainWord.inter || '',
        other: mainWord.other || '',
        sentence: mainWord.sentence || '',
        translation: mainWord.translation || '',
        extraText: mainWord._extraText || '',
        relatives: relatives
    };
    });
}

// 品詞情報を配列化（添付CSVの11種類の品詞に対応）
function getPartsOfSpeech(item, isMainWord = false) {
    const list = [];
    const mapping = [
    { key: 'noun', label: '名' },
    { key: 'verb', label: '動' },
    { key: 'adj', label: '形' },
    { key: 'adv', label: '副' },
    { key: 'pronoun', label: '代' },
    { key: 'conj', label: '接' },
    { key: 'aux', label: '助' },
    { key: 'prep', label: '前' },  // 前置詞
    { key: 'art', label: '冠' },   // 冠詞
    { key: 'inter', label: '間' }, // 間投詞
    { key: 'other', label: '他' }  // その他
    ];

    mapping.forEach(m => {
    if (item[m.key] && String(item[m.key]).trim() !== '') {
        let originalMeaning = String(item[m.key]).replace(/["']/g, '').trim();
        let formattedMeaning = formatMeaningText(originalMeaning); // 特定の文字（；、カッコなど）の装飾・置換処理を適用
        list.push({
        name: m.label,
        meaning: formattedMeaning
        });
    }
    });
    return list;
}

// 全ページの一括描画処理
function renderAllPages() {
    const container = document.getElementById('book-container');
    container.innerHTML = '';

    // アップロードエリアを非表示にし、コントロールバーを表示
    dropZone.style.display = 'none';
    const controlBar = document.getElementById('control-bar');
    controlBar.style.display = 'flex';

    const totalPages = Math.ceil(groupedWords.length / wordsPerPage);
    document.getElementById('status-text').textContent = `全 ${groupedWords.length} 単語 / A3用紙 ${totalPages} ページ分`;

    // 全ページを生成してコンテナに縦並びで挿入
    for (let p = 0; p < totalPages; p++) {
    const pageWords = groupedWords.slice(p * wordsPerPage, (p + 1) * wordsPerPage);
    const pageHTML = generatePageHTML(pageWords, p);
    
    const pageWrapper = document.createElement('div');
    pageWrapper.innerHTML = pageHTML;
    container.appendChild(pageWrapper.firstElementChild);
    }

    if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    }
}

// 単語から複数の推測される原形（lemma）を算出する関数 (ツールから移植)
function getLemmas(word) {
    word = word.toLowerCase();
    if (irregulars[word]) {
        return [irregulars[word], word];
    }
    const lemmas = [word];

    if (word.endsWith("ies") || word.endsWith("ier") || word.endsWith("iest")) {
        const base = word.replace(/(ies|ier|iest)$/, "y");
        lemmas.push(base);
    }
    if (word.endsWith("ing")) {
        let stem = word.slice(0, -3);
        lemmas.push(stem);
        lemmas.push(stem + "e");
        if (stem.length > 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
            lemmas.push(stem.slice(0, -1));
        }
    }
    if (word.endsWith("ed")) {
        let stem = word.slice(0, -2);
        lemmas.push(stem);
        lemmas.push(stem + "e");
        if (stem.endsWith("i")) {
            lemmas.push(stem.slice(0, -1) + "y");
        }
        if (stem.length > 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
            lemmas.push(stem.slice(0, -1));
        }
    }
    if (word.endsWith("es")) {
        let stem = word.slice(0, -2);
        lemmas.push(stem);
        lemmas.push(word.slice(0, -1));
    }
    if (word.endsWith("s") && !word.endsWith("ss")) {
        lemmas.push(word.slice(0, -1));
    }
    if (word.endsWith("er") || word.endsWith("est")) {
        let suffixLength = word.endsWith("er") ? 2 : 3;
        let stem = word.slice(0, -suffixLength);
        lemmas.push(stem);
        lemmas.push(stem + "e");
        if (stem.length > 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
            lemmas.push(stem.slice(0, -1));
        }
    }

    return [...new Set(lemmas)];
}

// 単語同士が活用形の変化も含めて一致するか検証する (ツールから移植)
function matchWord(tokenLower, queryLower) {
    const tokenLemmas = getLemmas(tokenLower);
    const queryLemmas = getLemmas(queryLower);
    
    for (let tl of tokenLemmas) {
        for (let ql of queryLemmas) {
            if (tl === ql) return true;
        }
    }
    return false;
}

// 英文テキストから記号を除外して単語の配列にトークン化する (ツールから移植)
function tokenize(text) {
    const regex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
    let match;
    const tokens = [];
    let index = 0;
    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            text: match[0],
            lower: match[0].toLowerCase(),
            start: match.index,
            length: match[0].length,
            index: index++
        });
    }
    return tokens;
}

// 英文中の見出し語（活用形・連語含む）を検出し、該当部分を #fe635f に置換する関数
function highlightSentence(wordInput, sentenceInput) {
    if (!wordInput || !sentenceInput) return sentenceInput;

    const tokens = tokenize(sentenceInput);
    const queryWords = wordInput.toLowerCase().replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);

    if (queryWords.length === 0 || tokens.length === 0) {
        return sentenceInput;
    }

    const matchedRanges = [];
    for (let i = 0; i <= tokens.length - queryWords.length; i++) {
        let isMatch = true;
        for (let j = 0; j < queryWords.length; j++) {
            const token = tokens[i + j];
            const qWord = queryWords[j];
            if (!matchWord(token.lower, qWord)) {
                isMatch = false;
                break;
            }
        }
        if (isMatch) {
            const matchedTokens = tokens.slice(i, i + queryWords.length);
            const startToken = matchedTokens[0];
            const endToken = matchedTokens[matchedTokens.length - 1];
            
            matchedRanges.push({
                startChar: startToken.start,
                endChar: endToken.start + endToken.length
            });
        }
    }

    if (matchedRanges.length === 0) {
        return sentenceInput;
    }

    // 文字位置の後ろから置換してインデックスズレを防止する
    matchedRanges.sort((a, b) => b.startChar - a.startChar);

    let result = sentenceInput;
    matchedRanges.forEach(r => {
        const target = result.substring(r.startChar, r.endChar);
        result = result.substring(0, r.startChar) + `<span style="color: #fe635f; font-family: 'Zen Maru Gothic 700';">${target}</span>` + result.substring(r.endChar);
    });

    return result;
}

// 日本語/全角文字が含まれているか判定する関数 (全角英数記号の \uff00-\uffef と「節」を除外して英語判定を適正化)
function hasJapanese(str) {
    const cleanStr = str.replace(/節/g, ''); // 「節」という文字を一時的に除外
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(cleanStr);
}

// HTMLエスケープ関数
function escapeHTML(str) {
    return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// csvの意味の文字列（品詞およびその他）に特殊文字装飾とカッコ置換を適用する関数（半角全角厳密・クラス付与設計、；（対応を追加）
function formatMeaningText(text) {
    if (!text) return '';

    // 1. すべての半角カッコの位置情報を事前に抽出 (日本語の有無にかかわらず、カッコ内の文字をパディング除外するため)
    const allParens = [];
    const parenRegexAll = /\(([^)]+)\)/g;
    let mAll;
    while ((mAll = parenRegexAll.exec(text)) !== null) {
    allParens.push({
        start: mAll.index,
        end: mAll.index + mAll[0].length - 1,
        content: mAll[1]
    });
    }

    // 日本語を囲むものだけを jpParens に分ける
    const jpParens = allParens.filter(p => hasJapanese(p.content));

    // 2. 「、」が全角カッコの直前にある場合の位置情報を抽出
    const commaTightIndices = [];
    for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === '、' && text[i+1] === '（') {
        commaTightIndices.push(i);
    }
    }

    // 3. 左から1文字ずつスキャンし、クラス付きspanを割り当てて再構築
    let result = '';
    for (let i = 0; i < text.length; i++) {
    
    // 任意の半角カッコ（allParens）の内部文字であるかを判定
    let isInParenContent = false;
    for (let p of allParens) {
        if (i > p.start && i < p.end) {
        isInParenContent = true;
        break;
        }
    }

    // カッコの「(」の前の1文字を判定 (日本語を含む jpParens のみで判定)
    let isCharBeforeParen = false;
    for (let jp of jpParens) {
        if (jp.start - 1 === i) {
        isCharBeforeParen = true;
        break;
        }
    }

    // カッコ開始「(」を判定 (日本語を含む jpParens のみで判定)
    let isParenStart = false;
    for (let jp of jpParens) {
        if (jp.start === i) {
        isParenStart = true;
        break;
        }
    }

    // カッコ終了「)」を判定 (日本語を含む jpParens のみで判定)
    let isParenEnd = false;
    for (let jp of jpParens) {
        if (jp.end === i) {
        isParenEnd = true;
        break;
        }
    }

    // 置換・装飾分岐処理（干渉を防止するため半角カッコ内文字を最優先でそのまま出力）
    if (isInParenContent) {
        result += escapeHTML(text[i]); // 一般の半角カッコ内（；など）は置換せずそのまま出力
    }
    else if (isCharBeforeParen) {
        const char = text[i];
        if (char === '；') {
        // カッコの前が「；」の場合は右余白を0にした独自のクラス（letter-spacingは適用しない）
        result += `<span class="semi-pad-zero-right">；</span>`;
        } else {
        // 「；」以外の場合は文字詰めクラスを適用
        result += `<span class="char-tight">${escapeHTML(char)}</span>`;
        }
    }
    else if (isParenStart) {
        // 「(」を「（」に置換
        result += '（';
    }
    else if (isParenEnd) {
        // 「)」を「）」に置換したのち、文字詰めクラスを適用
        result += `<span class="paren-tight">）</span>`;
    }
    else {
        // カッコ領域外または対象外カッコ内の通常処理
        if (commaTightIndices.includes(i)) {
        // 全角カッコ前の「、」の文字詰め
        result += `<span class="comma-tight">、</span>`;
        }
        else if (text[i] === '》' && text[i + 1] === '（') {
        // 「》」と「（」が並んでいる場合、》を文字詰めクラスで囲む
        result += `<span class="double-bracket-tight">》</span>`;
        }
        else if (text[i] === '；') {
        // もし「；」の直後（次の文字）が全角の「（」または全角の「《」の場合、padding-rightを0にした専用クラスをあてる
        if (text[i + 1] === '（' || text[i + 1] === '《') {
            result += `<span class="semi-pad-zero-right">；</span>`;
        } else {
            // 通常の「；」の余白パディング設定
            result += `<span class="semi-pad">；</span>`;
        }
        }
        else {
        result += escapeHTML(text[i]);
        }
    }
    }

    return result;
}

// 1ページ分(A3横)の4等分列HTMLコードを生成 (ページ番号・フッター説明・「データなし」などの文言は完全非表示、各項目へ検索リンクを付与、IDクリック時の編集連語ジャンプ対応、関連語の例文・訳表示に対応、padding・margin調整, PDF左上SVGリンク付与、余白パディング設定整理)
function generatePageHTML(words, pageIdx) {
    const activeTheme = themes[themeColor];

    let rowsHtml = '';

    for (let i = 0; i < wordsPerPage; i++) {
    const isLast = i === wordsPerPage - 1;
    const borderClass = isLast ? '' : 'row-four-border';

    if (i < words.length) {
        const wordGroup = words[i];

        // 品詞・意味リストを wordGroup のオリジナルデータからリアルタイム動的生成（編集データの同期）
        const parts = getPartsOfSpeech(wordGroup, true);
        let partsHtml = '';
        parts.forEach(p => {
        partsHtml += `
            <div class="pos-row">
            <span class="pos-badge">${p.name}</span>
            <span class="pos-meaning">${p.meaning}</span>
            </div>
        `;
        });

        // 関連語(インライン用, 単語、品詞・意味、例文、訳を別列に分割して配置)
        let relativesWordColHtml = '';
        let relativesMeaningColHtml = '';
        let relativesSentenceColHtml = '';
        let relativesTranslationColHtml = '';

        if (relatedWordPosition === 'inline' && wordGroup.relatives && wordGroup.relatives.length > 0) {
        let relativeWords = '';
        let relativeMeanings = '';
        let relativeSentences = '';
        let relativeTranslations = '';

        wordGroup.relatives.forEach(rel => {
            // 1列目の下部用：関連語単語 (aタグによる検索リンクを付与、エスケープ処理を確実に適用)
            relativeWords += `
            <a href="https://www.google.com/search?q=${encodeURIComponent(rel.word)}+${encodeURIComponent("意味")}" target="_blank" rel="noopener noreferrer" class="relative-word-item hover:underline" style="color: inherit; text-decoration: none;">${escapeHTML(rel.word)}</a>
            `;

            // 2列目の下部用：関連語の品詞と意味 (その他の列「他」の場合は品詞バッジを出さない対応を追加)
            let relParts = '';
            const relPartsList = getPartsOfSpeech(rel, false);
            relPartsList.forEach(rp => {
            if (rp.name === '他') {
                // 「他」（その他）の場合は.relative-pos-badgeを出さずに意味のみ出力
                relParts += `
                <div class="relative-pos-badge-container">
                    <span class="relative-meaning">${rp.meaning}</span>
                </div>
                `;
            } else {
                relParts += `
                <div class="relative-pos-badge-container">
                    <span class="relative-pos-badge">${rp.name}</span>
                    <span class="relative-meaning">${rp.meaning}</span>
                </div>
                `;
            }
            });

            relativeMeanings += `
            <div class="relative-meaning-row">
                ${relParts}
            </div>
            `;

            // 3列目の下部用：関連語の例文 (不規則変化ハイライトを適用、aタグによる検索リンクを付与)
            if (rel.sentence) {
            const highlightedRel = highlightSentence(rel.word, rel.sentence);
            relativeSentences += `
                <a href="https://www.google.com/search?q=${encodeURIComponent(rel.sentence)}+${encodeURIComponent("意味")}" target="_blank" rel="noopener noreferrer" class="relative-sentence-item hover:underline" style="color: inherit; text-decoration: none;">${highlightedRel}</a>
            `;
            } else {
            relativeSentences += `
                <div class="relative-sentence-item"></div>
            `;
            }

            // 4列目の下部用：関連語の和訳 (見出し語の訳のstyleに準拠、エスケープ処理を確実に適用)
            if (rel.translation) {
            relativeTranslations += `
                <div class="relative-translation-item">${escapeHTML(rel.translation)}</div>
            `;
            } else {
            relativeTranslations += `
                <div class="relative-translation-item"></div>
            `;
            }
        });

        // 1列目用の関連語単語コンテナ (左側に水色縦線 border-left を追加し、見出しと左端開始位置を揃える、背景を#f4f7ffに設定)
        relativesWordColHtml = `
            <div class="relatives-word-container">
            ${relativeWords}
            </div>
        `;

        // 2列目の関連語のパディング(padding: 7px 15px;)、および右側マージンの判定制御 (関連語の例文と訳がなければ margin-right: 15px; あたら margin-right: 0;)
        const hasRelContent = wordGroup.relatives.some(r => r.sentence || r.translation);
        const relMarginStyle = hasRelContent ? 'margin-right: 0;' : 'margin-right: 15px;';
        
        relativesMeaningColHtml = `
            <div class="relatives-container" style="${relMarginStyle}">
            ${relativeMeanings}
            </div>
        `;

        // 3列目用の関連語例文コンテナ (例文がある場合のみコンテナを表示し水色背景の空欄化を防止)
        const hasRelSentence = wordGroup.relatives.some(r => r.sentence);
        if (hasRelSentence) {
            relativesSentenceColHtml = `
            <div class="relatives-sentence-container">
                ${relativeSentences}
            </div>
            `;
        }

        // 4列目用の関連語訳コンテナ (訳がある場合のみコンテナを表示し水色背景の空欄化を防止)
        const hasRelTranslation = wordGroup.relatives.some(r => r.translation);
        if (hasRelTranslation) {
            relativesTranslationColHtml = `
            <div class="relatives-translation-container">
                ${relativeTranslations}
            </div>
            `;
        }
        }

        // 例文（見出し語検出・ハイライト処理を適用、データがない場合は空にする、aタグによる検索リンクを付与）
        let sentenceHtml = '';
        if (wordGroup.sentence) {
        const highlighted = highlightSentence(wordGroup.word, wordGroup.sentence);
        sentenceHtml = `<a href="https://www.google.com/search?q=${encodeURIComponent(wordGroup.sentence)}+${encodeURIComponent("意味")}" target="_blank" rel="noopener noreferrer" class="sentence-eng-text hover:underline">${highlighted}</a>`;
        } else {
        sentenceHtml = '';
        }

        // 和訳（データがない場合は空にする、エスケープ処理を確実に適用）
        let translationHtml = '';
        if (wordGroup.translation) {
        translationHtml = `<div class="sentence-jpn-text">${escapeHTML(wordGroup.translation)}</div>`;
        } else {
        translationHtml = '';
        }

        // 動詞、形容詞、副詞のカッコ内英語が抽出されている場合の表示処理 (エスケープ処理を確実に適用)
        let wordTitleWrapperClass = 'word-title-wrapper';
        let extraTextHtml = '';
        if (wordGroup.extraText) {
        wordTitleWrapperClass += ' flex flex-col gap-[5px]'; // 親要素を縦並び・隙間5pxに設定
        extraTextHtml = `<div class="word-extra-text">${escapeHTML(wordGroup.extraText)}</div>`;
        }

        // 全体の絶対インデックスを計算
        const absoluteIdx = pageIdx * wordsPerPage + i;

        rowsHtml += `
        <div class="row-four ${borderClass}" data-word-row-index="${absoluteIdx}">
            <!-- 1列目: 単語/ID (横並び・垂直中央揃え) ＋ 下部に関連語単語（左側の線付き・アライメント調整、.word-title-containerの親要素ラッパーを適用、見出し語に検索リンクを付与、IDクリックで編集連動） -->
            <div class="cell-four">
            <div class="${wordTitleWrapperClass}">
                <div class="word-title-container">
                <span class="word-id" onclick="navigateToEditCard(${absoluteIdx})">${escapeHTML(wordGroup.id)}</span>
                <a href="https://www.google.com/search?q=${encodeURIComponent(wordGroup.word)}+${encodeURIComponent("意味")}" target="_blank" rel="noopener noreferrer" class="word-text hover:underline" style="color: inherit; text-decoration: none;">${escapeHTML(wordGroup.word)}</a>
                </div>
                ${extraTextHtml}
            </div>
            ${relativesWordColHtml}
            </div>

            <!-- 2列目: 品詞・意味 ＋ 下部に関連語の品詞・意味（左の縦線は削除、.pos-meaning-containerの親要素にパディング15pxのラッパーを適用） -->
            <div class="cell-four">
            <div class="pos-meaning-wrapper">
                <div class="pos-meaning-container">
                ${partsHtml}
                </div>
            </div>
            ${relativesMeaningColHtml}
            </div>

            <!-- 3列目: 例文 ＋ 下部に関連語の例文 -->
            <div class="cell-four">
            ${sentenceHtml}
            ${relativesSentenceColHtml}
            </div>

            <!-- 4列目: 訳 ＋ 下部に関連語の訳 -->
            <div class="cell-four">
            ${translationHtml}
            ${relativesTranslationColHtml}
            </div>
        </div>
        `;
    } else {
        // 該当ページで単語データが足りない場合の空白ブロック（「データなし」等のテキストは出力しない）
        rowsHtml += `
        <div class="row-four ${borderClass}">
            <div class="cell-four"></div>
            <div class="cell-four"></div>
            <div class="cell-four"></div>
            <div class="cell-four"></div>
        </div>
        `;
    }
    }

    // 折り目線のガイド (テキストを削除し破線のみに調整)
    const foldLineHtml = showFoldLine ? `
    <div class="fold-line">
        <div class="fold-line-dashed"></div>
    </div>
    ` : '';

    // PDF出力された各ページの左上に配置する「編集URLパラメータ付き」SVGリンクを生成（関連語パラメータ同期対応）
    const flatPageList = [];
    words.forEach(wordGroup => {
    let noun = wordGroup.noun;
    let verb = wordGroup.verb;
    let adj = wordGroup.adj;
    let adv = wordGroup.adv;
    
    if (wordGroup.extraText) {
        if (verb) verb = wordGroup.extraText + ' ' + verb;
        else if (adj) adj = wordGroup.extraText + ' ' + adj;
        else if (adv) adv = wordGroup.extraText + ' ' + adv;
    }

    flatPageList.push({
        id: wordGroup.id, // 見出しID
        word: wordGroup.word,
        noun: noun,
        verb: verb,
        adj: adj,
        adv: adv,
        pronoun: wordGroup.pronoun,
        conj: wordGroup.conj,
        aux: wordGroup.aux,
        prep: wordGroup.prep,
        art: wordGroup.art,
        inter: wordGroup.inter,
        other: wordGroup.other,
        sentence: wordGroup.sentence,
        translation: wordGroup.translation
    });

    wordGroup.relatives.forEach(rel => {
        flatPageList.push({
        id: wordGroup.id, // 【同期バグ修正】関連語にも見出しと同じIDを設定してパラメータ出力
        word: rel.word,
        noun: rel.noun,
        verb: rel.verb,
        adj: rel.adj,
        adv: rel.adv,
        pronoun: rel.pronoun,
        conj: rel.conj,
        aux: rel.aux,
        prep: rel.prep,
        art: rel.art,
        inter: rel.inter,
        other: rel.other,
        sentence: rel.sentence,
        translation: rel.translation
        });
    });
    });

    const params = new URLSearchParams();
    flatPageList.forEach(item => {
    params.append('id', item.id || '');
    params.append('word', item.word || '');
    params.append('noun', item.noun || '');
    params.append('verb', item.verb || '');
    params.append('adj', item.adj || '');
    params.append('adv', item.adv || '');
    params.append('pronoun', item.pronoun || '');
    params.append('conj', item.conj || '');
    params.append('aux', item.aux || '');
    params.append('prep', item.prep || '');
    params.append('art', item.art || '');
    params.append('inter', item.inter || '');
    params.append('other', item.other || '');
    params.append('sentence', item.sentence || '');
    params.append('translation', item.translation || '');
    });

    params.append('filename', originalFileName);

    // ローカル・Webに完全両対応した絶対URLの生成
    const baseUrl = window.location.href.split('?')[0];
    const pageUrl = baseUrl + '?' + params.toString();

    // 見開きシート全体のテンプレート (ページ番号、フッター説明文は完全非表示、PDF左上にSVGリンクを絶対配置、HTMLエスケープ処理を確実に適用)
    return `
    <div class="a3-page">
        <a href="${escapeHTML(pageUrl)}" target="_blank" rel="noopener noreferrer" class="a3-page-edit-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.1rem" height="1.1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #cbd5e1;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </a>
        ${foldLineHtml}

        <!-- A3 4等分ヘッダーヘッダー -->
        <div class="page-header">
        <div class="header-title" style="width: 25%;">WORD / ID</div>
        <div class="header-title" style="width: 25%;">PART & MEANING</div>
        <div class="header-title" style="width: 25%;">EXAMPLE SENTENCE</div>
        <div class="header-title" style="width: 25%;">JAPANESE TRANSLATION</div>
        </div>
        <div class="page-content">
        ${rowsHtml}
        </div>
    </div>
    `;
}

// プレビュー表示 ⇄ 編集画面の相互切り替えロジック (編集画面のアクティブ単語ページ自動連動・プレビュー行ジャンプを完全にマージ)
function toggleView() {
    const bookContainer = document.getElementById('book-container');
    const editorContainer = document.getElementById('editor-container');
    const toggleBtn = document.getElementById('toggle-view-btn');

    if (currentView === 'preview') {
    currentView = 'edit';
    bookContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    toggleBtn.innerHTML = '<i data-lucide="layout" class="w-3.5 h-3.5"></i><span>プレビュー画面へ</span>';
    renderEditor(); // エディタを描画
    } else {
    currentView = 'preview';
    saveEditorData(); // 現在のエディタデータをgroupedWordsに同期保存
    
    // 編集画面で表示・編集していた単語のページがプレビュー画面でも表示されるように同期 (lastEditedWordIndexに基づく)
    currentPage = Math.floor(lastEditedWordIndex / wordsPerPage);
    
    editorContainer.style.display = 'none';
    bookContainer.style.display = 'block';
    toggleBtn.innerHTML = '<i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>編集画面へ</span>';
    renderAllPages(); // 最新の編集データを反映して再構築
    
    // 【完全連動対応】編集画面から戻ったとき、最後に編集していた単語のプレビュー行（.row-four）へスムーズスクロールしハイライトする
    navigateToPreviewRow(lastEditedWordIndex);
    }
    if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    }
}

// IDクリック時に編集カードに自動ジャンプしてハイライトするアクション
function navigateToEditCard(idx) {
    if (currentView === 'preview') {
    toggleView(); // 現在がプレビュー表示なら編集画面に自動切り替え
    }
    
    // 編集カードがDOMにレンダリングされるのを待ってスクロール & 点滅エフェクトを実行
    setTimeout(() => {
    const card = document.querySelector(`.editor-card[data-word-index="${idx}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = '#312e81';
        card.style.boxShadow = '0 0 0 4px rgba(49, 46, 129, 0.2)';
        setTimeout(() => {
        card.style.borderColor = '#cbd5e1';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
        }, 1500); // 1.5秒後に元に戻す
    }
    }, 50);
}

// 編集画面からプレビュー画面に戻ったとき、該当する単語の行（row-four）へ自動ジャンプしてハイライトするアクション
function navigateToPreviewRow(idx) {
    setTimeout(() => {
    const row = document.querySelector(`.row-four[data-word-row-index="${idx}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.transition = 'background-color 0.3s, box-shadow 0.3s';
        row.style.backgroundColor = '#f0f4ff'; // ほんのり薄いインディゴ背景
        row.style.boxShadow = 'inset 0 0 0 2px #312e81'; // Indigoのインセットボーダー
        setTimeout(() => {
        row.style.backgroundColor = '';
        row.style.boxShadow = '';
        }, 1500); // 1.5秒後に元に戻す
    }
    }, 100);
}

// メモリ上の最新編集データ（groupedWords）を行列転置型CSVにシライズしてダウンロード (ファイル名を「元のファイル名_edited」にする)
function exportCSV() {
    if (currentView === 'edit') {
    saveEditorData(); // 現在エディタに表示中の最新値をメモリに同期保存
    }

    const flatList = [];
    groupedWords.forEach(wordGroup => {
    let noun = wordGroup.noun;
    let verb = wordGroup.verb;
    let adj = wordGroup.adj;
    let adv = wordGroup.adv;
    
    // 抽出されていた全角カッコ英語を、出力時には元の品詞データの先頭に自動復元マージ
    if (wordGroup.extraText) {
        if (verb) verb = wordGroup.extraText + ' ' + verb;
        else if (adj) adj = wordGroup.extraText + ' ' + adj;
        else if (adv) adv = wordGroup.extraText + ' ' + adv;
    }

    flatList.push({
        id: wordGroup.id,
        word: wordGroup.word,
        noun: noun,
        verb: verb,
        adj: adj,
        adv: adv,
        pronoun: wordGroup.pronoun,
        conj: wordGroup.conj,
        aux: wordGroup.aux,
        prep: wordGroup.prep,
        art: wordGroup.art,
        inter: wordGroup.inter,
        other: wordGroup.other,
        sentence: wordGroup.sentence,
        translation: wordGroup.translation
    });

    wordGroup.relatives.forEach(rel => {
        flatList.push({
        id: wordGroup.id, // 【同期バグ修正】エクスポート時にも、関連語に見出しと同じIDを付与して完全に復元
        word: rel.word,
        noun: rel.noun,
        verb: rel.verb,
        adj: rel.adj,
        adv: rel.adv,
        pronoun: rel.pronoun,
        conj: rel.conj,
        aux: rel.aux,
        prep: rel.prep,
        art: rel.art,
        inter: rel.inter,
        other: rel.other,
        sentence: rel.sentence,
        translation: rel.translation
        });
    });
    });

    const headers = ["番号", "単語", "名詞", "動詞", "形容詞", "副詞", "代名詞", "接続詞", "助動詞", "前置詞", "冠詞", "間投詞", "その他", "例文", "訳"];
    const csvRows = headers.map(h => [`"${h}"`]);

    flatList.forEach(item => {
    const fields = [
        item.id,
        item.word,
        item.noun,
        item.verb,
        item.adj,
        item.adv,
        item.pronoun,
        item.conj,
        item.aux,
        item.prep,
        item.art,
        item.inter,
        item.other,
        item.sentence,
        item.translation
    ];
    fields.forEach((field, fIdx) => {
        const escaped = String(field || '').replace(/"/g, '""');
        csvRows[fIdx].push(`"${escaped}"`);
    });
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\r\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // 保存ファイルの名前を「元のファイル名_edited.csv」に適用
    const downloadName = `${originalFileName}_edited.csv`;
    link.setAttribute("download", downloadName);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 編集画面（カード形式）のDOMレンダリング処理 (HTMLインジェクション防止用の各種エスケープ処理を厳密に適用、onfocusinはイベント委譲に変更して安全化)
function renderEditor() {
    const container = document.getElementById('editor-container');
    container.innerHTML = '';

    let html = '<h2 style="font-size: 20px; font-family: \'Zen Maru Gothic 700\'; color: #1e1b4b; margin-bottom: 24px; border-bottom: 2px solid #312e81; padding-bottom: 12px; display: flex; align-items: center; gap: 8px;"><i data-lucide="edit-3"></i>単語帳データの編集 (カード形式)</h2>';

    groupedWords.forEach((wordGroup, wIdx) => {
    let relativesHtml = '';

    wordGroup.relatives.forEach((rel, rIdx) => {
        relativesHtml += `
        <div class="editor-relative-card" data-rel-index="${rIdx}">
            <button type="button" class="delete-btn" onclick="removeRelative(${wIdx}, ${rIdx})">削除</button>
            <h5 style="font-size: 13px;  color: #475569; margin-bottom: 12px;">関連語 #${rIdx + 1}</h5>
            
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px;">
            <div class="editor-field">
                <label>関連語の単語</label>
                <input type="text" class="editor-input rel-word" value="${escapeHTML(rel.word)}" placeholder="例: serve">
            </div>
            </div>

            <!-- 関連語の全11品詞入力エリア (1行に2つずつの2列構造 textarea 化) -->
            <div class="editor-grid-two">
            <div class="editor-field"><label>名詞</label><textarea class="editor-input editor-textarea rel-noun">${escapeHTML(rel.noun)}</textarea></div>
            <div class="editor-field"><label>動詞</label><textarea class="editor-input editor-textarea rel-verb">${escapeHTML(rel.verb)}</textarea></div>
            <div class="editor-field"><label>形容詞</label><textarea class="editor-input editor-textarea rel-adj">${escapeHTML(rel.adj)}</textarea></div>
            <div class="editor-field"><label>副詞</label><textarea class="editor-input editor-textarea rel-adv">${escapeHTML(rel.adv)}</textarea></div>
            <div class="editor-field"><label>代名詞</label><textarea class="editor-input editor-textarea rel-pronoun">${escapeHTML(rel.pronoun)}</textarea></div>
            <div class="editor-field"><label>接続詞</label><textarea class="editor-input editor-textarea rel-conj">${escapeHTML(rel.conj)}</textarea></div>
            <div class="editor-field"><label>助動詞</label><textarea class="editor-input editor-textarea rel-aux">${escapeHTML(rel.aux)}</textarea></div>
            <div class="editor-field"><label>前置詞</label><textarea class="editor-input editor-textarea rel-prep">${escapeHTML(rel.prep)}</textarea></div>
            <div class="editor-field"><label>冠詞</label><textarea class="editor-input editor-textarea rel-art">${escapeHTML(rel.art)}</textarea></div>
            <div class="editor-field"><label>間投詞</label><textarea class="editor-input editor-textarea rel-inter">${escapeHTML(rel.inter)}</textarea></div>
            <div class="editor-field" style="grid-column: span 2;"><label>その他</label><textarea class="editor-input editor-textarea rel-other">${escapeHTML(rel.other)}</textarea></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="editor-field">
                <label>関連語の例文</label>
                <textarea class="editor-input editor-textarea rel-sentence" placeholder="例: She served us dinner.">${escapeHTML(rel.sentence)}</textarea>
            </div>
            <div class="editor-field">
                <label>関連語の和訳</label>
                <textarea class="editor-input editor-textarea rel-translation" placeholder="例: 彼女は私たちに夕食を出した。">${escapeHTML(rel.translation)}</textarea>
            </div>
            </div>
        </div>
        `;
    });

    html += `
        <div class="editor-card" data-word-index="${wIdx}">
        <h3>見出し語 #${wIdx + 1}: ${escapeHTML(wordGroup.word || '（未入力）')}</h3>
        
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="editor-field">
            <label>番号 (ID)</label>
            <input type="text" class="editor-input main-id" value="${escapeHTML(wordGroup.id)}">
            </div>
            <div class="editor-field">
            <label>単語 (見出し語)</label>
            <input type="text" class="editor-input main-word" value="${escapeHTML(wordGroup.word)}">
            </div>
        </div>

        <!-- 見出し語の全11品詞入力エリア (1行に2つずつの2列構造 textarea 化) -->
        <div class="editor-grid-two">
            <div class="editor-field"><label>名詞</label><textarea class="editor-input editor-textarea main-noun">${escapeHTML(wordGroup.noun)}</textarea></div>
            <div class="editor-field"><label>動詞</label><textarea class="editor-input editor-textarea main-verb">${escapeHTML(wordGroup.verb)}</textarea></div>
            <div class="editor-field"><label>形容詞</label><textarea class="editor-input editor-textarea main-adj">${escapeHTML(wordGroup.adj)}</textarea></div>
            <div class="editor-field"><label>副詞</label><textarea class="editor-input editor-textarea main-adv">${escapeHTML(wordGroup.adv)}</textarea></div>
            <div class="editor-field"><label>代名詞</label><textarea class="editor-input editor-textarea main-pronoun">${escapeHTML(wordGroup.pronoun)}</textarea></div>
            <div class="editor-field"><label>接続詞</label><textarea class="editor-input editor-textarea main-conj">${escapeHTML(wordGroup.conj)}</textarea></div>
            <div class="editor-field"><label>助動詞</label><textarea class="editor-input editor-textarea main-aux">${escapeHTML(wordGroup.aux)}</textarea></div>
            <div class="editor-field"><label>前置詞</label><textarea class="editor-input editor-textarea main-prep">${escapeHTML(wordGroup.prep)}</textarea></div>
            <div class="editor-field"><label>冠詞</label><textarea class="editor-input editor-textarea main-art">${escapeHTML(wordGroup.art)}</textarea></div>
            <div class="editor-field"><label>間投詞</label><textarea class="editor-input editor-textarea main-inter">${escapeHTML(wordGroup.inter)}</textarea></div>
            <div class="editor-field" style="grid-column: span 2;"><label>その他</label><textarea class="editor-input editor-textarea main-other">${escapeHTML(wordGroup.other)}</textarea></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="editor-field">
            <label>例文</label>
            <textarea class="editor-input editor-textarea main-sentence">${escapeHTML(wordGroup.sentence)}</textarea>
            </div>
            <div class="editor-field">
            <label>和訳</label>
            <textarea class="editor-input editor-textarea main-translation">${escapeHTML(wordGroup.translation)}</textarea>
            </div>
        </div>

        <!-- 関連語増設エリア -->
        <div class="editor-relatives-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="font-size: 14px; font-family: \'Zen Maru Gothic 700\'; color: #312e81;">関連語・派生語</h4>
            <button type="button" class="add-relative-btn" onclick="addRelative(${wIdx})">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>関連語を増やす</span>
            </button>
            </div>
            <div class="relatives-list">
            ${relativesHtml || '<p style="font-size: 12px; color: #94a3b8; margin: 0; padding: 8px 0;">関連語は登録されていません。</p>'}
            </div>
        </div>
        </div>
    `;
    });

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    }
}

// エディタに入力されたリアルタイムデータを収集してgroupedWords構造に保存
function saveEditorData() {
    const cards = document.querySelectorAll('#editor-container .editor-card');
    
    cards.forEach(card => {
    const wIdx = parseInt(card.getAttribute('data-word-index'), 10);
    const wordGroup = groupedWords[wIdx];

    if (wordGroup) {
        // 見出し語の入力内容同期
        wordGroup.id = card.querySelector('.main-id').value.trim();
        wordGroup.word = card.querySelector('.main-word').value.trim();
        wordGroup.noun = card.querySelector('.main-noun').value.trim();
        wordGroup.verb = card.querySelector('.main-verb').value.trim();
        wordGroup.adj = card.querySelector('.main-adj').value.trim();
        wordGroup.adv = card.querySelector('.main-adv').value.trim();
        wordGroup.pronoun = card.querySelector('.main-pronoun').value.trim();
        wordGroup.conj = card.querySelector('.main-conj').value.trim();
        wordGroup.aux = card.querySelector('.main-aux').value.trim();
        wordGroup.prep = card.querySelector('.main-prep').value.trim();
        wordGroup.art = card.querySelector('.main-art').value.trim();
        wordGroup.inter = card.querySelector('.main-inter').value.trim();
        wordGroup.other = card.querySelector('.main-other').value.trim();
        wordGroup.sentence = card.querySelector('.main-sentence').value.trim();
        wordGroup.translation = card.querySelector('.main-translation').value.trim();

        // 関連語の入力内容同期
        const relCards = card.querySelectorAll('.editor-relative-card');
        relCards.forEach(relCard => {
        const rIdx = parseInt(relCard.getAttribute('data-rel-index'), 10);
        const rel = wordGroup.relatives[rIdx];

        if (rel) {
            rel.word = relCard.querySelector('.rel-word').value.trim();
            rel.noun = relCard.querySelector('.rel-noun').value.trim();
            rel.verb = relCard.querySelector('.rel-verb').value.trim();
            rel.adj = relCard.querySelector('.rel-adj').value.trim();
            rel.adv = relCard.querySelector('.rel-adv').value.trim();
            rel.pronoun = relCard.querySelector('.rel-pronoun').value.trim();
            rel.conj = relCard.querySelector('.rel-conj').value.trim();
            rel.aux = relCard.querySelector('.rel-aux').value.trim();
            rel.prep = relCard.querySelector('.rel-prep').value.trim();
            rel.art = relCard.querySelector('.rel-art').value.trim();
            rel.inter = relCard.querySelector('.rel-inter').value.trim();
            rel.other = relCard.querySelector('.rel-other').value.trim();
            rel.sentence = relCard.querySelector('.rel-sentence').value.trim();
            rel.translation = relCard.querySelector('.rel-translation').value.trim();
        }
        });
    }
    });

    // 編集後に保存されたデータ全体に対して、全角チルダ「～ (U+FF5E)」を波ダッシュ「〜 (U+301C)」に一括置換します。
    groupedWords.forEach(wordGroup => {
    // 見出し語の全フィールドをクレンジング
    for (let key in wordGroup) {
        if (typeof wordGroup[key] === 'string') {
        wordGroup[key] = wordGroup[key].replace(/\uFF5E/g, '\u301C');
        }
    }
    // 関連語の全フィールドをクレンジング
    if (wordGroup.relatives) {
        wordGroup.relatives.forEach(rel => {
        for (let key in rel) {
            if (typeof rel[key] === 'string') {
            rel[key] = rel[key].replace(/\uFF5E/g, '\u301C');
            }
        }
        });
    }
    });
}

// 関連語を動的に追加するアクション
function addRelative(wordIndex) {
    saveEditorData(); // 追加前に現在のすべての入力データを保存

    groupedWords[wordIndex].relatives.push({
    word: '',
    noun: '',
    verb: '',
    adj: '',
    adv: '',
    pronoun: '',
    conj: '',
    aux: '',
    prep: '',
    art: '',
    inter: '',
    other: '',
    sentence: '',
    translation: ''
    });

    renderEditor(); // 編集画面をリフレッシュ
}

// 関連語を削除するアクション
function removeRelative(wordIndex, relIndex) {
    saveEditorData(); // 削除前に現在のすべての入力データを保存
    groupedWords[wordIndex].relatives.splice(relIndex, 1);
    renderEditor(); // 編集画面をリフレッシュ
}

// アプリ状態を最初に戻す (エディタの非表示・初期化対応をマージ)
function resetApp() {
    rawData = [];
    groupedWords = [];
    currentPage = 0;
    currentView = 'preview'; // ビュー状態をリセット
    lastEditedWordIndex = 0; // 追跡インデックスを初期化
    originalFileName = 'vocabulary'; // デフォルトファイル名にリセット
    document.getElementById('book-container').innerHTML = '';
    document.getElementById('editor-container').innerHTML = '';
    document.getElementById('book-container').style.display = 'block';
    document.getElementById('editor-container').style.display = 'none';
    document.getElementById('control-bar').style.display = 'none';
    document.getElementById('toggle-view-btn').innerHTML = '<i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>編集画面へ</span>';
    dropZone.style.display = 'block';
    csvFileInput.value = '';
}

// テンプレートCSV of ダウンロード機能 (15列、BOM付き、転置形式)
document.getElementById('download-template').addEventListener('click', () => {
    const csvContent = "\"番号\",\"0001\",\"0002\",\"0003\",\"0004\",\"0004\",\"0005\"\r\n" +
    "\"単語\",\"job\",\"subject\",\"line\",\"service\",\"serve\",\"department\"\r\n" +
    "\"名詞\",\"仕事；職\",\"主題、話題；科目\",\"線；商品、（商品の）種類；生産ライン；（人・もの）の列；(電話)回線；（交通機関の）路線\",\"業務；（バス・電車などの）便；公共事業；点検、修理\",\"\",\"（企業の）部、課；（大学の）学科；(D~)《米》省\"\r\n" +
    "\"動詞\",\"\",\"\",\"（be ~d）を並べる；整列する(up)\",\"\",\"（食事・飲み物など）を出す\",\"\"\r\n" +
    "\"形容詞\",\"\",\"〜の影響を受けやすい(to)、〜を必要として(to)；支配下にある\",\"\",\"\",\"\",\"\"\r\n" +
    "\"副詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"代名詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"接続詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"助動詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"前置詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"冠詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"間投詞\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"その他\",\"\",\"\",\"\",\"\",\"\",\"\"\r\n" +
    "\"例文\",\"My first job ever was as a waiter in a steak restaurant.\",\"His economic theories have been the subject of much debate.\",\"Our new line of spring fashions will be released in February.\",\"Many hotels have 24-hour laundry service for guests.\",\"\",\"Transportation costs must be filed with the Finance Department.\"\r\n" +
    "\"訳\",\"私の最初の仕事はステーキレストランのウェイターだった。\",\"彼の経済理論は多くの論争の主題となってきた。\",\"当社の春のファッションの新商品は２月に発表される。\",\"多くのホテルは、宿泊客のために24時間営業のランドリーサービスを行っている。\",\"\",\"交通費は経理部に届け出る必要がある。\"\r\n";
    
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "vocabulary_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// DOMContentLoadedイベントでフォントの遅延ロードを開始
window.addEventListener('DOMContentLoaded', async () => {
    const fontUrls = [
        { family: 'Zen Maru Gothic 400', url: '../source/fonts/ShareTechMono-Regular.ttf', isDefault: true },
        { family: 'Zen Maru Gothic 500', url: '../source/fonts/ZenMaruGothic-Medium.ttf', isDefault: false },
        { family: 'Zen Maru Gothic 700', url: '../source/fonts/ZenMaruGothic-Bold.ttf', isDefault: false },
        { family: 'Share Tech Mono 400', url: '../source/fonts/ShareTechMono-Regular.ttf', isDefault: false }
    ];
    await loadingFonts({ fontUrls: fontUrls, msgElId: 'font-status-msg' });
});

// 各関数をwindowグローバルへ安全にバインド公開 (module化したためonclick属性から直接呼び出せるようにする)
window.resetApp = resetApp;
window.toggleView = toggleView;
window.exportCSV = exportCSV;
window.navigateToEditCard = navigateToEditCard;
window.addRelative = addRelative;
window.removeRelative = removeRelative;

// 印刷・PDF出力ボタンへのイベント設定
function setupPDFTrigger() {
    document.getElementById('pdf-trigger').addEventListener('click', () => {
    let outlineStr = '';
    groupedWords.forEach((wordGroup, idx) => {
        const pageNum = Math.floor(idx / wordsPerPage) + 1;
        outlineStr += `${pageNum}||${wordGroup.word}\n`;
        wordGroup.relatives.forEach((relative) => {
        outlineStr += `${pageNum}|-|${relative.word}\n`;
        });
    });
    const config = {
        debug: true,
        overlayFont: 'Zen Maru Gothic 700',
        pagesSelector: '.a3-page',
        outlineStr: outlineStr,
        pdfFileName: `${originalFileName}_edited`
    };
    exportPDF(config);
    });
}