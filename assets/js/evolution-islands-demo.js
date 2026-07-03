/**
 * Island population evolution — p5.js demo for ShinkaEvolve / AlphaEvolve / GigaEvo article.
 * Modes: islands (3 parallel trees), tree (phylogeny), pipeline (step cycle).
 */
(function () {
  const ROOT_ID = 'evolution-islands-demo';
  const CANVAS_ID = 'evolution-islands-canvas';

  const ISLANDS = [
    { id: 0, name: 'Остров A', subtitle: 'explore', color: [255, 107, 107] },
    { id: 1, name: 'Остров B', subtitle: 'balance', color: [66, 133, 244] },
    { id: 2, name: 'Остров C', subtitle: 'exploit', color: [108, 92, 231] },
  ];

  const PHASES = [
    {
      id: 'select',
      label: '① Отбор',
      short: 'Select',
      desc: 'Weighted parent sampling: баланс fitness и числа потомков. Лучший острова защищён от миграции.',
    },
    {
      id: 'mutate',
      label: '② Мутация',
      short: 'LLM',
      desc: 'LLM предлагает diff / rewrite. Novelty rejection отбраковывает почти идентичный код (embedding + judge).',
    },
    {
      id: 'eval',
      label: '③ Запуск',
      short: 'Eval',
      desc: 'Evaluator запускает программу: circle packing → Σrᵢ, Heilbronn → min area. Текстовый feedback в промпт.',
    },
    {
      id: 'archive',
      label: '④ Архив',
      short: 'MAP',
      desc: 'MAP-Elites: ячейка (fitness × validity). Улучшение — в архив; иначе discard.',
    },
    {
      id: 'migrate',
      label: '⑤ Миграция',
      short: 'Migrate',
      desc: 'Элита переезжает на соседний остров — обмен стратегиями между «потоками открытий».',
    },
  ];

  const MODES = {
    islands: { title: 'Три острова', hint: 'Параллельные подпопуляции из одного seed. Цвет узла — fitness.' },
    tree: { title: 'Дерево эволюции', hint: 'Филогения одного острова: stepping stones → SOTA-ветка (как ShinkaEvolve Fig. 5).' },
    pipeline: { title: 'Цикл поколения', hint: 'Один шаг эволюции: отбор → мутация → eval → архив → миграция.' },
  };

  function fitnessColor(p, f) {
    const t = p.constrain(f, 0, 1);
    if (t < 0.5) return p.lerpColor(p.color(220, 80, 80), p.color(254, 202, 87), t * 2);
    return p.lerpColor(p.color(254, 202, 87), p.color(46, 204, 113), (t - 0.5) * 2);
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  class EvolutionSim {
    constructor() {
      this.rng = makeRng(42);
      this.nodes = [];
      this.nextId = 0;
      this.generation = 0;
      this.phaseIdx = 0;
      this.activeIsland = 0;
      this.pending = null;
      this.migrant = null;
      this.migrantT = 0;
      this.rejectedFlash = null;
      this.treeIsland = 0;
      this.log = [];
      this.reset();
    }

    reset() {
      this.nodes = [];
      this.nextId = 0;
      this.generation = 0;
      this.phaseIdx = 0;
      this.activeIsland = 0;
      this.pending = null;
      this.migrant = null;
      this.migrantT = 0;
      this.rejectedFlash = null;
      this.log = [];
      ISLANDS.forEach((isl, i) => {
        this.addNode(null, i, 0, 0.22 + i * 0.02);
      });
      this.pushLog('Инициализация: по одной программе на остров (общий seed).');
    }

    addNode(parentId, islandId, gen, fitness) {
      const id = this.nextId++;
      const node = {
        id,
        parentId,
        islandId,
        gen,
        fitness: Math.min(0.99, Math.max(0.05, fitness)),
        label: `P${id}`,
        rejected: false,
      };
      this.nodes.push(node);
      return node;
    }

    islandNodes(islandId) {
      return this.nodes.filter((n) => n.islandId === islandId && !n.rejected);
    }

    bestOnIsland(islandId) {
      const list = this.islandNodes(islandId);
      if (!list.length) return null;
      return list.reduce((a, b) => (a.fitness >= b.fitness ? a : b));
    }

    weightedParent(islandId) {
      const list = this.islandNodes(islandId);
      if (!list.length) return null;
      const weights = list.map((n) => {
        const rank = [...list].sort((a, b) => b.fitness - a.fitness).indexOf(n) + 1;
        return Math.pow(rank, -0.85) * (0.4 + n.fitness);
      });
      const sum = weights.reduce((a, b) => a + b, 0);
      let r = this.rng() * sum;
      for (let i = 0; i < list.length; i++) {
        r -= weights[i];
        if (r <= 0) return list[i];
      }
      return list[list.length - 1];
    }

    pushLog(msg) {
      this.log.unshift(msg);
      if (this.log.length > 6) this.log.pop();
    }

    advancePhase() {
      const phase = PHASES[this.phaseIdx];
      const isl = this.activeIsland;

      if (phase.id === 'select') {
        const parent = this.weightedParent(isl);
        this.pending = { parent, islandId: isl, child: null };
        this.pushLog(`${ISLANDS[isl].name}: отобран родитель ${parent.label} (f=${parent.fitness.toFixed(2)}).`);
      } else if (phase.id === 'mutate') {
        if (!this.pending) return;
        const p = this.pending.parent;
        const jump = this.rng() < 0.12 ? 0.08 + this.rng() * 0.12 : 0;
        const delta = (this.rng() - 0.38) * 0.07 + jump;
        let fitness = Math.min(0.98, Math.max(0.05, p.fitness + delta));
        const noveltyFail = this.rng() < 0.14 && delta < 0.02;
        this.pending.child = {
          parentId: p.id,
          islandId: isl,
          gen: this.generation + 1,
          fitness,
          noveltyFail,
        };
        if (noveltyFail) {
          this.pushLog(`${ISLANDS[isl].name}: novelty reject — слишком похож на архив.`);
        } else {
          this.pushLog(`${ISLANDS[isl].name}: LLM-мутация → кандидат f≈${fitness.toFixed(2)}.`);
        }
      } else if (phase.id === 'eval') {
        if (!this.pending || this.pending.child.noveltyFail) return;
        const c = this.pending.child;
        const noise = (this.rng() - 0.5) * 0.02;
        c.fitness = Math.min(0.99, Math.max(0.05, c.fitness + noise));
        this.pushLog(`Evaluator: запуск… метрика ${c.fitness.toFixed(3)} (поколение ${c.gen}).`);
      } else if (phase.id === 'archive') {
        if (!this.pending) return;
        const c = this.pending.child;
        if (c.noveltyFail) {
          this.rejectedFlash = { islandId: isl, t: 1 };
          this.pending = null;
          return;
        }
        const parentBest = this.bestOnIsland(isl);
        const accepted = c.fitness >= parentBest.fitness * 0.92 || this.rng() < 0.35;
        if (accepted) {
          const node = this.addNode(c.parentId, c.islandId, c.gen, c.fitness);
          if (c.fitness > (parentBest?.fitness || 0)) {
            this.pushLog(`✓ ${node.label} в архив — новый лидер острова (f=${c.fitness.toFixed(3)}).`);
          } else {
            this.pushLog(`✓ ${node.label} в MAP-Elites ячейку (diversity).`);
          }
        } else {
          this.rejectedFlash = { islandId: isl, t: 1 };
          this.pushLog(`✗ Кандидат отброшен — нет улучшения ячейки.`);
        }
        this.pending = null;
      } else if (phase.id === 'migrate') {
        if (this.generation % 3 === 2) {
          const from = isl;
          const to = (isl + 1) % ISLANDS.length;
          const best = this.bestOnIsland(from);
          if (best && best.gen > 0) {
            const copy = this.addNode(best.id, to, best.gen, best.fitness * (0.97 + this.rng() * 0.04));
            this.migrant = { from, to, nodeId: copy.id, t: 0 };
            this.pushLog(`Миграция: ${best.label} с ${ISLANDS[from].name} → ${ISLANDS[to].name}.`);
          }
        }
        this.generation++;
        this.activeIsland = (isl + 1) % ISLANDS.length;
      }

      this.phaseIdx = (this.phaseIdx + 1) % PHASES.length;
    }

    tick(speed) {
      if (this.migrant) {
        this.migrant.t += 0.04 * speed;
        if (this.migrant.t >= 1) this.migrant = null;
      }
      if (this.rejectedFlash) {
        this.rejectedFlash.t -= 0.03 * speed;
        if (this.rejectedFlash.t <= 0) this.rejectedFlash = null;
      }
    }
  }

  function layoutIslandTree(nodes, x0, y0, w, h) {
    const byGen = {};
    nodes.forEach((n) => {
      if (!byGen[n.gen]) byGen[n.gen] = [];
      byGen[n.gen].push(n);
    });
    const gens = Object.keys(byGen)
      .map(Number)
      .sort((a, b) => a - b);
    const maxGen = Math.max(1, ...gens);
    const pos = new Map();
    gens.forEach((g) => {
      const row = byGen[g];
      row.forEach((n, i) => {
        const tx = x0 + ((i + 1) / (row.length + 1)) * w;
        const ty = y0 + 36 + (g / maxGen) * (h - 48);
        pos.set(n.id, { x: tx, y: ty });
      });
    });
    return pos;
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized === 'true') return;
    if (typeof p5 === 'undefined') return;

    root.dataset.initialized = 'true';
    const logEl = document.getElementById('evolution-islands-log');
    const hintEl = document.getElementById('evolution-islands-hint');
    const phaseEl = document.getElementById('evolution-islands-phase');
    const genEl = document.getElementById('evolution-islands-gen');

    const sim = new EvolutionSim();
    let mode = 'islands';
    let playing = true;
    let speed = 1;
    let phaseTimer = 0;

    const sketch = (p) => {
      let colors = {};

      p.setup = function () {
        const wrap = document.getElementById(CANVAS_ID);
        const w = Math.min(920, wrap.clientWidth || 920);
        const cnv = p.createCanvas(w, 440);
        cnv.parent(CANVAS_ID);
        p.textFont('system-ui, -apple-system, sans-serif');
        updateColors();
      };

      function updateColors() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        colors = dark
          ? {
              bg: [22, 24, 32],
              panel: [32, 35, 48],
              border: [55, 58, 72],
              text: [230, 232, 240],
              muted: [140, 145, 165],
              edge: [90, 95, 115],
            }
          : {
              bg: [252, 252, 253],
              panel: [247, 247, 249],
              border: [232, 232, 236],
              text: [45, 49, 60],
              muted: [110, 115, 130],
              edge: [190, 195, 210],
            };
      }

      function drawNode(px, py, r, fitness, islandColor, highlight) {
        const fc = fitnessColor(p, fitness);
        p.noStroke();
        if (highlight) {
          p.fill(...islandColor, 40);
          p.circle(px, py, r * 2.8);
        }
        p.fill(fc);
        p.circle(px, py, r * 2);
        p.stroke(...colors.border);
        p.strokeWeight(1);
        p.noFill();
        p.circle(px, py, r * 2);
        p.noStroke();
      }

      function drawEdges(pos, nodes, islandId) {
        p.stroke(...colors.edge);
        p.strokeWeight(1.2);
        nodes
          .filter((n) => n.islandId === islandId && n.parentId != null)
          .forEach((n) => {
            const a = pos.get(n.parentId);
            const b = pos.get(n.id);
            if (a && b) p.line(a.x, a.y, b.x, b.y);
          });
      }

      function drawIslandsMode() {
        const pad = 12;
        const colW = (p.width - pad * 4) / 3;
        ISLANDS.forEach((isl, idx) => {
          const x0 = pad + idx * (colW + pad);
          const y0 = 52;
          const h = p.height - y0 - 16;
          p.fill(...colors.panel);
          p.stroke(...colors.border);
          p.strokeWeight(1);
          p.rect(x0, y0, colW, h, 8);
          p.noStroke();
          p.fill(...isl.color);
          p.rect(x0, y0, colW, 28, 8, 8, 0, 0);
          p.fill(255);
          p.textSize(12);
          p.textStyle(p.BOLD);
          p.text(isl.name, x0 + 10, y0 + 18);
          p.textStyle(p.NORMAL);
          p.textSize(10);
          p.fill(255, 200);
          p.text(isl.subtitle, x0 + colW - 10, y0 + 18);
          p.textAlign(p.RIGHT);

          const nodes = sim.islandNodes(isl.id);
          const pos = layoutIslandTree(nodes, x0 + 6, y0 + 28, colW - 12, h - 36);
          drawEdges(pos, nodes, isl.id);

          const best = sim.bestOnIsland(isl.id);
          nodes.forEach((n) => {
            const pt = pos.get(n.id);
            if (!pt) return;
            const hl =
              sim.pending?.parent?.id === n.id ||
              (sim.pending?.child && sim.pending.parent?.id === n.parentId && sim.activeIsland === isl.id);
            const r = 5 + n.fitness * 5;
            drawNode(pt.x, pt.y, r, n.fitness, isl.color, hl || n.id === best?.id);
          });

          if (sim.rejectedFlash?.islandId === isl.id) {
            p.fill(220, 60, 60, 80 * sim.rejectedFlash.t);
            p.noStroke();
            p.rect(x0, y0, colW, h, 8);
          }

          p.textAlign(p.LEFT);
        });

        if (sim.migrant) {
          const m = sim.migrant;
          const xFrom = pad + m.from * (colW + pad) + colW / 2;
          const xTo = pad + m.to * (colW + pad) + colW / 2;
          const y = p.height / 2;
          const t = m.t;
          const mx = p.lerp(xFrom, xTo, t);
          const my = y - 40 * p.sin(t * p.PI);
          p.fill(...ISLANDS[m.to].color);
          p.noStroke();
          p.circle(mx, my, 10);
        }

        p.fill(...colors.muted);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.LEFT);
        p.text('Миграция элит — дуга между островами', pad, 36);
      }

      function drawTreeMode() {
        const isl = sim.treeIsland;
        const ic = ISLANDS[isl];
        const pad = 20;
        const nodes = sim.islandNodes(isl.id);
        const pos = layoutIslandTree(nodes, pad, 48, p.width - pad * 2, p.height - 70);

        p.fill(...colors.muted);
        p.noStroke();
        p.textSize(11);
        p.text(`Филогения: ${ic.name} — ${nodes.length} программ, gen ≤ ${sim.generation}`, pad, 36);

        drawEdges(pos, nodes, isl.id);

        const bestPath = new Set();
        let cur = sim.bestOnIsland(isl.id);
        while (cur) {
          bestPath.add(cur.id);
          cur = cur.parentId != null ? sim.nodes.find((n) => n.id === cur.parentId) : null;
        }

        p.stroke(...ic.color);
        p.strokeWeight(2.8);
        nodes
          .filter((n) => n.islandId === isl.id && n.parentId != null && bestPath.has(n.id) && bestPath.has(n.parentId))
          .forEach((n) => {
            const a = pos.get(n.parentId);
            const b = pos.get(n.id);
            if (a && b) p.line(a.x, a.y, b.x, b.y);
          });

        nodes.forEach((n) => {
          const pt = pos.get(n.id);
          if (!pt) return;
          const onBest = bestPath.has(n.id);
          const r = 6 + n.fitness * 7;
          drawNode(pt.x, pt.y, r, n.fitness, ic.color, onBest);
          if (onBest) {
            p.stroke(...ic.color);
            p.strokeWeight(2.5);
            p.noFill();
            p.circle(pt.x, pt.y, r * 2.4);
          }
        });

        p.noStroke();
        p.fill(...colors.muted);
        p.textSize(10);
        p.text('Ветка к лучшему fitness (stepping stones)', pad, p.height - 12);
      }

      function drawPipelineMode() {
        const pad = 16;
        const stepW = (p.width - pad * 2) / PHASES.length;
        const cy = p.height * 0.38;
        const phase = PHASES[(sim.phaseIdx + PHASES.length - 1) % PHASES.length];

        PHASES.forEach((ph, i) => {
          const cx = pad + stepW * i + stepW / 2;
          const active = ph.id === phase.id;
          p.fill(active ? [...ISLANDS[sim.activeIsland].color, 35] : [...colors.panel]);
          p.stroke(active ? ISLANDS[sim.activeIsland].color : colors.border);
          p.strokeWeight(active ? 2 : 1);
          p.rect(cx - stepW / 2 + 6, cy - 44, stepW - 12, 88, 10);
          p.noStroke();
          p.fill(active ? ISLANDS[sim.activeIsland].color : colors.muted);
          p.textSize(11);
          p.textAlign(p.CENTER);
          p.textStyle(active ? p.BOLD : p.NORMAL);
          p.text(ph.label, cx, cy - 18);
          p.textStyle(p.NORMAL);
          p.textSize(10);
          p.fill(...colors.text);
          p.text(ph.short, cx, cy + 4);
        });

        for (let i = 0; i < PHASES.length - 1; i++) {
          const x1 = pad + stepW * i + stepW / 2 + 40;
          const x2 = pad + stepW * (i + 1) + stepW / 2 - 40;
          p.stroke(...colors.edge);
          p.strokeWeight(2);
          p.line(x1, cy, x2, cy);
          p.fill(...colors.muted);
          p.noStroke();
          p.triangle(x2, cy, x2 - 8, cy - 4, x2 - 8, cy + 4);
        }

        const agentY = cy + 100;
        if (sim.pending?.parent) {
          const px = pad + stepW * 0.5;
          drawNode(px, agentY, 10, sim.pending.parent.fitness, ISLANDS[sim.activeIsland].color, true);
          p.fill(...colors.text);
          p.textSize(11);
          p.textAlign(p.CENTER);
          p.text(sim.pending.parent.label, px, agentY + 28);
        }
        if (sim.pending?.child && !sim.pending.child.noveltyFail && sim.phaseIdx >= 2) {
          const px = pad + stepW * 2.5;
          drawNode(px, agentY, 10, sim.pending.child.fitness, ISLANDS[sim.activeIsland].color, true);
          p.fill(...colors.text);
          p.text(sim.pending.child.label || '?', px, agentY + 28);
        }

        p.textAlign(p.LEFT);
        p.fill(...colors.muted);
        p.textSize(11);
        p.text(phase.desc, pad, p.height - 52, p.width - pad * 2);
      }

      function syncDom() {
        const phase = PHASES[(sim.phaseIdx + PHASES.length - 1) % PHASES.length];
        if (phaseEl) {
          phaseEl.textContent = `${phase.label} · ${ISLANDS[sim.activeIsland].name}`;
        }
        if (genEl) genEl.textContent = `Поколение ${sim.generation}`;
        if (hintEl) hintEl.textContent = MODES[mode].hint;
        if (logEl) {
          logEl.innerHTML = sim.log
            .map((line, i) => `<span class="evo-log-line${i === 0 ? ' active' : ''}">${line}</span>`)
            .join('');
        }
      }

      p.draw = function () {
        updateColors();
        p.background(...colors.bg);

        if (playing) {
          phaseTimer += speed;
          if (phaseTimer >= 28) {
            phaseTimer = 0;
            sim.advancePhase();
            syncDom();
          }
          sim.tick(speed);
        }

        if (mode === 'islands') drawIslandsMode();
        else if (mode === 'tree') drawTreeMode();
        else drawPipelineMode();

        syncDom();
      };

      p.windowResized = function () {
        const wrap = document.getElementById(CANVAS_ID);
        if (!wrap) return;
        const w = Math.min(920, wrap.clientWidth || 920);
        p.resizeCanvas(w, 440);
      };

      function setMode(next) {
        mode = next;
        root.querySelectorAll('[data-evo-mode]').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.evoMode === mode);
        });
        if (hintEl) hintEl.textContent = MODES[mode].hint;
      }

      root.querySelectorAll('[data-evo-mode]').forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.dataset.evoMode));
      });

      root.querySelector('[data-evo-play]')?.addEventListener('click', () => {
        playing = !playing;
        root.querySelector('[data-evo-play]').textContent = playing ? '⏸ Пауза' : '▶ Старт';
      });

      root.querySelector('[data-evo-step]')?.addEventListener('click', () => {
        sim.advancePhase();
        syncDom();
      });

      root.querySelector('[data-evo-reset]')?.addEventListener('click', () => {
        sim.reset();
        phaseTimer = 0;
        syncDom();
      });

      root.querySelector('[data-evo-island]')?.addEventListener('change', (e) => {
        sim.treeIsland = parseInt(e.target.value, 10) || 0;
      });

      const speedInput = root.querySelector('[data-evo-speed]');
      if (speedInput) {
        speedInput.addEventListener('input', () => {
          speed = parseFloat(speedInput.value) || 1;
        });
      }

      setMode('islands');
      syncDom();
    };

    new p5(sketch);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
