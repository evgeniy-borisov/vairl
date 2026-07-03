/**
 * Edge NN demo: webcam + ONNX Runtime Web + tiny MNIST CNN (p5.js).
 */
(function () {
  const ROOT_ID = 'edge-nn-demo';
  const ORT_VERSION = '1.22.0';
  const ORT_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist`;
  const MNIST_MEAN = 0.1307;
  const MNIST_STD = 0.3081;
  const INFER_EVERY_MS = 180;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function softmax(arr) {
    const max = Math.max(...arr);
    const ex = arr.map((v) => Math.exp(v - max));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / sum);
  }

  async function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = '1';

    const modelUrl = root.dataset.modelUrl;
    const mount = root.querySelector('.edge-nn-canvas-mount');
    const statusEl = root.querySelector('.edge-nn-status');
    const predEl = root.querySelector('.edge-nn-prediction');
    const previewCanvas = root.querySelector('.edge-nn-preview');
    const btnStart = root.querySelector('[data-edge-start]');
    const btnStop = root.querySelector('[data-edge-stop]');

    let session = null;
    let running = false;
    let lastInfer = 0;
    let sketchApi = {};

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg;
    }

    function setButtons(active) {
      if (btnStart) btnStart.disabled = active;
      if (btnStop) btnStop.disabled = !active;
    }

    setButtons(false);
    setStatus('Загрузка ONNX Runtime Web…');

    try {
      await loadScript(`${ORT_CDN}/ort.min.js`);
      window.ort.env.wasm.wasmPaths = `${ORT_CDN}/`;
      setStatus('Загрузка модели ONNX…');
      session = await window.ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
      });
      setStatus('Модель готова. Нажмите «Запустить» и покажите цифру камере.');
    } catch (err) {
      console.error(err);
      setStatus(`Ошибка: ${err.message}`);
      return;
    }

    function drawPreview(tensor) {
      if (!previewCanvas) return;
      const ctx = previewCanvas.getContext('2d');
      const w = 28;
      const h = 28;
      previewCanvas.width = w * 4;
      previewCanvas.height = h * 4;
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = Math.max(0, Math.min(255, ((tensor[i] * MNIST_STD + MNIST_MEAN) * 255) | 0));
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      ctx.imageSmoothingEnabled = false;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      off.getContext('2d').putImageData(img, 0, 0);
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      ctx.drawImage(off, 0, 0, previewCanvas.width, previewCanvas.height);
    }

    async function runInference(video, pg28) {
      if (!session || !video || !video.loadedmetadata) return;
      pg28.image(video, 0, 0, 28, 28);
      pg28.loadPixels();
      const input = new Float32Array(28 * 28);
      for (let i = 0; i < 28 * 28; i++) {
        const r = pg28.pixels[i * 4];
        const g = pg28.pixels[i * 4 + 1];
        const b = pg28.pixels[i * 4 + 2];
        const gray = (r + g + b) / (3 * 255);
        input[i] = (gray - MNIST_MEAN) / MNIST_STD;
      }
      drawPreview(input);
      const tensor = new window.ort.Tensor('float32', input, [1, 1, 28, 28]);
      const out = await session.run({ input: tensor });
      const logits = out.logits.data;
      const probs = softmax(Array.from(logits));
      let best = 0;
      for (let d = 1; d < 10; d++) {
        if (probs[d] > probs[best]) best = d;
      }
      const conf = (probs[best] * 100).toFixed(1);
      if (predEl) {
        predEl.innerHTML = `Цифра: <strong>${best}</strong> · уверенность ${conf}%`;
      }
    }

    const sketch = (p5) => {
      let video;
      let pg28;

      p5.setup = () => {
        const cnv = p5.createCanvas(400, 300);
        cnv.parent(mount);
        pg28 = p5.createGraphics(28, 28);
        p5.noStroke();
      };

      p5.draw = () => {
        p5.background(250, 251, 253);
        if (video && running) {
          p5.image(video, 0, 0, p5.width, p5.height);
          p5.fill(102, 126, 234, 40);
          const sz = Math.min(p5.width, p5.height) * 0.55;
          p5.rect((p5.width - sz) / 2, (p5.height - sz) / 2, sz, sz, 8);
          const now = performance.now();
          if (now - lastInfer > INFER_EVERY_MS) {
            lastInfer = now;
            runInference(video, pg28).catch((e) => setStatus(`Инференс: ${e.message}`));
          }
        } else {
          p5.fill(235, 237, 242);
          p5.rect(0, 0, p5.width, p5.height);
          p5.fill(120, 125, 140);
          p5.textAlign(p5.CENTER, p5.CENTER);
          p5.textSize(14);
          p5.text('Камера выключена', p5.width / 2, p5.height / 2);
        }
      };

      sketchApi.startCam = async () => {
        if (video) return;
        setStatus('Запрос доступа к камере…');
        try {
          video = p5.createCapture(p5.VIDEO);
          video.size(400, 300);
          video.hide();
          await new Promise((res) => {
            video.elt.onloadedmetadata = res;
          });
          running = true;
          setButtons(true);
          setStatus('Инференс в браузере (WASM). Покажите цифру в центре кадра.');
        } catch (e) {
          setStatus(`Камера недоступна: ${e.message}`);
        }
      };

      sketchApi.stopCam = () => {
        running = false;
        if (video) {
          const stream = video.elt.srcObject;
          if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
          video.remove();
          video = null;
        }
        setButtons(false);
        if (predEl) predEl.textContent = '—';
        setStatus('Остановлено. Модель в памяти, можно запустить снова.');
      };
    };

    if (typeof window.p5 === 'undefined') {
      setStatus('p5.js не загружен');
      return;
    }
    new window.p5(sketch);

    btnStart?.addEventListener('click', () => sketchApi.startCam?.());
    btnStop?.addEventListener('click', () => sketchApi.stopCam?.());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
