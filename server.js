const express = require('express');
const fs = require('fs');
const path = require('path');
const qr = require('qr-image');
const open = require('open').default;
const os = require('os');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const PORT = 3000;

let lastViewerHTML = null;

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' &&
                !net.internal &&
                !net.address.startsWith('169.254')
            ){
                return net.address;
            }
        }
    }
    return 'localhost'
}
function isToday(timestamp){
    const d = new Date(timestamp);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    );
}

const TICKETS_FILE = path.join(__dirname, "tickets.json");
if(!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, "[]");

function readTickets(){
    if(!fs.existsSync(TICKETS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
}
function writeTickets(tickets){
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}
function getTodaysTickets(all){
    return all
        .filter(t => isToday(t.createdAt) && !t.completed)
        .sort((a,b) => b.createdAt - a.createdAt);
}


function renderViewer(todaysTickets) {
  const ticketsHTML = todaysTickets.map((order) => {
    const drinkPrefix = order.temp === 'cold' ? 'ICED' : 'HOT';
    return `
<div class="ticket">
    <div class="ticket-header">ORDER #${order.id.slice(-3)} - ${order.name.toUpperCase()}</div>
    <div class="divider">────────────</div>
      <div class="drink">${drinkPrefix} ${order.drink.toUpperCase()}</div>
      <div class="meta">${order.milk.toUpperCase()}</div>
      ${order.extraShot ? `<div class="meta">EXTRA SHOT</div>` : ""}
      ${order.notes ? `
        <div class="notes-title">Notes:</div>
        <div class="notes">${order.notes}</div>` : ""}
    <div class="divider">────────────</div>
    <div class="time">${new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
</div>
`}).join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta http-equiv="refresh" content="5" charset="utf-8" />
<title>✰barista✰</title>
<style>
body {
  margin: 0;
  padding: 20px;
  background: #f6f6f6;
  font-family: 'Courier New', monospace;
}
.viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ticket {
  background: white;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}
.ticket-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}
.divider {
  font-family: monospace;
  margin: 4px 0;
}
.drink {
  font-size: 24px;
  font-weight: 700;
}
.meta {
  font-size: 18px;
  margin-top: 4px;
}
.notes-title {
  margin-top: 8px;
  font-weight: bold;
}
.notes {
  font-style: italic;
  margin-bottom: 4px;
}
.time {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.6;
}
</style>
</head>
<body>
  <div class="viewer">
    ${ticketsHTML || "<div>no orders yet</div>"}
  </div>
</body>
</html>
`;

if(html === lastViewerHTML) {
    return;
}

lastViewerHTML = html;

const publicDir = path.join(__dirname, 'public');
if(!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const publicPath = path.join(publicDir, 'viewer.html');
fs.writeFileSync(publicPath, html);
console.log('viewer saved local');

const miniDest = '/var/mobile/Documents/mini/coffee/viewer.html';
exec(
    `rsync -av --delete "${publicPath}" mini:${miniDest}`,
    (err, stdout, stderr) => {
        if(err) console.error('rsync error:', stderr);
        else console.log('viewer synced to mini');
    }
);

const icloudDir = path.join(process.env.HOME, 'Library/Mobile Documents/com~apple~CloudDocs/mini/coffee');
if(!fs.existsSync(icloudDir)) fs.mkdirSync(icloudDir, { recursive: true });
fs.copyFileSync(publicPath, path.join(icloudDir, 'viewer.html'));
console.log('viewer copied to iCloud for backup');
}


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "order.html"));
});

app.get('/qr', (req, res) => {
    const ip = getLocalIP();
    const url = `http://${ip}:${PORT}/`;
    const qrPng = qr.image(url, { type: 'png' });
    res.type('png');
    qrPng.pipe(res);
});

app.post('/tickets', (req, res) => {
    const tickets = readTickets();
    const ticket = {
        id: Date.now().toString(),
        name: req.body.name,
        drink: req.body.drink,
        temp: req.body.temp,
        milk: req.body.milk,
        notes: req.body.notes,
        createdAt: Date.now(),
        completed: false,
    }
    tickets.push(ticket);
    writeTickets(tickets);
    const todays = getTodaysTickets(tickets);
    renderViewer(todays);
    res.json({ ok: true, ticket });
});

app.post('/tickets/:id/complete', (req, res) => {
    const allTickets = readTickets();
    const ticket = allTickets.find(t => t.id === req.params.id);
    if(ticket) ticket.completed = true;
    writeTickets(allTickets);
    const todays = getTodaysTickets(allTickets);
    renderViewer(todays);
    res.json({ ok: true });
});


app.post('/start-coffee', (req,res) => {
    exec('bash ~/code/mini/local-coffee/start-coffee.sh', (err, stdout, stderr) => {
        if(err) return res.status(500).send(stderr);
        res.send(stdout);
    })
})

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`coffee brewing at http://${ip}:${PORT}`);
    open(`http://${ip}:${PORT}/qr`);
});