import type { ReactiveAgentsRoute } from '@api/v1';
import {
  SystemSettings,
  type SystemSettingsUpdateParams,
} from '@shared/types/data/system-settings';
import { API_URL } from '@web/constants';
import { hc } from 'hono/client';

const client = hc<ReactiveAgentsRoute>(API_URL);

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await client.v1['reactive-agents']['system-settings'].$get();

  if (!response.ok) {
    throw new Error('Failed to fetch system settings');
  }

  return SystemSettings.parse(await response.json());
}

export async function updateSystemSettings(
  update: SystemSettingsUpdateParams,
): Promise<SystemSettings> {
  const response = await client.v1['reactive-agents']['system-settings'].$patch(
    {
      json: update,
    },
  );

  if (!response.ok) {
    throw new Error('Failed to update system settings');
  }

  return SystemSettings.parse(await response.json());
}
