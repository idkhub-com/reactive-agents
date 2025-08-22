'use client';

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';
import type { Agent, Skill } from '@shared/types/data';
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
  getSelectedAgentName,
  removeSelectedAgentName,
  saveSelectedAgentName,
} from './storage-utils';
import type {
  BreadcrumbSegment,
  NavigationContextType,
  NavigationState,
} from './types';
import {
  encodeAgentName,
  encodeSkillName,
  getAgentByName,
  getSkillByName,
  sanitizeName,
} from './url-utils';
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
    section: 'pipelines',
    currentView: 'skills-list',
    breadcrumbs: [
      { label: 'Select Agent', path: '/pipelines', isAgentDropdown: true },
    ],
  });

  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Use extracted navigation routes hook
  const navigationRoutes = useNavigationRoutes(router);

  // Parse current URL and determine view
  const parseCurrentView = useCallback((): NavigationState['currentView'] => {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments[0] !== 'pipelines') {
      return 'skills-list';
    }

    const agentName = params.agentName as string;
    const skillName = params.skillName as string;
    const logId = params.logId as string;
    const evalId = params.evalId as string;
    const datasetId = params.datasetId as string;

    // Determine view based on URL structure
    if (pathSegments.length === 1) return 'skills-list'; // /pipelines
    if (pathSegments.length === 2 && agentName) return 'skills-list'; // /pipelines/[agentName]
    if (pathSegments.length === 3 && agentName && skillName)
      return 'skill-dashboard'; // /pipelines/[agentName]/[skillName]

    const subPath = pathSegments[3];
    if (subPath === 'logs') {
      if (logId) return 'log-detail'; // /pipelines/[agentName]/[skillName]/logs/[logId]
      return 'logs'; // /pipelines/[agentName]/[skillName]/logs
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

    return 'skills-list';
  }, [pathname, params]);

  const setSection = useCallback(
    (section: NavigationState['section']) => {
      router.push(`/${section}`);
    },
    [router],
  );

  const setSelectedAgent = useCallback(
    (agent: Agent | undefined) => {
      setNavigationState((prev) => ({
        ...prev,
        selectedAgent: agent,
        selectedSkill: undefined, // Clear skill when agent changes
      }));
      if (agent) {
        // Persist selection but do not block navigation on storage issues
        try {
          saveSelectedAgentName(agent.name);
        } catch {
          // no-op, fallback handled internally in storage-utils
        }
        router.push(`/pipelines/${encodeAgentName(agent.name)}`);
      } else {
        try {
          removeSelectedAgentName();
        } catch {
          // no-op
        }
        router.push('/pipelines');
      }
    },
    [router],
  );

  const setSelectedSkill = useCallback((skill: Skill | undefined) => {
    setNavigationState((prev) => ({
      ...prev,
      selectedSkill: skill,
    }));
  }, []);

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

  // Load agents
  useEffect(() => {
    async function loadAgents() {
      try {
        const fetchedAgents = await getAgents({});
        setAgents(fetchedAgents);
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    }
    loadAgents();
  }, []);

  // Load skills for selected agent
  useEffect(() => {
    async function loadSkills() {
      if (!navigationState.selectedAgent) {
        setSkills([]);
        return;
      }

      try {
        const fetchedSkills = await getSkills({
          agent_id: navigationState.selectedAgent.id,
        });
        setSkills(fetchedSkills);
      } catch (error) {
        console.error('Failed to load skills:', error);
        setSkills([]);
      }
    }
    loadSkills();
  }, [navigationState.selectedAgent]);

  // Sync navigation state with URL
  useEffect(() => {
    const currentView = parseCurrentView();
    const agentName = params.agentName as string;
    const skillName = params.skillName as string;
    const logId = params.logId as string;
    const evalId = params.evalId as string;
    const datasetId = params.datasetId as string;

    setNavigationState((prev) => {
      const newState: NavigationState = {
        ...prev,
        currentView,
      } as NavigationState;

      // Update selected agent if agentName in URL
      if (agentName && agents.length > 0) {
        const agent = getAgentByName(agents, agentName);
        if (agent && agent.id !== prev.selectedAgent?.id) {
          newState.selectedAgent = agent;
          newState.agentName = agentName;
        }
      }

      // Update selected skill if skillName in URL
      if (skillName && skills.length > 0) {
        const skill = getSkillByName(skills, skillName);
        if (skill && skill.id !== prev.selectedSkill?.id) {
          newState.selectedSkill = skill;
          newState.skillName = skillName;
        }
      }

      // Store IDs for detail views
      if (logId) newState.logId = logId;
      if (evalId) newState.evalId = evalId;
      if (datasetId) newState.datasetId = datasetId;

      // Build breadcrumbs based on current path
      const breadcrumbs: BreadcrumbSegment[] = [
        {
          label: newState.selectedAgent
            ? `Agent: ${newState.selectedAgent.name}`
            : 'Select Agent',
          path: '/pipelines',
          isAgentDropdown: true,
        },
      ];

      if (newState.selectedAgent && newState.selectedSkill) {
        breadcrumbs.push({
          label: newState.selectedSkill.name,
          path: `/pipelines/${encodeAgentName(newState.selectedAgent.name)}/${encodeSkillName(newState.selectedSkill.name)}`,
          isSkillDropdown: true,
        });

        if (currentView === 'logs' || currentView === 'log-detail') {
          breadcrumbs.push({
            label: 'Logs',
            path: `/pipelines/${encodeAgentName(newState.selectedAgent.name)}/${encodeSkillName(newState.selectedSkill.name)}/logs`,
          });
        } else if (
          currentView === 'evaluations' ||
          currentView === 'evaluation-detail' ||
          currentView === 'create-evaluation'
        ) {
          breadcrumbs.push({
            label: 'Evaluations',
            path: `/pipelines/${encodeAgentName(newState.selectedAgent.name)}/${encodeSkillName(newState.selectedSkill.name)}/evaluations`,
          });
        } else if (
          currentView === 'datasets' ||
          currentView === 'dataset-detail' ||
          currentView === 'create-dataset'
        ) {
          breadcrumbs.push({
            label: 'Datasets',
            path: `/pipelines/${encodeAgentName(newState.selectedAgent.name)}/${encodeSkillName(newState.selectedSkill.name)}/datasets`,
          });
        }
      } else if (newState.selectedAgent && currentView === 'skills-list') {
        breadcrumbs.push({
          label: 'Skills',
          path: `/pipelines/${encodeAgentName(newState.selectedAgent.name)}`,
        });
      }

      newState.breadcrumbs = breadcrumbs;

      // Avoid unnecessary renders by shallow-comparing relevant fields
      const sameSelectedAgent =
        prev.selectedAgent?.id === newState.selectedAgent?.id;
      const sameSelectedSkill =
        prev.selectedSkill?.id === newState.selectedSkill?.id;
      const sameIds =
        prev.logId === newState.logId &&
        prev.evalId === newState.evalId &&
        prev.datasetId === newState.datasetId;
      const sameNames =
        prev.agentName === newState.agentName &&
        prev.skillName === newState.skillName;
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

      if (
        sameSelectedAgent &&
        sameSelectedSkill &&
        sameIds &&
        sameNames &&
        sameView &&
        sameBreadcrumbs
      ) {
        return prev;
      }
      return newState;
    });
  }, [params, agents, skills, parseCurrentView]);

  // Load selected agent from storage
  const hasLoadedFromStorageRef = useRef(false);
  useEffect(() => {
    if (hasLoadedFromStorageRef.current) return;
    if (agents.length === 0) return;
    const storedAgentName = getSelectedAgentName();
    if (storedAgentName) {
      const agent = agents.find(
        (a) => sanitizeName(a.name) === sanitizeName(storedAgentName),
      );
      if (agent) {
        // Set from storage without triggering navigation
        setNavigationState((prev) => ({
          ...prev,
          selectedAgent: agent,
          selectedSkill: undefined,
        }));
      }
    }
    setIsLoadingFromStorage(false);
    hasLoadedFromStorageRef.current = true;
  }, [agents]);

  return (
    <NavigationContext.Provider
      value={{
        navigationState,
        isLoadingFromStorage,
        router,
        skills,
        setSection,
        setSelectedAgent,
        setSelectedSkill,
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
