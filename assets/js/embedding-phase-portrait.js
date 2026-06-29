/**
 * Discrete embedding space / phase portrait for CoT trajectories.
 * Instance-mode p5.js — does not conflict with global fish-animation sketch.
 */
(function () {
  const CONTAINER_ID = 'embedding-phase-portrait';

  const MODES = {
    converge: {
      title: 'Сходимость к аттрактору',
      subtitle: 'Chain of thought → заземлённый ответ',
      attractor: { x: 0.78, y: 0.22 },
      limitCycle: null,
      thoughts: [
        { label: 'Цель', x: 0.12, y: 0.82 },
        { label: 'RAG', x: 0.22, y: 0.68 },
        { label: 'План', x: 0.36, y: 0.56 },
        { label: 'Tool', x: 0.5, y: 0.44 },
        { label: 'Критик', x: 0.64, y: 0.34 },
        { label: 'Ответ', x: 0.76, y: 0.26 },
      ],
    },
    cycle: {
      title: 'Предельный цикл',
      subtitle: 'ReAct-loop без прогресса',
      attractor: null,
      limitCycle: { cx: 0.52, cy: 0.48, a: 0.28, b: 0.2 },
      thoughts: [
        { label: 'План', x: 0.38, y: 0.38 },
        { label: 'Act', x: 0.62, y: 0.36 },
        { label: 'Ошибка', x: 0.7, y: 0.52 },
        { label: 'Replan', x: 0.58, y: 0.66 },
        { label: 'Reflect', x: 0.4, y: 0.62 },
      ],
    },
  };

  function fieldAt(x, y, mode) {
    const m = MODES[mode];
    if (mode === 'converge' && m.attractor) {
      const dx = m.attractor.x - x;
      const dy = m.attractor.y - y;
      const mag = Math.hypot(dx, dy) || 1e-6;
      const pull = 0.85 + 0.15 * (1 - Math.min(mag * 2, 1));
      return { dx: (dx / mag) * pull, dy: (dy / mag) * pull };
    }
    if (mode === 'cycle' && m.limitCycle) {
      const { cx, cy, a, b } = m.limitCycle;
      const nx = (x - cx) / a;
      const ny = (y - cy) / b;
      const r = Math.hypot(nx, ny) || 1e-6;
      const tx = -ny / r;
      const ty = nx / r;
      const rx = (1 - r) * (nx / r);
      const ry = (1 - r) * (ny / r);
      const fx = tx * 0.72 + rx * 0.28;
      const fy = ty * 0.72 + ry * 0.28;
      const mag = Math.hypot(fx, fy) || 1e-6;
      return { dx: fx / mag, dy: fy / mag };
    }
    return { dx: 0, dy: 0 };
  }

  function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || container.dataset.initialized === 'true') return;
    if (typeof p5 === 'undefined') return;

    container.dataset.initialized = 'true';

    const sketch = (p) => {
      let mode = 'converge';
      let stepIndex = 0;
      let stepProgress = 0;
      let trail = [];
      const padding = { left: 56, right: 24, top: 52, bottom: 44 };

      const colors = {
        field: [67, 233, 123, 55],
        fieldCycle: [250, 112, 154, 50],
        attractor: [56, 201, 160],
        cycle: [250, 112, 154],
        thought: [102, 126, 234],
        thoughtActive: [118, 75, 162],
        trail: [102, 126, 234, 140],
        trailCycle: [250, 112, 154, 130],
        axis: [180, 180, 180],
        text: [60, 60, 60],
        muted: [120, 120, 120],
      };

      p.setup = function () {
        const w = Math.min(container.clientWidth || 680, 680);
        const canvas = p.createCanvas(w, 400);
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
      }

      function setMode(next) {
        mode = next;
        resetAnimation();
        document.querySelectorAll('[data-phase-mode]').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.phaseMode === mode);
        });
      }

      p.windowResized = function () {
        const w = Math.min(container.clientWidth || 680, 680);
        p.resizeCanvas(w, 400);
      };

      p.draw = function () {
        p.background(252, 252, 253);
        drawHeader();
        drawAxes();
        drawVectorField();
        drawLimitCycle();
        drawAttractor();
        drawThoughtGraph();
        drawTrail();
        drawAgent();
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
        p.text('e₁ · intent / grounding', padding.left, p.height - 14);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text('e₂ · confidence', p.width - 12, padding.top - 8);
        p.textAlign(p.LEFT, p.BASELINE);
      }

      function drawVectorField() {
        const cols = 14;
        const rows = 9;
        const isCycle = mode === 'cycle';
        const c = isCycle ? colors.fieldCycle : colors.field;
        const arrowLen = Math.min(plotW(), plotH()) / cols * 0.38;

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

      function drawLimitCycle() {
        const lc = MODES[mode].limitCycle;
        if (!lc) return;
        const c = toScreen(lc.cx, lc.cy);
        p.noFill();
        p.stroke(...colors.cycle);
        p.strokeWeight(2);
        p.drawingContext.setLineDash([6, 5]);
        p.ellipse(c.x, c.y, lc.a * 2 * plotW(), lc.b * 2 * plotH());
        p.drawingContext.setLineDash([]);
      }

      function drawAttractor() {
        const att = MODES[mode].attractor;
        if (!att) return;
        const c = toScreen(att.x, att.y);
        p.noStroke();
        p.fill(...colors.attractor, 40);
        p.circle(c.x, c.y, 36);
        p.fill(...colors.attractor);
        p.circle(c.x, c.y, 10);
        p.fill(...colors.muted);
        p.textSize(10);
        p.text('аттрактор', c.x + 14, c.y + 4);
      }

      function drawThoughtGraph() {
        const thoughts = MODES[mode].thoughts;
        p.stroke(...colors.thought, 90);
        p.strokeWeight(1.5);
        for (let i = 0; i < thoughts.length; i++) {
          const a = toScreen(thoughts[i].x, thoughts[i].y);
          const b = toScreen(
            thoughts[(i + 1) % thoughts.length].x,
            thoughts[(i + 1) % thoughts.length].y
          );
          if (mode === 'converge' && i === thoughts.length - 1) continue;
          p.line(a.x, a.y, b.x, b.y);
        }

        thoughts.forEach((t, i) => {
          const s = toScreen(t.x, t.y);
          const active = i === stepIndex;
          p.noStroke();
          p.fill(...(active ? colors.thoughtActive : colors.thought), active ? 255 : 200);
          p.circle(s.x, s.y, active ? 22 : 16);
          p.fill(active ? 255 : 240);
          p.textSize(10);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(i + 1, s.x, s.y);
          p.textAlign(p.LEFT, p.BASELINE);
          p.fill(...colors.text);
          p.textSize(11);
          p.text(t.label, s.x + 14, s.y + 4);
        });
      }

      function agentPosition() {
        const thoughts = MODES[mode].thoughts;
        const a = thoughts[stepIndex];
        const b = thoughts[(stepIndex + 1) % thoughts.length];
        const t = mode === 'converge' && stepIndex === thoughts.length - 1 ? 1 : stepProgress;
        const nx = p.lerp(a.x, b.x, t);
        const ny = p.lerp(a.y, b.y, t);
        return toScreen(nx, ny);
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
        const pos = agentPosition();
        p.noStroke();
        p.fill(...(mode === 'cycle' ? colors.cycle : colors.attractor));
        p.circle(pos.x, pos.y, 12);
        p.fill(255, 220);
        p.circle(pos.x - 2, pos.y - 2, 3);
      }

      function advanceStep() {
        const thoughts = MODES[mode].thoughts;
        const pos = agentPosition();
        if (p.frameCount % 4 === 0) {
          trail.push({ x: pos.x, y: pos.y });
          if (trail.length > 80) trail.shift();
        }

        stepProgress += 0.018;
        if (stepProgress >= 1) {
          stepProgress = 0;
          if (mode === 'converge') {
            if (stepIndex < thoughts.length - 1) stepIndex++;
            else {
              stepIndex = 0;
              trail = [];
            }
          } else {
            stepIndex = (stepIndex + 1) % thoughts.length;
          }
        }
      }

      p.mousePressed = function () {
        if (p.mouseY < padding.top || p.mouseX < padding.left) return;
        const pos = fromScreen(p.mouseX, p.mouseY);
        if (pos.x < 0 || pos.x > 1 || pos.y < 0 || pos.y > 1) return;
        trail.push(agentPosition());
      };

      container.querySelectorAll('[data-phase-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.dataset.phaseMode));
      });

      setMode('converge');
    };

    new p5(sketch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
