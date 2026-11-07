export const SITE = {
  name: 'Andres Salamanca',
  description: 'A space where I share my experiments and learnings in systems programming.',
  email: 'kiandrewsala@gmail.com',
  github: 'https://github.com/Andres-Salamanca',
  linkedin: 'https://www.linkedin.com/in/salamanca-andres/',
};

export const prUrl = (repo: string, number: number) => `https://github.com/${repo}/pull/${number}`;

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'America/Bogota',
});
export const formatDate = (date: Date) => dateFormat.format(date);
export const formatTags = (tags: string[]) => tags.map((t) => `#${t.toLowerCase()}`).join(' ');
export const readingTime = (body = '') =>
  Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
