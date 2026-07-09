/**
 * Осцилляторные нейросети — набор p5.js-демо для статьи.
 * Каждый виджет монтируется по классу-обёртке и своему .od-host.
 *
 * Виджеты:
 *   .od-kuramoto-ring    — фазовое кольцо Курамото + order parameter
 *   .od-interference     — интерференционное поле волн (Abelian merge)
 *   .od-binding          — object binding через синхронизацию (AKOrN-стиль)
 *   .od-attn-compare     — softmax O(n²) vs резонанс O(n)
 *   .od-phase-learn      — phase locking как обучение (active inference)
 *   .od-action-energy    — action selection по энергии (Ed v1.0)
 *   .od-text-cluster     — кластеризация текста без эмбеддингов
 *   .od-assoc-memory     — ассоциативная память на фазах (Hopfield)
 *   .od-anomaly          — детектор аномалий во временном ряде
 *   .od-sequencer        — осцилляторный секвенсор (текст → звук)
 */
(function () {
  "use strict";

  if (typeof p5 === "undefined") return;

  const TAU = Math.PI * 2;
  const BG = [10, 15, 26];
  const PALETTE = [
    [34, 211, 238],
    [52, 211, 153],
    [167, 139, 250],
    [245, 158, 11],
    [239, 68, 68],
    [99, 102, 241],
    [236, 72, 153],
    [20, 184, 166],
  ];

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function hue2rgb(h) {
    const c = 1;
    const x = 1 - Math.abs(((h / 60) % 2) - 1);
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function tokenize(text, max) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, max || 12);
  }

  /** Create a p5 instance bound to root's .od-host; guards double-init. */
  function mount(root, factory) {
    if (root.dataset.odInit === "1") return;
    const host = root.querySelector(".od-host");
    if (!host) return;
    root.dataset.odInit = "1";
    const api = { root, host, q: (s) => root.querySelector(s), qa: (s) => root.querySelectorAll(s) };
    // eslint-disable-next-line no-new
    new p5((p) => factory(p, api), host);
  }

  function hostWidth(host, max) {
    return Math.min(max || 900, host.clientWidth || max || 900);
  }

  // ============================================================
  // 1. Фазовое кольцо Курамото + order parameter
  // ============================================================
  function kuramotoRing(p, { host, q }) {
    const N = 40;
    const oscs = [];
    let K = 1.5;
    let W = 900, H = 460;

    function reset() {
      oscs.length = 0;
      for (let i = 0; i < N; i++) {
        oscs.push({ theta: Math.random() * TAU, omega: 0.4 + Math.random() * 1.6 });
      }
    }

    const kEl = q("[data-k]");
    const kVal = q("[data-k-val]");
    const resetBtn = q("[data-reset]");
    if (kEl) { K = parseFloat(kEl.value); kEl.addEventListener("input", () => { K = parseFloat(kEl.value); if (kVal) kVal.textContent = K.toFixed(1); }); }
    resetBtn?.addEventListener("click", reset);

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); reset(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);

      // integrate
      const mean = orderParam();
      for (const o of oscs) o.theta += (o.omega + K * mean.r * Math.sin(mean.psi - o.theta)) * dt;

      const cx = W * 0.32, cy = H / 2, R = Math.min(cx, cy) - 60;
      p.noFill(); p.stroke(42, 53, 80); p.strokeWeight(1.5); p.circle(cx, cy, R * 2);

      for (const o of oscs) {
        const x = cx + Math.cos(o.theta) * R;
        const y = cy + Math.sin(o.theta) * R;
        const [r, g, b] = hue2rgb((o.omega / 2) * 280);
        p.noStroke(); p.fill(r, g, b, 220); p.circle(x, y, 11);
      }

      const m = orderParam();
      p.stroke(245, 158, 11); p.strokeWeight(3);
      p.line(cx, cy, cx + Math.cos(m.psi) * R * m.r, cy + Math.sin(m.psi) * R * m.r);
      p.fill(245, 158, 11); p.noStroke(); p.circle(cx + Math.cos(m.psi) * R * m.r, cy + Math.sin(m.psi) * R * m.r, 9);

      // readout panel
      const px = W * 0.66;
      p.fill(148, 163, 184); p.noStroke(); p.textFont("system-ui"); p.textAlign(p.LEFT, p.TOP); p.textSize(13);
      p.text("Order parameter", px, cy - 90);
      p.textSize(26); p.fill(245, 158, 11); p.text("r = " + m.r.toFixed(3), px, cy - 64);
      p.textSize(12); p.fill(148, 163, 184);
      p.text(m.r > 0.9 ? "Синхронизация (all in-phase)" : m.r < 0.3 ? "Инкогерентность" : "Частичный захват", px, cy - 28);

      // r bar
      p.fill(30, 41, 59); p.rect(px, cy + 6, 180, 14, 4);
      p.fill(52, 211, 153); p.rect(px, cy + 6, 180 * m.r, 14, 4);
      p.textSize(11); p.fill(100, 116, 139);
      p.text("K = " + K.toFixed(1) + "  ·  N = " + N + " осцилляторов", px, cy + 34);
      p.text("Цвет узла = собственная частота ω", px, cy + 54);
    };

    function orderParam() {
      let sx = 0, sy = 0;
      for (const o of oscs) { sx += Math.cos(o.theta); sy += Math.sin(o.theta); }
      sx /= oscs.length; sy /= oscs.length;
      return { r: Math.hypot(sx, sy), psi: Math.atan2(sy, sx) };
    }
  }

  // ============================================================
  // 2. Интерференционное поле волн
  // ============================================================
  function interference(p, { host, q }) {
    const sources = [];
    let W = 900, H = 460, t = 0;
    const GRID = 4;

    function addSource(x, y) {
      const h = sources.length;
      sources.push({ x, y, omega: 1.5 + (h % 3) * 0.7, phase: Math.random() * TAU, colorIdx: h % PALETTE.length });
    }
    function reset() { sources.length = 0; addSource(W * 0.35, H * 0.4); addSource(W * 0.6, H * 0.55); }

    q("[data-reset]")?.addEventListener("click", reset);
    q("[data-add]")?.addEventListener("click", () => addSource(W * (0.25 + Math.random() * 0.5), H * (0.25 + Math.random() * 0.5)));

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(1); reset(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.mousePressed = function () {
      if (p.mouseX >= 0 && p.mouseX <= W && p.mouseY >= 0 && p.mouseY <= H) addSource(p.mouseX, p.mouseY);
    };

    p.draw = function () {
      t += Math.min(p.deltaTime / 1000, 0.05);
      p.loadPixels();
      const d = p.pixelDensity();
      for (let y = 0; y < H; y += GRID) {
        for (let x = 0; x < W; x += GRID) {
          let sum = 0;
          for (const s of sources) {
            const dist = Math.hypot(x - s.x, y - s.y);
            sum += Math.sin(dist * 0.06 - t * s.omega * 2 + s.phase) * Math.exp(-dist * 0.004);
          }
          const v = sum / Math.max(1, sources.length);
          const cr = 12 + (v + 1) * 60;
          const cg = 18 + (v + 1) * 90;
          const cb = 30 + (v + 1) * 110;
          for (let yy = 0; yy < GRID && y + yy < H; yy++) {
            for (let xx = 0; xx < GRID && x + xx < W; xx++) {
              for (let py = 0; py < d; py++) {
                for (let px = 0; px < d; px++) {
                  const idx = 4 * (((y + yy) * d + py) * W * d + ((x + xx) * d + px));
                  p.pixels[idx] = cr; p.pixels[idx + 1] = cg; p.pixels[idx + 2] = cb; p.pixels[idx + 3] = 255;
                }
              }
            }
          }
        }
      }
      p.updatePixels();

      for (const s of sources) {
        const [r, g, b] = PALETTE[s.colorIdx];
        p.noStroke(); p.fill(r, g, b); p.circle(s.x, s.y, 12);
        p.fill(255); p.circle(s.x, s.y, 4);
      }
      p.fill(226, 232, 240); p.noStroke(); p.textFont("system-ui"); p.textSize(12); p.textAlign(p.LEFT, p.BOTTOM);
      p.text("Источников: " + sources.length + " · клик — добавить · Abelian merge: порядок добавления не меняет узор", 12, H - 10);
    };
  }

  // ============================================================
  // 3. Object binding через синхронизацию (AKOrN-стиль)
  // ============================================================
  function binding(p, { host, q }) {
    let W = 900, H = 460;
    const CELL = 14;
    let cols, rows;
    let grid = [];
    let scene = [];
    let K = 1.2;

    function makeScene() {
      // 2-3 фигуры-«объекта» с разной меткой
      scene = [
        { type: "rect", x: 0.22, y: 0.35, w: 0.18, h: 0.28, id: 1 },
        { type: "circle", x: 0.62, y: 0.4, r: 0.13, id: 2 },
        { type: "rect", x: 0.5, y: 0.72, w: 0.28, h: 0.12, id: 3 },
      ];
    }
    function labelAt(gx, gy) {
      const nx = gx / cols, ny = gy / rows;
      for (const s of scene) {
        if (s.type === "rect") {
          if (nx >= s.x - s.w / 2 && nx <= s.x + s.w / 2 && ny >= s.y - s.h / 2 && ny <= s.y + s.h / 2) return s.id;
        } else if (Math.hypot(nx - s.x, (ny - s.y)) < s.r) return s.id;
      }
      return 0;
    }
    function reset() {
      cols = Math.floor(W / CELL); rows = Math.floor(H / CELL);
      makeScene();
      grid = [];
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        grid.push({ gx, gy, label: labelAt(gx, gy), theta: Math.random() * TAU });
      }
    }
    q("[data-reset]")?.addEventListener("click", reset);
    const kEl = q("[data-k]"), kVal = q("[data-k-val]");
    if (kEl) { K = parseFloat(kEl.value); kEl.addEventListener("input", () => { K = parseFloat(kEl.value); if (kVal) kVal.textContent = K.toFixed(1); }); }

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(1); reset(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); reset(); };

    function at(gx, gy) { return (gx < 0 || gy < 0 || gx >= cols || gy >= rows) ? null : grid[gy * cols + gx]; }

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);
      // coupling: соседи одной метки тянутся, разные — отталкиваются
      for (const c of grid) {
        if (c.label === 0) continue;
        let force = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = at(c.gx + dx, c.gy + dy);
          if (!n || n.label === 0) continue;
          const sign = n.label === c.label ? 1 : -0.6;
          force += sign * Math.sin(n.theta - c.theta);
        }
        c._d = K * force;
      }
      for (const c of grid) if (c.label !== 0) c.theta += c._d * dt;

      for (const c of grid) {
        const x = c.gx * CELL, y = c.gy * CELL;
        if (c.label === 0) { p.noStroke(); p.fill(18, 24, 38); p.rect(x, y, CELL - 1, CELL - 1); continue; }
        const [r, g, b] = hue2rgb(((c.theta % TAU) / TAU) * 360);
        p.noStroke(); p.fill(r, g, b, 230); p.rect(x, y, CELL - 1, CELL - 1);
      }
      p.fill(226, 232, 240); p.noStroke(); p.textFont("system-ui"); p.textSize(12); p.textAlign(p.LEFT, p.BOTTOM);
      p.text("Цвет = фаза θ. Объекты синхронизируются внутри себя → «проявляются» без разметки (binding без slots)", 12, H - 8);
    };
  }

  // ============================================================
  // 4. Softmax O(n²) vs резонанс O(n)
  // ============================================================
  function attnCompare(p, { host, q }) {
    let W = 900, H = 420;
    let n = 8;
    let step = 0, t = 0;

    const nEl = q("[data-n]"), nVal = q("[data-n-val]");
    if (nEl) { n = parseInt(nEl.value, 10); nEl.addEventListener("input", () => { n = parseInt(nEl.value, 10); if (nVal) nVal.textContent = n; step = 0; }); }

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      t += Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);
      const halfW = W / 2;
      p.stroke(42, 53, 80); p.line(halfW, 20, halfW, H - 20);

      // LEFT: softmax matrix n×n
      p.fill(226, 232, 240); p.noStroke(); p.textFont("system-ui"); p.textAlign(p.CENTER, p.TOP); p.textSize(13);
      p.text("Softmax attention — O(n²)", halfW / 2, 14);
      const matSize = Math.min(halfW - 60, H - 90);
      const cell = matSize / n;
      const ox = halfW / 2 - matSize / 2, oy = 50;
      const filled = Math.min(n * n, Math.floor(step));
      let k = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const on = k < filled;
        p.noStroke();
        p.fill(on ? [99, 102, 241, 200] : [30, 41, 59, 120]);
        p.rect(ox + j * cell, oy + i * cell, cell - 1, cell - 1);
        k++;
      }
      p.fill(148, 163, 184); p.textSize(12); p.textAlign(p.CENTER, p.TOP);
      p.text("операций: " + (n * n) + "  ·  память: " + (n * n), halfW / 2, oy + matSize + 12);

      // RIGHT: linear wave
      p.fill(226, 232, 240); p.noStroke(); p.textSize(13); p.textAlign(p.CENTER, p.TOP);
      p.text("Резонанс / SRA — O(n)", halfW + halfW / 2, 14);
      const rx0 = halfW + 40, rx1 = W - 40, ry = 50;
      const lineFilled = Math.min(n, Math.floor(step / Math.max(1, n)));
      for (let i = 0; i < n; i++) {
        const x = rx0 + (rx1 - rx0) * (n === 1 ? 0.5 : i / (n - 1));
        const on = i < lineFilled;
        p.noStroke(); p.fill(on ? [52, 211, 153, 220] : [30, 41, 59, 150]);
        p.circle(x, ry + 30, 16);
      }
      // traveling wave
      p.noFill(); p.stroke(167, 139, 250, 200); p.strokeWeight(2);
      p.beginShape();
      for (let x = rx0; x < rx1; x += 3) {
        const ph = (x - rx0) * 0.05 - t * 3;
        p.vertex(x, ry + 90 + Math.sin(ph) * 22 * Math.min(1, lineFilled / Math.max(1, n)));
      }
      p.endShape();
      p.fill(148, 163, 184); p.noStroke(); p.textSize(12); p.textAlign(p.CENTER, p.TOP);
      p.text("операций: " + n + "  ·  память: const", halfW + halfW / 2, ry + 130);

      // growth comparison bars
      p.textAlign(p.LEFT, p.TOP); p.textSize(12); p.fill(100, 116, 139);
      p.text("n = " + n + " → softmax в " + n + "× дороже по памяти", 24, H - 40);

      step += p.deltaTime / 1000 * n * 4;
      if (step > n * n + n * 4) step = 0;
    };
  }

  // ============================================================
  // 5. Phase locking как обучение (active inference)
  // ============================================================
  function phaseLearn(p, { host, q }) {
    let W = 900, H = 420;
    const N = 24;
    let internal = [];
    let stimulus = 0.8;
    let feHistory = [];
    let K = 2.0;

    function reset() {
      internal = [];
      for (let i = 0; i < N; i++) internal.push({ theta: Math.random() * TAU, omega: 0.8 + Math.random() * 0.6 });
      feHistory = [];
    }
    q("[data-reset]")?.addEventListener("click", reset);
    q("[data-stim]")?.addEventListener("click", () => { stimulus = Math.random() * TAU; });

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); reset(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);

      // internal oscillators phase-lock to stimulus
      let fe = 0;
      for (const o of internal) {
        o.theta += (o.omega * 0.2 + K * Math.sin(stimulus - o.theta)) * dt;
        const diff = Math.atan2(Math.sin(stimulus - o.theta), Math.cos(stimulus - o.theta));
        fe += diff * diff;
      }
      fe /= internal.length;
      feHistory.push(fe); if (feHistory.length > 240) feHistory.shift();

      // draw internal ring
      const cx = W * 0.28, cy = H / 2, R = Math.min(cx, cy) - 50;
      p.noFill(); p.stroke(42, 53, 80); p.circle(cx, cy, R * 2);
      // stimulus marker
      p.stroke(245, 158, 11); p.strokeWeight(3);
      p.line(cx, cy, cx + Math.cos(stimulus) * R, cy + Math.sin(stimulus) * R);
      for (const o of internal) {
        const x = cx + Math.cos(o.theta) * R, y = cy + Math.sin(o.theta) * R;
        p.noStroke(); p.fill(34, 211, 238, 220); p.circle(x, y, 9);
      }
      p.fill(245, 158, 11); p.noStroke(); p.textFont("system-ui"); p.textSize(12); p.textAlign(p.CENTER, p.TOP);
      p.text("стимул (сенсор)", cx, cy + R + 12);

      // free energy plot
      const gx = W * 0.55, gy = 60, gw = W * 0.4, gh = H - 140;
      p.fill(148, 163, 184); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(13);
      p.text("Свободная энергия (рассогласование фаз)", gx, gy - 30);
      p.stroke(42, 53, 80); p.strokeWeight(1); p.line(gx, gy + gh, gx + gw, gy + gh); p.line(gx, gy, gx, gy + gh);
      p.noFill(); p.stroke(52, 211, 153); p.strokeWeight(2);
      p.beginShape();
      const maxFe = Math.PI * Math.PI / 2;
      feHistory.forEach((v, i) => { p.vertex(gx + (i / 240) * gw, gy + gh - Math.min(1, v / maxFe) * gh); });
      p.endShape();
      p.fill(52, 211, 153); p.noStroke(); p.textSize(20); p.textAlign(p.LEFT, p.TOP);
      p.text("F = " + fe.toFixed(3), gx, gy + gh + 14);
      p.fill(100, 116, 139); p.textSize(11);
      p.text("«Сменить стимул» → система переучивается без backprop", gx, gy + gh + 40);
    };
  }

  // ============================================================
  // 6. Action selection по энергии (Ed v1.0)
  // ============================================================
  function actionEnergy(p, { host, q }) {
    let W = 900, H = 420;
    const tools = [];
    const NAMES = ["search", "code", "recall", "plan", "ask"];
    const THRESH = 1;
    let flashIdx = -1, flashT = 0;

    function reset() {
      tools.length = 0;
      for (let i = 0; i < NAMES.length; i++) tools.push({ name: NAMES[i], prag: 0, inf: 0, colorIdx: i });
    }
    reset();
    q("[data-reset]")?.addEventListener("click", reset);
    q("[data-query]")?.addEventListener("click", () => {
      // новый запрос: раздать pragmatic energy
      for (const t of tools) t.prag += Math.random() * 0.35;
    });

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);

      // inference energy капает в фоне (reasoning cycle)
      for (const t of tools) {
        t.inf += (Math.random() - 0.42) * 0.12 * dt * 10;
        t.inf = Math.max(0, t.inf);
        const total = t.prag + t.inf;
        if (total >= THRESH && flashT <= 0) { flashIdx = tools.indexOf(t); flashT = 0.6; t.prag = 0; t.inf = 0; }
      }
      if (flashT > 0) flashT -= dt;

      const n = tools.length;
      const bw = W / n * 0.5;
      const gap = W / n;
      const baseY = H - 70;
      const maxH = H - 130;

      tools.forEach((t, i) => {
        const cx = gap * i + gap / 2;
        const total = t.prag + t.inf;
        const [r, g, b] = PALETTE[t.colorIdx];
        // pragmatic
        const ph = (t.prag / THRESH) * maxH;
        const ih = (t.inf / THRESH) * maxH;
        p.noStroke();
        p.fill(r, g, b, 150); p.rect(cx - bw / 2, baseY - ph, bw, ph);
        p.fill(245, 158, 11, 200); p.rect(cx - bw / 2, baseY - ph - ih, bw, ih);
        if (flashIdx === i && flashT > 0) { p.fill(255, 255, 255, flashT * 300); p.rect(cx - bw / 2, baseY - maxH, bw, maxH); }
        // threshold line
        p.stroke(239, 68, 68, 150); p.strokeWeight(1); p.line(cx - bw / 2 - 6, baseY - maxH, cx + bw / 2 + 6, baseY - maxH);
        p.noStroke(); p.fill(226, 232, 240); p.textFont("system-ui"); p.textAlign(p.CENTER, p.TOP); p.textSize(12);
        p.text(t.name, cx, baseY + 8);
        p.fill(148, 163, 184); p.textSize(10); p.text(total.toFixed(2), cx, baseY + 24);
      });
      p.fill(100, 116, 139); p.noStroke(); p.textAlign(p.LEFT, p.TOP); p.textSize(11);
      p.text("Порог = 1.0 · синий = Pragmatic (рефлекс) · оранжевый = Inference (рассуждение) · «Новый запрос» подкидывает энергию", 16, 14);
      p.text(flashIdx >= 0 && flashT > 0 ? "▶ сработал: " + tools[flashIdx].name : "ждём winner-take-all…", 16, 32);
    };
  }

  // ============================================================
  // 7. Кластеризация текста без эмбеддингов
  // ============================================================
  function textCluster(p, { host, q }) {
    let W = 900, H = 460;
    let words = [];
    let K = 1.6;

    function build(text) {
      const toks = tokenize(text, 24);
      words = toks.map((w, i) => {
        const h = hashStr(w);
        return { word: w, omega: 0.6 + ((h % 100) / 100) * 1.8, theta: Math.random() * TAU,
          x: 60 + Math.random() * (W - 120), y: 70 + Math.random() * (H - 140), colorIdx: h % PALETTE.length, i };
      });
    }
    const input = q("[data-input]");
    const rebuild = () => build(input ? input.value : "фаза волна резонанс синхронизация фаза волна нейрон спайк частота нейрон спайк");
    input?.addEventListener("change", rebuild);
    input?.addEventListener("keydown", (e) => { if (e.key === "Enter") rebuild(); });
    q("[data-reset]")?.addEventListener("click", rebuild);
    const kEl = q("[data-k]"), kVal = q("[data-k-val]");
    if (kEl) { K = parseFloat(kEl.value); kEl.addEventListener("input", () => { K = parseFloat(kEl.value); if (kVal) kVal.textContent = K.toFixed(1); }); }

    // coupling: одинаковые слова + общий корень (первые 3 буквы) сильнее
    function coup(a, b) {
      let k = 0.05;
      if (a.word === b.word) k += 0.9;
      if (a.word.slice(0, 3) === b.word.slice(0, 3)) k += 0.4;
      if (Math.abs(a.omega - b.omega) < 0.3) k += 0.2;
      return k;
    }

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); rebuild(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);
      for (const a of words) {
        let d = a.omega * 0.15;
        for (const b of words) if (a !== b) d += K * coup(a, b) * Math.sin(b.theta - a.theta);
        a._d = d;
      }
      for (const a of words) a.theta += a._d * dt;

      // draw links for in-phase pairs
      for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
        const c = Math.cos(words[i].theta - words[j].theta);
        if (c > 0.7) {
          p.stroke(52, 211, 153, (c - 0.7) * 400); p.strokeWeight(1);
          p.line(words[i].x, words[i].y, words[j].x, words[j].y);
        }
      }
      for (const a of words) {
        const [r, g, b] = hue2rgb(((a.theta % TAU) / TAU) * 360);
        p.noStroke(); p.fill(r, g, b, 230); p.circle(a.x, a.y, 12);
        p.fill(226, 232, 240, 200); p.textFont("system-ui"); p.textSize(11); p.textAlign(p.CENTER, p.TOP);
        p.text(a.word, a.x, a.y + 9);
      }
      p.fill(100, 116, 139); p.noStroke(); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(12);
      p.text("Слова с общим корнем синхронизируют фазу (цвет) → темы как phase-locked группы. Зелёные линии — in-phase.", 12, H - 8);
    };
  }

  // ============================================================
  // 8. Ассоциативная память на фазах (Hopfield)
  // ============================================================
  function assocMemory(p, { host, q }) {
    let W = 900, H = 460;
    const G = 10;
    let cellPx, ox, oy;
    const patterns = [];
    let osc = [];
    let mode = "idle"; // idle | relax

    function makePatterns() {
      patterns.length = 0;
      // T, L, O
      const T = grid(["1111111111","0000110000","0000110000","0000110000","0000110000","0000110000","0000110000","0000110000","0000000000","0000000000"]);
      const O = grid(["0011111100","0110000110","1100000011","1100000011","1100000011","1100000011","1100000011","1100000011","0110000110","0011111100"]);
      const X = grid(["1100000011","0110000110","0011001100","0001111000","0000110000","0001111000","0011001100","0110000110","1100000011","1000000001"]);
      patterns.push(T, O, X);
    }
    function grid(rows) {
      const a = [];
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) a.push(rows[y][x] === "1" ? 0 : Math.PI);
      return a;
    }
    function loadNoisy(idx) {
      const base = patterns[idx];
      osc = base.map((ph) => ({ theta: ph + (Math.random() - 0.5) * 2.4 }));
      mode = "relax"; target = idx;
    }
    let target = 0;

    makePatterns();
    q("[data-p0]")?.addEventListener("click", () => loadNoisy(0));
    q("[data-p1]")?.addEventListener("click", () => loadNoisy(1));
    q("[data-p2]")?.addEventListener("click", () => loadNoisy(2));
    q("[data-reset]")?.addEventListener("click", () => { osc = []; mode = "idle"; });

    p.setup = function () {
      W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      cellPx = Math.min((H - 60) / G, (W - 60) / G); ox = (W - cellPx * G) / 2; oy = 20;
      loadNoisy(0);
    };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); cellPx = Math.min((H - 60) / G, (W - 60) / G); ox = (W - cellPx * G) / 2; };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);
      if (mode === "relax" && osc.length) {
        // Hebbian coupling toward stored pattern (Hopfield on phases)
        const stored = patterns[target];
        for (let i = 0; i < osc.length; i++) {
          // pull toward stored relative phase using pattern as attractor
          osc[i].theta += 3.5 * Math.sin(stored[i] - osc[i].theta) * dt;
        }
      }
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
        const i = y * G + x;
        const ph = osc.length ? osc[i].theta : 0;
        const v = (Math.cos(ph) + 1) / 2; // in-phase(0)→1 bright
        p.noStroke(); p.fill(20 + v * 200, 30 + v * 200, 46 + v * 190);
        p.rect(ox + x * cellPx, oy + y * cellPx, cellPx - 2, cellPx - 2, 2);
      }
      p.fill(100, 116, 139); p.noStroke(); p.textFont("system-ui"); p.textAlign(p.CENTER, p.TOP); p.textSize(12);
      p.text("Зашумлённый ввод релаксирует к ближайшему запомненному паттерну (retrieval = скатывание в аттрактор)", W / 2, oy + cellPx * G + 8);
    };
  }

  // ============================================================
  // 9. Детектор аномалий во временном ряде
  // ============================================================
  function anomaly(p, { host, q }) {
    let W = 900, H = 420;
    const N = 16;
    let oscs = [];
    let series = [];
    let t = 0, phase = 0;
    let rHistory = [];
    let injectAnomaly = 0;

    function reset() {
      oscs = [];
      for (let i = 0; i < N; i++) oscs.push({ theta: Math.random() * TAU, omega: 1 + (Math.random() - 0.5) * 0.5 });
      series = []; rHistory = []; t = 0; injectAnomaly = 0;
    }
    reset();
    q("[data-reset]")?.addEventListener("click", reset);
    q("[data-inject]")?.addEventListener("click", () => { injectAnomaly = 1.0; });

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      t += dt; phase += dt * 3;
      p.background(...BG);

      // signal: regular sine + noise + optional anomaly burst
      let signal = Math.sin(phase);
      const anomalyActive = injectAnomaly > 0;
      if (anomalyActive) { signal += (Math.random() - 0.5) * 4 * injectAnomaly; injectAnomaly -= dt; }
      else signal += (Math.random() - 0.5) * 0.15;
      series.push(signal); if (series.length > 300) series.shift();

      // mutually-coupled oscillators self-synchronize when input is regular;
      // an anomaly injects per-oscillator random phase kicks → sync breaks.
      const Kc = 3.5;
      let sx0 = 0, sy0 = 0; for (const o of oscs) { sx0 += Math.cos(o.theta); sy0 += Math.sin(o.theta); }
      const psi = Math.atan2(sy0, sx0);
      const rNow = Math.hypot(sx0 / N, sy0 / N);
      for (const o of oscs) {
        o.theta += (o.omega + Kc * rNow * Math.sin(psi - o.theta)) * dt;
        if (anomalyActive) o.theta += (Math.random() - 0.5) * 6 * injectAnomaly * dt * 10;
      }
      let sx = 0, sy = 0; for (const o of oscs) { sx += Math.cos(o.theta); sy += Math.sin(o.theta); }
      const r = Math.hypot(sx / N, sy / N);
      rHistory.push(r); if (rHistory.length > 300) rHistory.shift();

      // draw signal
      const gy = 40, gh = 110;
      p.fill(148, 163, 184); p.noStroke(); p.textFont("system-ui"); p.textAlign(p.LEFT, p.TOP); p.textSize(12);
      p.text("Входной сигнал", 16, gy - 24);
      p.noFill(); p.stroke(34, 211, 238); p.strokeWeight(1.5); p.beginShape();
      series.forEach((v, i) => p.vertex(16 + (i / 300) * (W - 32), gy + gh / 2 - v * (gh / 4)));
      p.endShape();

      // draw order parameter (sync)
      const gy2 = 220, gh2 = 110;
      p.fill(148, 163, 184); p.noStroke(); p.text("Синхронизация r (детектор)", 16, gy2 - 24);
      p.stroke(42, 53, 80); p.line(16, gy2 + gh2, W - 16, gy2 + gh2);
      p.noFill(); p.stroke(r < 0.6 ? [239, 68, 68] : [52, 211, 153]); p.strokeWeight(2); p.beginShape();
      rHistory.forEach((v, i) => p.vertex(16 + (i / 300) * (W - 32), gy2 + gh2 - v * gh2));
      p.endShape();
      // threshold
      p.stroke(239, 68, 68, 120); p.strokeWeight(1); p.line(16, gy2 + gh2 - 0.6 * gh2, W - 16, gy2 + gh2 - 0.6 * gh2);
      p.fill(r < 0.6 ? [239, 68, 68] : [52, 211, 153]); p.noStroke(); p.textSize(18); p.textAlign(p.RIGHT, p.TOP);
      p.text((r < 0.6 ? "⚠ АНОМАЛИЯ" : "норма") + "  r=" + r.toFixed(2), W - 16, gy2 + gh2 + 8);
    };
  }

  // ============================================================
  // 10. Осцилляторный секвенсор (текст → звук)
  // ============================================================
  function sequencer(p, { host, q }) {
    let W = 900, H = 380;
    let notes = [];
    let audioCtx = null, master = null;
    let playing = false;
    let idx = 0, acc = 0;
    let K = 1.2;

    function build(text) {
      const toks = tokenize(text, 12);
      notes = toks.map((w) => {
        const h = hashStr(w);
        const freq = 220 * Math.pow(2, (h % 12) / 12); // note from chromatic scale
        return { word: w, freq, theta: Math.random() * TAU, omega: 0.8 + ((h % 5) / 5) * 1.2 };
      });
    }
    const input = q("[data-input]");
    const rebuild = () => build(input ? input.value : "осциллятор резонанс фаза волна синхрон");
    input?.addEventListener("change", rebuild);
    q("[data-reset]")?.addEventListener("click", rebuild);
    const kEl = q("[data-k]"), kVal = q("[data-k-val]");
    if (kEl) { K = parseFloat(kEl.value); kEl.addEventListener("input", () => { K = parseFloat(kEl.value); if (kVal) kVal.textContent = K.toFixed(1); }); }

    const playBtn = q("[data-play]");
    playBtn?.addEventListener("click", () => {
      if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); master = audioCtx.createGain(); master.gain.value = 0.12; master.connect(audioCtx.destination); }
      if (audioCtx.state === "suspended") audioCtx.resume();
      playing = !playing;
      playBtn.textContent = playing ? "⏸ Стоп" : "▶ Играть";
      playBtn.classList.toggle("active", playing);
    });

    function ping(freq, detune) {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = freq; osc.detune.value = detune;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      osc.connect(g); g.connect(master); osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }

    p.setup = function () { W = hostWidth(host, 900); p.createCanvas(W, H); p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); rebuild(); };
    p.windowResized = function () { W = hostWidth(host, 900); p.resizeCanvas(W, H); };

    p.draw = function () {
      const dt = Math.min(p.deltaTime / 1000, 0.05);
      p.background(...BG);
      // sync phases
      for (const a of notes) {
        let d = a.omega * 0.3;
        for (const b of notes) if (a !== b) d += K * 0.15 * Math.sin(b.theta - a.theta);
        a._d = d;
      }
      for (const a of notes) a.theta += a._d * dt;

      // sequencer step
      let flash = -1;
      if (playing && notes.length) {
        acc += dt;
        if (acc > 0.4) {
          acc = 0;
          const note = notes[idx % notes.length];
          // detune by phase misalignment → beats when out of sync
          const meanTheta = Math.atan2(notes.reduce((s, n) => s + Math.sin(n.theta), 0), notes.reduce((s, n) => s + Math.cos(n.theta), 0));
          const detune = Math.sin(note.theta - meanTheta) * 60;
          ping(note.freq, detune);
          flash = idx % notes.length;
          idx++;
        }
      }

      const n = notes.length;
      const gap = W / Math.max(1, n);
      notes.forEach((note, i) => {
        const cx = gap * i + gap / 2, cy = H / 2;
        const [r, g, b] = hue2rgb(((note.theta % TAU) / TAU) * 360);
        const active = (playing && (idx - 1) % n === i);
        p.noStroke(); p.fill(r, g, b, active ? 255 : 170); p.circle(cx, cy, active ? 40 : 30);
        // phasor
        p.stroke(255, 255, 255, 180); p.strokeWeight(2);
        p.line(cx, cy, cx + Math.cos(note.theta) * 14, cy + Math.sin(note.theta) * 14);
        p.noStroke(); p.fill(226, 232, 240, 200); p.textFont("system-ui"); p.textSize(11); p.textAlign(p.CENTER, p.TOP);
        p.text(note.word, cx, cy + 26);
        p.fill(100, 116, 139); p.textSize(9); p.text(Math.round(note.freq) + "Гц", cx, cy + 40);
      });
      p.fill(100, 116, 139); p.noStroke(); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(12);
      p.text("Синхрон → консонанс; рассинхрон → биения (detune ∝ разности фаз). Наведите K, чтобы сблизить.", 12, H - 8);
    };
  }

  // ============================================================
  // Регистрация
  // ============================================================
  const REGISTRY = [
    [".od-kuramoto-ring", kuramotoRing],
    [".od-interference", interference],
    [".od-binding", binding],
    [".od-attn-compare", attnCompare],
    [".od-phase-learn", phaseLearn],
    [".od-action-energy", actionEnergy],
    [".od-text-cluster", textCluster],
    [".od-assoc-memory", assocMemory],
    [".od-anomaly", anomaly],
    [".od-sequencer", sequencer],
  ];

  function init() {
    for (const [sel, factory] of REGISTRY) {
      document.querySelectorAll(sel).forEach((root) => mount(root, factory));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
