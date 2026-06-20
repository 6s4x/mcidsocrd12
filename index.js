const mineflayer = require('mineflayer');
const http = require('http');

// Your server details
const HOST = '89.144.32.248';
const PORT = 1033;
const BOT_COUNT = 3;

function createBot(botName) {
  console.log(`Starting ${botName}...`);
  
  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: botName,
    // version: '1.20.4' // Uncomment and change if auto-detect fails
  });

  bot.on('spawn', () => {
    console.log(`${botName} has successfully spawned!`);
    
    // NOTE: I see "larpLogin" in your console screenshot. 
    // If your server is offline-mode, the bots might need to register/login.
    // Uncomment the line below if they need to send a chat command to authenticate:
    // bot.chat('/register BotPassword123 BotPassword123'); 
  });

  bot.on('kicked', (reason) => {
    console.log(`[${botName}] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[${botName}] Error:`, err);
  });

  bot.on('end', () => {
    console.log(`[${botName}] Disconnected. Attempting to reconnect in 10 seconds...`);
    setTimeout(() => createBot(botName), 10000);
  });
}

// Spawn the 3 bots with a slight delay between each to avoid connection throttling
for (let i = 0; i < BOT_COUNT; i++) {
  // Generates a random name like "Bot_a1b2c3"
  const randomName = `Bot_${Math.random().toString(36).substring(2, 8)}`;
  
  setTimeout(() => {
    createBot(randomName);
  }, i * 3000); // 3-second delay between each bot joining
}

// --- Railway Health Check Server ---
// Railway will kill the container if it doesn't detect an active HTTP port.
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Mineflayer bots are running online!');
});

const webPort = process.env.PORT || 3000;
server.listen(webPort, () => {
  console.log(`Dummy web server listening on port ${webPort} for Railway health checks.`);
});
