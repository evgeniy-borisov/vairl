/**
 * Discrete embedding space / phase portrait for CoT trajectories.
 * Instance-mode p5.js — does not conflict with global fish-animation sketch.
 */
(function () {
  const CONTAINER_ID = 'embedding-phase-portrait';

  const CYCLE_ITEMS = [
    { label: 'План', prompt: '«Составь план из 5 шагов для задачи пользователя»' },
    { label: 'Act', prompt: '«Вызови search(query=…) и проанализируй результат»' },
    { label: 'Ошибка', prompt: '«Tool вернул 404 — что делать дальше?»' },
    { label: 'Replan', prompt: '«Перепланируй с учётом ошибки, не повторяй тот же вызов»' },
    { label: 'Reflect', prompt: '«Почему предыдущий шаг не приблизил к цели?»' },
    { label: 'Retry', prompt: '«Попробуй ещё раз с уточнённым промптом»' },
  ];

  const CONVERGE_ITEMS = [
    { label: 'Цель', prompt: '«Ответь на вопрос пользователя по документам»' },
    { label: 'RAG', prompt: '«Извлеки top-3 чанка из vector DB»' },
    { label: 'План', prompt: '«Разбей задачу на проверяемые шаги»' },
    { label: 'Tool', prompt: '«execute_sql(…); верни только JSON»' },
    { label: 'Критик', prompt: '«Сверь ответ с цитатами из RAG»' },
    { label: 'Ответ', prompt: '«Финальный ответ со ссылками на источники»' },
  ];

  const MODES = {
    cycle: {
      title: 'Предельный цикл',
      subtitle: 'Циклическая траектория в embedding space — ReAct без прогресса',
      circular: true,
      circle: { cx: 0.54, cy: 0.5, r: 0.3 },
      startAngle: -Math.PI / 2,
      attractor: null,
      items: CYCLE_ITEMS,
    },
    converge: {
      title: 'Сходимость к аттрактору',
      subtitle: 'Спираль по окружностям → заземлённый ответ',
      circular: false,
      spiral: { cx: 0.54, cy: 0.52, rStart: 0.34, rEnd: 0.05, startAngle: (3 * Math.PI) / 4 },
      attractor: { x: 0.54, y: 0.52 },
      items: CONVERGE_ITEMS,
    },
  };

  function buildCircleThoughts(circle, items, startAngle) {
    const n = items.length;
    return items.map((item, i) => {
      const angle = startAngle + (i / n) * Math.PI * 2;
      return {
        ...item,
        angle,
        x: circle.cx + circle.r * Math.cos(angle),
        y: circle.cy + circle.r * Math.sin(angle),
      };
    });
  }

  function buildSpiralThoughts(spiral, items) {
    const n = items.length;
    return items.map((item, i) => {
      const t = n === 1 ? 0 : i / (n - 1);
      const r = spiral.rStart + (spiral.rEnd - spiral.rStart) * t;
      const angle = spiral.startAngle - t * 0.85;
      return {
        ...item,
        angle,
        r,
        x: spiral.cx + r * Math.cos(angle),
        y: spiral.cy + r * Math.sin(angle),
      };
    });
  }

  function resolveThoughts(modeKey) {
    const m = MODES[modeKey];
    if (m.circular) {
      return buildCircleThoughts(m.circle, m.items, m.startAngle);
    }
    return buildSpiralThoughts(m.spiral, m.items);
  }

  function fieldAt(x, y, modeKey) {
    const m = MODES[modeKey];
    if (modeKey === 'cycle' && m.circle) {
      const { cx, cy, r } = m.circle;
      const nx = (x - cx) / r;
      const ny = (y - cy) / r;
      const dist = Math.hypot(nx, ny) || 1e-6;
      const tx = -ny / dist;
      const ty = nx / dist;
      const radial = (1 - dist) * 0.35;
      const fx = tx + (nx / dist) * radial;
      const fy = ty + (ny / dist) * radial;
      const mag = Math.hypot(fx, fy) || 1e-6;
      return { dx: fx / mag, dy: fy / mag };
    }
    if (modeKey === 'converge' && m.attractor) {
      const dx = m.attractor.x - x;
      const dy = m.attractor.y - y;
      const mag = Math.hypot(dx, dy) || 1e-6;
      const pull = 0.8 + 0.2 * (1 - Math.min(mag * 2.5, 1));
      return { dx: (dx / mag) * pull, dy: (dy / mag) * pull };
    }
    return { dx: 0, dy: 0 };
  }

  function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || container.dataset.initialized === 'true') return;
    if (typeof p5 === 'undefined') return;

    container.dataset.initialized = 'true';
    const promptEl = document.getElementById('phase-prompt-display');

    const sketch = (p) => {
      let mode = 'cycle';
      let thoughts = resolveThoughts(mode);
      let stepIndex = 0;
      let stepProgress = 0;
      let trail = [];
      const padding = { left: 56, right: 24, top: 52, bottom: 72 };

      const colors = {
        field: [67, 233, 123, 55],
        fieldCycle: [250, 112, 154, 50],
        attractor: [56, 201, 160],
        cycle: [250, 112, 154],
        thought: [102, 126, 234],
        thoughtActive: [118, 75, 162],
        trail: [102, 126, 234, 140],
        trailCycle: [250, 112, 154, 150],
        axis: [180, 180, 180],
        text: [60, 60, 60],
        muted: [120, 120, 120],
        promptBg: [245, 245, 248],
        promptActive: [102, 126, 234, 18],
      };

      p.setup = function () {
        const w = Math.min(container.clientWidth || 680, 680);
        const canvas = p.createCanvas(w, 430);
        canvas.parent(CONTAINER_ID);
        p.textFont('system-ui, -apple-system, sans-serif');
        resetAnimation();
      };

      function plotW() {
        return p.width - padding.left - padding.right;
      }

      function plotH() {
        return p.height - padding.top - padding.bottom;
      }

      function toScreen(nx, ny) {
        return {
          x: padding.left + nx * plotW(),
          y: padding.top + (1 - ny) * plotH(),
        };
      }

      function fromScreen(sx, sy) {
        return {
          x: (sx - padding.left) / plotW(),
          y: 1 - (sy - padding.top) / plotH(),
        };
      }

      function resetAnimation() {
        stepIndex = 0;
        stepProgress = 0;
        trail = [];
        updatePromptPanel();
      }

      function setMode(next) {
        mode = next;
        thoughts = resolveThoughts(mode);
        resetAnimation();
        document.querySelectorAll('[data-phase-mode]').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.phaseMode === mode);
        });
      }

      function updatePromptPanel() {
        if (!promptEl) return;
        const lines = thoughts
          .map((t, i) => {
            const active = i === stepIndex;
            const mark = active ? '▸ ' : '  ';
            return `<span class="phase-prompt-line${active ? ' active' : ''}">${mark}<strong>${t.label}:</strong> ${t.prompt}</span>`;
          })
          .join('');
        promptEl.innerHTML = lines;
      }

      p.windowResized = function () {
        const w = Math.min(container.clientWidth || 680, 680);
        p.resizeCanvas(w, 430);
      };

      function agentNormPosition() {
        const m = MODES[mode];
        if (m.circular) {
          const { cx, cy, r } = m.circle;
          const n = thoughts.length;
          const sweep = (stepIndex + stepProgress) * ((Math.PI * 2) / n);
          const ang = m.startAngle + sweep;
          return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
        }
        const a = thoughts[stepIndex];
        const isLast = stepIndex === thoughts.length - 1;
        const b = thoughts[Math.min(stepIndex + 1, thoughts.length - 1)];
        const t = isLast ? 1 : stepProgress;
        return { x: p.lerp(a.x, b.x, t), y: p.lerp(a.y, b.y, t) };
      }

      p.draw = function () {
        p.background(252, 252, 253);
        drawHeader();
        drawAxes();
        drawVectorField();
        drawOrbitGuide();
        drawAttractor();
        drawThoughtGraph();
        drawTrail();
        drawAgent();
        drawPromptStrip();
        advanceStep();
      };

      function drawHeader() {
        const m = MODES[mode];
        p.noStroke();
        p.fill(...colors.text);
        p.textSize(14);
        p.textStyle(p.BOLD);
        p.text(m.title, padding.left, 22);
        p.textStyle(p.NORMAL);
        p.fill(...colors.muted);
        p.textSize(12);
        p.text(m.subtitle, padding.left, 38);
      }

      function drawAxes() {
        const o = toScreen(0, 0);
        const xEnd = toScreen(1, 0);
        const yEnd = toScreen(0, 1);
        p.stroke(...colors.axis);
        p.strokeWeight(1);
        p.line(o.x, o.y, xEnd.x, o.y);
        p.line(o.x, o.y, o.x, yEnd.y);
        p.noStroke();
        p.fill(...colors.muted);
        p.textSize(11);
        p.text('e₁ · intent / grounding', padding.left, p.height - 52);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text('e₂ · confidence', p.width - 12, padding.top - 8);
        p.textAlign(p.LEFT, p.BASELINE);
      }

      function drawVectorField() {
        const cols = 14;
        const rows = 8;
        const isCycle = mode === 'cycle';
        const c = isCycle ? colors.fieldCycle : colors.field;
        const arrowLen = (Math.min(plotW(), plotH()) / cols) * 0.38;

        for (let i = 0; i <= cols; i++) {
          for (let j = 0; j <= rows; j++) {
            const nx = i / cols;
            const ny = j / rows;
            const f = fieldAt(nx, ny, mode);
            const origin = toScreen(nx, ny);
            const tip = toScreen(nx + f.dx * 0.08, ny + f.dy * 0.08);
            const dx = tip.x - origin.x;
            const dy = tip.y - origin.y;
            const mag = Math.hypot(dx, dy) || 1e-6;
            const ux = (dx / mag) * arrowLen;
            const uy = (dy / mag) * arrowLen;

            p.stroke(...c);
            p.strokeWeight(1.2);
            p.line(origin.x, origin.y, origin.x + ux, origin.y + uy);
            const ang = Math.atan2(uy, ux);
            p.push();
            p.translate(origin.x + ux, origin.y + uy);
            p.rotate(ang);
            p.line(0, 0, -5, 3);
            p.line(0, 0, -5, -3);
            p.pop();
          }
        }
      }

      function drawOrbitGuide() {
        const m = MODES[mode];
        if (m.circular && m.circle) {
          const { cx, cy, r } = m.circle;
          const c = toScreen(cx, cy);
          p.noFill();
          p.stroke(...colors.cycle);
          p.strokeWeight(2);
          p.drawingContext.setLineDash([7, 5]);
          p.circle(c.x, c.y, r * 2 * plotW());
          p.drawingContext.setLineDash([]);
          return;
        }
        if (m.spiral) {
          const { cx, cy, rStart, rEnd } = m.spiral;
          p.noFill();
          p.stroke(...colors.attractor, 80);
          p.strokeWeight(1.5);
          p.drawingContext.setLineDash([5, 6]);
          const c1 = toScreen(cx, cy);
          p.circle(c1.x, c1.y, rStart * 2 * plotW());
          p.circle(c1.x, c1.y, rEnd * 2 * plotW() * 0.5);
          p.drawingContext.setLineDash([]);
        }
      }

      function drawAttractor() {
        const att = MODES[mode].attractor;
        if (!att) return;
        const c = toScreen(att.x, att.y);
        p.noStroke();
        p.fill(...colors.attractor, 45);
        p.circle(c.x, c.y, 40);
        p.fill(...colors.attractor);
        p.circle(c.x, c.y, 10);
        p.fill(...colors.muted);
        p.textSize(10);
        p.text('аттрактор', c.x + 14, c.y + 4);
      }

      function drawThoughtGraph() {
        const isCycle = mode === 'cycle';
        if (!isCycle) {
          p.stroke(...colors.thought, 100);
          p.strokeWeight(2);
          for (let i = 0; i < thoughts.length - 1; i++) {
            const a = toScreen(thoughts[i].x, thoughts[i].y);
            const b = toScreen(thoughts[i + 1].x, thoughts[i + 1].y);
            p.line(a.x, a.y, b.x, b.y);
          }
        }

        thoughts.forEach((t, i) => {
          const s = toScreen(t.x, t.y);
          const active = i === stepIndex;
          p.noStroke();
          p.fill(...(active ? colors.thoughtActive : colors.thought), active ? 255 : 185);
          p.circle(s.x, s.y, active ? 24 : 17);
          if (active) {
            p.stroke(...colors.thoughtActive, 90);
            p.strokeWeight(2);
            p.noFill();
            p.circle(s.x, s.y, 32);
          }
          p.noStroke();
          p.fill(active ? 255 : 245);
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(i + 1, s.x, s.y);
          p.textAlign(p.LEFT, p.BASELINE);
          p.fill(...(active ? colors.text : colors.muted));
          p.textSize(11);
          p.textStyle(active ? p.BOLD : p.NORMAL);
          const labelOffset = labelOffsetFor(s, i);
          p.text(t.label, labelOffset.x, labelOffset.y);
          p.textStyle(p.NORMAL);
        });
      }

      function labelOffsetFor(screenPos, index) {
        const m = MODES[mode];
        if (m.circular) {
          const center = toScreen(m.circle.cx, m.circle.cy);
          const dx = screenPos.x - center.x;
          const dy = screenPos.y - center.y;
          const mag = Math.hypot(dx, dy) || 1;
          return {
            x: screenPos.x + (dx / mag) * 24,
            y: screenPos.y + (dy / mag) * 24 + 4,
          };
        }
        return { x: screenPos.x + 16, y: screenPos.y + 4 };
      }

      function drawTrail() {
        const c = mode === 'cycle' ? colors.trailCycle : colors.trail;
        p.noFill();
        p.stroke(...c);
        p.strokeWeight(2.5);
        p.beginShape();
        trail.forEach((pt) => p.vertex(pt.x, pt.y));
        p.endShape();
      }

      function drawAgent() {
        const pos = toScreen(agentNormPosition().x, agentNormPosition().y);
        p.noStroke();
        p.fill(...(mode === 'cycle' ? colors.cycle : colors.attractor));
        p.circle(pos.x, pos.y, 13);
        p.fill(255, 220);
        p.circle(pos.x - 2, pos.y - 2, 3);
      }

      function drawPromptStrip() {
        const active = thoughts[stepIndex];
        const y0 = p.height - 44;
        p.noStroke();
        p.fill(...colors.promptBg);
        p.rect(0, y0, p.width, 44);
        p.fill(...colors.promptActive);
        p.rect(padding.left - 8, y0 + 6, p.width - padding.left - 16, 32, 6);
        p.fill(...colors.text);
        p.textSize(11);
        p.textStyle(p.BOLD);
        p.text(`${active.label}:`, padding.left, y0 + 24);
        p.textStyle(p.NORMAL);
        p.fill(...colors.muted);
        const promptX = padding.left + p.textWidth(`${active.label}: `) + 4;
        p.text(active.prompt, promptX, y0 + 24, p.width - promptX - 12);
      }

      function advanceStep() {
        const pos = toScreen(agentNormPosition().x, agentNormPosition().y);
        if (p.frameCount % 3 === 0) {
          trail.push({ x: pos.x, y: pos.y });
          const maxTrail = mode === 'cycle' ? 140 : 90;
          if (trail.length > maxTrail) trail.shift();
        }

        stepProgress += mode === 'cycle' ? 0.014 : 0.018;
        if (stepProgress >= 1) {
          stepProgress = 0;
          const prev = stepIndex;
          if (mode === 'cycle') {
            stepIndex = (stepIndex + 1) % thoughts.length;
          } else if (stepIndex < thoughts.length - 1) {
            stepIndex++;
          } else {
            stepIndex = 0;
            trail = [];
          }
          if (prev !== stepIndex) updatePromptPanel();
        }
      }

      p.mousePressed = function () {
        if (p.mouseY < padding.top || p.mouseX < padding.left) return;
        const pos = fromScreen(p.mouseX, p.mouseY);
        if (pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) return;
        trail.push(toScreen(agentNormPosition().x, agentNormPosition().y));
      };

      container.querySelectorAll('[data-phase-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.dataset.phaseMode));
      });

      setMode('cycle');
    };

    new p5(sketch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
