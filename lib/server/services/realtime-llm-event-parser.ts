import {
  type RealtimeConversationItem,
  type RealtimeEvent,
  RealtimeEventTypes,
  type RealtimeResponse,
  type RealtimeSessionOptions,
  type RealtimeSessionState,
} from '@shared/types/realtime';
import type { Context } from 'hono';

export class RealtimeLlmEventParser {
  private sessionState: RealtimeSessionState;

  constructor() {
    this.sessionState = {
      sessionDetails: null,
      conversation: {
        items: new Map<string, RealtimeConversationItem>(),
      },
      responses: new Map<string, RealtimeResponse>(),
    };
  }

  // Main entry point for processing events
  handleEvent(
    c: Context,
    event: RealtimeEvent,
    sessionOptions: RealtimeSessionOptions,
  ): void {
    switch (event.type) {
      case RealtimeEventTypes.SESSION_CREATED:
        this.handleSessionCreated(c, event, sessionOptions);
        break;
      case RealtimeEventTypes.SESSION_UPDATED:
        this.handleSessionUpdated(c, event, sessionOptions);
        break;
      case RealtimeEventTypes.CONVERSATION_ITEM_CREATED:
        this.handleConversationItemCreated(c, event);
        break;
      case RealtimeEventTypes.CONVERSATION_ITEM_DELETED:
        this.handleConversationItemDeleted(c, event);
        break;
      case RealtimeEventTypes.RESPONSE_DONE:
        this.handleResponseDone(c, event, sessionOptions);
        break;
      case RealtimeEventTypes.ERROR:
        this.handleError(c, event, sessionOptions);
        break;
      default:
        break;
    }
  }

  // Handle SESSION_CREATED event
  private handleSessionCreated(
    c: Context,
    event: RealtimeEvent,
    sessionOptions: RealtimeSessionOptions,
  ): void {
    this.sessionState.sessionDetails = { ...event.session };
    const realtimeEventParser = c.get('realtimeEventParser');
    if (realtimeEventParser) {
      c.executionCtx.waitUntil(
        realtimeEventParser(
          c,
          sessionOptions,
          {},
          { ...event.session },
          event.type,
        ),
      );
    }
  }

  // Handle SESSION_UPDATED event
  private handleSessionUpdated(
    c: Context,
    event: RealtimeEvent,
    sessionOptions: RealtimeSessionOptions,
  ): void {
    this.sessionState.sessionDetails = { ...event.session };
    const realtimeEventParser = c.get('realtimeEventParser');
    if (realtimeEventParser) {
      c.executionCtx.waitUntil(
        realtimeEventParser(
          c,
          sessionOptions,
          {},
          { ...event.session },
          event.type,
        ),
      );
    }
  }

  // Conversation-specific handlers
  private handleConversationItemCreated(
    _c: Context,
    event: RealtimeEvent,
  ): void {
    const { item } = event;
    this.sessionState.conversation.items.set(item.id as string, item);
  }

  private handleConversationItemDeleted(
    _c: Context,
    event: RealtimeEvent,
  ): void {
    this.sessionState.conversation.items.delete(event.item.id as string);
  }

  private handleResponseDone(
    c: Context,
    event: RealtimeEvent,
    sessionOptions: RealtimeSessionOptions,
  ): void {
    const { response } = event;
    this.sessionState.responses.set(response.id, response);
    for (const item of response.output) {
      const inProgressItem = this.sessionState.conversation.items.get(item.id);

      if (!inProgressItem) {
        console.error(`inProgressItem not found for item ${item.id}`);
        continue;
      }

      const updatedItem: RealtimeConversationItem = {
        ...inProgressItem,
        item,
      };

      this.sessionState.conversation.items.set(item.id, updatedItem);
    }
    const realtimeEventParser = c.get('realtimeEventParser');
    if (realtimeEventParser) {
      const itemSequence = this.rebuildConversationSequence(
        this.sessionState.conversation.items,
      );
      c.executionCtx.waitUntil(
        realtimeEventParser(
          c,
          sessionOptions,
          {
            conversation: {
              items: this.getOrderedConversationItems(itemSequence).slice(
                0,
                -1,
              ),
            },
          },
          event,
          event.type,
        ),
      );
    }
  }

  private handleError(
    c: Context,
    data: Record<string, unknown>,
    sessionOptions: RealtimeSessionOptions,
  ): void {
    const realtimeEventParser = c.get('realtimeEventParser');
    if (realtimeEventParser) {
      c.executionCtx.waitUntil(
        realtimeEventParser(c, sessionOptions, {}, data, data.type),
      );
    }
  }

  private rebuildConversationSequence(
    items: Map<string, RealtimeConversationItem>,
  ): string[] {
    const orderedItemIds: string[] = [];

    // Find the first item (no previous_item_id)
    let currentId: string | undefined = Array.from(items.values()).find(
      (data) => data.previous_item_id === null,
    )?.item?.id;

    // Traverse through the chain using previous_item_id
    while (currentId) {
      orderedItemIds.push(currentId);
      const nextItem = Array.from(items.values()).find(
        (data) => data.previous_item_id === currentId,
      );
      currentId = nextItem?.item?.id;
    }

    return orderedItemIds;
  }

  private getOrderedConversationItems(
    sequence: string[],
  ): RealtimeConversationItem[] {
    return sequence.map((id) => this.sessionState.conversation.items.get(id)!);
  }
}
