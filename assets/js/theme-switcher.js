// Theme switcher — light / dark via data-theme on <html>
(function () {
    var STORAGE_KEY = 'theme';

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function getStoredTheme() {
        var stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'dark' || stored === 'light' ? stored : null;
    }

    function getTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    function updateToggleButton(theme) {
        var btn = document.querySelector('.theme-toggle');
        if (!btn) return;

        var isDark = theme === 'dark';
        var label = btn.querySelector('.theme-toggle-label');
        if (label) {
            label.textContent = isDark ? 'Light' : 'Dark';
        }
        btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        btn.setAttribute('title', isDark ? 'Light theme' : 'Dark theme');
        btn.classList.toggle('is-dark', isDark);
    }

    function init() {
        var theme = getTheme();
        applyTheme(theme);
        updateToggleButton(theme);
    }

    window.switchTheme = function (theme) {
        if (theme !== 'light' && theme !== 'dark') return;
        applyTheme(theme);
        updateToggleButton(theme);
    };

    window.toggleTheme = function () {
        var next = getTheme() === 'dark' ? 'light' : 'dark';
        switchTheme(next);
    };

    window.getCurrentTheme = getTheme;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStoredTheme()) {
            var theme = e.matches ? 'dark' : 'light';
            applyTheme(theme);
            updateToggleButton(theme);
        }
    });
})();
