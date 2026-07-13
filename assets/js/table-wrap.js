/**
 * Wrap GFM tables in .table-wrap for horizontal scroll without breaking column alignment.
 */
(function () {
  function wrapTables(root) {
    root.querySelectorAll('table').forEach(function (table) {
      if (table.closest('.table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function boot() {
    document.querySelectorAll('.post-content').forEach(wrapTables);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
