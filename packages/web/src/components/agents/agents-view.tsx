'use client';

import { AgentView } from '@client/components/agents/agent-view';
import { useNavigationPerformance } from '@client/hooks/use-navigation-performance';
import { useNavigation } from '@client/providers/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { AgentErrorBoundary } from './agent-error-boundary';
import { AgentsListView } from './agents-list-view';
import { EditAgentView } from './edit-agent-view';
import { EditSkillView, SkillDashboardView } from './skills';
import { ArmDetailView } from './skills/arms/arm-detail-view';
import { ClusterArmsView } from './skills/clusters/cluster-arms-view';
import { EvaluationEditView } from './skills/evaluations/evaluation-edit-view';
import { EvaluationsListView } from './skills/evaluations/evaluations-list-view';
import { SkillEventsView } from './skills/events/skill-events-view';
import { LogDetailsView, LogsView } from './skills/logs';

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
      case 'agents-list':
        return (
          <AgentErrorBoundary sectionName="Agents List">
            <AgentsListView />
          </AgentErrorBoundary>
        );
      case 'edit-agent':
        return (
          <AgentErrorBoundary sectionName="Edit Agent">
            <EditAgentView />
          </AgentErrorBoundary>
        );
      case 'agent-view':
        return (
          <AgentErrorBoundary sectionName="Skills List">
            <AgentView />
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
      case 'cluster-arms':
        return (
          <AgentErrorBoundary sectionName="Partition Arms">
            <ClusterArmsView />
          </AgentErrorBoundary>
        );
      case 'arm-detail':
        return (
          <AgentErrorBoundary sectionName="Arm Detail">
            <ArmDetailView />
          </AgentErrorBoundary>
        );
      case 'skill-events':
        return (
          <AgentErrorBoundary sectionName="Events">
            <SkillEventsView />
          </AgentErrorBoundary>
        );
      case 'evaluations':
        return (
          <AgentErrorBoundary sectionName="Evaluations">
            <EvaluationsListView />
          </AgentErrorBoundary>
        );
      case 'edit-evaluation':
        return (
          <AgentErrorBoundary sectionName="Edit Evaluation">
            <EvaluationEditView />
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
