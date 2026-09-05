import { useCallback } from 'react';

// Permissive navigate type that allows any string path during migration
// This can be tightened once all routes are created
type PermissiveNavigateOptions = {
  to: string;
  replace?: boolean;
  search?: Record<string, string>;
  params?: Record<string, string>;
};

export type NavigateFn = (opts: PermissiveNavigateOptions) => void;

export function useNavigationRoutes(navigate: NavigateFn) {
  const navigateToSkillDashboard = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}`,
      });
    },
    [navigate],
  );

  // The agent's logs, narrowed to one skill when one is named
  const navigateToLogs = useCallback(
    (agentName: string, skillName?: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/logs`,
        ...(skillName ? { search: { skill: skillName } } : {}),
      });
    },
    [navigate],
  );

  // A log lives under its agent: its skill is a fact about it, not its address
  const navigateToLogDetail = useCallback(
    (agentName: string, logId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/logs/${logId}`,
      });
    },
    [navigate],
  );

  // Stepping between logs from the detail view: replacing keeps the browser
  // history at list -> log, so back still leaves the detail view
  const replaceToLogDetail = useCallback(
    (agentName: string, logId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/logs/${logId}`,
        replace: true,
      });
    },
    [navigate],
  );

  const navigateToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/evaluations`,
      });
    },
    [navigate],
  );

  const navigateToEvaluationDetail = useCallback(
    (agentName: string, skillName: string, evalId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/evaluations/${evalId}`,
      });
    },
    [navigate],
  );

  const navigateToEditEvaluation = useCallback(
    (agentName: string, skillName: string, evaluationId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/evaluations/${evaluationId}/edit`,
      });
    },
    [navigate],
  );

  const navigateToCreateEvaluation = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/evaluations/create`,
      });
    },
    [navigate],
  );

  const replaceToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/evaluations`,
        replace: true,
      });
    },
    [navigate],
  );

  const navigateToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/datasets`,
      });
    },
    [navigate],
  );

  const replaceToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/datasets`,
        replace: true,
      });
    },
    [navigate],
  );

  const navigateToDatasetDetail = useCallback(
    (agentName: string, skillName: string, datasetId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/datasets/${datasetId}`,
      });
    },
    [navigate],
  );

  const navigateToCreateDataset = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/datasets/create`,
      });
    },
    [navigate],
  );

  const navigateToConfigurations = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/configurations`,
      });
    },
    [navigate],
  );

  const navigateToModels = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/models`,
      });
    },
    [navigate],
  );

  const navigateToClusters = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/clusters`,
      });
    },
    [navigate],
  );

  const navigateToClusterArms = useCallback(
    (agentName: string, skillName: string, clusterName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/clusters/${encodeURIComponent(clusterName)}/configurations`,
      });
    },
    [navigate],
  );

  const navigateToArmDetail = useCallback(
    (
      agentName: string,
      skillName: string,
      clusterName: string,
      armName: string,
    ) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/clusters/${encodeURIComponent(clusterName)}/configurations/${encodeURIComponent(armName)}`,
      });
    },
    [navigate],
  );

  return {
    navigateToSkillDashboard,
    navigateToLogs,
    navigateToLogDetail,
    replaceToLogDetail,
    navigateToEvaluations,
    navigateToEvaluationDetail,
    navigateToEditEvaluation,
    navigateToCreateEvaluation,
    replaceToEvaluations,
    navigateToDatasets,
    replaceToDatasets,
    navigateToDatasetDetail,
    navigateToCreateDataset,
    navigateToConfigurations,
    navigateToModels,
    navigateToClusters,
    navigateToClusterArms,
    navigateToArmDetail,
  };
}
