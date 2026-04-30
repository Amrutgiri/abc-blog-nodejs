(function() {
  const escapeSelector = window.CSS && typeof window.CSS.escape === 'function'
    ? window.CSS.escape.bind(window.CSS)
    : (value) => String(value).replace(/["\\]/g, '\\$&');

  function getFieldLabel(field) {
    if (!field) return 'This field';
    if (field.dataset.label) return field.dataset.label;
    if (field.id) {
      const label = document.querySelector(`label[for="${escapeSelector(field.id)}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }
    return field.name || 'This field';
  }

  function clearCustomValidity(field) {
    if (!field || typeof field.setCustomValidity !== 'function') return;
    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
  }

  function markInvalid(field, message) {
    if (!field || typeof field.setCustomValidity !== 'function') return false;
    field.setCustomValidity(message);
    field.setAttribute('aria-invalid', 'true');
    return false;
  }

  function validateMatchField(field) {
    if (!field || !field.dataset.match) return true;
    const target = field.form && field.form.querySelector(field.dataset.match);
    if (!target) return true;

    if (field.value !== target.value) {
      return markInvalid(field, field.dataset.matchMessage || `${getFieldLabel(field)} must match ${getFieldLabel(target)}.`);
    }

    clearCustomValidity(field);
    return true;
  }

  function validateJsonField(field) {
    if (!field || !field.dataset.validateJson) return true;
    const raw = String(field.value || '').trim();

    if (!raw) {
      clearCustomValidity(field);
      return true;
    }

    try {
      JSON.parse(raw);
      clearCustomValidity(field);
      return true;
    } catch (error) {
      return markInvalid(field, field.dataset.jsonMessage || `${getFieldLabel(field)} must contain valid JSON.`);
    }
  }

  function hasEditorContent(blocks) {
    return blocks.some((block) => {
      if (!block || !block.type || !block.data) return false;
      if (block.type === 'paragraph' || block.type === 'header' || block.type === 'quote') {
        return Boolean(String(block.data.text || '').trim());
      }
      if (block.type === 'code') {
        return Boolean(String(block.data.code || '').trim());
      }
      if (block.type === 'list' && Array.isArray(block.data.items)) {
        return block.data.items.some((item) => Boolean(String(item || '').trim()));
      }
      if (block.type === 'image') {
        return Boolean(String(block.data.file?.url || block.data.url || '').trim());
      }
      return true;
    });
  }

  function validateEditorContentField(field) {
    if (!field || !field.dataset.validateEditorContent) return true;
    const raw = String(field.value || '').trim();
    if (!raw) {
      return markInvalid(field, field.dataset.editorMessage || 'Please add some post content.');
    }

    try {
      const data = JSON.parse(raw);
      const blocks = Array.isArray(data.blocks) ? data.blocks : [];
      if (!blocks.length || !hasEditorContent(blocks)) {
        return markInvalid(field, field.dataset.editorMessage || 'Please add some post content.');
      }
      clearCustomValidity(field);
      return true;
    } catch (error) {
      return markInvalid(field, field.dataset.editorMessage || 'Please add valid post content.');
    }
  }

  function validateQuizAttempt(form) {
    if (!form || form.id !== 'quizAttemptForm') return true;

    const names = [...new Set(Array.from(form.querySelectorAll('input[type="radio"][name^="answers["]')).map((input) => input.name))];
    let valid = true;

    names.forEach((name) => {
      const options = Array.from(form.querySelectorAll(`input[name="${escapeSelector(name)}"]`));
      if (!options.length) return;
      const checked = options.some((input) => input.checked);
      if (!checked) {
        valid = false;
        markInvalid(options[0], 'Please choose an answer for every question.');
      } else {
        options.forEach(clearCustomValidity);
      }
    });

    return valid;
  }

  function validateForm(form) {
    if (!form) return true;

    let valid = true;

    const fields = Array.from(form.elements || []);
    fields.forEach((field) => {
      if (!field || !field.name || field.disabled) return;
      if (field.type === 'hidden' && !field.dataset.validateEditorContent && !field.dataset.validateJson && !field.dataset.match) return;

      if (!validateMatchField(field)) valid = false;
      if (!validateJsonField(field)) valid = false;
      if (!validateEditorContentField(field)) valid = false;
    });

    if (!validateQuizAttempt(form)) {
      valid = false;
    }

    if (!valid) {
      form.classList.add('was-validated');
    }

    return valid && form.checkValidity();
  }

  function onFieldInput(event) {
    const field = event.target;
    if (!field || !field.form) return;

    if (field.dataset.match) {
      validateMatchField(field);
    }

    if (field.dataset.validateJson) {
      validateJsonField(field);
    }

    if (field.dataset.validateEditorContent) {
      validateEditorContentField(field);
    }

    if (field.dataset.match) {
      const target = field.form.querySelector(field.dataset.match);
      if (target) {
        clearCustomValidity(target);
      }
    }

    if (field.id) {
      const selector = `[data-match="#${escapeSelector(field.id)}"]`;
      field.form.querySelectorAll(selector).forEach((matchField) => {
        validateMatchField(matchField);
      });
    }
  }

  function initForm(form) {
    if (!form || form.dataset.clientValidationInitialized === 'true') return;
    form.dataset.clientValidationInitialized = 'true';

    form.addEventListener('submit', function(event) {
      if (form.dataset.skipClientValidation === 'true') {
        return;
      }

      if (!validateForm(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        form.reportValidity();
      }
    }, true);

    form.addEventListener('input', onFieldInput, true);
    form.addEventListener('change', onFieldInput, true);
  }

  function boot() {
    document.querySelectorAll('form').forEach(initForm);
  }

  window.ABCFormValidation = {
    validateForm,
    validateMatchField,
    validateJsonField,
    validateEditorContentField,
    clearCustomValidity
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
