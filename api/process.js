const express = require('express');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

const app = express();
app.use(express.json());

// Serve static files from the public directory (for local testing)
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Kuroshiro
const kuroshiro = new Kuroshiro();
let kuroshiroInitialized = false;
let initializationError = null;

const initKuroshiro = async () => {
    try {
        const dictPath = path.join(process.cwd(), 'dict');
        console.log(`Initializing Kuroshiro with dictPath: ${dictPath}`);
        await kuroshiro.init(new KuromojiAnalyzer({ dictPath }));
        kuroshiroInitialized = true;
        console.log('Kuroshiro initialized successfully!');
    } catch (err) {
        console.error('Kuroshiro initialization failed:', err);
        initializationError = err.message || err;
    }
};

// Start initialization immediately
initKuroshiro();

// Helper to ensure Kuroshiro is ready before processing
async function ensureKuroshiro() {
    if (kuroshiroInitialized) return;
    if (initializationError) {
        throw new Error(`Kuroshiro initialization failed: ${initializationError}`);
    }
    let attempts = 0;
    while (!kuroshiroInitialized && attempts < 150) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!kuroshiroInitialized) {
        throw new Error('Kuroshiro initialization timed out');
    }
}

// Processing endpoint (Furigana generation and Translation)
app.post('/api/process', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text parameter is required' });
        }

        await ensureKuroshiro();

        // Split text by newlines to process line-by-line
        const lines = text.split('\n');
        const results = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // If the line is empty, preserve it as a blank space in outputs
            if (!trimmedLine) {
                results.push({
                    originalText: '',
                    furiganaHtml: '<div class="empty-line-placeholder">&nbsp;</div>',
                    okuriganaText: '',
                    translation: ''
                });
                continue;
            }

            // 1. Generate Furigana HTML
            const furiganaHtml = await kuroshiro.convert(line, {
                to: 'hiragana',
                mode: 'furigana'
            });

            // 2. Generate parenthesized Okurigana for TXT file format
            const okuriganaText = await kuroshiro.convert(line, {
                to: 'hiragana',
                mode: 'okurigana'
            });

            // 3. Translate to Korean
            let translation = '';
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=ja&tl=ko&q=${encodeURIComponent(line)}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Translation API returned status ${response.status}`);
                }
                const data = await response.json();
                if (data && data[0]) {
                    translation = data[0].map(item => item[0]).join('');
                } else {
                    translation = '번역 결과를 파싱할 수 없습니다.';
                }
            } catch (transErr) {
                console.error(`Translation error for line: "${line}":`, transErr);
                translation = `[번역 오류] ${transErr.message}`;
            }

            results.push({
                originalText: line,
                furiganaHtml,
                okuriganaText,
                translation
            });
        }

        res.json({ results });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// Expose the app for Vercel
module.exports = app;

// Listen locally if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}
