/**
 * POKÉMON BOT - DIAGNOSTIC VERSION
 * Priority: Get the game to boot successfully
 * Focus: Debug, network inspection, error capture
 */

const express = require('express');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const app = express();
app.use(express.json());

let diagnostics = {
  gameErrors: [],
  networkRequests: [],
  resources: [],
  console: [],
  gameStatus: 'initializing',
  timestamp: Date.now()
};

const DIAGNOSTIC_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Pokémon Bot - Diagnostic Mode</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Courier New', monospace;
            background: #0a0e27;
            color: #00ff41;
            display: flex;
            height: 100vh;
            overflow: hidden;
        }
        
        .game-area {
            flex: 1;
            position: relative;
            background: #000;
            border-right: 2px solid #00ff41;
        }
        
        #gameIframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        .debug-panel {
            width: 400px;
            background: #0a0e27;
            display: flex;
            flex-direction: column;
            border-left: 2px solid #00ff41;
            overflow: hidden;
        }
        
        .debug-header {
            background: #1a1f3a;
            padding: 10px;
            border-bottom: 2px solid #00ff41;
            font-weight: bold;
            color: #00ff41;
            font-size: 12px;
        }
        
        .tabs {
            display: flex;
            background: #1a1f3a;
            border-bottom: 1px solid #00ff41;
        }
        
        .tab {
            flex: 1;
            padding: 8px;
            cursor: pointer;
            border-right: 1px solid #00ff41;
            font-size: 11px;
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
            padding: 10px;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .debug-content::-webkit-scrollbar {
            width: 6px;
        }
        
        .debug-content::-webkit-scrollbar-track {
            background: #1a1f3a;
        }
        
        .debug-content::-webkit-scrollbar-thumb {
            background: #00ff41;
        }
        
        .log-entry {
            margin-bottom: 4px;
            padding: 4px;
            border-left: 2px solid #00ff41;
            padding-left: 8px;
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
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
        }
        
        .status-loading {
            background: #ffaa00;
            animation: pulse 1s infinite;
        }
        
        .status-error {
            background: #ff4444;
        }
        
        .status-success {
            background: #44ff44;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .request-item {
            background: #1a1f3a;
            padding: 6px;
            margin-bottom: 4px;
            border-radius: 2px;
            font-size: 10px;
        }
        
        .request-success { border-left: 3px solid #44ff44; }
        .request-error { border-left: 3px solid #ff4444; }
        .request-pending { border-left: 3px solid #ffaa00; }
        
        .controls {
            padding: 10px;
            background: #1a1f3a;
            border-top: 1px solid #00ff41;
            display: flex;
            gap: 5px;
        }
        
        .btn-small {
            flex: 1;
            padding: 6px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
        }
        
        .btn-small:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="game-area">
        <iframe id="gameIframe"></iframe>
    </div>
    
    <div class="debug-panel">
        <div class="debug-header">
            🔍 DIAGNOSTIC MODE
            <span id="statusSpan" style="float: right;">
                <span class="status-indicator status-loading"></span> Initializing
            </span>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="switchTab('console')">Console</div>
            <div class="tab" onclick="switchTab('network')">Network</div>
            <div class="tab" onclick="switchTab('resources')">Resources</div>
            <div class="tab" onclick="switchTab('status')">Status</div>
        </div>
        
        <div class="debug-content" id="console" style="display: block;">
            <div class="log-entry log-info">📡 Initializing diagnostics...</div>
        </div>
        
        <div class="debug-content" id="network" style="display: none;">
            <div class="log-entry log-info">Waiting for requests...</div>
        </div>
        
        <div class="debug-content" id="resources" style="display: none;">
            <div class="log-entry log-info">Scanning resources...</div>
        </div>
        
        <div class="debug-content" id="status" style="display: none;">
            <div class="log-entry log-info">Loading status...</div>
        </div>
        
        <div class="controls">
            <button class="btn-small" onclick="clearLogs()">Clear</button>
            <button class="btn-small" onclick="downloadLogs()">Download</button>
            <button class="btn-small" onclick="reloadGame()">Reload</button>
        </div>
    </div>

    <script>
        const diagnostics = {
            console: [],
            network: [],
            resources: [],
            errors: [],
            gameStatus: 'initializing'
        };
        
        // Capture console logs
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
            diagnostics.errors.push(args.join(' '));
        };
        
        console.warn = function(...args) {
            origWarn(...args);
            addLog('console', '⚠️ ' + args.join(' '), 'warn');
        };
        
        // Capture global errors
        window.addEventListener('error', (event) => {
            addLog('console', '💥 RUNTIME ERROR: ' + event.message, 'error');
            addLog('console', '   at ' + event.filename + ':' + event.lineno, 'error');
            diagnostics.errors.push(event.message);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            addLog('console', '🔴 UNHANDLED PROMISE: ' + event.reason, 'error');
            diagnostics.errors.push(event.reason);
        });
        
        // Intercept fetch
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            const startTime = Date.now();
            
            addLog('network', '📤 → ' + url.substring(0, 80), 'info');
            
            return origFetch.apply(this, args)
                .then(response => {
                    const duration = Date.now() - startTime;
                    const status = response.status;
                    const className = status === 200 ? 'log-success' : 'log-error';
                    addLog('network', '📥 ← ' + status + ' (' + duration + 'ms) ' + url.substring(0, 60), className);
                    return response;
                })
                .catch(error => {
                    addLog('network', '🔴 FAILED: ' + error.message, 'error');
                    throw error;
                });
        };
        
        // Monitor XHR
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            addLog('network', '📤 XHR ' + method + ' ' + url.substring(0, 70), 'info');
            return origOpen.apply(this, [method, url, ...rest]);
        };
        
        // Load game
        window.addEventListener('load', () => {
            addLog('console', '🎮 Attempting to load game...', 'info');
            const iframe = document.getElementById('gameIframe');
            iframe.src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
            
            // Monitor iframe
            iframe.addEventListener('load', () => {
                addLog('console', '✅ Iframe loaded', 'success');
                updateStatus('✅ Iframe Loaded', 'success');
                scanIframeResources();
            });
            
            iframe.addEventListener('error', () => {
                addLog('console', '❌ Iframe load error', 'error');
                updateStatus('❌ Iframe Error', 'error');
            });
        });
        
        function scanIframeResources() {
            addLog('resources', '🔎 Scanning resources...', 'info');
            try {
                const iframe = document.getElementById('gameIframe');
                if (iframe.contentDocument) {
                    const scripts = iframe.contentDocument.querySelectorAll('script');
                    const styles = iframe.contentDocument.querySelectorAll('link[rel="stylesheet"]');
                    
                    addLog('resources', '📜 Scripts found: ' + scripts.length, 'info');
                    addLog('resources', '🎨 Stylesheets found: ' + styles.length, 'info');
                    
                    scripts.forEach((s, i) => {
                        const src = s.src || '(inline)';
                        addLog('resources', '  [' + (i+1) + '] ' + src.substring(0, 70), 'info');
                    });
                } else {
                    addLog('resources', '⚠️ Cannot access iframe (CORS protected)', 'warn');
                }
            } catch (err) {
                addLog('resources', '❌ ' + err.message, 'error');
            }
        }
        
        function addLog(section, message, type = 'info') {
            const elem = document.getElementById(section);
            if (!elem) return;
            
            const entry = document.createElement('div');
            entry.className = 'log-entry log-' + type;
            entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
            elem.insertBefore(entry, elem.firstChild);
            
            while (elem.children.length > 200) {
                elem.removeChild(elem.lastChild);
            }
            
            diagnostics[section] = diagnostics[section] || [];
            diagnostics[section].push(message);
        }
        
        function switchTab(tabName) {
            document.querySelectorAll('.debug-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            
            document.getElementById(tabName).style.display = 'block';
            event.target.classList.add('active');
        }
        
        function updateStatus(text, status) {
            const span = document.getElementById('statusSpan');
            const indicator = status === 'success' ? 'status-success' : status === 'error' ? 'status-error' : 'status-loading';
            span.innerHTML = '<span class="status-indicator ' + indicator + '"></span> ' + text;
        }
        
        function clearLogs() {
            document.querySelectorAll('.debug-content').forEach(el => {
                el.innerHTML = '<div class="log-entry log-info">Cleared</div>';
            });
        }
        
        function downloadLogs() {
            const logs = {
                diagnostics,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pokemon-bot-diagnostics.json';
            a.click();
        }
        
        function reloadGame() {
            document.getElementById('gameIframe').src = 'about:blank';
            setTimeout(() => {
                document.getElementById('gameIframe').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
                addLog('console', '🔄 Game reloaded', 'info');
            }, 500);
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DIAGNOSTIC_PAGE);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
