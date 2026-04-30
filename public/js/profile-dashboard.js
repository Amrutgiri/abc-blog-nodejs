(function() {
  const canvas = document.getElementById('profileProgressChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const attemptLabels = JSON.parse(decodeURIComponent(canvas.dataset.attemptLabels || '[]'));
  const attemptValues = JSON.parse(decodeURIComponent(canvas.dataset.attemptValues || '[]'));
  const scoreLabels = JSON.parse(decodeURIComponent(canvas.dataset.scoreLabels || '[]'));
  const scoreValues = JSON.parse(decodeURIComponent(canvas.dataset.scoreValues || '[]'));

  new Chart(canvas, {
    data: {
      labels: attemptLabels,
      datasets: [
        {
          type: 'bar',
          label: 'Attempts',
          data: attemptValues,
          backgroundColor: 'rgba(29, 102, 85, 0.22)',
          borderColor: '#1D6655'
        },
        {
          type: 'line',
          label: 'Score',
          data: scoreValues,
          borderColor: '#E67E22',
          backgroundColor: 'rgba(230, 126, 34, 0.12)',
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
})();
