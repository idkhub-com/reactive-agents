import { useCallback } from 'react';

// Permissive navigate type that allows any string path during migration
// This can be tightened once all routes are created
type PermissiveNavigateOptions = {
  to: string;
  replace?: boolean;
  search?: Record<string, string>;
  params?: Record<string, string>;
};

type NavigateFn = (opts: PermissiveNavigateOptions) => void;

export function useNavigationRoutes(navigate: NavigateFn) {
  const navigateToSkillDashboard = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}`,
      });
    },
    [navigate],
  );

  const navigateToLogs = useCallback(
    (agentName: string, skillName: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/logs`,
      });
    },
    [navigate],
  );

  const navigateToLogDetail = useCallback(
    (agentName: string, skillName: string, logId: string) => {
      navigate({
        to: `/agents/${encodeURIComponent(agentName)}/skills/${encodeURIComponent(skillName)}/logs/${logId}`,
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
