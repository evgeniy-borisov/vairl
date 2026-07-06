/** Каталог архитектур: описание, достижение, особенности (nn-phylogeny demo). */
window.NN_PHYLOGENY_CATALOG = {
  perceptron: {
    desc: 'Первый обучаемый пороговый нейрон — старт связистого ИИ.',
    achievement: 'Доказал, что машина может учиться на примерах без явного программирования правил.',
    features: 'Линейный классификатор, пороговая активация, правило Rosenblatt.',
  },
  adaline: {
    desc: 'Адаптивный линейный элемент Widrow–Hoff.',
    achievement: 'Стабильное обучение через ошибку на непрерывном выходе до порога.',
    features: 'Линейная регрессия, LMS-правило, шумоустойчивость.',
  },
  mlp: {
    desc: 'Многослойный перцептрон с обратным распространением ошибки.',
    achievement: 'Сделал обучение глубже одного слоя практичным (Rumelhart et al., 1986).',
    features: 'Скрытые слои, sigmoid/ReLU, chain rule, универсальная аппроксимация.',
  },
  lenet: {
    desc: 'LeNet-5 LeCun — CNN для распознавания цифр.',
    achievement: 'Показал, что свёртки + pooling работают в промышленном OCR.',
    features: 'Conv 5×5, subsampling, иерархия признаков, FC-головка.',
  },
  alexnet: {
    desc: 'Победитель ImageNet 2012 — перелом deep learning в CV.',
    achievement: 'Вдвое снизил ошибку ILSVRC; доказал ценность GPU и глубины.',
    features: 'ReLU, dropout, LRN, 8 слоёв на 2× GTX 580, data augmentation.',
  },
  vgg: {
    desc: 'Очень глубокая CNN только из 3×3 свёрток.',
    achievement: 'Систематизировала дизайн: «глубина через малые ядра».',
    features: 'VGG-16/19, 3×3 stacks, 138M параметров, простой transfer learning.',
  },
  resnet: {
    desc: 'Residual Network — skip connections через блоки.',
    achievement: 'Обучение 152+ слоёв; ошибка 3.57% на ImageNet (2015).',
    features: 'F(x)+x shortcut, bottleneck blocks, решает vanishing gradient.',
  },
  densenet: {
    desc: 'Плотные связи: каждый слой видит все предыдущие карты.',
    achievement: 'Меньше параметров при той же точности за счёт feature reuse.',
    features: 'Concat вместо add, dense blocks, growth rate k.',
  },
  effnet: {
    desc: 'EfficientNet — compound scaling depth/width/resolution.',
    achievement: 'SOTA при меньшем compute; эталон для edge и mobile CV.',
    features: 'MBConv, SE-attention, φ-коэффициент масштабирования, NAS-поиск.',
  },
  rnn: {
    desc: 'Рекуррентная сеть Элмана — память через скрытое состояние.',
    achievement: 'Модель последовательностей до эры LSTM/Transformer.',
    features: 'h_t = f(Wx_t + Uh_{t-1}), BPTT, ограниченная дальняя память.',
  },
  lstm: {
    desc: 'Long Short-Term Memory — ячейка с тремя воротами.',
    achievement: 'Решила vanishing gradient для длинных зависимостей в речи и тексте.',
    features: 'Input/forget/output gates, cell state c_t, encoder-decoder MT.',
  },
  gru: {
    desc: 'Gated Recurrent Unit — упрощённая альтернатива LSTM.',
    achievement: 'Сопоставимое качество при меньшем числе параметров.',
    features: 'Update + reset gates, без отдельного cell state, быстрее LSTM.',
  },
  seq2seq: {
    desc: 'Encoder–decoder с additive attention (Bahdanau).',
    achievement: 'Прорыв в машинном переводе без жёсткого alignment.',
    features: 'Variable-length I/O, attention weights, soft search по encoder.',
  },
  transformer: {
    desc: '«Attention Is All You Need» — без рекуррентности.',
    achievement: 'Параллельное обучение, SOTA MT; фундамент современных LLM.',
    features: 'Multi-head self-attention, positional encoding, encoder-decoder.',
  },
  bert: {
    desc: 'Bidirectional Encoder Representations from Transformers.',
    achievement: 'Прелоадинг контекстных эмбеддингов; революция в NLP-бенчмарках.',
    features: 'Masked LM + NSP, bidirectional, fine-tune на downstream.',
  },
  gpt1: {
    desc: 'Generative Pre-Training — decoder-only Transformer.',
    achievement: 'Unsupervised pretrain + supervised fine-tune для NLP.',
    features: 'Causal mask, autoregressive LM, transfer через GPT-heads.',
  },
  gpt2: {
    desc: 'Масштабированный GPT с zero-shot способностями.',
    achievement: 'Показал emergent abilities без fine-tune на многих задачах.',
    features: '1.5B params, byte-pair encoding, pre-norm blocks.',
  },
  gpt3: {
    desc: '175B параметров — in-context learning.',
    achievement: 'Few-shot через промпт без градиентного обновления весов.',
    features: 'Massive scale, prompt engineering, API-экономика LLM.',
  },
  t5: {
    desc: 'Text-to-Text Transfer Transformer — единый формат задач.',
    achievement: 'Все NLP-задачи как генерация текста с префиксом.',
    features: 'Span corruption, encoder-decoder, масштабный C4 corpus.',
  },
  vit: {
    desc: 'Vision Transformer — patches как токены.',
    achievement: 'Pure attention без свёрток на ImageNet при достаточных данных.',
    features: 'Patch embedding, CLS token, positional embed, hybrid с CNN позже.',
  },
  clip: {
    desc: 'Contrastive Language–Image Pre-training (OpenAI).',
    achievement: 'Общее embedding-пространство текста и изображений; zero-shot CV.',
    features: 'InfoNCE loss, dual encoders, 400M пар image-text.',
  },
  ddpm: {
    desc: 'Denoising Diffusion Probabilistic Models.',
    achievement: 'Качественная генерация изображений через итеративный denoising.',
    features: 'Forward noising, ε-prediction, U-Net backbone, score matching.',
  },
  sd: {
    desc: 'Stable Diffusion — latent diffusion в пространстве VAE.',
    achievement: 'Text-to-image на потребительских GPU; открытая экосистема.',
    features: 'Latent space 64×64, CLIP text encoder, cross-attention, CFG.',
  },
  switch: {
    desc: 'Switch Transformer — sparse MoE с top-1 routing.',
    achievement: 'Триллион+ токенов при умеренном compute за счёт sparsity.',
    features: 'Expert per token, load balancing loss, T5-бэкбон.',
  },
  chinchilla: {
    desc: 'Compute-optimal scaling laws (DeepMind).',
    achievement: 'Оптимум: ~20 токенов на параметр, а не «больше модель».',
    features: '70B модель обгоняет Gopher 280B, переоценка данных vs параметров.',
  },
  llama: {
    desc: 'LLaMA — открытые веса от Meta для исследований.',
    achievement: 'Демократизировал сильные LLM; основа Llama 2/3 экосистемы.',
    features: 'RMSNorm, SwiGLU, RoPE, grouped-query attention (в поздних версиях).',
  },
  mixtral: {
    desc: 'Mixtral 8×7B — sparse MoE на открытых весах.',
    achievement: 'Качество ~70B при инференсе ~2 активных expert на токен.',
    features: 'Top-2 routing, 8 experts, Mistral-бэкбон, Apache 2.0.',
  },
};
