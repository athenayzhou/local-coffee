// viewer.js (non-module version)
document.body.innerHTML += "<div style='position:fixed;top:0;left:0;background:yellow'>JS is running</div>";

const board = document.getElementById('board');
const tickets = new Map();
const logEl = document.getElementById('log');

function log(...args) {
    console.log(...args);
    if (logEl) logEl.textContent += args.map(a => JSON.stringify(a)).join(' ') + '\n';
}

log('JS loaded');

function render() {
    board.innerHTML = '';
    const sorted = [...tickets.values()]
        .filter(t => !t.completed)
        .sort((a, b) => a.createdAt - b.createdAt);

    sorted.forEach(t => {
        const div = document.createElement('div');
        div.className = 'ticket';
        div.innerHTML = `
          <strong>${t.name}</strong>
          <div>${t.caffeine}</div>
          <div>${t.milk}</div>
          <div>${t.temp}</div>
          <div>ordered at ${new Date(t.createdAt).toLocaleTimeString()}</div>
          <button onclick="complete('${t.id}')">done</button>
        `;
        board.appendChild(div);
    });
}

function complete(id) {
    fetch('/tickets/' + id + '/complete', { method: 'POST' })
        .then(() => {
            const t = tickets.get(id);
            if (t) t.completed = true;
            render();
        })
        .catch(err => log('Complete error:', err));
}

function loadExistingTickets() {
    tickets.clear();
    fetch('/tickets')
        .then(r => r.json())
        .then(existing => {
            existing.forEach(t => tickets.set(t.id, t));
            render();
            log('Fetched tickets:', existing);
        })
        .catch(err => log('Fetch tickets error:', err));
}

loadExistingTickets();

// --- SSE ---
const es = new EventSource('/events');
es.onmessage = function(e) {
    const msg = JSON.parse(e.data);
    if (msg.type === 'new') tickets.set(msg.ticket.id, msg.ticket);
    if (msg.type === 'complete') {
        const t = tickets.get(msg.id);
        if (t) t.completed = true;
    }
    render();
};
es.onerror = function() {
    log('SSE reconnect, reloading tickets...');
    loadExistingTickets();
};

// --- QR code ---
const qr = document.getElementById('qr');
const urlText = document.getElementById('url');

function updateQR() {
    setTimeout(function() {
        if (qr) qr.src = '/qr?ts=' + Date.now();
    }, 200);

    fetch('/info')
        .then(r => r.json())
        .then(info => {
            if (urlText) urlText.textContent = info.url;
        })
        .catch(err => log('QR info error:', err));
}

setInterval(updateQR, 5000);
updateQR();