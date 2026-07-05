document.addEventListener('DOMContentLoaded', () => {
    // 必要なDOM要素を取得
    const searchInput = document.getElementById('searchInput');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const toolCards = document.querySelectorAll('.tool-card');
    const noResultsMessage = document.getElementById('noResultsMessage');

    // フィルターボタンの設定
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndSearch();
        });
    });

    // 検索窓の設定
    searchInput.addEventListener('input', () => {
        filterAndSearch();
    });

    // フィルターと検索を掛け合わせるメイン処理
    function filterAndSearch() {
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        const searchText = searchInput.value.toLowerCase().trim();
        let visibleCount = 0; // 表示されているカードの数

        toolCards.forEach(card => {
            // HTMLの data-category="xxx" 属性を取得
            const cardCategory = card.getAttribute('data-category');
            
            // カード内のテキスト要素を取得して検索キーワードと比較
            const titleText = card.querySelector('.tool-title').textContent.toLowerCase();
            const descText = card.querySelector('.tool-desc').textContent.toLowerCase();
            
            // タグのテキスト（複数）を一つの文字列に結合
            const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase()).join(' ');

            // 1. カテゴリが一致しているか判定
            const matchesCategory = (activeFilter === 'all' || cardCategory === activeFilter);

            // 2. 検索キーワードがタイトル・説明文・タグのいずれかに含まれているか判定
            const matchesSearch = (
                titleText.includes(searchText) || 
                descText.includes(searchText) || 
                tags.includes(searchText)
            );

            // 両方の条件を満たせば表示、満たさなければ非表示用クラス「hide」を付与
            if (matchesCategory && matchesSearch) {
                card.classList.remove('hide');
                visibleCount++;
            } else {
                card.classList.add('hide');
            }
        });

        // 1件も表示されるカードがない場合は、メッセージを表示する
        if (visibleCount === 0) {
            noResultsMessage.classList.remove('hide');
        } else {
            noResultsMessage.classList.add('hide');
        }
    }
});