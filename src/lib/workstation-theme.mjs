// Shiki theme built from the mockup palette. Every colour is >= 4.5:1 on both
// the code panel (#0E1621) and the highlighted line (#22344A).
/** @type {import('@astrojs/markdown-remark').ShikiConfig['theme']} */
export const workstation = {
  name: 'workstation',
  type: 'dark',
  colors: { 'editor.background': '#0E1621', 'editor.foreground': '#D6E2EE' },
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#A5B1C4', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { foreground: '#F2B544' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#B9D3A8' } },
    { scope: ['constant', 'constant.numeric', 'constant.language'], settings: { foreground: '#E8B4A0' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#8FB8D8' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: '#E8E2D0' } },
  ],
};
