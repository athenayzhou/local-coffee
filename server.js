const express = require('express');
const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
const qr = require('qr-image');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const COFFEE_DIR = path.join(process.env.HOME, 'code/mini/local-coffee/order-tickets');
if(!fs.existsSync(COFFEE_DIR)) fs.mkdirSync(COFFEE_DIR, {recursive: true});

app.post('/create_ticket', (req, res) => {
    const {name, caffeine, milk, temp, timestamp} = req.body;
    const formatName = name.replace(/\s+/g, '_');
    const fileName = `ticket_${formatName}_${timestamp}.html`;
    const filepath = path.join(COFFEE_DIR, fileName);
    
    const html= `
    <div style="font-family:sans-serif; background:#fff; padding:20px; border-radius:10px; width:250px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <h2>${name}</h2>
        <p>${caffeine}</p>
        <p>${milk}</p>
        <p>${temp}</p>
        <p>${new Date(timestamp).toLocaleTimeString()}</p>
    </div>
    `;
    fs.writeFileSync(filepath, html);
    exec('/bin/bash /Users/athena/code/mini/scripts/generate_viewer.sh');
    res.send(`ticket created: ${fileName}`);
});

// app.get('/view_tickets', (req, res) => {
//     const files = fs.readdirSync(COFFEE_DIR).filter(f => f.endsWith('.html'));
//     let ticketsHtml = '';
//     files.forEach(file => {
//         ticketsHtml += fs.readFileSync(path.join(COFFEE_DIR, file), 'utf8');
//     });

//     res.send(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <title>coffee orders</title>
//         <style>
//             body { display:flex; flex-wrap: wrap; gap:10px; font-samily:sans-serif; }
//             .ticket { background:#fff; padding:15px; border-radius:10px; box-shadow:0 2px 4px rgba(0,0,0,0.1); width:200px; }
//         </style>
//     </head>
//     <body>
//         ${ticketsHtml}
//     </body>
//     </html>
//     `)
// });

app.get('/qr', (req, res) => {
    const hostIP = req.headers.host.split(':')[0];
    const url = `http://${hostIP}:3000/order.html`;
    const qrSvg = qr.image(url, { type: 'svg' });
    res.type('svg');
    qrSvg.pipe(res);
})

const PORT = 3000;
app.listen(PORT, () => console.log(`coffee running at http://localhost:${PORT}`));