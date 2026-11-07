import type { APIRoute, GetStaticPaths } from 'astro';
import { feed } from '../../lib/feed';

// Hugo's remaining feed paths, kept for existing subscribers.
const tags = ['c', 'c++', 'llvm', 'mlir'];

export const getStaticPaths = (() => [
  ...['about', 'series', 'tags'].map((feed) => ({ params: { feed }, props: {} })),
  ...tags.map((tag) => ({ params: { feed: `tags/${tag}` }, props: { tag } })),
]) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, props }) => feed(site, props.tag);
