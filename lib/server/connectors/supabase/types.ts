import { z } from 'zod';

export const DatasetDataPointBridge = z.object({
  dataset_id: z.uuid(),
  data_point_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});
export type DatasetDataPointBridge = z.infer<typeof DatasetDataPointBridge>;

export const DatasetDataPointBridgeCreateParams = z
  .object({
    dataset_id: z.uuid(),
    data_point_id: z.uuid(),
  })
  .strict();

export type DatasetDataPointBridgeCreateParams = z.infer<
  typeof DatasetDataPointBridgeCreateParams
>;
