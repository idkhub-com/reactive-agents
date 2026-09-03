'use client';

import { Button } from '@web/components/ui/button';
import { Separator } from '@web/components/ui/separator';
import { cn } from '@web/utils/ui/utils';
import { ChevronDown, ChevronRight, CopyIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';

/** How much of the body the header shows in place of it while collapsed. */
const PREVIEW_LENGTH = 200;

/** A one-line stand-in for a body that may be thousands of characters long. */
export function previewOf(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH);
}

export interface MessageCardProps {
  /** Left-hand header label: who the turn belongs to. */
  label?: ReactNode;
  /** Right-hand header label: what the body is -- `Text`, `Function Call`. */
  kind?: ReactNode;
  /** Copied verbatim by the header button; without it there is no button. */
  copyValue?: string;
  /**
   * `response` tints the card, which is how the agent's own answer is told
   * apart from the messages that were sent to it.
   */
  variant?: 'default' | 'response';
  defaultCollapsed?: boolean;
  /** Shown in the header in place of the body while collapsed. */
  preview?: string;
  /** Rendered under the header row, inside the header's border. */
  headerExtra?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * The shell every message in the log view shares: a header naming the turn,
 * and a body that collapses away, since a system prompt is otherwise several
 * screens of scrolling between the reader and the conversation.
 */
export function MessageCard({
  label,
  kind,
  copyValue,
  variant = 'default',
  defaultCollapsed = false,
  preview,
  headerExtra,
  className,
  children,
}: MessageCardProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const isResponse = variant === 'response';

  return (
    <div
      className={cn(
        'flex flex-col h-fit w-full gap-2 border rounded-lg overflow-hidden shrink-0 bg-card',
        isResponse &&
          'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-400/10',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center border-b',
          isResponse &&
            'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-400/10',
          isCollapsed && 'border-b-0',
        )}
      >
        <div className="flex flex-row gap-2 w-full justify-between items-center h-10 px-2">
          <button
            type="button"
            aria-expanded={!isCollapsed}
            onClick={(): void => setIsCollapsed((collapsed) => !collapsed)}
            className="flex flex-row gap-2 flex-1 min-w-0 items-center h-full text-left cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {label}
            {kind && (
              <>
                <Separator orientation="vertical" />
                <div className="text-sm font-normal shrink-0">{kind}</div>
              </>
            )}
            {isCollapsed && preview && (
              <span className="text-xs text-muted-foreground truncate">
                {preview}
              </span>
            )}
          </button>
          {copyValue !== undefined && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(): void => {
                navigator.clipboard.writeText(copyValue);
              }}
            >
              <CopyIcon size={16} />
            </Button>
          )}
        </div>
        {!isCollapsed && headerExtra}
      </div>
      {!isCollapsed && children}
    </div>
  );
}
