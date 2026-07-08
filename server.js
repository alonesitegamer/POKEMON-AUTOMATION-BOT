/**
 * POKÉMON BOT - SIMPLE DEBUG
 * Game fullscreen + click button to see errors/status
 */

const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const SIMPLE_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Pokémon Game</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; font-family: Arial; }
        
        #gameFrame { 
            width: 100vw;
            height: 100vh;
            border: none;
            display: block;
        }
        
        .debug-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #00ff41;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 5000;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(0,255,65,0.6);
        }
        
        .debug-btn:active {
            transform: scale(0.95);
        }
        
        .debug-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 5001;
            display: none;
            justify-content: center;
            align-items: center;
        }
        
        .debug-overlay.show {
            display: flex;
        }
        
        .debug-box {
            background: #1a1a2e;
            color: #00ff41;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #00ff41;
            max-width: 85%;
            max-height: 80%;
            overflow-y: auto;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.6;
        }
        
        .close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #ff4444;
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            font-weight: bold;
        }
        
        .debug-title {
            font-size: 16px;
            font-weight: bold;
            color: #00ff41;
            margin-bottom: 15px;
            border-bottom: 2px solid #00ff41;
            padding-bottom: 10px;
        }
        
        .debug-section {
            margin-bottom: 15px;
        }
        
        .debug-section-title {
            color: #ffaa00;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .debug-item {
            color: #00ffff;
            margin-bottom: 6px;
            padding-left: 10px;
            border-left: 2px solid #00ff41;
        }
        
        .debug-error {
            color: #ff4444;
            border-left-color: #ff4444;
        }
        
        .debug-success {
            color: #44ff44;
            border-left-color: #44ff44;
        }
    </style>
</head>
<body>
    <iframe id="gameFrame"></iframe>
    <button class="debug-btn" onclick="showDebug()">🐛</button>
    
    <div class="debug-overlay" id="debugOverlay" onclick="closeDebug(event)">
        <button class="close-btn" onclick="closeDebug()">✕</button>
        <div class="debug-box" onclick="event.stopPropagation()">
            <div class="debug-title">🔍 GAME DEBUG STATUS</div>
            
            <div class="debug-section">
                <div class="debug-section-title">📊 REQUESTS MADE:</div>
                <div id="requestCount" class="debug-item">Loading...</div>
                <div id="errorCount" class="debug-item">No errors yet</div>
            </div>
            
            <div class="debug-section">
                <div class="debug-section-title">✅ SUCCESS REQUESTS:</div>
                <div id="successList"></div>
            </div>
            
            <div class="debug-section">
                <div class="debug-section-title">❌ FAILED REQUESTS:</div>
                <div id="errorList"></div>
            </div>
            
            <div class="debug-section">
                <div class="debug-section-title">🎯 LAST STATUS:</div>
                <div id="lastStatus" class="debug-item">Initializing game...</div>
            </div>
        </div>
    </div>

    <script>
        let stats = {
            total: 0,
            success: 0,
            errors: 0,
            requests: [],
            lastStatus: '🎮 Game initializing...'
        };
        
        // Intercept fetch
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            stats.total++;
            
            const shortUrl = url.substring(url.lastIndexOf('/'));
            stats.lastStatus = '📤 Requesting: ' + shortUrl;
            
            return origFetch.apply(this, args)
                .then(res => {
                    const status = res.status;
                    if (status >= 200 && status < 300) {
                        stats.success++;
                        stats.requests.push({
                            type: 'success',
                            url: shortUrl,
                            status: status
                        });
                        stats.lastStatus = '✅ Got: ' + status + ' ' + shortUrl;
                    } else {
                        stats.errors++;
                        stats.requests.push({
                            type: 'error',
                            url: shortUrl,
                            status: status
                        });
                        stats.lastStatus = '❌ Error ' + status + ': ' + shortUrl;
                    }
                    updateDebugUI();
                    return res;
                })
                .catch(err => {
                    stats.errors++;
                    stats.requests.push({
                        type: 'error',
                        url: shortUrl,
                        status: 'FAILED',
                        error: err.message
                    });
                    stats.lastStatus = '🔴 Failed: ' + err.message;
                    updateDebugUI();
                    throw err;
                });
        };
        
        // Global error
        window.addEventListener('error', (e) => {
            stats.errors++;
            stats.lastStatus = '💥 Runtime error: ' + e.message;
            updateDebugUI();
        });
        
        function updateDebugUI() {
            // Request counts
            document.getElementById('requestCount').textContent = 'Total: ' + stats.total + ' | Success: ' + stats.success;
            document.getElementById('errorCount').textContent = 'Failed: ' + stats.errors;
            
            // Success list
            const successList = document.getElementById('successList');
            successList.innerHTML = '';
            stats.requests.filter(r => r.type === 'success').slice(-5).forEach(r => {
                const div = document.createElement('div');
                div.className = 'debug-item debug-success';
                div.textContent = '[' + r.status + '] ' + r.url;
                successList.appendChild(div);
            });
            if (stats.requests.filter(r => r.type === 'success').length === 0) {
                successList.innerHTML = '<div class="debug-item">None yet</div>';
            }
            
            // Error list
            const errorList = document.getElementById('errorList');
            errorList.innerHTML = '';
            stats.requests.filter(r => r.type === 'error').forEach(r => {
                const div = document.createElement('div');
                div.className = 'debug-item debug-error';
                div.textContent = '[' + r.status + '] ' + r.url + (r.error ? ' - ' + r.error : '');
                errorList.appendChild(div);
            });
            if (stats.requests.filter(r => r.type === 'error').length === 0) {
                errorList.innerHTML = '<div class="debug-item">None</div>';
            }
            
            // Last status
            document.getElementById('lastStatus').textContent = stats.lastStatus;
        }
        
        function showDebug() {
            document.getElementById('debugOverlay').classList.add('show');
        }
        
        function closeDebug(e) {
            if (!e || e.target.id === 'debugOverlay') {
                document.getElementById('debugOverlay').classList.remove('show');
            }
        }
        
        // Load game
        window.addEventListener('load', () => {
            stats.lastStatus = '🎮 Loading game from CDN...';
            document.getElementById('gameFrame').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
            updateDebugUI();
        });
    </script>
</body>
</html>`;

// Routes
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(SIMPLE_PAGE);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
