'use client';

import { useNavigationPerformance } from '@client/hooks/use-navigation-performance';
import { useNavigation } from '@client/providers/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { CreateDatasetView } from './create-dataset-view';
import { CreateEvaluationView } from './create-evaluation-run-view';
import { DatasetDetailView } from './dataset-detail-view';
import { DatasetsView } from './datasets-view';
import { EvaluationDetailView } from './evaluation-detail-view';
import { EvaluationRunsView } from './evaluation-runs-view';
import { LogDetailView } from './log-detail-view';
import { LogsView } from './logs-view';
import { PipelineErrorBoundary } from './pipeline-error-boundary';
import { SkillDashboardView } from './skill-dashboard-view';
import { SkillsListView } from './skills-list-view';

export function PipelinesView(): ReactElement {
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
          <PipelineErrorBoundary sectionName="Skills List">
            <SkillsListView />
          </PipelineErrorBoundary>
        );
      case 'skill-dashboard':
        return (
          <PipelineErrorBoundary sectionName="Skill Dashboard">
            <SkillDashboardView />
          </PipelineErrorBoundary>
        );
      case 'logs':
        return (
          <PipelineErrorBoundary sectionName="Logs">
            <LogsView />
          </PipelineErrorBoundary>
        );
      case 'log-detail':
        return (
          <PipelineErrorBoundary sectionName="Log Detail">
            <LogDetailView />
          </PipelineErrorBoundary>
        );
      case 'evaluations':
        return (
          <PipelineErrorBoundary sectionName="Evaluations">
            <EvaluationRunsView />
          </PipelineErrorBoundary>
        );
      case 'evaluation-detail':
        return (
          <PipelineErrorBoundary sectionName="Evaluation Detail">
            <EvaluationDetailView />
          </PipelineErrorBoundary>
        );
      case 'datasets':
        return (
          <PipelineErrorBoundary sectionName="Datasets">
            <DatasetsView />
          </PipelineErrorBoundary>
        );
      case 'dataset-detail':
        return (
          <PipelineErrorBoundary sectionName="Dataset Detail">
            <DatasetDetailView />
          </PipelineErrorBoundary>
        );
      case 'create-evaluation':
        return (
          <PipelineErrorBoundary sectionName="Create Evaluation">
            <CreateEvaluationView />
          </PipelineErrorBoundary>
        );
      case 'create-dataset':
        return (
          <PipelineErrorBoundary sectionName="Create Dataset">
            <CreateDatasetView />
          </PipelineErrorBoundary>
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
