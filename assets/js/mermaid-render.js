/**
 * Render ```mermaid blocks in .post-content as SVG diagrams.
 */
(function () {
  function transformBlocks() {
    document.querySelectorAll('.post-content pre code.language-mermaid').forEach(function (code) {
      var pre = code.parentElement;
      if (!pre || pre.tagName !== 'PRE') return;
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent.trim();
      pre.replaceWith(div);
    });
  }

  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'neutral';
  }

  function render() {
    if (typeof mermaid === 'undefined' || typeof mermaid.run !== 'function') return false;
    transformBlocks();
    var nodes = document.querySelectorAll('.post-content .mermaid');
    if (!nodes.length) return true;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme(),
      securityLevel: 'loose',
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence: { useMaxWidth: true },
    });
    mermaid.run({ nodes: nodes });
    return true;
  }

  function boot() {
    if (render()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (render() || tries > 40) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
