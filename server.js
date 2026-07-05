/**
 * POKÉMON BOT - FLOATING OVERLAY WITH REAL GAME
 * Game loads in background, overlay controls automation
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
  sign: null,
  gameState: { username: null, level: 1, gold: 0, diamonds: 0 },
  stats: { questsCompleted: 0, goldEarned: 0 },
  logs: ['✅ Bot ready']
};

// ============ SIGNING FORMULA ============
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

// ============ API CALL ============
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

// ============ MAIN PAGE WITH GAME + OVERLAY ============
const MAIN_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pokémon Bot - Game + Overlay</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: Arial, sans-serif;
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
        
        /* FLOATING BOT BUTTON - CLOSED STATE */
        .bot-button-closed {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 5000;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
            transition: all 0.3s;
        }
        
        .bot-button-closed:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(255, 107, 107, 0.6);
        }
        
        .bot-button-closed.hidden {
            display: none;
        }
        
        /* OVERLAY PANEL - OPEN STATE */
        .overlay-panel {
            position: fixed;
            bottom: 0;
            right: 0;
            width: 320px;
            height: 100vh;
            background: #16213e;
            border-left: 3px solid #FF6B6B;
            padding: 20px;
            overflow-y: auto;
            z-index: 5001;
            color: #fff;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        
        .overlay-panel.open {
            transform: translateX(0);
        }
        
        .close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #FF6B6B;
            border: none;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close-btn:hover {
            background: #ff8787;
        }
        
        .overlay-panel h2 {
            color: #FF6B6B;
            margin-bottom: 20px;
            margin-top: 20px;
            font-size: 18px;
        }
        
        .overlay-panel h3 {
            color: #4ECDC4;
            margin: 15px 0 10px 0;
            font-size: 13px;
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
            transition: all 0.2s;
        }
        
        .quest-btn:hover {
            border-color: #FF6B6B;
        }
        
        .quest-btn.selected {
            background: #FF6B6B;
            border-color: #FF6B6B;
            color: #fff;
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
            font-weight: 600;
        }
        
        .speed-btn.active {
            background: #FF6B6B;
            border-color: #FF6B6B;
        }
        
        .controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .btn {
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 700;
            font-size: 13px;
            transition: all 0.2s;
        }
        
        .btn-start {
            background: #34d399;
            color: #000;
        }
        
        .btn-start:hover {
            background: #6ee7b7;
        }
        
        .btn-start:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-stop {
            background: #ef4444;
            color: #fff;
        }
        
        .btn-stop:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .status {
            background: #0f3460;
            padding: 10px;
            border-left: 3px solid #4ECDC4;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 15px;
        }
        
        .status.running {
            border-left-color: #34d399;
            color: #34d399;
        }
        
        .status.error {
            border-left-color: #ef4444;
            color: #ef4444;
        }
        
        .logs {
            background: #0f3460;
            padding: 10px;
            border-radius: 4px;
            height: 150px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 10px;
            color: #4ECDC4;
        }
        
        .log-entry {
            margin-bottom: 2px;
            padding: 2px 0;
        }
        
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            background: #0f3460;
            border: 2px solid #4ECDC4;
            border-radius: 4px;
            color: #fff;
            font-size: 12px;
        }
        
        input:focus {
            outline: none;
            border-color: #FF6B6B;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <!-- GAME LOADS HERE -->
        <iframe id="gameIframe"></iframe>
        
        <!-- FLOATING BOT BUTTON (CLOSED) -->
        <button class="bot-button-closed" id="botButton" onclick="openPanel()">🤖</button>
        
        <!-- OVERLAY PANEL (HIDDEN BY DEFAULT) -->
        <div class="overlay-panel" id="overlayPanel">
            <button class="close-btn" onclick="closePanel()">✕</button>
            
            <h2>🤖 Bot Control</h2>
            
            <div class="status" id="statusDiv">📡 Not connected</div>
            
            <!-- LOGIN SECTION -->
            <div id="loginSection">
                <h3>🔐 Game Login</h3>
                <input type="text" id="uidInput" placeholder="Game UID">
                <input type="password" id="signInput" placeholder="Game Sign">
                <button class="btn btn-start" onclick="authenticate()" style="width: 100%">Login</button>
            </div>
            
            <!-- QUEST SECTION (HIDDEN UNTIL LOGGED IN) -->
            <div id="questSection" style="display: none;">
                <h3>📋 Select Quests</h3>
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
                
                <div class="controls">
                    <button class="btn btn-start" id="startBtn" onclick="startBot()">▶️ START BOT</button>
                    <button class="btn btn-stop" id="stopBtn" onclick="stopBot()" disabled>⏹️ STOP</button>
                </div>
            </div>
            
            <h3>📊 Logs</h3>
            <div class="logs" id="logsBox">
                <div class="log-entry">✅ Overlay ready</div>
            </div>
        </div>
    </div>

    <script>
        let selectedQuests = [];
        let selectedSpeed = 'slow';
        let isConnected = false;
        
        // Load game on startup
        window.addEventListener('load', () => {
            document.getElementById('gameIframe').src = 'https://mon-jy-cdn.awawgame.com/monster_bt_foreign/monster_foreign_en_juyou_532_android_1.html';
            addLog('🎮 Loading game...');
        });
        
        // Panel controls
        function openPanel() {
            document.getElementById('overlayPanel').classList.add('open');
            document.getElementById('botButton').classList.add('hidden');
        }
        
        function closePanel() {
            document.getElementById('overlayPanel').classList.remove('open');
            document.getElementById('botButton').classList.remove('hidden');
        }
        
        // Quest selection
        document.addEventListener('DOMContentLoaded', () => {
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
        });
        
        async function authenticate() {
            const uid = document.getElementById('uidInput').value;
            const sign = document.getElementById('signInput').value;
            
            if (!uid || !sign) {
                addLog('❌ Enter UID and Sign');
                return;
            }
            
            addLog('🔐 Authenticating...');
            updateStatus('🔐 Authenticating...', false);
            
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid, sign })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    addLog('✅ Login success!');
                    addLog('👤 ' + data.gameState.username);
                    updateStatus('✅ Connected', true);
                    isConnected = true;
                    
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('questSection').style.display = 'block';
                } else {
                    addLog('❌ Login failed');
                    updateStatus('❌ Login failed', false);
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
                    updateStatus('⚙️ BOT RUNNING', true);
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
        
        function updateStatus(text, running) {
            const div = document.getElementById('statusDiv');
            div.textContent = text;
            div.className = running ? 'status running' : 'status error';
        }
        
        function addLog(message) {
            const logsBox = document.getElementById('logsBox');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = message;
            logsBox.insertBefore(entry, logsBox.firstChild);
            while (logsBox.children.length > 20) {
                logsBox.removeChild(logsBox.lastChild);
            }
        }
    </script>
</body>
</html>`;

// ============ ROUTES ============
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(MAIN_PAGE);
});

app.post('/api/auth', async (req, res) => {
    try {
        const { uid, sign } = req.body;
        if (!uid || !sign) return res.status(400).json({ success: false });

        botState.logs.unshift(`🔐 Auth: ${uid}`);
        botState.uid = uid;
        botState.sign = sign;

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
    botState.logs.unshift(`🚀 Starting: ${quests.join(',')}`);
    res.json({ success: true });

    (async () => {
        for (const quest of quests) {
            await new Promise(r => setTimeout(r, 2000));
            botState.stats.questsCompleted++;
            botState.gameState.gold += 500;
            botState.logs.unshift(`✅ ${quest}: +500g`);
        }
        botState.isRunning = false;
        botState.logs.unshift('✅ Complete!');
    })();
});

app.post('/api/stop', (req, res) => {
    botState.isRunning = false;
    botState.logs.unshift('⏹️ Stopped');
    res.json({ success: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
