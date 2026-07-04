/** PyTorch snippets — key inventions per architecture (nn-phylogeny demo). */
window.NN_PHYLOGENY_SNIPPETS = {
  perceptron: {
    blurb: 'Пороговый классификатор и правило обучения Rosenblatt — без скрытых слоёв.',
    snippets: [
      {
        title: 'Порог + обновление весов',
        code: `y = 1 if torch.dot(w, x) + b > 0 else 0
w += lr * (target - y) * x`,
      },
    ],
  },
  adaline: {
    blurb: 'Widrow–Hoff: ошибка на линейном выходе до порога, не на дискретном y.',
    snippets: [
      {
        title: 'Линейный выход',
        code: `y_lin = torch.dot(w, x) + b
w += lr * (target - y_lin) * x`,
      },
    ],
  },
  mlp: {
    blurb: 'Многослойная сеть и backprop через autograd — универсальный шаблон обучения.',
    snippets: [
      {
        title: 'Backprop',
        code: `loss = F.cross_entropy(model(x), y)
loss.backward()
optimizer.step()`,
      },
      {
        title: 'MLP',
        code: `nn.Sequential(
    nn.Linear(d_in, h), nn.ReLU(),
    nn.Linear(h, n_classes),
)`,
      },
    ],
  },
  lenet: {
    blurb: 'Стек Conv → pool → FC для цифр MNIST — прототип современных CNN.',
    snippets: [
      {
        title: 'LeNet-5',
        code: `nn.Sequential(
    nn.Conv2d(1, 6, 5), nn.ReLU(), nn.MaxPool2d(2),
    nn.Conv2d(6, 16, 5), nn.ReLU(), nn.MaxPool2d(2),
    nn.Flatten(), nn.Linear(256, 120), nn.Linear(120, 10),
)`,
      },
    ],
  },
  alexnet: {
    blurb: 'Глубокая CNN на GPU, ReLU inplace и Local Response Normalization.',
    snippets: [
      {
        title: 'ReLU + LRN',
        code: `x = F.relu(x, inplace=True)
x = F.max_pool2d(x, 3, stride=2)
# LRN — фирменная деталь AlexNet
x = x / (1 + 0.0001 * (x ** 2).sum(1, keepdim=True) ** 0.75)`,
      },
    ],
  },
  vgg: {
    blurb: 'Только 3×3 свёртки, глубина вместо больших ядер.',
    snippets: [
      {
        title: 'VGG-блок',
        code: `def vgg_block(c_in, c_out, n=2):
    layers = []
    for _ in range(n):
        layers += [nn.Conv2d(c_in, c_out, 3, padding=1), nn.ReLU(True)]
        c_in = c_out
    return nn.Sequential(*layers, nn.MaxPool2d(2))`,
      },
    ],
  },
  resnet: {
    blurb: 'Skip connection: F(x)+x обходит затухание градиента в глубоких сетях.',
    snippets: [
      {
        title: 'Residual block',
        code: `class ResBlock(nn.Module):
    def forward(self, x):
        return F.relu(self.conv2(self.conv1(x)) + self.shortcut(x))`,
      },
    ],
  },
  densenet: {
    blurb: 'Dense connection: concat признаков, а не сумма как в ResNet.',
    snippets: [
      {
        title: 'Dense layer',
        code: `def forward(self, x):
    out = torch.cat([x, self.bn(self.relu(self.conv(x)))], dim=1)
    return out`,
      },
    ],
  },
  effnet: {
    blurb: 'Compound scaling: depth × width × resolution одной формулой φ.',
    snippets: [
      {
        title: 'Scaling',
        code: `depth  = round(alpha ** phi)
width  = round(beta  ** phi)
res    = round(gamma ** phi)  # 224 → 299…`,
      },
      {
        title: 'MBConv + SE',
        code: `x = depthwise(x) * torch.sigmoid(se(x))  # squeeze-excitation`,
      },
    ],
  },
  rnn: {
    blurb: 'Рекуррентное скрытое состояние h_t = f(Wx_t + Uh_{t-1}).',
    snippets: [
      {
        title: 'Vanilla RNN',
        code: `h = torch.tanh(x @ W_xh + h_prev @ W_hh + b_h)`,
      },
    ],
  },
  lstm: {
    blurb: 'Три gate (input, forget, output) + cell state c_t.',
    snippets: [
      {
        title: 'LSTM cell',
        code: `i, f, o = torch.sigmoid(...), torch.sigmoid(...), torch.sigmoid(...)
c = f * c + i * torch.tanh(g)
h = o * torch.tanh(c)`,
      },
    ],
  },
  gru: {
    blurb: 'Два gate (update, reset) — меньше параметров, чем LSTM.',
    snippets: [
      {
        title: 'GRU',
        code: `z = torch.sigmoid(Wz @ torch.cat([h, x], -1))
h = (1 - z) * h + z * torch.tanh(Wh @ torch.cat([h, x], -1))`,
      },
    ],
  },
  seq2seq: {
    blurb: 'Encoder–decoder + Bahdanau attention для MT.',
    snippets: [
      {
        title: 'Additive attention',
        code: `score = v @ torch.tanh(W @ h_enc + U @ h_dec)
alpha = F.softmax(score, dim=-1)
context = (alpha.unsqueeze(-1) * h_enc).sum(0)`,
      },
    ],
  },
  transformer: {
    blurb: 'Self-attention без рекуррентности: QK^T/√d → softmax → V.',
    snippets: [
      {
        title: 'Scaled dot-product',
        code: `attn = F.softmax(Q @ K.transpose(-2, -1) / math.sqrt(d_k), dim=-1)
out = attn @ V`,
      },
      {
        title: 'Multi-head',
        code: `head_i = Attention(Q @ Wq_i, K @ Wk_i, V @ Wv_i)
out = torch.cat(heads, dim=-1) @ Wo`,
      },
    ],
  },
  bert: {
    blurb: 'Bidirectional encoder + Masked LM (случайные [MASK]).',
    snippets: [
      {
        title: 'MLM loss',
        code: `labels = input_ids.clone()
labels[~mask] = -100
loss = F.cross_entropy(
    logits.view(-1, vocab), labels.view(-1), ignore_index=-100)`,
      },
    ],
  },
  gpt1: {
    blurb: 'Decoder-only LM с causal mask — только прошлые токены.',
    snippets: [
      {
        title: 'Causal mask',
        code: `mask = torch.triu(torch.ones(T, T), diagonal=1).bool()
attn = attn.masked_fill(mask, float('-inf'))`,
      },
    ],
  },
  gpt2: {
    blurb: 'Pre-LayerNorm, multi-head, масштаб для zero-shot.',
    snippets: [
      {
        title: 'Pre-norm block',
        code: `x = x + self.attn(self.ln1(x), attn_mask=causal)
x = x + self.mlp(self.ln2(x))`,
      },
    ],
  },
  gpt3: {
    blurb: 'In-context learning: few-shot в промпте, без fine-tune.',
    snippets: [
      {
        title: 'Few-shot forward',
        code: `with torch.no_grad():
    logits = model(torch.cat([examples, query]))
# градиент только при pretrain, не на inference`,
      },
    ],
  },
  t5: {
    blurb: 'Text-to-text: все задачи как span generation в decoder.',
    snippets: [
      {
        title: 'Encoder–decoder',
        code: `dec_in = torch.cat([pad_id, labels[:, :-1]], dim=1)
loss = model(input_ids, decoder_input_ids=dec_in).loss`,
      },
    ],
  },
  vit: {
    blurb: 'Patch embedding + positional tokens вместо свёрток.',
    snippets: [
      {
        title: 'Patches → tokens',
        code: `patches = img.unfold(2, P, P).unfold(3, P, P)
patches = patches.contiguous().view(B, -1, P*P*C)
x = torch.cat([cls_token, patch_proj(patches)], dim=1) + pos_embed`,
      },
    ],
  },
  clip: {
    blurb: 'Contrastive image–text: InfoNCE по batch embeddings.',
    snippets: [
      {
        title: 'CLIP loss',
        code: `logits = (img_emb @ txt_emb.T) * logit_scale.exp()
labels = torch.arange(B, device=x.device)
loss = (F.cross_entropy(logits, labels) +
        F.cross_entropy(logits.T, labels)) / 2`,
      },
    ],
  },
  ddpm: {
    blurb: 'Forward diffusion q(x_t|x_0) + обучение предсказывать шум ε.',
    snippets: [
      {
        title: 'Noise prediction',
        code: `x_t = sqrt_ab[t] * x0 + sqrt_1m_ab[t] * noise
loss = F.mse_loss(unet(x_t, t), noise)`,
      },
    ],
  },
  sd: {
    blurb: 'Latent diffusion: U-Net в VAE-латенте + text conditioning.',
    snippets: [
      {
        title: 'Latent space',
        code: `z = vae.encode(x).latent_dist.sample()
z_t = forward_diffusion(z, t, noise)
loss = F.mse_loss(unet(z_t, t, text_emb), noise)`,
      },
    ],
  },
  switch: {
    blurb: 'Sparse MoE: top-1 router выбирает один expert на токен.',
    snippets: [
      {
        title: 'Top-1 routing',
        code: `router = torch.softmax(gate(x), dim=-1)
idx = torch.argmax(router, dim=-1)
y = torch.stack([experts[i](x_i) for i, x_i in zip(idx, x)])`,
      },
    ],
  },
  chinchilla: {
    blurb: 'Compute-optimal scaling: ~20 tokens на параметр.',
    snippets: [
      {
        title: 'Scaling law (упрощённо)',
        code: `optimal_tokens = 20 * num_params
# при фикс. compute — меньше модель, больше данных`,
      },
    ],
  },
  llama: {
    blurb: 'RMSNorm + SwiGLU FFN + RoPE — open-weights стек.',
    snippets: [
      {
        title: 'RMSNorm + SwiGLU',
        code: `x = x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + eps)
ff = F.silu(W1 @ x) * (W2 @ x)  # SwiGLU`,
      },
      {
        title: 'RoPE',
        code: `q, k = apply_rotary_emb(q, k, pos_ids)  # relative position`,
      },
    ],
  },
  mixtral: {
    blurb: 'Top-2 MoE: два expert на токен, weighted sum.',
    snippets: [
      {
        title: 'Top-2 MoE',
        code: `w, idx = torch.topk(router(x), k=2, dim=-1)
w = F.softmax(w, dim=-1)
out = sum(w_i * experts[j](x) for w_i, j in zip(w, idx))`,
      },
    ],
  },
};
