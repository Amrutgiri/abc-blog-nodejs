$(document).ready(function() {
  $('img[data-src]').each(function() {
    const img = $(this);
    img.attr('src', img.data('src')).removeAttr('data-src');
  });
});

(function() {
  const gaId = document.querySelector('meta[name="ga-id"]')?.content || '';
  if (gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }

  const typesetMath = () => {
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== 'function') return;

    const mathRoots = document.querySelectorAll('.post-content');
    if (!mathRoots.length) return;

    window.MathJax.typesetPromise(Array.from(mathRoots)).catch((error) => {
      console.error('MathJax typeset error:', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typesetMath);
  } else {
    typesetMath();
  }

  const forms = document.querySelectorAll('[data-search-autocomplete]');
  if (!forms.length) return;

  const debounce = (fn, delay = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const token = document.querySelector('meta[name="csrf-token"]')?.content || '';

  forms.forEach((form) => {
    const input = form.querySelector('input[name="q"]');
    const box = form.querySelector('.search-suggestions');
    if (!input || !box) return;

    const hide = () => {
      box.innerHTML = '';
      box.classList.remove('show');
    };

    const render = (items) => {
      if (!items.length) {
        hide();
        return;
      }

      box.innerHTML = items.map(item => `
        <a href="/blog/${item.slug}" class="search-suggestion-item">
          ${item.title}
        </a>
      `).join('');
      box.classList.add('show');
    };

    const fetchSuggestions = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        hide();
        return;
      }

      try {
        const response = await fetch(`/search/suggest?q=${encodeURIComponent(q)}`, {
          headers: token ? { 'x-csrf-token': token } : {}
        });
        const data = await response.json();
        render(data.suggestions || []);
      } catch (error) {
        hide();
      }
    }, 180);

    input.addEventListener('input', fetchSuggestions);
    input.addEventListener('blur', () => setTimeout(hide, 150));
    form.addEventListener('submit', hide);
  });
})();
