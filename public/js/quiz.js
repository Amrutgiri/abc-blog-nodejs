(function() {
  const form = document.getElementById('quizAttemptForm');
  const timerEl = document.getElementById('quizTimer');
  const progressBar = document.getElementById('quizProgressBar');
  const answeredCount = document.getElementById('answeredCount');
  const questionCount = document.getElementById('questionCount');
  const startedAtField = document.getElementById('startedAt');

  if (!form || !timerEl) {
    return;
  }

  const data = form.dataset || {};
  const answersKey = `abc-quiz-${data.slug}-answers`;
  const startedKey = `abc-quiz-${data.slug}-startedAt`;
  const totalQuestions = Number(data.totalQuestions || 0);
  const durationSeconds = Number(data.durationSeconds || 0);
  const existingStartedAt = Number(localStorage.getItem(startedKey) || data.startedAt || Date.now());

  startedAtField.value = String(existingStartedAt);
  if (!localStorage.getItem(startedKey)) {
    localStorage.setItem(startedKey, String(existingStartedAt));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }

  function loadAnswers() {
    try {
      return JSON.parse(localStorage.getItem(answersKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveAnswers(map) {
    localStorage.setItem(answersKey, JSON.stringify(map));
  }

  function updateProgress() {
    const checked = form.querySelectorAll('input[type="radio"]:checked').length;
    const percent = totalQuestions ? Math.round((checked / totalQuestions) * 100) : 0;
    answeredCount.textContent = String(checked);
    questionCount.textContent = String(percent);
    progressBar.style.width = `${percent}%`;
  }

  function syncLowTime(isLow) {
    timerEl.classList.toggle('is-low', isLow);
  }

  function restoreAnswers() {
    const saved = loadAnswers();
    Object.entries(saved).forEach(([questionId, answer]) => {
      const inputs = form.querySelectorAll(`input[name="answers[${questionId}]"]`);
      const input = Array.from(inputs).find((item) => item.value === answer);
      if (input) {
        input.checked = true;
      }
    });
    updateProgress();
  }

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (!target.matches('input[type="radio"]')) return;
    const saved = loadAnswers();
    const match = target.name.match(/^answers\[(.+)\]$/);
    if (match) {
      saved[match[1]] = target.value;
      saveAnswers(saved);
      updateProgress();
    }
  });

  form.addEventListener('submit', () => {
    localStorage.removeItem(answersKey);
    localStorage.removeItem(startedKey);
  });

  restoreAnswers();

  let intervalId;

  const tick = () => {
    const elapsed = Math.floor((Date.now() - existingStartedAt) / 1000);
    const remaining = durationSeconds - elapsed;
    timerEl.textContent = formatTime(remaining);
    syncLowTime(remaining <= 60);

    if (remaining <= 0) {
      timerEl.textContent = '00:00';
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }
      clearInterval(intervalId);
      form.requestSubmit();
      return;
    }
  };

  intervalId = window.setInterval(tick, 1000);
  tick();
})();
