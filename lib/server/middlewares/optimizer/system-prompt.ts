import { generateReflectiveSystemPromptForSkill } from '@server/optimization/utils/system-prompt';
import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { formatMessagesForExtraction } from '@server/utils/messages';
import { extractMessagesFromRequestData } from '@server/utils/reactive-agents/requests';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import { error } from '@shared/console-logging';
import {
  type ChatCompletionRequestData,
  FunctionName,
  type ResponsesRequestData,
  type StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type {
  Log,
  Skill,
  SkillOptimizationArmCreateParams,
  SkillOptimizationCluster,
} from '@shared/types/data';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';

/**
 * Extracts relevant request parameters that affect the output format and constraints.
 * This includes structured output requirements, tool definitions, and sampling parameters.
 */
function extractRequestConstraints(
  raRequestData:
    | ChatCompletionRequestData
    | StreamChatCompletionRequestData
    | ResponsesRequestData,
): string {
  const constraints: string[] = [];

  // Extract response format (JSON schema, structured output)
  if ('response_format' in raRequestData && raRequestData.response_format) {
    constraints.push(
      `Response Format: ${JSON.stringify(raRequestData.response_format, null, 2)}`,
    );
  }

  // Extract text config for Responses API
  if ('text' in raRequestData && raRequestData.text) {
    constraints.push(
      `Text Config: ${JSON.stringify(raRequestData.text, null, 2)}`,
    );
  }

  // Extract tools/functions
  if ('tools' in raRequestData && raRequestData.tools) {
    constraints.push(
      `Available Tools: ${JSON.stringify(raRequestData.tools, null, 2)}`,
    );
  }

  if ('functions' in raRequestData && raRequestData.functions) {
    constraints.push(
      `Available Functions: ${JSON.stringify(raRequestData.functions, null, 2)}`,
    );
  }

  // Extract tool choice constraints
  if ('tool_choice' in raRequestData && raRequestData.tool_choice) {
    constraints.push(
      `Tool Choice: ${JSON.stringify(raRequestData.tool_choice)}`,
    );
  }

  if ('function_call' in raRequestData && raRequestData.function_call) {
    constraints.push(
      `Function Call: ${JSON.stringify(raRequestData.function_call)}`,
    );
  }

  // Extract reasoning configuration
  if ('reasoning_effort' in raRequestData && raRequestData.reasoning_effort) {
    constraints.push(`Reasoning Effort: ${raRequestData.reasoning_effort}`);
  }

  if ('reasoning' in raRequestData && raRequestData.reasoning) {
    constraints.push(
      `Reasoning Config: ${JSON.stringify(raRequestData.reasoning)}`,
    );
  }

  // Extract sampling parameters
  if (
    'temperature' in raRequestData &&
    raRequestData.temperature !== undefined
  ) {
    constraints.push(`Temperature: ${raRequestData.temperature}`);
  }

  if ('max_tokens' in raRequestData && raRequestData.max_tokens) {
    constraints.push(`Max Tokens: ${raRequestData.max_tokens}`);
  }

  if ('max_output_tokens' in raRequestData && raRequestData.max_output_tokens) {
    constraints.push(`Max Output Tokens: ${raRequestData.max_output_tokens}`);
  }

  // Extract other constraints
  if ('stop' in raRequestData && raRequestData.stop) {
    constraints.push(`Stop Sequences: ${JSON.stringify(raRequestData.stop)}`);
  }

  return constraints.length > 0
    ? `\n\nRequest Constraints:\n${constraints.join('\n')}`
    : '';
}

/**
 * Converts a log into a conversation string with input, output, and request constraints
 */
function generateExampleConversations(logs: Log[]): string[] {
  return logs
    .map((log) => {
      try {
        const raRequestData = produceReactiveAgentsRequestData(
          log.ai_provider_request_log.method,
          log.ai_provider_request_log.request_url,
          {},
          log.ai_provider_request_log.request_body,
        );
        const responseBody = ReactiveAgentsResponseBody.parse(
          log.ai_provider_request_log.response_body,
        );

        const messages = extractMessagesFromRequestData(
          raRequestData as
            | ChatCompletionRequestData
            | StreamChatCompletionRequestData
            | ResponsesRequestData,
        );
        const input = formatMessagesForExtraction(messages);
        const output = extractOutputFromResponseBody(responseBody);
        const constraints = extractRequestConstraints(
          raRequestData as
            | ChatCompletionRequestData
            | StreamChatCompletionRequestData
            | ResponsesRequestData,
        );

        return `${input}${constraints}\n\nAssistant: ${output}`;
      } catch (e) {
        error(
          `[OPTIMIZER] Failed to extract conversation from log ${log.id}:`,
          e,
        );
        return '';
      }
    })
    .filter((conversation) => conversation !== '');
}

async function autoGenerateSystemPromptsForCluster(
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  cluster: SkillOptimizationCluster,
  minRequestsPerArm: number,
  numberOfSystemPrompts: number,
  agentDescription: string,
  skillDescription: string,
) {
  const clusterArms = await userDataStorageConnector.getSkillOptimizationArms({
    skill_id: cluster.skill_id,
    cluster_id: cluster.id,
  });

  if (clusterArms.length === 0) {
    throw new Error(`No arms found for cluster ${cluster.id}`);
  }

  // We have already optimized this cluster as much as possible
  if (clusterArms.length === 1) {
    return;
  }

  // Check that all arms have been used at least minRequestsPerArm times
  const armUsageCounts = clusterArms.reduce(
    (acc, arm) => {
      acc[arm.id] = arm.stats.n;
      return acc;
    },
    {} as Record<string, number>,
  );

  const thresholdMetArms = Object.values(armUsageCounts).every(
    (count) => count >= minRequestsPerArm,
  );

  // Minimum number of requests per arm not yet met for all arms
  if (!thresholdMetArms) {
    return;
  }

  const logExampleCount = 15;
  const logs = await logsStorageConnector.getLogs({
    skill_id: cluster.skill_id,
    cluster_id: cluster.id,
    // Since the embedding is not null, we can assume that the logs are valid
    // and are for one of the allowed function names
    embedding_not_null: true,
    limit: logExampleCount,
  });

  const examplesConversations = generateExampleConversations(logs);

  // Find best and worst performing arms
  const bestArm = clusterArms.reduce((best, current) => {
    return current.stats.mean > best.stats.mean ? current : best;
  });

  const worstArm = clusterArms.reduce((worst, current) => {
    return current.stats.mean < worst.stats.mean ? current : worst;
  });

  // Filter out the worst arm - we won't recreate it with new prompts
  const armsToKeep = clusterArms.filter((arm) => arm.id !== worstArm.id);

  // Reset total steps for the cluster
  await userDataStorageConnector.updateSkillOptimizationCluster(cluster.id, {
    total_steps: 0,
  });

  const systemPromptPromises = [];
  for (let i = 0; i < numberOfSystemPrompts; i++) {
    systemPromptPromises.push(
      generateReflectiveSystemPromptForSkill(
        bestArm.params.system_prompt,
        examplesConversations,
        agentDescription,
        skillDescription,
      ),
    );
  }

  const systemPrompts = await Promise.all(systemPromptPromises);

  // Group arms to keep by their system prompt
  const armsGroupedBySystemPrompt = armsToKeep.reduce(
    (acc, arm) => {
      const systemPrompt = arm.params.system_prompt;
      if (!acc[systemPrompt]) {
        acc[systemPrompt] = [];
      }
      acc[systemPrompt].push(arm);
      return acc;
    },
    {} as Record<string, typeof armsToKeep>,
  );

  // Get unique system prompts (excluding worst arm's prompt if it was unique)
  const uniqueSystemPrompts = Object.keys(armsGroupedBySystemPrompt);

  // Map each old system prompt to a new one
  const systemPromptMapping: Record<string, string> = {};
  uniqueSystemPrompts.forEach((oldPrompt, index) => {
    // Cycle through new prompts if we have more unique prompts than new ones
    const newPromptIndex = index % systemPrompts.length;
    systemPromptMapping[oldPrompt] = systemPrompts[newPromptIndex];
  });

  // Create new arms only for the arms we're keeping (excluding worst arm)
  // Preserve all params (model_id, temperature, etc.) except system_prompt
  const createParamsList: SkillOptimizationArmCreateParams[] = [];

  for (const arm of armsToKeep) {
    const oldSystemPrompt = arm.params.system_prompt;
    const newSystemPrompt = systemPromptMapping[oldSystemPrompt];

    createParamsList.push({
      agent_id: arm.agent_id,
      skill_id: arm.skill_id,
      cluster_id: arm.cluster_id,
      name: arm.name, // Keep the same name
      params: {
        ...arm.params, // Preserves model_id and all other parameters
        system_prompt: newSystemPrompt, // Only replace the system prompt
      },
      stats: {
        n: 0,
        mean: 0,
        n2: 0,
        total_reward: 0,
      },
    });
  }

  // Delete old arms for this cluster only
  await userDataStorageConnector.deleteSkillOptimizationArmsForCluster(
    cluster.id,
  );

  await userDataStorageConnector.createSkillOptimizationArms(createParamsList);
}

export async function autoGenerateSystemPromptsForSkill(
  functionName: FunctionName,
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  skill: Skill,
) {
  // Only attempt to optimize for specific endpoints
  if (
    !(
      functionName === FunctionName.CHAT_COMPLETE ||
      functionName === FunctionName.STREAM_CHAT_COMPLETE ||
      functionName === FunctionName.CREATE_MODEL_RESPONSE
    )
  ) {
    return;
  }

  const skillClusters =
    await userDataStorageConnector.getSkillOptimizationClusters({
      skill_id: skill.id,
    });

  if (!skillClusters) {
    throw new Error('Skill clusters not found');
  }

  const minRequestsPerArm = skill.reflection_min_requests_per_arm;
  const numberOfSystemPrompts = skill.system_prompt_count;

  // Fetch the agent information for context
  const agents = await userDataStorageConnector.getAgents({
    id: skill.agent_id,
  });

  if (agents.length === 0) {
    throw new Error(`Agent with id ${skill.agent_id} not found`);
  }

  const agent = agents[0];

  for (const cluster of skillClusters) {
    await autoGenerateSystemPromptsForCluster(
      userDataStorageConnector,
      logsStorageConnector,
      cluster,
      minRequestsPerArm,
      numberOfSystemPrompts,
      agent.description,
      skill.description,
    );
  }
}
