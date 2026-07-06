/**
 * POKÉMON BOT - FULL REQUEST LOGGER
 * Logs ALL requests the game makes
 * Shows what secrets/data it needs
 */

const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const requestLog = [];

const GAME_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Pokémon Game Loader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #000; 
            font-family: 'Courier New', monospace;
            display: flex;
            height: 100vh;
        }
        
        #gameFrame { 
            flex: 1;
            border: none;
        }
        
        .log-panel {
            width: 300px;
            background: #0a0e27;
            color: #00ff41;
            border-left: 2px solid #00ff41;
            overflow-y: auto;
            padding: 10px;
            font-size: 9px;
            line-height: 1.3;
        }
        
        .log-entry {
            margin-bottom: 3px;
            padding: 2px;
            border-left: 2px solid #00ff41;
            padding-left: 5px;
        }
        
        .log-success { color: #44ff44; border-left-color: #44ff44; }
        .log-error { color: #ff4444; border-left-color: #ff4444; }
        .log-info { color: #00ffff; border-left-color: #00ffff; }
        .log-warn { color: #ffaa00; border-left-color: #ffaa00; }
        
        .log-header {
            background: #1a1f3a;
            padding: 8px;
            border-bottom: 2px solid #00ff41;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .log-controls {
            padding: 8px;
            background: #1a1f3a;
            border-top: 2px solid #00ff41;
            display: flex;
            gap: 5px;
        }
        
        .btn {
            flex: 1;
            padding: 4px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 8px;
            font-weight: bold;
        }
        
        .btn:hover { opacity: 0.8; }
        
        .status-bar {
            padding: 5px 10px;
            background: #1a1f3a;
            border-bottom: 1px solid #00ff41;
            font-size: 9px;
            color: #00ff41;
        }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #1a1f3a; }
        ::-webkit-scrollbar-thumb { background: #00ff41; }
    </style>
</head>
<body>
    <iframe id="gameFrame"></iframe>
    
    <div class="log-panel">
        <div class="log-header">📊 REQUEST LOG</div>
        <div class="status-bar">
            <span id="reqCount">Requests: 0</span> | 
            <span id="errCount">Errors: 0</span>
        </div>
        <div id="logContent" style="flex: 1; overflow-y: auto; height: calc(100% - 80px);"></div>
        <div class="log-controls">
            <button class="btn" onclick="clearLog()">Clear</button>
            <button class="btn" onclick="downloadLog()">Download</button>
        </div>
    </div>

    <script>
        let requests = 0;
        let errors = 0;
        const allLogs = [];
        
        // Intercept ALL fetch requests
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            const method = (args[1]?.method || 'GET').toUpperCase();
            const body = args[1]?.body;
            
            requests++;
            const reqNum = requests;
            
            addLog('📤 [' + reqNum + '] ' + method + ' ' + url.substring(0, 60), 'info');
            
            if (body) {
                addLog('    BODY: ' + body.substring(0, 80), 'info');
            }
            
            const start = Date.now();
            
            return origFetch.apply(this, args)
                .then(res => {
                    const time = Date.now() - start;
                    const status = res.status;
                    const type = status >= 200 && status < 300 ? 'success' : 'error';
                    
                    addLog('📥 [' + reqNum + '] ← ' + status + ' (' + time + 'ms)', type);
                    
                    if (status >= 400) {
                        errors++;
                    }
                    
                    updateCounters();
                    return res;
                })
                .catch(err => {
                    errors++;
                    addLog('❌ [' + reqNum + '] FAILED: ' + err.message, 'error');
                    updateCounters();
                    throw err;
                });
        };
        
        // Intercept XHR too
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            requests++;
            addLog('📤 [XHR] ' + method + ' ' + url.substring(0, 60), 'info');
            return origOpen.call(this, method, url, ...rest);
        };
        
        // Global error handler
        window.addEventListener('error', (e) => {
            errors++;
            addLog('💥 ERROR: ' + e.message, 'error');
            updateCounters();
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            errors++;
            addLog('🔴 PROMISE: ' + e.reason, 'error');
            updateCounters();
        });
        
        function addLog(message, type = 'info') {
            const logContent = document.getElementById('logContent');
            const entry = document.createElement('div');
            entry.className = 'log-entry log-' + type;
            entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
            logContent.insertBefore(entry, logContent.firstChild);
            
            allLogs.push({
                time: new Date().toISOString(),
                type: type,
                message: message
            });
            
            while (logContent.children.length > 300) {
                logContent.removeChild(logContent.lastChild);
            }
        }
        
        function updateCounters() {
            document.getElementById('reqCount').textContent = 'Requests: ' + requests;
            document.getElementById('errCount').textContent = 'Errors: ' + errors;
        }
        
        function clearLog() {
            document.getElementById('logContent').innerHTML = '';
            requests = 0;
            errors = 0;
            allLogs.length = 0;
            updateCounters();
        }
        
        function downloadLog() {
            const data = {
                totalRequests: requests,
                totalErrors: errors,
                logs: allLogs,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'game-request-log.json';
            a.click();
        }
        
        // Inject config secret
        window.RUNTIME_CONFIG = {
            appId: '87',
            appKey: '6ee4208d360c42a5a259849d55ad1734',
            runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',
            deviceId: 'browser-' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        
        // Load game
        window.addEventListener('load', () => {
            addLog('🎮 Loading game...', 'info');
            document.getElementById('gameFrame').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
        });
    </script>
</body>
</html>`;

// ============ ROUTES ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(GAME_PAGE);
});

// Serve runtime config
app.get('/api/config', (req, res) => {
    res.json({
        appId: '87',
        appKey: '6ee4208d360c42a5a259849d55ad1734',
        runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',
        deviceId: 'vercel-bot-' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
    });
});

// Get request log
app.get('/api/request-log', (req, res) => {
    res.json({
        totalRequests: requestLog.length,
        requests: requestLog
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
