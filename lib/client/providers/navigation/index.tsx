'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  removeSelectedAgentName,
  saveSelectedAgentName,
} from './storage-utils';
import type {
  BreadcrumbSegment,
  NavigationContextType,
  NavigationState,
} from './types';
import { useNavigationRoutes } from './use-navigation-routes';

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({
  children,
}: NavigationProviderProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const [navigationState, setNavigationState] = useState<NavigationState>({
    section: 'agents',
    currentView: 'agents-list',
    breadcrumbs: [{ label: 'Agents', path: '/agents' }],
  });

  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(true);

  // Use extracted navigation routes hook
  const navigationRoutes = useNavigationRoutes(router);

  // Parse current URL and determine view
  const parseCurrentView = useCallback((): NavigationState['currentView'] => {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments[0] !== 'agents') {
      return 'skills-list';
    }

    const agentName = params.agentName as string;
    const skillName = params.skillName as string;
    const logId = params.logId as string;
    const evalId = params.evalId as string;
    const datasetId = params.datasetId as string;
    const clusterName = params.clusterName as string;
    const armName = params.armName as string;

    // Determine view based on URL structure
    if (pathSegments.length === 1) return 'agents-list'; // /agents
    if (pathSegments.length === 2 && agentName) return 'skills-list'; // /agents/[agentName]
    if (pathSegments.length === 3 && agentName && pathSegments[2] === 'edit')
      return 'edit-agent'; // /agents/[agentName]/edit
    if (pathSegments.length === 3 && agentName && skillName)
      return 'skill-dashboard'; // /agents/[agentName]/[skillName]

    const subPath = pathSegments[3];
    if (subPath === 'logs') {
      if (logId) return 'log-detail'; // /agents/[agentName]/[skillName]/logs/[logId]
      return 'logs'; // /agents/[agentName]/[skillName]/logs
    }
    if (subPath === 'evaluations') {
      if (pathSegments[4] === 'create') return 'create-evaluation';
      if (evalId) return 'evaluation-detail';
      return 'evaluations';
    }
    if (subPath === 'datasets') {
      if (pathSegments[4] === 'create') return 'create-dataset';
      if (datasetId) return 'dataset-detail';
      return 'datasets';
    }
    if (subPath === 'configurations') {
      if (pathSegments[4] === 'create') return 'create-configuration';
      if (pathSegments[4] && pathSegments[4] !== 'create')
        return 'edit-configuration';
      return 'configurations';
    }
    if (subPath === 'models') {
      return 'models';
    }
    if (subPath === 'partitions') {
      // Check if it's /partitions/[clusterName]/arms/[armName]
      if (clusterName && pathSegments[5] === 'arms' && armName) {
        return 'arm-detail';
      }
      // Check if it's /partitions/[clusterName]/arms
      if (clusterName && pathSegments[5] === 'arms') {
        return 'cluster-arms';
      }
      return 'clusters';
    }
    if (subPath === 'edit') {
      return 'edit-skill';
    }

    return 'skills-list';
  }, [pathname, params]);

  const setSection = useCallback(
    (section: NavigationState['section']) => {
      router.push(`/${section}`);
    },
    [router],
  );

  const navigateBack = useCallback(
    (targetSegmentIndex: number) => {
      const targetSegment = navigationState.breadcrumbs[targetSegmentIndex];
      if (targetSegment) {
        router.push(targetSegment.path);
      }
    },
    [navigationState.breadcrumbs, router],
  );

  const updateBreadcrumbs = useCallback((segments: BreadcrumbSegment[]) => {
    setNavigationState((prev) => ({
      ...prev,
      breadcrumbs: segments,
    }));
  }, []);

  // Sync navigation state with URL
  useEffect(() => {
    const currentView = parseCurrentView();
    const agentName = params.agentName as string;
    const skillName = params.skillName as string;
    const clusterName = params.clusterName as string;
    const armName = params.armName as string;
    const logId = params.logId as string;
    const evalId = params.evalId as string;
    const datasetId = params.datasetId as string;

    setNavigationState((prev) => {
      const newState: NavigationState = {
        ...prev,
        currentView,
      } as NavigationState;

      // Store selected names from URL
      if (agentName) {
        // Decode and store agent name
        const decodedAgentName = decodeURIComponent(agentName);
        newState.selectedAgentName = decodedAgentName;
        // Save to localStorage for /agents page
        try {
          saveSelectedAgentName(decodedAgentName);
        } catch {
          // no-op
        }
      } else if (!agentName && currentView !== 'agents-list') {
        // No agent in URL and NOT on /agents page - clear everything
        newState.selectedAgentName = undefined;
        newState.selectedSkillName = undefined;
        // Clear from storage when navigating away from agents
        try {
          removeSelectedAgentName();
        } catch {
          // no-op
        }
      }

      // Store selected skill name from URL
      if (skillName) {
        newState.selectedSkillName = decodeURIComponent(skillName);
      } else {
        newState.selectedSkillName = undefined;
      }

      // Store selected cluster name from URL
      if (clusterName) {
        newState.selectedClusterName = decodeURIComponent(clusterName);
      } else {
        newState.selectedClusterName = undefined;
      }

      // Store selected arm name from URL
      if (armName) {
        newState.selectedArmName = decodeURIComponent(armName);
      } else {
        newState.selectedArmName = undefined;
      }

      // Store IDs for detail views
      if (logId) newState.logId = logId;
      if (evalId) newState.evalId = evalId;
      if (datasetId) newState.datasetId = datasetId;

      // Build breadcrumbs based on current path
      const breadcrumbs: BreadcrumbSegment[] = [];

      // Check if we're on an agent-related route
      const isOnAgentRoute = pathname.startsWith('/agents');

      // Show "Agents" as root breadcrumb for all agent routes
      if (isOnAgentRoute) {
        breadcrumbs.push({
          label: 'Agents',
          path: '/agents',
        });

        // If agent is selected, show it as a dropdown
        if (currentView !== 'agents-list' && newState.selectedAgentName) {
          breadcrumbs.push({
            label: newState.selectedAgentName,
            path: '/agents',
            isAgentDropdown: true,
          });
        }
      }

      if (newState.selectedAgentName && newState.selectedSkillName) {
        breadcrumbs.push({
          label: newState.selectedSkillName,
          path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}`,
          isSkillDropdown: true,
        });

        if (currentView === 'logs' || currentView === 'log-detail') {
          breadcrumbs.push({
            label: 'Logs',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/logs`,
          });
        } else if (
          currentView === 'evaluations' ||
          currentView === 'evaluation-detail' ||
          currentView === 'create-evaluation'
        ) {
          breadcrumbs.push({
            label: 'Evaluations',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/evaluations`,
          });
        } else if (
          currentView === 'datasets' ||
          currentView === 'dataset-detail' ||
          currentView === 'create-dataset'
        ) {
          breadcrumbs.push({
            label: 'Datasets',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/datasets`,
          });
        } else if (
          currentView === 'configurations' ||
          currentView === 'create-configuration' ||
          currentView === 'edit-configuration'
        ) {
          breadcrumbs.push({
            label: 'Configurations',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/configurations`,
          });
        } else if (currentView === 'models') {
          breadcrumbs.push({
            label: 'Models',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/models`,
          });
        } else if (currentView === 'clusters') {
          breadcrumbs.push({
            label: 'Partitions',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions`,
          });
        } else if (currentView === 'cluster-arms') {
          breadcrumbs.push({
            label: 'Partitions',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions`,
          });
          if (newState.selectedClusterName) {
            breadcrumbs.push({
              label: newState.selectedClusterName,
              path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions/${encodeURIComponent(newState.selectedClusterName)}/arms`,
              isClusterDropdown: true,
            });
          }
        } else if (currentView === 'arm-detail') {
          breadcrumbs.push({
            label: 'Partitions',
            path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions`,
          });
          if (newState.selectedClusterName) {
            breadcrumbs.push({
              label: newState.selectedClusterName,
              path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions/${encodeURIComponent(newState.selectedClusterName)}/arms`,
              isClusterDropdown: true,
            });
          }
          if (newState.selectedArmName) {
            breadcrumbs.push({
              label: newState.selectedArmName,
              path: `/agents/${encodeURIComponent(newState.selectedAgentName)}/${encodeURIComponent(newState.selectedSkillName)}/partitions/${encodeURIComponent(newState.selectedClusterName!)}/arms/${encodeURIComponent(newState.selectedArmName)}`,
              isArmDropdown: true,
            });
          }
        }
      }

      // Handle non-agent routes
      if (pathname.startsWith('/ai-providers')) {
        breadcrumbs.push({
          label: 'AI Providers',
          path: '/ai-providers',
        });
      } else if (pathname.startsWith('/models')) {
        breadcrumbs.push({
          label: 'Models',
          path: '/models',
        });
      }

      newState.breadcrumbs = breadcrumbs;

      // Avoid unnecessary renders by shallow-comparing relevant fields
      const sameSelectedNames =
        prev.selectedAgentName === newState.selectedAgentName &&
        prev.selectedSkillName === newState.selectedSkillName &&
        prev.selectedClusterName === newState.selectedClusterName &&
        prev.selectedArmName === newState.selectedArmName;
      const sameIds =
        prev.logId === newState.logId &&
        prev.evalId === newState.evalId &&
        prev.datasetId === newState.datasetId;
      const sameView = prev.currentView === newState.currentView;
      const sameBreadcrumbs =
        prev.breadcrumbs.length === newState.breadcrumbs.length &&
        prev.breadcrumbs.every((b, i) => {
          const nb = newState.breadcrumbs[i];
          return (
            b.label === nb.label &&
            b.path === nb.path &&
            b.isAgentDropdown === nb.isAgentDropdown &&
            b.isSkillDropdown === nb.isSkillDropdown
          );
        });

      if (sameSelectedNames && sameIds && sameView && sameBreadcrumbs) {
        return prev;
      }
      return newState;
    });
  }, [params, parseCurrentView, pathname]);

  // Mark storage as loaded after initial render
  const hasLoadedFromStorageRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) {
      setIsLoadingFromStorage(false);
      hasLoadedFromStorageRef.current = true;
    }
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        navigationState,
        isLoadingFromStorage,
        router,
        setSection,
        ...navigationRoutes,
        navigateBack,
        updateBreadcrumbs,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

// Re-export types for backward compatibility
export type { BreadcrumbSegment, NavigationState } from './types';
