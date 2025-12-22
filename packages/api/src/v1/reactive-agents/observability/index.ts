import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';
import logs from './logs';

export const observabilityRouter = new Hono<AppEnv>().route('/logs', logs);
