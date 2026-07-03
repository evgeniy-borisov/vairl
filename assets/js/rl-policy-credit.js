/**
 * PPO vs GRPO: где на траектории появляется сигнал обучения.
 * Схема для статьи про фазовый портрет и устойчивость.
 */
(function () {
  const ROOT_ID = 'rl-policy-credit-widget';

  const GRPO_TRACES = [
    { label: 'o₁', reward: 0, color: '#fa709a', pts: [[0.12, 0.72], [0.22, 0.68], [0.32, 0.74], [0.42, 0.7], [0.52, 0.76]] },
    { label: 'o₂', reward: 1, color: '#43e97b', pts: [[0.12, 0.55], [0.24, 0.48], [0.36, 0.42], [0.48, 0.36], [0.6, 0.28]] },
    { label: 'o₃', reward: 0, color: '#fa709a', pts: [[0.12, 0.62], [0.2, 0.58], [0.28, 0.64], [0.38, 0.6], [0.46, 0.66]] },
    { label: 'o₄', reward: 1, color: '#43e97b', pts: [[0.12, 0.5], [0.26, 0.44], [0.4, 0.38], [0.54, 0.32], [0.66, 0.24]] },
  ];

  const PPO_TOKENS = 14;
  const PPO_FINAL_R = 1;

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
    const modeBtns = root.querySelectorAll('[data-credit-mode]');
    const stepBtn = root.querySelector('[data-credit-step]');
    const captionEl = root.querySelector('.rl-credit-caption');
    const legendEl = root.querySelector('.rl-credit-legend');

    let mode = 'ppo';
    let step = 0;
    let anim = 0;
    let raf;

    const rewards = GRPO_TRACES.map((t) => t.reward);
    const m = mean(rewards);
    const s = std(rewards, m);
    const grpoAdv = rewards.map((r) => (r - m) / s);

    const ppoV = Array.from({ length: PPO_TOKENS }, (_, i) => 0.2 + (PPO_FINAL_R - 0.2) * (i / (PPO_TOKENS - 1)) ** 0.8);
    const ppoAdv = ppoV.map((v, i) => {
      const next = i < PPO_TOKENS - 1 ? ppoV[i + 1] : PPO_FINAL_R;
      return (next - v) * 1.1;
    });

    const ppoPhasePts = Array.from({ length: PPO_TOKENS }, (_, i) => {
      const t = i / (PPO_TOKENS - 1);
      return [0.1 + t * 0.58, 0.72 - t * 0.46 + Math.sin(t * 4) * 0.03];
    });

    const captions = {
      ppo: [
        'Один rollout: CoT-токены → финальный ответ. Верификатор / RM смотрит только на конец.',
        'Критик V(sₜ) оценивает «ожидаемую ценность» на каждом токене — отдельной пошаговой проверки ризонинга нет.',
        'GAE размазывает terminal reward по токенам: разный градиент на ранних и поздних шагах.',
        'В фазовом пространстве — локальное искривление траектории, а не сдвиг целиком.',
      ],
      grpo: [
        'На один промпт — G полных траекторий (4 на схеме). Каждая заканчивается одной scalar-наградой rᵢ.',
        'Верификатор снова только в конце; промежуточные токены не оцениваются по отдельности.',
        'После нормализации по группе один и тот же Aᵢ применяется ко всем токенам ответа.',
        'В фазовом пространстве — целые траектории ранжируются: «лучше среднего» / «хуже среднего».',
      ],
    };

    function setMode(next) {
      mode = next;
      step = 0;
      anim = 0;
      modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.creditMode === mode));
      updateLegend();
      updateCaption();
      draw();
    }

    function updateCaption() {
      captionEl.textContent = captions[mode][Math.min(step, captions[mode].length - 1)];
    }

    function updateLegend() {
      if (mode === 'ppo') {
        legendEl.innerHTML =
          '<span class="rl-leg"><i style="background:#667eea"></i>траектория π</span>' +
          '<span class="rl-leg"><i style="background:#fa709a"></i>V(sₜ) критик</span>' +
          '<span class="rl-leg"><i style="background:#43e97b"></i>terminal r</span>' +
          '<span class="rl-leg"><i style="background:#38d9c8"></i>GAE Aₜ</span>';
      } else {
        legendEl.innerHTML =
          '<span class="rl-leg"><i style="background:#43e97b"></i>r=1</span>' +
          '<span class="rl-leg"><i style="background:#fa709a"></i>r=0</span>' +
          '<span class="rl-leg"><i style="background:#667eea"></i>μ группы</span>' +
          '<span class="rl-leg"><i style="background:#38d9c8"></i>единый Aᵢ на trace</span>';
      }
    }

    function drawPhasePanel(x, y, w, h) {
      ctx.fillStyle = '#f3f4f8';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#dde1e8';
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#888';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('проекция embedding space', x + 8, y + 14);
      ctx.fillText('grounding ↑', x + 6, y + 28);
      ctx.fillText('прогресс →', x + w - 72, y + h - 6);

      // attractor
      const ax = x + w * 0.78;
      const ay = y + h * 0.22;
      ctx.fillStyle = 'rgba(67, 233, 123, 0.15)';
      ctx.beginPath();
      ctx.arc(ax, ay, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#43e97b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#2a9d6a';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('аттрактор', ax, ay + 3);

      const toX = (px) => x + 24 + px * (w - 48);
      const toY = (py) => y + h - 20 - py * (h - 44);

      if (mode === 'ppo') {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ppoPhasePts.forEach((p, i) => {
          const cx = toX(p[0]);
          const cy = toY(p[1]);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();

        const hi = Math.min(PPO_TOKENS - 1, Math.floor(anim * (PPO_TOKENS - 1)));
        ppoPhasePts.forEach((p, i) => {
          const cx = toX(p[0]);
          const cy = toY(p[1]);
          const on = step >= 2 && i <= hi;
          ctx.fillStyle = on ? (ppoAdv[i] >= 0 ? '#43e97b' : '#fa709a') : '#667eea';
          ctx.beginPath();
          ctx.arc(cx, cy, i === PPO_TOKENS - 1 ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        if (step >= 1) {
          ctx.strokeStyle = 'rgba(250, 112, 154, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ppoPhasePts.forEach((p, i) => {
            const cx = toX(p[0]);
            const cy = toY(p[1]) - ppoV[i] * 22;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        GRPO_TRACES.forEach((tr, ti) => {
          const adv = grpoAdv[ti];
          const alpha = step >= 2 ? 0.95 : 0.55;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = step >= 2 ? (adv >= 0 ? '#43e97b' : '#fa709a') : tr.color;
          ctx.lineWidth = step >= 2 ? 2.2 : 1.5;
          ctx.beginPath();
          tr.pts.forEach((p, i) => {
            const cx = toX(p[0]);
            const cy = toY(p[1]);
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          });
          ctx.stroke();
          const last = tr.pts[tr.pts.length - 1];
          ctx.fillStyle = tr.reward ? '#43e97b' : '#fa709a';
          ctx.beginPath();
          ctx.arc(toX(last[0]), toY(last[1]), 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
    }

    function drawTimeline(x, y, w, h) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ececf0';
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#666';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('ось времени: CoT / reasoning → финальный ответ', x + 8, y + 14);

      if (mode === 'ppo') {
        const rowY = y + 36;
        const tw = (w - 40) / PPO_TOKENS;
        const baseY = rowY + 48;

        ctx.fillStyle = '#888';
        ctx.fillText('π(q) → один trace', x + 8, rowY);

        for (let i = 0; i < PPO_TOKENS; i++) {
          const tx = x + 20 + i * tw;
          const isLast = i === PPO_TOKENS - 1;
          ctx.fillStyle = isLast ? 'rgba(67, 233, 123, 0.2)' : 'rgba(102, 126, 234, 0.12)';
          ctx.fillRect(tx, baseY - 18, tw - 3, 22);
          ctx.fillStyle = '#555';
          ctx.font = '8px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(isLast ? 'ans' : 't' + (i + 1), tx + (tw - 3) / 2, baseY - 4);
        }

        if (step >= 0) {
          const rx = x + 20 + (PPO_TOKENS - 1) * tw + (tw - 3) / 2;
          ctx.fillStyle = '#43e97b';
          ctx.beginPath();
          ctx.moveTo(rx, baseY - 28);
          ctx.lineTo(rx + 7, baseY - 38);
          ctx.lineTo(rx - 7, baseY - 38);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#2a9d6a';
          ctx.font = '9px system-ui';
          ctx.fillText('r (terminal)', rx, baseY - 42);
        }

        if (step >= 1) {
          ctx.strokeStyle = '#fa709a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < PPO_TOKENS; i++) {
            const tx = x + 20 + i * tw + (tw - 3) / 2;
            const vy = baseY + 8 - ppoV[i] * 28;
            if (i === 0) ctx.moveTo(tx, vy);
            else ctx.lineTo(tx, vy);
          }
          ctx.stroke();
          ctx.fillStyle = '#fa709a';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'left';
          ctx.fillText('V(sₜ)', x + 20, baseY + 44);
        }

        if (step >= 2) {
          for (let i = 0; i < PPO_TOKENS; i++) {
            const tx = x + 20 + i * tw;
            const a = ppoAdv[i];
            const ah = Math.min(16, Math.abs(a) * 22);
            ctx.fillStyle = a >= 0 ? 'rgba(67, 233, 123, 0.75)' : 'rgba(250, 112, 154, 0.75)';
            ctx.fillRect(tx, baseY + 52, tw - 3, a >= 0 ? -ah : ah);
          }
          ctx.fillStyle = '#38d9c8';
          ctx.font = '9px system-ui';
          ctx.fillText('Aₜ = GAE(δ)', x + 20, baseY + 78);
        }
      } else {
        const rowH = (h - 50) / GRPO_TRACES.length;
        GRPO_TRACES.forEach((tr, ti) => {
          const rowY = y + 28 + ti * rowH;
          const n = tr.pts.length;
          const tw = (w - 100) / n;
          const baseY = rowY + rowH * 0.55;

          ctx.fillStyle = '#555';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'left';
          ctx.fillText(tr.label, x + 8, rowY + 12);

          for (let i = 0; i < n; i++) {
            const tx = x + 36 + i * tw;
            const isLast = i === n - 1;
            const uniform = step >= 2;
            const adv = grpoAdv[ti];
            ctx.fillStyle = uniform
              ? adv >= 0
                ? 'rgba(67, 233, 123, 0.35)'
                : 'rgba(250, 112, 154, 0.35)'
              : 'rgba(102, 126, 234, 0.1)';
            ctx.fillRect(tx, baseY - 10, tw - 4, 18);
          }

          if (step >= 0) {
            const rx = x + 36 + (n - 1) * tw + (tw - 4) / 2;
            ctx.fillStyle = tr.reward ? '#43e97b' : '#fa709a';
            ctx.beginPath();
            ctx.arc(rx, baseY - 18, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#444';
            ctx.font = '8px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('r=' + tr.reward, rx, baseY - 28);
          }

          if (step >= 2) {
            const adv = grpoAdv[ti];
            ctx.fillStyle = adv >= 0 ? '#43e97b' : '#fa709a';
            ctx.font = 'bold 9px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText('A=' + adv.toFixed(1), x + w - 12, baseY + 4);
          }
        });

        if (step >= 1) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#667eea';
          ctx.lineWidth = 1.5;
          const ly = y + h - 18;
          ctx.beginPath();
          ctx.moveTo(x + 36, ly);
          ctx.lineTo(x + w - 20, ly);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#667eea';
          ctx.font = '9px system-ui';
          ctx.textAlign = 'left';
          ctx.fillText('μ_group = ' + m.toFixed(2), x + 36, ly - 4);
        }
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

      const pad = 12;
      const phaseH = h * 0.42;
      drawPhasePanel(pad, pad, w - pad * 2, phaseH);
      drawTimeline(pad, pad + phaseH + 10, w - pad * 2, h - phaseH - pad - 10);
    }

    function loop() {
      anim = (anim + 0.012) % 1.2;
      if (step >= 2) draw();
      raf = requestAnimationFrame(loop);
    }

    modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.creditMode)));
    stepBtn.addEventListener('click', () => {
      step = (step + 1) % 4;
      updateCaption();
      draw();
    });

    setMode('ppo');
    loop();
    window.addEventListener('resize', draw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
