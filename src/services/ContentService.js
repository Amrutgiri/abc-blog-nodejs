const xss = require('xss');

function normalizeContent(content) {
  if (!content) return { blocks: [] };
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (error) {
      return { blocks: [] };
    }
  }
  return content;
}

function extractPlainText(content) {
  const data = normalizeContent(content);
  const parts = [];

  for (const block of data.blocks || []) {
    if (!block || !block.data) continue;
    if (block.type === 'paragraph' || block.type === 'header' || block.type === 'quote') {
      parts.push(block.data.text || '');
    } else if (block.type === 'list' && Array.isArray(block.data.items)) {
      parts.push(block.data.items.join(' '));
    } else if (block.type === 'code') {
      parts.push(block.data.code || '');
    }
  }

  return xss(parts.join(' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function calculateReadingTime(content) {
  const text = extractPlainText(content);
  const wordCount = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function buildToc(content) {
  const data = normalizeContent(content);
  const toc = [];

  for (const block of data.blocks || []) {
    if (block?.type === 'header' && block.data?.text) {
      const level = Number(block.data.level || 2);
      if (level >= 2 && level <= 4) {
        const text = String(block.data.text).replace(/<[^>]*>/g, '');
        toc.push({
          level,
          text,
          slug: text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        });
      }
    }
  }

  return toc;
}

function summarizeText(text, maxLength = 160) {
  const clean = xss(String(text || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength).trim()}...`;
}

function sanitizeEditorContent(content) {
  const data = normalizeContent(content);
  return {
    ...data,
    blocks: (data.blocks || []).map(block => {
      if (!block || !block.data) return block;
      const next = { ...block, data: { ...block.data } };

      if (typeof next.data.text === 'string') {
        next.data.text = xss(next.data.text);
      }
      if (typeof next.data.caption === 'string') {
        next.data.caption = xss(next.data.caption);
      }
      if (typeof next.data.code === 'string') {
        next.data.code = xss(next.data.code);
      }
      if (Array.isArray(next.data.items)) {
        next.data.items = next.data.items.map(item => xss(String(item)));
      }
      return next;
    })
  };
}

module.exports = {
  normalizeContent,
  extractPlainText,
  calculateReadingTime,
  buildToc,
  summarizeText,
  sanitizeEditorContent
};
