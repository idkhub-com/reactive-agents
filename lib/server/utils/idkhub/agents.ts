import type { UserDataStorageConnector } from '@server/types/connector';
import type { Agent } from '@shared/types/data/agent';

export async function getAgent(
  userDataStorageConnector: UserDataStorageConnector,
  agentName: string,
): Promise<Agent | null> {
  const agents = await userDataStorageConnector.getAgents({
    name: agentName,
  });
  if (agents.length > 0) {
    return agents[0];
  } else {
    // Auto create the idkhub agent if it doesn't exist
    const newAgent = await userDataStorageConnector.createAgent({
      name: agentName,
      description: 'The idkHub internal agent',
      metadata: {},
    });
    return newAgent;
  }
}
