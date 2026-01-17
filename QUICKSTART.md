# 🚀 Быстрый старт

## Публикация на GitHub Pages (5 минут)

```bash
# 1. Перейдите в папку проекта
cd /Users/proto/sorted/projects/web-site

# 2. Инициализируйте Git
git init
git add .
git commit -m "Initial commit: VAIRL website"

# 3. Создайте репозиторий на GitHub (через браузер)
# https://github.com/new

# 4. Подключите репозиторий (замените YOUR_USERNAME и YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main

# 5. Включите GitHub Pages
# Settings → Pages → Source: main branch → Save
```

**Готово!** Ваш сайт будет доступен через 2-3 минуты по адресу:
`https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## Добавление новой статьи (3 минуты)

```bash
# 1. Создайте файл статьи
nano _posts/2026-01-18-my-article.md
```

```markdown
---
layout: post
title: "My First Article"
date: 2026-01-18
excerpt: "This is my first blog post about AI research."
---

# Introduction

Your article content here in Markdown...

## Section 1

More content...
```

```bash
# 2. Сохраните (Ctrl+X, Y, Enter)

# 3. Опубликуйте
git add _posts/2026-01-18-my-article.md
git commit -m "Add new post: My First Article"
git push
```

**Готово!** Статья появится на сайте через 1-2 минуты.

---

## Локальный запуск (для разработки)

```bash
# Установите зависимости (один раз)
bundle install

# Запустите сервер
bundle exec jekyll serve

# Откройте в браузере
# http://localhost:4000
```

---

## Обновление контента

```bash
# После любых изменений в файлах:
git add .
git commit -m "Описание изменений"
git push
```

---

## Полезные ссылки

- 📖 [Полная инструкция по GitHub Pages](GITHUB_PAGES_SETUP.md)
- 📝 [Как добавлять статьи](ADD_NEW_POST.md)
- 🌐 [Двуязычность](MULTILINGUAL.md)
- 🎨 [Markdown шпаргалка](https://www.markdownguide.org/cheat-sheet/)

---

## Структура проекта

```
web-site/
├── _config.yml          # Настройки Jekyll
├── _layouts/            # Шаблоны страниц
├── _posts/              # 📝 Статьи блога (сюда добавлять!)
├── assets/
│   ├── css/            # Стили
│   └── js/             # JavaScript (анимация, переключатель)
├── index.html          # Главная страница
└── blog.html           # Список статей
```

---

## Горячие клавиши

| Действие | Команда |
|----------|---------|
| Публикация | `git add . && git commit -m "Update" && git push` |
| Локальный запуск | `bundle exec jekyll serve` |
| Создать статью | `nano _posts/YYYY-MM-DD-title.md` |

---

## Помощь

Проблемы? Смотрите:
- [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) - раздел "Решение проблем"
- GitHub Issues вашего репозитория
- [Jekyll документация](https://jekyllrb.com/docs/)
