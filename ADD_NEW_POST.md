# Инструкция по добавлению новых статей

## 📝 Быстрый старт

Чтобы добавить новую статью, нужно:
1. Создать файл в папке `_posts/`
2. Написать статью в формате Markdown
3. Закоммитить и запушить на GitHub

---

## 📋 Формат имени файла

Файлы статей должны называться по шаблону:
```
YYYY-MM-DD-название-статьи.md
```

### Примеры правильных имён:
- ✅ `2026-01-18-my-first-post.md`
- ✅ `2026-02-15-neural-networks-introduction.md`
- ✅ `2026-03-01-ai-research-trends.md`

### Примеры неправильных имён:
- ❌ `my-post.md` (нет даты)
- ❌ `18-01-2026-post.md` (неправильный формат даты)
- ❌ `2026-1-5-post.md` (нет нулей в месяце/дне)

---

## 📄 Структура статьи

Каждая статья состоит из двух частей:

### 1. Front Matter (метаданные)

В начале файла между `---` указываются метаданные:

```yaml
---
layout: post
title: "Название статьи"
date: 2026-01-18
excerpt: "Краткое описание статьи для списка"
---
```

### 2. Содержимое (Markdown)

После метаданных пишется сама статья в формате Markdown.

---

## 🎯 Полный пример статьи

Создайте файл `_posts/2026-01-18-introduction-to-transformers.md`:

```markdown
---
layout: post
title: "Introduction to Transformer Models"
date: 2026-01-18
excerpt: "Transformers have revolutionized natural language processing. Learn how they work and why they're so powerful."
---

The Transformer architecture, introduced in the paper "Attention is All You Need", has become the foundation for modern NLP models like GPT, BERT, and more.

## What are Transformers?

Transformers are neural network architectures that rely entirely on attention mechanisms, dispensing with recurrence and convolutions entirely.

## Key Components

### 1. Self-Attention Mechanism

The self-attention mechanism allows the model to weigh the importance of different words in a sentence when encoding a particular word.

### 2. Multi-Head Attention

Multiple attention mechanisms run in parallel, allowing the model to focus on different aspects of the input simultaneously.

### 3. Positional Encoding

Since transformers don't process sequences in order, positional encodings are added to give the model information about word positions.

## Why are Transformers Important?

- **Parallelization**: Unlike RNNs, transformers can process entire sequences at once
- **Long-range dependencies**: Better at capturing relationships between distant words
- **Scalability**: Can be trained on massive datasets efficiently

## Code Example

Here's a simple example of using a transformer model:

```python
from transformers import pipeline

# Create a text generation pipeline
generator = pipeline('text-generation', model='gpt2')

# Generate text
result = generator("Artificial intelligence is", max_length=50)
print(result[0]['generated_text'])
```

## Conclusion

Transformers have fundamentally changed how we approach NLP tasks. Understanding their architecture is crucial for anyone working in modern AI.

## Further Reading

- [Attention is All You Need](https://arxiv.org/abs/1706.03762) - Original paper
- [The Illustrated Transformer](http://jalammar.github.io/illustrated-transformer/) - Visual guide
```

---

## 📝 Markdown синтаксис

### Заголовки

```markdown
# H1 - Главный заголовок
## H2 - Подзаголовок
### H3 - Подподзаголовок
```

### Текст

```markdown
**Жирный текст**
*Курсив*
`Код внутри текста`
```

### Списки

```markdown
- Пункт 1
- Пункт 2
- Пункт 3

1. Первый
2. Второй
3. Третий
```

### Ссылки

```markdown
[Текст ссылки](https://example.com)
```

### Изображения

```markdown
![Описание изображения](/assets/images/picture.png)
```

### Блоки кода

````markdown
```python
def hello():
    print("Hello, World!")
```
````

### Цитаты

```markdown
> Это цитата
> Может быть многострочной
```

---

## 🚀 Публикация статьи

### Шаг 1: Создайте файл

```bash
cd /Users/proto/sorted/projects/web-site/_posts
nano 2026-01-18-my-new-post.md
```

Или используйте любой редактор (VS Code, Sublime Text и т.д.)

### Шаг 2: Напишите статью

Используйте шаблон выше.

### Шаг 3: Сохраните файл

### Шаг 4: Добавьте в Git

