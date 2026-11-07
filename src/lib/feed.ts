import rss from '@astrojs/rss';
import { SITE } from './site';
import { getPosts } from './stats';

export async function feed(site: URL | undefined, tag?: string) {
  const posts = await getPosts();
  const items = tag
    ? posts.filter((p) => p.data.tags.some((t) => t.toLowerCase() === tag))
    : posts;
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: site!,
    trailingSlash: true,
    items: items.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
  });
}
