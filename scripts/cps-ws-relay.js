#!/usr/bin/env node
/**
 * WebSocket relay for Camera → Projector PoC (VPN / symmetric NAT fallback).
 * Usage: node scripts/cps-ws-relay.js [port]
 *        npm install ws   (once, in repo root)
 *
 * Phone and projector both connect outbound to this server.
 */
'use strict';

let WebSocketServer;
try {
  WebSocketServer = require('ws').WebSocketServer;
} catch {
  console.error('Установите ws: npm install ws');
  process.exit(1);
}

const PORT = Number(process.argv[2]) || 8765;
/** @type {Map<string, { phone?: import('ws').WebSocket, projector?: import('ws').WebSocket }>} */
const rooms = new Map();

function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, {});
  return rooms.get(id);
}

function parseQuery(req) {
  const q = (req.url || '').split('?')[1] || '';
  return new URLSearchParams(q);
}

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

wss.on('connection', (ws, req) => {
  const params = parseQuery(req);
  const room = params.get('room');
  const role = params.get('role');
  if (!room || !/^[a-z0-9]{4,12}$/i.test(room)) {
    ws.close(4000, 'bad room');
    return;
  }
  if (role !== 'phone' && role !== 'projector') {
    ws.close(4000, 'bad role');
    return;
  }

  const slot = getRoom(room);
  if (slot[role]) {
    try { slot[role].close(4001, 'replaced'); } catch (_) { /* ignore */ }
  }
  slot[role] = ws;
  ws.send(JSON.stringify({ type: 'joined', room, role }));

  ws.on('message', (data, isBinary) => {
    if (!isBinary) return;
    const peer = role === 'phone' ? slot.projector : slot.phone;
    if (peer && peer.readyState === 1) {
      peer.send(data, { binary: true });
    }
  });

  ws.on('close', () => {
    if (slot[role] === ws) slot[role] = undefined;
    if (!slot.phone && !slot.projector) rooms.delete(room);
  });
});

console.log(`CPS WebSocket relay on ws://0.0.0.0:${PORT}`);
console.log('Projector URL: ?role=projector&room=ROOM&transport=auto&relay=ws://HOST:' + PORT);
console.log('Phone scans QR or adds same relay= param.');