```bash
cd /Users/proto/sorted/projects/web-site
git add _posts/2026-01-18-my-new-post.md
```

### Шаг 5: Закоммитьте

```bash
git commit -m "Add new post: My New Post"
```

### Шаг 6: Отправьте на GitHub

```bash
git push
```

### Шаг 7: Дождитесь публикации

- GitHub Pages автоматически пересоберёт сайт (1-2 минуты)
- Статья появится на странице блога
- Будет доступна по адресу: `/blog/2026/01/18/my-new-post/`

---

## 🌐 Двуязычные статьи

Сайт поддерживает автоматическое переключение статей в зависимости от выбранного языка.

### Создание статьи на двух языках

**Шаг 1: Создайте английскую версию**

`_posts/2026-01-18-my-article.md`:
```yaml
---
layout: post
title: "My Article Title"
date: 2026-01-18
lang: en
excerpt: "English description"
---

English content here...
```

**Шаг 2: Создайте русскую версию**

`_posts/2026-01-18-my-article-ru.md`:
```yaml
---
layout: post
title: "Название моей статьи"
date: 2026-01-18
lang: ru
excerpt: "Русское описание"
---

Русский контент здесь...
```

### Важно:
- ✅ Обе версии должны иметь **одинаковую дату**
- ✅ Русская версия имеет суффикс `-ru` в имени файла
- ✅ Обязательно указывайте `lang: en` или `lang: ru` в front matter
- ✅ На странице блога автоматически отображаются статьи нужного языка

### Пример: Только на одном языке

Если статья только на английском:
```yaml
---
layout: post
title: "English Only Article"
date: 2026-01-18
lang: en
excerpt: "This article is only in English"
---
```

При переключении на русский эта статья не исчезнет, просто будет показана в английской версии.

---

## 📷 Добавление изображений

### Шаг 1: Создайте папку для изображений

```bash
mkdir -p /Users/proto/sorted/projects/web-site/assets/images
```

### Шаг 2: Поместите изображения

Скопируйте ваши изображения в эту папку.

### Шаг 3: Вставьте в статью

```markdown
![Описание изображения]({{ '/assets/images/my-image.png' | relative_url }})
```

---

## ✅ Чеклист перед публикацией

Перед публикацией статьи проверьте:

- [ ] Имя файла в формате `YYYY-MM-DD-название.md`
- [ ] Front matter заполнен полностью
- [ ] Дата в имени файла совпадает с датой в front matter
- [ ] Заголовок статьи понятный и привлекательный
- [ ] Excerpt (краткое описание) заполнено
- [ ] Текст отформатирован в Markdown
- [ ] Проверена орфография
- [ ] Ссылки работают
- [ ] Изображения загружены

---

## 🎨 Советы по написанию статей

### 1. Хороший заголовок

❌ Плохо: "Post about AI"
✅ Хорошо: "How Transformers Changed Natural Language Processing"

### 2. Структура

- Начните с введения
- Разбейте на разделы с подзаголовками
- Используйте списки для перечислений
- Заканчивайте выводами

### 3. Длина

- Минимум: 300-500 слов
- Оптимум: 800-1500 слов
- Для технических статей можно больше

### 4. Код

Всегда указывайте язык программирования:

````markdown
```python
# Ваш код
```
````

### 5. Изображения

- Используйте скриншоты для пояснения
- Оптимизируйте размер (не более 500KB)
- Добавляйте alt-текст для доступности

---

## 📊 Просмотр статей локально

Перед публикацией можно проверить статью локально:

```bash
cd /Users/proto/sorted/projects/web-site
bundle exec jekyll serve
```

Откройте: `http://localhost:4000/blog.html`

---

## 🔄 Обновление существующей статьи

1. Откройте файл статьи в `_posts/`
2. Внесите изменения
3. Сохраните
4. Закоммитьте и запушьте:

```bash
git add _posts/2026-01-18-my-post.md
git commit -m "Update article: fix typos"
git push
```

---

## 🗑️ Удаление статьи

```bash
git rm _posts/2026-01-18-old-post.md
git commit -m "Remove old article"
git push
```

---

## 🎯 Готово!

Теперь вы знаете, как добавлять новые статьи на сайт VAIRL. 

**Помните:** После каждого `git push` GitHub автоматически опубликует изменения через 1-2 минуты.

