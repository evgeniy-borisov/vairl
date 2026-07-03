/**
 * Render LaTeX in blog post content via KaTeX auto-render.
 * Delimiters: $$ … $$, \[ … \], $ … $, \( … \)
 */
(function () {
  function renderPostMath() {
    var root = document.querySelector('.post-content');
    if (!root || typeof renderMathInElement !== 'function') return;

    renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    });
  }

  function boot() {
    if (typeof renderMathInElement === 'function') {
      renderPostMath();
      return;
    }
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (typeof renderMathInElement === 'function') {
        clearInterval(timer);
        renderPostMath();
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
