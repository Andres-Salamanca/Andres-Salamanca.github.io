import { getCollection, type CollectionEntry } from 'astro:content';

/** Published posts, newest first. Drafts never reach pages, feeds or counts. */
export async function getPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Open-source projects in YAML order. open-source.yaml is the only source for every PR count. */
export async function getProjects() {
  const projects = await getCollection('projects');
  return projects.sort((a, b) => a.data.order - b.data.order);
}

export const countPrs = (project: CollectionEntry<'projects'>) =>
  project.data.groups.reduce((total, group) => total + group.prs.length, 0);

export async function getStats() {
  const [posts, projects] = await Promise.all([getPosts(), getProjects()]);
  return {
    posts: posts.length,
    projects: projects.length,
    areas: projects.reduce((total, p) => total + p.data.groups.length, 0),
    prs: projects.reduce((total, p) => total + countPrs(p), 0),
  };
}
