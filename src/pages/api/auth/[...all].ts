import { auth } from '../../../lib/server/auth';
import type { APIRoute } from 'astro';

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  return auth.handler(ctx.request);
};
