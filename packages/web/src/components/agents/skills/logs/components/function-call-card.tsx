'use client';

import {
  MessageCard,
  previewOf,
} from '@web/components/agents/skills/logs/components/message-card';
import { Badge } from '@web/components/ui/badge';
import { Wrench } from 'lucide-react';

/**
 * A tool call, whether it is one the agent just made -- `variant="response"`
 * -- or one replayed from an earlier turn of the conversation.
 */
export function FunctionCallCard({
  name,
  callId,
  args,
  variant = 'default',
}: {
  name: string;
  callId: string;
  args: unknown;
  variant?: 'default' | 'response';
}): React.ReactElement {
  const formattedArgs =
    typeof args === 'string' ? args : JSON.stringify(args, null, 2);

  return (
    <MessageCard
      label={<div className="text-sm font-normal">Assistant</div>}
      kind="Function Call"
      copyValue={formattedArgs}
      variant={variant}
      preview={`${name} ${previewOf(formattedArgs)}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-blue-600" />
          <Badge variant="secondary" className="font-mono text-xs">
            {name}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {callId}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mb-2">Arguments:</div>
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
          {formattedArgs}
        </pre>
      </div>
    </MessageCard>
  );
}
