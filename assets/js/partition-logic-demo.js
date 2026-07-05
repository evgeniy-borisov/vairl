/**
 * Partition logic demo: equivalence classes, GROUP BY, PARTITION BY, DDL.
 */
(function () {
  const ROOT_ID = 'partition-logic-demo';

  const ROWS = [
    { id: 1, region: 'EU', month: 'Jan', amount: 100 },
    { id: 2, region: 'EU', month: 'Feb', amount: 200 },
    { id: 3, region: 'EU', month: 'Mar', amount: 90 },
    { id: 4, region: 'US', month: 'Jan', amount: 150 },
    { id: 5, region: 'US', month: 'Jan', amount: 50 },
    { id: 6, region: 'US', month: 'Feb', amount: 80 },
    { id: 7, region: 'APAC', month: 'Jan', amount: 200 },
    { id: 8, region: 'APAC', month: 'Mar', amount: 120 },
  ];

  const BLOCK_COLORS = {
    EU: ['#43e97b', '#38f9d7'],
    US: ['#667eea', '#764ba2'],
    APAC: ['#fa709a', '#fee140'],
    'EU|Jan': ['#43e97b', '#2ec4b6'],
    'EU|Feb': ['#38d9a8', '#38f9d7'],
    'EU|Mar': ['#2dd4bf', '#43e97b'],
    'US|Jan': ['#667eea', '#5a67d8'],
    'US|Feb': ['#764ba2', '#667eea'],
    'APAC|Jan': ['#fa709a', '#f97316'],
    'APAC|Mar': ['#fee140', '#fa709a'],
    default: ['#94a3b8', '#64748b'],
  };

  function blockKey(row, keyMode) {
    if (keyMode === 'none') return 'U';
    if (keyMode === 'region') return row.region;
    return row.region + '|' + row.month;
  }

  function buildBlocks(keyMode) {
    const map = new Map();
    ROWS.forEach((row) => {
      const k = blockKey(row, keyMode);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    });
    return [...map.entries()].map(([key, rows]) => ({
      key,
      rows: rows.slice().sort((a, b) => a.id - b.id),
      sum: rows.reduce((s, r) => s + r.amount, 0),
    }));
  }

  function logicalDistinctions(n, blocks) {
    const total = (n * (n - 1)) / 2;
    const within = blocks.reduce((s, b) => s + (b.rows.length * (b.rows.length - 1)) / 2, 0);
    return { total, between: total - within, blocks: blocks.length };
  }

  function sqlSnippet(keyMode, opMode) {
    const keySql =
      keyMode === 'none'
        ? '/* один класс — всё множество U */'
        : keyMode === 'region'
          ? 'region'
          : 'region, month';

    if (opMode === 'view') {
      return keyMode === 'none'
        ? '-- Ключ не задан: все строки в одном блоке U'
        : `-- Эквивалентность: a ~ b ⟺ одинаковый (${keySql})\n-- Блок = inverse image partition атрибута`;
    }
    if (opMode === 'group') {
      return `SELECT ${keySql === 'region, month' ? keySql + ',\n       ' : keySql + ',\n       '}COUNT(*) AS n,\n       SUM(amount) AS revenue\nFROM orders\nGROUP BY ${keySql};`;
    }
    if (opMode === 'window') {
      const part = keyMode === 'none' ? '' : `PARTITION BY ${keySql}\n    `;
      return `SELECT id, ${keySql === 'region, month' ? 'region, month, ' : keyMode === 'region' ? 'region, ' : ''}amount,\n       ROW_NUMBER() OVER (\n    ${part}ORDER BY amount DESC\n  ) AS rn,\n       SUM(amount) OVER (\n    ${part.replace(/\n    $/, '')}\n  ) AS block_total\nFROM orders;`;
    }
    return `-- DDL: те же классы, разные таблицы\nCREATE TABLE orders PARTITION BY LIST (region);\nCREATE TABLE orders_eu PARTITION OF orders\n  FOR VALUES IN ('EU');\nCREATE TABLE orders_us PARTITION OF orders\n  FOR VALUES IN ('US');\nCREATE TABLE orders_apac PARTITION OF orders\n  FOR VALUES IN ('APAC');`;
  }

  function caption(keyMode, opMode, stats) {
    const lines = {
      view: [
        `Множество U: ${ROWS.length} строк. Блоков: ${stats.blocks}. Различий «в разных блоках»: ${stats.between} из ${stats.total} пар.`,
        'Клик по строке подсвечивает её класс эквивалентности — строки одного цвета неразличимы по ключу.',
        'Логическая энтропия растёт с числом блоков: больше различий между элементами.',
      ],
      group: [
        `GROUP BY сворачивает ${ROWS.length} строк в ${stats.blocks} — фактор-множество U/∼.`,
        'Каждый блок → одна строка результата с агрегатами SUM и COUNT.',
        'Детали отдельных заказов теряются; остаётся функция на классе.',
      ],
      window: [
        `PARTITION BY сохраняет все ${ROWS.length} строк; внутри блока — rn и block_total.`,
        'Разбиение то же, что слева, но строки не схлопываются.',
        'Аналог «размазанного» GROUP BY через OVER (...).',
      ],
      storage: [
        'DDL PARTITION — те же классы, другие файлы / сегменты на диске.',
        'Логика эквивалентности не меняется; меняется только топология хранения.',
        'Partition pruning: WHERE region = \'EU\' читает только orders_eu.',
      ],
    };
    return lines[opMode][0];
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const keyBtns = root.querySelectorAll('[data-pl-key]');
    const opBtns = root.querySelectorAll('[data-pl-op]');
    const sqlEl = root.querySelector('.pl-sql');
    const captionEl = root.querySelector('.pl-caption');
    const metricsEl = root.querySelector('.pl-metrics');

    let keyMode = 'region';
    let opMode = 'view';
    let hoverId = null;
    let selectedId = null;
    let animT = 1;
    let raf;

    const layout = { blocks: [], rowPos: new Map(), w: 800, h: 360 };

    function resize() {
      const wrap = root.querySelector('.pl-canvas-wrap');
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = Math.max(300, Math.min(420, w * 0.48));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout.w = w;
      layout.h = h;
      computeLayout();
      draw();
    }

    function computeLayout() {
      const blocks = buildBlocks(keyMode);
      const pad = 14;
      const w = layout.w;
      const h = layout.h;

      if (opMode === 'group') {
        layout.blocks = blocks.map((b, i) => {
          const cols = Math.min(blocks.length, 4);
          const bw = (w - pad * 2 - (cols - 1) * 10) / cols;
          const row = Math.floor(i / cols);
          const col = i % cols;
          return {
            ...b,
            x: pad + col * (bw + 10),
            y: pad + 50 + row * 110,
            bw,
            bh: 88,
            targetRows: [],
          };
        });
        layout.rowPos.clear();
        return;
      }

      if (opMode === 'storage') {
        layout.blocks = blocks.map((b, i) => {
          const bh = (h - pad * 2 - 40) / blocks.length - 8;
          return {
            ...b,
            x: pad + 120,
            y: pad + 36 + i * (bh + 8),
            bw: w - pad * 2 - 130,
            bh,
            targetRows: b.rows.map((r, j) => ({
              row: r,
              tx: pad + 130 + 20 + (j % 6) * 52,
              ty: pad + 36 + i * (bh + 8) + bh / 2,
            })),
          };
        });
        blocks.forEach((b) =>
          b.rows.forEach((r) => {
            const blk = layout.blocks.find((x) => x.key === b.key);
            const tr = blk.targetRows.find((t) => t.row.id === r.id);
            layout.rowPos.set(r.id, { tx: tr.tx, ty: tr.ty, blockKey: b.key });
          })
        );
        return;
      }

      // view + window: stacked blocks
      let y = pad + 28;
      const blockGap = 10;
      layout.blocks = blocks.map((b) => {
        const n = b.rows.length;
        const cols = Math.min(n, 6);
        const rows = Math.ceil(n / cols);
        const innerH = rows * 44 + 28;
        const blk = {
          ...b,
          x: pad,
          y,
          bw: w - pad * 2,
          bh: innerH,
          targetRows: [],
        };
        const rankByAmount = opMode === 'window'
          ? b.rows.slice().sort((a, b2) => b2.amount - a.amount || a.id - b2.id)
          : null;
        b.rows.forEach((r, j) => {
          const c = j % cols;
          const rr = Math.floor(j / cols);
          const tx = blk.x + 16 + c * 58;
          const ty = blk.y + 22 + rr * 44;
          const rank = rankByAmount ? rankByAmount.indexOf(r) + 1 : j + 1;
          blk.targetRows.push({ row: r, tx, ty, rank });
          layout.rowPos.set(r.id, { tx, ty, blockKey: b.key, rank });
        });
        y += innerH + blockGap;
        return blk;
      });
    }

    function lerpPos() {
      ROWS.forEach((r) => {
        const target = layout.rowPos.get(r.id);
        if (!target) return;
        let cur = r._pos;
        if (!cur) {
          cur = { x: target.tx, y: target.ty };
          r._pos = cur;
        }
        cur.x += (target.tx - cur.x) * 0.18;
        cur.y += (target.ty - cur.y) * 0.18;
      });
    }

    function colorsFor(key) {
      return BLOCK_COLORS[key] || BLOCK_COLORS.default;
    }

    function isDark() {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function draw() {
      const w = layout.w;
      const h = layout.h;
      const dark = isDark();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dark ? '#1a1d28' : '#fafbfd';
      ctx.fillRect(0, 0, w, h);

      const blocks = layout.blocks;
      const stats = logicalDistinctions(ROWS.length, buildBlocks(keyMode));
      const highlightBlock =
        selectedId != null
          ? blockKey(ROWS.find((r) => r.id === selectedId), keyMode)
          : hoverId != null
            ? blockKey(ROWS.find((r) => r.id === hoverId), keyMode)
            : null;

      ctx.font = '12px ui-monospace, monospace';
      ctx.fillStyle = dark ? '#9ca3af' : '#666';
      ctx.textAlign = 'left';
      ctx.fillText(
        opMode === 'group'
          ? 'Фактор-множество U/∼'
          : opMode === 'storage'
            ? 'Физические сегменты (DDL)'
            : 'Разбиение π на U',
        14,
        20
      );

      if (opMode === 'group') {
        blocks.forEach((b) => {
          const [c1, c2] = colorsFor(b.key);
          const g = ctx.createLinearGradient(b.x, b.y, b.x + b.bw, b.y + b.bh);
          g.addColorStop(0, c1);
          g.addColorStop(1, c2);
          ctx.globalAlpha = highlightBlock && highlightBlock !== b.key ? 0.35 : 0.92;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.bw, b.bh, 10);
          ctx.fill();
          ctx.strokeStyle = dark ? '#fff' : 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.key === 'U' ? 'U' : b.key.replace('|', ' · '), b.x + b.bw / 2, b.y + 28);
          ctx.font = '11px system-ui,sans-serif';
          ctx.fillText('n = ' + b.rows.length, b.x + b.bw / 2, b.y + 46);
          ctx.font = 'bold 15px ui-monospace,monospace';
          ctx.fillText('Σ = ' + b.sum, b.x + b.bw / 2, b.y + 68);
        });
        return;
      }

      blocks.forEach((b) => {
        const [c1, c2] = colorsFor(b.key);
        const dim = highlightBlock && highlightBlock !== b.key;
        ctx.globalAlpha = dim ? 0.28 : 1;

        const g = ctx.createLinearGradient(b.x, b.y, b.x + b.bw, b.y + b.bh);
        g.addColorStop(0, c1 + (dark ? '33' : '22'));
        g.addColorStop(1, c2 + (dark ? '22' : '11'));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.bw, b.bh, 10);
        ctx.fill();
        ctx.strokeStyle = c1;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = dark ? '#e5e7eb' : '#444';
        ctx.font = '600 11px system-ui,sans-serif';
        ctx.textAlign = 'left';
        const label = b.key === 'U' ? 'P = { U }' : 'P: ' + b.key.replace('|', ' × ');
        ctx.fillText(label, b.x + 10, b.y + 14);

        if (opMode === 'storage') {
          ctx.font = '10px ui-monospace,monospace';
          ctx.fillStyle = dark ? '#9ca3af' : '#777';
          ctx.fillText('TABLE orders_' + b.key.toLowerCase().replace('|', '_'), b.x + 10, b.y + b.bh - 8);
        }
        ctx.globalAlpha = 1;
      });

      ROWS.forEach((r) => {
        const pos = r._pos || layout.rowPos.get(r.id);
        if (!pos) return;
        const bk = blockKey(r, keyMode);
        const [c1] = colorsFor(bk);
        const dim = highlightBlock && highlightBlock !== bk;
        const x = pos.x || pos.tx;
        const y = pos.y || pos.ty;

        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fillStyle = c1;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = selectedId === r.id ? '#fff' : dark ? '#374151' : '#fff';
        ctx.lineWidth = selectedId === r.id ? 3 : 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(r.id), x, y);

        if (opMode === 'window') {
          const meta = layout.rowPos.get(r.id);
          ctx.font = '9px ui-monospace,monospace';
          ctx.fillStyle = dark ? '#fcd34d' : '#b45309';
          ctx.fillText('rn=' + (meta?.rank || '?'), x, y + 24);
          ctx.fillStyle = dark ? '#86efac' : '#15803d';
          ctx.fillText('Σ' + buildBlocks(keyMode).find((b) => b.key === bk)?.sum, x, y - 22);
        }
        ctx.globalAlpha = 1;
      });
    }

    function updateUI() {
      const blocks = buildBlocks(keyMode);
      const stats = logicalDistinctions(ROWS.length, blocks);
      sqlEl.textContent = sqlSnippet(keyMode, opMode);
      captionEl.textContent = caption(keyMode, opMode, stats);
      metricsEl.innerHTML =
        '<span>|U| = <strong>' +
        ROWS.length +
        '</strong></span>' +
        '<span>блоков = <strong>' +
        stats.blocks +
        '</strong></span>' +
        '<span>различий между блоками = <strong>' +
        stats.between +
        '</strong></span>' +
        (opMode === 'group'
          ? '<span>строк результата = <strong>' + stats.blocks + '</strong></span>'
          : '<span>строк результата = <strong>' + ROWS.length + '</strong></span>');
      computeLayout();
      animT = 0;
    }

    function tick() {
      lerpPos();
      draw();
      if (animT < 1) animT += 0.04;
      raf = requestAnimationFrame(tick);
    }

    function hitTest(mx, my) {
      for (let i = ROWS.length - 1; i >= 0; i--) {
        const r = ROWS[i];
        const p = r._pos || layout.rowPos.get(r.id);
        if (!p) continue;
        const x = p.x ?? p.tx;
        const y = p.y ?? p.ty;
        if ((mx - x) ** 2 + (my - y) ** 2 <= 18 ** 2) return r.id;
      }
      return null;
    }

    keyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        keyMode = btn.dataset.plKey;
        keyBtns.forEach((b) => b.classList.toggle('active', b === btn));
        updateUI();
      });
    });

    opBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        opMode = btn.dataset.plOp;
        opBtns.forEach((b) => b.classList.toggle('active', b === btn));
        updateUI();
      });
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      hoverId = id;
      canvas.style.cursor = id ? 'pointer' : 'default';
    });

    canvas.addEventListener('mouseleave', () => {
      hoverId = null;
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      selectedId = selectedId === id ? null : id;
    });

    window.addEventListener('resize', resize);
    new MutationObserver(() => draw()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    ROWS.forEach((r) => {
      r._pos = { x: 40 + Math.random() * 200, y: 80 + Math.random() * 120 };
    });

    updateUI();
    resize();
    tick();

    root.addEventListener('partition-logic-destroy', () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
