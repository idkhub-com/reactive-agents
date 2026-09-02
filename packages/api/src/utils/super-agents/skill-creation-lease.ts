import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { warn } from '@shared/console-logging';
import type { Agent } from '@shared/types/data';

/**
 * How long a lease lasts, and how long a request waits for one. Longer than
 * creating a skill takes, the `describe-skill` call included (that client is
 * given a timeout for this reason), so a lease outlives its work; short
 * enough that a holder that died does not hold everyone up for long. Work
 * that does more under the lease -- routing asks the arbiter there, with a
 * timeout of the user's choosing -- passes a longer duration.
 */
export const SKILL_CREATION_LEASE_MS = 45_000;
const POLL_INTERVAL_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Claims the agent's lease as `holder`, waiting for the current holder to
 * finish if there is one. Answers whether it got the lease, or gave up after
 * waiting a whole lease's worth.
 */
async function claimLease(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  holder: string,
  leaseMs: number,
): Promise<boolean> {
  const deadline = Date.now() + leaseMs;
  for (;;) {
    const now = new Date();
    const until = new Date(now.getTime() + leaseMs).toISOString();
    if (
      await connector.claimSkillCreationLease(
        c,
        agent.id,
        holder,
        now.toISOString(),
        until,
      )
    ) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

/**
 * Runs `work` while holding the agent's skill-creation lease, so that only
 * one request at a time creates a skill for the agent -- across processes,
 * since the lease is a row in storage. A request that finds the lease taken
 * waits for it; `work` is expected to look at the agent's skills again once
 * it runs, because the previous holder may have created the very skill this
 * request needs.
 *
 * Waiting has a limit, after which the request goes ahead without the lease:
 * a duplicate skill is a smaller failure than a request that never returns,
 * and same-name races are handled where the skill is created.
 *
 * `leaseMs` is how long the lease lasts and how long a request waits for one;
 * it has to outlast everything `work` does.
 */
export async function withSkillCreationLease<T>(
  c: AppContext,
  connector: UserDataStorageConnector,
  agent: Agent,
  work: () => Promise<T>,
  leaseMs: number = SKILL_CREATION_LEASE_MS,
): Promise<T> {
  // Coined per claim, so this request recognises its own lease and releases
  // only that -- not one a later claimant took after this one expired.
  const holder = crypto.randomUUID();
  if (!(await claimLease(c, connector, agent, holder, leaseMs))) {
    warn(
      `[SKILL_CREATION] Waited ${leaseMs}ms for the skill-creation lease of agent ${agent.name}; going ahead without it`,
    );
    return work();
  }
  try {
    return await work();
  } finally {
    try {
      await connector.releaseSkillCreationLease(c, agent.id, holder);
    } catch (e) {
      // It expires on its own; the next claimant only waits a little longer.
      warn(
        `[SKILL_CREATION] Could not release the skill-creation lease of agent ${agent.name}:`,
        e,
      );
    }
  }
}
