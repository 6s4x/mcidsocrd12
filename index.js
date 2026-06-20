const mineflayer = require('mineflayer');
const http = require('http');
const WebSocket = require('ws');

// Default values, can be overridden by the UI
let targetHost = '89.144.32.248';
let targetPort = 1033;
let activeBots = [];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function spawnBots(amount, host, port, ws) {
    targetHost = host || targetHost;
    targetPort = parseInt(port) || targetPort;

    ws.send(JSON.stringify({action:'log', message:`[*] Connecting to ${targetHost}:${targetPort}...`}));
    
    for (let i = 0; i < amount; i++) {
        await delay(80); // Micro-delay to prevent packet flood

        const bot = mineflayer.createBot({
            host: targetHost, 
            port: targetPort,
            version: '1.21.5',
            username: `B_${Math.floor(Math.random()*9999)}`,
            hideErrors: true
        });

        bot.once('spawn', () => {
            activeBots.push(bot);
            ws.send(JSON.stringify({action:'log', message:`[+] ${bot.username} connected.`}));
            
            // Authentication Sequence
            setTimeout(() => {
                bot.chat('/register Fg4SD#cXz Fg4SD#cXz');
                setTimeout(() => bot.chat('/login Fg4SD#cXz'), 400);
            }, 600);
        });

        bot.on('end', () => activeBots = activeBots.filter(b => b !== bot));
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html><html><head><style>
            body{background:#09090b; color:#e4e4e7; font-family:sans-serif; display:flex; justify-content:center;}
            .card{background:#18181b; padding:2rem; border-radius:12px; width:400px; margin-top:50px; border:1px solid #27272a;}
            input, button{width:100%; padding:10px; margin:5px 0; border-radius:6px; border:none; background:#27272a; color:white;}
            button{background:#3b82f6; font-weight:bold; cursor:pointer;}
            #console{height:200px; background:#000; overflow-y:auto; font-family:monospace; font-size:11px; padding:10px; border-radius:6px;}
        </style></head><body>
            <div class="card">
                <h2>Custom Bot Manager</h2>
                <input type="text" id="host" value="89.144.32.248">
                <input type="number" id="port" value="1033">
                <input type="number" id="amt" value="5" placeholder="Amount">
                <button onclick="sendJoin()">SPAWN BOTS</button>
                <button style="background:#dc2626" onclick="send('leave')">QUIT ALL</button>
                <div id="console"></div>
            </div>
            <script>
                const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                const socket = new WebSocket(protocol + window.location.host);
                function sendJoin() {
                    const host = document.getElementById('host').value;
                    const port = document.getElementById('port').value;
                    const amt = document.getElementById('amt').value;
                    socket.send(JSON.stringify({action:'join', host, port, amt}));
                }
                function send(action) { socket.send(JSON.stringify({action})); }
                socket.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    document.getElementById('console').innerHTML += '<div>' + data.message + '</div>';
                };
            </script>
        </body></html>
    `);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const { action, host, port, amt } = JSON.parse(data);
        if (action === 'join') spawnBots(parseInt(amt), host, port, ws);
        if (action === 'leave') { activeBots.forEach(b => b.quit()); activeBots = []; }
    });
});

server.listen(3000);
