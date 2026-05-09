(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

  async function uploadImage(file, widget) {
    const status = widget.querySelector('[data-upload-status]') || widget.querySelector(widget.dataset.status || '');
    const target = widget.querySelector(widget.dataset.target) || document.querySelector(widget.dataset.target);
    const preview = widget.querySelector(widget.dataset.preview) || document.querySelector(widget.dataset.preview);
    const button = widget.querySelector('[data-upload-button]');
    const fileInput = widget.querySelector('[data-upload-file]');

    if (!file) {
      if (status) status.textContent = 'Please choose an image first.';
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    if (status) {
      status.textContent = 'Uploading to Cloudinary...';
      status.classList.remove('text-danger');
      status.classList.add('text-muted');
    }
    if (button) button.disabled = true;
    if (fileInput) fileInput.disabled = true;

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data || data.success !== 1 || !data.file?.url) {
        throw new Error(data?.message || 'Upload failed');
      }

      if (target) {
        target.value = data.file.url;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (preview) {
        preview.src = data.file.url;
      }
      if (status) {
        status.textContent = 'Image uploaded successfully.';
      }
    } catch (error) {
      if (status) {
        status.textContent = error.message || 'Upload failed.';
        status.classList.add('text-danger');
      }
    } finally {
      if (button) button.disabled = false;
      if (fileInput) fileInput.disabled = false;
    }
  }

  function initWidget(widget) {
    if (!widget || widget.dataset.initialized === 'true') return;
    widget.dataset.initialized = 'true';

    const fileInput = widget.querySelector('[data-upload-file]');
    const button = widget.querySelector('[data-upload-button]');
    const target = widget.querySelector(widget.dataset.target) || document.querySelector(widget.dataset.target);
    const preview = widget.querySelector(widget.dataset.preview) || document.querySelector(widget.dataset.preview);

    if (fileInput) {
      fileInput.addEventListener('change', function() {
        const file = fileInput.files && fileInput.files[0];
        if (file) {
          uploadImage(file, widget);
        }
      });
    }

    if (target && preview) {
      target.addEventListener('input', function() {
        const value = String(target.value || '').trim();
        if (value) {
          preview.src = value;
        }
      });
    }

    if (button) {
      button.addEventListener('click', function() {
        const file = fileInput && fileInput.files && fileInput.files[0];
        uploadImage(file, widget);
      });
    }
  }

  document.querySelectorAll('[data-cloudinary-upload-widget]').forEach(initWidget);
})();
