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

// Fetch proxies from GitHub
async function updateProxyList() {
    try {
        const response = await axios.get(PROXY_URL);
        proxies = response.data.split('\n').filter(Boolean);
        console.log(`[*] Successfully loaded ${proxies.length} proxies.`);
    } catch (e) {
        console.error("[-] Proxy fetch failed:", e.message);
    }
}
updateProxyList();

function spawnBots(amount, ws) {
    if (proxies.length === 0) {
        sendLogs(ws, '[!] Proxies not loaded yet. Try again in a moment.', 'danger');
        return;
    }

    sendLogs(ws, `[*] Spawning ${amount} bots...`, 'info');

    for (let i = 0; i < amount; i++) {
        const proxyEntry = proxies[i % proxies.length].split(':');
        const botName = `Bot_${Math.random().toString(36).substring(2, 6)}`;
        
        const botOptions = {
            host: HOST,
            port: PORT,
            username: botName,
            connect: (client) => {
                SocksClient.createConnection({
                    proxy: { host: proxyEntry[0], port: parseInt(proxyEntry[1]), type: 5 },
                    destination: { host: HOST, port: PORT },
                    command: 'connect'
                }, (err, info) => {
                    if (err) return;
                    client.setSocket(info.socket);
                    client.emit('connect');
                });
            }
        };

        const bot = mineflayer.createBot(botOptions);

        // --- Authentication Sequence ---
        bot.once('spawn', () => {
            activeBots.push(bot);
            sendLogs(ws, `[+] ${botName} joined. Running auth...`, 'success');
            updateStatus(ws);

            setTimeout(() => bot.chat('/register Fg4SD#cXz'), 500);
            setTimeout(() => bot.chat('/register Fg4SD#cXz Fg4SD#cXz'), 1000);
            setTimeout(() => bot.chat('/login Fg4SD#cXz'), 1500);
        });

        // Reactive listener for any later prompts
        bot.on('message', (jsonMsg) => {
            const msg = jsonMsg.toString().toLowerCase();
            if (msg.includes('register')) bot.chat('/register Fg4SD#cXz Fg4SD#cXz');
            if (msg.includes('login')) bot.chat('/login Fg4SD#cXz');
        });

        bot.on('end', () => {
            activeBots = activeBots.filter(b => b !== bot);
            updateStatus(ws);
        });
    }
}

// --- Helpers ---
function sendLogs(ws, message, type = 'default') {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'log', message, type }));
}

function updateStatus(ws) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'status', count: activeBots.length }));
}

// --- Server ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <style>body{background:#121212;color:#eee;font-family:monospace;padding:20px;} #console{height:300px;background:#000;overflow-y:auto;border:1px solid #444;padding:10px;}</style>
        <h2>Control Panel</h2>
        <input type="number" id="amt" value="5">
        <button onclick="send('join', document.getElementById('amt').value)">Spawn</button>
        <button onclick="send('leave')">Disconnect All</button><br><br>
        <input type="text" id="chat" placeholder="Global message...">
        <button onclick="send('chat', document.getElementById('chat').value)">Broadcast</button>
        <div id="console"></div>
        <script>
            const socket = new WebSocket('ws://' + window.location.host);
            socket.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if(data.action==='log') document.getElementById('console').innerHTML += '<p>'+data.message+'</p>';
                if(data.action==='status') document.querySelector('h2').innerText = 'Bots: ' + data.count;
            };
            function send(action, value='') { socket.send(JSON.stringify({action, value})); }
        </script>
    `);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const { action, value } = JSON.parse(data);
        if (action === 'join') spawnBots(parseInt(value), ws);
        if (action === 'chat') activeBots.forEach(b => b.chat(value));
        if (action === 'leave') { activeBots.forEach(b => b.quit()); activeBots = []; updateStatus(ws); }
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
