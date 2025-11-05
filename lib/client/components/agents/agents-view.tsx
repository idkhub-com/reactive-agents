'use client';

import { useNavigationPerformance } from '@client/hooks/use-navigation-performance';
import { useNavigation } from '@client/providers/navigation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { AgentErrorBoundary } from './agent-error-boundary';
import { AgentsListView } from './agents-list-view';
import { EditAgentView } from './edit-agent-view';
import { EditSkillView, SkillDashboardView, SkillsListView } from './skills';
import { ArmDetailView } from './skills/arms/arm-detail-view';
import { ClusterArmsView } from './skills/clusters/cluster-arms-view';
import { ClustersView } from './skills/clusters/clusters-view';
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
      case 'clusters':
        return (
          <AgentErrorBoundary sectionName="Partitions">
            <ClustersView />
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
