(function() {
  const canvas = document.getElementById('viewsChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = JSON.parse(decodeURIComponent(canvas.dataset.labels || '[]'));
  const values = JSON.parse(decodeURIComponent(canvas.dataset.values || '[]'));

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Views',
        data: values,
        borderColor: '#1D6655',
        backgroundColor: 'rgba(29, 102, 85, 0.15)',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
})();
