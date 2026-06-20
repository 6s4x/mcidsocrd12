const mineflayer = require('mineflayer');
const http = require('http');
const { Server } = require('ssh2');
const crypto = require('crypto');

// --- Configuration (Replace placeholders with your actual server details) ---
const HOST = 'YOUR_SERVER_IP_OR_HOST'; 
const PORT = 1033; 
let activeBots = [];

// Generate RSA key for the SSH server
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' } 
});

// --- Bot Management ---
function spawnBots(amount, stream) {
  stream.write(`\r\n\x1b[33m[*] Attempting to join ${amount} bots to ${HOST}:${PORT}...\x1b[0m\r\n`);
  
  for (let i = 0; i < amount; i++) {
    // ADJUST SPEED HERE: Changed from 2000ms to 500ms for faster sequential entry.
    // Reduce further (e.g., 200) if your server's connection-throttle allows it.
    setTimeout(() => {
      const botName = `Bot_${Math.random().toString(36).substring(2, 6)}`;
      const bot = mineflayer.createBot({
        host: HOST,
        port: PORT,
        username: botName
      });

      // Use .once to ensure the login sequence only fires on the initial join
      bot.once('spawn', () => {
        stream.write(`\r\n\x1b[32m[+] ${botName} spawned successfully!\x1b[0m\r\n`);
        activeBots.push(bot);

        // Auto-run authentication commands with slight delays to avoid spam filters
        setTimeout(() => {
          if (bot.isValid) bot.chat('/register Fg4SD#cXz');
        }, 500);

        setTimeout(() => {
          if (bot.isValid) bot.chat('/register Fg4SD#cXz Fg4SD#cXz');
        }, 1000);

        setTimeout(() => {
          if (bot.isValid) bot.chat('/login Fg4SD#cXz');
        }, 1500);
      });

      bot.on('end', () => {
        activeBots = activeBots.filter(b => b.username !== bot.username);
      });

      bot.on('error', () => { /* Handle silent errors */ });

    }, i * 500); 
  }
}

// --- SSH Server ---
const sshServer = new Server({
  hostKeys: [privateKey]
}, (client) => {
  console.log('Client connected to SSH!');

  client.on('error', (err) => {
    console.log(`[SSH] Client connection error caught: ${err.message}`);
  });

  client.on('authentication', (ctx) => {
    if (ctx.method === 'password' && ctx.username === 'root' && ctx.password === 'root') {
      ctx.accept();
    } else {
      ctx.reject(['password']);
    }
  });

  client.on('ready', () => {
    client.on('session', (accept, reject) => {
      const session = accept();
      
      session.once('pty', (accept, reject, info) => {
        accept();
      });

      session.once('shell', (accept, reject) => {
        const stream = accept();
        let inputBuffer = '';

        const banner = `\r
\x1b[36m
  ██████╗ ██████╗ ████████╗███╗   ██╗███████╗████████╗
  ██╔══██╗██╔══██╗╚══██╔══╝████╗  ██║██╔════╝╚══██╔══╝
  ██████╦╝██║  ██║   ██║   ██╔██╗ ██║█████╗     ██║   
  ██╔══██╗██║  ██║   ██║   ██║╚██╗██║██╔══╝     ██║   
  ██████╦╝██████╔╝   ██║   ██║ ╚████║███████╗   ██║   
  ╚═════╝ ╚═════╝    ╚═╝   ╚═╝  ╚═══╝╚══════╝   ╚═╝   
\x1b[0m
\x1b[32mWelcome to the Botnet Control Terminal.\x1b[0m
Type \x1b[33mhelp\x1b[0m for commands.

`;
        stream.write(banner);
        stream.write('root@botnet:~# ');

        stream.on('data', (data) => {
          const char = data.toString();

          if (char === '\r' || char === '\n') {
            stream.write('\r\n');
            const args = inputBuffer.trim().split(' ');
            const command = args[0];

            if (command === 'help') {
              stream.write('\x1b[36mAvailable Commands:\x1b[0m\r\n');
              stream.write('  .join <amount>  - Connects X number of bots\r\n');
              stream.write('  .chat <msg>     - Makes all connected bots say a message\r\n');
              stream.write('  .leave          - Disconnects all bots\r\n');
              stream.write('  exit            - Closes this SSH session\r\n');
            } 
            else if (command === '.join' && args[1]) {
              const amount = parseInt(args[1], 10);
              if (!isNaN(amount)) spawnBots(amount, stream);
            } 
            else if (command === '.chat') {
              const msg = args.slice(1).join(' ');
              activeBots.forEach(bot => bot.chat(msg));
              stream.write(`\x1b[32mBroadcasted to ${activeBots.length} bots.\x1b[0m\r\n`);
            } 
            else if (command === '.leave') {
              activeBots.forEach(bot => bot.quit());
              activeBots = [];
              stream.write('\x1b[31mAll bots disconnected.\x1b[0m\r\n');
            } 
            else if (command === 'exit') {
              stream.write('Goodbye.\r\n');
              stream.end();
              return;
            } 
            else if (inputBuffer.length > 0) {
              stream.write(`\x1b[31mCommand not found: ${command}\x1b[0m\r\n`);
            }

            inputBuffer = '';
            stream.write('\r\nroot@botnet:~# ');
          } 
          else if (char === '\x7F' || char === '\b') {
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
              stream.write('\b \b'); 
            }
          } 
          else {
            inputBuffer += char;
            stream.write(char);
          }
        });
      });
    });
  });
});

const sshPort = process.env.SSH_PORT || 4242;
sshServer.listen(sshPort, () => {
  console.log(`SSH Control Server running on port ${sshPort}`);
});

// --- Railway Health Check Server ---
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end(`Botnet is online. Active bots: ${activeBots.length}`);
});

const webPort = process.env.PORT || 3000;
server.listen(webPort, () => {
  console.log(`Dummy web server listening on port ${webPort} for Railway health checks.`);
});
