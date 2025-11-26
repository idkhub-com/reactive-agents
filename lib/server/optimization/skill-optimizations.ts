import { generateExampleConversations } from '@server/middlewares/optimizer/system-prompt';
import { BaseArmsParams } from '@server/optimization/base-arms';
import { regenerateEvaluationsWithExamples } from '@server/optimization/utils/evaluations';
import {
  generateSeedSystemPromptForSkill,
  generateSeedSystemPromptWithContext,
} from '@server/optimization/utils/system-prompt';
import type {
  EvaluationMethodConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { AppContext } from '@server/types/hono';
import type {
  SkillOptimizationArmCreateParams,
  SkillOptimizationArmParams,
} from '@shared/types/data/skill-optimization-arm';
import type { EvaluationMethodName } from '@shared/types/evaluations';

export async function handleGenerateArms(
  c: AppContext,
  userStorageConnector: UserDataStorageConnector,
  skillId: string,
  clusterId?: string, // Optional: if provided, only regenerate arms for this cluster
) {
  const skills = await userStorageConnector.getSkills({
    id: skillId,
  });

  if (skills.length === 0) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const skill = skills[0];

  // Get logs storage connector and evaluation connectors from context
  const logsStorageConnector = c.get('logs_storage_connector');
  const evaluationConnectorsMap = c.get('evaluation_connectors_map');

  // Check if we have at least 5 logs with embeddings to use context-aware generation
  let hasEnoughLogsForContext = false;
  let logs: Awaited<ReturnType<LogsStorageConnector['getLogs']>> = [];

  if (logsStorageConnector) {
    logs = await logsStorageConnector.getLogs({
      skill_id: skill.id,
      embedding_not_null: true,
      limit: 5,
    });
    hasEnoughLogsForContext = logs.length >= 5;
  }

  // If we have enough logs, regenerate evaluations with context before creating arms
  // Only do this for skill-wide regeneration (not cluster-specific)
  if (hasEnoughLogsForContext && !clusterId) {
    const exampleLogs = logs.slice(0, 5);
    const examples = generateExampleConversations(exampleLogs);

    // Get existing evaluations
    const existingEvaluations =
      await userStorageConnector.getSkillOptimizationEvaluations({
        skill_id: skill.id,
      });

    if (existingEvaluations.length > 0 && examples.length > 0) {
      // Get agent description for context
      const agents = await userStorageConnector.getAgents({
        id: skill.agent_id,
      });

      if (agents.length > 0) {
        const agent = agents[0];

        // Extract existing evaluation methods
        const existingMethods = existingEvaluations.map(
          (e) => e.evaluation_method,
        );

        // Regenerate evaluations with context
        const regeneratedEvaluationParams =
          await regenerateEvaluationsWithExamples(
            skill,
            agent.description,
            examples,
            evaluationConnectorsMap as Record<
              string,
              EvaluationMethodConnector
            >,
            existingMethods as EvaluationMethodName[],
            userStorageConnector,
          );

        // Delete old evaluations and create new ones
        await userStorageConnector.deleteSkillOptimizationEvaluationsForSkill(
          skill.id,
        );
        await userStorageConnector.createSkillOptimizationEvaluations(
          regeneratedEvaluationParams,
        );
      }
    }
  }

  // Get existing arms - either for specific cluster or entire skill
  const existingArms = clusterId
    ? await userStorageConnector.getSkillOptimizationArms({
        cluster_id: clusterId,
      })
    : await userStorageConnector.getSkillOptimizationArms({
        skill_id: skill.id,
      });

  // Reset cluster step count - either specific cluster or all clusters
  let clusters: Awaited<
    ReturnType<UserDataStorageConnector['getSkillOptimizationClusters']>
  >;

  if (clusterId) {
    clusters = await userStorageConnector.getSkillOptimizationClusters({
      id: clusterId,
    });
    if (clusters.length === 0) {
      return c.json({ error: 'Cluster not found' }, 404);
    }
    // Only reset the specific cluster (already done in caller, but ensure consistency)
    await userStorageConnector.updateSkillOptimizationCluster(clusterId, {
      total_steps: 0,
    });
  } else {
    clusters = await userStorageConnector.getSkillOptimizationClusters({
      skill_id: skill.id,
    });
    if (!clusters) {
      return c.json({ error: 'Clusters not found' }, 404);
    }
    // Reset all clusters
    for (const cluster of clusters) {
      await userStorageConnector.updateSkillOptimizationCluster(cluster.id, {
        total_steps: 0,
      });
    }
  }

  const skillModels = await userStorageConnector.getSkillModels(skill.id);
  // Use the clusters we already fetched (either specific one or all)
  const skillClusters = clusters;

  if (!skillModels || !skillClusters) {
    return c.json({ error: 'Skill models or clusters not found' }, 404);
  }

  // We don't need to create arms if there are no models or clusters
  if (skillModels.length === 0 || skillClusters.length === 0) {
    // Delete existing arms if any
    for (const arm of existingArms) {
      await userStorageConnector.deleteSkillOptimizationArmStats({
        arm_id: arm.id,
      });
    }
    return c.json({ updatedArms: [] }, 200);
  }

  // Generate system prompt based on whether we have enough context
  let systemPrompt: string;
  if (hasEnoughLogsForContext) {
    const exampleLogs = logs.slice(0, 5);
    const examples = generateExampleConversations(exampleLogs);

    // Get agent description for context
    const agents = await userStorageConnector.getAgents({
      id: skill.agent_id,
    });

    if (agents.length > 0 && examples.length > 0) {
      const agent = agents[0];
      systemPrompt = await generateSeedSystemPromptWithContext(
        agent.description,
        skill.description,
        examples,
        userStorageConnector,
      );
    } else {
      // Fallback to no-context generation
      systemPrompt = await generateSeedSystemPromptForSkill(
        skill,
        userStorageConnector,
      );
    }
  } else {
    // Use no-context generation for initial setup
    systemPrompt = await generateSeedSystemPromptForSkill(
      skill,
      userStorageConnector,
    );
  }

  // Build expected arms structure
  const expectedArms: Array<{
    cluster_id: string;
    model_id: string;
    baseArmIndex: number;
    armParams: SkillOptimizationArmParams;
  }> = [];

  for (const cluster of skillClusters) {
    let baseArmIndex = 0;
    for (const model of skillModels) {
      for (const baseArm of BaseArmsParams) {
        const armParams: SkillOptimizationArmParams = {
          ...baseArm,
          model_id: model.id,
          system_prompt: systemPrompt,
        };
        expectedArms.push({
          cluster_id: cluster.id,
          model_id: model.id,
          baseArmIndex,
          armParams,
        });
        baseArmIndex++;
      }
    }
  }

  // Match existing arms to expected arms and update/create as needed
  const updatedArms: string[] = [];
  const armsToCreate: SkillOptimizationArmCreateParams[] = [];

  for (let i = 0; i < expectedArms.length; i++) {
    const expected = expectedArms[i];
    const existing = existingArms[i]; // Match by position (same ordering)

    if (existing && existing.cluster_id === expected.cluster_id) {
      // Update existing arm in-place
      await userStorageConnector.updateSkillOptimizationArm(existing.id, {
        params: expected.armParams,
      });
      // Delete arm stats to reset performance history
      await userStorageConnector.deleteSkillOptimizationArmStats({
        arm_id: existing.id,
      });
      updatedArms.push(existing.id);
    } else {
      // Need to create new arm (shouldn't happen if models/clusters unchanged)
      armsToCreate.push({
        agent_id: skill.agent_id,
        skill_id: skill.id,
        cluster_id: expected.cluster_id,
        name: `${i + 1}`,
        params: expected.armParams,
      });
    }
  }

  // Create any new arms needed
  if (armsToCreate.length > 0) {
    const createdArms =
      await userStorageConnector.createSkillOptimizationArms(armsToCreate);
    updatedArms.push(...createdArms.map((a) => a.id));
  }

  // Delete any extra arms that no longer match expected structure
  for (let i = expectedArms.length; i < existingArms.length; i++) {
    await userStorageConnector.deleteSkillOptimizationArm(existingArms[i].id);
  }

  return c.json({ updatedArms }, 200);
}
