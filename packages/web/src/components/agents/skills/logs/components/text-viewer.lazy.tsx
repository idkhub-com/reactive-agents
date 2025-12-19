'use client';

import { Skeleton } from '@web/components/ui/skeleton';
import { cn } from '@web/utils/ui/utils';
import { type ComponentProps, lazy, Suspense } from 'react';

const TextViewerImpl = lazy(() =>
  import('./text-viewer').then((m) => ({ default: m.TextViewer })),
);

type TextViewerProps = ComponentProps<typeof TextViewerImpl>;

function TextViewerFallback({ className }: { className?: string }) {
  return (
    <div className={cn('w-full min-h-[100px] p-2', className)}>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function LazyTextViewer(props: TextViewerProps) {
  return (
    <Suspense fallback={<TextViewerFallback className={props.className} />}>
      <TextViewerImpl {...props} />
    </Suspense>
  );
}
