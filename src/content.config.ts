import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { load } from 'js-yaml';

const posts = defineCollection({
  // _drafts/ is never loaded, so unfinished posts and their images stay out of the build.
  // To publish one, move it up a level and remove `draft: true`.
  loader: glob({ pattern: ['**/*.{md,mdx}', '!_drafts/**'], base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const pr = z.object({
  number: z.number(),
  title: z.string(),
  nfc: z.boolean().default(false),
});

const projects = defineCollection({
  loader: file('src/data/open-source.yaml', {
    // The store sorts entries by id, so keep the YAML order explicitly.
    parser: (text) =>
      (load(text) as { projects: Record<string, unknown>[] }).projects.map((project, order) => ({
        ...project,
        order,
      })),
  }),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    repo: z.string(),
    description: z.string(),
    query: z.url(),
    groups: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string().optional(),
        prs: z.array(pr),
      }),
    ),
  }),
});

export const collections = { posts, projects };
