/**
 * POKÉMON BOT - SHOW CONSOLE ERRORS
 * Captures what game is actually doing/erroring
 */

const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const CONSOLE_PAGE = `<!DOCTYPE html>
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
        }
        
        .console-btn {
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
        
        .console-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            z-index: 5001;
            display: none;
        }
        
        .console-overlay.show {
            display: flex;
            flex-direction: column;
        }
        
        .console-header {
            background: #1a1a2e;
            color: #00ff41;
            padding: 15px;
            border-bottom: 2px solid #00ff41;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }
        
        .console-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            font-family: monospace;
            font-size: 12px;
            color: #00ff41;
            line-height: 1.5;
        }
        
        .console-log { color: #00ffff; }
        .console-error { color: #ff4444; font-weight: bold; }
        .console-warn { color: #ffaa00; font-weight: bold; }
        .console-info { color: #44ff44; }
        
        .log-line {
            margin-bottom: 8px;
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border-left: 3px solid #00ff41;
            border-radius: 2px;
        }
        
        .log-line.error {
            border-left-color: #ff4444;
            background: rgba(255,68,68,0.1);
        }
        
        .log-line.warn {
            border-left-color: #ffaa00;
            background: rgba(255,170,0,0.1);
        }
        
        .log-time {
            color: #999;
            font-size: 10px;
        }
        
        .close-x {
            background: #ff4444;
            color: white;
            border: none;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
        }
    </style>
</head>
<body>
    <iframe id="gameFrame"></iframe>
    <button class="console-btn" onclick="showConsole()">🖥️</button>
    
    <div class="console-overlay" id="consoleOverlay">
        <div class="console-header">
            📺 GAME CONSOLE OUTPUT
            <button class="close-x" onclick="closeConsole()">✕</button>
        </div>
        <div class="console-content" id="consoleContent"></div>
    </div>

    <script>
        const consoleLogs = [];
        
        // Capture console methods
        const methods = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        console.log = function(...args) {
            methods.log(...args);
            addLog('log', args.join(' '));
        };
        
        console.error = function(...args) {
            methods.error(...args);
            addLog('error', args.join(' '));
        };
        
        console.warn = function(...args) {
            methods.warn(...args);
            addLog('warn', args.join(' '));
        };
        
        console.info = function(...args) {
            methods.info(...args);
            addLog('info', args.join(' '));
        };
        
        // Global error handler
        window.addEventListener('error', (e) => {
            addLog('error', '💥 RUNTIME ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            addLog('error', '🔴 UNHANDLED PROMISE: ' + (e.reason || 'Unknown error'));
        });
        
        function addLog(type, message) {
            const time = new Date().toLocaleTimeString();
            const timestamp = '[' + time + ']';
            const fullMessage = timestamp + ' ' + message;
            
            consoleLogs.push({ type, message: fullMessage });
            
            const content = document.getElementById('consoleContent');
            const line = document.createElement('div');
            line.className = 'log-line ' + type;
            line.innerHTML = '<span class="log-time">' + timestamp + '</span> <span class="console-' + type + '">' + escapeHtml(message) + '</span>';
            content.appendChild(line);
            content.scrollTop = content.scrollHeight;
            
            if (consoleLogs.length > 300) {
                consoleLogs.shift();
                content.removeChild(content.firstChild);
            }
        }
        
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
        
        function showConsole() {
            document.getElementById('consoleOverlay').classList.add('show');
        }
        
        function closeConsole() {
            document.getElementById('consoleOverlay').classList.remove('show');
        }
        
        // Load game
        window.addEventListener('load', () => {
            addLog('info', '🎮 Loading game from CDN...');
            document.getElementById('gameFrame').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
        });
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(CONSOLE_PAGE);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
