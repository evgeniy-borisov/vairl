---
layout: post
title: "Форматы цифровых текстов: PDF, EPUB, FB2, DjVu и другие"
date: 2026-07-08 12:00:00 +0300
excerpt: "Сводная таблица и подробный разбор популярных форматов книг и статей в интернете: кто придумал, как устроены текст и картинки, какие есть варианты и конвертеры."
lang: ru
image: /assets/images/digital-document-formats.svg
visibility: public
review_status: approved
---

Когда мы скачиваем книгу, статью или диссертацию, за расширением файла стоит целая инженерная история: как хранить текст, как сжимать сканы, как зафиксировать вёрстку или, наоборот, позволить читателю менять шрифт. Ниже — краткая сводная таблица, затем подробный разбор каждого формата: происхождение, внутреннее устройство, хранение изображений и доступные конвертеры.

<figure style="margin: 2em auto; text-align: center;">
  <img src="/vairl/assets/images/digital-document-formats.svg" alt="Схема популярных форматов цифровых текстов: PDF, EPUB, FB2, DjVu, MOBI, DOCX" style="max-width: 100%; height: auto; display: block; margin: 0 auto 0.75em;" />
  <figcaption style="font-size: 0.9em; color: #666; max-width: 720px; margin: 0 auto;">Основные семейства: фиксированная вёрстка, reflowable ebooks, сканы, офисные документы, разметка</figcaption>
</figure>

---

## Сводная таблица

