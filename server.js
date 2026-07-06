/**
 * POKÉMON BOT - CONFIG INTERCEPTOR
 * Intercepts config.json and injects runtime secret
 * Allows game to load in browser via Vercel proxy
 */

const express = require('express');
const https = require('https');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// ============ RUNTIME SECRETS ============
const RUNTIME_SECRETS = {
  appId: '87',
  appKey: '6ee4208d360c42a5a259849d55ad1734',
  secret1: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',
  secret2: '6ee4208d360c42a5a259849d55ad1734',
  deviceId: 'vercel-bot-device-001',
  timestamp: Date.now()
};

const GAME_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Pokémon Game Loader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; font-family: Arial; }
        .status { 
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0,255,65,0.9);
            color: #000;
            padding: 10px 15px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 10000;
            font-size: 12px;
        }
        #gameFrame { width: 100vw; height: 100vh; border: none; }
    </style>
</head>
<body>
    <div class="status">
        ✅ Game loading with config interceptor...
    </div>
    <iframe id="gameFrame"></iframe>

    <script>
        // Intercept all fetch requests
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            
            // Intercept config.json
            if (url.includes('config.json') || url.includes('config')) {
                console.log('🔍 Intercepted config request:', url);
                
                // Return modified config
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: async () => ({
                        appId: '87',
                        appKey: '6ee4208d360c42a5a259849d55ad1734',
                        runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',
                        deviceId: 'browser-device-' + Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                        apiServer: 'apisdk.awawgame.com',
                        gameServer: 'mon-jy-1.awawgame.com',
                        cdnServer: 'mon-jy-cdn.awawgame.com',
                        version: '1.0.3',
                        authenticated: true
                    }),
                    text: async () => JSON.stringify({
                        appId: '87',
                        appKey: '6ee4208d360c42a5a259849d55ad1734',
                        runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN'
                    })
                });
            }
            
            // Log other requests
            console.log('📤 [FETCH]', url.substring(0, 80));
            
            return origFetch.apply(this, args)
                .then(res => {
                    console.log('📥 [' + res.status + ']', url.substring(0, 60));
                    return res;
                })
                .catch(err => {
                    console.error('❌ FETCH ERROR:', err.message);
                    throw err;
                });
        };
        
        // Load game
        document.getElementById('gameFrame').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    </script>
</body>
</html>`;

// ============ ROUTES ============

// Main game loader with config interceptor
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(GAME_PAGE);
});

// Alternative: Serve modified game HTML with injected config
app.get('/game-with-config', (req, res) => {
    const gameUrl = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
    
    https.get(gameUrl, (proxyRes) => {
        let html = '';
        
        proxyRes.on('data', (chunk) => {
            html += chunk.toString();
        });
        
        proxyRes.on('end', () => {
            // Inject config interceptor into game HTML
            const injectedCode = `
            <script>
            window.CONFIG_INJECTED = true;
            window.RUNTIME_CONFIG = {
                appId: '87',
                appKey: '6ee4208d360c42a5a259849d55ad1734',
                runtimeSecret: 'UwZOyu4t6Pjldfju60JLlOAGupTkQfaN',
                deviceId: 'browser-' + Math.random().toString(36).substr(2, 9),
                timestamp: ${Date.now()},
                apiServer: 'apisdk.awawgame.com',
                gameServer: 'mon-jy-1.awawgame.com'
            };
            
            // Intercept fetch before game loads
            const origFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                
                if (typeof url === 'string' && url.includes('config')) {
                    console.log('[INTERCEPTOR] Config request intercepted');
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        headers: new Headers({'content-type': 'application/json'}),
                        json: async () => window.RUNTIME_CONFIG,
                        text: async () => JSON.stringify(window.RUNTIME_CONFIG)
                    });
                }
                
                return origFetch.apply(this, args);
            };
            </script>
            `;
            
            // Insert before closing head or body
            html = html.replace('</head>', injectedCode + '</head>');
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(html);
        });
    }).on('error', (err) => {
        res.status(500).send('Error: ' + err.message);
    });
});

// API: Get runtime config
app.get('/api/config', (req, res) => {
    res.json(RUNTIME_SECRETS);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        runtimeSecrets: !!RUNTIME_SECRETS,
        configInjectorActive: true
    });
});

module.exports = app;
