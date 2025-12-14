import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { loginRouter } from './login';
import { logoutRouter } from './logout';

export const authRouter = new Hono<AppEnv>()
  .route('/login', loginRouter)
  .route('/logout', logoutRouter);
