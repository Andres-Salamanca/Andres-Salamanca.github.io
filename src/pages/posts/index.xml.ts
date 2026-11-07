import type { APIRoute } from 'astro';
import { feed } from '../../lib/feed';

// Hugo's feed path, kept for existing subscribers.
export const GET: APIRoute = ({ site }) => feed(site);
