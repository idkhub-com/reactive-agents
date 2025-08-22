import { z } from 'zod';

export const DatasetDataPointBridge = z.object({
  dataset_id: z.string().uuid(),
  data_point_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
});
export type DatasetDataPointBridge = z.infer<typeof DatasetDataPointBridge>;

export const DatasetDataPointBridgeCreateParams = z
  .object({
    dataset_id: z.string().uuid(),
    data_point_id: z.string().uuid(),
  })
  .strict();

export type DatasetDataPointBridgeCreateParams = z.infer<
  typeof DatasetDataPointBridgeCreateParams
>;
