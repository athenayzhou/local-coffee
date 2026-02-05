const https = require('https');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qr = require('qr-image');
const open = require('open').default;
const os = require('os');
const { exec } = require('child_process');

let clients = [];

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const PORT = 3000;

const options = {
    key: fs.readFileSync('/Users/athena/code/certs/server.key'),
    cert: fs.readFileSync('/Users/athena/code/certs/server.crt')
}

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

const COFFEE_DIR = path.join(__dirname, 'order-tickets');
if(!fs.existsSync(COFFEE_DIR)) fs.mkdirSync(COFFEE_DIR, {recursive: true});

const TICKETS_FILE = path.join(COFFEE_DIR, 'tickets.json');
function readTickets(){
    if(!fs.existsSync(TICKETS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
}
function writeTickets(tickets){
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}



app.post('/tickets', (req, res) => {
    const ticket = {
        id: Date.now().toString(),
        ...req.body,
        completed: false,
        createdAt: Date.now()
    }
    const tickets = readTickets();
    tickets.push(ticket);
    writeTickets(tickets);
    broadcast({ type:'new', ticket })
    res.json(ticket);
});
app.get('/tickets', (req, res) => {
    res.json(readTickets());
});
app.post('/tickets/:id/complete', (req, res) => {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.id === req.params.id);
    if(ticket) ticket.completed = true;
    writeTickets(tickets);
    broadcast({ type: 'complete', id: req.params.id });
    res.json({ ok: true });
});


app.get('/qr', (req, res) => {
    const ip = getLocalIP();
    const url = `http://${ip}:${PORT}/`;
    const qrPng = qr.image(url, { type: 'png' });
    res.type('png');
    qrPng.pipe(res);
});

app.get('/info', (req, res) => {
    const ip = getLocalIP();
    res.json({
        url: `http://${ip}:${PORT}/`
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'order.html'));
});

app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'viewer.html'));
});

function broadcast(data){
    clients.forEach(c => {
        c.write(`data: ${JSON.stringify(data)}\n\n`)
    })
}
app.get('/events', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    clients.push(res);
    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});


app.post('/start-coffee', (req,res) => {
    exec('bash ~/code/mini/local-coffee/start-coffee.sh', (err, stdout, stderr) => {
        if(err) return res.status(500).send(stderr);
        res.send(stdout);
    })
})

// const server = https.createServer(options, app);
// server.listen(PORT, () => {
//     const ip = getLocalIP();
//     console.log(`HTTPS server running at https://${ip}:${PORT}`);
//     open(`https://${ip}:${PORT}/viewer`);
// });

app.post('/start-coffee', (req, res) => {
    exec('bash ~/code/mini/local-coffee/start-coffee.sh', (err, stdout, stderr) => {
        if (err) return res.status(500).send(stderr);
        res.send(stdout);
    });
});

// --- Start HTTP server ---
app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`Coffee running at http://${ip}:${PORT}`);
});