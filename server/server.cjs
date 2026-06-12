const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const MAX_TURNS = 20;
const DEMAND_PATTERN = [10,10,10,10,15,15,20,20,15,10,10,15,20,25,20,15,10,10,10,10];

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ── HTTP server (serves built frontend) ─────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  // Strip query string
  filePath = filePath.split('?')[0];

  // If file doesn't exist, serve index.html (SPA fallback)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// ── WebSocket server (on same HTTP server) ───────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

// ── Game logic ───────────────────────────────────────────────────────────────
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

const ROLES = ['restaurant', 'distributor', 'factory', 'farm'];
const ROLE_NAMES = {
  restaurant: 'Fried Chicken Shop',
  distributor: 'Distributor',
  factory: 'Factory',
  farm: 'Farm',
};

function initGameState() {
  return {
    turn: 1,
    maxTurns: MAX_TURNS,
    stations: {
      farm:        { stock: 12, backorder: 0, cost: 0, incomingShipment: 4, incomingOrder: 0 },
      factory:     { stock: 12, backorder: 0, cost: 0, incomingShipment: 4, incomingOrder: 0 },
      distributor: { stock: 12, backorder: 0, cost: 0, incomingShipment: 4, incomingOrder: 0 },
      restaurant:  { stock: 12, backorder: 0, cost: 0, incomingShipment: 4, incomingOrder: 0 },
    },
    orderQueues:    { farm: [4,4], factory: [4,4], distributor: [4,4], restaurant: [4,4] },
    shipmentQueues: { farm: [4,4], factory: [4,4], distributor: [4,4], restaurant: [4,4] },
    customerDemand: DEMAND_PATTERN[0],
    lastDemand: 0,
  };
}

function advanceTurn(room) {
  const gs = room.gameState;
  const s = gs.stations;
  const oq = gs.orderQueues;
  const sq = gs.shipmentQueues;

  const orders = {};
  for (const [, p] of room.players) {
    if (p.role) orders[p.role] = (p.order != null ? p.order : 4);
  }

  // Receive shipments
  for (const role of ROLES) {
    const received = sq[role].shift();
    s[role].stock += received;
    s[role].incomingShipment = received;
  }

  // Receive orders
  const demand = DEMAND_PATTERN[Math.min(gs.turn - 1, DEMAND_PATTERN.length - 1)];
  gs.lastDemand = demand;
  const ordersReceived = {
    restaurant: demand,
    distributor: oq.restaurant.shift(),
    factory: oq.distributor.shift(),
    farm: oq.factory.shift(),
  };
  for (const role of ROLES) s[role].incomingOrder = ordersReceived[role];

  // Ship
  for (const role of ROLES) {
    const totalReq = ordersReceived[role] + s[role].backorder;
    const shipped = Math.min(s[role].stock, totalReq);
    s[role].stock -= shipped;
    s[role].backorder = totalReq - shipped;
    // Queue to downstream
    if (role === 'farm')        sq.factory.push(shipped);
    else if (role === 'factory') sq.distributor.push(shipped);
    else if (role === 'distributor') sq.restaurant.push(shipped);
  }

  // Place orders (with 1-turn delay)
  for (const role of ROLES) {
    const order = orders[role] != null ? orders[role] : 4;
    oq[role].push(order);
  }
  sq.farm.push(orders.farm != null ? orders.farm : 4); // infinite supply for farm

  // Costs
  for (const role of ROLES) {
    s[role].cost = Math.round((s[role].cost + s[role].stock * 0.5 + s[role].backorder * 1.0) * 10) / 10;
  }

  gs.turn += 1;
  gs.customerDemand = DEMAND_PATTERN[Math.min(gs.turn - 1, DEMAND_PATTERN.length - 1)];

  for (const [, p] of room.players) { p.submitted = false; p.order = null; }

  if (gs.turn > MAX_TURNS) room.phase = 'finished';
}

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function findPlayerRoom(ws) {
  for (const [, room] of rooms) {
    if (room.players.has(ws)) return room;
  }
  return null;
}

