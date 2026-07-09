/**
 * POKÉMON BOT - VERCEL PROXY (Based on game-1.html approach)
 * Local proxy concept but works on Vercel
 */

const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const app = express();
app.use(express.json());

const GAME_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Pokémon Game Bot</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            font-family: Arial, sans-serif;
        }
        #gameContainer {
            width: 100%;
            height: 100vh;
        }
        #debugConsole {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 400px;
            height: 250px;
            background: rgba(0,0,0,0.9);
            color: #0f0;
            font-size: 10px;
            overflow-y: auto;
            padding: 10px;
            font-family: monospace;
            border-top: 2px solid #0f0;
            border-left: 2px solid #0f0;
            z-index: 9999;
        }
        .log-entry { padding: 2px 0; }
        .success { color: #0f0; }
        .error { color: #f00; }
        .warning { color: #ff0; }
        .info { color: #0ff; }
        
        #botPanel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            border: 2px solid #FF6B6B;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10000;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
        }
    </style>
</head>
<body>

<div id="gameContainer"></div>
<div id="debugConsole"></div>
<button id="botPanel" onclick="alert('Bot panel - add your bot controls here!')">🤖</button>

<script>
const debugLog = (msg, type = 'info') => {
    const console_div = document.getElementById('debugConsole');
    const entry = document.createElement('div');
    entry.className = \`log-entry \${type}\`;
    entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
    console_div.appendChild(entry);
    console_div.scrollTop = console_div.scrollHeight;
};

debugLog('🎮 Initializing game proxy...', 'info');

// Intercept ALL fetch requests and route through /api/proxy
const originalFetch = window.fetch;
window.fetch = function(urlStr, options = {}) {
    const isExternalUrl = urlStr.includes('http');
    
    if (isExternalUrl && !urlStr.includes('localhost')) {
        debugLog(\`📤 Proxying: \${urlStr.substring(0, 60)}\`, 'info');
        
        const encodedUrl = encodeURIComponent(urlStr);
        const proxiedUrl = \`/api/proxy?url=\${encodedUrl}\`;
        
        const start = Date.now();
        return originalFetch(proxiedUrl, options)
            .then(res => {
                const time = Date.now() - start;
                const type = res.status === 200 ? 'success' : 'error';
                debugLog(\`📥 [\${res.status}] \${time}ms\`, type);
                return res;
            })
            .catch(err => {
                debugLog(\`❌ \${err.message}\`, 'error');
                throw err;
            });
    }
    
    return originalFetch(urlStr, options);
};

// Load game
debugLog('🔗 Loading game from CDN...', 'info');
window.addEventListener('load', () => {
    const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    fetch(gameUrl)
        .then(res => res.text())
        .then(html => {
            debugLog('✅ Game HTML loaded', 'success');
            document.getElementById('gameContainer').innerHTML = html;
        })
        .catch(err => {
            debugLog(\`❌ Failed to load game: \${err.message}\`, 'error');
        });
});

// Global error handler
window.addEventListener('error', (e) => {
    debugLog(\`💥 \${e.message}\`, 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    debugLog(\`🔴 Promise: \${e.reason}\`, 'error');
});
</script>

</body>
</html>`;

// ============ MAIN PAGE ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(GAME_HTML);
});

// ============ PROXY ENDPOINT ============
app.get('/api/proxy', (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }
    
    try {
        const decodedUrl = decodeURIComponent(targetUrl);
        const protocol = decodedUrl.startsWith('https') ? https : http;
        
        protocol.get(decodedUrl, (proxyRes) => {
            const headers = {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': '*'
            };
            
            res.writeHead(proxyRes.statusCode, headers);
            proxyRes.pipe(res);
        }).on('error', (err) => {
            res.status(502).json({ error: err.message });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CORS preflight
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.sendStatus(200);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
