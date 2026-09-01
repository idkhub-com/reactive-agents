import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import {
  SKILL_CREATION_LEASE_MS,
  withSkillCreationLease,
} from '@api/utils/super-agents/skill-creation-lease';
import { warn } from '@shared/console-logging';
import type { Agent } from '@shared/types/data';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';

vi.mock('@shared/console-logging', () => ({ warn: vi.fn() }));

const c = {} as AppContext;
const agent = { id: 'agent-1', name: 'helper' } as Agent;

describe('withSkillCreationLease', () => {
  let connector: {
    claimSkillCreationLease: Mock;
    releaseSkillCreationLease: Mock;
  };

  const hold = <T>(work: () => Promise<T>) =>
    withSkillCreationLease(
      c,
      connector as unknown as UserDataStorageConnector,
      agent,
      work,
    );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T10:00:00.000Z'));
    connector = {
      claimSkillCreationLease: vi.fn().mockResolvedValue(true),
      releaseSkillCreationLease: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the work between claiming and releasing the lease', async () => {
    const order: string[] = [];
    connector.claimSkillCreationLease.mockImplementation(() => {
      order.push('claim');
      return Promise.resolve(true);
    });
    connector.releaseSkillCreationLease.mockImplementation(() => {
      order.push('release');
      return Promise.resolve();
    });

    const result = await hold(() => {
      order.push('work');
      return Promise.resolve('done');
    });

    expect(result).toBe('done');
    expect(order).toEqual(['claim', 'work', 'release']);
    expect(connector.claimSkillCreationLease).toHaveBeenCalledWith(
      c,
      'agent-1',
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      '2026-08-29T10:00:00.000Z',
      new Date(
        Date.parse('2026-08-29T10:00:00.000Z') + SKILL_CREATION_LEASE_MS,
      ).toISOString(),
    );
    expect(connector.releaseSkillCreationLease).toHaveBeenCalledWith(
      c,
      'agent-1',
      connector.claimSkillCreationLease.mock.calls[0][2],
    );
  });

  it('waits for the holder to finish', async () => {
    connector.claimSkillCreationLease
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const work = vi.fn().mockResolvedValue('done');

    const pending = hold(work);
    await vi.advanceTimersByTimeAsync(250);
    expect(work).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);

    expect(await pending).toBe('done');
    expect(connector.claimSkillCreationLease).toHaveBeenCalledTimes(3);
    // Each attempt claims from its own moment, as the same holder.
    const [first, , third] = connector.claimSkillCreationLease.mock.calls;
    expect(third[3] > first[3]).toBe(true);
    expect(third[2]).toBe(first[2]);
  });

  it('goes ahead without the lease after waiting a whole lease', async () => {
    connector.claimSkillCreationLease.mockResolvedValue(false);
    const work = vi.fn().mockResolvedValue('done');

    const pending = hold(work);
    await vi.advanceTimersByTimeAsync(SKILL_CREATION_LEASE_MS + 250);

    expect(await pending).toBe('done');
    expect(connector.releaseSkillCreationLease).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('going ahead without it'),
    );
  });

  it('releases the lease when the work fails', async () => {
    await expect(
      hold(() => Promise.reject(new Error('storage'))),
    ).rejects.toThrow('storage');

    expect(connector.releaseSkillCreationLease).toHaveBeenCalledTimes(1);
  });

  it('does not fail the work over a release that fails', async () => {
    connector.releaseSkillCreationLease.mockRejectedValue(new Error('gone'));

    await expect(hold(() => Promise.resolve('done'))).resolves.toBe('done');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not release'),
      expect.any(Error),
    );
  });
});
