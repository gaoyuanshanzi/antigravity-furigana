// State management
const state = {
    originalText: '',
    okuriganaText: '',
    translationText: ''
};

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const inputJa = document.getElementById('input-ja');
const countNum = document.getElementById('count-num');
const btnClear = document.getElementById('btn-clear');
const btnRun = document.getElementById('btn-run');
const btnExport = document.getElementById('btn-export');

const outputFurigana = document.getElementById('output-furigana');
const outputTranslation = document.getElementById('output-translation');

const btnCopyFurigana = document.getElementById('btn-copy-furigana');
const btnCopyTranslation = document.getElementById('btn-copy-translation');
const toast = document.getElementById('toast');

// Initialize State and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCharCount();
    
    // Disable export initially since there's no result
    btnExport.disabled = true;
    
    // Bind Events
    themeToggle.addEventListener('click', toggleTheme);
    inputJa.addEventListener('input', updateCharCount);
    btnClear.addEventListener('click', clearAll);
    btnRun.addEventListener('click', processText);
    btnExport.addEventListener('click', exportToTxt);
    
    btnCopyFurigana.addEventListener('click', () => copyToClipboard(state.okuriganaText, '후리가나 텍스트가 복사되었습니다.'));
    btnCopyTranslation.addEventListener('click', () => copyToClipboard(state.translationText, '번역 텍스트가 복사되었습니다.'));
    
    // Bind window resize to recalculate height alignment
    window.addEventListener('resize', syncHeights);
    
    // Bind scroll synchronization
    setupScrollSync();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
    }
}

// Toggle Theme
function toggleTheme() {
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Character Count
function updateCharCount() {
    const len = inputJa.value.length;
    countNum.textContent = len;
}

// Show Toast Notification
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');
    
    // Trigger animation frame
    void toast.offsetWidth; 
    
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Copy to Clipboard
async function copyToClipboard(text, successMessage) {
    if (!text || text.trim() === '' || text.includes('입력하고 실행하기를 누르면') || text.includes('여기에 표시됩니다')) {
        showToast('복사할 내용이 없습니다.', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage || '클립보드에 복사되었습니다.');
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('복사에 실패했습니다.', 'error');
    }
}

// Clear all inputs and state
function clearAll() {
    inputJa.value = '';
    updateCharCount();
    
    state.originalText = '';
    state.okuriganaText = '';
    state.translationText = '';
    
    outputFurigana.innerHTML = `
        <div class="placeholder-text">
            일본어 문장을 입력하고 <strong>실행하기</strong>를 누르면 한자 위에 후리가나가 표시됩니다.
        </div>
    `;
    
    outputTranslation.innerHTML = `
        <div class="placeholder-text">
            일본어 문장의 한국어 번역문이 여기에 표시됩니다.
        </div>
    `;
    
    btnExport.disabled = true;
    showToast('입력이 초기화되었습니다.');
}

// Sync heights of corresponding sentence/line items in Panel 2 & Panel 3
function syncHeights() {
    const fItems = outputFurigana.querySelectorAll('.line-item');
    const tItems = outputTranslation.querySelectorAll('.line-item');
    
    if (fItems.length === 0 || tItems.length === 0) return;
    
    // Reset heights first to let browser calculate natural heights
    fItems.forEach(item => item.style.height = 'auto');
    tItems.forEach(item => item.style.height = 'auto');
    
    // Sync heights line by line
    for (let i = 0; i < fItems.length; i++) {
        const fItem = fItems[i];
        const tItem = tItems[i];
        if (fItem && tItem) {
            const maxHeight = Math.max(fItem.offsetHeight, tItem.offsetHeight);
            fItem.style.height = `${maxHeight}px`;
            tItem.style.height = `${maxHeight}px`;
        }
    }
}

// Synchronize scroll position between Furigana and Translation panels
function setupScrollSync() {
    let activeScrollSource = null;

    outputFurigana.addEventListener('scroll', () => {
        if (activeScrollSource === 'translation') return;
        activeScrollSource = 'furigana';
        outputTranslation.scrollTop = outputFurigana.scrollTop;
        
        clearTimeout(outputFurigana.scrollTimeout);
        outputFurigana.scrollTimeout = setTimeout(() => { activeScrollSource = null; }, 50);
    });

    outputTranslation.addEventListener('scroll', () => {
        if (activeScrollSource === 'furigana') return;
        activeScrollSource = 'translation';
        outputFurigana.scrollTop = outputFurigana.scrollTop;
        
        clearTimeout(outputTranslation.scrollTimeout);
        outputTranslation.scrollTimeout = setTimeout(() => { activeScrollSource = null; }, 50);
    });
}

// Call API to Process Text
async function processText() {
    const text = inputJa.value.trim();
    if (!text) {
        showToast('일본어 문장을 입력해주세요.', 'warning');
        return;
    }
    
    // Show spinner, disable run button
    const spinner = btnRun.querySelector('.spinner');
    const btnSpan = btnRun.querySelector('span');
    btnRun.disabled = true;
    spinner.classList.remove('hidden');
    btnSpan.textContent = '처리 중...';
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || '서버 오류가 발생했습니다.');
        }
        
        const data = await response.json();
        
        // Save to state
        state.originalText = data.results.map(r => r.originalText).join('\n');
        state.okuriganaText = data.results.map(r => r.okuriganaText).join('\n');
        state.translationText = data.results.map(r => r.translation).join('\n');
        
        // Clear outputs
        outputFurigana.innerHTML = '';
        outputTranslation.innerHTML = '';
        
        // Render lines dynamically
        data.results.forEach((item, index) => {
            // Panel 2 Furigana Item
            const fDiv = document.createElement('div');
            fDiv.className = 'line-item';
            fDiv.setAttribute('data-index', index);
            fDiv.innerHTML = item.furiganaHtml;
            outputFurigana.appendChild(fDiv);
            
            // Panel 3 Translation Item
            const tDiv = document.createElement('div');
            tDiv.className = 'line-item';
            tDiv.setAttribute('data-index', index);
            tDiv.textContent = item.translation;
            outputTranslation.appendChild(tDiv);
        });
        
        // Sync the heights of the lines to ensure horizontal alignment
        syncHeights();
        
        // Enable export button
        btnExport.disabled = false;
        
        showToast('성공적으로 분석되었습니다!');
    } catch (err) {
        console.error('Processing error:', err);
        showToast(err.message || '요청 처리에 실패했습니다.', 'error');
    } finally {
        // Hide spinner, enable run button
        btnRun.disabled = false;
        spinner.classList.add('hidden');
        btnSpan.textContent = '실행하기';
    }
}

// Export Results to TXT
function exportToTxt() {
    if (!state.originalText) {
        showToast('저장할 데이터가 존재하지 않습니다.', 'warning');
        return;
    }
    
    // Format text content
    const fileContent = 
`=========================================
[일본어 원문]
=========================================
${state.originalText}

=========================================
[요미가나 (Furigana)]
=========================================
${state.okuriganaText}

=========================================
[한국어 번역문]
=========================================
${state.translationText}
`;

    // Create file blob with UTF-8 BOM to prevent Korean encoding bugs on Windows
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, fileContent], { type: 'text/plain;charset=utf-8' });
    
    // Generate filename using date-time
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `japanese_study_${timestamp}.txt`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`${filename} 파일이 다운로드 폴더에 저장되었습니다.`);
}
