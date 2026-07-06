/**
 * Neural architecture phylogeny — p5.js demo.
 * Fan tree, borrow arcs, timeline, catalog list; split panel with PyTorch snippets.
 */
(function () {
  const ROOT_ID = 'nn-phylogeny-demo';
  const CANVAS_ID = 'nn-phylogeny-canvas';
  const LIST_ID = 'nn-phylogeny-list';
  const PANEL_ID = 'nn-phylogeny-panel';
  const SPLIT_ID = 'nn-phylogeny-split';

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
      title: 'Дерево (fan tree)',
      hint: 'Филогения семейств на полукруге. Клик по узлу — описание и PyTorch-код.',
    },
    borrow: {
      title: 'Заимствования',
      hint: 'Межветочные дуги — кто у кого взял идею. Клик по узлу — детали и код.',
    },
    timeline: {
      title: 'Время выхода',
      hint: 'График по годам публикации: ось X — время, полосы — семейства. Клик — карточка модели.',
    },
    list: {
      title: 'Список архитектур',
      hint: 'Полный каталог 27 моделей: год, описание, достижение и особенности. Клик — PyTorch.',
    },
  };

  const YEAR_MIN = 1955;
  const YEAR_MAX = 2024;

  const ARC_START = Math.PI * 0.05;
  const ARC_END = Math.PI * 0.95;
  const FAMILY_GAP = 0.035;

  const HLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/';
  const HLJS_THEMES = {
    light: { file: 'github.min.css', label: 'GitHub Light' },
    dark: { file: 'github-dark.min.css', label: 'GitHub Dark' },
  };

  let hljsReady = null;
  let hljsThemeLink = null;

  function loadHighlight() {
    if (hljsReady) return hljsReady;
    hljsReady = new Promise((resolve) => {
      if (window.hljs) {
        resolve(window.hljs);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
      script.onload = () => {
        const py = document.createElement('script');
        py.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js';
        py.onload = () => resolve(window.hljs);
        document.head.appendChild(py);
      };
      document.head.appendChild(script);
    });
    return hljsReady;
  }

  function ensureHljsThemeLink() {
    if (hljsThemeLink) return hljsThemeLink;
    hljsThemeLink = document.getElementById('nn-phylogeny-hljs-theme');
    if (!hljsThemeLink) {
      hljsThemeLink = document.createElement('link');
      hljsThemeLink.id = 'nn-phylogeny-hljs-theme';
      hljsThemeLink.rel = 'stylesheet';
      document.head.appendChild(hljsThemeLink);
    }
    return hljsThemeLink;
  }

  function applyHljsTheme(theme) {
    const cfg = HLJS_THEMES[theme] || HLJS_THEMES.light;
    ensureHljsThemeLink().href = HLJS_BASE + cfg.file;
    return loadHighlight().then((hljs) => {
      const body = document.querySelector(`#${PANEL_ID} .nn-panel-body`);
      if (!body) return;
      body.querySelectorAll('pre code').forEach((el) => {
        el.removeAttribute('data-highlighted');
        el.className = 'language-python';
        hljs.highlightElement(el);
      });
    });
  }

  function buildTree() {
    const families = {};
    const order = [];
    MODELS.forEach((m) => {
      if (!families[m.family]) {
        families[m.family] = [];
        order.push(m.family);
      }
      families[m.family].push(m);
    });
    order.forEach((fam) => families[fam].sort((a, b) => a.year - b.year));
    return { families, order };
  }

  function buildLayout(p, pad, treePaneW, treePaneH) {
    const { families, order } = buildTree();
    const cx = treePaneW / 2;
    const cy = treePaneH - pad.bottom;
    const maxR = Math.min(treePaneW * 0.46, treePaneH - pad.top - pad.bottom - 24);

    const totalLeaves = MODELS.length;
    const nGaps = Math.max(0, order.length - 1);
    const leafArc = ARC_END - ARC_START - nGaps * FAMILY_GAP;

    const leafAngles = {};
    let cursor = ARC_START;

    order.forEach((fam, fi) => {
      const members = families[fam];
      const sector = (members.length / totalLeaves) * leafArc;
      const step = members.length ? sector / members.length : 0;
      members.forEach((m, i) => {
        leafAngles[m.id] = cursor + step * (i + 0.5);
      });
      cursor += sector + (fi < order.length - 1 ? FAMILY_GAP : 0);
    });

    const familyAngles = {};
    order.forEach((fam) => {
      const ids = families[fam].map((m) => m.id);
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
    order.forEach((fam) => {
      nodes[`fam:${fam}`] = polar(familyAngles[fam], 0.34);
    });
    MODELS.forEach((m) => {
      nodes[m.id] = polar(leafAngles[m.id], 0.84);
    });

    return { families, order, nodes, cx, cy, maxR, rootAngle, familyAngles, leafAngles, polar };
  }

  function nameById(id) {
    return MODELS.find((m) => m.id === id);
  }

  function stars(n) {
    return '●'.repeat(n) + '○'.repeat(5 - n);
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized === 'true') return;
    if (typeof p5 === 'undefined') return;

    root.dataset.initialized = 'true';

    const hintEl = document.getElementById('nn-phylogeny-hint');
    const detailEl = document.getElementById('nn-phylogeny-detail');
    const mechBar = document.getElementById('nn-phylogeny-mechs');
    const panelEl = document.getElementById(PANEL_ID);
    const splitEl = document.getElementById(SPLIT_ID);
    const listEl = document.getElementById(LIST_ID);
    const canvasWrap = document.getElementById(CANVAS_ID);

    let mode = 'tree';
    let activeMech = null;
    let hoverId = null;
    let hoverEdge = null;
    let selectedId = null;
    let p5Instance = null;
    let widgetTheme = localStorage.getItem('nn-phylogeny-theme')
      || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    let lastCanvasW = 0;
    let lastCanvasH = 0;
    let resizeScheduled = false;

    function isFullscreen() {
      return document.fullscreenElement === root;
    }

    function isDarkWidget() {
      return widgetTheme === 'dark';
    }

    function setWidgetTheme(theme) {
      widgetTheme = theme === 'dark' ? 'dark' : 'light';
      root.classList.remove('nn-theme-light', 'nn-theme-dark');
      root.classList.add(`nn-theme-${widgetTheme}`);
      localStorage.setItem('nn-phylogeny-theme', widgetTheme);
      root.querySelectorAll('[data-nn-theme]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.nnTheme === widgetTheme);
      });
      const hljsLabel = root.querySelector('.nn-hljs-theme-label');
      if (hljsLabel) hljsLabel.textContent = HLJS_THEMES[widgetTheme].label;
      applyHljsTheme(widgetTheme);
    }

    function toggleFullscreen() {
      if (isFullscreen()) {
        document.exitFullscreen?.();
      } else {
        (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
      }
    }

    function onFullscreenChange() {
      const on = isFullscreen();
      root.classList.toggle('nn-is-fullscreen', on);
      const btn = root.querySelector('[data-nn-fullscreen]');
      if (btn) {
        btn.textContent = on ? '⛶' : '⛶';
        btn.title = on ? 'Выйти из полноэкранного режима' : 'Полный экран';
        btn.setAttribute('aria-label', btn.title);
        btn.classList.toggle('active', on);
      }
      lastCanvasW = 0;
      lastCanvasH = 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scheduleResize());
      });
    }

    setWidgetTheme(widgetTheme);
    loadHighlight();

    function setSelection(id) {
      selectedId = id === selectedId ? null : id;
      root.classList.toggle('nn-has-selection', !!selectedId);
      if (panelEl) panelEl.hidden = !selectedId;
      renderPanel();
      if (mode === 'list') renderCatalogList();
      resizeCanvas();
      if (detailEl && !selectedId) {
        detailEl.textContent = 'Кликните по модели — справа откроется карточка с описанием и PyTorch-кодом.';
      }
    }

    function catalogFor(id) {
      return window.NN_PHYLOGENY_CATALOG?.[id] || {};
    }

    function familyColorCss(fam) {
      const c = FAMILY_COLORS[fam] || [120, 120, 120];
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }

    function renderCatalogList() {
      if (!listEl) return;
      const sorted = [...MODELS].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
      listEl.innerHTML = sorted
        .map((m) => {
          const cat = catalogFor(m.id);
          const sel = selectedId === m.id ? ' nn-catalog-item-selected' : '';
          const color = familyColorCss(m.family);
          const mechs = m.mechs.map((k) => MECH_LABELS[k] || k).join(', ');
          return `<button type="button" class="nn-catalog-item${sel}" data-nn-id="${m.id}">
            <div class="nn-catalog-item-head">
              <span class="nn-catalog-year">${m.year}</span>
              <span class="nn-catalog-name">${m.name}</span>
              <span class="nn-catalog-family" style="--fam-color:${color}">${m.family}</span>
            </div>
            <p class="nn-catalog-desc">${cat.desc || ''}</p>
            <p class="nn-catalog-ach"><strong>Достижение:</strong> ${cat.achievement || '—'}</p>
            <p class="nn-catalog-feat"><strong>Особенности:</strong> ${cat.features || mechs}</p>
          </button>`;
        })
        .join('');

      listEl.querySelectorAll('[data-nn-id]').forEach((btn) => {
        btn.addEventListener('click', () => setSelection(btn.dataset.nnId));
      });
    }

    function renderPanel() {
      if (!panelEl) return;
      const body = panelEl.querySelector('.nn-panel-body');
      if (!body) return;

      if (!selectedId) {
        body.innerHTML = '';
        return;
      }

      const m = nameById(selectedId);
      if (!m) return;

      const meta = window.NN_PHYLOGENY_SNIPPETS?.[selectedId];
      const cat = catalogFor(selectedId);
      const mechStr = m.mechs.map((k) => MECH_LABELS[k] || k).join(', ');

      const titleEl = panelEl.querySelector('.nn-panel-title');
      if (titleEl) titleEl.textContent = m.name;

      let html = `
        <span class="nn-panel-meta">${m.year} · ${m.family}</span>`;

      if (cat.desc) {
        html += `<p class="nn-panel-blurb">${cat.desc}</p>`;
      }
      if (cat.achievement) {
        html += `<p class="nn-panel-ach"><strong>Главное достижение:</strong> ${cat.achievement}</p>`;
      }
      if (cat.features) {
        html += `<p class="nn-panel-feat"><strong>Особенности:</strong> ${cat.features}</p>`;
      }

      html += `
        <dl class="nn-panel-stats">
          <dt>Задача</dt><dd>${m.task}</dd>
          <dt>Данные</dt><dd>${stars(m.train)}</dd>
          <dt>Точность</dt><dd>${stars(m.acc)}</dd>
          <dt>Механизмы</dt><dd>${mechStr}</dd>
        </dl>`;

      if (meta?.blurb && meta.blurb !== cat.desc) {
        html += `<p class="nn-panel-code-intro">${meta.blurb}</p>`;
      }

      (meta?.snippets || []).forEach((sn) => {
        html += `
          <div class="nn-snippet-block">
            <p class="nn-snippet-title">${sn.title}</p>
            <pre><code class="language-python">${escapeHtml(sn.code)}</code></pre>
          </div>`;
      });

      if (!meta?.snippets?.length) {
        html += '<p class="nn-panel-blurb">Пример кода для этой модели скоро добавим.</p>';
      }

      body.innerHTML = html;
      applyHljsTheme(widgetTheme);
    }

    function escapeHtml(s) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function chromeHeight() {
      let h = 0;
      root.querySelectorAll(
        '.nn-toolbar, .nn-mech-bar, .nn-trait-bar, .nn-hint, .nn-detail, .phase-portrait-caption',
      ).forEach((el) => {
        if (el.hidden || el.offsetParent === null) return;
        h += el.offsetHeight;
      });
      return h + 12;
    }

    function canvasSize() {
      if (mode === 'list') {
        const pane = root.querySelector('.nn-tree-pane');
        const w = pane ? Math.max(280, pane.clientWidth) : Math.min(920, root.clientWidth);
        return { w, h: 0 };
      }

      const pane = root.querySelector('.nn-tree-pane');
      const w = pane ? Math.max(280, pane.clientWidth) : Math.min(920, root.clientWidth);

      if (isFullscreen()) {
        const available = root.clientHeight - chromeHeight();
        const h = Math.max(320, Math.min(available, window.innerHeight - chromeHeight()));
        return { w, h };
      }

      const h = mode === 'timeline' ? 560 : selectedId ? 520 : 540;
      return { w, h };
    }

    function resizeCanvas() {
      if (!p5Instance) return;
      if (mode === 'list') return;
      const { w, h } = canvasSize();
      if (h < 1) return;
      if (Math.abs(w - lastCanvasW) < 2 && Math.abs(h - lastCanvasH) < 2) return;
      lastCanvasW = w;
      lastCanvasH = h;
      p5Instance.resizeCanvas(w, h);
    }

    function scheduleResize() {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resizeScheduled = false;
        resizeCanvas();
      });
    }

    const sketch = (p) => {
      let colors = {};
      let layout = null;
      let timelinePts = {};
      const pad = { top: 36, bottom: 52, side: 48 };

      p.setup = function () {
        const { w, h } = canvasSize();
        const cnv = p.createCanvas(w, h);
        cnv.parent(CANVAS_ID);
        p.textFont('system-ui, -apple-system, sans-serif');
        updateColors();
      };

      function updateColors() {
        const dark = isDarkWidget();
        colors = dark
          ? {
              bg: [22, 24, 32],
              text: [230, 232, 240],
              muted: [140, 145, 165],
              edge: [75, 80, 100],
              borrow: [250, 180, 80],
              borrowDim: [90, 75, 55],
              highlight: [255, 220, 120],
              select: [102, 126, 234],
            }
          : {
              bg: [252, 252, 253],
              text: [45, 49, 60],
              muted: [110, 115, 130],
              edge: [200, 205, 218],
              borrow: [230, 126, 34],
              borrowDim: [220, 215, 200],
              highlight: [102, 126, 234],
              select: [108, 92, 231],
            };
      }

      function familyColor(fam, alpha) {
        const c = FAMILY_COLORS[fam] || [120, 120, 120];
        return alpha != null ? [...c, alpha] : c;
      }

      function nodeRadius() {
        return 8;
      }

      function nodeAlpha() {
        return 255;
      }

      function activeId() {
        return selectedId || hoverId;
      }

      function hitTest(mx, my) {
        if (mode === 'timeline') return timelineHitTest(mx, my);
        if (!layout) return null;
        let best = null;
        let bestD = 1e9;
        MODELS.forEach((m) => {
          const pt = layout.nodes[m.id];
          if (!pt) return;
          const r = nodeRadius() + 6;
          const d = p.dist(mx, my, pt.x, pt.y);
          if (d < r && d < bestD) {
            bestD = d;
            best = m.id;
          }
        });
        return best;
      }

      function timelineHitTest(mx, my) {
        let best = null;
        let bestD = 14;
        Object.entries(timelinePts).forEach(([id, pt]) => {
          const d = p.dist(mx, my, pt.x, pt.y);
          if (d < bestD) {
            bestD = d;
            best = id;
          }
        });
        return best;
      }

      function edgeHitTest(mx, my) {
        if (mode !== 'borrow' || !layout) return null;
        let best = null;
        let bestD = 16;
        INFLUENCE.forEach(([src, dst], idx) => {
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
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
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
        const { families, order, nodes, familyAngles } = layout;

        order.forEach((fam) => {
          const fa = familyAngles[fam];
          const fc = familyColor(fam, 190);
          const dimFam = activeMech && !families[fam].some((m) => mechMatch(m));

          p.stroke(...(dimFam ? colors.edge : fc));
          p.strokeWeight(2);
          p.line(nodes.root.x, nodes.root.y, nodes[`fam:${fam}`].x, nodes[`fam:${fam}`].y);

          families[fam].forEach((m) => {
            const la = layout.leafAngles[m.id];
            const pt = nodes[m.id];
            const mid = layout.polar((fa + la) / 2, 0.52);
            const dimLeaf = activeMech && !mechMatch(m);
            p.stroke(...(dimLeaf ? colors.edge : fc));
            p.strokeWeight(1.3);
            p.noFill();
            p.beginShape();
            p.vertex(nodes[`fam:${fam}`].x, nodes[`fam:${fam}`].y);
            p.quadraticVertex(mid.x, mid.y, pt.x, pt.y);
            p.endShape();
          });
        });
      }

      function drawBorrowArcs() {
        INFLUENCE.forEach(([src, dst], idx) => {
          const a = layout.nodes[src];
          const b = layout.nodes[dst];
          if (!a || !b) return;

          const aid = activeId();
          const highlighted =
            hoverEdge === idx ||
            aid === src ||
            aid === dst ||
            selectedId === src ||
            selectedId === dst ||
            (activeMech && edgeMechMatch(src, dst));

          const dim = activeMech && !edgeMechMatch(src, dst) && hoverEdge !== idx;

          const lift = layout.maxR * (0.06 + (idx % 6) * 0.022);
          const mx = (a.x + b.x) / 2;
          const my = Math.min(a.y, b.y) - lift;

          p.noFill();
          p.strokeWeight(highlighted ? 2.2 : 1);
          if (dim) p.stroke(...colors.borrowDim, 80);
          else if (highlighted) p.stroke(...colors.borrow);
          else p.stroke(...colors.borrow, 120);

          p.drawingContext.setLineDash(highlighted ? [] : [4, 4]);
          p.beginShape();
          p.vertex(a.x, a.y);
          p.quadraticVertex(mx, my, b.x, b.y);
          p.endShape();
          p.drawingContext.setLineDash([]);
        });
      }

      function drawNodes() {
        const aid = activeId();

        MODELS.forEach((m) => {
          const pt = layout.nodes[m.id];
          if (!pt) return;
          const r = nodeRadius();
          const dim = activeMech && !mechMatch(m) && selectedId !== m.id && hoverId !== m.id;
          const isSelected = selectedId === m.id;
          const isHover = hoverId === m.id && !isSelected;
          const fc = familyColor(m.family, dim ? 50 : nodeAlpha());

          if (isSelected) {
            p.noFill();
            p.stroke(...colors.select);
            p.strokeWeight(3);
            p.circle(pt.x, pt.y, r * 3.6);
          } else if (isHover) {
            p.noFill();
            p.stroke(...colors.highlight);
            p.strokeWeight(2);
            p.circle(pt.x, pt.y, r * 3);
          }

          p.noStroke();
          p.fill(...fc);
          p.circle(pt.x, pt.y, r * 2);

          if (isSelected || isHover) {
            p.fill(...(dim ? colors.muted : colors.text));
            p.noStroke();
            p.textSize(isSelected ? 11 : 10);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.text(`${m.name} (${m.year})`, pt.x, pt.y - r - 4);
          }
        });

        const { nodes } = layout;
        p.fill(...colors.text);
        p.noStroke();
        p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        p.text('Neural architectures', nodes.root.x, nodes.root.y + 4);

        layout.order.forEach((fam) => {
          const pt = nodes[`fam:${fam}`];
          p.fill(...familyColor(fam));
          p.textSize(8);
          p.textAlign(p.CENTER, p.CENTER);
          const label = fam.length > 14 ? fam.slice(0, 12) + '…' : fam;
          p.text(label, pt.x, pt.y - 10);
        });
      }

      function drawLegend() {
        p.fill(...colors.muted);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text(MODES[mode].title, pad.side, 8);
        if (mode === 'timeline') {
          p.textSize(10);
          p.text(`${MODELS.length} архитектур · ${YEAR_MIN}–${YEAR_MAX}`, pad.side, 24);
        }
      }

      function drawTimeline() {
        timelinePts = {};
        const { families, order } = buildTree();
        const x0 = pad.side;
        const x1 = p.width - pad.side;
        const y0 = pad.top + 8;
        const y1 = p.height - pad.bottom;
        const laneH = (y1 - y0) / order.length;

        p.stroke(...colors.edge);
        p.strokeWeight(1);
        p.line(x0, y1, x1, y1);

        for (let y = 1960; y <= 2020; y += 10) {
          const tx = p.map(y, YEAR_MIN, YEAR_MAX, x0, x1);
          p.stroke(...colors.edge);
          p.line(tx, y1, tx, y1 - 5);
          p.fill(...colors.muted);
          p.noStroke();
          p.textSize(9);
          p.textAlign(p.CENTER, p.TOP);
          p.text(String(y), tx, y1 + 4);
        }

        order.forEach((fam, fi) => {
          const laneTop = y0 + fi * laneH;
          const laneMid = laneTop + laneH / 2;
          const fc = familyColor(fam, 40);

          p.fill(...fc);
          p.noStroke();
          p.rect(x0 - 4, laneTop + 1, x1 - x0 + 8, laneH - 2, 3);

          p.fill(...familyColor(fam));
          p.textSize(8);
          p.textAlign(p.RIGHT, p.CENTER);
          const label = fam.length > 16 ? fam.slice(0, 14) + '…' : fam;
          p.text(label, x0 - 8, laneMid);

          families[fam].forEach((m) => {
            const dim = activeMech && !mechMatch(m);
            const tx = p.map(m.year, YEAR_MIN, YEAR_MAX, x0, x1);
            timelinePts[m.id] = { x: tx, y: laneMid };

            const isSelected = selectedId === m.id;
            const isHover = hoverId === m.id && !isSelected;
            const r = isSelected ? 9 : isHover ? 8 : 6;

            if (isSelected) {
              p.noFill();
              p.stroke(...colors.select);
              p.strokeWeight(2.5);
              p.circle(tx, laneMid, r * 3.2);
            } else if (isHover) {
              p.noFill();
              p.stroke(...colors.highlight);
              p.strokeWeight(2);
              p.circle(tx, laneMid, r * 2.8);
            }

            p.noStroke();
            p.fill(...familyColor(fam, dim ? 60 : 230));
            p.circle(tx, laneMid, r * 2);

            if (isSelected || isHover) {
              p.fill(...colors.text);
              p.textSize(9);
              p.textAlign(p.CENTER, p.BOTTOM);
              p.text(`${m.name} (${m.year})`, tx, laneMid - r - 3);
            }
          });
        });
      }

      function syncDetail() {
        if (!detailEl || selectedId) return;
        if (hoverEdge != null && mode === 'borrow') {
          const [src, dst, label] = INFLUENCE[hoverEdge];
          const a = nameById(src);
          const b = nameById(dst);
          detailEl.innerHTML = `<strong>${a?.name} → ${b?.name}</strong> — ${label}. Клик по узлу — PyTorch.`;
          return;
        }
        const m = hoverId ? nameById(hoverId) : null;
        if (!m) return;
        detailEl.innerHTML =
          `<strong>${m.name}</strong> (${m.year}) · ${m.task} · клик — открыть код`;
      }

      p.draw = function () {
        if (mode === 'list') return;
        updateColors();
        p.background(...colors.bg);
        drawLegend();

        if (mode === 'timeline') {
          drawTimeline();
        } else {
          layout = buildLayout(p, pad, p.width, p.height);
          if (mode === 'borrow') drawBorrowArcs();
          drawTreeEdges();
          drawNodes();
        }
        syncDetail();
      };

      p.mouseMoved = function () {
        if (mode === 'list') return;
        if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
        hoverId = hitTest(p.mouseX, p.mouseY);
        hoverEdge = mode === 'borrow' ? edgeHitTest(p.mouseX, p.mouseY) : null;
        p.cursor(hoverId || hoverEdge != null ? 'pointer' : 'default');
      };

      p.mousePressed = function () {
        if (mode === 'list') return;
        if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
        const id = hitTest(p.mouseX, p.mouseY);
        if (id) setSelection(id);
      };

      p.windowResized = function () {
        scheduleResize();
      };
    };

    p5Instance = new p5(sketch);
    window.__nnPhylogenyResize = resizeCanvas;

    panelEl?.querySelector('[data-nn-close]')?.addEventListener('click', () => setSelection(null));

    function setMode(next) {
      mode = next;
      const isList = mode === 'list';
      const isCanvas = !isList;

      root.querySelectorAll('[data-nn-mode]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.nnMode === mode);
      });
      root.classList.toggle('nn-mode-list', isList);
      root.querySelectorAll('[data-nn-mech-wrap]').forEach((el) => {
        el.hidden = mode !== 'tree' && mode !== 'borrow';
      });

      if (canvasWrap) canvasWrap.style.display = isCanvas ? '' : 'none';
      if (listEl) {
        listEl.hidden = !isList;
        if (isList) renderCatalogList();
      }

      if (p5Instance) {
        if (isList) p5Instance.noLoop();
        else {
          p5Instance.loop();
          lastCanvasW = 0;
          lastCanvasH = 0;
          scheduleResize();
        }
      }

      if (hintEl) hintEl.textContent = MODES[mode].hint;
    }

    root.querySelectorAll('[data-nn-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.nnMode));
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

    root.querySelectorAll('[data-nn-theme]').forEach((btn) => {
      btn.addEventListener('click', () => setWidgetTheme(btn.dataset.nnTheme));
    });

    root.querySelector('[data-nn-fullscreen]')?.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => scheduleResize());
      ro.observe(root);
    }

    setMode('tree');
    if (detailEl) {
      detailEl.textContent = 'Кликните по модели — справа откроется карточка с описанием и PyTorch-кодом.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
