const mineflayer = require('mineflayer');
const http = require('http');
const WebSocket = require('ws');

const HOST = '89.144.32.248';
const PORT = 1033;
let activeBots = [];

async function spawnBots(amount, ws) {
    ws.send(JSON.stringify({action:'log', message:`[*] Spawning ${amount} bots instantly...`}));
    
    for (let i = 0; i < amount; i++) {
        const bot = mineflayer.createBot({
            host: HOST, 
            port: PORT,
            version: '1.21.5',
            username: `B_${Math.floor(Math.random()*9999)}`,
            hideErrors: true
        });

        bot.once('spawn', () => {
            activeBots.push(bot);
            ws.send(JSON.stringify({action:'log', message:`[+] ${bot.username} connected.`}));
            
            // Registration Sequence
            bot.chat('/register Fg4SD#cXz');
            bot.chat('/register Fg4SD#cXz Fg4SD#cXz');
            setTimeout(() => bot.chat('/login Fg4SD#cXz'), 300);
        });

        bot.on('end', () => activeBots = activeBots.filter(b => b !== bot));
    }
}

// --- UI Server ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html><html><head><style>
            body{background:#09090b; color:#e4e4e7; font-family:sans-serif; display:flex; justify-content:center;}
            .card{background:#18181b; padding:2rem; border-radius:12px; width:400px; margin-top:50px; border:1px solid #27272a;}
            input, button{width:100%; padding:12px; margin:8px 0; border-radius:6px; border:none; background:#27272a; color:white;}
            button{background:#3b82f6; font-weight:bold; cursor:pointer;}
            #console{height:200px; background:#000; overflow-y:auto; font-family:monospace; font-size:11px; padding:10px; border-radius:6px;}
        </style></head><body>
            <div class="card">
                <h2>Instant Bot Manager</h2>
                <input type="number" id="amt" value="5">
                <button onclick="send('join', document.getElementById('amt').value)">SPAWN INSTANT</button>
                <input type="text" id="chat" placeholder="Broadcast message...">
                <button onclick="send('chat', document.getElementById('chat').value)">BROADCAST</button>
                <button style="background:#dc2626" onclick="send('leave')">QUIT ALL</button>
                <div id="console"></div>
            </div>
            <script>
                const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                const socket = new WebSocket(protocol + window.location.host);
                socket.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    document.getElementById('console').innerHTML += '<div>' + data.message + '</div>';
                };
                function send(action, value='') { socket.send(JSON.stringify({action, value})); }
            </script>
        </body></html>
    `);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const { action, value } = JSON.parse(data);
        if (action === 'join') spawnBots(parseInt(value), ws);
        if (action === 'chat') activeBots.forEach(b => b.chat(value));
        if (action === 'leave') { activeBots.forEach(b => b.quit()); activeBots = []; }
    });
});

server.listen(3000);
