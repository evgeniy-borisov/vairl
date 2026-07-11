/**
 * Interactive Gantt-style concurrency demos for the Python async evolution article.
 * Shared visual language: solid = CPU work, striped = I/O wait, gray = overhead,
 * dashed = queued. Bottom occupancy row shows who owns the thread / GIL / loop.
 */
(function () {
  'use strict';

  const TASKS = [
    { label: 'LLM', color: '#667eea' },
    { label: 'Поиск', color: '#22a06b' },
    { label: 'Календарь', color: '#e67e22' },
  ];
  const RACE_TASKS = [
    { label: 'LLM', color: '#667eea' },
    { label: 'Поиск', color: '#22a06b' },
    { label: 'Policy', color: '#d3548c' },
  ];

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    const val = (name, fallback) => (styles.getPropertyValue(name).trim() || fallback);
    return {
      bg: val('--widget-canvas-bg', '#fafbfd'),
      panel: val('--widget-header', '#f7f7f9'),
      text: val('--text', '#111111'),
      muted: val('--text-muted', '#666666'),
      border: val('--border', '#e5e5e5'),
      accent: val('--accent', '#667eea'),
      dark: document.documentElement.getAttribute('data-theme') === 'dark',
    };
  }

  /* ---------- simulation models (seconds) ---------- */
  // One I/O task: 0.1s CPU prep + 0.8s network wait + 0.1s CPU parse.

  function ioTaskSegs(task, cpuStart, ioStart, parseStart) {
    return [
      { t0: cpuStart, t1: cpuStart + 0.1, kind: 'cpu', color: task.color },
      { t0: ioStart, t1: ioStart + 0.8, kind: 'io', color: task.color },
      { t0: parseStart, t1: parseStart + 0.1, kind: 'cpu', color: task.color },
    ];
  }

  function buildSync() {
    const rows = TASKS.map((task, i) => ({
      label: task.label,
      segs: ioTaskSegs(task, i, i + 0.1, i + 0.9),
    }));
    const occ = { label: 'Поток main', segs: rows.flatMap((r) => r.segs) };
    return {
      T: 3.25, wall: 3.0, cores: 1, rows, occ,
      note: 'Пока поток ждёт сеть, он не делает ничего: задержки трёх вызовов складываются.',
    };
  }

  function buildThreads() {
    const rows = TASKS.map((task, i) => {
      const segs = [];
      if (i > 0) segs.push({ t0: 0, t1: i * 0.1, kind: 'q', color: task.color, qlabel: 'ждёт GIL' });
      segs.push(...ioTaskSegs(task, i * 0.1, i * 0.1 + 0.1, 0.9 + i * 0.1));
      return { label: `Поток ${i + 1} · ${task.label}`, segs };
    });
    const occ = {
      label: 'GIL',
      segs: rows.flatMap((r) => r.segs.filter((s) => s.kind === 'cpu')),
    };
    return {
      T: 1.45, wall: 1.2, cores: 1, rows, occ,
      note: 'Ожидания I/O перекрылись, но CPU-кусочки по-прежнему идут по одному: GIL передаётся между потоками.',
    };
  }

  function buildProcesses() {
    const rows = TASKS.map((task, i) => ({
      label: `Процесс ${i + 1} · ядро ${i + 1}`,
      segs: [
        { t0: 0, t1: 0.2, kind: 'ov', color: task.color, ovlabel: 'spawn' },
        { t0: 0.2, t1: 1.2, kind: 'cpu', color: task.color },
        { t0: 1.2, t1: 1.35, kind: 'ov', color: task.color, ovlabel: 'IPC' },
      ],
    }));
    const occ = {
      label: '1 поток (сравнение)',
      segs: [{ t0: 0, t1: 3.0, kind: 'ghost', color: '#999999' }],
      ghostText: 'тот же объём CPU-работы последовательно ≈ 3.0 c',
    };
    return {
      T: 3.25, wall: 1.35, cores: 3, rows, occ, cpuBound: true,
      note: 'CPU-bound работа действительно идёт параллельно на трёх ядрах; цена — запуск процессов и сериализация данных.',
    };
  }

  function buildAsyncio() {
    const rows = TASKS.map((task, i) => {
      const s = i * 0.06;
      const ioEnd = s + 0.06 + 0.85;
      const resume = 0.91 + i * 0.06;
      return {
        label: `coroutine ${task.label}`,
        segs: [
          { t0: s, t1: s + 0.06, kind: 'cpu', color: task.color },
          { t0: s + 0.06, t1: ioEnd, kind: 'io', color: task.color, iolabel: 'await' },
          { t0: resume, t1: resume + 0.06, kind: 'cpu', color: task.color },
        ],
      };
    });
    const occ = {
      label: 'Event loop',
      segs: rows.flatMap((r) => r.segs.filter((s) => s.kind === 'cpu')),
      idleGap: { t0: 0.18, t1: 0.91, text: 'loop свободен — все корутины в await' },
    };
    return {
      T: 1.3, wall: 1.09, cores: 1, rows, occ,
      note: 'Один поток. Корутины отдают управление в await, loop подхватывает следующую готовую.',
    };
  }

  function buildActors() {
    const msg = 0.65; // 0.1 CPU + 0.45 I/O + 0.1 CPU
    const rows = TASKS.map((task) => ({
      label: `actor ${task.label}`,
      segs: [
        { t0: 0, t1: 0.1, kind: 'cpu', color: task.color },
        { t0: 0.1, t1: 0.55, kind: 'io', color: task.color },
        { t0: 0.55, t1: 0.65, kind: 'cpu', color: task.color },
        { t0: 0, t1: msg, kind: 'q2', color: task.color, qlabel: 'mailbox: сообщение №2 ждёт' },
        { t0: msg, t1: msg + 0.1, kind: 'cpu', color: task.color },
        { t0: msg + 0.1, t1: msg + 0.55, kind: 'io', color: task.color },
        { t0: msg + 0.55, t1: 2 * msg, kind: 'cpu', color: task.color },
      ],
    }));
    return {
      T: 1.55, wall: 1.3, cores: 1, rows, occ: null, noCpu: true,
      note: 'Внутри актора сообщения строго по одному (второе ждёт в mailbox); разные акторы работают параллельно.',
    };
  }

  function buildEvolution() {
    const mk = (label, key, wall, segs) => ({ label, key, wall, segs });
    const rows = [
      mk('Sync', 'sync', 3.0, [0, 1, 2].flatMap((i) => [
        { t0: i, t1: i + 0.1, kind: 'cpu', color: RACE_TASKS[i].color },
        { t0: i + 0.1, t1: i + 0.9, kind: 'io', color: RACE_TASKS[i].color },
        { t0: i + 0.9, t1: i + 1, kind: 'cpu', color: RACE_TASKS[i].color },
      ])),
      mk('Threads', 'threads', 1.2, [
        { t0: 0, t1: 0.3, kind: 'cpu', color: '#8f7ee7' },
        { t0: 0.3, t1: 0.9, kind: 'io', color: '#8f7ee7' },
        { t0: 0.9, t1: 1.2, kind: 'cpu', color: '#8f7ee7' },
      ]),
      mk('asyncio', 'asyncio', 1.09, [
        { t0: 0, t1: 0.18, kind: 'cpu', color: '#2f9e8f' },
        { t0: 0.18, t1: 0.91, kind: 'io', color: '#2f9e8f' },
        { t0: 0.91, t1: 1.09, kind: 'cpu', color: '#2f9e8f' },
      ]),
      mk('Actors', 'actors', 1.0, [
        { t0: 0, t1: 0.1, kind: 'cpu', color: '#d3548c' },
        { t0: 0.1, t1: 0.9, kind: 'io', color: '#d3548c' },
        { t0: 0.9, t1: 1.0, kind: 'cpu', color: '#d3548c' },
      ]),
    ];
    return { T: 3.25, race: true, rows, cores: 1, note: 'Одна и та же тройка вызовов. Финишный флажок — wall-clock время подхода.' };
  }

  const BUILDERS = {
    sync: buildSync, threads: buildThreads, processes: buildProcesses,
    asyncio: buildAsyncio, actors: buildActors, evolution: buildEvolution,
  };

  /* ---------- helpers ---------- */

  function cpuUtilization(model, now) {
    const t = Math.min(now, model.wall || model.T);
    if (t <= 0.02) return 0;
    let busy = 0;
    model.rows.forEach((row) => row.segs.forEach((s) => {
      if (s.kind !== 'cpu') return;
      busy += Math.max(0, Math.min(t, s.t1) - s.t0);
    }));
    return Math.min(1, busy / (t * model.cores));
  }

  function setupWidget(root) {
    const mode = root.dataset.asyncMode;
    const build = BUILDERS[mode];
    if (!build) return;
    const model = build();
    const host = root.querySelector('.python-async-canvas');
    const playBtn = root.querySelector('[data-async-play]');
    const stepBtn = root.querySelector('[data-async-step]');
    const resetBtn = root.querySelector('[data-async-reset]');
    const status = root.querySelector('.python-async-status');

    let running = false;
    let progress = 0; // [0,1] over model.T
    let selected = 'sync';

    const now = () => progress * model.T;

    function statusText() {
      const t = now().toFixed(2);
      if (model.race || model.noCpu) return `t = ${t} c`;
      const util = Math.round(cpuUtilization(model, now()) * 100);
      const coreTxt = model.cores > 1 ? `${model.cores} ядра` : '1 ядро';
      return `t = ${t} c · CPU (${coreTxt}): ${util}% занято`;
    }
    function refresh() {
      playBtn.textContent = running ? '❚❚ Пауза' : (progress >= 1 ? '▶ Снова' : '▶ Старт');
      status.textContent = statusText();
      root.querySelectorAll('[data-async-variant]').forEach((b) => {
        b.classList.toggle('active', b.dataset.asyncVariant === selected);
      });
    }

    playBtn.addEventListener('click', () => {
      if (progress >= 1) progress = 0;
      running = !running;
      refresh();
    });
    stepBtn.addEventListener('click', () => {
      running = false;
      progress = Math.min(1, progress + 1 / 6);
      refresh();
    });
    resetBtn.addEventListener('click', () => { running = false; progress = 0; refresh(); });
    root.querySelectorAll('[data-async-variant]').forEach((b) => {
      b.addEventListener('click', () => { selected = b.dataset.asyncVariant; refresh(); });
    });

    const HEIGHT = model.race ? 250 : 280;

    new p5((p) => {
      let width = 0;

      const LEFT = 150;
      const RIGHT = 22;
      const xOf = (t) => LEFT + (t / model.T) * (width - LEFT - RIGHT);

      function stripedRect(x, y, w, h, color) {
        const colors = palette();
        p.push();
        p.noStroke();
        p.fill(p.color(color));
        p.drawingContext.save();
        p.drawingContext.globalAlpha = colors.dark ? 0.22 : 0.16;
        p.rect(x, y, w, h, 4);
        p.drawingContext.globalAlpha = colors.dark ? 0.5 : 0.45;
        p.drawingContext.beginPath();
        p.drawingContext.rect(x, y, w, h);
        p.drawingContext.clip();
        p.stroke(p.color(color));
        p.strokeWeight(1.4);
        for (let sx = x - h; sx < x + w; sx += 7) p.line(sx, y + h, sx + h, y);
        p.drawingContext.restore();
        p.pop();
      }

      function label(txt, x, y, size, color, align) {
        p.push(); p.noStroke(); p.fill(color); p.textSize(size);
        p.textAlign(align || p.LEFT, p.CENTER); p.text(txt, x, y); p.pop();
      }

      function drawSeg(seg, y, h, upTo) {
        const colors = palette();
        const t1 = Math.min(seg.t1, upTo);
        if (t1 <= seg.t0 && seg.kind !== 'q' && seg.kind !== 'q2') return;
        const x0 = xOf(seg.t0);
        const x1 = xOf(Math.max(seg.t0, t1));
        const wFull = xOf(seg.t1) - x0;

        if (seg.kind === 'cpu') {
          p.push(); p.noStroke(); p.fill(p.color(seg.color)); p.rect(x0, y, x1 - x0, h, 4); p.pop();
        } else if (seg.kind === 'io') {
          if (t1 > seg.t0) stripedRect(x0, y, x1 - x0, h, seg.color);
          if (seg.iolabel && upTo >= seg.t0 + 0.1 && wFull > 46) {
            label(seg.iolabel, x0 + wFull / 2, y + h / 2, 10, colors.muted, p.CENTER);
          }
        } else if (seg.kind === 'ov') {
          if (t1 > seg.t0) {
            p.push(); p.noStroke();
            p.fill(colors.dark ? 'rgba(160,160,175,0.45)' : 'rgba(130,130,145,0.35)');
            p.rect(x0, y, x1 - x0, h, 4); p.pop();
            if (seg.ovlabel && wFull > 34) label(seg.ovlabel, x0 + wFull / 2, y + h / 2, 9, colors.dark ? '#ccc' : '#555', p.CENTER);
          }
        } else if (seg.kind === 'ghost') {
          p.push(); p.noFill(); p.stroke(colors.border); p.strokeWeight(1.2);
          p.rect(x0, y, wFull, h, 4); p.pop();
          if (t1 > seg.t0) {
            p.push(); p.noStroke();
            p.fill(colors.dark ? 'rgba(150,150,165,0.28)' : 'rgba(140,140,155,0.22)');
            p.rect(x0, y, x1 - x0, h, 4); p.pop();
          }
        } else if (seg.kind === 'q' || seg.kind === 'q2') {
          // queued: dashed outline, only until its end or playhead
          const qEnd = Math.min(seg.t1, upTo);
          if (upTo <= seg.t0) return;
          const qh = seg.kind === 'q2' ? 12 : h;
          const qy = seg.kind === 'q2' ? y - 18 : y;
          p.push(); p.noFill(); p.stroke(p.color(seg.color));
          p.strokeWeight(1.1); p.drawingContext.setLineDash([4, 4]);
          p.rect(xOf(seg.t0), qy, xOf(qEnd) - xOf(seg.t0), qh, 3);
          p.drawingContext.setLineDash([]); p.pop();
          if (seg.qlabel && upTo > seg.t0 + 0.08 && (seg.kind === 'q2' || upTo < seg.t1)) {
            const txt = seg.kind === 'q2' && upTo >= seg.t1 ? `${seg.qlabel} → обработано` : seg.qlabel;
            label(txt, xOf(seg.t0) + 6, qy + qh / 2, 9, palette().muted);
          }
        }
      }

      function drawAxis(yBottom) {
        const colors = palette();
        p.push(); p.stroke(colors.border); p.line(LEFT, yBottom, width - RIGHT, yBottom); p.pop();
        for (let t = 0; t <= model.T + 0.001; t += 0.5) {
          const x = xOf(t);
          p.push(); p.stroke(colors.border); p.line(x, yBottom, x, yBottom + 4); p.pop();
          if (x < width - RIGHT - 52) label(`${t.toFixed(1)}`, x, yBottom + 12, 9, colors.muted, p.CENTER);
        }
        label('секунды', width - RIGHT, yBottom + 12, 9, colors.muted, p.RIGHT);
      }

      function drawLegend(y) {
        const colors = palette();
        let x = LEFT;
        p.push(); p.noStroke(); p.fill(colors.accent); p.rect(x, y - 5, 14, 10, 2); p.pop();
        label('CPU-работа', x + 19, y, 10, colors.muted); x += 100;
        stripedRect(x, y - 5, 14, 10, colors.accent);
        label('ожидание I/O', x + 19, y, 10, colors.muted); x += 112;
        if (mode === 'processes') {
          p.push(); p.noStroke(); p.fill(colors.dark ? 'rgba(160,160,175,0.45)' : 'rgba(130,130,145,0.35)');
          p.rect(x, y - 5, 14, 10, 2); p.pop();
          label('overhead', x + 19, y, 10, colors.muted);
        } else if (mode === 'threads' || mode === 'actors') {
          p.push(); p.noFill(); p.stroke(colors.muted); p.drawingContext.setLineDash([4, 4]);
          p.rect(x, y - 5, 14, 10, 2); p.drawingContext.setLineDash([]); p.pop();
          label('в очереди', x + 19, y, 10, colors.muted);
        }
      }

      function drawPlayhead(yTop, yBottom) {
        const colors = palette();
        const x = xOf(now());
        p.push(); p.stroke(colors.accent); p.strokeWeight(1.4); p.line(x, yTop, x, yBottom); p.pop();
        p.push(); p.noStroke(); p.fill(colors.accent); p.triangle(x - 5, yTop - 6, x + 5, yTop - 6, x, yTop); p.pop();
      }

      function drawStandard() {
        const colors = palette();
        const upTo = now();
        drawLegend(20);
        const laneH = 26;
        const gap = mode === 'actors' ? 28 : 12;
        const top = mode === 'actors' ? 58 : 40;
        const rows = model.rows;
        rows.forEach((row, i) => {
          const y = top + i * (laneH + gap);
          label(row.label, LEFT - 10, y + laneH / 2, 11.5, colors.text, p.RIGHT);
          p.push(); p.noFill(); p.stroke(colors.border); p.rect(LEFT, y, width - LEFT - RIGHT, laneH, 4); p.pop();
          row.segs.forEach((s) => drawSeg(s, y, laneH, upTo));
        });
        let y = top + rows.length * (laneH + gap) - (mode === 'actors' ? gap - 12 : 0);
        if (model.occ) {
          label(model.occ.label, LEFT - 10, y + laneH / 2, 11.5, colors.accent, p.RIGHT);
          p.push(); p.noFill(); p.stroke(colors.accent); p.strokeWeight(1); p.rect(LEFT, y, width - LEFT - RIGHT, laneH, 4); p.pop();
          model.occ.segs.forEach((s) => drawSeg(s, y, laneH, upTo));
          if (model.occ.idleGap && upTo > model.occ.idleGap.t0 + 0.1) {
            const g = model.occ.idleGap;
            label(g.text, (xOf(g.t0) + xOf(g.t1)) / 2, y + laneH / 2, 9.5, colors.muted, p.CENTER);
          }
          if (model.occ.ghostText) {
            label(model.occ.ghostText, xOf(1.5), y + laneH / 2, 9.5, colors.muted, p.CENTER);
          }
          y += laneH + gap;
        }
        drawAxis(y + 2);
        drawPlayhead(34, y + 2);
        // wall time marker
        if (upTo >= model.wall) {
          const x = xOf(model.wall);
          p.push(); p.stroke(colors.text); p.strokeWeight(1); p.drawingContext.setLineDash([3, 3]);
          p.line(x, 34, x, y + 2); p.drawingContext.setLineDash([]); p.pop();
          if (x + 90 > width - RIGHT) {
            label(`готово: ${model.wall.toFixed(2)} c`, x - 6, 30, 10.5, colors.text, p.RIGHT);
          } else {
            label(`готово: ${model.wall.toFixed(2)} c`, x + 6, 30, 10.5, colors.text);
          }
        }
        label(model.note, LEFT, HEIGHT - 12, 10.5, colors.muted);
      }

      function drawRace() {
        const colors = palette();
        const upTo = now();
        drawLegend(18);
        const laneH = 24;
        const gap = 14;
        const top = 36;
        model.rows.forEach((row, i) => {
          const y = top + i * (laneH + gap);
          const hot = selected === row.key;
          label(row.label, LEFT - 10, y + laneH / 2, hot ? 12.5 : 11.5, hot ? colors.accent : colors.text, p.RIGHT);
          p.push(); p.noFill(); p.stroke(hot ? colors.accent : colors.border);
          p.strokeWeight(hot ? 1.6 : 1); p.rect(LEFT, y, width - LEFT - RIGHT, laneH, 4); p.pop();
          row.segs.forEach((s) => drawSeg(s, y, laneH, upTo));
          if (upTo >= row.wall) {
            const x = xOf(row.wall);
            p.push(); p.stroke(colors.text); p.strokeWeight(1.2);
            p.line(x, y - 3, x, y + laneH + 3);
            p.noStroke(); p.fill(colors.text);
            p.triangle(x, y - 3, x + 9, y + 1, x, y + 5);
            p.pop();
            if (x + 60 > width - RIGHT) {
              label(`${row.wall.toFixed(2)} c`, x - 8, y + laneH / 2, 11, colors.text, p.RIGHT);
            } else {
              label(`${row.wall.toFixed(2)} c`, x + 12, y + laneH / 2, 11, colors.text);
            }
          }
        });
        const yAxis = top + model.rows.length * (laneH + gap) + 2;
        drawAxis(yAxis);
        drawPlayhead(30, yAxis);
        label(model.note, LEFT, HEIGHT - 10, 10.5, colors.muted);
      }

      p.setup = () => {
        width = Math.max(320, host.clientWidth);
        p.createCanvas(width, HEIGHT).parent(host);
        p.textFont('system-ui, sans-serif');
        p.noLoop();
      };
      p.draw = () => {
        const colors = palette();
        p.background(colors.bg);
        if (model.race) drawRace(); else drawStandard();
      };
      p.windowResized = () => {
        const next = Math.max(320, host.clientWidth);
        if (next !== width) { width = next; p.resizeCanvas(width, HEIGHT); }
      };

      let dirty = true;
      const markDirty = () => { dirty = true; };
      [playBtn, stepBtn, resetBtn].forEach((b) => b.addEventListener('click', markDirty));
      root.querySelectorAll('[data-async-variant]').forEach((b) => b.addEventListener('click', markDirty));
      new MutationObserver(markDirty).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      let last = performance.now();
      const tick = (ts) => {
        const dt = ts - last;
        last = ts;
        if (running) {
          progress = Math.min(1, progress + dt / 8000);
          if (progress >= 1) running = false;
          refresh();
          dirty = true;
        }
        if (dirty) { dirty = false; p.redraw(); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    refresh();
  }

  function init() {
    if (!window.p5) return;
    document.querySelectorAll('.python-async-widget').forEach(setupWidget);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
