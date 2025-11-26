'use client';

import {
  SettingsErrorBoundary,
  SystemSettingsView,
} from '@client/components/settings';
import { AIProvidersProvider } from '@client/providers/ai-providers';
import { ModelsProvider } from '@client/providers/models';
import { SystemSettingsProvider } from '@client/providers/system-settings';
import type { ReactElement } from 'react';

export default function SettingsPage(): ReactElement {
  return (
    <SettingsErrorBoundary>
      <AIProvidersProvider>
        <ModelsProvider>
          <SystemSettingsProvider>
            <SystemSettingsView />
          </SystemSettingsProvider>
        </ModelsProvider>
      </AIProvidersProvider>
    </SettingsErrorBoundary>
  );
}
