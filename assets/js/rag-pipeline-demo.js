/**
 * RAG pipeline demo: naive vs enhanced (hybrid+RRF+rerank) vs agentic,
 * chunk size effect on retrieval metrics.
 */
(function () {
  const ROOT_ID = 'rag-pipeline-demo';
  const RRF_K = 60;

  const FINE_CHUNKS = [
    { id: 0, doc: 'qdrant', text: 'Qdrant поддерживает hybrid search: dense HNSW + sparse BM25 в одном запросе.', kw: ['qdrant', 'hybrid', 'bm25', 'hnsw'] },
    { id: 1, doc: 'qdrant', text: 'Фильтры metadata в Qdrant применяются до ANN — ACL по tenant_id и source.', kw: ['qdrant', 'metadata', 'acl', 'filter'] },
    { id: 2, doc: 'chunk', text: 'Фиксированный chunk 512 токенов — дефолт для смешанного корпуса; factoid лучше на 256.', kw: ['chunk', '512', 'токен', 'factoid'] },
    { id: 3, doc: 'chunk', text: 'Multi-scale indexing: индексы 100/200/500 токенов + RRF на query time даёт +1–37% recall.', kw: ['multi-scale', 'rrf', 'recall', 'chunk'] },
    { id: 4, doc: 'agentic', text: 'Agentic RAG: агент решает, нужен ли retrieval, декомпозирует запрос и переформулирует после пустого top-K.', kw: ['agentic', 'rag', 'retrieval', 'запрос'] },
    { id: 5, doc: 'agentic', text: 'Enhanced RAG — один проход: hybrid + rerank; ниже латентность, чем у agentic цикла.', kw: ['enhanced', 'hybrid', 'rerank', 'латентность'] },
    { id: 6, doc: 'graph', text: 'GraphRAG строит граф сущностей; стабилен на multi-hop, но дорогой offline-препроцессинг.', kw: ['graphrag', 'multi-hop', 'граф'] },
    { id: 7, doc: 'rac', text: 'RAC Correction: атомарные факты ответа верифицируются по retrieved evidence post-hoc.', kw: ['rac', 'correction', 'factuality', 'verify'] },
    { id: 8, doc: 'embed', text: 'Одна embedding-модель на ingest и query; версия модели хранится в метаданных индекса.', kw: ['embedding', 'ingest', 'модель', 'индекс'] },
    { id: 9, doc: 'agentic', text: 'Сравнение agentic и enhanced: первый выигрывает на research и multi-step, второй — на FAQ.', kw: ['agentic', 'enhanced', 'латентность', 'сравните'] },
    { id: 10, doc: 'rerank', text: 'Cross-encoder rerank: top-100 из hybrid → top-5 в контекст LLM; +5–15% precision.', kw: ['rerank', 'cross-encoder', 'hybrid', 'precision'] },
    { id: 11, doc: 'eval', text: 'RAGAS: context_precision, context_recall, faithfulness — component-level метрики для регрессий.', kw: ['ragas', 'faithfulness', 'recall', 'метрик'] },
  ];

  const QUERIES = [
    {
      label: 'hybrid search в Qdrant',
      tokens: ['hybrid', 'search', 'qdrant'],
      qvec: [0.92, 0.15],
      rewrite: 'Qdrant dense sparse BM25 hybrid retrieval',
      rewriteVec: [0.88, 0.22],
    },
    {
      label: 'agentic vs enhanced латентность',
      tokens: ['agentic', 'enhanced', 'латентность', 'сравните'],
      qvec: [0.35, 0.88],
      rewrite: 'сравнение agentic RAG enhanced RAG cost latency',
      rewriteVec: [0.42, 0.92],
    },
    {
      label: 'размер чанков и recall',
      tokens: ['chunk', 'recall', 'multi-scale', 'rrf'],
      qvec: [0.55, 0.45],
      rewrite: 'chunk size multi-scale RRF recall indexing',
      rewriteVec: [0.58, 0.52],
    },
    {
      label: 'RAC проверка фактов',
      tokens: ['rac', 'correction', 'factuality', 'verify'],
      qvec: [0.18, 0.72],
      rewrite: 'RAC retrieval augmented correction atomic facts',
      rewriteVec: [0.22, 0.78],
    },
  ];

  const CHUNK_VECS = [
    [0.85, 0.2], [0.8, 0.12], [0.5, 0.35], [0.48, 0.42],
    [0.3, 0.9], [0.38, 0.82], [0.15, 0.55], [0.2, 0.68],
    [0.6, 0.25], [0.32, 0.86], [0.7, 0.3], [0.45, 0.5],
  ];

  function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }

  function bm25Score(queryTokens, chunkKw) {
    let hits = 0;
    queryTokens.forEach((t) => {
      if (chunkKw.some((k) => k.includes(t) || t.includes(k))) hits += 1;
    });
    return hits / Math.max(queryTokens.length, 1);
  }

  function rrf(rank) {
    return 1 / (RRF_K + rank);
  }

  function mergeChunks(groupSize) {
    const out = [];
    for (let i = 0; i < FINE_CHUNKS.length; i += groupSize) {
      const slice = FINE_CHUNKS.slice(i, i + groupSize);
      const ids = slice.map((c) => c.id);
      const kw = [...new Set(slice.flatMap((c) => c.kw))];
      const vx = slice.reduce((s, c) => s + CHUNK_VECS[c.id][0], 0) / slice.length;
      const vy = slice.reduce((s, c) => s + CHUNK_VECS[c.id][1], 0) / slice.length;
      out.push({
        ids,
        doc: slice.map((c) => c.doc).join('+'),
        text: slice.map((c) => c.text).join(' '),
        kw,
        vec: [vx, vy],
        label: `#${ids[0]}–${ids[ids.length - 1]}`,
      });
    }
    return out;
  }

  const CHUNK_GROUPS = {
    128: mergeChunks(1),
    512: mergeChunks(2),
    1024: mergeChunks(4),
  };

  function isRelevant(chunk, queryTokens) {
    const overlap = queryTokens.filter((t) =>
      chunk.kw.some((k) => k.includes(t) || t.includes(k))
    ).length;
    return overlap >= 2 || (overlap >= 1 && queryTokens.length === 1);
  }

  function rankDense(chunks, qvec) {
    return chunks
      .map((c, i) => ({ i, score: cosine(qvec, c.vec), src: 'dense' }))
      .sort((a, b) => b.score - a.score);
  }

  function rankBm25(chunks, tokens) {
    return chunks
      .map((c, i) => ({ i, score: bm25Score(tokens, c.kw), src: 'bm25' }))
      .sort((a, b) => b.score - a.score);
  }

  function fuseRrf(dense, sparse, n) {
    const scores = new Map();
    dense.slice(0, n).forEach((r, rank) => {
      scores.set(r.i, (scores.get(r.i) || 0) + rrf(rank + 1));
    });
    sparse.slice(0, n).forEach((r, rank) => {
      scores.set(r.i, (scores.get(r.i) || 0) + rrf(rank + 1));
    });
    return [...scores.entries()]
      .map(([i, score]) => ({ i, score, src: 'rrf' }))
      .sort((a, b) => b.score - a.score);
  }

  function rerank(fused, chunks, tokens) {
    return fused.map((r) => {
      const kwBoost = bm25Score(tokens, chunks[r.i].kw);
      return { ...r, score: r.score + kwBoost * 0.35, src: 'rerank' };
    }).sort((a, b) => b.score - a.score);
  }

  function recallAtK(ranked, chunks, tokens, k) {
    const top = ranked.slice(0, k).map((r) => chunks[r.i]);
    const rel = chunks.filter((c) => isRelevant(c, tokens));
    if (rel.length === 0) return 1;
    const hit = rel.some((rc) => top.some((t) => t.text === rc.text));
    return hit ? 1 : 0;
  }

  function precisionAtK(ranked, chunks, tokens, k) {
    const top = ranked.slice(0, k);
    if (top.length === 0) return 0;
    const rel = top.filter((r) => isRelevant(chunks[r.i], tokens)).length;
    return rel / top.length;
  }

  function runPipeline(mode, chunks, query, chunkKey) {
    const tokens = query.tokens;
    const qvec = query.qvec;
    const steps = [];
    const topK = 3;
    const funnel = 6;

    if (mode === 'naive') {
      const dense = rankDense(chunks, qvec);
      steps.push({ name: 'Dense ANN', detail: `top-${funnel} по cosine similarity`, ranked: dense });
      const final = dense.slice(0, topK);
      return { steps, final, latency: 1, tokens: 1200 };
    }

    if (mode === 'enhanced') {
      const dense = rankDense(chunks, qvec);
      const sparse = rankBm25(chunks, tokens);
      steps.push({ name: 'Dense + BM25', detail: 'параллельный retrieval', ranked: dense, alt: sparse });
      const fused = fuseRrf(dense, sparse, funnel);
      steps.push({ name: 'RRF fusion', detail: `k=${RRF_K}`, ranked: fused });
      const reranked = rerank(fused, chunks, tokens);
      steps.push({ name: 'Cross-encoder rerank', detail: `top-${topK} в контекст`, ranked: reranked });
      return { steps, final: reranked.slice(0, topK), latency: 2, tokens: 2800 };
    }

    // agentic
    const dense1 = rankDense(chunks, qvec);
    const p1 = precisionAtK(dense1, chunks, tokens, topK);
    steps.push({
      name: 'Шаг 1: retrieve',
      detail: `precision@${topK} = ${p1.toFixed(2)} — ${p1 < 0.34 ? 'недостаточно' : 'достаточно'}`,
      ranked: dense1,
    });

    const rewriteTokens = query.rewrite.toLowerCase().split(/\s+/).filter(Boolean);
    const dense2 = rankDense(chunks, query.rewriteVec);
    const sparse2 = rankBm25(chunks, rewriteTokens);
    steps.push({
      name: 'Шаг 2: rewrite query',
      detail: `«${query.rewrite.slice(0, 48)}…»`,
      ranked: dense2,
    });
    const fused2 = fuseRrf(dense2, sparse2, funnel);
    const reranked2 = rerank(fused2, chunks, rewriteTokens);
    steps.push({
      name: 'Шаг 3: hybrid + rerank',
      detail: 'повторный retrieval после переформулировки',
      ranked: reranked2,
    });
    return { steps, final: reranked2.slice(0, topK), latency: 4, tokens: 5200 };
  }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const queryBtns = root.querySelectorAll('[data-rg-query]');
    const modeBtns = root.querySelectorAll('[data-rg-mode]');
    const chunkBtns = root.querySelectorAll('[data-rg-chunk]');
    const stepBtn = root.querySelector('[data-rg-step]');
    const metricsEl = root.querySelector('.rg-metrics');
    const stepsEl = root.querySelector('.rg-steps');
    const chunkList = root.querySelector('.rg-chunk-list');
    const formulaEl = root.querySelector('.rg-formula');

    let queryIdx = 0;
    let mode = 'enhanced';
    let chunkKey = '512';
    let agenticStep = -1;
    let pulse = 0;
    let raf;

    function getChunks() {
      return CHUNK_GROUPS[chunkKey] || CHUNK_GROUPS['512'];
    }

    function render() {
      const query = QUERIES[queryIdx];
      const chunks = getChunks();
      const result = runPipeline(mode, chunks, query, chunkKey);
      const ranked = result.steps[result.steps.length - 1].ranked;
      const rec = recallAtK(ranked, chunks, query.tokens, 3);
      const prec = precisionAtK(ranked, chunks, query.tokens, 3);

      const chunkSizeLabel = chunkKey === '128' ? '128 (fine)' : chunkKey === '512' ? '512 (default)' : '1024 (coarse)';
      metricsEl.innerHTML =
        `<span class="rg-metric"><strong>Recall@3</strong> ${(rec * 100).toFixed(0)}%</span>` +
        `<span class="rg-metric"><strong>Precision@3</strong> ${(prec * 100).toFixed(0)}%</span>` +
        `<span class="rg-metric"><strong>Latency</strong> ~${result.latency}×</span>` +
        `<span class="rg-metric"><strong>Chunks</strong> ${chunks.length} × ${chunkSizeLabel}</span>`;

      const activeStep = mode === 'agentic' ? Math.max(0, agenticStep) : result.steps.length - 1;
      const showStep = result.steps[Math.min(activeStep, result.steps.length - 1)];

      stepsEl.innerHTML = result.steps
        .map((s, i) => {
          const on = mode !== 'agentic' || i <= activeStep;
          return `<div class="rg-step${i === Math.min(activeStep, result.steps.length - 1) ? ' active' : ''}${on ? '' : ' dim'}"><span class="rg-step-num">${i + 1}</span> <strong>${s.name}</strong> — ${s.detail}</div>`;
        })
        .join('');

      const highlight = new Set(result.final.map((r) => r.i));
      if (mode === 'agentic' && agenticStep >= 0 && showStep) {
        showStep.ranked.slice(0, 3).forEach((r) => highlight.add(r.i));
      }

      chunkList.innerHTML = chunks
        .map((c, i) => {
          const rel = isRelevant(c, query.tokens);
          const inTop = highlight.has(i);
          const rank = showStep.ranked.findIndex((r) => r.i === i);
          const rankLabel = rank >= 0 ? `rank ${rank + 1}` : '—';
          return `<div class="rg-chunk-item${inTop ? ' active' : ''}${rel ? ' relevant' : ''}"><span class="rg-chunk-meta">${c.label} · ${rankLabel}</span> ${c.text}</div>`;
        })
        .join('');

      if (mode === 'naive') {
        formulaEl.innerHTML = 'Naive: <code>top-K = argsort(cosine(query, chunk))</code>';
      } else if (mode === 'enhanced') {
        formulaEl.innerHTML =
          'Enhanced: <code>RRF(dense, BM25) → rerank → top-3</code> · score(d) = Σ 1/(k+rank)';
      } else {
        formulaEl.innerHTML =
          'Agentic: <code>retrieve → evaluate → rewrite → hybrid+rerank</code> · шаг <strong>' +
          (activeStep + 1) +
          '</strong> / ' +
          result.steps.length;
      }

      drawCanvas(query, chunks, showStep, highlight);
    }

    function drawCanvas(query, chunks, showStep, highlight) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const pad = 32;
      const plotW = w - pad * 2;
      const plotH = h - pad * 2;
      pulse += 0.035;

      ctx.fillStyle = '#fafbfd';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#e8e8ec';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gx = pad + (plotW * i) / 4;
        const gy = pad + (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, pad);
        ctx.lineTo(gx, pad + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad, gy);
        ctx.lineTo(pad + plotW, gy);
        ctx.stroke();
      }

      function px(nx) {
        return pad + nx * plotW;
      }
      function py(ny) {
        return pad + (1 - ny) * plotH;
      }

      chunks.forEach((c, i) => {
        const on = highlight.has(i);
        const rel = isRelevant(c, query.tokens);
        const r = on ? 12 + Math.sin(pulse) * 2 : rel ? 9 : 7;
        const [vx, vy] = c.vec;
        const grad = ctx.createRadialGradient(px(vx), py(vy), 0, px(vx), py(vy), r);
        if (on) {
          grad.addColorStop(0, '#43e97b');
          grad.addColorStop(1, '#38d9c8');
        } else if (rel) {
          grad.addColorStop(0, '#667eea');
          grad.addColorStop(1, '#764ba2');
        } else {
          grad.addColorStop(0, '#c8cce8');
          grad.addColorStop(1, '#b8b8c8');
        }
        ctx.beginPath();
        ctx.arc(px(vx), py(vy), r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = on ? '#2a9d6a' : '#fff';
        ctx.lineWidth = on ? 2 : 1;
        ctx.stroke();
      });

      const [qx, qy] = query.qvec;
      const starR = 13 + Math.sin(pulse * 1.2) * 2;
      ctx.save();
      ctx.translate(px(qx), py(qy));
      ctx.fillStyle = '#fa709a';
      ctx.strokeStyle = '#5c2a35';
      ctx.lineWidth = 1.2;
      drawStar(ctx, 0, 0, 5, starR, starR * 0.45);
      ctx.restore();

      showStep.ranked.slice(0, 3).forEach((r, j) => {
        const c = chunks[r.i];
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `rgba(250, 112, 154, ${0.45 + 0.25 * Math.sin(pulse + j)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px(qx), py(qy));
        ctx.lineTo(px(c.vec[0]), py(c.vec[1]));
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.fillStyle = '#888';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('2D проекция embedding space', pad, h - 10);
    }

    function drawStar(ctx, cx, cy, spikes, outer, inner) {
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    function setQuery(idx) {
      queryIdx = idx;
      agenticStep = mode === 'agentic' ? 0 : -1;
      queryBtns.forEach((b) => b.classList.toggle('active', Number(b.dataset.rgQuery) === idx));
      render();
    }

    function setMode(next) {
      mode = next;
      agenticStep = mode === 'agentic' ? 0 : -1;
      modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.rgMode === mode));
      stepBtn.style.display = mode === 'agentic' ? '' : 'none';
      render();
    }

    function setChunk(key) {
      chunkKey = key;
      chunkBtns.forEach((b) => b.classList.toggle('active', b.dataset.rgChunk === key));
      render();
    }

    queryBtns.forEach((b) => b.addEventListener('click', () => setQuery(Number(b.dataset.rgQuery))));
    modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.rgMode)));
    chunkBtns.forEach((b) => b.addEventListener('click', () => setChunk(b.dataset.rgChunk)));
    stepBtn.addEventListener('click', () => {
      const result = runPipeline('agentic', getChunks(), QUERIES[queryIdx], chunkKey);
      agenticStep = Math.min(agenticStep + 1, result.steps.length - 1);
      render();
    });

    function loop() {
      pulse += 0.001;
      const query = QUERIES[queryIdx];
      const chunks = getChunks();
      const result = runPipeline(mode, chunks, query, chunkKey);
      const activeStep = mode === 'agentic' ? Math.max(0, agenticStep) : result.steps.length - 1;
      const showStep = result.steps[Math.min(activeStep, result.steps.length - 1)];
      const highlight = new Set(result.final.map((r) => r.i));
      drawCanvas(query, chunks, showStep, highlight);
      raf = requestAnimationFrame(loop);
    }

    setQuery(0);
    setMode('enhanced');
    setChunk('512');
    stepBtn.style.display = 'none';
    loop();

    window.addEventListener('resize', render);
    root.addEventListener('rag-pipeline-destroy', () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', render);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
