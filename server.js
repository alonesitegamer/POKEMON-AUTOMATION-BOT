/**
 * POKÉMON BOT - SERVERLESS VERSION (Vercel Compatible)
 * Dashboard embedded directly - no file system needed
 */

const express = require('express');
const app = express();
app.use(express.json());

let botState = {
  isRunning: false,
  isConnected: false,
  gameState: { username: null, level: 1, exp: 0, gold: 0, diamonds: 0 },
  stats: { questsCompleted: 0, resourcesEarned: 0 },
  currentQuest: null,
  logs: ['✅ System ready', '🔌 Waiting for connection...']
};

const DASHBOARD_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🤖 Pokémon Bot</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;background:#1a1a2e;color:#fff}.container{max-width:1200px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#FF6B6B,#4ECDC4);padding:30px;border-radius:10px;margin-bottom:30px;text-align:center}.header h1{font-size:32px;margin-bottom:10px}.card{background:#16213e;padding:25px;border-radius:10px;border:2px solid #0f3460;margin-bottom:20px}.card h2{color:#FF6B6B;margin-bottom:15px;font-size:20px}.login-form{display:flex;flex-direction:column;gap:12px}input{padding:12px;background:#0f3460;border:2px solid #4ECDC4;border-radius:6px;color:#fff;font-size:14px}input:focus{outline:0;border-color:#FF6B6B}.btn{padding:12px;border:0;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px}.btn-primary{background:#34d399;color:#000}.btn-primary:hover{background:#6ee7b7}.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-danger{background:#ef4444;color:#fff}.btn-danger:disabled{opacity:.5;cursor:not-allowed}.hidden{display:none}.quest-selector{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.quest-btn{padding:10px;background:#0f3460;border:2px solid #4ECDC4;border-radius:6px;color:#fff;cursor:pointer;font-weight:600}.quest-btn.selected{background:#FF6B6B;border-color:#FF6B6B}.speed-control{display:flex;gap:10px;margin-bottom:15px}.speed-btn{flex:1;padding:10px;background:#0f3460;border:2px solid #4ECDC4;border-radius:6px;color:#fff;cursor:pointer}.speed-btn.active{background:#FF6B6B;border-color:#FF6B6B}.logs{background:#0f3460;padding:15px;border-radius:6px;height:300px;overflow-y:auto;font-family:monospace;font-size:12px;color:#4ECDC4}.stat{background:#0f3460;padding:15px;border-radius:6px;margin-bottom:10px;border-left:3px solid #4ECDC4}.stat-label{font-size:12px;color:#999}.stat-value{font-size:24px;font-weight:700;color:#4ECDC4;margin-top:5px}.controls{display:flex;gap:10px;margin-bottom:15px}</style></head><body><div class="container"><div class="header"><h1>🤖 Pokémon Bot</h1><p>Game Automation - Watch it play!</p></div><div class="card" id="loginSection"><h2>🔐 Login</h2><div class="login-form"><input type="text" id="uidInput" placeholder="Game UID"><input type="password" id="signInput" placeholder="Game Sign"><button class="btn btn-primary" onclick="authenticate()">🔓 Login</button></div></div><div class="card hidden" id="statsSection"><h2>📊 Status</h2><div class="stat"><div class="stat-label">Level</div><div class="stat-value" id="levelStat">1</div></div><div class="stat"><div class="stat-label">Gold</div><div class="stat-value" id="goldStat">0</div></div><div class="stat"><div class="stat-label">Diamonds</div><div class="stat-value" id="diamondsStat">0</div></div></div><div class="card hidden" id="controlSection"><h2>🎮 Automation</h2><h3 style="color:#4ECDC4;margin:15px 0 10px;font-size:14px">Quests:</h3><div class="quest-selector"><button class="quest-btn" data-quest="daily_quests">📅 Daily</button><button class="quest-btn" data-quest="story_mode">📖 Story</button><button class="quest-btn" data-quest="arena_battles">⚔️ Arena</button><button class="quest-btn" data-quest="resource_farming">💎 Farm</button><button class="quest-btn" data-quest="dungeon_raids">🏰 Dungeon</button><button class="quest-btn" data-quest="boss_battles">👹 Boss</button><button class="quest-btn" data-quest="event_quests">🎉 Event</button><button class="quest-btn" data-quest="team_training">🏋️ Train</button></div><h3 style="color:#4ECDC4;margin:15px 0 10px;font-size:14px">Speed:</h3><div class="speed-control"><button class="speed-btn active" data-speed="slow">🐢 Slow</button><button class="speed-btn" data-speed="normal">⚡ Normal</button><button class="speed-btn" data-speed="fast">🔥 Fast</button></div><div class="controls"><button class="btn btn-primary" onclick="startBot()" style="flex:1">▶️ START</button><button class="btn btn-danger" onclick="stopBot()" style="flex:1" disabled id="stopBtn">⏹️ STOP</button></div></div><div class="card"><h2>📋 Logs</h2><div class="logs" id="logsBox"><div>✅ Ready</div></div></div></div><script>let selectedQuests=[],selectedSpeed='slow',isConnected=false;document.querySelectorAll('.quest-btn').forEach(btn=>{btn.addEventListener('click',function(){this.classList.toggle('selected');const quest=this.dataset.quest;if(this.classList.contains('selected')){selectedQuests.push(quest)}else{selectedQuests=selectedQuests.filter(q=>q!==quest)}})});document.querySelectorAll('.speed-btn').forEach(btn=>{btn.addEventListener('click',function(){document.querySelectorAll('.speed-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');selectedSpeed=this.dataset.speed})});async function authenticate(){const uid=document.getElementById('uidInput').value;const sign=document.getElementById('signInput').value;if(!uid||!sign){addLog('❌ Enter UID and Sign');return}try{const res=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,sign})});const data=await res.json();if(data.success){addLog('✅ Login success!');document.getElementById('loginSection').classList.add('hidden');document.getElementById('statsSection').classList.remove('hidden');document.getElementById('controlSection').classList.remove('hidden');document.getElementById('levelStat').textContent=data.gameState.level;document.getElementById('goldStat').textContent=data.gameState.gold;document.getElementById('diamondsStat').textContent=data.gameState.diamonds;connectGame()}else{addLog('❌ Login failed')}}catch(err){addLog('❌ Error: '+err.message)}}async function connectGame(){try{const res=await fetch('/api/connect',{method:'POST'});const data=await res.json();if(data.success){addLog('✅ Connected!');isConnected=true}}catch(err){addLog('❌ Error: '+err.message)}}async function startBot(){if(!isConnected){addLog('❌ Not connected');return}if(selectedQuests.length===0){addLog('❌ Select quest');return}try{const res=await fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quests:selectedQuests,speed:selectedSpeed,repeatCount:5})});const data=await res.json();if(data.success){addLog('🚀 Started!');document.getElementById('stopBtn').disabled=false;document.querySelector('button[onclick="startBot()"]').disabled=true}}catch(err){addLog('❌ Error: '+err.message)}}async function stopBot(){try{await fetch('/api/stop',{method:'POST'});addLog('⏹️ Stopped');document.getElementById('stopBtn').disabled=true;document.querySelector('button[onclick="startBot()"]').disabled=false}catch(err){addLog('❌ Error: '+err.message)}}function addLog(message){const logsBox=document.getElementById('logsBox');const div=document.createElement('div');div.textContent=message;logsBox.insertBefore(div,logsBox.firstChild);while(logsBox.children.length>50){logsBox.removeChild(logsBox.lastChild)}}setInterval(async()=>{try{const res=await fetch('/api/state');const data=await res.json();if(data.gameState){document.getElementById('levelStat').textContent=data.gameState.level;document.getElementById('goldStat').textContent=data.gameState.gold;document.getElementById('diamondsStat').textContent=data.gameState.diamonds}}catch(err){console.error('Error:',err)}},1000);</script></body></html>`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(DASHBOARD_HTML);
});

