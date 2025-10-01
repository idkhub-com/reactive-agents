import type { Agent, Skill } from '@shared/types/data';
import type { useRouter } from 'next/navigation';

export interface BreadcrumbSegment {
  label: string;
  path: string;
  onClick?: () => void;
  isAgentDropdown?: boolean;
  isSkillDropdown?: boolean;
}

export interface NavigationState {
  section: 'agents' | 'documentation' | 'settings';
  selectedAgent?: Agent;
  selectedSkill?: Skill;
  currentView:
    | 'skills-list'
    | 'skill-dashboard'
    | 'edit-skill'
    | 'logs'
    | 'evaluations'
    | 'datasets'
    | 'configurations'
    | 'models'
    | 'clusters'
    | 'create-evaluation'
    | 'create-dataset'
    | 'create-configuration'
    | 'edit-configuration'
    | 'log-detail'
    | 'evaluation-detail'
    | 'dataset-detail';
  agentName?: string;
  skillName?: string;
  logId?: string;
  evalId?: string;
  datasetId?: string;
  breadcrumbs: BreadcrumbSegment[];
}

export interface NavigationContextType {
  navigationState: NavigationState;
  isLoadingFromStorage: boolean;
  router: ReturnType<typeof useRouter>;
  skills: Skill[];
  setSection: (section: NavigationState['section']) => void;
  setSelectedAgent: (agent: Agent | undefined) => void;
  setSelectedSkill: (skill: Skill | undefined) => void;
  navigateToSkillDashboard: (agentName: string, skillName: string) => void;
  navigateToLogs: (agentName: string, skillName: string) => void;
  navigateToLogDetail: (
    agentName: string,
    skillName: string,
    logId: string,
  ) => void;
  navigateToEvaluations: (agentName: string, skillName: string) => void;
  navigateToEvaluationDetail: (
    agentName: string,
    skillName: string,
    evalId: string,
  ) => void;
  navigateToCreateEvaluation: (agentName: string, skillName: string) => void;
  replaceToEvaluations: (agentName: string, skillName: string) => void;
  navigateToDatasets: (agentName: string, skillName: string) => void;
  replaceToDatasets: (agentName: string, skillName: string) => void;
  navigateToDatasetDetail: (
    agentName: string,
    skillName: string,
    datasetId: string,
  ) => void;
  navigateToCreateDataset: (agentName: string, skillName: string) => void;
  navigateToConfigurations: (agentName: string, skillName: string) => void;
  navigateToModels: (agentName: string, skillName: string) => void;
  navigateToClusters: (agentName: string, skillName: string) => void;
  navigateBack: (targetSegmentIndex: number) => void;
  updateBreadcrumbs: (segments: BreadcrumbSegment[]) => void;
}
