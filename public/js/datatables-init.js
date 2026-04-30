(function() {
  function initDataTables() {
    if (!window.jQuery || !jQuery.fn || typeof jQuery.fn.DataTable !== 'function') {
      return;
    }

    const tables = document.querySelectorAll('table[data-datatable="true"]');
    tables.forEach((table) => {
      if (table.dataset.datatableInitialized === 'true') return;
      if (table.tBodies.length === 0 || table.tBodies[0].rows.length === 0) return;
      if (table.querySelector('tbody td[colspan], tbody th[colspan], tbody td[rowspan], tbody th[rowspan]')) return;

      const paging = table.dataset.datatablePaging !== 'false';
      const searching = table.dataset.datatableSearching !== 'false';
      const ordering = table.dataset.datatableOrdering !== 'false';

      jQuery(table).DataTable({
        pageLength: Number(table.dataset.datatablePageLength || 10),
        lengthChange: paging,
        paging,
        ordering,
        searching,
        info: true,
        autoWidth: false,
        language: {
          search: 'Filter:',
          emptyTable: 'No records available'
        }
      });

      table.dataset.datatableInitialized = 'true';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDataTables);
  } else {
    initDataTables();
  }
})();
