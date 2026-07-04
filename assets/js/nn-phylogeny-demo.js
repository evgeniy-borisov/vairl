/**
 * Neural architecture phylogeny — p5.js demo for evolution tree article.
 * Modes: semicircle fan tree, cross-borrow arcs, trait coloring.
 */
(function () {
  const ROOT_ID = 'nn-phylogeny-demo';
  const CANVAS_ID = 'nn-phylogeny-canvas';

  const FAMILY_COLORS = {
    Foundations: [102, 126, 234],
    Convolutional: [46, 204, 113],
    Sequence: [255, 159, 67],
    Attention: [255, 107, 107],
    'Generative LM': [108, 92, 231],
    'Vision Transformer': [26, 188, 156],
    Multimodal: [250, 112, 154],
    Diffusion: [72, 219, 251],
    'Scale & MoE': [162, 155, 254],
    'Open weights': [149, 165, 166],
  };

  const MODELS = [
    { id: 'perceptron', name: 'Perceptron', year: 1957, family: 'Foundations', train: 1, acc: 2, task: 'классификация', mechs: ['linear'] },
    { id: 'adaline', name: 'ADALINE', year: 1960, family: 'Foundations', train: 1, acc: 2, task: 'реgression', mechs: ['linear'] },
    { id: 'mlp', name: 'MLP + backprop', year: 1986, family: 'Foundations', train: 2, acc: 3, task: 'универсальная', mechs: ['backprop'] },
    { id: 'lenet', name: 'LeNet', year: 1998, family: 'Convolutional', train: 2, acc: 3, task: 'CV', mechs: ['conv'] },
    { id: 'alexnet', name: 'AlexNet', year: 2012, family: 'Convolutional', train: 3, acc: 4, task: 'CV', mechs: ['conv', 'gpu'] },
    { id: 'vgg', name: 'VGG', year: 2014, family: 'Convolutional', train: 4, acc: 4, task: 'CV', mechs: ['conv'] },
    { id: 'resnet', name: 'ResNet', year: 2015, family: 'Convolutional', train: 4, acc: 5, task: 'CV', mechs: ['conv', 'residual'] },
    { id: 'densenet', name: 'DenseNet', year: 2017, family: 'Convolutional', train: 4, acc: 4, task: 'CV', mechs: ['conv', 'residual'] },
    { id: 'effnet', name: 'EfficientNet', year: 2019, family: 'Convolutional', train: 3, acc: 5, task: 'CV edge', mechs: ['conv', 'scaling'] },
    { id: 'rnn', name: 'RNN', year: 1986, family: 'Sequence', train: 2, acc: 2, task: 'последовательности', mechs: ['recurrent'] },
    { id: 'lstm', name: 'LSTM', year: 1997, family: 'Sequence', train: 3, acc: 3, task: 'NLP / speech', mechs: ['gating', 'recurrent'] },
    { id: 'gru', name: 'GRU', year: 2014, family: 'Sequence', train: 3, acc: 3, task: 'NLP', mechs: ['gating', 'recurrent'] },
    { id: 'seq2seq', name: 'Seq2Seq + attn', year: 2014, family: 'Sequence', train: 3, acc: 3, task: 'MT', mechs: ['attention', 'recurrent'] },
    { id: 'transformer', name: 'Transformer', year: 2017, family: 'Attention', train: 4, acc: 5, task: 'NLP', mechs: ['attention'] },
    { id: 'bert', name: 'BERT', year: 2018, family: 'Attention', train: 4, acc: 5, task: 'NLP', mechs: ['attention', 'mlm'] },
    { id: 'gpt1', name: 'GPT-1', year: 2018, family: 'Generative LM', train: 4, acc: 4, task: 'LM', mechs: ['attention'] },
    { id: 'gpt2', name: 'GPT-2', year: 2019, family: 'Generative LM', train: 4, acc: 4, task: 'LM', mechs: ['attention', 'scaling'] },
    { id: 'gpt3', name: 'GPT-3', year: 2020, family: 'Generative LM', train: 5, acc: 5, task: 'LM / ICL', mechs: ['attention', 'scaling'] },
    { id: 't5', name: 'T5', year: 2019, family: 'Generative LM', train: 4, acc: 5, task: 'text-to-text', mechs: ['attention'] },
    { id: 'vit', name: 'ViT', year: 2020, family: 'Vision Transformer', train: 4, acc: 5, task: 'CV', mechs: ['attention', 'residual'] },
    { id: 'clip', name: 'CLIP', year: 2021, family: 'Multimodal', train: 5, acc: 5, task: 'vision+text', mechs: ['attention', 'contrastive'] },
    { id: 'ddpm', name: 'DDPM', year: 2020, family: 'Diffusion', train: 4, acc: 4, task: 'генерация', mechs: ['diffusion'] },
    { id: 'sd', name: 'Stable Diffusion', year: 2022, family: 'Diffusion', train: 4, acc: 5, task: 'text2img', mechs: ['diffusion', 'latent'] },
    { id: 'switch', name: 'Switch MoE', year: 2021, family: 'Scale & MoE', train: 5, acc: 4, task: 'LM scale', mechs: ['attention', 'moe'] },
    { id: 'chinchilla', name: 'Chinchilla', year: 2022, family: 'Scale & MoE', train: 5, acc: 5, task: 'LM', mechs: ['scaling'] },
    { id: 'llama', name: 'LLaMA', year: 2023, family: 'Open weights', train: 4, acc: 5, task: 'LM', mechs: ['attention', 'scaling'] },
    { id: 'mixtral', name: 'Mixtral', year: 2023, family: 'Scale & MoE', train: 4, acc: 5, task: 'LM', mechs: ['attention', 'moe'] },
  ];

  const INFLUENCE = [
    ['perceptron', 'mlp', 'слои + backprop'],
    ['mlp', 'lenet', 'свёртки'],
    ['lenet', 'alexnet', 'глубокая CNN'],
    ['alexnet', 'vgg', 'глубина'],
    ['alexnet', 'resnet', 'обучение глубоких сетей'],
    ['resnet', 'densenet', 'skip connections'],
    ['resnet', 'effnet', 'compound scaling'],
    ['resnet', 'vit', 'residual → patches'],
    ['rnn', 'lstm', 'gating'],
    ['lstm', 'gru', 'упрощённые ворота'],
    ['lstm', 'seq2seq', 'encoder-decoder'],
    ['seq2seq', 'transformer', 'pure attention'],
    ['transformer', 'bert', 'bidirectional MLM'],
    ['transformer', 'gpt1', 'decoder-only'],
    ['gpt1', 'gpt2', 'масштаб'],
    ['gpt2', 'gpt3', 'in-context learning'],
    ['transformer', 't5', 'text-to-text'],
    ['transformer', 'vit', 'patch tokens'],
    ['vit', 'clip', 'image-text'],
    ['mlp', 'ddpm', 'score matching'],
    ['ddpm', 'sd', 'latent diffusion'],
    ['transformer', 'switch', 'sparse FFN'],
    ['switch', 'mixtral', 'MoE routing'],
    ['gpt3', 'chinchilla', 'compute-optimal'],
    ['chinchilla', 'llama', 'open scaling'],
    ['llama', 'mixtral', 'MoE at scale'],
  ];

  const MECH_LABELS = {
    attention: 'Attention',
    residual: 'Skip / residual',
    conv: 'Свёртки',
    gating: 'Gating (LSTM/GRU)',
    diffusion: 'Diffusion',
    scaling: 'Scaling laws',
    moe: 'Mixture-of-Experts',
    contrastive: 'Contrastive',
    recurrent: 'Recurrence',
    backprop: 'Backprop',
    linear: 'Linear units',
    mlm: 'Masked LM',
    latent: 'Latent space',
    gpu: 'GPU training',
  };

  const MODES = {
    tree: {
      title: 'Fan tree (полукруг)',
      hint: 'Классическая полукруглая филогения (fan tree / semicircle phylogeny): корень внизу, семейства — промежуточные узлы, листья — модели.',
    },
    borrow: {
      title: 'Заимствования',
      hint: 'Дуги между ветвями — явные архитектурные заимствования (не родство по семейству). Наведите на дугу или выберите механизм.',
    },
    traits: {
      title: 'Признаки',
      hint: 'Размер узла ∝ объём обучающих ресурсов; яркость ∝ относительная точность/SOTA. Цвет — семейство.',
    },
  };

  const TRAIT_MODES = {
    train: { label: 'Данные / compute', key: 'train' },
    acc: { label: 'Точность / SOTA', key: 'acc' },
    year: { label: 'Год', key: 'year' },
  };

  function buildTree() {
    const families = {};
    MODELS.forEach((m) => {
      if (!families[m.family]) families[m.family] = [];
      families[m.family].push(m);
    });
    Object.values(families).forEach((list) => list.sort((a, b) => a.year - b.year));
    return families;
  }

  function buildLayout(p, pad) {
    const tree = buildTree();
    const families = Object.keys(tree);
    const allLeaves = MODELS.slice().sort((a, b) => {
      const fa = families.indexOf(a.family);
      const fb = families.indexOf(b.family);
      return fa - fb || a.year - b.year;
    });
    const n = allLeaves.length;
    const cx = p.width / 2;
    const cy = p.height - pad.bottom;
    const maxR = Math.min(p.width * 0.44, p.height - pad.top - pad.bottom - 20);

    const leafAngles = {};
    allLeaves.forEach((m, i) => {
      const t = (i + 0.5) / n;
      leafAngles[m.id] = Math.PI * (0.08 + 0.84 * t);
    });

    const familyAngles = {};
    families.forEach((fam) => {
      const ids = tree[fam].map((m) => m.id);
      familyAngles[fam] = ids.reduce((s, id) => s + leafAngles[id], 0) / ids.length;
    });

    const rootAngle = Math.PI / 2;

    function polar(theta, r) {
      return {
        x: cx + maxR * r * Math.cos(theta),
        y: cy - maxR * r * Math.sin(theta),
      };
    }

    const nodes = { root: polar(rootAngle, 0) };
    families.forEach((fam) => {
      nodes[`fam:${fam}`] = polar(familyAngles[fam], 0.35);
    });
    allLeaves.forEach((m) => {
      nodes[m.id] = polar(leafAngles[m.id], 0.82);
    });

    return { tree, families, nodes, cx, cy, maxR, rootAngle, familyAngles, leafAngles, polar };
  }

  function nameById(id) {
    return MODELS.find((m) => m.id === id);
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized === 'true') return;
    if (typeof p5 === 'undefined') return;

    root.dataset.initialized = 'true';

    const hintEl = document.getElementById('nn-phylogeny-hint');
    const detailEl = document.getElementById('nn-phylogeny-detail');
    const mechBar = document.getElementById('nn-phylogeny-mechs');

    let mode = 'tree';
    let traitMode = 'train';
    let activeMech = null;
    let hoverId = null;
    let hoverEdge = null;

    const sketch = (p) => {
      let colors = {};
      let layout = null;
      const pad = { top: 36, bottom: 48, side: 16 };

      p.setup = function () {
        const wrap = document.getElementById(CANVAS_ID);
        const w = Math.min(920, wrap?.clientWidth || 920);
        const cnv = p.createCanvas(w, 480);
        cnv.parent(CANVAS_ID);
        p.textFont('system-ui, -apple-system, sans-serif');
        updateColors();
        layout = buildLayout(p, pad);
      };

      function updateColors() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        colors = dark
          ? {
              bg: [22, 24, 32],
              text: [230, 232, 240],
              muted: [140, 145, 165],
              edge: [75, 80, 100],
              borrow: [250, 180, 80],
              borrowDim: [90, 75, 55],
              highlight: [255, 220, 120],
            }
          : {
              bg: [252, 252, 253],
              text: [45, 49, 60],
              muted: [110, 115, 130],
              edge: [200, 205, 218],
              borrow: [230, 126, 34],
              borrowDim: [220, 215, 200],
              highlight: [102, 126, 234],
            };
      }

      function familyColor(fam, alpha) {
        const c = FAMILY_COLORS[fam] || [120, 120, 120];
        return alpha != null ? [...c, alpha] : c;
      }

      function nodeRadius(m) {
        if (mode !== 'traits') return 7;
        const key = TRAIT_MODES[traitMode].key;
        const v = m[key];
        if (key === 'year') return p.map(v, 1957, 2023, 5, 11);
        return 5 + v * 1.8;
      }

      function nodeAlpha(m) {
        if (mode !== 'traits') return 255;
        const key = traitMode === 'train' ? 'acc' : traitMode === 'acc' ? 'acc' : 'acc';
        return 80 + m[key] * 35;
      }

      function hitTest(mx, my) {
        if (!layout) return null;
        let best = null;
        let bestD = 1e9;
        MODELS.forEach((m) => {
          const pt = layout.nodes[m.id];
          if (!pt) return;
          const r = nodeRadius(m) + 4;
          const d = p.dist(mx, my, pt.x, pt.y);
          if (d < r && d < bestD) {
            bestD = d;
            best = m.id;
          }
        });
        return best;
      }

      function edgeHitTest(mx, my) {
        if (mode !== 'borrow' || !layout) return null;
        let best = null;
        let bestD = 18;
        INFLUENCE.forEach(([src, dst, label], idx) => {
          const a = layout.nodes[src];
          const b = layout.nodes[dst];
          if (!a || !b) return;
          const d = distToSegment(mx, my, a.x, a.y, b.x, b.y);
          if (d < bestD) {
            bestD = d;
            best = idx;
          }
        });
        return best;
      }

      function distToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy || 1e-6;
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = p.constrain(t, 0, 1);
        const nx = x1 + t * dx;
        const ny = y1 + t * dy;
        return Math.hypot(px - nx, py - ny);
      }

      function mechMatch(m) {
        if (!activeMech) return true;
        return m.mechs.includes(activeMech);
      }

      function edgeMechMatch(src, dst) {
        if (!activeMech) return true;
        const a = nameById(src);
        const b = nameById(dst);
        return (a && a.mechs.includes(activeMech)) || (b && b.mechs.includes(activeMech));
      }

      function drawTreeEdges() {
        const { tree, families, nodes, rootAngle, familyAngles } = layout;
        p.stroke(...colors.edge);
        p.strokeWeight(1.4);

        families.forEach((fam) => {
          const fa = familyAngles[fam];
          const fc = familyColor(fam, 180);
          const dim = activeMech && !tree[fam].some((m) => mechMatch(m));
          p.stroke(...(dim ? colors.edge : fc));
          p.line(nodes.root.x, nodes.root.y, nodes[`fam:${fam}`].x, nodes[`fam:${fam}`].y);

          tree[fam].forEach((m) => {
            const la = layout.leafAngles[m.id];
            const pt = nodes[m.id];
            const mid = layout.polar((fa + la) / 2, 0.54);
            const dimLeaf = activeMech && !mechMatch(m);
            p.stroke(...(dimLeaf ? colors.edge : fc));
            p.noFill();
            p.beginShape();
            p.vertex(nodes[`fam:${fam}`].x, nodes[`fam:${fam}`].y);
            p.quadraticVertex(mid.x, mid.y, pt.x, pt.y);
            p.endShape();
          });
        });
      }

      function drawBorrowArcs() {
        INFLUENCE.forEach(([src, dst, label], idx) => {
          const a = layout.nodes[src];
          const b = layout.nodes[dst];
          if (!a || !b) return;

          const highlighted =
            hoverEdge === idx ||
            hoverId === src ||
            hoverId === dst ||
            (activeMech && edgeMechMatch(src, dst));

          const dim = activeMech && !edgeMechMatch(src, dst) && hoverEdge !== idx;

          const mx = (a.x + b.x) / 2;
          const my = Math.min(a.y, b.y) - layout.maxR * (0.08 + (idx % 5) * 0.025);

          p.noFill();
          p.strokeWeight(highlighted ? 2.4 : 1.1);
          if (dim) p.stroke(...colors.borrowDim, 90);
          else if (highlighted) p.stroke(...colors.borrow);
          else p.stroke(...colors.borrow, 140);

          p.drawingContext.setLineDash(highlighted ? [] : [5, 5]);
          p.beginShape();
          p.vertex(a.x, a.y);
          p.quadraticVertex(mx, my, b.x, b.y);
          p.endShape();
          p.drawingContext.setLineDash([]);
        });
      }

      function drawNodes() {
        MODELS.forEach((m) => {
          const pt = layout.nodes[m.id];
          if (!pt) return;
          const r = nodeRadius(m);
          const dim = activeMech && !mechMatch(m) && hoverId !== m.id;
          const fc = familyColor(m.family, dim ? 60 : nodeAlpha(m));
          const selected = hoverId === m.id;

          if (selected) {
            p.noFill();
            p.stroke(...colors.highlight);
            p.strokeWeight(2.5);
            p.circle(pt.x, pt.y, r * 3.2);
          }

          p.noStroke();
          p.fill(...fc);
          p.circle(pt.x, pt.y, r * 2);

          if (mode === 'tree' || selected) {
            p.fill(...(dim ? colors.muted : colors.text));
            p.noStroke();
            p.textSize(selected ? 11 : 9);
            p.textAlign(p.CENTER, p.BOTTOM);
            const label = selected ? `${m.name} (${m.year})` : m.name.split(' ')[0];
            p.text(label, pt.x, pt.y - r - 3);
          }
        });

        const { nodes } = layout;
        p.fill(...colors.text);
        p.noStroke();
        p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        p.text('Neural architectures', nodes.root.x, nodes.root.y + 6);

        Object.keys(buildTree()).forEach((fam) => {
          const pt = nodes[`fam:${fam}`];
          p.fill(...familyColor(fam));
          p.textSize(9);
          p.text(fam, pt.x, pt.y - 14);
        });
      }

      function drawLegend() {
        p.fill(...colors.muted);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text(MODES[mode].title, pad.side, 10);
        if (mode === 'traits') {
          p.textSize(10);
          p.text(`Ось: ${TRAIT_MODES[traitMode].label}`, pad.side, 26);
        }
      }

      function syncDetail() {
        if (!detailEl) return;
        if (hoverEdge != null && mode === 'borrow') {
          const [src, dst, label] = INFLUENCE[hoverEdge];
          const a = nameById(src);
          const b = nameById(dst);
          detailEl.innerHTML = `<strong>${a?.name} → ${b?.name}</strong> — ${label}`;
          return;
        }
        const m = hoverId ? nameById(hoverId) : null;
        if (!m) {
          detailEl.textContent = 'Наведите на модель или дугу заимствования. Выберите механизм — подсветятся связанные узлы.';
          return;
        }
        const stars = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
        detailEl.innerHTML =
          `<strong>${m.name}</strong> (${m.year}, ${m.family}) · ` +
          `задача: ${m.task} · данные: ${stars(m.train)} · точность: ${stars(m.acc)} · ` +
          `механизмы: ${m.mechs.map((k) => MECH_LABELS[k] || k).join(', ')}`;
      }

      p.draw = function () {
        updateColors();
        layout = buildLayout(p, pad);
        p.background(...colors.bg);
        drawLegend();

        if (mode === 'borrow') drawBorrowArcs();
        drawTreeEdges();
        drawNodes();

        syncDetail();
      };

      p.mouseMoved = function () {
        hoverId = hitTest(p.mouseX, p.mouseY);
        hoverEdge = mode === 'borrow' ? edgeHitTest(p.mouseX, p.mouseY) : null;
        if (hoverId || hoverEdge != null) p.cursor(p.HAND);
        else p.cursor(p.ARROW);
      };

      p.mousePressed = function () {
        const id = hitTest(p.mouseX, p.mouseY);
        if (id) hoverId = id;
      };

      p.windowResized = function () {
        const wrap = document.getElementById(CANVAS_ID);
        if (!wrap) return;
        const w = Math.min(920, wrap.clientWidth || 920);
        p.resizeCanvas(w, 480);
      };
    };

    new p5(sketch);

    function setMode(next) {
      mode = next;
      root.querySelectorAll('[data-nn-mode]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.nnMode === mode);
      });
      root.querySelectorAll('[data-nn-trait-wrap]').forEach((el) => {
        el.hidden = mode !== 'traits';
      });
      root.querySelectorAll('[data-nn-mech-wrap]').forEach((el) => {
        el.hidden = mode === 'traits';
      });
      if (hintEl) hintEl.textContent = MODES[mode].hint;
    }

    root.querySelectorAll('[data-nn-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.nnMode));
    });

    root.querySelectorAll('[data-nn-trait]').forEach((btn) => {
      btn.addEventListener('click', () => {
        traitMode = btn.dataset.nnTrait;
        root.querySelectorAll('[data-nn-trait]').forEach((b) => {
          b.classList.toggle('active', b.dataset.nnTrait === traitMode);
        });
      });
    });

    if (mechBar) {
      const mechs = [...new Set(MODELS.flatMap((m) => m.mechs))].sort();
      mechBar.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.textContent = 'Все';
      allBtn.className = 'active';
      allBtn.addEventListener('click', () => {
        activeMech = null;
        mechBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        allBtn.classList.add('active');
      });
      mechBar.appendChild(allBtn);

      mechs.forEach((k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = MECH_LABELS[k] || k;
        btn.addEventListener('click', () => {
          activeMech = k;
          mechBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        });
        mechBar.appendChild(btn);
      });
    }

    setMode('tree');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
