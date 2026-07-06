/**
 * POKÉMON BOT - DIRECT LOADER
 * Loads game directly (no iframe)
 * Shows real console logs from game
 */

const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const DIRECT_LOADER = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Pokémon Bot - Direct Loader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Courier New', monospace;
            background: #000;
            overflow: hidden;
            display: flex;
            height: 100vh;
        }
        
        .game-wrapper {
            flex: 1;
            background: #000;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        
        .game-content {
            flex: 1;
            position: relative;
            background: #000;
        }
        
        .console-panel {
            width: 100%;
            height: 200px;
            background: #0a0e27;
            border-top: 2px solid #00ff41;
            color: #00ff41;
            padding: 10px;
            overflow-y: auto;
            font-size: 11px;
            font-family: monospace;
        }
        
        .console-entry {
            margin-bottom: 4px;
            padding: 3px;
            border-left: 2px solid #00ff41;
            padding-left: 6px;
        }
        
        .console-log { color: #00ffff; border-left-color: #00ffff; }
        .console-error { color: #ff4444; border-left-color: #ff4444; }
        .console-warn { color: #ffaa00; border-left-color: #ffaa00; }
        .console-info { color: #44ff44; border-left-color: #44ff44; }
        
        .console-controls {
            padding: 8px;
            background: #1a1f3a;
            display: flex;
            gap: 8px;
            border-top: 1px solid #00ff41;
        }
        
        .btn {
            padding: 6px 12px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        .status-bar {
            padding: 8px;
            background: #1a1f3a;
            border-bottom: 1px solid #00ff41;
            font-size: 11px;
            color: #00ff41;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        
        .status-loading { background: #ffaa00; animation: pulse 1s infinite; }
        .status-error { background: #ff4444; }
        .status-success { background: #44ff44; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        ::-webkit-scrollbar {
            width: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1a1f3a;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #00ff41;
        }
    </style>
</head>
<body>
    <div class="game-wrapper">
        <div class="status-bar">
            <span class="status-indicator status-loading" id="statusInd"></span>
            <span id="statusText">🎮 Loading game directly...</span>
        </div>
        
        <div class="game-content" id="gameContent">
            <!-- Game will load here -->
        </div>
        
        <div class="console-panel">
            <div class="console-entry console-info">📡 Console Output:</div>
            <div id="consoleOutput"></div>
        </div>
        
        <div class="console-controls">
            <button class="btn" onclick="clearConsole()">Clear</button>
            <button class="btn" onclick="downloadLogs()">Download</button>
            <button class="btn" onclick="reloadGame()">Reload</button>
        </div>
    </div>

    <script>
        const consoleLogs = [];
        
        // Capture console.log
        const origLog = console.log;
        console.log = function(...args) {
            origLog(...args);
            addConsoleEntry('[LOG] ' + args.join(' '), 'log');
        };
        
        // Capture console.error
        const origError = console.error;
        console.error = function(...args) {
            origError(...args);
            addConsoleEntry('[ERROR] ' + args.join(' '), 'error');
        };
        
        // Capture console.warn
        const origWarn = console.warn;
        console.warn = function(...args) {
            origWarn(...args);
            addConsoleEntry('[WARN] ' + args.join(' '), 'warn');
        };
        
        // Global error handler
        window.addEventListener('error', (e) => {
            addConsoleEntry('💥 RUNTIME ERROR: ' + e.message, 'error');
            updateStatus('❌ Runtime Error', 'error');
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            addConsoleEntry('🔴 UNHANDLED PROMISE: ' + e.reason, 'error');
            updateStatus('❌ Promise Rejection', 'error');
        });
        
        // Network logging
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            const start = Date.now();
            
            addConsoleEntry('📤 [FETCH] → ' + url.substring(0, 80), 'info');
            
            return origFetch.apply(this, args)
                .then(res => {
                    const time = Date.now() - start;
                    addConsoleEntry('📥 [' + res.status + '] ' + time + 'ms', 'info');
                    return res;
                })
                .catch(err => {
                    addConsoleEntry('❌ [FETCH ERROR] ' + err.message, 'error');
                    throw err;
                });
        };
        
        // Load game
        window.addEventListener('load', () => {
            addConsoleEntry('🎮 Page loaded, fetching game HTML...', 'info');
            updateStatus('🎮 Loading game...', 'loading');
            
            fetch('/game-html')
                .then(res => res.text())
                .then(html => {
                    addConsoleEntry('✅ Game HTML received (' + html.length + ' bytes)', 'log');
                    document.getElementById('gameContent').innerHTML = html;
                    updateStatus('✅ Game loaded', 'success');
                    
                    // Give game time to initialize
                    setTimeout(() => {
                        addConsoleEntry('⏳ Waiting for game initialization...', 'info');
                    }, 1000);
                })
                .catch(err => {
                    addConsoleEntry('❌ Failed to load game: ' + err.message, 'error');
                    updateStatus('❌ Load failed', 'error');
                });
        });
        
        function addConsoleEntry(message, type = 'log') {
            const output = document.getElementById('consoleOutput');
            const entry = document.createElement('div');
            entry.className = 'console-entry console-' + type;
            entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
            output.insertBefore(entry, output.firstChild);
            
            consoleLogs.push({
                time: new Date().toISOString(),
                type: type,
                message: message
            });
            
            while (output.children.length > 200) {
                output.removeChild(output.lastChild);
            }
        }
        
        function updateStatus(text, status) {
            document.getElementById('statusText').textContent = text;
            const ind = document.getElementById('statusInd');
            ind.className = 'status-indicator status-' + status;
        }
        
        function clearConsole() {
            document.getElementById('consoleOutput').innerHTML = '';
            consoleLogs.length = 0;
        }
        
        function downloadLogs() {
            const data = {
                consoleLogs,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pokemon-bot-logs.json';
            a.click();
        }
        
        function reloadGame() {
            document.getElementById('gameContent').innerHTML = '';
            clearConsole();
            location.reload();
        }
    </script>
</body>
</html>`;

// ============ MAIN PAGE ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DIRECT_LOADER);
});

// ============ FETCH GAME HTML ============
app.get('/game-html', (req, res) => {
    const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    
    https.get(gameUrl, (proxyRes) => {
        let html = '';
        
        proxyRes.on('data', (chunk) => {
            html += chunk.toString();
        });
        
        proxyRes.on('end', () => {
            // Inject console logging into game
            const inject = `
            <script>
            window.originalLog = console.log;
            console.log = function(...args) {
                window.originalLog(...args);
                window.parent.console.log('[GAME] ' + args.join(' '));
            };
            
            window.onerror = function(msg, url, line) {
                window.parent.console.error('[GAME ERROR] ' + msg + ' at ' + line);
                return false;
            };
            
            window.addEventListener('unhandledrejection', (e) => {
                window.parent.console.error('[GAME PROMISE] ' + e.reason);
            });
            </script>
            `;
            
            // Insert before closing body
            html = html.replace('</body>', inject + '</body>');
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(html);
        });
    }).on('error', (err) => {
        res.status(500).send('Error: ' + err.message);
    });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