| Формат | Год | Тип | Текст | Картинки | Конвертеры | Создатель / организация |
|--------|-----|-----|-------|----------|------------|-------------------------|
| [PDF](#pdf-portable-document-format) | 1993 | фиксированная вёрстка | объекты + шрифты, вектор/растр | JPEG, PNG, JPX, встроенные | Ghostscript, Poppler, Calibre, Pandoc | Adobe, **John Warnock** |
| [EPUB](#epub-electronic-publication) | 2007 | reflowable ebook | XHTML + CSS | отдельные файлы в ZIP | Calibre, Pandoc, Sigil | IDPF → **W3C** |
| [MOBI / AZW](#mobi-azw-azw3-kfx-kindle) | 2000 | ebook (устаревает) | PalmDOC + HTML (KF8) | встроенные / отдельные | Calibre, Kindle Previewer | Mobipocket → **Amazon** |
| [FB2](#fb2-fictionbook) | 2004 | reflowable ebook | XML | base64 внутри XML | Calibre, fb2converter | **Dmitry Gribov**, российское сообщество |
| [DjVu](#djvu) | 1996 | скан / факсимиле | растр + маски (JB2) | слои IW44/JPEG | djvulibre, Calibre | AT&T Labs, **Yann LeCun**, Léon Bottou |
| [DOCX](#docx-и-odt-офисные-документы) | 2007 | редактируемый документ | OOXML (ZIP+XML) | `word/media/` | LibreOffice, Pandoc | **Microsoft** |
| [ODT](#docx-и-odt-офисные-документы) | 2005 | редактируемый документ | OpenDocument (ZIP+XML) | `Pictures/` | LibreOffice, Pandoc | **OASIS**, Sun/OpenOffice |
| [HTML](#html-и-markdown-веб-статьи) | 1991 | веб-статья | разметка DOM | `<img>`, SVG, CSS | браузер, Pandoc, HTTrack | **Tim Berners-Lee**, CERN |
| [Markdown](#html-и-markdown-веб-статьи) | 2004 | лёгкая разметка | plain text + синтаксис | ссылки на файлы | Pandoc, CommonMark | **John Gruber**, Aaron Swartz |
| [LaTeX / TeX](#latex-и-tex) | 1978/1984 | вёрстка → PDF/DVI | макросы поверх TeX | `\includegraphics`, PS | pdflatex, Pandoc, latexmk | **Donald Knuth**, **Leslie Lamport** |
| [RTF](#rtf-rich-text-format) | 1987 | обмен между редакторами | управляющие коды | встроенные WMF/PNG | Word, LibreOffice, Pandoc | **Microsoft**, Richard Brodie |
| [PostScript](#postscript-ps-и-eps) | 1984 | язык описания страниц | интерпретируемый PS-код | растровые операторы | Ghostscript | Adobe, Warnock & Geschke |
| [CHM](#chm-compiled-html-help) | 1997 | справка Windows | скомпилированный HTML | внутри ITSF | 7-Zip, hh.exe | **Microsoft** |
| [CBZ / CBR](#cbz-и-cbr-комиксы) | ~2000 | архив страниц | нет (только картинки) | JPEG/PNG по файлам | Calibre, ComicRack | сообщество комиксов |
| [Plain text](#plain-text-txt) | вечность | сырой текст | UTF-8/ASCII | нет | любой редактор | — |
| [XPS](#xps-openxps) | 2006 | фиксированная вёрстка | XAML-подобный XML | в пакете ZIP | XPS Viewer, MuPDF | **Microsoft** |

---

## PDF (Portable Document Format)

**Кто придумал.** PDF создан в Adobe Systems под руководством **John Warnock** — сооснователя Adobe вместе с Chuck Geschke. Идея «электронной бумаги» (Camelot project) была анонсирована в 1991, первая спецификация PDF 1.0 — в 1993. С 2008 года PDF стандартизирован как ISO 32000.

**Ключевые особенности.**
- **Фиксированная вёрстка**: страница выглядит одинаково на любом устройстве — идеально для статей, отчётов, патентов.
- **Объектная модель**: файл — граф объектов (словари, потоки, перекрёстные ссылки `xref`), а не линейный текст.
- **Векторная графика** + растровые изображения + встроенные шрифты (Type1, TrueType, OpenType, CID).
- Поддержка форм, аннотаций, закладок, метаданных XMP, шифрования, цифровых подписей.
- PDF/A — архивный профиль; PDF/X — для полиграфии; PDF/UA — доступность.

**Как хранятся текст и картинки.**
- Текст — как потоки операторов PDF (`Tj`, `TJ`) с привязкой к глифам шрифта; может быть некопируемым (скан без OCR).
- Картинки — объекты XObject: Image (JPEG, JPEG2000, CCITT Fax, raw), Form XObject (повторяемая графика).
- Шрифты встраиваются целиком или подмножеством; без встраивания — риск «битой» вёрстки.

**Варианты и устройство.**
```
PDF-файл
├── header (%PDF-1.7)
├── body (объекты: Pages, Page, Font, Image, Content stream…)
├── xref (таблица смещений)
└── trailer (Root, Info, Encrypt)
```
Линейный PDF (``/Linearized``) оптимизирован для потоковой загрузки в браузере.

**Конвертеры.** [Ghostscript](https://www.ghostscript.com/), [Poppler](https://poppler.freedesktop.org/) (`pdftotext`, `pdfimages`), [Calibre](https://calibre-ebook.com/), [Pandoc](https://pandoc.org/), [MuPDF](https://mupdf.com/), [OCRmyPDF](https://ocrmypdf.readthedocs.io/) (добавляет текстовый слой к сканам).

**Интересные связи.** Warnock и Geschke ранее создали **PostScript** — PDF унаследовал многие идеи PS, но сделал их самодостаточными и бинарными. PDF стал де-факто стандартом научных публикаций (arXiv, журналы) и госдокументов.

---

## EPUB (Electronic Publication)

**Кто придумал.** Формат развивался **International Digital Publishing Forum** (IDPF); с 2017 года — под эгидой **W3C** (группа Publishing). EPUB 3.x — текущий стандарт открытого ebook.

**Ключевые особенности.**
- **Reflowable**: текст перетекает под размер экрана и шрифт читателя.
- Открытый стандарт (в отличие от проприетарных Kindle-форматов).
- Поддержка CSS, SVG, аудио/видео (EPUB 3), математики (MathML), доступности (ARIA).
- Один файл `.epub` — это **ZIP-архив** с фиксированной структурой.

**Как хранятся текст и картинки.**
- Текст — файлы **XHTML** (или HTML5 в EPUB 3) + таблицы стилей **CSS**.
- Картинки — отдельные файлы в `OEBPS/Images/` или `images/`: PNG, JPEG, GIF, SVG.
- Метаданные — `content.opf` (Dublin Core: автор, название, ISBN).
- Навигация — `toc.ncx` (EPUB 2) или `nav.xhtml` (EPUB 3).

**Варианты и устройство.**
```
book.epub (ZIP)
├── mimetype          ← первым, без сжатия
├── META-INF/container.xml
└── OEBPS/
    ├── content.opf   ← манифест и spine
    ├── toc.ncx / nav.xhtml
    ├── chapter01.xhtml
    ├── styles/style.css
    └── images/cover.jpg
```

**Конвертеры.** [Calibre](https://calibre-ebook.com/), [Pandoc](https://pandoc.org/), [Sigil](https://sigil-ebook.com/) (редактор), [Apple Pages](https://www.apple.com/pages/) (экспорт), [Google Play Books](https://play.google.com/books) (загрузка DOCX → EPUB).

**Интересные связи.** EPUB — наследник **Open eBook** (OEB) и XHTML-революции веба. Dave Raggett (HTML, CSS) косвенно повлиял на всю экосистему. Для русскоязычных издательств EPUB — основной открытый формат наряду с FB2.

---

## MOBI, AZW, AZW3, KFX (Kindle)

**Кто придумал.** **Mobipocket** (Франция, 2000) — основатели вроде Thierry Brethes; в 2005 Amazon купила Mobipocket и превратила формат в экосистему **Kindle**. AZW — обёртка Amazon над MOBI с DRM; AZW3/KF8 (2011) — HTML5/CSS внутри; KFX (с ~2015) — проприетарный преемник с улучшенной типографикой.

**Ключевые особенности.**
- Наследие **PalmDOC**: сжатие текста словарём частых 2-байтовых пар (аналог LZ для текста).
- Поддержка закладок, аннотаций, словаря, TTS.
- MOBI/AZW постепенно вытесняются AZW3/KFX на устройствах Kindle.
- DRM Amazon (Hardened / Topaz) ограничивает конвертацию легально купленных книг.

**Как хранятся текст и картинки.**
- MOBI: бинарный заголовок + PalmDOC-сжатый текст + индекс записей (INDX) + GIF/JPEG обложка и иллюстрации.
- KF8/AZW3: внутри — ZIP-подобная структура с HTML-фрагментами и CSS (концептуально близко к EPUB).
- KFX: проприетарный контейнер, детали закрыты.

**Конвертеры.** [Calibre](https://calibre-ebook.com/) (MOBI ↔ EPUB, без DRM), [Kindle Previewer](https://www.amazon.com/Kindle-Previewer), [kindleunpack](https://github.com/kevinhendricks/KindleUnpack). Для DRM-файлов — только официальные инструменты Amazon.

**Интересные связи.** Mobipocket вырос из мира **Palm Pilot** — первых карманных PDA. Jeff Bezos и команда Kindle сделали ebook массовым рынком; сегодня Amazon давит на формат KFX, но EPUB официально поддерживается на новых Kindle (с 2022).

---

## FB2 (FictionBook)

**Кто придумал.** Российский формат, 2004 год. Инициатор — **Dmitry Gribov** (Дмитрий Грибов); развитие через сообщество [FictionBook](http://www.fictionbook.org/) и конкурс «Новая библиотека». Стандарт открыт, лицензия свободная.

**Ключевые особенности.**
- **Один XML-файл** на всю книгу — удобно для каталогов, библиотек (LibGen, Флибуста) и конвертации.
- Семантическая разметка: `<section>`, `<title>`, `<epigraph>`, `<poem>`, `<cite>` — не просто «жирный/курсив», а структура произведения.
- Популярен в русскоязычном booktorrent-сообществе; поддерживается почти всеми русскими ридерами (Cool Reader, AlReader, ЛитРес).
- Версии: FB2 2.0 (основная), FB2.1 (расширения).

**Как хранятся текст и картинки.**
- Текст — чистый XML с namespace `http://www.gribuser.ru/xml/fictionbook/2.0`.
- Картинки — **встроены в base64** внутри `<binary id="..." content-type="image/jpeg">` — нет внешних файлов.
- Обложка ссылается через `<coverpage><image href="#cover.jpg"/></coverpage>`.

**Варианты и устройство.**
```xml
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>…метаданные…</description>
  <body>
    <section><title><p>Глава 1</p></title><p>Текст…</p></section>
  </body>
  <binary id="cover.jpg" content-type="image/jpeg">/9j/4AAQ…</binary>
</FictionBook>
```
`.fb2.zip` — тот же XML, сжатый ZIP (без base64-раздувания на диске).

**Конвертеры.** [Calibre](https://calibre-ebook.com/), [fb2converter](https://github.com/gribuser/fb2), [Any2FB2](http://www.fictionbook.org/), онлайн-конвертеры. FB2 → EPUB/PDF/MOBI — тривиально; обратно — с потерей семантики, если источник бедный.

**Интересные связи.** Грибов — фигура русскоязычного ebook-движения нулевых; FB2 стал «народным стандартом» параллельно западному EPUB. Связь с **Анной Архив** / LibGen: огромная доля русскоязычной худлитературы — именно FB2.

---

## DjVu

**Кто придумал.** **AT&T Labs** в 1996 году. Ключевые авторы: **Yann LeCun** (да, будущий Turing Award за deep learning), **Léon Bottou**, Patrice Y. Simard, Patrick Haffner. Название — франц. *déjà vu* («уже виденное»): формат для уже отпечатанных документов.

**Ключевые особенности.**
- Оптимизирован для **сканов**: книги, журналы, старые газеты, техническая документация.
- **Раздельное сжатие слоёв**: фон (фотография страницы) — вейвлет **IW44**; текст и линии — **JB2** (арифметическое кодирование битовых масок, родственник JBIG2).
- При 300 dpi читаемый скан занимает в 3–10 раз меньше, чем TIFF или JPEG-последовательность, при лучшей читаемости мелкого шрифта.
- Поддержка OCR-текстового слоя (невидимый текст поверх картинки) — `hidden text layer`.
- Многостраничный документ — один файл или индексированный набор `.djvu` + `.ind`.

**Как хранятся текст и картинки.**
- Страница = BG44/IW44 слой (фон) + FG44/JB2 слой (маска текста/линий) + опционально цветной слой.
- Текст для поиска — отдельный `TXT` chunk или OCR-слой, не векторный шрифт.
- Навигация: оглавление, закладки в `navm` chunk.

**Варианты.** Bundled multi-page DjVu; Indirect (внешние страницы); Photo DjVu (фотографии без JB2).

**Конвертеры.** [djvulibre](https://djvu.sourceforge.net/) (`djvudigital`, `ddjvu`), [Scan Tailor](https://scantailor.org/) → DjVu pipeline, [Calibre](https://calibre-ebook.com/), [pdf2djvu](https://jwilk.net/software/pdf2djvu). DjVu → PDF теряет преимущество размера.

**Интересные связи.** LeCun и Bottou — звёзды ML; DjVu — их малоизвестный вклад в **сжатие документов**. На LibGen и Internet Archive миллионы научных сканов — в DjVu. В 2010-х формат уступил PDF по универсальности, но остаётся эталоном для архивов библиотек.

---

## DOCX и ODT (офисные документы)

### DOCX (Office Open XML)

**Кто придумал.** **Microsoft**, Office 2007. Стандартизирован ECMA-376 и ISO/IEC 29500 после давления конкурентов и госзаказчиков.

**Ключевые особенности.**
- ZIP-контейнер с XML внутри — можно «распаковать» и править вручную.
- Богатая вёрстка: стили, колонтитулы, сноски, рецензирование (track changes), формулы OMML.
- `.docx` — документ; `.doc` (до 2003) — бинарный OLE-контейнер (legacy).

**Как хранятся текст и картинки.**
```
document.docx (ZIP)
├── [Content_Types].xml
├── word/document.xml    ← основной текст
├── word/styles.xml
├── word/media/image1.png
└── word/_rels/document.xml.rels
```
Текст — элементы `<w:p>`, `<w:r>`, `<w:t>`; картинки — бинарники в `word/media/`.

**Конвертеры.** Microsoft Word, [LibreOffice](https://www.libreoffice.org/), [Pandoc](https://pandoc.org/), Google Docs.

### ODT (OpenDocument Text)

**Кто придумал.** **OASIS** (2005), развитие формата OpenOffice.org; ISO/IEC 26300. Sun Microsystems активно продвигала открытый стандарт как альтернативу DOCX.

**Устройство** аналогично DOCX: ZIP + `content.xml` + `styles.xml` + `Pictures/`. Конвертеры те же — LibreOffice, Pandoc.

**Интересные связи.** «Форматные войны» 2000-х: Microsoft OOXML vs OpenDocument. В госзакупках ЕС и РФ долгое время требовали ODF. Сегодня DOCX доминирует, ODT — ниша LibreOffice и Linux.

---

## HTML и Markdown (веб-статьи)

### HTML

**Кто придумал.** **Tim Berners-Lee** в CERN, 1991 — HyperText Markup Language как часть World Wide Web.

**Ключевые особенности.**
- Родной формат статей в интернете: блоги, Wikipedia, документация, Substack.
- Reflowable по определению; вёрстка через CSS.
- HTML5: семантические теги (`<article>`, `<section>`), встроенное видео/аудио.

**Как хранятся текст и картинки.**
- Текст — DOM-дерево элементов; символы — UTF-8.
- Картинки — отдельные URL (`<img src="...">`), inline SVG, `<picture>` для responsive, CSS `background-image`.
- Статья на сайте — HTML + CSS + JS; «сохранить как» → `.html` + папка `_files/`.

**Конвертеры.** Браузер (Print → PDF), [Pandoc](https://pandoc.org/), [wget](https://www.gnu.org/software/wget/) / [HTTrack](https://www.httrack.com/) (зеркалирование), [readability](https://github.com/mozilla/readability) (извлечение текста).

### Markdown

**Кто придумал.** **John Gruber** (2004), с участием **Aaron Swartz** (парсер `markdown.pl`).

**Ключевые особенности.**
- Человекочитаемая разметка: `**жирный**`, `[ссылка](url)`, `# заголовок`.
- Исходники статей на GitHub, в Jekyll/Hugo/VAIRL, в научных заметках (Obsidian, Zettelkasten).
- CommonMark — попытка стандартизации; GitHub Flavored Markdown (GFM) — таблицы, чекбоксы.

**Как хранятся картинки.** Ссылки `![alt](path/to/image.png)` — файлы рядом с `.md` или по URL.

**Конвертеры.** [Pandoc](https://pandoc.org/), [Marked](https://marked2app.com/), встроенные движки GitHub/GitLab/Jekyll.

**Интересные связи.** Berners-Lee и Gruber задали два слоя веба: HTML для публикации, Markdown для написания. Aaron Swartz — фигура open access; Markdown стал языком README и блогов программистов.

---

## LaTeX и TeX

**Кто придумал.** **Donald Knuth** создал **TeX** (1978) — после того как издательство испортило вёрстку его *The Art of Computer Programming*. **Leslie Lamport** добавил **LaTeX** (1984) — набор макросов «автор думает о структуре, не о вёрстке».

**Ключевые особенности.**
- Золотой стандарт **научных статей** (arXiv, журналы IEEE/ACM/Springer).
- Алгоритмическая вёрстка: переносы, ссылки, нумерация, библиография (BibTeX/Biber).
- Выход: **PDF** (pdflatex, xelatex, lualatex), DVI, PS.

**Как хранятся текст и картинки.**
- Исходник — `.tex` plain text с командами `\section{}`, `\cite{}`.
- Картинки — внешние PDF, PNG, EPS через `\includegraphics`; рисунки TikZ/PGF — код внутри `.tex`.

**Конвертеры.** TeX Live, MiKTeX, [Pandoc](https://pandoc.org/) (ограниченно), [Overleaf](https://www.overleaf.com/).

**Интересные связи.** Knuth — легенда computer science; TeX — один из немногих программных проектов 1970-х, непрерывно используемых сегодня. Lamport — также автор Paxos и TLA+. arXiv принимает LaTeX напрямую — миллионы препринтов.

---

## RTF (Rich Text Format)

**Кто придумал.** **Microsoft** (1987), основной автор спецификации — **Richard Brodie** (также соавтор Word 1.0).

**Ключевые особенности.**
- Текстовый формат с управляющими группами `{\rtf1\ansi…}` — читается в Блокноте, но с бинарными вставками.
- Задуман для **обмена** между Word, WordPerfect, LibreOffice без потери базового форматирования.
- Поддержка таблиц, шрифтов, вставок OLE.

**Как хранятся картинки.** Встроенные hex-блоки `{\pict\pngblip…}` или WMF.

**Конвертеры.** Word, LibreOffice, Pandoc. Сегодня RTF устаревает в пользу DOCX/ODT.

---

## PostScript (PS и EPS)

**Кто придумал.** Adobe, **John Warnock** и **Chuck Geschke**, 1984. Язык программирования описания страниц: «принтерный файл как программа».

**Ключевые особенности.**
- Стековая модель, операторы рисования текста и графики.
- EPS — Encapsulated PostScript (одна фигура/иллюстрация для вставки в другие документы).
- PDF фактически заменил PS для конечных пользователей; PS остался в полиграфии и старых пайплайнах.

**Конвертеры.** [Ghostscript](https://www.ghostscript.com/) (`ps2pdf`), принтерные драйверы.

---

## CHM (Compiled HTML Help)

**Кто придумал.** **Microsoft**, 1997 — формат справки Windows 98/XP/Visual Studio.

**Ключевые особенности.**
- ITSF-контейнер со сжатым HTML, оглавлением и полнотекстовым поиском.
- `.chm` — один файл справки для программы или SDK.
- На современных Windows и Linux (без IE) открывается с ограничениями; формат legacy.

**Как хранятся данные.** HTML-страницы + `.hhc` (оглавление) + `.hhk` (индекс) + картинки — всё внутри бинарного контейнера. Распаковка: 7-Zip.

**Интересные связи.** Тысячи технических книг и man-страниц 1990–2000-х распространялись как CHM — «библиотека на диске».

---

## CBZ и CBR (комиксы)

**Кто придумал.** Неформальный стандарт сообщества digital comics (~2000-е). **CBZ** = ZIP с JPEG/PNG страниц; **CBR** = RAR; **CB7** = 7z.

**Ключевые особенности.**
- Нет текстового слоя — только изображения страниц по порядку (`001.jpg`, `002.jpg`…).
- `ComicInfo.xml` (опционально) — метаданные серии, номер выпуска.
- Популярен для манги, комиксов Marvel/DC, сканированных журналов.

**Конвертеры.** [Calibre](https://calibre-ebook.com/), ComicRack, MComix, CDisplayEx. CBZ → PDF — сборка страниц в один документ.

---

## Plain text (TXT)

**Кто придумал.** Старше любого стандарта.

**Ключевые особенности.**
- Только символы: ASCII, UTF-8, UTF-16.
- Нет форматирования, нет картинок — максимальная совместимость.
- Gutenberg, Project Runeberg, логи, исходный код, `README`.

**Конвертеры.** Любой редактор; Pandoc оборачивает в любой формат.

---

## XPS (OpenXPS)

**Кто придумал.** **Microsoft**, 2006 — ответ на PDF. Стандартизирован как OpenXPS (ECMA-388).

**Ключевые особенности.**
- ZIP-пакет с XML-разметкой страниц (FixedDocument) — аналог PDF, но слабее распространён.
- Встроен в Windows как «Microsoft Print to PDF/XPS»; вне Windows — MuPDF, GhostXPS.

**Как хранятся данные.** Текст и изображения — в FixedPage XML + ресурсы в `/Resources/`.

---

## Как выбрать формат

| Задача | Лучший выбор |
|--------|--------------|
| Научная статья, неизменная вёрстка | PDF, LaTeX → PDF |
| Скан старой книги для архива | DjVu (размер) или PDF (универсальность) |
| Электронная книга с reflow | EPUB; в русскоязычной среде — FB2 |
| Чтение на Kindle | AZW3/KFX или EPUB (новые Kindle) |
| Редактируемый договор / отчёт | DOCX или ODT |
| Статья в блоге | HTML или Markdown → HTML |
| Комикс / манга | CBZ |
| Максимальная совместимость | Plain text или PDF |

---

## Универсальный конвертер

Для большинства задач хватает связки:

- **[Calibre](https://calibre-ebook.com/)** — ebook-форматы (EPUB, MOBI, FB2, AZW3, CBZ ↔ всё).
- **[Pandoc](https://pandoc.org/)** — разметка и документы (MD, HTML, LaTeX, DOCX, EPUB).
- **[Ghostscript](https://www.ghostscript.com/) + [Poppler](https://poppler.freedesktop.org/)** — PDF ↔ PS, извлечение текста и картинок.
- **[LibreOffice](https://www.libreoffice.org/)** — DOCX ↔ ODT ↔ PDF.
- **[djvulibre](https://djvu.sourceforge.net/)** — DjVu ↔ PDF, создание из сканов.

```bash
# Примеры
calibre ebook-convert book.epub book.fb2
pandoc article.md -o article.pdf
pdftotext paper.pdf paper.txt
djvudigital --words document.pdf document.djvu
```

---

## Источники

- [ISO 32000 (PDF)](https://www.iso.org/standard/75839.html)
- [EPUB 3.3 — W3C](https://www.w3.org/TR/epub-33/)
- [FictionBook 2.0 specification](http://www.fictionbook.org/index.php/Eng:XML_Schema_Fictionbook_2.0)
- [DjVuLibre documentation](https://djvu.sourceforge.net/doc/)
- [ECMA-376 Office Open XML](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/)
- [Donald Knuth — TeX](https://www-cs-faculty.stanford.edu/~knuth/abcde.html)
- [John Warnock — Camelot PDF history (Adobe)](https://www.adobe.com/au/acrobat/about-adobe-pdf.html)
