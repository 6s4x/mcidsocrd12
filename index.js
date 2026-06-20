const mineflayer = require('mineflayer');
const http = require('http');
const WebSocket = require('ws');
const { SocksClient } = require('socks');
const axios = require('axios');

// --- Configuration ---
const HOST = '89.144.32.248';
const PORT = 1033;
const PROXY_URL = 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt';
let activeBots = [];
let proxies = [];

async function updateProxyList() {
    try {
        const response = await axios.get(PROXY_URL);
        proxies = response.data.split('\n').filter(Boolean);
        console.log(`[*] Loaded ${proxies.length} proxies.`);
    } catch (e) { console.error("[-] Proxy fetch failed."); }
}
updateProxyList();

// --- Server & UI ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; padding: 20px; }
                .card { background: #1e293b; padding: 2rem; border-radius: 12px; width: 100%; max-width: 500px; }
                input, button { display: block; width: 100%; margin: 10px 0; padding: 10px; border-radius: 6px; border: none; }
                button { background: #3b82f6; color: white; cursor: pointer; }
                #console { background: #000; height: 150px; overflow-y: auto; padding: 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Bot Manager</h2>
                <input type="number" id="amt" value="5">
                <button onclick="send('join', document.getElementById('amt').value)">SPAWN BOTS</button>
                <input type="text" id="chat" placeholder="Broadcast message...">
                <button onclick="send('chat', document.getElementById('chat').value)">SEND CHAT</button>
                <button style="background:#ef4444" onclick="send('leave')">DISCONNECT ALL</button>
                <div id="console"></div>
            </div>
            <script>
                // To this (handles both http and https automatically):
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(protocol + window.location.host);
                socket.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    const log = document.getElementById('console');
                    log.innerHTML += '<div>' + data.message + '</div>';
                    log.scrollTop = log.scrollHeight;
                };
                function send(action, value='') { socket.send(JSON.stringify({action, value})); }
            </script>
        </body>
        </html>
    `);
});

// --- Logic ---
function spawnBots(amount, ws) {
    for (let i = 0; i < amount; i++) {
        const proxyEntry = proxies[i % proxies.length]?.split(':') || [];
        const bot = mineflayer.createBot({
            host: HOST, port: PORT, username: `Bot_${Math.random().toString(36).substring(2, 6)}`,
            connect: (proxyEntry.length === 2) ? (client) => {
                SocksClient.createConnection({
                    proxy: { host: proxyEntry[0], port: parseInt(proxyEntry[1]), type: 5 },
                    destination: { host: HOST, port: PORT }, command: 'connect'
                }, (err, info) => {
                    if (err) return;
                    client.setSocket(info.socket);
                    client.emit('connect');
                });
            } : undefined
        });

        bot.once('spawn', () => {
            activeBots.push(bot);
            ws.send(JSON.stringify({action:'log', message:'Spawned: ' + bot.username}));
            setTimeout(() => bot.chat('/register Fg4SD#cXz'), 500);
            setTimeout(() => bot.chat('/register Fg4SD#cXz Fg4SD#cXz'), 1000);
            setTimeout(() => bot.chat('/login Fg4SD#cXz'), 1500);
        });

        bot.on('end', () => activeBots = activeBots.filter(b => b !== bot));
    }
}

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
