# Инструкция по публикации на GitHub Pages

## 📋 Требования

- Аккаунт на GitHub
- Git установлен на компьютере
- Ruby и Jekyll (опционально, для локального тестирования)

---

## 🚀 Шаг 1: Создание репозитория

### 1.1. Создайте новый репозиторий на GitHub

1. Перейдите на [github.com](https://github.com)
2. Нажмите кнопку **"New repository"** (зелёная кнопка)
3. Заполните данные:
   - **Repository name**: `vairl-website` (или любое другое имя)
   - **Description**: `VAIRL - Virtual AI Research Lab website`
   - **Public** (выберите Public для бесплатного GitHub Pages)
   - ❌ НЕ создавайте README, .gitignore или license (у нас уже есть)
4. Нажмите **"Create repository"**

---

## 💻 Шаг 2: Загрузка кода

### 2.1. Откройте терминал

```bash
cd /Users/proto/sorted/projects/web-site
```

### 2.2. Инициализируйте Git (если ещё не сделано)

```bash
git init
```

### 2.3. Добавьте все файлы

```bash
git add .
```

### 2.4. Создайте первый коммит

```bash
git commit -m "Initial commit: VAIRL website with bilingual support and flocking animation"
```

### 2.5. Подключите удалённый репозиторий

**Замените YOUR_USERNAME и YOUR_REPO на свои:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

Пример:
```bash
git remote add origin https://github.com/johndoe/vairl-website.git
```

### 2.6. Отправьте код на GitHub

```bash
git branch -M main
git push -u origin main
```

Вам потребуется ввести логин и пароль GitHub (или использовать Personal Access Token).

---

## ⚙️ Шаг 3: Настройка GitHub Pages

### 3.1. Откройте настройки репозитория

1. Перейдите в свой репозиторий на GitHub
2. Нажмите **"Settings"** (вкладка вверху)

### 3.2. Включите GitHub Pages

1. В левом меню найдите **"Pages"**
2. В разделе **"Build and deployment"** → **Source**:
   - Выберите **GitHub Actions** (рекомендуется для этого репозитория)
   - Workflow `Deploy Jekyll site to Pages` запускается при push в `main`
3. **Не смешивайте** источники: если CI пушит в ветку `gh-pages`, а в Settings выбрана ветка `main` — сайт не обновится.

Альтернатива (legacy): Source = ветка **gh-pages** / **/(root)** — только если workflow именно публикует в `gh-pages` (peaceiris), а не через `deploy-pages`.

### 3.3. Дата поста — только в прошлом

Jekyll пропускает посты с `date` в будущем (`has a future date`). Поле `date` в frontmatter должно быть **уже прошедшим** на момент деплоя (CI в UTC). См. [ADD_NEW_POST.md](ADD_NEW_POST.md).

### 3.4. Дождитесь публикации

- GitHub начнёт сборку сайта (занимает 1-3 минуты)
- Появится сообщение: **"Your site is published at https://YOUR_USERNAME.github.io/YOUR_REPO/"**
- Скопируйте этот URL!

---

## 🌐 Шаг 4: Проверка сайта

### 4.1. Откройте ваш сайт

Перейдите по адресу:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

### 4.2. Проверьте:

- ✅ Треугольники летают
- ✅ Переключатель EN/RU работает
- ✅ Ссылки на blog работают
- ✅ Навигация работает

---

## 🔧 Шаг 5: Настройка baseurl (важно!)

Если сайт не работает правильно (нет стилей/скриптов), обновите `_config.yml`:

```yaml
baseurl: "/YOUR_REPO"  # Например: "/vairl-website"
url: "https://YOUR_USERNAME.github.io"
```

Затем:
```bash
git add _config.yml
git commit -m "Update baseurl for GitHub Pages"
git push
```

Подождите 1-2 минуты для пересборки.

---

## 🎯 Альтернатива: Пользовательский домен (опционально)

### Если у вас есть свой домен (например, vairl.ai):

1. Создайте файл `CNAME` в корне проекта:
```bash
echo "vairl.ai" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

2. У вашего регистратора домена добавьте DNS записи:
```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```

3. В настройках GitHub Pages → Custom domain → введите ваш домен
4. Включите **"Enforce HTTPS"**

---

## 🐛 Решение проблем

### Проблема: Сайт не собирается

**Решение:** Проверьте вкладку **"Actions"** в репозитории для логов ошибок.

### Проблема: Нет стилей/JavaScript

**Решение:** Обновите `baseurl` в `_config.yml` (см. Шаг 5).

### Проблема: 404 ошибка

**Решение:** 
- Проверьте правильность URL
- Убедитесь что GitHub Pages включен
- Подождите 5 минут после первой публикации

### Проблема: Анимация не работает

**Решение:**
- Проверьте консоль браузера (F12)
- Убедитесь что p5.js загружается с CDN
- Проверьте путь к `fish-animation.js`

---

## ✅ Готово!

Ваш сайт опубликован! Теперь можно:
- Делиться ссылкой
- Добавлять новые статьи (см. следующую инструкцию)
- Обновлять контент

---

## 📱 Быстрая публикация обновлений

После любых изменений:

```bash
git add .
git commit -m "Описание изменений"
git push
```

GitHub автоматически пересоберёт сайт за 1-2 минуты.

