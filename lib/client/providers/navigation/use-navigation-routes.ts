import type { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useNavigationRoutes(router: ReturnType<typeof useRouter>) {
  const navigateToSkillDashboard = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}`,
      );
    },
    [router],
  );

  const navigateToLogs = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/logs`,
      );
    },
    [router],
  );

  const navigateToLogDetail = useCallback(
    (agentName: string, skillName: string, logId: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/logs/${logId}`,
      );
    },
    [router],
  );

  const navigateToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/evaluations`,
      );
    },
    [router],
  );

  const navigateToEvaluationDetail = useCallback(
    (agentName: string, skillName: string, evalId: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/evaluations/${evalId}`,
      );
    },
    [router],
  );

  const navigateToCreateEvaluation = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/evaluations/create`,
      );
    },
    [router],
  );

  const replaceToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      router.replace(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/evaluations`,
      );
    },
    [router],
  );

  const navigateToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/datasets`,
      );
    },
    [router],
  );

  const replaceToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      router.replace(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/datasets`,
      );
    },
    [router],
  );

  const navigateToDatasetDetail = useCallback(
    (agentName: string, skillName: string, datasetId: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/datasets/${datasetId}`,
      );
    },
    [router],
  );

  const navigateToCreateDataset = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/datasets/create`,
      );
    },
    [router],
  );

  const navigateToConfigurations = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/configurations`,
      );
    },
    [router],
  );

  const navigateToModels = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/models`,
      );
    },
    [router],
  );

  const navigateToClusters = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/partitions`,
      );
    },
    [router],
  );

  const navigateToClusterArms = useCallback(
    (agentName: string, skillName: string, clusterName: string) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/partitions/${encodeURIComponent(clusterName)}/arms`,
      );
    },
    [router],
  );

  const navigateToArmDetail = useCallback(
    (
      agentName: string,
      skillName: string,
      clusterName: string,
      armName: string,
    ) => {
      router.push(
        `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}/partitions/${encodeURIComponent(clusterName)}/arms/${encodeURIComponent(armName)}`,
      );
    },
    [router],
  );

  return {
    navigateToSkillDashboard,
    navigateToLogs,
    navigateToLogDetail,
    navigateToEvaluations,
    navigateToEvaluationDetail,
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
