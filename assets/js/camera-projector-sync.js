/**
 * Camera → Projector PoC: phone webcam contours over WebRTC (PeerJS).
 * Projector: perspective warp with draggable corners.
 */
(function () {
  const ROOT_ID = 'camera-projector-sync';
  const FULLPAGE_ID = 'camera-projector-sync-fullpage';
  const GRID_W = 96;
  const GRID_H = 72;
  const SEND_FPS = 12;
  const PEER_HOST = '0.peerjs.com';

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

  function gradientField(gray, w, h) {
    const out = new Uint8Array(w * h * 3);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dx = gray[y * w + x + 1] - gray[y * w + x - 1];
        const dy = gray[(y + 1) * w + x] - gray[(y - 1) * w + x];
        const i = (y * w + x) * 3;
        out[i] = Math.min(255, Math.abs(dx) * 600);
        out[i + 1] = Math.min(255, Math.abs(dy) * 600);
        out[i + 2] = Math.min(255, Math.hypot(dx, dy) * 420);
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
      img.data[o + 3] = Math.max(rgb[s], rgb[s + 1], rgb[s + 2]) > 8 ? 220 : 0;
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
    const statusEl = root.querySelector('.cps-status');
    const roomEl = root.querySelector('.cps-room-id');
    const qrCanvas = root.querySelector('.cps-qr');
    const linkEl = root.querySelector('.cps-join-link');
    const canvas = root.querySelector('.cps-projector-canvas');
    const btnReset = root.querySelector('[data-cps-reset-corners]');
    const btnFs = root.querySelector('[data-cps-fullscreen]');

    const ctx = canvas.getContext('2d');
    let corners = loadCorners(room) || defaultCorners(window.innerWidth, window.innerHeight);
    let drag = null;
    let frame = null;
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
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = '#66e0ff';
        ctx.shadowBlur = 6;
        drawWarpedImage(ctx, sourceCanvas, corners, 18);
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

    const phoneUrl = joinUrl('phone', room);
    if (roomEl) roomEl.textContent = room;
    if (linkEl) {
      linkEl.href = phoneUrl;
      linkEl.textContent = phoneUrl;
    }
    if (qrCanvas && window.QRCode) {
      window.QRCode.toCanvas(qrCanvas, phoneUrl, { width: 160, margin: 1, color: { dark: '#222', light: '#fff' } });
    }

    setStatus('Подключение к сигнальному серверу PeerJS…');
    await loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js');

    const peer = new window.Peer(room, {
      host: PEER_HOST,
      port: 443,
      secure: true,
      path: '/',
    });

    peer.on('open', () => setStatus(`Комната «${room}». Отсканируйте QR на телефоне.`));
    peer.on('error', (err) => setStatus(`PeerJS: ${err.type || err.message}`));

    peer.on('connection', (conn) => {
      setStatus('Телефон подключён. Тяните углы для совмещения с экраном.');
      conn.on('data', (data) => {
        if (!(data instanceof ArrayBuffer)) return;
        const view = new DataView(data);
        const w = view.getUint8(0);
        const h = view.getUint8(1);
        const mode = view.byteLength > 2 + w * h ? view.getUint8(2) : 0;
        if (mode === 1) {
          frame = gradientToImageData(new Uint8Array(data, 3), w, h);
        } else {
          frame = edgesToImageData(new Uint8Array(data, 2), w, h);
        }
        draw();
      });
      conn.on('close', () => setStatus('Телефон отключился.'));
    });

    window.addEventListener('resize', resize);
    resize();
  }

  async function initPhone(root, room) {
    const statusEl = root.querySelector('.cps-status');
    const preview = root.querySelector('.cps-phone-preview');
    const btnStart = root.querySelector('[data-cps-start]');
    const btnStop = root.querySelector('[data-cps-stop]');
    const modeSelect = root.querySelector('[data-cps-mode]');
    const thresholdRange = root.querySelector('[data-cps-threshold]');
    const thresholdVal = root.querySelector('[data-cps-threshold-val]');

    const previewCtx = preview.getContext('2d');
    let stream = null;
    let video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    let procCanvas = document.createElement('canvas');
    procCanvas.width = GRID_W;
    procCanvas.height = GRID_H;
    const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });
    let conn = null;
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

    async function connectPeer() {
      await loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js');
      return new Promise((resolve, reject) => {
        const peer = new window.Peer(undefined, {
          host: PEER_HOST,
          port: 443,
          secure: true,
          path: '/',
        });
        peer.on('error', (err) => reject(err));
        peer.on('open', () => {
          const c = peer.connect(room, { reliable: false });
          c.on('open', () => resolve(c));
          c.on('error', reject);
        });
      });
    }

    function processFrame() {
      if (!running) return;
      raf = requestAnimationFrame(processFrame);
      if (!video.videoWidth) return;

      const now = performance.now();
      if (now - lastSend < 1000 / SEND_FPS) return;
      lastSend = now;

      const pw = preview.width;
      const ph = preview.height;
      previewCtx.drawImage(video, 0, 0, pw, ph);

      procCtx.drawImage(video, 0, 0, GRID_W, GRID_H);
      const img = procCtx.getImageData(0, 0, GRID_W, GRID_H);
      const gray = grayscaleFromImageData(img.data, GRID_W, GRID_H);
      const mode = modeSelect?.value || 'edges';
      const threshold = Number(thresholdRange?.value || 48);

      let payload;
      if (mode === 'gradient') {
        const rgb = gradientField(gray, GRID_W, GRID_H);
        payload = packGradient(rgb);
        const overlay = gradientToImageData(rgb, GRID_W, GRID_H);
        procCtx.putImageData(overlay, 0, 0);
      } else {
        const edges = sobelEdges(gray, GRID_W, GRID_H, threshold);
        payload = packEdges(edges);
        procCtx.putImageData(edgesToImageData(edges, GRID_W, GRID_H), 0, 0);
      }

      previewCtx.globalAlpha = 0.55;
      previewCtx.drawImage(procCanvas, 0, 0, pw, ph);
      previewCtx.globalAlpha = 1;

      if (conn?.open) {
        try {
          conn.send(payload);
        } catch (_) { /* drop frame */ }
      }
    }

    btnStart?.addEventListener('click', async () => {
      if (!room) {
        setStatus('Нет room ID. Откройте ссылку с проектора.');
        return;
      }
      setStatus('Запрос камеры…');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();

        const dpr = window.devicePixelRatio || 1;
        const rect = preview.getBoundingClientRect();
        preview.width = rect.width * dpr;
        preview.height = rect.height * dpr;
        preview.style.width = `${rect.width}px`;
        preview.style.height = `${rect.height}px`;
        previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        setStatus('Подключение к проектору…');
        conn = await connectPeer();
        running = true;
        setButtons(true);
        setStatus(`Трансляция в комнату «${room}». Наведите камеру на объект.`);
        processFrame();
      } catch (err) {
        setStatus(`Ошибка: ${err.message || err.type || err}`);
      }
    });

    btnStop?.addEventListener('click', () => {
      running = false;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      conn?.close();
      conn = null;
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
      const url = joinUrl('projector', room);
      window.history.replaceState({}, '', url);
    }

    root.dataset.role = role;
    root.dataset.room = room;

    const projPanel = root.querySelector('.cps-panel-projector');
    const phonePanel = root.querySelector('.cps-panel-phone');
    if (projPanel) projPanel.hidden = role !== 'projector';
    if (phonePanel) phonePanel.hidden = role !== 'phone';

    try {
      if (role === 'projector') {
        await loadScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js');
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
    [ROOT_ID, FULLPAGE_ID].forEach((id) => {
      const el = document.getElementById(id);
      if (el) initRoot(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
