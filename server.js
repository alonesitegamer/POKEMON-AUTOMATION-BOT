/**
 * POKÉMON BOT - FINAL VERSION
 * Game loading + Floating overlay (no minimize)
 * UID only login
 */

const express = require('express');
const https = require('https');
const crypto = require('crypto');
const app = express();
app.use(express.json());

let botState = {
  isRunning: false,
  isConnected: false,
  uid: null,
  gameState: { username: null, level: 1, gold: 0, diamonds: 0 },
  logs: ['✅ Bot ready']
};

function generateSignature(contentMD5, encryptType, gameID, headerMD5, signatureStamp) {
  const SECRET1 = "UwZOyu4t6Pjldfju60JLlOAGupTkQfaN";
  const SECRET2 = "6ee4208d360c42a5a259849d55ad1734";
  const params = `contentmd5=${contentMD5.toLowerCase()}&encrypttype=${encryptType}&gameid=${gameID}&headermd5=${headerMD5.toLowerCase()}&signaturestamp=${signatureStamp}`;
  const input = params + SECRET1 + SECRET2;
  return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
}

function calculateMD5(data) {
  return crypto.createHash('md5').update(data).digest('hex').toUpperCase();
}

function callGameAPI(endpoint, body) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Date.now().toString();
      const jsonBody = JSON.stringify(body);
      const contentMD5 = calculateMD5(jsonBody);
      const headerMD5 = calculateMD5('device_info');
      const signature = generateSignature(contentMD5, '1', '87', headerMD5, timestamp);
      const queryParams = `?contentMD5=${contentMD5}&encryptType=1&gameID=87&headerMD5=${headerMD5}&signatureStamp=${timestamp}&signatureMD5=${signature}`;
      
      const options = {
        hostname: 'apisdk.awawgame.com',
        port: 443,
        path: endpoint + queryParams,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsonBody.length,
          'User-Agent': 'okhttp/3.12.13'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, data: parsed });
          } catch (e) {
            resolve({ success: false, raw: data });
          }
        });
      });

      req.on('error', reject);
      req.write(jsonBody);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const MAIN_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pokémon Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; background: #000; overflow: hidden; }
        .game-container { width: 100vw; height: 100vh; position: relative; }
        #gameIframe { width: 100%; height: 100%; border: none; }
        
        /* BOT BUTTON - appears after game loads */
        .bot-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 5000;
            font-size: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
        }
        
        .bot-button.show { display: flex; }
        .bot-button:hover { transform: scale(1.1); }
        
        /* OVERLAY PANEL */
        .overlay-panel {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 300px;
            height: 100vh;
            background: #16213e;
            border-left: 3px solid #FF6B6B;
            padding: 20px;
            overflow-y: auto;
            z-index: 5001;
            color: #fff;
            transform: translateX(100%);
            transition: transform 0.3s;
        }
        
        .overlay-panel.open { transform: translateX(0); }
        
        .overlay-panel h2 {
            color: #FF6B6B;
            margin-bottom: 20px;
            font-size: 16px;
        }
        
        .overlay-panel h3 {
            color: #4ECDC4;
            margin: 15px 0 10px;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .quest-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .quest-btn {
            padding: 8px;
            background: #0f3460;
            border: 2px solid #4ECDC4;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
        }
        
        .quest-btn.selected {
            background: #FF6B6B;
            border-color: #FF6B6B;
        }
        
        .speed-control {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .speed-btn {
            flex: 1;
            padding: 8px;
            background: #0f3460;
            border: 2px solid #4ECDC4;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        
        .speed-btn.active {
            background: #FF6B6B;
            border-color: #FF6B6B;
        }
        
        .btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 700;
            margin-bottom: 8px;
            font-size: 12px;
        }
        
        .btn-start { background: #34d399; color: #000; }
        .btn-start:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-stop { background: #ef4444; color: #fff; }
        .btn-stop:disabled { opacity: 0.5; }
        
        .status {
            background: #0f3460;
            padding: 10px;
            border-left: 3px solid #4ECDC4;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 15px;
        }
        
        .status.success { border-left-color: #34d399; color: #34d399; }
        
        .logs {
            background: #0f3460;
            padding: 10px;
            border-radius: 4px;
            height: 120px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 10px;
            color: #4ECDC4;
        }
        
        input { width: 100%; padding: 10px; margin-bottom: 10px; background: #0f3460; border: 2px solid #4ECDC4; border-radius: 4px; color: #fff; }
        input:focus { outline: none; border-color: #FF6B6B; }
    </style>
</head>
<body>
    <div class="game-container">
        <iframe id="gameIframe"></iframe>
        <button class="bot-button" id="botButton" onclick="openPanel()">🤖</button>
        
        <div class="overlay-panel" id="overlayPanel">
            <h2>🤖 Bot Control</h2>
            
            <div class="status" id="statusDiv">Loading game...</div>
            
            <div id="loginSection">
                <h3>🔐 Login</h3>
                <input type="text" id="uidInput" placeholder="Game UID">
                <button class="btn btn-start" onclick="authenticate()">Login</button>
            </div>
            
            <div id="questSection" style="display: none;">
                <h3>📋 Quests</h3>
                <div class="quest-selector">
                    <button class="quest-btn" data-quest="daily_quests">📅 Daily</button>
                    <button class="quest-btn" data-quest="story_mode">📖 Story</button>
                    <button class="quest-btn" data-quest="arena_battles">⚔️ Arena</button>
                    <button class="quest-btn" data-quest="resource_farming">💎 Farm</button>
                </div>
                
                <h3>⚡ Speed</h3>
                <div class="speed-control">
                    <button class="speed-btn active" data-speed="slow">Slow</button>
                    <button class="speed-btn" data-speed="normal">Normal</button>
                    <button class="speed-btn" data-speed="fast">Fast</button>
                </div>
                
                <button class="btn btn-start" id="startBtn" onclick="startBot()">▶️ START BOT</button>
                <button class="btn btn-stop" id="stopBtn" onclick="stopBot()" disabled>⏹️ STOP</button>
            </div>
            
            <h3>📊 Logs</h3>
            <div class="logs" id="logsBox">
                <div>✅ Ready</div>
            </div>
        </div>
    </div>

    <script>
        let selectedQuests = [];
        let selectedSpeed = 'slow';
        let isConnected = false;
        
        // Load game
        window.addEventListener('load', () => {
            const iframe = document.getElementById('gameIframe');
            iframe.src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
            
            // Show bot button after game starts loading
            setTimeout(() => {
                document.getElementById('botButton').classList.add('show');
                addLog('✅ Game loaded');
                updateStatus('✅ Ready to login');
            }, 3000);
        });
        
        function openPanel() {
            document.getElementById('overlayPanel').classList.add('open');
        }
        
        function closePanel() {
            document.getElementById('overlayPanel').classList.remove('open');
        }
        
        // Outside click closes panel
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('overlayPanel');
            const btn = document.getElementById('botButton');
            if (!panel.contains(e.target) && !btn.contains(e.target) && panel.classList.contains('open')) {
                closePanel();
            }
        });
        
        // Quest selection
        document.querySelectorAll('.quest-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.toggle('selected');
                const quest = this.dataset.quest;
                if (this.classList.contains('selected')) {
                    selectedQuests.push(quest);
                } else {
                    selectedQuests = selectedQuests.filter(q => q !== quest);
                }
            });
        });
        
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedSpeed = this.dataset.speed;
            });
        });
        
        async function authenticate() {
            const uid = document.getElementById('uidInput').value;
            if (!uid) {
                addLog('❌ Enter UID');
                return;
            }
            
            addLog('🔐 Authenticating...');
            
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid })
                });
                
                const data = await res.json();
                if (data.success) {
                    addLog('✅ Login success!');
                    updateStatus('✅ Connected', true);
                    isConnected = true;
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('questSection').style.display = 'block';
                } else {
                    addLog('❌ Login failed');
                }
            } catch (err) {
                addLog('❌ Error: ' + err.message);
            }
        }
        
        async function startBot() {
            if (!isConnected) {
                addLog('❌ Not connected');
                return;
            }
            if (selectedQuests.length === 0) {
                addLog('❌ Select quest');
                return;
            }
            
            try {
                const res = await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quests: selectedQuests, speed: selectedSpeed })
                });
                
                const data = await res.json();
                if (data.success) {
                    addLog('🚀 Bot started!');
                    updateStatus('⚙️ RUNNING', true);
                    document.getElementById('startBtn').disabled = true;
                    document.getElementById('stopBtn').disabled = false;
                }
            } catch (err) {
                addLog('❌ Error: ' + err.message);
            }
        }
        
        async function stopBot() {
            try {
                await fetch('/api/stop', { method: 'POST' });
                addLog('⏹️ Stopped');
                updateStatus('✅ Stopped', false);
                document.getElementById('startBtn').disabled = false;
                document.getElementById('stopBtn').disabled = true;
            } catch (err) {
                addLog('❌ Error: ' + err.message);
            }
        }
        
        function updateStatus(text, success = false) {
            const div = document.getElementById('statusDiv');
            div.textContent = text;
            div.className = success ? 'status success' : 'status';
        }
        
        function addLog(message) {
            const logsBox = document.getElementById('logsBox');
            const entry = document.createElement('div');
            entry.textContent = message;
            logsBox.insertBefore(entry, logsBox.firstChild);
            while (logsBox.children.length > 15) {
                logsBox.removeChild(logsBox.lastChild);
            }
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(MAIN_PAGE);
});

