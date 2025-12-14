import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import logs from './logs';

export const observabilityRouter = new Hono<AppEnv>().route('/logs', logs);
