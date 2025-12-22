import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';
import { completionsRouter } from './completions';

export const chatRouter = new Hono<AppEnv>().route(
  '/completions',
  completionsRouter,
);
