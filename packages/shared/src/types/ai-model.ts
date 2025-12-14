import { z } from 'zod';

export const GatewayModel = z.object({
  id: z.string(),
  object: z.string(),
  provider: z.object({
    id: z.string(),
  }),
  name: z.string(),
});

export type GatewayModel = z.infer<typeof GatewayModel>;
