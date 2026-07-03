/**
 * Criticality avalanche grid — signal propagation on a square lattice.
 * σ (branching ratio) controls sub / critical / supercritical regimes.
 */
(function () {
  const ROOT_ID = 'criticality-grid-widget';
  const CANVAS_ID = 'criticality-grid-canvas';

  const S = { REST: 0, EX: 1, ACT: 2, REF: 3 };
  const SIGMAS = { subcritical: 0.6, critical: 1.0, supercritical: 1.5 };

  const COLORS = {
    rest: '#eef0f4',
    restStroke: '#dde1e8',
    ex: '#b8f0d8',
    act: ['#667eea', '#5bc9a8', '#43e97b'],
    ref: '#3a3a48',
    bg: '#fafbfd',
    grid: 'rgba(102, 126, 234, 0.07)',
    arrow: 'rgba(67, 233, 123, 0.22)',
    arrowSuper: 'rgba(250, 112, 154, 0.28)',
  };

  function init() {
    const root = document.getElementById(ROOT_ID);
    const canvas = document.getElementById(CANVAS_ID);
    if (!root || !canvas || root.dataset.initialized === 'true') return;

    root.dataset.initialized = 'true';
    const ctx = canvas.getContext('2d');

    const COLS = 42;
    const ROWS = 26;

    let mode = 'critical';
    let speedVal = 3;
    let biasVal = 0.7;
    let cells = [];
    let avaCount = 0;
    let curAva = 0;
    let lastAvaSize = 0;
    let tick = 0;
    let W = 0;
    let H = 0;
    let cellSize = 0;
    let animId = 0;
    let lastTime = 0;
    let frontHistory = [];

    const $ = (sel) => root.querySelector(sel);

    function resize() {
      const parentW = root.querySelector('.criticality-canvas-wrap')?.offsetWidth || root.offsetWidth || 620;
      cellSize = Math.max(8, Math.floor(parentW / COLS));
      W = cellSize * COLS;
      H = cellSize * ROWS;
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    }

    function initGrid() {
      cells = [];
      for (let r = 0; r < ROWS; r++) {
        cells[r] = [];
        for (let c = 0; c < COLS; c++) {
          cells[r][c] = { state: S.REST, timer: 0 };
        }
      }
    }

    function resetMetrics() {
      avaCount = 0;
      curAva = 0;
      lastAvaSize = 0;
      frontHistory = [];
      tick = 0;
      $('#crit-ava-count').textContent = '0';
      $('#crit-ava-size').textContent = '—';
      $('#crit-wave-speed').textContent = '—';
      $('#crit-wave-bar').style.width = '0%';
      $('#crit-active-count').textContent = '0';
    }

    function seedLeft() {
      const r = Math.floor(Math.random() * ROWS);
      if (cells[r][0].state === S.REST) {
        cells[r][0].state = S.EX;
        cells[r][0].timer = 1;
        curAva = 1;
      }
    }

    function computeWeight(dr, dc) {
      if (dc === 1 && dr === 0) return biasVal;
      if (dc === 1 && dr !== 0) return biasVal * 0.5;
      if (dc === 0) return (1 - biasVal) * 0.4;
      if (dc === -1) return (1 - biasVal) * 0.1;
      return 0.05;
    }

    function step() {
      const sigma = SIGMAS[mode];
      const next = cells.map((row) => row.map((c) => ({ ...c })));
      let active = 0;
      let avaActive = false;
      let totalActiveCol = 0;
      let activeCount = 0;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = cells[r][c];
          if (cell.state === S.EX) {
            next[r][c].state = S.ACT;
            next[r][c].timer = 2;
            active++;
            avaActive = true;
            totalActiveCol += c;
            activeCount++;
            const nbrs = [
              [-1, -1], [-1, 0], [-1, 1],
              [0, -1], [0, 1],
              [1, -1], [1, 0], [1, 1],
            ];
            nbrs.forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && cells[nr][nc].state === S.REST) {
                const w = computeWeight(dr, dc);
                const prob = (sigma * w) / 1.5;
                if (Math.random() < prob) {
                  next[nr][nc].state = S.EX;
                  next[nr][nc].timer = 1;
                  curAva++;
                }
              }
            });
          } else if (cell.state === S.ACT) {
            next[r][c].state = S.REF;
            next[r][c].timer = 3 + Math.floor(Math.random() * 3);
            active++;
          } else if (cell.state === S.REF) {
            next[r][c].timer--;
            if (next[r][c].timer <= 0) next[r][c].state = S.REST;
            active++;
          }
        }
      }

      if (!avaActive && curAva > 2) {
        avaCount++;
        lastAvaSize = curAva;
        $('#crit-ava-count').textContent = String(avaCount);
        $('#crit-ava-size').textContent = String(lastAvaSize);
        curAva = 0;
      }

      if (activeCount > 0) {
        const avgCol = totalActiveCol / activeCount;
        frontHistory.push(avgCol);
        if (frontHistory.length > 20) frontHistory.shift();
        if (frontHistory.length > 4) {
          const spd = (
            (frontHistory[frontHistory.length - 1] - frontHistory[0]) /
            frontHistory.length
          ).toFixed(1);
          $('#crit-wave-speed').textContent = `${spd} кл/т`;
        }
        const pct = Math.min(100, Math.round((avgCol / COLS) * 100));
        $('#crit-wave-bar').style.width = `${pct}%`;
      }

      $('#crit-active-count').textContent = String(active);
      cells = next;
    }

    function draw() {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * cellSize;
          const y = r * cellSize;
          const s = cells[r][c].state;
          const pad = 1;

          if (s === S.REST) {
            ctx.fillStyle = COLORS.rest;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = COLORS.restStroke;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
          } else if (s === S.EX) {
            ctx.fillStyle = COLORS.ex;
            ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
          } else if (s === S.ACT) {
            const t = (r + c + tick) % COLORS.act.length;
            ctx.fillStyle = COLORS.act[t];
            ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
          } else {
            ctx.fillStyle = COLORS.ref;
            ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
          }
        }
      }

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c += 6) {
        ctx.beginPath();
        ctx.moveTo(c * cellSize, 0);
        ctx.lineTo(c * cellSize, H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r += 5) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellSize);
        ctx.lineTo(W, r * cellSize);
        ctx.stroke();
      }

      const arrowColor = mode === 'supercritical' ? COLORS.arrowSuper : COLORS.arrow;
      if (biasVal > 0.25) {
        ctx.strokeStyle = arrowColor;
        ctx.lineWidth = 1.5;
        const stepY = cellSize * 5;
        for (let y = stepY; y < H; y += stepY) {
          ctx.beginPath();
          ctx.moveTo(cellSize, y);
          ctx.lineTo(W - cellSize, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(W - cellSize * 3, y - 5);
          ctx.lineTo(W - cellSize, y);
          ctx.lineTo(W - cellSize * 3, y + 5);
          ctx.stroke();
        }
      }

      ctx.fillStyle = 'rgba(102, 126, 234, 0.85)';
      ctx.font = `600 ${Math.max(10, cellSize - 2)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('in', cellSize * 1.5, H / 2);
      ctx.fillStyle = 'rgba(67, 233, 123, 0.9)';
      ctx.fillText('out', W - cellSize * 1.5, H / 2);
    }

    function setMode(next) {
      mode = next;
      $('#crit-sigma-val').textContent = SIGMAS[mode].toFixed(2);
      root.querySelectorAll('[data-crit-mode]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.critMode === mode);
      });
      resetMetrics();
      initGrid();
      seedLeft();
    }

    function loop(ts) {
      animId = requestAnimationFrame(loop);
      const interval = 180 / speedVal;
      if (ts - lastTime < interval) return;
      lastTime = ts;
      tick++;
      const seedInterval = Math.max(2, Math.floor(12 / speedVal));
      if (tick % seedInterval === 0) seedLeft();
      step();
      draw();
    }

    root.querySelectorAll('[data-crit-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.critMode));
    });

    $('#crit-speed').addEventListener('input', (e) => {
      speedVal = Number(e.target.value);
    });

    $('#crit-bias').addEventListener('input', (e) => {
      biasVal = Number(e.target.value) / 100;
      $('#crit-bias-out').textContent = `${e.target.value}%`;
    });

    window.addEventListener('resize', () => {
      resize();
      draw();
    });

    resize();
    setMode('critical');
    animId = requestAnimationFrame(loop);

    root._critDestroy = () => cancelAnimationFrame(animId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
