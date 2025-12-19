'use client';

import { createLazyFileRoute } from '@tanstack/react-router';
import { SystemSettingsView } from '@web/components/settings/system-settings-view';

export const Route = createLazyFileRoute('/_main/settings')({
  component: SystemSettingsView,
});
