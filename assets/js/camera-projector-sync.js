/**
 * Camera → Projector PoC: phone webcam contours over WebRTC (PeerJS).
 * Projector: perspective warp with draggable corners.
 */
(function () {
  const GRID_W = 128;
  const GRID_H = 96;
  const SEND_FPS = 15;
  const GRADIENT_GAIN = 14;
  const PEER_HOST = '0.peerjs.com';
  const QR_CDN = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
  const CONN_OPTS = { reliable: true, serialization: 'binary' };
  const PEER_SCRIPT = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const DEFAULT_RELAY_PORT = 8765;

  /** LAN: STUN + прямые host-кандидаты в одной Wi‑Fi. VPN: + TURN и WS-relay. */
  const ICE_SERVERS_LAN = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const ICE_SERVERS_VPN = [
    ...ICE_SERVERS_LAN,
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];

  function peerJsOptions(networkMode) {
    return {
      host: PEER_HOST,
      port: 443,
      secure: true,
      path: '/',
      config: {
        iceServers: networkMode === 'vpn' ? ICE_SERVERS_VPN : ICE_SERVERS_LAN,
      },
    };
  }

  function parseNetworkMode(root) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('network');
    if (fromUrl === 'lan' || fromUrl === 'vpn') return fromUrl;
    const legacy = params.get('transport');
    if (legacy === 'webrtc') return 'lan';
    if (legacy === 'ws' || legacy === 'auto') return 'vpn';
    const checked = root?.querySelector('[name="cps-network"]:checked');
    if (checked?.value === 'lan' || checked?.value === 'vpn') return checked.value;
    return 'lan';
  }

  function isPrivateIp(ip) {
    if (!ip || ip.startsWith('127.')) return false;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    const m = ip.match(/^172\.(\d+)\./);
    return m && +m[1] >= 16 && +m[1] <= 31;
  }

  function isMdnsHost(host) {
    return typeof host === 'string' && host.endsWith('.local');
  }

  function hostFromIceLine(line) {
    if (!line || !line.includes(' typ host ')) return null;
    const parts = line.trim().split(/\s+/);
    const typIdx = parts.findIndex((p) => p === 'typ');
    if (typIdx < 5) return null;
    return parts[typIdx - 2];
  }

  function emptyIpResult() {
    return { ips: new Set(), mdns: new Set() };
  }

  function ingestIceCandidate(result, candidate) {
    if (!candidate) return;
    const addr = candidate.address || candidate.ip;
    if (addr) {
      if (isPrivateIp(addr)) result.ips.add(addr);
      else if (isMdnsHost(addr)) result.mdns.add(addr);
    }
    const line = candidate.candidate || '';
    if (!line) return;
    const host = hostFromIceLine(line);
    if (host) {
      if (isPrivateIp(host)) result.ips.add(host);
      else if (isMdnsHost(host)) result.mdns.add(host);
    }
    const found = line.match(/\b(\d+\.\d+\.\d+\.\d+)\b/g);
    if (found) found.forEach((ip) => { if (isPrivateIp(ip)) result.ips.add(ip); });
  }

  function finalizeIpResult(result) {
    const pageHost = window.location.hostname;
    if (isPrivateIp(pageHost)) result.ips.add(pageHost);
    return { ips: [...result.ips], mdns: [...result.mdns] };
  }

  function mergeIpResults(a, b) {
    return {
      ips: [...new Set([...(a.ips || []), ...(b.ips || [])])],
      mdns: [...new Set([...(a.mdns || []), ...(b.mdns || [])])],
    };
  }

  function gatherLocalIPs() {
    return new Promise((resolve) => {
      const result = emptyIpResult();
      if (!window.RTCPeerConnection) {
        resolve(finalizeIpResult(result));
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: [], iceCandidatePoolSize: 0 });
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { pc.close(); } catch (_) { /* ignore */ }
        resolve(finalizeIpResult(result));
      };
      pc.createDataChannel('cps-ip-probe');
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) {
          finish();
          return;
        }
        ingestIceCandidate(result, ev.candidate);
      };
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .catch(finish);
      setTimeout(finish, 5000);
    });
  }

  async function ipsFromRtcStats(pc) {
    const result = emptyIpResult();
    if (!pc?.getStats) return finalizeIpResult(result);
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type !== 'local-candidate' && report.type !== 'remote-candidate') return;
        const addr = report.address || report.ip;
        if (addr) {
          if (isPrivateIp(addr)) result.ips.add(addr);
          else if (isMdnsHost(addr)) result.mdns.add(addr);
        }
        if (report.candidateType === 'host' && report.protocol) {
          ingestIceCandidate(result, { candidate: `typ host ${addr || ''}`, address: addr });
        }
      });
    } catch (_) { /* ignore */ }
    return finalizeIpResult(result);
  }

  function peerConnectionFromConn(conn) {
    return conn?.peerConnection || conn?._pc || conn?._peerConnection || null;
  }

  async function ipsFromDataConnection(conn) {
    const pc = peerConnectionFromConn(conn);
    return pc ? ipsFromRtcStats(pc) : { ips: [], mdns: [] };
  }

  function formatIpList(result, roleLabel) {
    const ips = result?.ips || (Array.isArray(result) ? result : []);
    const mdns = result?.mdns || [];
    if (ips.length) return `${roleLabel}: ${ips.join(', ')}`;
    if (mdns.length) {
      return `${roleLabel}: ${mdns.join(', ')} · IP скрыт (mDNS). Смотрите Wi‑Fi → детали сети`;
    }
    return `${roleLabel}: IP недоступен в браузере на HTTPS · Wi‑Fi → детали сети на устройстве`;
  }

  function primaryIp(result) {
    return result?.ips?.[0] || null;
  }

  async function updateLocalIpsEl(el, roleLabel, conn) {
    if (!el) return { ips: [], mdns: [] };
    el.textContent = `${roleLabel}: определяем…`;
    let merged = await gatherLocalIPs();
    if (conn) {
      const fromConn = await ipsFromDataConnection(conn);
      merged = mergeIpResults(merged, fromConn);
    }
    el.textContent = formatIpList(merged, roleLabel);
    return merged;
  }

  function updateNetworkPanels(root, networkMode) {
    const lanPanel = root.querySelector('.cps-lan-panel');
    const vpnPanel = root.querySelector('.cps-vpn-panel');
    if (lanPanel) lanPanel.hidden = networkMode !== 'lan';
    if (vpnPanel) vpnPanel.hidden = networkMode !== 'vpn';
    root.querySelectorAll('[name="cps-network"]').forEach((el) => {
      el.checked = el.value === networkMode;
    });
  }

  function parseRelayParam() {
    return new URLSearchParams(window.location.search).get('relay') || '';
  }

  function normalizeRelayBase(relay) {
    let u = (relay || '').trim();
    if (!u) return '';
    if (u.startsWith('http://')) u = 'ws://' + u.slice(7);
    else if (u.startsWith('https://')) u = 'wss://' + u.slice(8);
    else if (!u.startsWith('ws')) u = 'ws://' + u;
    return u.replace(/\/$/, '');
  }

  function defaultRelayHint() {
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:${DEFAULT_RELAY_PORT}`;
  }

  function relayWsUrl(relayBase, room, role) {
    const base = normalizeRelayBase(relayBase);
    const url = new URL(base.includes('://') ? base : `ws://${base}`);
    url.searchParams.set('room', room);
    url.searchParams.set('role', role);
    return url.toString();
  }

  function applyFrameBytes(bytes) {
    if (!bytes || bytes.length < 2) return null;
    if (bytes.length >= 3 && bytes[0] === 0xff) return null;
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const view = new DataView(buf);
    const w = view.getUint8(0);
    const h = view.getUint8(1);
    const mode = view.byteLength > 2 + w * h ? view.getUint8(2) : 0;
    if (mode === 1) {
      return { frame: gradientToImageData(new Uint8Array(buf, 3), w, h), frameIsGradient: true };
    }
    return { frame: edgesToImageData(new Uint8Array(buf, 2), w, h), frameIsGradient: false };
  }

  function createWsTransport(relayBase, room, role, handlers) {
    let ws = null;
    const transport = {
      mode: 'ws-relay',
      get open() {
        return ws && ws.readyState === WebSocket.OPEN;
      },
      send(buf) {
        if (transport.open) ws.send(buf);
      },
      close() {
        try { ws?.close(); } catch (_) { /* ignore */ }
        ws = null;
      },
      connect() {
        return new Promise((resolve, reject) => {
          const url = relayWsUrl(relayBase, room, role);
          ws = new WebSocket(url);
          ws.binaryType = 'arraybuffer';
          const timer = setTimeout(() => reject(new Error('WebSocket relay timeout')), 12000);
          ws.onopen = () => {
            clearTimeout(timer);
            handlers.onOpen?.('ws-relay');
            resolve(transport);
          };
          ws.onmessage = (ev) => {
            if (ev.data instanceof ArrayBuffer) {
              handlers.onData(new Uint8Array(ev.data));
            }
          };
          ws.onclose = () => {
            handlers.onClose?.();
          };
          ws.onerror = () => {
            clearTimeout(timer);
            reject(new Error('WebSocket relay error'));
          };
        });
      },
    };
    return transport;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function loadPeerJs() {
    await loadScript(PEER_SCRIPT);
    if (!window.Peer) throw new Error('PeerJS не загрузился');
  }

  function waitConnOpen(conn, ms) {
    if (conn.open) return Promise.resolve(conn);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('open timeout')), ms);
      conn.on('open', () => {
        clearTimeout(timer);
        resolve(conn);
      });
      conn.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /** Phone: WebRTC к проектору (ICE зависит от режима сети). */
  async function connectPhoneWebrtc(room, networkMode, onStatus) {
    await loadPeerJs();
    const peer = await new Promise((resolve, reject) => {
      const p = new window.Peer(undefined, peerJsOptions(networkMode));
      p.on('open', () => resolve(p));
      p.on('error', reject);
    });

    const label = networkMode === 'lan' ? 'локальная сеть' : 'VPN + TURN';
    for (let i = 0; i < 6; i++) {
      if (onStatus) onStatus(`WebRTC (${label})… ${i + 1}/6`);
      try {
        const conn = peer.connect(room, CONN_OPTS);
        await waitConnOpen(conn, 12000);
        try { conn.send(new Uint8Array([0xff, 0, 0])); } catch (_) { /* ignore */ }
        return {
          mode: networkMode === 'lan' ? 'webrtc-lan' : 'webrtc-vpn',
          peer,
          conn,
          get open() { return conn.open; },
          send(buf) { conn.send(buf); },
          close() {
            try { conn.close(); } catch (_) { /* ignore */ }
            try { peer.destroy(); } catch (_) { /* ignore */ }
          },
        };
      } catch (_) {
        await sleep(2000);
      }
    }
    try { peer.destroy(); } catch (_) { /* ignore */ }
    throw new Error('WebRTC не подключился');
  }

  async function connectPhoneTransport(room, networkMode, relayBase, onStatus) {
    if (networkMode === 'lan') {
      const t = await connectPhoneWebrtc(room, 'lan', onStatus);
      onStatus?.('Канал: WebRTC (локальная сеть)');
      return t;
    }
    try {
      const t = await connectPhoneWebrtc(room, 'vpn', onStatus);
      onStatus?.('Канал: WebRTC + TURN');
      return t;
    } catch (_) {
      if (!relayBase) throw new Error('VPN: укажите relay ws://… и запустите cps-ws-relay.js');
      onStatus?.('WebRTC не вышел, пробуем WebSocket relay…');
      const t = createWsTransport(relayBase, room, 'phone', {});
      await t.connect();
      onStatus?.('Канал: WebSocket relay (VPN)');
      return t;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function randomRoomId() {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[(Math.random() * chars.length) | 0];
    return id;
  }

  function parseRole(root) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('role');
    if (fromUrl === 'projector' || fromUrl === 'phone') return fromUrl;
    if (root.dataset.role === 'projector' || root.dataset.role === 'phone') return root.dataset.role;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return mobile ? 'phone' : 'projector';
  }

  function parseRoom(root) {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || root.dataset.room || '';
  }

  function joinUrl(role, room) {
    const u = new URL(window.location.href);
    u.searchParams.set('role', role);
    u.searchParams.set('room', room);
    return u.toString();
  }

  /** Phone opens standalone PoC page when widget is embedded in a blog post. */
  function phoneJoinUrl(room, root, relayBase, networkMode) {
    const pocPage = root?.dataset?.phonePage;
    const network = networkMode || parseNetworkMode(root);
    const relay = network === 'vpn'
      ? (relayBase || parseRelayParam() || root?.querySelector('[data-cps-relay-url]')?.value?.trim() || '')
      : '';
    let u;
    if (pocPage) {
      u = new URL(pocPage, window.location.origin);
    } else {
      u = new URL(window.location.href);
    }
    u.searchParams.set('role', 'phone');
    u.searchParams.set('room', room);
    u.searchParams.set('network', network);
    u.searchParams.delete('transport');
    if (relay) u.searchParams.set('relay', normalizeRelayBase(relay));
    else u.searchParams.delete('relay');
    return u.toString();
  }

  async function renderQr(canvas, url) {
    if (!canvas || !url) return;
    await loadScript(QR_CDN);
    if (!window.QRCode?.toCanvas) {
      throw new Error('QRCode library unavailable');
    }
    await window.QRCode.toCanvas(canvas, url, {
      width: 160,
      margin: 1,
      color: { dark: '#222222', light: '#ffffff' },
    });
  }

  function grayscaleFromImageData(data, w, h) {
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      gray[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255;
    }
    return gray;
  }

  function sobelEdges(gray, w, h, threshold) {
    const out = new Uint8Array(w * h);
    const at = (yy, xx) => gray[(yy * w + xx)];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -at(y - 1, x - 1) - 2 * at(y, x - 1) - at(y + 1, x - 1) +
          at(y - 1, x + 1) + 2 * at(y, x + 1) + at(y + 1, x + 1);
        const gy =
          -at(y - 1, x - 1) - 2 * at(y - 1, x) - at(y - 1, x + 1) +
          at(y + 1, x - 1) + 2 * at(y + 1, x) + at(y + 1, x + 1);
        const mag = Math.min(255, Math.hypot(gx, gy) * 0.5);
        out[y * w + x] = mag > threshold ? 255 : 0;
      }
    }
    return out;
  }

  function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0;
    let g = 0;
    let b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
    }
    return [(r * 255) | 0, (g * 255) | 0, (b * 255) | 0];
  }

  /** Gradient field as heatmap: hue = direction, brightness = |∇I|. */
  function gradientHeatmap(gray, w, h, gain) {
    const out = new Uint8Array(w * h * 3);
    const gainMul = gain ?? GRADIENT_GAIN;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dx = gray[y * w + x + 1] - gray[y * w + x - 1];
        const dy = gray[(y + 1) * w + x] - gray[(y - 1) * w + x];
        const mag = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const hue = (angle + Math.PI) / (2 * Math.PI);
        const val = Math.min(1, mag * gainMul);
        const [rv, gv, bv] = hsvToRgb(hue, 0.92, Math.max(0.08, val));
        const i = (y * w + x) * 3;
        out[i] = rv;
        out[i + 1] = gv;
        out[i + 2] = bv;
      }
    }
    return out;
  }
  function packEdges(edges) {
    const buf = new ArrayBuffer(2 + edges.length);
    const view = new DataView(buf);
    view.setUint8(0, GRID_W);
    view.setUint8(1, GRID_H);
    new Uint8Array(buf, 2).set(edges);
    return buf;
  }

  function unpackEdges(buf) {
    const view = new DataView(buf);
    const w = view.getUint8(0);
    const h = view.getUint8(1);
    return { w, h, data: new Uint8Array(buf, 2) };
  }

  function packGradient(rgb) {
    const buf = new ArrayBuffer(3 + rgb.length);
    const view = new DataView(buf);
    view.setUint8(0, GRID_W);
    view.setUint8(1, GRID_H);
    view.setUint8(2, 1);
    new Uint8Array(buf, 3).set(rgb);
    return buf;
  }

  function unpackGradient(buf) {
    const view = new DataView(buf);
    const w = view.getUint8(0);
    const h = view.getUint8(1);
    return { w, h, mode: 'gradient', data: new Uint8Array(buf, 3) };
  }

  function edgesToImageData(edges, w, h) {
    const img = new ImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = edges[i];
      const o = i * 4;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = v ? 255 : 0;
    }
    return img;
  }

  function gradientToImageData(rgb, w, h) {
    const img = new ImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const s = i * 3;
      img.data[o] = rgb[s];
      img.data[o + 1] = rgb[s + 1];
      img.data[o + 2] = rgb[s + 2];
      img.data[o + 3] = 255;
    }
    return img;
  }

  function bilinear(tl, tr, br, bl, u, v) {
    const x = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
    const y = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;
    return { x, y };
  }

  function drawWarpedImage(ctx, sourceCanvas, corners, subdiv) {
    const { tl, tr, br, bl } = corners;
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    const n = subdiv || 16;

    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const u0 = ix / n;
        const u1 = (ix + 1) / n;
        const v0 = iy / n;
        const v1 = (iy + 1) / n;

        const p00 = bilinear(tl, tr, br, bl, u0, v0);
        const p10 = bilinear(tl, tr, br, bl, u1, v0);
        const p11 = bilinear(tl, tr, br, bl, u1, v1);
        const p01 = bilinear(tl, tr, br, bl, u0, v1);

        const sx = u0 * sw;
        const sy = v0 * sh;
        const swc = sw / n;
        const shc = sh / n;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.clip();

        const deltaX = p10.x - p00.x;
        const deltaY = p10.y - p00.y;
        const deltaX2 = p01.x - p00.x;
        const deltaY2 = p01.y - p00.y;
        ctx.transform(
          deltaX / swc,
          deltaY / swc,
          deltaX2 / shc,
          deltaY2 / shc,
          p00.x,
          p00.y
        );
        ctx.drawImage(sourceCanvas, sx, sy, swc, shc, 0, 0, swc, shc);
        ctx.restore();
      }
    }
  }

  function defaultCorners(w, h, margin) {
    const m = margin ?? Math.min(w, h) * 0.08;
    return {
      tl: { x: m, y: m },
      tr: { x: w - m, y: m },
      br: { x: w - m, y: h - m },
      bl: { x: m, y: h - m },
    };
  }

  function loadCorners(room) {
    try {
      const raw = localStorage.getItem(`cps-corners-${room}`);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveCorners(room, corners) {
    try {
      localStorage.setItem(`cps-corners-${room}`, JSON.stringify(corners));
    } catch (_) { /* ignore */ }
  }

  async function initProjector(root, room) {
    const projPanel = root.querySelector('.cps-panel-projector');
    const statusEl = projPanel?.querySelector('.cps-status') || root.querySelector('.cps-status');
    const roomEl = projPanel?.querySelector('.cps-room-id') || root.querySelector('.cps-room-id');
    const qrCanvas = projPanel?.querySelector('.cps-qr') || root.querySelector('.cps-qr');
    const linkEl = projPanel?.querySelector('.cps-join-link') || root.querySelector('.cps-join-link');
    const canvas = projPanel?.querySelector('.cps-projector-canvas') || root.querySelector('.cps-projector-canvas');
    const btnReset = projPanel?.querySelector('[data-cps-reset-corners]') || root.querySelector('[data-cps-reset-corners]');
    const btnFs = projPanel?.querySelector('[data-cps-fullscreen]') || root.querySelector('[data-cps-fullscreen]');
    const relayInput = projPanel?.querySelector('[data-cps-relay-url]') || root.querySelector('[data-cps-relay-url]');
    const channelEl = projPanel?.querySelector('.cps-channel') || root.querySelector('.cps-channel');
    const localIpsEl = projPanel?.querySelector('.cps-local-ips') || root.querySelector('.cps-local-ips');
    const networkSwitch = projPanel?.querySelector('.cps-network-switch') || root.querySelector('.cps-network-switch');

    let networkMode = parseNetworkMode(root);
    let relayBase = parseRelayParam() || relayInput?.value?.trim() || defaultRelayHint();
    let wsTransport = null;
    let projectorPeer = null;
    let activeConn = null;
    if (relayInput && !relayInput.value && networkMode === 'vpn') relayInput.value = relayBase;
    updateNetworkPanels(root, networkMode);

    updateLocalIpsEl(localIpsEl, 'Проектор').then((probe) => {
      const ip = primaryIp(probe);
      if (networkMode === 'lan' && ip && relayInput && !relayInput.value) {
        relayInput.placeholder = `ws://${ip}:${DEFAULT_RELAY_PORT}`;
      }
    });

    function setNetworkMode(mode) {
      networkMode = mode;
      updateNetworkPanels(root, mode);
      const url = new URL(window.location.href);
      url.searchParams.set('network', mode);
      url.searchParams.delete('transport');
      window.history.replaceState({}, '', url.toString());
      refreshPhoneLink();
      if (mode === 'vpn') {
        startWsRelay();
      } else if (wsTransport) {
        try { wsTransport.close(); } catch (_) { /* ignore */ }
        wsTransport = null;
        setChannel('');
      }
      startProjectorPeer();
    }

    networkSwitch?.querySelectorAll('[name="cps-network"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) setNetworkMode(radio.value);
      });
    });

    function ingestFrame(bytes) {
      const parsed = applyFrameBytes(bytes);
      if (!parsed) return;
      frame = parsed.frame;
      frameIsGradient = parsed.frameIsGradient;
      draw();
    }

    function setChannel(label) {
      if (channelEl) channelEl.textContent = label ? `Канал: ${label}` : '';
    }

    function refreshPhoneLink() {
      relayBase = relayInput?.value?.trim() || relayBase || defaultRelayHint();
      const phoneUrl = phoneJoinUrl(room, root, relayBase, networkMode);
      if (linkEl) {
        linkEl.href = phoneUrl;
        linkEl.textContent = phoneUrl;
      }
      if (qrCanvas) {
        renderQr(qrCanvas, phoneUrl).catch((err) => console.error(err));
      }
    }

    const ctx = canvas.getContext('2d');
    let corners = loadCorners(room) || defaultCorners(window.innerWidth, window.innerHeight);
    let drag = null;
    let frame = null;
    let frameIsGradient = true;
    let sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = GRID_W;
    sourceCanvas.height = GRID_H;
    const sourceCtx = sourceCanvas.getContext('2d');

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = root.classList.contains('cps-fullpage') ? window.innerWidth : canvas.parentElement.clientWidth;
      const h = root.classList.contains('cps-fullpage') ? window.innerHeight : Math.max(320, window.innerHeight * 0.55);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!loadCorners(room)) {
        corners = defaultCorners(w, h);
      }
      draw();
    }

    function draw() {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      if (frame) {
        sourceCtx.putImageData(frame, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        if (frameIsGradient) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else {
          ctx.globalCompositeOperation = 'screen';
          ctx.shadowColor = '#66e0ff';
          ctx.shadowBlur = 6;
        }
        drawWarpedImage(ctx, sourceCanvas, corners, 20);
        ctx.restore();
      } else {
        ctx.fillStyle = '#334';
        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ожидание кадра с телефона…', w / 2, h / 2);
      }

      const handleR = 10;
      ctx.strokeStyle = 'rgba(102, 224, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(corners.tl.x, corners.tl.y);
      ctx.lineTo(corners.tr.x, corners.tr.y);
      ctx.lineTo(corners.br.x, corners.br.y);
      ctx.lineTo(corners.bl.x, corners.bl.y);
      ctx.closePath();
      ctx.stroke();

      Object.entries(corners).forEach(([key, p]) => {
        ctx.fillStyle = drag === key ? '#43e97b' : '#667eea';
        ctx.beginPath();
        ctx.arc(p.x, p.y, handleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    function hitHandle(x, y) {
      const handleR = 14;
      for (const [key, p] of Object.entries(corners)) {
        if (Math.hypot(p.x - x, p.y - y) <= handleR) return key;
      }
      return null;
    }

    function canvasPos(evt) {
      const rect = canvas.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }

    canvas.addEventListener('mousedown', (e) => {
      const p = canvasPos(e);
      drag = hitHandle(p.x, p.y);
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const p = canvasPos(e);
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      corners[drag].x = Math.max(0, Math.min(w, p.x));
      corners[drag].y = Math.max(0, Math.min(h, p.y));
      draw();
    });
    window.addEventListener('mouseup', () => {
      if (drag) saveCorners(room, corners);
      drag = null;
    });

    btnReset?.addEventListener('click', () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      corners = defaultCorners(w, h);
      saveCorners(room, corners);
      draw();
    });

    btnFs?.addEventListener('click', () => {
      canvas.requestFullscreen?.().catch(() => {});
    });

    const phoneUrl = phoneJoinUrl(room, root, relayBase, networkMode);
    if (roomEl) roomEl.textContent = room;
    if (linkEl) {
      linkEl.href = phoneUrl;
      linkEl.textContent = phoneUrl;
    }
    relayInput?.addEventListener('change', refreshPhoneLink);
    relayInput?.addEventListener('input', refreshPhoneLink);
    try {
      await renderQr(qrCanvas, phoneUrl);
    } catch (err) {
      console.error(err);
      setStatus(`QR не загрузился: ${err.message}. Используйте ссылку ниже.`);
    }

    async function startWsRelay() {
      if (networkMode !== 'vpn' || !relayBase) return;
      try {
        wsTransport = createWsTransport(relayBase, room, 'projector', {
          onOpen: () => {
            setChannel('WebSocket relay');
            setStatus('Relay готов. Телефон может слать кадры (VPN).');
          },
          onData: (bytes) => {
            setStatus('Телефон подключён (relay). Тяните углы.');
            ingestFrame(bytes);
          },
          onClose: () => {
            setChannel('');
            setStatus('Relay отключён. Переподключение…');
            wsTransport = null;
            setTimeout(startWsRelay, 3000);
          },
        });
        await wsTransport.connect();
      } catch (err) {
        setStatus(`Relay: ${err.message}. Запустите node scripts/cps-ws-relay.js`);
        setTimeout(startWsRelay, 5000);
      }
    }

    setStatus('Подключение к сигнальному серверу PeerJS…');
    await loadPeerJs();
    if (networkMode === 'vpn') startWsRelay();

    function startProjectorPeer() {
      if (projectorPeer && !projectorPeer.destroyed) {
        try { projectorPeer.destroy(); } catch (_) { /* ignore */ }
      }
      activeConn = null;
      projectorPeer = new window.Peer(room, peerJsOptions(networkMode));

      projectorPeer.on('open', () => {
        const hint = networkMode === 'lan'
          ? 'Локальная сеть: телефон и ноутбук в одном Wi‑Fi. Отсканируйте QR.'
          : 'VPN: при сбое WebRTC запустите relay и укажите ws://IP:8765';
        setStatus(`Комната «${room}». ${hint}`);
      });
      projectorPeer.on('disconnected', () => {
        setStatus('Сигнализация потеряна. Переподключение PeerJS…');
        if (!projectorPeer.destroyed) projectorPeer.reconnect();
      });
      projectorPeer.on('error', (err) => {
        const t = err.type || err.message || String(err);
        if (t === 'server-error' && networkMode === 'vpn' && wsTransport?.open) {
          setStatus('PeerJS cloud недоступен — используйте WebSocket relay.');
        } else if (networkMode === 'lan') {
          setStatus(`PeerJS: ${t}. Убедитесь, что оба устройства в одной Wi‑Fi.`);
        } else {
          setStatus(`PeerJS: ${t}. Переключите «VPN / интернет» и настройте relay.`);
        }
      });

      projectorPeer.on('connection', (incoming) => {
        if (activeConn && activeConn !== incoming) {
          try { activeConn.close(); } catch (_) { /* ignore */ }
        }
        activeConn = incoming;

        incoming.on('open', () => {
          const ch = networkMode === 'lan' ? 'WebRTC (локальная сеть)' : 'WebRTC + TURN';
          setChannel(ch);
          setStatus('Телефон подключён. Тяните углы для совмещения с экраном.');
          updateLocalIpsEl(localIpsEl, 'Проектор', incoming);
          try {
            incoming.send(new Uint8Array([0xff, 0, 1]));
          } catch (_) { /* ignore */ }
        });

        incoming.on('data', (data) => {
          const bytes = data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : data instanceof Uint8Array
              ? data
              : null;
          setStatus('Телефон подключён (WebRTC). Тяните углы.');
          ingestFrame(bytes);
        });

        incoming.on('close', () => {
          if (activeConn === incoming) {
            activeConn = null;
            setStatus('Телефон отключился. Ждём повторное подключение…');
          }
        });
      });
    }

    startProjectorPeer();

    window.addEventListener('resize', resize);
    resize();
  }

  async function initPhone(root, room) {
    const phonePanel = root.querySelector('.cps-panel-phone');
    const statusEl = phonePanel?.querySelector('.cps-status') || root.querySelector('.cps-status');
    const preview = phonePanel?.querySelector('.cps-phone-preview') || root.querySelector('.cps-phone-preview');
    const btnStart = phonePanel?.querySelector('[data-cps-start]') || root.querySelector('[data-cps-start]');
    const btnStop = phonePanel?.querySelector('[data-cps-stop]') || root.querySelector('[data-cps-stop]');
    const modeSelect = phonePanel?.querySelector('[data-cps-mode]') || root.querySelector('[data-cps-mode]');
    const thresholdRange = phonePanel?.querySelector('[data-cps-threshold]') || root.querySelector('[data-cps-threshold]');
    const thresholdVal = phonePanel?.querySelector('[data-cps-threshold-val]') || root.querySelector('[data-cps-threshold-val]');

    if (!preview) {
      if (statusEl) statusEl.textContent = 'Ошибка: нет элемента превью камеры.';
      return;
    }

    const previewCtx = preview.getContext('2d');
    let stream = null;
    let video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    let procCanvas = document.createElement('canvas');
    procCanvas.width = GRID_W;
    procCanvas.height = GRID_H;
    const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });
    let transport = null;
    let running = false;
    let lastSend = 0;
    let raf = 0;

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg;
    }

    function setButtons(active) {
      if (btnStart) btnStart.disabled = active;
      if (btnStop) btnStop.disabled = !active;
    }

    thresholdRange?.addEventListener('input', () => {
      if (thresholdVal) thresholdVal.textContent = thresholdRange.value;
    });

    const networkModeEl = phonePanel?.querySelector('.cps-network-badge') || root.querySelector('.cps-network-badge');
    const localIpsEl = phonePanel?.querySelector('.cps-local-ips') || root.querySelector('.cps-local-ips');

    const networkMode = parseNetworkMode(root);
    const relayBase = networkMode === 'vpn'
      ? (parseRelayParam() || defaultRelayHint())
      : '';

    if (networkModeEl) {
      networkModeEl.textContent = networkMode === 'lan'
        ? 'Сеть: локальная Wi‑Fi (прямой P2P)'
        : 'Сеть: VPN / интернет (TURN + relay)';
    }
    updateLocalIpsEl(localIpsEl, 'Телефон');

    async function maintainTransport() {
      while (running) {
        if (transport?.open) {
          await sleep(2000);
          continue;
        }
        try {
          if (transport) {
            try { transport.close(); } catch (_) { /* ignore */ }
            transport = null;
          }
          transport = await connectPhoneTransport(room, networkMode, relayBase, setStatus);
          const modeLabel = transport.mode === 'ws-relay'
            ? 'WebSocket relay'
            : transport.mode === 'webrtc-lan'
              ? 'WebRTC (локальная сеть)'
              : 'WebRTC + TURN';
          setStatus(`Трансляция («${room}»). ${modeLabel}`);
          if (transport.conn) updateLocalIpsEl(localIpsEl, 'Телефон', transport.conn);
        } catch (err) {
          setStatus(`${err.message} Повтор через 3 с…`);
          await sleep(3000);
        }
      }
    }

    function sizePreviewCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = preview.getBoundingClientRect();
      const cssW = Math.max(rect.width, preview.clientWidth, 280);
      const cssH = Math.max(rect.height, 200, Math.min(window.innerHeight * 0.45, 360));
      preview.width = Math.round(cssW * dpr);
      preview.height = Math.round(cssH * dpr);
      preview.style.width = `${cssW}px`;
      preview.style.height = `${cssH}px`;
      previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawPreviewLoop() {
      if (!running) return;
      raf = requestAnimationFrame(drawPreviewLoop);
      if (!video.videoWidth) return;
      const pw = preview.width / (window.devicePixelRatio || 1);
      const ph = preview.height / (window.devicePixelRatio || 1);
      previewCtx.drawImage(video, 0, 0, pw, ph);
    }

    function processFrame() {
      if (!running) return;
      if (!video.videoWidth) return;

      const now = performance.now();
      if (now - lastSend < 1000 / SEND_FPS) return;
      lastSend = now;

      const pw = preview.width / (window.devicePixelRatio || 1);
      const ph = preview.height / (window.devicePixelRatio || 1);

      procCtx.drawImage(video, 0, 0, GRID_W, GRID_H);
      const img = procCtx.getImageData(0, 0, GRID_W, GRID_H);
      const gray = grayscaleFromImageData(img.data, GRID_W, GRID_H);
      const mode = modeSelect?.value || 'gradient';
      const sliderVal = Number(thresholdRange?.value || GRADIENT_GAIN);

      let payload;
      if (mode === 'edges') {
        const edges = sobelEdges(gray, GRID_W, GRID_H, sliderVal * 3);
        payload = packEdges(edges);
        procCtx.putImageData(edgesToImageData(edges, GRID_W, GRID_H), 0, 0);
      } else {
        const rgb = gradientHeatmap(gray, GRID_W, GRID_H, sliderVal);
        payload = packGradient(rgb);
        procCtx.putImageData(gradientToImageData(rgb, GRID_W, GRID_H), 0, 0);
      }

      previewCtx.drawImage(video, 0, 0, pw, ph);
      previewCtx.globalAlpha = 0.72;
      previewCtx.drawImage(procCanvas, 0, 0, pw, ph);
      previewCtx.globalAlpha = 1;

      if (transport?.open) {
        try {
          transport.send(payload);
        } catch (_) {
          transport = null;
        }
      }
    }

    function sendLoop() {
      if (!running) return;
      processFrame();
      setTimeout(sendLoop, 1000 / SEND_FPS);
    }

    btnStart?.addEventListener('click', async () => {
      if (!room) {
        setStatus('Нет room ID. Откройте ссылку с проектора.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Камера недоступна: нужен HTTPS и современный браузер.');
        return;
      }
      setStatus('Запрос камеры…');
      btnStart.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        await video.play();

        sizePreviewCanvas();
        running = true;
        setButtons(true);
        setStatus('Камера включена. Подключение к проектору…');
        drawPreviewLoop();
        sendLoop();
        maintainTransport();
      } catch (err) {
        running = false;
        setButtons(false);
        btnStart.disabled = false;
        setStatus(`Ошибка камеры: ${err.message || err.name || err}`);
      }
    });

    btnStop?.addEventListener('click', () => {
      running = false;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      transport?.close();
      transport = null;
      setButtons(false);
      previewCtx.clearRect(0, 0, preview.width, preview.height);
      setStatus('Остановлено.');
    });

    setButtons(false);
    setStatus(room ? `Комната «${room}». Нажмите «Старт».` : 'Нет room ID — откройте QR с проектора.');
  }

  async function initRoot(root) {
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    let room = parseRoom(root);
    const role = parseRole(root);

    if (role === 'projector' && !room) {
      room = randomRoomId();
    }
    if (role === 'projector') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', 'projector');
      url.searchParams.set('room', room);
      if (!url.searchParams.get('network')) url.searchParams.set('network', 'lan');
      url.searchParams.delete('transport');
      window.history.replaceState({}, '', url.toString());
    }

    root.dataset.role = role;
    root.dataset.room = room;

    const projPanel = root.querySelector('.cps-panel-projector');
    const phonePanel = root.querySelector('.cps-panel-phone');
    if (projPanel) projPanel.hidden = role !== 'projector';
    if (phonePanel) phonePanel.hidden = role !== 'phone';

    try {
      if (role === 'projector') {
        await initProjector(root, room);
      } else {
        await initPhone(root, room);
      }
    } catch (err) {
      const statusEl = root.querySelector('.cps-status');
      if (statusEl) statusEl.textContent = `Ошибка инициализации: ${err.message}`;
      console.error(err);
    }
  }

  function boot() {
    document.querySelectorAll('.camera-projector-sync-widget').forEach((el) => initRoot(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
