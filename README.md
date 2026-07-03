# VAIRL - Virtual AI Research Lab

Минималистичный двуязычный сайт с блогом в стиле Sakana AI, созданный на Jekyll с анимацией треугольников на p5.js.

## 📚 Документация

- 🚀 **[Публикация на GitHub Pages](GITHUB_PAGES_SETUP.md)** - полная инструкция по развёртыванию
- 📝 **[Добавление новых статей](ADD_NEW_POST.md)** - как писать и публиковать статьи
- 🌐 **[Двуязычность](MULTILINGUAL.md)** - как работает переключатель EN/RU
- 🐟 **[Лицензия анимации](LICENSE_FISH_ANIMATION.md)** - информация о Nature of Code

## Особенности

- 🚀 **Анимация треугольников** - алгоритм flocking из Nature of Code
- 🌐 **Двуязычность** - переключатель EN/RU с сохранением выбора
- 📝 **Блог на Jekyll** - легко добавлять статьи через Markdown
- 🎨 **Минималистичный дизайн** - в стиле Sakana AI
- 📱 **Адаптивная верстка** - работает на всех устройствах
- ⚡ **GitHub Pages** - бесплатный хостинг с автоматической сборкой

## Структура проекта

```
/
├── _config.yml              # Конфигурация Jekyll
├── _layouts/                # Шаблоны страниц
│   ├── default.html         # Базовый layout
│   └── post.html           # Layout для статей
├── _posts/                  # Статьи блога (Markdown)
├── notebooks/               # Jupyter-ноутбуки для Google Colab
├── assets/
│   ├── css/style.css       # Стили
│   └── js/fish-animation.js # Анимация рыбок
├── index.html              # Главная страница
├── blog.html               # Список статей
└── README.md               # Этот файл
```

## Локальная разработка

### Требования

- Ruby (версия 2.7 или выше)
- Bundler

### Установка

1. Установите зависимости:
```bash
bundle install
```

2. Запустите локальный сервер:
```bash
bundle exec jekyll serve
```

3. Откройте браузер по адресу: `http://localhost:4000`

### Режим разработки с автообновлением

```bash
bundle exec jekyll serve --livereload
```

## Добавление новых статей

1. Создайте новый файл в папке `_posts/` с именем в формате:
   ```
   YYYY-MM-DD-название-статьи.md
   ```

2. Добавьте front matter в начало файла:
   ```yaml
   ---
   layout: post
   title: "Название статьи"
   date: 2026-07-03 10:00:00 +0300
   excerpt: "Краткое описание статьи"
   ---
   ```

   **Важно:** `date` должна быть **в прошлом** на момент деплоя (Jekyll не публикует посты с будущей датой). Безопасный дефолт — утро текущего дня. См. [ADD_NEW_POST.md](ADD_NEW_POST.md#-дата-и-время-публикации--только-в-прошлом).

3. Напишите содержимое статьи в формате Markdown

4. Статья автоматически появится в списке на странице блога

## Деплой на GitHub Pages

### Вариант 1: Автоматический деплой

1. Создайте репозиторий на GitHub
2. Загрузите код:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

3. В настройках репозитория:
   - Перейдите в **Settings** → **Pages**
   - В разделе **Source** выберите **main** branch
   - Нажмите **Save**

4. Сайт будет доступен по адресу: `https://username.github.io/repo-name/`

### Вариант 2: Пользовательский домен

1. Создайте файл `CNAME` в корне проекта с вашим доменом:
   ```
   yourdomain.com
   ```

2. Настройте DNS записи у вашего регистратора:
   ```
   A record: 185.199.108.153
   A record: 185.199.109.153
   A record: 185.199.110.153
   A record: 185.199.111.153
   ```

3. В настройках GitHub Pages укажите ваш домен

## Настройка

### Изменение названия и описания

Отредактируйте файл `_config.yml`:

```yaml
title: VAIRL
description: Virtual AI Research Lab
```

### Настройка анимации рыбок

В файле `assets/js/fish-animation.js` можно изменить:
- `numFishes` - количество рыбок (по умолчанию 10)
- Размеры, скорость и прозрачность рыбок в классе `Fish`

### Изменение стилей

Все стили находятся в файле `assets/css/style.css`. Основные параметры:
- Цвета
- Размеры шрифтов
- Отступы и расстояния

## Технологии

- **Jekyll 4.3** - генератор статических сайтов
- **p5.js** - библиотека для анимации
- **Liquid** - шаблонизатор
- **Markdown** - формат для статей
- **GitHub Pages** - хостинг

## Лицензия

### Анимация рыбок
Анимация рыбок (`assets/js/fish-animation.js`) основана на алгоритме flocking из книги **"The Nature of Code"** by Daniel Shiffman и лицензирована под **GNU LGPL v2.1 or later**.

- Оригинальный код: https://github.com/nature-of-code/noc-examples-p5.js
- Автор: Daniel Shiffman
- Лицензия: https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

Подробности см. в файле `LICENSE_FISH_ANIMATION.md`

### Остальной код проекта
Все остальные файлы проекта (HTML, CSS, Jekyll конфигурация, контент) - MIT License

## Контакты

Для вопросов и предложений создавайте issues в репозитории проекта.

