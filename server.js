/**
 * POKÉMON BOT - SERVICE WORKER PROXY
 * Uses Service Worker to intercept ALL game network requests
 * Can see what the game is trying to load and why it fails
 */

const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
app.use(express.json());

// Service worker code that will intercept all requests
const SERVICE_WORKER = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    const start = Date.now();
    
    fetch(event.request)
        .then(response => {
            const time = Date.now() - start;
            const logMsg = {
                time: new Date().toISOString(),
                url: url,
                status: response.status,
                duration: time,
                method: event.request.method
            };
            
            // Send log to client
            clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'NETWORK_LOG',
                        data: logMsg
                    });
                });
            });
            
            return response;
        })
        .catch(err => {
            const logMsg = {
                time: new Date().toISOString(),
                url: url,
                error: err.message,
                method: event.request.method
            };
            
            clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'NETWORK_ERROR',
                        data: logMsg
                    });
                });
            });
            
            throw err;
        });
    
    event.respondWith(
        fetch(event.request).catch(err => new Response('Network error: ' + err.message))
    );
});
`;

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
        }
        
        .diagnostic-button:hover {
            transform: scale(1.1);
        }
        
        .diagnostic-button.active {
            background: linear-gradient(135deg, #ff4444, #ffaa00);
            border-color: #ff4444;
        }
        
        .overlay-diagnostic {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 85%;
            max-width: 700px;
            height: 75%;
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
        }
        
        .diagnostic-tab.active {
            background: rgba(0, 255, 65, 0.2);
            color: #00ff41;
        }
        
        .diagnostic-content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            font-size: 9px;
            line-height: 1.4;
            display: none;
        }
        
        .diagnostic-content.show {
            display: block;
        }
        
        .log-entry {
            margin-bottom: 3px;
            padding: 3px;
            border-left: 2px solid #00ff41;
            padding-left: 6px;
            font-family: monospace;
        }
        
        .log-error { color: #ff4444; border-left-color: #ff4444; }
        .log-warn { color: #ffaa00; border-left-color: #ffaa00; }
        .log-success { color: #44ff44; border-left-color: #44ff44; }
        .log-info { color: #00ffff; border-left-color: #00ffff; }
        
        .diagnostic-controls {
            padding: 8px;
            background: rgba(26, 31, 58, 0.8);
            border-top: 1px solid #00ff41;
            display: flex;
            gap: 6px;
        }
        
        .btn-diag {
            flex: 1;
            padding: 6px;
            background: #00ff41;
            color: #0a0e27;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 9px;
            font-weight: bold;
        }
        
        .btn-diag:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <iframe id="gameIframe" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
        <button class="diagnostic-button" id="diagButton" onclick="toggleDiagnostic()">🔍</button>
        
        <div class="overlay-diagnostic" id="diagPanel">
            <div class="diagnostic-header">
                🔍 NETWORK DIAGNOSTICS
                <button class="close-button" onclick="closeDiagnostic()">✕</button>
            </div>
            
            <div class="diagnostic-tabs">
                <button class="diagnostic-tab active" onclick="switchDiagTab('network')">Network Requests</button>
                <button class="diagnostic-tab" onclick="switchDiagTab('errors')">Errors</button>
                <button class="diagnostic-tab" onclick="switchDiagTab('status')">Status</button>
            </div>
            
            <div class="diagnostic-content show" id="network">
                <div class="log-entry log-info">🔌 Waiting for network activity...</div>
            </div>
            
            <div class="diagnostic-content" id="errors">
                <div class="log-entry log-info">✅ No errors yet</div>
            </div>
            
            <div class="diagnostic-content" id="status">
                <div class="log-entry log-info">📊 Game Status</div>
                <div class="log-entry log-info" id="statusText">Loading...</div>
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
            network: [],
            errors: [],
            status: []
        };
        
        let diagOpen = false;
        let requestCount = 0;
        let errorCount = 0;
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(() => {
                addDiagLog('network', '✅ Service Worker registered', 'success');
            }).catch(err => {
                addDiagLog('errors', '❌ SW registration failed: ' + err.message, 'error');
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'NETWORK_LOG') {
                    const log = event.data.data;
                    const url = log.url.substring(log.url.lastIndexOf('/'));
                    addDiagLog('network', '✅ [' + log.status + '] ' + log.duration + 'ms ' + url, 'success');
                    requestCount++;
                    updateStatus();
                } else if (event.data.type === 'NETWORK_ERROR') {
                    const log = event.data.data;
                    const url = log.url.substring(log.url.lastIndexOf('/'));
                    addDiagLog('errors', '❌ ' + log.error + ' ' + url, 'error');
                    addDiagLog('network', '❌ FAILED: ' + url, 'error');
                    errorCount++;
                    updateStatus();
                }
            });
        }
        
        // Global error handler
        window.addEventListener('error', (e) => {
            addDiagLog('errors', '💥 ' + e.message, 'error');
            errorCount++;
            updateStatus();
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            addDiagLog('errors', '🔴 Promise: ' + e.reason, 'error');
            errorCount++;
            updateStatus();
        });
        
        // Load game
        window.addEventListener('load', () => {
            addDiagLog('network', '🎮 Loading game...', 'info');
            document.getElementById('gameIframe').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
            updateStatus();
        });
        
        function updateStatus() {
            const statusText = document.getElementById('statusText');
            statusText.textContent = '📊 Requests: ' + requestCount + ' | Errors: ' + errorCount;
        }
        
        function toggleDiagnostic() {
            diagOpen ? closeDiagnostic() : openDiagnostic();
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
            
            while (elem.children.length > 200) {
                elem.removeChild(elem.lastChild);
            }
        }
        
        function clearDiagLogs() {
            document.querySelectorAll('.diagnostic-content').forEach(el => {
                const firstChild = el.firstChild;
                el.innerHTML = '';
                if (el.id === 'status') {
                    el.innerHTML = '<div class="log-entry log-info">📊 Game Status</div><div class="log-entry log-info" id="statusText">Cleared</div>';
                } else {
                    el.appendChild(document.createElement('div')).className = 'log-entry log-info';
                }
            });
            requestCount = 0;
            errorCount = 0;
        }
        
        function downloadDiagLogs() {
            const data = {
                diagnostics: diagLogs,
                summary: {
                    totalRequests: requestCount,
                    totalErrors: errorCount
                },
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
            clearDiagLogs();
            setTimeout(() => {
                document.getElementById('gameIframe').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
                addDiagLog('network', '🔄 Game reloaded', 'success');
            }, 500);
        }
    </script>
</body>
</html>`;

// ============ MAIN PAGE ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(OVERLAY_DIAGNOSTIC);
});

// ============ SERVICE WORKER ============
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.send(SERVICE_WORKER);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
