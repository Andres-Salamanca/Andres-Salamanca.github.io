// Code-fence meta, migrated from Hugo's `highlight` shortcode:
//   ```cpp startLine=374 hl="1-2 4" title="path/to/file.h"
// `hl` is relative to the first line of the block, as hl_lines was in Hugo.
function parseRanges(value) {
  const lines = new Set();
  for (const part of value.trim().split(/\s+/)) {
    const [from, to = from] = part.split('-').map(Number);
    for (let n = from; n <= to; n++) lines.add(n);
  }
  return lines;
}

const addClass = (node, name) => {
  const current = node.properties.class;
  node.properties.class = current ? `${current} ${name}` : name;
};

const text = (value) => ({ type: 'text', value });
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

export function codeMeta() {
  return {
    name: 'code-meta',
    preprocess(_code, options) {
      const raw = options.meta?.__raw ?? '';
      this.codeMeta = {
        startLine: raw.match(/startLine=(\d+)/)?.[1],
        hl: parseRanges(raw.match(/hl="([^"]*)"/)?.[1] ?? ''),
        title: raw.match(/title="([^"]*)"/)?.[1],
        lang: options.lang,
      };
    },
    pre(node) {
      const { startLine } = this.codeMeta;
      if (startLine !== undefined) {
        addClass(node, 'numbered');
        node.properties.style = `${node.properties.style ?? ''};--line-start:${Number(startLine) - 1}`;
      }
    },
    line(node, line) {
      if (this.codeMeta.hl.has(line)) addClass(node, 'hl');
    },
    root(node) {
      const { title, lang } = this.codeMeta;
      const caption = el('figcaption', {}, [
        el('span', {}, [text(title ?? '')]),
        el('span', {}, [text(lang)]),
      ]);
      node.children = [el('figure', { class: 'code' }, [caption, ...node.children])];
    },
  };
}
