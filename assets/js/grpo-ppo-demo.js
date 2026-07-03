/**
 * GRPO vs PPO interactive comparison for LLM alignment.
 */
(function () {
  const ROOT_ID = 'grpo-ppo-demo';

  const GROUP = [
    { label: 'o₁', reward: 0.25, text: 'неверный ответ' },
    { label: 'o₂', reward: 0.82, text: 'верный CoT' },
    { label: 'o₃', reward: 0.48, text: 'частично верно' },
    { label: 'o₄', reward: 0.91, text: 'лучший trace' },
    { label: 'o₅', reward: 0.31, text: 'ошибка в шаге' },
    { label: 'o₆', reward: 0.67, text: 'верно, длинно' },
  ];

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function std(arr, m) {
    const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
    return Math.sqrt(v) || 1e-6;
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const modeBtns = root.querySelectorAll('[data-rl-mode]');
    const stepBtn = root.querySelector('[data-rl-step]');
    const formulaEl = root.querySelector('.rl-formula');
    const captionEl = root.querySelector('.rl-caption');

    let mode = 'grpo';
    let step = 0;
    let pulse = 0;
    let raf;

    const rewards = GROUP.map((g) => g.reward);
    const m = mean(rewards);
    const s = std(rewards, m);
    const grpoAdv = rewards.map((r) => (r - m) / s);

    // Synthetic per-token critic values for one trajectory (PPO)
    const tokens = 12;
    const finalR = 0.82;
    const criticV = Array.from({ length: tokens }, (_, i) => 0.15 + (finalR - 0.15) * (i / (tokens - 1)) ** 0.85);
    const ppoAdv = criticV.map((v, i) => {
      const nextV = i < tokens - 1 ? criticV[i + 1] : finalR;
      return (nextV - v) * 0.9;
    });

    function setMode(next) {
      mode = next;
      step = 0;
      modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.rlMode === mode));
      draw();
      updateText();
    }

    function updateText() {
      if (mode === 'grpo') {
        formulaEl.innerHTML =
          'GRPO: <code>A<sub>i</sub> = (r<sub>i</sub> − μ<sub>group</sub>) / σ<sub>group</sub></code> · μ=<strong>' +
          m.toFixed(2) +
          '</strong> σ=<strong>' +
          s.toFixed(2) +
          '</strong>';
        const lines = [
          'Сэмплируем G ответов на один промпт q.',
          'Награда только в конце (verifiable / RM).',
          'Базовая линия — среднее по группе, без сети-критика.',
          'Далее — clipped surrogate, как в PPO.',
        ];
        captionEl.textContent = lines[Math.min(step, lines.length - 1)];
      } else {
        formulaEl.innerHTML =
          'PPO: <code>A<sub>t</sub> ≈ GAE(δ<sub>t</sub>)</code> · критик <code>V<sub>γ</sub>(s<sub>t</sub>)</code> на каждом токене';
        const lines = [
          'Политика π<sub>θ</sub> генерирует один trace.',
          'Критик V оценивает ценность частичного ответа.',
          'GAE сглаживает TD-ошибки по токенам.',
          'Clipped ratio ограничивает шаг обновления.',
        ];
        captionEl.textContent = lines[Math.min(step, lines.length - 1)];
      }
    }

    function drawArch(w, h, pad) {
      const cx = pad + (w - pad * 2) * 0.32;
      const cy = pad + 70;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';

      const boxes = mode === 'ppo'
        ? [
            { x: cx - 120, y: cy - 30, w: 88, h: 44, label: 'πθ Policy', color: '#667eea', on: true },
            { x: cx, y: cy - 30, w: 88, h: 44, label: 'Vγ Critic', color: '#fa709a', on: step >= 1 },
            { x: cx + 120, y: cy - 30, w: 88, h: 44, label: 'Rφ Reward', color: '#43e97b', on: step >= 0, frozen: true },
          ]
        : [
            { x: cx - 70, y: cy - 30, w: 100, h: 44, label: 'πθ Policy', color: '#667eea', on: true },
            { x: cx + 70, y: cy - 30, w: 100, h: 44, label: 'Rφ / verify', color: '#43e97b', on: step >= 1, frozen: true },
            { x: cx, y: cy + 42, w: 120, h: 36, label: 'G сэмплов / группа', color: '#38d9c8', on: step >= 0 },
          ];

      boxes.forEach((b) => {
        ctx.globalAlpha = b.on ? 0.92 : 0.35;
        const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
        g.addColorStop(0, b.color);
        g.addColorStop(1, '#764ba2');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 8);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 4);
        if (b.frozen) {
          ctx.font = '9px system-ui';
          ctx.fillText('frozen', b.x + b.w / 2, b.y + b.h + 12);
          ctx.font = '11px system-ui';
        }
      });
      ctx.globalAlpha = 1;

      // Memory bar
      const memY = cy + 95;
      const memW = w - pad * 2 - 20;
      const frac = mode === 'ppo' ? 0.78 + Math.sin(pulse) * 0.02 : 0.42 + Math.sin(pulse) * 0.02;
      ctx.fillStyle = '#ececf0';
      ctx.fillRect(pad + 10, memY, memW, 10);
      const mg = ctx.createLinearGradient(pad, 0, pad + memW * frac, 0);
      mg.addColorStop(0, '#667eea');
      mg.addColorStop(1, mode === 'ppo' ? '#fa709a' : '#43e97b');
      ctx.fillStyle = mg;
      ctx.fillRect(pad + 10, memY, memW * frac, 10);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.font = '10px system-ui';
      ctx.fillText(
        mode === 'ppo' ? 'VRAM ≈ policy + critic (+ ref)' : 'VRAM ≈ policy (+ ref), без critic',
        pad + 10,
        memY + 26
      );
    }

    function drawGroupChart(w, h, pad) {
      const left = pad + (w - pad * 2) * 0.52;
      const top = pad + 28;
      const chartW = w - left - pad;
      const chartH = h - top - pad - 20;
      const barW = Math.min(36, (chartW - 20) / GROUP.length - 8);
      const maxA = Math.max(...grpoAdv.map(Math.abs), 0.01);

      ctx.fillStyle = '#888';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(mode === 'grpo' ? 'Группа ответов → относительное преимущество' : 'Токены → GAE advantage (один trace)', left, top - 8);

      if (mode === 'grpo') {
        const baseY = top + chartH * 0.55;
        GROUP.forEach((g, i) => {
          const x = left + 12 + i * (barW + 10);
          const rh = (g.reward / 1) * chartH * 0.38;
          ctx.fillStyle = step >= 1 ? '#d8d8e0' : '#eef0f4';
          ctx.fillRect(x, baseY - rh, barW, rh);
          if (step >= 1) {
            const a = grpoAdv[i];
            const ah = (a / maxA) * chartH * 0.32;
            ctx.fillStyle = a >= 0 ? '#43e97b' : '#fa709a';
            ctx.fillRect(x, a >= 0 ? baseY - ah - 4 : baseY + 4, barW, Math.abs(ah));
          }
          ctx.fillStyle = step >= 0 && i === 3 ? '#5a4d9e' : '#444';
          ctx.font = step >= 0 && i === 3 ? 'bold 10px system-ui' : '10px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(g.label, x + barW / 2, baseY + 16);
        });
        if (step >= 1) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#667eea';
          ctx.beginPath();
          const meanY = baseY - (m / 1) * chartH * 0.38;
          ctx.moveTo(left, meanY);
          ctx.lineTo(left + chartW - 8, meanY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#667eea';
          ctx.textAlign = 'right';
          ctx.font = '9px system-ui';
          ctx.fillText('μ_group', left + chartW - 8, meanY - 4);
        }
      } else {
        const baseY = top + chartH - 12;
        const tw = (chartW - 16) / tokens;
        for (let i = 0; i < tokens; i++) {
          const x = left + 8 + i * tw;
          const vh = criticV[i] * chartH * 0.42;
          ctx.fillStyle = 'rgba(102, 126, 234, 0.25)';
          ctx.fillRect(x, baseY - vh, tw - 2, vh);
          if (step >= 2) {
            const a = ppoAdv[i];
            const sign = a >= 0 ? -1 : 1;
            ctx.fillStyle = a >= 0 ? '#43e97b' : '#fa709a';
            ctx.fillRect(x, baseY + 6, tw - 2, sign * Math.min(22, Math.abs(a) * 40));
          }
        }
        if (step >= 1) {
          ctx.strokeStyle = '#fa709a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < tokens; i++) {
            const x = left + 8 + i * tw + (tw - 2) / 2;
            const y = baseY - criticV[i] * chartH * 0.42;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = '#43e97b';
        ctx.beginPath();
        ctx.arc(left + 8 + (tokens - 1) * tw + (tw - 2) / 2, baseY - finalR * chartH * 0.42, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fafbfd';
      ctx.fillRect(0, 0, w, h);

      const pad = 14;
      drawArch(w, h, pad);
      drawGroupChart(w, h, pad);
    }

    function loop() {
      pulse += 0.05;
      draw();
      raf = requestAnimationFrame(loop);
    }

    modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.rlMode)));
    stepBtn.addEventListener('click', () => {
      step = (step + 1) % 4;
      updateText();
    });

    setMode('grpo');
    loop();
    window.addEventListener('resize', draw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
