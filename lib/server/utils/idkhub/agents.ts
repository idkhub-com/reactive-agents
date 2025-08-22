import type { UserDataStorageConnector } from '@server/types/connector';
import type { Agent } from '@shared/types/data/agent';

export async function getOrCreateAgent(
  userDataStorageConnector: UserDataStorageConnector,
  agentName: string,
): Promise<Agent> {
  const agents = await userDataStorageConnector.getAgents({
    name: agentName,
  });
  if (agents.length > 0) {
    return agents[0];
  } else {
    const newAgent = await userDataStorageConnector.createAgent({
      name: agentName,
      metadata: {},
    });
    return newAgent;
  }
}
