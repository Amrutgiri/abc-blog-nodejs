(function() {
  const mount = document.getElementById('postEditorConfig');
  const form = document.getElementById('postForm');
  const contentField = document.getElementById('content');
  const featuredImageField = document.getElementById('featuredImage');
  const featuredImageFile = document.getElementById('featuredImageFile');
  const featuredImageButton = document.getElementById('uploadFeaturedImage');
  const featuredImagePreview = document.getElementById('featuredImagePreview');
  const featuredImageStatus = document.getElementById('featuredImageStatus');

  if (!mount || !form || !contentField || typeof EditorJS === 'undefined') {
    return;
  }

  const parseData = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (error) {
      return null;
    }
  };

  const emptyContent = {
    time: Date.now(),
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: ''
        }
      }
    ],
    version: '2.28.0'
  };

  const existingContent = parseData(mount.dataset.existing);
  const csrfToken = mount.dataset.csrf || '';
  const initialContent = existingContent && Array.isArray(existingContent.blocks) && existingContent.blocks.length > 0
    ? existingContent
    : emptyContent;
  contentField.value = JSON.stringify(initialContent);

  const setFeaturedImagePreview = (url) => {
    if (!featuredImagePreview) return;
    featuredImagePreview.src = url || '/images/placeholder.jpg';
    featuredImagePreview.style.display = 'block';
  };

  const setFeaturedImageStatus = (message, isError) => {
    if (!featuredImageStatus) return;
    featuredImageStatus.textContent = message;
    featuredImageStatus.classList.toggle('text-danger', Boolean(isError));
    featuredImageStatus.classList.toggle('text-muted', !isError);
  };

  const uploadFeaturedImage = async (file) => {
    if (!file) {
      setFeaturedImageStatus('Please choose an image first.', true);
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setFeaturedImageStatus('Uploading to Cloudinary...');
    if (featuredImageButton) featuredImageButton.disabled = true;

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: csrfToken ? {
          'x-csrf-token': csrfToken
        } : {},
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data || data.success !== 1 || !data.file?.url) {
        throw new Error(data?.message || 'Upload failed');
      }

      if (featuredImageField) {
        featuredImageField.value = data.file.url;
      }
      setFeaturedImagePreview(data.file.url);
      setFeaturedImageStatus('Image uploaded successfully.');
    } catch (error) {
      console.error('Featured image upload error:', error);
      setFeaturedImageStatus(error.message || 'Upload failed.', true);
    } finally {
      if (featuredImageButton) featuredImageButton.disabled = false;
    }
  };

  if (featuredImagePreview && featuredImageField && featuredImageField.value) {
    setFeaturedImagePreview(featuredImageField.value);
  }

  if (featuredImageFile) {
    featuredImageFile.addEventListener('change', function() {
      const file = featuredImageFile.files && featuredImageFile.files[0];
      if (file) {
        uploadFeaturedImage(file);
      }
    });
  }

  if (featuredImageButton) {
    featuredImageButton.addEventListener('click', function() {
      const file = featuredImageFile && featuredImageFile.files && featuredImageFile.files[0];
      uploadFeaturedImage(file);
    });
  }

  const editor = new EditorJS({
    holder: 'editorjs',
    data: initialContent,
    placeholder: 'Start writing your post content here...',
    tools: {
      header: {
        class: Header,
        config: {
          placeholder: 'Enter header',
          levels: [2, 3, 4],
          defaultLevel: 2
        }
      },
      list: {
        class: List,
        inlineToolbar: true
      },
      code: CodeTool,
      quote: Quote,
    image: {
        class: ImageTool,
        config: {
          endpoints: {
            byFile: '/api/upload'
          },
          additionalRequestHeaders: csrfToken ? {
            'x-csrf-token': csrfToken
          } : {}
        }
      }
    },
    onReady: function() {
      contentField.value = JSON.stringify(initialContent);
    },
    onChange: function() {
      editor.save().then(function(data) {
        contentField.value = JSON.stringify(data);
      });
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    editor.save().then(function(data) {
      contentField.value = JSON.stringify(data);
      if (window.ABCFormValidation && !window.ABCFormValidation.validateForm(form)) {
        return;
      }
      form.dataset.skipClientValidation = 'true';
      HTMLFormElement.prototype.submit.call(form);
      delete form.dataset.skipClientValidation;
    }).catch(function(error) {
      console.error('Editor save error:', error);
      if (window.ABCFormValidation && !window.ABCFormValidation.validateForm(form)) {
        return;
      }
      form.dataset.skipClientValidation = 'true';
      HTMLFormElement.prototype.submit.call(form);
      delete form.dataset.skipClientValidation;
    });
  });
})();