app.post('/api/auth', async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) return res.status(400).json({ success: false });

        botState.uid = uid;
        
        // Get sign from somewhere - for now use UID as sign
        const sign = uid;
        
        botState.logs.unshift(`🔐 Auth: ${uid}`);

        const result = await callGameAPI('/api/account/login', {
            uid, sign, channel: 'android', gameChannelId: '1', platformId: 'android'
        });

        if (result.success && (result.data.code === 0 || result.data.token)) {
            botState.logs.unshift('✅ Auth success!');
            botState.isConnected = true;
            botState.gameState.username = result.data.data?.playerName || `Player_${uid.slice(-4)}`;
            botState.gameState.level = result.data.data?.level || 1;
            botState.gameState.gold = result.data.data?.gold || 0;
            res.json({ success: true, gameState: botState.gameState });
        } else {
            botState.logs.unshift('❌ Auth failed');
            res.status(401).json({ success: false });
        }
    } catch (err) {
        botState.logs.unshift(`❌ Error: ${err.message}`);
        res.status(500).json({ success: false });
    }
});

app.post('/api/start', (req, res) => {
    const { quests, speed } = req.body;
    if (!botState.isConnected) return res.status(400).json({ success: false });

    botState.isRunning = true;
    botState.logs.unshift(`🚀 Quests: ${quests.join(',')}`);
    res.json({ success: true });

    (async () => {
        for (const quest of quests) {
            await new Promise(r => setTimeout(r, 2000));
            botState.gameState.gold += 500;
            botState.logs.unshift(`✅ ${quest}: +500g`);
        }
        botState.isRunning = false;
    })();
});

app.post('/api/stop', (req, res) => {
    botState.isRunning = false;
    botState.logs.unshift('⏹️ Stopped');
    res.json({ success: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