function broadcastRoom(room) {
  const players = [];
  for (const [, p] of room.players) {
    players.push({ name: p.name, role: p.role, submitted: p.submitted });
  }

  for (const [ws, player] of room.players) {
    if (typeof ws === 'string') continue; // skip bot keys
    if (ws.readyState !== WebSocket.OPEN) continue;

    const gs = room.gameState;
    let gameState = null;
    if (gs && (room.phase === 'playing' || room.phase === 'finished')) {
      const myRole = player.role;
      const stations = {};
      for (const role of ROLES) {
        stations[role] = {
          stock: gs.stations[role].stock,
          backorder: gs.stations[role].backorder,
          cost: gs.stations[role].cost,
          incomingShipment: gs.stations[role].incomingShipment,
          incomingOrder: role === myRole ? gs.stations[role].incomingOrder : undefined,
        };
      }
      const submittedCount = [...room.players.values()].filter(p => p.submitted).length;
      gameState = {
        turn: gs.turn,
        maxTurns: gs.maxTurns,
        stations,
        customerDemand: myRole === 'restaurant' ? gs.customerDemand : undefined,
        lastDemand: gs.lastDemand,
        mySubmitted: player.submitted,
        submittedCount,
        totalPlayers: room.players.size,
        myRole,
      };
    }

    ws.send(JSON.stringify({
      type: 'room_update',
      room: {
        code: room.code,
        phase: room.phase,
        host: room.host,
        players,
        myRole: player.role,
        myName: player.name,
        gameState,
      }
    }));
  }
}

// ── WS event handlers ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const code = generateRoomCode();
        const name = (msg.name || 'Host').slice(0, 20);
        const room = { code, host: name, phase: 'lobby', players: new Map() };
        room.players.set(ws, { name, role: null, submitted: false, order: null });
        rooms.set(code, room);
        send(ws, { type: 'room_created', code });
        broadcastRoom(room);
        break;
      }
      case 'join_room': {
        const code = (msg.code || '').toUpperCase().trim();
        const name = (msg.name || 'Player').slice(0, 20);
        const room = rooms.get(code);
        if (!room) { send(ws, { type: 'error', message: 'Room not found' }); break; }
        if (!['lobby','role_select'].includes(room.phase)) { send(ws, { type: 'error', message: 'Game already started' }); break; }
        if (room.players.size >= 4) { send(ws, { type: 'error', message: 'Room is full' }); break; }
        room.players.set(ws, { name, role: null, submitted: false, order: null });
        broadcastRoom(room);
        break;
      }
      case 'choose_role': {
        const room = findPlayerRoom(ws);
        if (!room) break;
        const role = msg.role;
        if (!ROLES.includes(role)) break;
        for (const [, p] of room.players) {
          if (p.role === role) { send(ws, { type: 'error', message: 'Role already taken' }); return; }
        }
        room.players.get(ws).role = role;
        room.phase = 'role_select';
        broadcastRoom(room);
        break;
      }
      case 'start_game': {
        const room = findPlayerRoom(ws);
        if (!room) break;
        const player = room.players.get(ws);
        if (player.name !== room.host) { send(ws, { type: 'error', message: 'Only host can start' }); break; }
        const withRole = [...room.players.values()].filter(p => p.role).length;
        if (withRole === 0) { send(ws, { type: 'error', message: 'Pick a role first' }); break; }
        const takenRoles = new Set([...room.players.values()].map(p => p.role).filter(Boolean));
        for (const role of ROLES) {
          if (!takenRoles.has(role)) {
            room.players.set(`bot_${role}`, { name: `Bot (${ROLE_NAMES[role]})`, role, submitted: true, order: 4, isBot: true });
          }
        }
        room.phase = 'playing';
        room.gameState = initGameState();
        broadcastRoom(room);
        break;
      }
      case 'submit_order': {
        const room = findPlayerRoom(ws);
        if (!room || room.phase !== 'playing') break;
        const player = room.players.get(ws);
        if (!player || !player.role) break;
        player.order = Math.max(0, Math.min(99, parseInt(msg.order) || 0));
        player.submitted = true;
        const allSubmitted = [...room.players.values()].every(p => p.submitted);
        if (allSubmitted) advanceTurn(room);
        broadcastRoom(room);
        break;
      }
    }
  });

  ws.on('close', () => {
    const room = findPlayerRoom(ws);
    if (!room) return;
    room.players.delete(ws);
    if ([...room.players.keys()].filter(k => typeof k !== 'string').length === 0) {
      rooms.delete(room.code);
    } else {
      broadcastRoom(room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
