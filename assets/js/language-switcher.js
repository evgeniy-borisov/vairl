// Language switcher
(function() {
    // Get current language from localStorage or default to 'en'
    let currentLang = localStorage.getItem('language') || 'en';
    
    // Apply language on page load
    document.addEventListener('DOMContentLoaded', function() {
        applyLanguage(currentLang);
        updateSwitcher(currentLang);
        updateBlogLanguage(currentLang);
    });
    
    // Language data
    const translations = {
        en: {
            tagline: "Virtual AI Research Lab",
            description_1: "We are building a world class AI research lab.",
            description_2: "We want to develop AI solutions and democratize AI research.",
            more_info: "For more information, please visit our",
            blog: "blog",
            home: "home",
            read_more: "read more",
            back_to_blog: "← back to blog"
        },
        ru: {
            tagline: "Виртуальная лаборатория исследований ИИ",
            description_1: "Мы создаём исследовательскую лабораторию искусственного интеллекта мирового класса.",
            description_2: "Мы хотим разрабатывать решения в области ИИ и демократизировать исследования искусственного интеллекта.",
            more_info: "Для получения дополнительной информации посетите наш",
            blog: "блог",
            home: "главная",
            read_more: "читать далее",
            back_to_blog: "← вернуться к блогу"
        }
    };
    
    function applyLanguage(lang) {
        const t = translations[lang];
        if (!t) return;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.textContent = t[key];
            }
        });
        
        currentLang = lang;
        localStorage.setItem('language', lang);
    }
    
    function updateSwitcher(lang) {
        document.querySelectorAll('.lang-switch').forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    function updateBlogLanguage(lang) {
        const enList = document.getElementById('blog-list-en');
        const ruList = document.getElementById('blog-list-ru');
        
        if (enList && ruList) {
            if (lang === 'ru') {
                enList.style.display = 'none';
                ruList.style.display = 'block';
            } else {
                enList.style.display = 'block';
                ruList.style.display = 'none';
            }
        }
    }
    
    // Setup language switcher buttons
    window.switchLanguage = function(lang) {
        applyLanguage(lang);
        updateSwitcher(lang);
        updateBlogLanguage(lang);
    };
})();

