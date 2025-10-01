'use client';

import { useNavigationPerformance } from '@client/hooks/use-navigation-performance';
import { useNavigation } from '@client/providers/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { AgentErrorBoundary } from './agent-error-boundary';
import { EditSkillView, SkillDashboardView, SkillsListView } from './skills';
import { ClustersView } from './skills/clusters/clusters-view';
import { DatasetDetailsView } from './skills/datasets';
import { CreateDatasetView } from './skills/datasets/create-dataset-view';
import { DatasetsView } from './skills/datasets/datasets-view';
import { CreateEvaluationRunView } from './skills/evaluation-runs/create-evaluation-run-view';
import { EvaluationRunDetailsView } from './skills/evaluation-runs/evaluation-run-details-view';
import { EvaluationRunsView } from './skills/evaluation-runs/evaluation-runs-view';
import { LogDetailsView, LogsView } from './skills/logs';
import { ModelsView } from './skills/models/models-view';

export function AgentsView(): ReactElement {
  const { navigationState } = useNavigation();
  const { currentMetric, getPerformanceReport } = useNavigationPerformance();

  // Log performance metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && currentMetric) {
      const report = getPerformanceReport();
      if (report && report.averageLoadTime > 500) {
        console.info('Navigation Performance:', {
          currentRoute: report.currentRoute,
          loadTime: currentMetric.loadTime
            ? `${currentMetric.loadTime.toFixed(2)}ms`
            : 'N/A',
          averageLoadTime: `${report.averageLoadTime.toFixed(2)}ms`,
          slowestRoute: report.slowestRoute,
        });
      }
    }
  }, [currentMetric, getPerformanceReport]);

  const renderContent = () => {
    switch (navigationState.currentView) {
      case 'skills-list':
        return (
          <AgentErrorBoundary sectionName="Skills List">
            <SkillsListView />
          </AgentErrorBoundary>
        );
      case 'skill-dashboard':
        return (
          <AgentErrorBoundary sectionName="Skill Dashboard">
            <SkillDashboardView />
          </AgentErrorBoundary>
        );
      case 'edit-skill':
        return (
          <AgentErrorBoundary sectionName="Edit Skill">
            <EditSkillView />
          </AgentErrorBoundary>
        );
      case 'logs':
        return (
          <AgentErrorBoundary sectionName="Logs">
            <LogsView />
          </AgentErrorBoundary>
        );
      case 'log-detail':
        return (
          <AgentErrorBoundary sectionName="Log Detail">
            <LogDetailsView />
          </AgentErrorBoundary>
        );
      case 'evaluations':
        return (
          <AgentErrorBoundary sectionName="Evaluations">
            <EvaluationRunsView />
          </AgentErrorBoundary>
        );
      case 'evaluation-detail':
        return (
          <AgentErrorBoundary sectionName="Evaluation Detail">
            <EvaluationRunDetailsView />
          </AgentErrorBoundary>
        );
      case 'datasets':
        return (
          <AgentErrorBoundary sectionName="Datasets">
            <DatasetsView />
          </AgentErrorBoundary>
        );
      case 'dataset-detail':
        return (
          <AgentErrorBoundary sectionName="Dataset Detail">
            <DatasetDetailsView />
          </AgentErrorBoundary>
        );
      case 'create-evaluation':
        return (
          <AgentErrorBoundary sectionName="Create Evaluation">
            <CreateEvaluationRunView />
          </AgentErrorBoundary>
        );
      case 'create-dataset':
        return (
          <AgentErrorBoundary sectionName="Create Dataset">
            <CreateDatasetView />
          </AgentErrorBoundary>
        );
      case 'models':
        return (
          <AgentErrorBoundary sectionName="Models">
            <ModelsView />
          </AgentErrorBoundary>
        );
      case 'clusters':
        return (
          <AgentErrorBoundary sectionName="Clusters">
            <ClustersView />
          </AgentErrorBoundary>
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
}
