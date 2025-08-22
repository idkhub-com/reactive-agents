'use client';

import { Badge } from '@client/components/ui/badge';
import { Separator } from '@client/components/ui/separator';
import { cn } from '@client/utils/ui/utils';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import type { ReactElement } from 'react';

export function StatusBadge({
  log,
  score,
}: {
  log: IdkRequestLog;
  score: number | null;
}): ReactElement {
  const bgColor = (color: string): string => {
    let className: string;
    if (color === 'green') {
      className = 'bg-green-50 dark:bg-green-900';
    } else if (color === 'yellow') {
      className = 'bg-yellow-50 dark:bg-yellow-900';
    } else {
      className = 'bg-red-100 dark:bg-red-900';
    }
    return className;
  };

  const textColor = (color: string): string => {
    let className: string;
    if (color === 'green') {
      className = 'text-green-600 dark:text-green-300';
    } else if (color === 'yellow') {
      className = 'text-yellow-600 dark:text-yellow-300';
    } else {
      className = 'text-red-600 dark:text-red-300';
    }
    return className;
  };

  const getBorderColor = (
    status: IdkRequestLog['status'],
    score: number | null,
  ): string => {
    const statusPassed = status >= 200 && status < 300;
    const scorePassed = score === null || score >= 0.9;

    let className: string;
    if (statusPassed && scorePassed) {
      className = 'border-green-200 dark:border-green-400';
    } else {
      className = 'border-red-200 dark:border-red-400';
    }
    return className;
  };

  const getSeparatorColor = (
    status: IdkRequestLog['status'],
    score: number | null,
  ): string => {
    const statusPassed = status >= 200 && status < 300;
    const scorePassed = score === null || score >= 0.9;

    let className: string;
    if (statusPassed && scorePassed) {
      className = 'bg-green-200';
    } else {
      className = 'bg-red-200';
    }
    return className;
  };

  const getStatusBackgroundColor = (
    status: IdkRequestLog['status'],
  ): string => {
    if (status >= 200 && status < 300) {
      return bgColor('green');
    } else if (status >= 400) {
      return bgColor('red');
    } else {
      return bgColor('yellow');
    }
  };

  const getStatusTextColor = (status: IdkRequestLog['status']): string => {
    if (status >= 200 && status < 300) {
      return textColor('green');
    } else if (status >= 400) {
      return textColor('red');
    } else {
      return textColor('yellow');
    }
  };

  const getScoreTextColor = (score: number | null): string => {
    if (score === null) {
      return '';
    }

    if (score >= 0.9) {
      return textColor('green');
    } else if (score >= 0.5) {
      return textColor('yellow');
    } else {
      return textColor('red');
    }
  };

  const getScoreBackgroundColor = (score: number | null): string => {
    if (score === null) {
      return '';
    }
    if (score >= 0.9) {
      return bgColor('green');
    } else if (score >= 0.5) {
      return bgColor('yellow');
    } else {
      return bgColor('red');
    }
  };

  // Function to format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 1000 * 60) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    const minutes = ms / 1000 / 60;
    const seconds = (ms / 1000) % 60;
    return `${minutes.toFixed(0)}m ${seconds.toFixed(0)}s`;
  };

  // Function to format score
  const formatScore = (score: number | null): string => {
    if (score === null) {
      return ' - ';
    }
    return score.toFixed(2);
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        getStatusBackgroundColor(log.status),
        getStatusTextColor(log.status),
        getBorderColor(log.status, score),
        'truncate font-normal overflow-hidden h-5 p-0 border',
      )}
    >
      <span className="px-1">{formatDuration(log.duration)}</span>
      {score !== null && (
        <>
          <Separator
            orientation="vertical"
            className={cn(getSeparatorColor(log.status, score))}
          />
          <span
            className={cn(
              getScoreTextColor(score),
              getScoreBackgroundColor(score),
              'px-1',
            )}
          >
            {formatScore(score)}
          </span>
        </>
      )}
    </Badge>
  );
}
