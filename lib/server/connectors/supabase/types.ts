import { z } from 'zod';

export const DatasetLogBridge = z.object({
  dataset_id: z.uuid(),
  log_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});
export type DatasetLogBridge = z.infer<typeof DatasetLogBridge>;

export const DatasetLogBridgeCreateParams = z
  .object({
    dataset_id: z.uuid(),
    log_id: z.uuid(),
  })
  .strict();

export type DatasetLogBridgeCreateParams = z.infer<
  typeof DatasetLogBridgeCreateParams
>;
