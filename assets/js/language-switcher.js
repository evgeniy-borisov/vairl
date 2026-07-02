// Language switcher — client-side UI i18n + blog/post navigation
(function () {
    var STORAGE_KEY = 'language';
    var currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

    var translations = {
        en: {
            tagline: 'Virtual AI Research Lab',
            description_1: 'We are building a world class AI research lab.',
            description_2: 'We want to develop AI solutions and democratize AI research.',
            more_info: 'For more information, please visit our',
            blog: 'blog',
            home: 'home',
            read_more: 'read more',
            back_to_blog: '← back to blog'
        },
        ru: {
            tagline: 'Виртуальная лаборатория исследований ИИ',
            description_1: 'Мы создаём исследовательскую лабораторию искусственного интеллекта мирового класса.',
            description_2: 'Мы хотим разрабатывать решения в области ИИ и демократизировать исследования искусственного интеллекта.',
            more_info: 'Для получения дополнительной информации посетите наш',
            blog: 'блог',
            home: 'главная',
            read_more: 'читать далее',
            back_to_blog: '← вернуться к блогу'
        }
    };

    function applyLanguage(lang) {
        var t = translations[lang];
        if (!t) return;

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        document.documentElement.lang = lang;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
    }

    function updateSwitcher(lang) {
        document.querySelectorAll('.lang-switch').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    function updateBlogLanguage(lang) {
        var enList = document.getElementById('blog-list-en');
        var ruList = document.getElementById('blog-list-ru');

        if (enList && ruList) {
            enList.style.display = lang === 'ru' ? 'none' : 'block';
            ruList.style.display = lang === 'ru' ? 'block' : 'none';
        }
    }

    function getPostI18nData() {
        var el = document.getElementById('post-i18n-data');
        if (!el) return null;
        try {
            return JSON.parse(el.textContent);
        } catch (e) {
            return null;
        }
    }

    function handlePostLanguageRedirect(lang) {
        var data = getPostI18nData();
        if (!data) return false;

        if (lang === data.currentLang) return false;

        var targetUrl = data.urls && data.urls[lang];
        if (targetUrl) {
            localStorage.setItem(STORAGE_KEY, lang);
            window.location.href = targetUrl;
            return true;
        }

        return false;
    }

    function init() {
        applyLanguage(currentLang);
        updateSwitcher(currentLang);
        updateBlogLanguage(currentLang);
    }

    window.switchLanguage = function (lang) {
        if (handlePostLanguageRedirect(lang)) return;

        applyLanguage(lang);
        updateSwitcher(lang);
        updateBlogLanguage(lang);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
