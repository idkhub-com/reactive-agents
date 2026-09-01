'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFeedback,
  deleteFeedback,
  getFeedback,
} from '@web/api/v1/super-agents/feedbacks';
import { Button } from '@web/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@web/components/ui/tooltip';
import { useToast } from '@web/hooks/use-toast';
import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Thumbs up / thumbs down on one log. This is an evaluation, but a special
 * one: the verdict is stored as feedback (score 1 or 0) and the server
 * re-runs every evaluation of the log with the judges told a human verified
 * the output as good or bad, so their scores and reasoning get re-anchored.
 * Pressing the same thumb again withdraws the feedback.
 */
export function LogFeedback({ logId }: { logId: string }): ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbackList = [] } = useQuery({
    queryKey: ['feedback', logId],
    queryFn: () => getFeedback({ log_id: logId }),
  });
  const existing = feedbackList[0];
  const currentVerdict =
    existing === undefined ? null : existing.score >= 0.5 ? 'good' : 'bad';

  const mutation = useMutation({
    mutationFn: async (verdict: 'good' | 'bad') => {
      // One verdict per log: pressing the other thumb replaces it, pressing
      // the same thumb withdraws it.
      for (const feedback of feedbackList) {
        await deleteFeedback(feedback.id);
      }
      if (verdict === currentVerdict) {
        return null;
      }
      return await createFeedback({
        log_id: logId,
        score: verdict === 'good' ? 1 : 0,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', logId] });
      if (created) {
        toast({
          title:
            created.score >= 0.5
              ? 'Marked as a good output'
              : 'Marked as a bad output',
          description:
            'Re-running the evaluations with your verdict as context.',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Could not save feedback',
        description: 'Please try again later',
      });
    },
  });

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentVerdict === 'good' ? 'default' : 'outline'}
              size="icon"
              aria-label="Good output"
              aria-pressed={currentVerdict === 'good'}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate('good')}
            >
              <ThumbsUpIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Verify as a good output and re-run the evaluations with that
              context
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentVerdict === 'bad' ? 'destructive' : 'outline'}
              size="icon"
              aria-label="Bad output"
              aria-pressed={currentVerdict === 'bad'}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate('bad')}
            >
              <ThumbsDownIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Verify as a bad output and re-run the evaluations with that
              context
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
