import { IdkTarget } from '@shared/types/api/request/headers';
import { z } from 'zod';

export const RealtimeSession = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  provider: z.string(),
  model: z.string(),
});

export type RealtimeSession = z.infer<typeof RealtimeSession>;

interface RealtimeConversationItemType {
  id: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  role: string;
  previous_item_id: string | null;
  item?: RealtimeConversationItemType;
}

export const RealtimeConversationItem: z.ZodType<RealtimeConversationItemType> =
  z.lazy(() =>
    z.object({
      id: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      content: z.string(),
      role: z.string(),
      previous_item_id: z.string().nullable(),
      item: z.lazy(() => RealtimeConversationItem).optional(),
    }),
  );

export type RealtimeConversationItem = z.infer<typeof RealtimeConversationItem>;

export const RealtimeConversation = z.object({
  items: z.map(z.string(), RealtimeConversationItem),
});

export type RealtimeConversation = z.infer<typeof RealtimeConversation>;

export const RealtimeResponse = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  output: z.array(RealtimeConversationItem),
});

export type RealtimeResponse = z.infer<typeof RealtimeResponse>;

export const RealtimeResponses = z.map(z.string(), RealtimeResponse);

export type RealtimeResponses = z.infer<typeof RealtimeResponses>;

export const RealtimeSessionState = z.object({
  sessionDetails: RealtimeSession.nullable(),
  conversation: RealtimeConversation,
  responses: RealtimeResponses,
});

export type RealtimeSessionState = z.infer<typeof RealtimeSessionState>;

export const RealtimeAIProviderOptions = z.intersection(
  IdkTarget,
  z.object({
    requestURL: z.string(),
    rubeusURL: z.string(),
  }),
);

export type RealtimeAIProviderOptions = z.infer<
  typeof RealtimeAIProviderOptions
>;

export const RealtimeSessionOptions = z.object({
  id: z.string().uuid(),
  providerOptions: RealtimeAIProviderOptions,
  requestHeaders: z.record(z.string(), z.string()),
  requestParams: z.record(z.string(), z.string()),
});

export type RealtimeSessionOptions = z.infer<typeof RealtimeSessionOptions>;

export enum RealtimeEventTypes {
  SESSION_CREATED = 'session.created',
  SESSION_UPDATED = 'session.updated',
  CONVERSATION_ITEM_CREATED = 'conversation.item.created',
  CONVERSATION_ITEM_DELETED = 'conversation.item.deleted',
  RESPONSE_DONE = 'response.done',
  ERROR = 'error',
}

export const RealtimeEvent = z
  .object({
    type: z.nativeEnum(RealtimeEventTypes),
    session: RealtimeSession,
    item: RealtimeConversationItem,
    response: RealtimeResponse,
    error: z.unknown().nullable(),
  })
  .catchall(z.unknown());

export type RealtimeEvent = z.infer<typeof RealtimeEvent>;
