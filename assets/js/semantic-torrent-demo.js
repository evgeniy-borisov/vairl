/**
 * Semantic Torrent demo: chunks with hash + embedding, peer swarm, semantic search.
 */
(function () {
  const CONTAINER_ID = 'semantic-torrent-demo';

  const CHUNKS = [
    { text: 'BitTorrent делит файл на куски фиксированного размера. Каждый кусок идентифицируется SHA-1 хэшем.', hash: 'a3f8c21e9b004d12', x: 0.12, y: 0.72 },
    { text: 'Клиент скачивает куски у пиров, проверяет хэш и собирает файл по меркле-дереву из .torrent метаданных.', hash: '7c2e91f04a18b6e3', x: 0.22, y: 0.58 },
    { text: 'Векторный поиск находит фрагменты текста по смыслу запроса, а не по точному совпадению байтов.', hash: 'e91b44c7f02a8d15', x: 0.78, y: 0.68 },
    { text: 'Embedding модели кодируют семантику в плотный вектор; близость измеряется косинусным расстоянием.', hash: '5d0a83e6c1f94b27', x: 0.88, y: 0.52 },
    { text: 'RAG-системы хранят чанки документов в vector DB и извлекают top-k по запросу пользователя.', hash: 'b24f6a0d8e3c7159', x: 0.72, y: 0.38 },
    { text: 'DHT в торрент-сети разрешает info_hash в список пиров, у которых есть куски файла.', hash: '1f9e52c8a704bd36', x: 0.18, y: 0.32 },
    { text: 'Семантический торрент объединяет content-addressed хранение и ANN-поиск по смыслу.', hash: 'c8063d2f5b1a9e48', x: 0.52, y: 0.48 },
    { text: 'Децентрализация: пиры объявляют piece_hash и embedding; поисковые узлы агрегируют объявления.', hash: '9a1d74e0f6b28c53', x: 0.42, y: 0.22 },
  ];

  const PEERS = [
    { id: 'peer-1', x: 0.15, y: 0.55, pieces: [0, 1, 5] },
    { id: 'peer-2', x: 0.35, y: 0.42, pieces: [1, 5, 6, 7] },
    { id: 'peer-3', x: 0.82, y: 0.58, pieces: [2, 3, 4] },
    { id: 'peer-4', x: 0.55, y: 0.62, pieces: [0, 6, 7] },
    { id: 'peer-5', x: 0.68, y: 0.28, pieces: [3, 4, 6] },
  ];

  const QUERIES = [
    { label: 'векторный поиск', qx: 0.85, qy: 0.62, matches: [2, 3] },
    { label: 'DHT и торрент', qx: 0.16, qy: 0.38, matches: [0, 1, 5] },
    { label: 'RAG для агента', qx: 0.74, qy: 0.35, matches: [4, 2] },
    { label: 'децентрализация', qx: 0.40, qy: 0.18, matches: [7, 6] },
  ];

  function init() {
    const root = document.getElementById(CONTAINER_ID);
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    const canvas = root.querySelector('canvas');
    const queryBtns = root.querySelectorAll('[data-st-query]');
    const resultEl = root.querySelector('.st-result');
    const chunkList = root.querySelector('.st-chunk-list');
    let activeQuery = 0;
    let pulse = 0;

    function renderChunkList(highlight) {
      chunkList.innerHTML = CHUNKS.map((c, i) => {
        const on = highlight.includes(i);
        return `<div class="st-chunk-item${on ? ' active' : ''}"><span class="st-chunk-idx">#${i}</span> <code class="st-hash">${c.hash}</code> ${c.text}</div>`;
      }).join('');
    }

    function draw() {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const pad = 28;
      const plotW = w - pad * 2;
      const plotH = h - pad * 2;
      const q = QUERIES[activeQuery];
      const highlight = q.matches;
      pulse += 0.04;

      ctx.fillStyle = '#fafbfd';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#e8e8ec';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gx = pad + (plotW * i) / 4;
        const gy = pad + (plotH * i) / 4;
        ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, pad + plotH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(pad + plotW, gy); ctx.stroke();
      }

      function px(nx) { return pad + nx * plotW; }
      function py(ny) { return pad + (1 - ny) * plotH; }

      PEERS.forEach((peer) => {
        const hasMatch = peer.pieces.some((i) => highlight.includes(i));
        ctx.fillStyle = hasMatch ? 'rgba(102, 126, 234, 0.85)' : 'rgba(102, 126, 234, 0.35)';
        ctx.fillRect(px(peer.x) - 7, py(peer.y) - 7, 14, 14);
        ctx.fillStyle = '#666';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(peer.id, px(peer.x) + 10, py(peer.y) + 4);
      });

      CHUNKS.forEach((c, i) => {
        const on = highlight.includes(i);
        const r = on ? 11 + Math.sin(pulse) * 2 : 8;
        const grad = ctx.createRadialGradient(px(c.x), py(c.y), 0, px(c.x), py(c.y), r);
        if (on) {
          grad.addColorStop(0, '#43e97b');
          grad.addColorStop(1, '#38d9c8');
        } else {
          grad.addColorStop(0, '#667eea');
          grad.addColorStop(1, '#764ba2');
        }
        ctx.beginPath();
        ctx.arc(px(c.x), py(c.y), r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = on ? '#2a9d6a' : '#fff';
        ctx.lineWidth = on ? 2 : 1.2;
        ctx.stroke();
        ctx.fillStyle = on ? '#1a4d3a' : '#444';
        ctx.font = on ? 'bold 11px system-ui' : '10px system-ui';
        ctx.fillText(`#${i}`, px(c.x) + r + 4, py(c.y) + 4);
      });

      const starR = 14 + Math.sin(pulse * 1.3) * 2;
      ctx.save();
      ctx.translate(px(q.qx), py(q.qy));
      ctx.rotate(pulse * 0.15);
      ctx.fillStyle = '#fa709a';
      ctx.strokeStyle = '#5c2a35';
      ctx.lineWidth = 1.2;
      drawStar(ctx, 0, 0, 5, starR, starR * 0.45);
      ctx.restore();

      highlight.forEach((idx, j) => {
        const c = CHUNKS[idx];
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `rgba(250, 112, 154, ${0.5 + 0.3 * Math.sin(pulse + j)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px(q.qx), py(q.qy));
        ctx.lineTo(px(c.x), py(c.y));
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.fillStyle = '#888';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('embedding space (2D проекция)', pad, h - 8);
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

    function applyQuery(idx) {
      activeQuery = idx;
      const q = QUERIES[idx];
      queryBtns.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.stQuery) === idx));
      const peers = PEERS.filter((p) => p.pieces.some((i) => q.matches.includes(i))).map((p) => p.id);
      resultEl.innerHTML = `Запрос: <strong>«${q.label}»</strong> → куски <strong>#${q.matches.join(', #')}</strong> · пиры: <strong>${peers.join(', ')}</strong>`;
      renderChunkList(q.matches);
      draw();
    }

    queryBtns.forEach((btn) => {
      btn.addEventListener('click', () => applyQuery(Number(btn.dataset.stQuery)));
    });

    let raf;
    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    applyQuery(0);
    loop();

    window.addEventListener('resize', draw);
    root.addEventListener('semantic-torrent-destroy', () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', draw);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
