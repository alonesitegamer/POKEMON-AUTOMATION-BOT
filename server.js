
/**

POKÉMON BOT - FULL REQUEST INTERCEPTOR

Logs ALL network requests + Modifies as needed

Shows real-time what's happening
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
    <title>🎮 Pokémon Game - Full Interceptor</title>  
    <style>  
        * { margin: 0; padding: 0; box-sizing: border-box; }  body {  
        font-family: 'Courier New', monospace;  
        background: #000;  
        color: #00ff41;  
        display: flex;  
        height: 100vh;  
    }  
      
    #gameFrame {  
        flex: 1;  
        border: none;  
        background: #000;  
    }  
      
    .console-panel {  
        width: 350px;  
        background: #0a0e27;  
        border-left: 2px solid #00ff41;  
        display: flex;  
        flex-direction: column;  
        overflow: hidden;  
    }  
      
    .console-header {  
        padding: 8px;  
        background: #1a1f3a;  
        border-bottom: 2px solid #00ff41;  
        font-weight: bold;  
        font-size: 11px;  
    }  
      
    .console-logs {  
        flex: 1;  
        overflow-y: auto;  
        padding: 8px;  
        font-size: 9px;  
        line-height: 1.3;  
    }  
      
    .log-entry {  
        margin-bottom: 3px;  
        padding: 2px;  
        border-left: 2px solid #00ff41;  
        padding-left: 6px;  
    }  
      
    .log-fetch { color: #00ffff; border-left-color: #00ffff; }  
    .log-response-ok { color: #44ff44; border-left-color: #44ff44; }  
    .log-response-err { color: #ff4444; border-left-color: #ff4444; }  
    .log-error { color: #ffaa00; border-left-color: #ffaa00; }  
    .log-info { color: #4ECDC4; border-left-color: #4ECDC4; }  
      
    .console-controls {  
        padding: 6px;  
        background: #1a1f3a;  
        border-top: 1px solid #00ff41;  
        display: flex;  
        gap: 4px;  
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
      
    ::-webkit-scrollbar {  
        width: 4px;  
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
    <iframe id="gameFrame"></iframe>  <div class="console-panel">  
    <div class="console-header">📡 Network Monitor</div>  
    <div class="console-logs" id="consoleLogs">  
        <div class="log-entry log-info">🔍 Monitoring requests...</div>  
    </div>  
    <div class="console-controls">  
        <button class="btn" onclick="clearLogs()">Clear</button>  
        <button class="btn" onclick="exportLogs()">Export</button>  
    </div>  
</div>  

<script>  
    const logs = [];  
    const requests = new Map();  
      
    // Intercept FETCH  
    const origFetch = window.fetch;  
    window.fetch = function(...args) {  
        const url = args[0];  
        const method = (args[1]?.method || 'GET').toUpperCase();  
        const requestId = Math.random().toString(36).substr(2, 9);  
        const start = Date.now();  
          
        // Log request  
        const shortUrl = typeof url === 'string' ? url.substring(url.lastIndexOf('/')) : url;  
        addLog('fetch', \`📤 [\${method}] \${shortUrl}\`);  
          
        requests.set(requestId, {  
            url: url,  
            method: method,  
            start: start  
        });  
          
        return origFetch.apply(this, args)  
            .then(res => {  
                const time = Date.now() - start;  
                const status = res.status;  
                const className = status >= 200 && status < 300 ? 'response-ok' : 'response-err';  
                  
                addLog(className, \`📥 [\${status}] \${time}ms \${shortUrl}\`);  
                  
                // Log response details  
                if (status >= 400) {  
                    addLog('error', \`⚠️ FAILED: \${status} \${url}\`);  
                }  
                  
                return res;  
            })  
            .catch(err => {  
                addLog('error', \`❌ FETCH ERROR: \${err.message}\`);  
                throw err;  
            });  
    };  
      
    // Global error handler  
    window.addEventListener('error', (e) => {  
        addLog('error', \`💥 RUNTIME ERROR: \${e.message}\`);  
    });  
      
    window.addEventListener('unhandledrejection', (e) => {  
        addLog('error', \`🔴 PROMISE ERROR: \${e.reason}\`);  
    });  
      
    // XHR interception  
    const origOpen = XMLHttpRequest.prototype.open;  
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {  
        addLog('fetch', \`📤 [XHR \${method}] \${url.substring(url.lastIndexOf('/'))}\`);  
        return origOpen.apply(this, [method, url, ...rest]);  
    };  
      
    const origSend = XMLHttpRequest.prototype.send;  
    XMLHttpRequest.prototype.send = function(...args) {  
        this.addEventListener('load', function() {  
            addLog('response-ok', \`📥 [XHR \${this.status}] \${this.responseURL}\`);  
        });  
        this.addEventListener('error', function() {  
            addLog('error', \`❌ [XHR] Error loading \${this.responseURL}\`);  
        });  
        return origSend.apply(this, args);  
    };  
      
    // Add log entry  
    function addLog(type, message) {  
        const elem = document.getElementById('consoleLogs');  
        const entry = document.createElement('div');  
        entry.className = 'log-entry log-' + type;  
        entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;  
        elem.insertBefore(entry, elem.firstChild);  
          
        logs.push({  
            time: new Date().toISOString(),  
            type: type,  
            message: message  
        });  
          
        while (elem.children.length > 300) {  
            elem.removeChild(elem.lastChild);  
        }  
    }  
      
    // Clear logs  
    function clearLogs() {  
        document.getElementById('consoleLogs').innerHTML = '';  
        logs.length = 0;  
    }  
      
    // Export logs  
    function exportLogs() {  
        const data = {  
            logs: logs,  
            timestamp: new Date().toISOString()  
        };  
          
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });  
        const a = document.createElement('a');  
        a.href = URL.createObjectURL(blob);  
        a.download = 'game-requests-' + Date.now() + '.json';  
        a.click();  
    }  
      
    // Load game  
    window.addEventListener('load', () => {  
        addLog('info', '🎮 Loading game...');  
        document.getElementById('gameFrame').src = '/game-html-with-config';  
    });  
</script>

</body>  
</html>`;  // ============ MAIN PAGE ============
app.get('/', (req, res) => {
res.setHeader('Content-Type', 'text/html; charset=utf-8');
res.send(GAME_PAGE);
});

// ============ SERVE GAME HTML WITH CONFIG INJECTED ============
app.get('/game-html-with-config', (req, res) => {
const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';

https.get(gameUrl, (proxyRes) => {  
    let html = '';  
      
    proxyRes.on('data', (chunk) => {  
        html += chunk.toString();  
    });  
      
    proxyRes.on('end', () => {  
        // Inject full interceptor with config  
        const injectedCode = `  
        <script>  
        // ============ CONFIG INJECTION ============  
        window.CONFIG_INJECTED = true;  
        window.INJECTED_CONFIG = {  
            appId: '87',  
            appKey: '6ee4208d360c42a5a259849d55ad1734',  
            runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',  
            secret1: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',  
            secret2: '6ee4208d360c42a5a259849d55ad1734',  
            deviceId: 'browser-device-' + Math.random().toString(36).substr(2, 9),  
            timestamp: ${Date.now()},  
            apiServer: 'apisdk.awawgame.com',  
            gameServer: 'mon-jy-1.awawgame.com',  
            cdnServer: 'mon-jy-cdn.awawgame.com'  
        };  
          
        // ============ FETCH INTERCEPTOR ============  
        const origFetch = window.fetch;  
        window.fetch = function(...args) {  
            const url = args[0];  
              
            // Intercept config.json  
            if (typeof url === 'string' && url.includes('config')) {  
                console.log('[INTERCEPTOR] config.json request - returning injected config');  
                return Promise.resolve({  
                    ok: true,  
                    status: 200,  
                    headers: new Headers({'content-type': 'application/json'}),  
                    json: async () => window.INJECTED_CONFIG,  
                    text: async () => JSON.stringify(window.INJECTED_CONFIG),  
                    clone: function() { return this; }  
                });  
            }  
              
            // Log all other requests  
            console.log('[FETCH] ' + (typeof url === 'string' ? url.substring(0, 80) : url));  
              
            return origFetch.apply(this, args)  
                .then(res => {  
                    console.log('[RESPONSE] ' + res.status + ' from ' + url);  
                    return res;  
                })  
                .catch(err => {  
                    console.error('[FETCH ERROR] ' + err.message + ' from ' + url);  
                    throw err;  
                });  
        };  
        </script>  
        `;  
          
        // Insert before closing head  
        html = html.replace('</head>', injectedCode + '</head>');  
          
        res.setHeader('Content-Type', 'text/html; charset=utf-8');  
        res.setHeader('Access-Control-Allow-Origin', '*');  
        res.send(html);  
    });  
}).on('error', (err) => {  
    res.status(500).send('Error: ' + err.message);  
});

});

app.get('/health', (req, res) => {
res.json({
status: 'ok',
configInjector: 'active',
requestLogger: 'active'
});
});

module.exports = app;
EOFSERVER

echo "✅ Full interceptor created!"
