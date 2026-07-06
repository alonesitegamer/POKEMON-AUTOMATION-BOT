/**
 * POKÉMON BOT - PROXY + DIAGNOSTIC
 * Serves game through proxy to bypass CORS
 * Better layout - game 70%, debug 30%
 */

const express = require('express');
const https = require('https');
const http = require('http');
const url = require('url');
const app = express();
app.use(express.json());

let requestLog = [];

const DIAGNOSTIC_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Pokémon Bot Diagnostic</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0e27;
            color: #00ff41;
            display: flex;
            height: 100vh;
        }
        
        .game-area {
            flex: 7;
            position: relative;
            background: #000;
            border-right: 2px solid #00ff41;
            display: flex;
            flex-direction: column;
        }
        
        .game-controls {
            padding: 8px;
            background: #1a1f3a;
            border-bottom: 2px solid #00ff41;
            font-size: 11px;
        }
        
        #gameIframe {
            flex: 1;
            border: none;
            background: #000;
        }
        
        .debug-panel {
            flex: 3;
            background: #0a0e27;
            display: flex;
            flex-direction: column;
            border-left: 2px solid #00ff41;
            overflow: hidden;
        }
        
        .debug-header {
            background: #1a1f3a;
            padding: 8px;
            border-bottom: 2px solid #00ff41;
            font-weight: bold;
            color: #00ff41;
            font-size: 11px;
        }
        
        .tabs {
            display: flex;
            background: #1a1f3a;
            border-bottom: 1px solid #00ff41;
        }
        
        .tab {
            flex: 1;
            padding: 6px;
            cursor: pointer;
            border-right: 1px solid #00ff41;
            font-size: 10px;
            background: #0a0e27;
            color: #00ff41;
            text-align: center;
        }
        
        .tab.active {
            background: #00ff41;
            color: #0a0e27;
        }
        
        .debug-content {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            font-size: 10px;
            line-height: 1.3;
        }
        
        .log-entry {
            margin-bottom: 3px;
            padding: 2px;
            border-left: 2px solid #00ff41;
            padding-left: 6px;
        }
        
        .log-error { color: #ff4444; border-left-color: #ff4444; }
        .log-warn { color: #ffaa00; border-left-color: #ffaa00; }
        .log-success { color: #44ff44; border-left-color: #44ff44; }
        .log-info { color: #00ffff; border-left-color: #00ffff; }
        
        .controls {
            padding: 6px;
            background: #1a1f3a;
            border-top: 1px solid #00ff41;
            display: flex;
            gap: 3px;
        }
        
        .btn-small {
            flex: 1;
            padding: 5px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 9px;
            font-weight: bold;
        }
        
        .btn-small:hover { opacity: 0.8; }
    </style>
</head>
<body>
    <div class="game-area">
        <div class="game-controls">
            🎮 GAME [Loaded via Proxy] | Status: <span id="gameStatus">Loading...</span>
        </div>
        <iframe id="gameIframe"></iframe>
    </div>
    
    <div class="debug-panel">
        <div class="debug-header">🔍 DIAGNOSTICS</div>
        
        <div class="tabs">
            <div class="tab active" onclick="switchTab('console')">Console</div>
            <div class="tab" onclick="switchTab('network')">Network</div>
            <div class="tab" onclick="switchTab('status')">Status</div>
        </div>
        
        <div class="debug-content" id="console" style="display: block;">
            <div class="log-entry log-info">📡 Initializing...</div>
        </div>
        
        <div class="debug-content" id="network" style="display: none;">
            <div class="log-entry log-info">Monitoring requests...</div>
        </div>
        
        <div class="debug-content" id="status" style="display: none;">
            <div class="log-entry log-info">System status...</div>
        </div>
        
        <div class="controls">
            <button class="btn-small" onclick="clearLogs()">Clear</button>
            <button class="btn-small" onclick="downloadLogs()">Download</button>
            <button class="btn-small" onclick="reloadGame()">Reload</button>
        </div>
    </div>

    <script>
        const logs = {
            console: [],
            network: [],
            status: []
        };
        
        // Capture console
        const origLog = console.log;
        const origError = console.error;
        const origWarn = console.warn;
        
        console.log = function(...args) {
            origLog(...args);
            addLog('console', '📝 ' + args.join(' '), 'info');
        };
        
        console.error = function(...args) {
            origError(...args);
            addLog('console', '❌ ' + args.join(' '), 'error');
        };
        
        console.warn = function(...args) {
            origWarn(...args);
            addLog('console', '⚠️ ' + args.join(' '), 'warn');
        };
        
        // Global error handler
        window.addEventListener('error', (e) => {
            addLog('console', '💥 ' + e.message, 'error');
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            addLog('console', '🔴 Promise: ' + e.reason, 'error');
        });
        
        // Intercept fetch
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const urlStr = args[0];
            const start = Date.now();
            
            addLog('network', '📤 → ' + urlStr.substring(0, 60), 'info');
            
            return origFetch.apply(this, args)
                .then(res => {
                    const time = Date.now() - start;
                    const msg = '📥 ← [' + res.status + '] ' + time + 'ms';
                    addLog('network', msg, res.status === 200 ? 'success' : 'error');
                    return res;
                })
                .catch(err => {
                    addLog('network', '🔴 ' + err.message, 'error');
                    throw err;
                });
        };
        
        // Load game via proxy
        window.addEventListener('load', () => {
            addLog('console', '🎮 Loading game via proxy...', 'info');
            document.getElementById('gameIframe').src = '/game-proxy';
            
            setTimeout(() => {
                document.getElementById('gameStatus').textContent = 'Game Loaded';
                addLog('console', '✅ Game iframe loaded', 'success');
            }, 2000);
        });
        
        function addLog(section, message, type = 'info') {
            const elem = document.getElementById(section);
            if (!elem) return;
            
            const entry = document.createElement('div');
            entry.className = 'log-entry log-' + type;
            entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
            elem.insertBefore(entry, elem.firstChild);
            
            while (elem.children.length > 100) {
                elem.removeChild(elem.lastChild);
            }
        }
        
        function switchTab(tabName) {
            document.querySelectorAll('.debug-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            document.getElementById(tabName).style.display = 'block';
            event.target.classList.add('active');
        }
        
        function clearLogs() {
            document.querySelectorAll('.debug-content').forEach(el => {
                el.innerHTML = '<div class="log-entry log-info">Cleared</div>';
            });
        }
        
        function downloadLogs() {
            const data = {
                logs,
                timestamp: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pokemon-diagnostics.json';
            a.click();
        }
        
        function reloadGame() {
            document.getElementById('gameIframe').src = '';
            setTimeout(() => {
                document.getElementById('gameIframe').src = '/game-proxy';
                addLog('console', '🔄 Game reloaded', 'info');
            }, 500);
        }
    </script>
</body>
</html>`;

// ============ MAIN PAGE ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DIAGNOSTIC_PAGE);
});

// ============ GAME PROXY ============
app.get('/game-proxy', (req, res) => {
    const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    
    https.get(gameUrl, (proxyRes) => {
        // Remove CORS-blocking headers
        const headers = {
            'Content-Type': proxyRes.headers['content-type'],
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': '*'
        };
        
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
    }).on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error: ' + err.message);
    });
});

// ============ REQUEST LOGGING ============
app.all('*', (req, res, next) => {
    const entry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        url: req.originalUrl
    };
    requestLog.unshift(entry);
    if (requestLog.length > 100) requestLog.pop();
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
