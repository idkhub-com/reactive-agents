import type { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { encodeAgentName, encodeSkillName } from './url-utils';

export function useNavigationRoutes(router: ReturnType<typeof useRouter>) {
  const navigateToSkillDashboard = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}`,
      );
    },
    [router],
  );

  const navigateToLogs = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/logs`,
      );
    },
    [router],
  );

  const navigateToLogDetail = useCallback(
    (agentName: string, skillName: string, logId: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/logs/${logId}`,
      );
    },
    [router],
  );

  const navigateToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/evaluations`,
      );
    },
    [router],
  );

  const navigateToEvaluationDetail = useCallback(
    (agentName: string, skillName: string, evalId: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/evaluations/${evalId}`,
      );
    },
    [router],
  );

  const navigateToCreateEvaluation = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/evaluations/create`,
      );
    },
    [router],
  );

  const replaceToEvaluations = useCallback(
    (agentName: string, skillName: string) => {
      router.replace(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/evaluations`,
      );
    },
    [router],
  );

  const navigateToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/datasets`,
      );
    },
    [router],
  );

  const replaceToDatasets = useCallback(
    (agentName: string, skillName: string) => {
      router.replace(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/datasets`,
      );
    },
    [router],
  );

  const navigateToDatasetDetail = useCallback(
    (agentName: string, skillName: string, datasetId: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/datasets/${datasetId}`,
      );
    },
    [router],
  );

  const navigateToCreateDataset = useCallback(
    (agentName: string, skillName: string) => {
      router.push(
        `/pipelines/${encodeAgentName(agentName)}/${encodeSkillName(skillName)}/datasets/create`,
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
  };
}
