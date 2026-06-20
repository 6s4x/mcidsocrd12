const mineflayer = require('mineflayer');
const http = require('http');
const WebSocket = require('ws');

// --- Configuration ---
const HOST = '89.144.32.248';
const PORT = 1033;
let activeBots = [];

// --- Bot Management ---
function spawnBots(amount, ws) {
  sendLogs(ws, `[*] Attempting to join ${amount} bots to ${HOST}:${PORT}...`, 'info');
  
  for (let i = 0; i < amount; i++) {
    setTimeout(() => {
      const botName = `Bot_${Math.random().toString(36).substring(2, 6)}`;
      const bot = mineflayer.createBot({
        host: HOST,
        port: PORT,
        username: botName
      });

      bot.once('spawn', () => {
        sendLogs(ws, `[+] ${botName} spawned successfully!`, 'success');
        activeBots.push(bot);
        updateStatus(ws);

        // Auto-run authentication sequence
        setTimeout(() => { if (bot.isValid) bot.chat('/register Fg4SD#cXz'); }, 500);
        setTimeout(() => { if (bot.isValid) bot.chat('/register Fg4SD#cXz Fg4SD#cXz'); }, 1000);
        setTimeout(() => { if (bot.isValid) bot.chat('/login Fg4SD#cXz'); }, 1500);
      });

      bot.on('end', () => {
        activeBots = activeBots.filter(b => b.username !== bot.username);
        updateStatus(ws);
      });

      bot.on('error', () => { /* Handle silent errors */ });

    }, i * 500); 
  }
}

// Helper functions to push real-time updates to the browser
function sendLogs(ws, message, type = 'default') {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'log', message, type }));
  }
}

function updateStatus(ws) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'status', count: activeBots.length }));
  }
}

// --- HTTP Server ---
// Serves the interface HTML page directly to your web browser
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Control Terminal</title>
        <style>
          body { font-family: monospace; background: #121212; color: #e0e0e0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .card { background: #1e1e1e; padding: 20px; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
          input, button { background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 10px; font-family: monospace; border-radius: 3px; }
          button { cursor: pointer; background: #007acc; }
          button:hover { background: #0062a3; }
          .btn-danger { background: #a31515; }
          .btn-danger:hover { background: #7a1010; }
          #console { background: #000; height: 300px; overflow-y: auto; padding: 10px; border-radius: 3px; border: 1px solid #333; margin-top: 15px; }
          .info { color: #cca700; }
          .success { color: #4ec9b0; }
          .danger { color: #f44747; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Instance Web Manager</h2>
          <div class="card">
            <h3>Active Connections: <span id="count">0</span></h3>
            <input type="number" id="amount" placeholder="Amount" value="5" style="width: 80px;">
            <button onclick="sendAction('join', document.getElementById('amount').value)">Spawn Bots</button>
            <button class="btn-danger" onclick="sendAction('leave')">Disconnect All</button>
          </div>
          <div class="card">
            <input type="text" id="chatMsg" placeholder="Global message..." style="width: 70%;">
            <button onclick="sendAction('chat', document.getElementById('chatMsg').value)">Broadcast Chat</button>
          </div>
          <div class="card">
            <h3>Console Output</h3>
            <div id="console"></div>
          </div>
        </div>

        <script>
          // Automatically connects the websocket to your current page URL
          const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
          const socket = new WebSocket(wsProtocol + window.location.host);
          const consoleDiv = document.getElementById('console');

          socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.action === 'log') {
              const p = document.createElement('p');
              p.className = data.type;
              p.textContent = data.message;
              consoleDiv.appendChild(p);
              consoleDiv.scrollTop = consoleDiv.scrollHeight;
            } else if (data.action === 'status') {
              document.getElementById('count').textContent = data.count;
            }
          };

          function sendAction(action, value = '') {
            socket.send(JSON.stringify({ action, value }));
            if (action === 'chat') document.getElementById('chatMsg').value = '';
          }
        </script>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end();
  }
});

// --- WebSocket Server Routing ---
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  updateStatus(ws);
  sendLogs(ws, '[System] Connected to Control WebSocket channel successfully.', 'success');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.action === 'join') {
        const amount = parseInt(data.value, 10);
        if (!isNaN(amount)) spawnBots(amount, ws);
      } 
      
      else if (data.action === 'chat') {
        activeBots.forEach(bot => bot.chat(data.value));
        sendLogs(ws, `[Broadcast] sent: "${data.value}" to ${activeBots.length} active instances.`, 'info');
      } 
      
      else if (data.action === 'leave') {
        activeBots.forEach(bot => bot.quit());
        activeBots = [];
        updateStatus(ws);
        sendLogs(ws, '[-] All active instances disconnected cleanly.', 'danger');
      }
    } catch (err) {
      console.error(err);
    }
  });
});

const webPort = process.env.PORT || 3000;
server.listen(webPort, () => {
  console.log(`Web Management console active on port ${webPort}`);
});
