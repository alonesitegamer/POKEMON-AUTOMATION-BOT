/**
 * POKÉMON BOT - OVERLAY DIAGNOSTIC
 * Fullscreen game + transparent overlay diagnostic panel
 * Click button to show/hide diagnostics
 */

const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const OVERLAY_DIAGNOSTIC = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 Pokémon Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Courier New', monospace;
            background: #000;
            overflow: hidden;
        }
        
        .game-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        
        #gameIframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
        
        /* FLOATING BUTTON */
        .diagnostic-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #00ff41, #00ffff);
            border: 2px solid #00ff41;
            border-radius: 50%;
            cursor: pointer;
            z-index: 5000;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(0, 255, 65, 0.6);
            transition: all 0.3s;
        }
        
        .diagnostic-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(0, 255, 65, 0.8);
        }
        
        .diagnostic-button.active {
            background: linear-gradient(135deg, #ff4444, #ffaa00);
            border-color: #ff4444;
        }
        
        /* OVERLAY PANEL - Semi-transparent */
        .overlay-diagnostic {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 600px;
            height: 70%;
            background: rgba(10, 14, 39, 0.95);
            border: 2px solid #00ff41;
            border-radius: 8px;
            z-index: 5001;
            display: none;
            flex-direction: column;
            backdrop-filter: blur(5px);
            box-shadow: 0 8px 32px rgba(0, 255, 65, 0.3);
        }
        
        .overlay-diagnostic.show {
            display: flex;
        }
        
        /* HEADER */
        .diagnostic-header {
            background: linear-gradient(135deg, #00ff41, #00ffff);
            color: #0a0e27;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #00ff41;
            border-radius: 6px 6px 0 0;
            font-weight: bold;
            font-size: 13px;
        }
        
        .close-button {
            background: rgba(255, 68, 68, 0.8);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .close-button:hover {
            background: #ff4444;
        }
        
        /* TABS */
        .diagnostic-tabs {
            display: flex;
            background: rgba(26, 31, 58, 0.8);
            border-bottom: 1px solid #00ff41;
        }
        
        .diagnostic-tab {
            flex: 1;
            padding: 10px;
            cursor: pointer;
            border-right: 1px solid #00ff41;
            background: transparent;
            color: #00ff41;
            border: none;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .diagnostic-tab:hover {
            background: rgba(0, 255, 65, 0.1);
        }
        
        .diagnostic-tab.active {
            background: rgba(0, 255, 65, 0.2);
            color: #00ff41;
            border-bottom: 2px solid #00ff41;
        }
        
        .diagnostic-tab:last-child {
            border-right: none;
        }
        
        /* CONTENT */
        .diagnostic-content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            font-size: 10px;
            line-height: 1.4;
            display: none;
        }
        
        .diagnostic-content.show {
            display: block;
        }
        
        .log-entry {
            margin-bottom: 4px;
            padding: 4px;
            border-left: 2px solid #00ff41;
            padding-left: 8px;
            font-family: monospace;
        }
        
        .log-error {
            color: #ff4444;
            border-left-color: #ff4444;
        }
        
        .log-warn {
            color: #ffaa00;
            border-left-color: #ffaa00;
        }
        
        .log-success {
            color: #44ff44;
            border-left-color: #44ff44;
        }
        
        .log-info {
            color: #00ffff;
            border-left-color: #00ffff;
        }
        
        /* CONTROLS */
        .diagnostic-controls {
            padding: 10px;
            background: rgba(26, 31, 58, 0.8);
            border-top: 1px solid #00ff41;
            display: flex;
            gap: 8px;
        }
        
        .btn-diag {
            flex: 1;
            padding: 8px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            transition: all 0.2s;
        }
        
        .btn-diag:hover {
            opacity: 0.8;
            transform: translateY(-2px);
        }
        
        ::-webkit-scrollbar {
            width: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(26, 31, 58, 0.5);
        }
        
        ::-webkit-scrollbar-thumb {
            background: #00ff41;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <iframe id="gameIframe"></iframe>
        
        <!-- FLOATING BUTTON -->
        <button class="diagnostic-button" id="diagButton" onclick="toggleDiagnostic()">🔍</button>
        
        <!-- OVERLAY DIAGNOSTIC PANEL -->
        <div class="overlay-diagnostic" id="diagPanel">
            <div class="diagnostic-header">
                🔍 DIAGNOSTIC OVERLAY
                <button class="close-button" onclick="closeDiagnostic()">✕</button>
            </div>
            
            <div class="diagnostic-tabs">
                <button class="diagnostic-tab active" onclick="switchDiagTab('console')">Console</button>
                <button class="diagnostic-tab" onclick="switchDiagTab('network')">Network</button>
                <button class="diagnostic-tab" onclick="switchDiagTab('errors')">Errors</button>
            </div>
            
            <div class="diagnostic-content show" id="console">
                <div class="log-entry log-info">📡 Initializing diagnostics...</div>
            </div>
            
            <div class="diagnostic-content" id="network">
                <div class="log-entry log-info">🔌 Monitoring network...</div>
            </div>
            
            <div class="diagnostic-content" id="errors">
                <div class="log-entry log-info">🛡️ Error tracking active</div>
            </div>
            
            <div class="diagnostic-controls">
                <button class="btn-diag" onclick="clearDiagLogs()">Clear</button>
                <button class="btn-diag" onclick="downloadDiagLogs()">Download</button>
                <button class="btn-diag" onclick="reloadDiagGame()">Reload</button>
            </div>
        </div>
    </div>

    <script>
        const diagLogs = {
            console: [],
            network: [],
            errors: []
        };
        
        let diagOpen = false;
        
        // ============ CONSOLE CAPTURE ============
        const origLog = console.log;
        const origError = console.error;
        const origWarn = console.warn;
        
        console.log = function(...args) {
            origLog(...args);
            addDiagLog('console', '📝 ' + args.join(' '), 'info');
        };
        
        console.error = function(...args) {
            origError(...args);
            addDiagLog('console', '❌ ' + args.join(' '), 'error');
            addDiagLog('errors', '❌ ' + args.join(' '), 'error');
        };
        
        console.warn = function(...args) {
            origWarn(...args);
            addDiagLog('console', '⚠️ ' + args.join(' '), 'warn');
        };
        
        // ============ GLOBAL ERROR HANDLER ============
        window.addEventListener('error', (e) => {
            addDiagLog('console', '💥 Runtime Error: ' + e.message, 'error');
            addDiagLog('errors', '💥 ' + e.message, 'error');
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            addDiagLog('console', '🔴 Promise Rejection: ' + e.reason, 'error');
            addDiagLog('errors', '🔴 ' + e.reason, 'error');
        });
        
        // ============ FETCH INTERCEPTION ============
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const urlStr = args[0];
            const start = Date.now();
            
            addDiagLog('network', '📤 → ' + urlStr.substring(0, 70), 'info');
            
            return origFetch.apply(this, args)
                .then(res => {
                    const time = Date.now() - start;
                    const status = res.status;
                    const className = status === 200 ? 'success' : 'error';
                    addDiagLog('network', '📥 ← [' + status + '] ' + time + 'ms', className);
                    return res;
                })
                .catch(err => {
                    addDiagLog('network', '🔴 ' + err.message, 'error');
                    addDiagLog('errors', '🔴 ' + err.message, 'error');
                    throw err;
                });
        };
        
        // ============ GAME LOADING ============
        window.addEventListener('load', () => {
            addDiagLog('console', '🎮 Loading game via proxy...', 'info');
            document.getElementById('gameIframe').src = '/game-proxy';
            
            setTimeout(() => {
                addDiagLog('console', '✅ Game iframe loaded', 'success');
            }, 2000);
        });
        
        // ============ DIAGNOSTIC FUNCTIONS ============
        function toggleDiagnostic() {
            if (diagOpen) {
                closeDiagnostic();
            } else {
                openDiagnostic();
            }
        }
        
        function openDiagnostic() {
            document.getElementById('diagPanel').classList.add('show');
            document.getElementById('diagButton').classList.add('active');
            diagOpen = true;
        }
        
        function closeDiagnostic() {
            document.getElementById('diagPanel').classList.remove('show');
            document.getElementById('diagButton').classList.remove('active');
            diagOpen = false;
        }
        
        function switchDiagTab(tabName) {
            document.querySelectorAll('.diagnostic-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.diagnostic-content').forEach(c => c.classList.remove('show'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('show');
        }
        
        function addDiagLog(section, message, type = 'info') {
            const elem = document.getElementById(section);
            if (!elem) return;
            
            const entry = document.createElement('div');
            entry.className = 'log-entry log-' + type;
            entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
            elem.insertBefore(entry, elem.firstChild);
            
            while (elem.children.length > 150) {
                elem.removeChild(elem.lastChild);
            }
            
            diagLogs[section] = diagLogs[section] || [];
            diagLogs[section].push(message);
        }
        
        function clearDiagLogs() {
            document.querySelectorAll('.diagnostic-content').forEach(el => {
                el.innerHTML = '<div class="log-entry log-info">Cleared</div>';
            });
        }
        
        function downloadDiagLogs() {
            const data = {
                diagnostics: diagLogs,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pokemon-bot-diagnostics.json';
            a.click();
        }
        
        function reloadDiagGame() {
            document.getElementById('gameIframe').src = '';
            setTimeout(() => {
                document.getElementById('gameIframe').src = '/game-proxy';
                addDiagLog('console', '🔄 Game reloaded', 'success');
            }, 500);
        }
    </script>
</body>
</html>`;

// ============ ROUTES ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(OVERLAY_DIAGNOSTIC);
});

// ============ GAME PROXY ============
app.get('/game-proxy', (req, res) => {
    const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    
    https.get(gameUrl, (proxyRes) => {
        const headers = {
            'Content-Type': proxyRes.headers['content-type'],
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': '*'
        };
        
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
    }).on('error', (err) => {
        res.status(500).send('Proxy error: ' + err.message);
    });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
