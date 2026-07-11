/** Interactive concurrency maps for the Python async evolution article. */
(function () {
  'use strict';

  const TASKS = [
    { label: 'LLM', color: '#667eea' },
    { label: 'Поиск', color: '#22a06b' },
    { label: 'Календарь', color: '#e67e22' },
  ];
  const EVOLUTION_TASKS = [
    { label: 'LLM', color: '#667eea' },
    { label: 'Поиск', color: '#22a06b' },
    { label: 'Policy', color: '#d3548c' },
  ];
  const MODE_TITLES = {
    sync: 'Последовательно: ожидания складываются',
    threads: 'Потоки: I/O ждёт параллельно',
    processes: 'Процессы: изолированные воркеры на ядрах',
    asyncio: 'asyncio: один loop, много ожиданий',
    actors: 'Акторы: mailbox и один владелец состояния',
  };

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      bg: styles.getPropertyValue('--widget-canvas-bg').trim() || '#fafbfd',
      panel: styles.getPropertyValue('--widget-header').trim() || '#f7f7f9',
      text: styles.getPropertyValue('--text').trim() || '#111',
      muted: styles.getPropertyValue('--text-muted').trim() || '#666',
      border: styles.getPropertyValue('--border').trim() || '#e5e5e5',
      accent: styles.getPropertyValue('--accent').trim() || '#667eea',
    };
  }

  function setupWidget(root) {
    const mode = root.dataset.asyncMode;
    const host = root.querySelector('.python-async-canvas');
    const play = root.querySelector('[data-async-play]');
    const step = root.querySelector('[data-async-step]');
    const reset = root.querySelector('[data-async-reset]');
    const status = root.querySelector('.python-async-status');
    let running = false;
    let progress = 0;
    let selected = 'sync';
    let sketch;

    function label() {
      const shown = mode === 'evolution' ? selected : mode;
      if (progress >= 1) return `${MODE_TITLES[shown] || shown}: завершено`;
      return `${MODE_TITLES[shown] || shown}: ${Math.round(progress * 100)}%`;
    }
    function refreshControls() {
      play.textContent = running ? '❚❚ Пауза' : (progress >= 1 ? '▶ Снова' : '▶ Старт');
      status.textContent = label();
      root.querySelectorAll('[data-async-variant]').forEach((button) => {
        button.classList.toggle('active', button.dataset.asyncVariant === selected);
      });
    }
    function resetSim() { running = false; progress = 0; refreshControls(); }
    play.addEventListener('click', () => {
      if (progress >= 1) progress = 0;
      running = !running;
      refreshControls();
    });
    step.addEventListener('click', () => { running = false; progress = Math.min(1, progress + 0.17); refreshControls(); });
    reset.addEventListener('click', resetSim);
    root.querySelectorAll('[data-async-variant]').forEach((button) => {
      button.addEventListener('click', () => { selected = button.dataset.asyncVariant; resetSim(); });
    });

    sketch = new p5((p) => {
      let width = 0;
      const height = 250;
      const t = () => Math.min(1, progress);
      const text = (value, x, y, size, color, align) => {
        p.push(); p.noStroke(); p.fill(color); p.textSize(size); p.textAlign(align || p.LEFT, p.CENTER); p.text(value, x, y); p.pop();
      };
      const round = (x, y, w, h, fill, stroke, radius) => {
        p.push(); p.fill(fill); p.stroke(stroke); p.strokeWeight(1); p.rect(x, y, w, h, radius || 8); p.pop();
      };
      const arrow = (x1, y1, x2, y2, color, weight) => {
        const a = p.atan2(y2 - y1, x2 - x1);
        p.push(); p.stroke(color); p.strokeWeight(weight || 2); p.line(x1, y1, x2, y2);
        p.translate(x2, y2); p.rotate(a); p.noStroke(); p.fill(color); p.triangle(0, 0, -8, -4, -8, 4); p.pop();
      };
      const taskBar = (task, x, y, w, active, done) => {
        round(x, y, w, 28, active ? task.color : '#00000000', active ? task.color : palette().border, 6);
        if (active) { p.fill(task.color); p.noStroke(); p.rect(x, y, w * done, 28, 6); }
        text(task.label, x + 10, y + 14, 12, active ? '#ffffff' : palette().text);
      };

      function drawSync(colors) {
        text('Timeline', 16, 26, 13, colors.muted);
        const x = 82, w = width - x - 20, segment = w / 3;
        p.stroke(colors.border); p.line(x, 55, x + w, 55);
        TASKS.forEach((task, i) => {
          const start = i / 3, amount = p.constrain((t() - start) * 3, 0, 1);
          text(task.label, 16, 88 + i * 44, 13, colors.text);
          taskBar(task, x + i * segment, 74 + i * 44, segment - 6, amount > 0, amount);
          text(`${i + 1} c`, x + i * segment, 48, 11, colors.muted, p.CENTER);
        });
        text('≈ 3 секунды wall time: следующая задача стартует только после предыдущей.', width / 2, 222, 12, colors.muted, p.CENTER);
      }
      function drawThreads(colors) {
        round(14, 18, 125, 42, colors.panel, colors.border); text('Один процесс', 76, 39, 13, colors.text, p.CENTER);
        p.push(); p.noFill(); p.stroke(colors.accent); p.strokeWeight(2); p.arc(112, 39, 16, 16, 180, 360); p.line(104, 39, 120, 39); p.pop();
        text('GIL', 112, 67, 10, colors.accent, p.CENTER);
        const x = 165, w = width - x - 20;
        TASKS.forEach((task, i) => {
          const y = 24 + i * 62, amount = p.constrain(t() * 1.25, 0, 1);
          arrow(139, 39, x - 10, y + 14, colors.border, 1);
          taskBar(task, x, y, w, true, amount);
          text('I/O wait', x + w - 12, y + 14, 11, '#ffffff', p.RIGHT);
        });
        text('I/O освобождает GIL: три ожидания перекрываются, ≈ 1 секунда.', width / 2, 222, 12, colors.muted, p.CENTER);
      }
      function drawProcesses(colors) {
        const gap = 12, boxW = (width - 32 - gap * 2) / 3;
        TASKS.forEach((task, i) => {
          const x = 16 + i * (boxW + gap), active = p.constrain(t() * 1.15, 0, 1);
          round(x, 28, boxW, 126, colors.panel, task.color);
          text(`Процесс ${i + 1}`, x + boxW / 2, 52, 13, colors.text, p.CENTER);
          round(x + 17, 70, boxW - 34, 42, task.color, task.color); text(task.label, x + boxW / 2, 91, 12, '#fff', p.CENTER);
          p.noStroke(); p.fill(task.color); p.circle(x + boxW / 2, 130, 10 + active * 14);
          text(`CPU core ${i + 1}`, x + boxW / 2, 173, 11, colors.muted, p.CENTER);
        });
        TASKS.forEach((task, i) => arrow(width / 2, 205, 16 + i * (boxW + gap) + boxW / 2, 160, colors.muted, 1));
        text('IPC: данные пересекают границы адресных пространств.', width / 2, 226, 12, colors.muted, p.CENTER);
      }
      function drawAsync(colors) {
        const cx = 80, cy = 124, r = 42, spin = t() * p.TWO_PI * 2;
        p.push(); p.noFill(); p.stroke(colors.accent); p.strokeWeight(3); p.circle(cx, cy, r * 2); p.rotate(spin); p.line(cx + r - 7, cy, cx + r + 7, cy); p.pop();
        text('event loop', cx, cy, 12, colors.text, p.CENTER);
        TASKS.forEach((task, i) => {
          const y = 34 + i * 61, phase = (t() * 1.15 - i * 0.14 + 1) % 1;
          const x = 155 + phase * (width - 215);
          arrow(cx + r, cy, 150, y + 14, colors.border, 1);
          round(155, y, width - 175, 28, colors.panel, colors.border);
          text(`coroutine: ${task.label}`, 165, y + 14, 12, colors.text);
          p.noStroke(); p.fill(task.color); p.circle(x, y + 14, 12);
          text(phase < 0.68 ? 'await' : 'работа', width - 27, y + 14, 10, colors.muted, p.RIGHT);
        });
        text('Один поток переключается только в точках await.', width / 2, 222, 12, colors.muted, p.CENTER);
      }
      function drawActors(colors) {
        const xs = [18, width / 2 - 54, width - 126];
        TASKS.forEach((task, i) => {
          const x = xs[i], queued = Math.min(3, Math.ceil(t() * 4 - i * 0.3));
          round(x, 39, 108, 38, colors.panel, colors.border); text('mailbox', x + 54, 58, 12, colors.text, p.CENTER);
          for (let q = 0; q < Math.max(0, queued); q++) { p.noStroke(); p.fill(task.color); p.rect(x + 12 + q * 18, 85, 13, 13, 3); }
          arrow(x + 54, 103, x + 54, 132, task.color, 2);
          round(x, 136, 108, 44, task.color, task.color); text(`actor: ${task.label}`, x + 54, 158, 12, '#fff', p.CENTER);
          text('по одному сообщению', x + 54, 198, 10, colors.muted, p.CENTER);
        });
        text('Очередь задаёт порядок; состояние меняет только его владелец.', width / 2, 228, 12, colors.muted, p.CENTER);
      }
      function drawEvolution(colors) {
        const variants = ['sync', 'threads', 'asyncio', 'actors'];
        const titles = { sync: 'Sync', threads: 'Threads', asyncio: 'asyncio', actors: 'Actors' };
        const colW = (width - 26) / 4;
        variants.forEach((variant, index) => {
          const x = 8 + index * colW, active = selected === variant;
          round(x, 20, colW - 6, 170, active ? colors.panel : colors.bg, active ? colors.accent : colors.border);
          text(titles[variant], x + (colW - 6) / 2, 43, 13, active ? colors.accent : colors.text, p.CENTER);
          EVOLUTION_TASKS.forEach((task, taskIndex) => {
            let start = variant === 'sync' ? taskIndex / 3 : 0;
            let amount = p.constrain((t() - start) * (variant === 'sync' ? 3 : 1.2), 0, 1);
            if (variant === 'actors') amount = p.constrain((t() - taskIndex * 0.06) * 1.2, 0, 1);
            const y = 67 + taskIndex * 32;
            p.noStroke(); p.fill(task.color); p.rect(x + 11, y, (colW - 28) * amount, 18, 4);
            p.noFill(); p.stroke(task.color); p.rect(x + 11, y, colW - 28, 18, 4);
            text(task.label, x + (colW - 6) / 2, y + 9, 10, amount > 0.45 ? '#fff' : colors.text, p.CENTER);
          });
          text(variant === 'sync' ? '≈ 1.2 c' : '≈ 0.4 c', x + (colW - 6) / 2, 170, 11, colors.muted, p.CENTER);
        });
        text('Один сценарий: у Sync задержки складываются; остальные варианты перекрывают ожидание.', width / 2, 222, 12, colors.muted, p.CENTER);
      }
      p.setup = () => { width = Math.max(280, host.clientWidth); p.createCanvas(width, height).parent(host); p.textFont('system-ui, sans-serif'); p.noLoop(); };
      p.draw = () => {
        const colors = palette(); p.background(colors.bg);
        if (mode === 'sync') drawSync(colors);
        else if (mode === 'threads') drawThreads(colors);
        else if (mode === 'processes') drawProcesses(colors);
        else if (mode === 'asyncio') drawAsync(colors);
        else if (mode === 'actors') drawActors(colors);
        else drawEvolution(colors);
      };
      p.windowResized = () => { const next = Math.max(280, host.clientWidth); if (next !== width) { width = next; p.resizeCanvas(width, height); } };
      const tick = () => { if (running) { progress = Math.min(1, progress + 0.004); if (progress >= 1) running = false; refreshControls(); } p.redraw(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    refreshControls();
  }

  function init() {
    if (!window.p5) return;
    document.querySelectorAll('.python-async-widget').forEach(setupWidget);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
