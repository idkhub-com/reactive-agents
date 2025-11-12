import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { logoutRouter } from './logout';

export const authRouter = new Hono<AppEnv>().route('/logout', logoutRouter);
