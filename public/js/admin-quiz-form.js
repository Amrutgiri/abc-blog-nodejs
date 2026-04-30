(function() {
  const list = document.getElementById('quizQuestionsList');
  const addButton = document.getElementById('addQuizQuestion');
  if (!list || !addButton) return;

  function questionTemplate(index) {
    return `
      <div class="quiz-question-editor card border mb-3" data-index="${index}">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <strong>Question ${index + 1}</strong>
          <button type="button" class="btn btn-sm btn-outline-danger remove-quiz-question">Remove</button>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Question</label>
            <textarea class="form-control" name="questions[${index}][question]" rows="3" required></textarea>
          </div>
          <div class="row g-3">
            ${Array.from({ length: 4 }).map((_, optionIndex) => `
              <div class="col-md-6">
                <label class="form-label">Option ${optionIndex + 1}</label>
                <input type="text" class="form-control" name="questions[${index}][options][]" value="" required>
              </div>
            `).join('')}
          </div>
          <div class="row g-3 mt-1">
            <div class="col-md-6">
              <label class="form-label">Correct Answer</label>
              <input type="text" class="form-control" name="questions[${index}][correctAnswer]" value="" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Explanation</label>
              <input type="text" class="form-control" name="questions[${index}][explanation]" value="">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function refreshLabels() {
    [...list.querySelectorAll('.quiz-question-editor')].forEach((card, index) => {
      card.dataset.index = String(index);
      const label = card.querySelector('.card-header strong');
      if (label) label.textContent = `Question ${index + 1}`;
      card.querySelectorAll('[name]').forEach((field) => {
        field.name = field.name.replace(/questions\[\d+\]/, `questions[${index}]`);
      });
    });
  }

  addButton.addEventListener('click', () => {
    const index = list.querySelectorAll('.quiz-question-editor').length;
    list.insertAdjacentHTML('beforeend', questionTemplate(index));
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('.remove-quiz-question');
    if (!button) return;
    const card = button.closest('.quiz-question-editor');
    if (card) {
      card.remove();
      refreshLabels();
    }
  });
})();
