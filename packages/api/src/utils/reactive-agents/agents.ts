import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import type { Agent } from '@shared/types/data/agent';

export async function getAgent(
  c: AppContext,
  userDataStorageConnector: UserDataStorageConnector,
  agentName: string,
): Promise<Agent | null> {
  const agents = await userDataStorageConnector.getAgents(c, {
    name: agentName,
  });
  if (agents.length > 0) {
    return agents[0];
  } else {
    if (agentName === 'reactive-agents') {
      // Auto create the reactive-agents agent if it doesn't exist
      const newAgent = await userDataStorageConnector.createAgent(c, {
        name: agentName,
        description: 'The Reactive Agents internal agent',
        metadata: {},
      });
      return newAgent;
    }
    return null;
  }
}
