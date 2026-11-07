// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { codeMeta } from './src/lib/shiki-transformers.mjs';
import { workstation } from './src/lib/workstation-theme.mjs';

export default defineConfig({
  // For a custom domain, change `site` and add public/CNAME.
  site: 'https://andres-salamanca.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: workstation,
      transformers: [codeMeta()],
      // Shiki ships no MLIR grammar; LLVM's is the closest match.
      langAlias: { mlir: 'llvm' },
    },
  },
  // Old Hugo URLs, kept so existing links don't break.
  redirects: {
    '/about/': '/',
    '/llvm/': '/open-source/',
    '/page/1/': '/',
    '/posts/page/1/': '/posts/',
    '/series/': '/posts/',
    '/tags/': '/posts/',
    '/tags/c/': '/posts/',
    '/tags/c++/': '/posts/',
    '/tags/llvm/': '/posts/',
    '/tags/mlir/': '/posts/',
  },
});
