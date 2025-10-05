'use client';

import { ErrorBoundary } from '@client/components/error-boundary';
import type { ReactElement, ReactNode } from 'react';
import { AgentsProvider } from './agents';
import { AIProviderAPIKeysProvider } from './ai-provider-api-keys';
import { DatasetsProvider } from './datasets';
import { EvaluationRunsProvider } from './evaluation-runs';
import { LogsProvider } from './logs';
import { ModelsProvider } from './models';
import { NavigationProvider } from './navigation';
import { ReactQueryProvider } from './query-client';
import { ArmsProvider } from './skill-optimization-arms';
import { ClustersProvider } from './skill-optimization-clusters';
import { SkillOptimizationEvaluationRunsProvider } from './skill-optimization-evaluation-runs';
import { SkillOptimizationEvaluationsProvider } from './skill-optimization-evaluations';
import { SkillsProvider } from './skills';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composed providers component to reduce nesting in layout files.
 * Wraps all application-level providers in the correct order.
 */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <ReactQueryProvider>
      <ErrorBoundary
        fallback={(error) => (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-2">
                Application Error
              </h1>
              <p className="text-muted-foreground">
                Failed to initialize application providers
              </p>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-left">
                  {error.message}
                </pre>
              </details>
            </div>
          </div>
        )}
      >
        <NavigationProvider>
          <AgentsProvider>
            <SkillsProvider>
              <AIProviderAPIKeysProvider>
                <ModelsProvider>
                  <ClustersProvider>
                    <ArmsProvider>
                      <SkillOptimizationEvaluationRunsProvider>
                        <SkillOptimizationEvaluationsProvider>
                          <LogsProvider>
                            <DatasetsProvider>
                              <EvaluationRunsProvider>
                                {children}
                              </EvaluationRunsProvider>
                            </DatasetsProvider>
                          </LogsProvider>
                        </SkillOptimizationEvaluationsProvider>
                      </SkillOptimizationEvaluationRunsProvider>
                    </ArmsProvider>
                  </ClustersProvider>
                </ModelsProvider>
              </AIProviderAPIKeysProvider>
            </SkillsProvider>
          </AgentsProvider>
        </NavigationProvider>
      </ErrorBoundary>
    </ReactQueryProvider>
  );
}