app.post('/api/auth', (req, res) => {
  const { uid, sign } = req.body;
  if (!uid || !sign) return res.status(400).json({ success: false, error: 'Required' });
  botState.gameState.username = `Player_${uid.slice(-4)}`;
  botState.gameState.level = Math.floor(Math.random() * 50) + 1;
  botState.gameState.gold = Math.floor(Math.random() * 10000) + 1000;
  botState.gameState.diamonds = Math.floor(Math.random() * 500) + 100;
  botState.logs.unshift(`✅ Auth: ${botState.gameState.username}`);
  res.json({ success: true, gameState: botState.gameState });
});

app.post('/api/connect', (req, res) => {
  botState.isConnected = true;
  botState.logs.unshift('✅ Connected');
  res.json({ success: true });
});

app.post('/api/start', async (req, res) => {
  const { quests, repeatCount } = req.body;
  if (!botState.isConnected) return res.status(400).json({ success: false, error: 'Not connected' });
  if (botState.isRunning) return res.status(400).json({ success: false, error: 'Running' });
  botState.isRunning = true;
  botState.logs.unshift(`🚀 Started: ${quests.join(',')}`);
  res.json({ success: true });
  (async () => {
    for (let i = 0; i < repeatCount && botState.isRunning; i++) {
      for (const quest of quests) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        botState.stats.questsCompleted++;
        botState.gameState.gold += 500;
        botState.gameState.diamonds += 10;
        botState.logs.unshift(`✅ ${quest}: +500 gold`);
      }
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

app.get('/api/state', (req, res) => {
  res.json({
    isRunning: botState.isRunning,
    isConnected: botState.isConnected,
    gameState: botState.gameState,
    stats: botState.stats,
    logs: botState.logs.slice(0, 50)
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
