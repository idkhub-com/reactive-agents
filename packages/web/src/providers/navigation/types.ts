import type { useRouter } from 'next/navigation';

export interface BreadcrumbSegment {
  label: string;
  path: string;
  onClick?: () => void;
  isAgentDropdown?: boolean;
  isSkillDropdown?: boolean;
  isClusterDropdown?: boolean;
  isArmDropdown?: boolean;
}

export interface NavigationState {
  section: 'agents' | 'documentation' | 'settings';
  selectedAgentName?: string;
  selectedSkillName?: string;
  selectedClusterName?: string;
  selectedArmName?: string;
  selectedEvaluationId?: string;
  currentView:
    | 'agents-list'
    | 'edit-agent'
    | 'agent-view'
    | 'create-skill'
    | 'skill-dashboard'
    | 'edit-skill'
    | 'logs'
    | 'evaluations'
    | 'edit-evaluation'
    | 'datasets'
    | 'configurations'
    | 'models'
    | 'skill-events'
    | 'clusters'
    | 'cluster-arms'
    | 'arm-detail'
    | 'create-evaluation'
    | 'create-dataset'
    | 'create-configuration'
    | 'edit-configuration'
    | 'log-detail'
    | 'evaluation-detail'
    | 'dataset-detail';
  logId?: string;
  evalId?: string;
  datasetId?: string;
  breadcrumbs: BreadcrumbSegment[];
}

export interface NavigationContextType {
  navigationState: NavigationState;
  isLoadingFromStorage: boolean;
  router: ReturnType<typeof useRouter>;
  setSection: (section: NavigationState['section']) => void;
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
  navigateToEditEvaluation: (
    agentName: string,
    skillName: string,
    evaluationId: string,
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
  navigateToClusterArms: (
    agentName: string,
    skillName: string,
    clusterName: string,
  ) => void;
  navigateToArmDetail: (
    agentName: string,
    skillName: string,
    clusterName: string,
    armName: string,
  ) => void;
  navigateBack: (targetSegmentIndex: number) => void;
  updateBreadcrumbs: (segments: BreadcrumbSegment[]) => void;
}
