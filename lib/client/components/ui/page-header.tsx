'use client';

import { Button } from '@client/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

interface PageHeaderProps {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function PageHeader({
  title,
  description,
  actions,
  showBackButton = true,
  onBack,
}: PageHeaderProps): ReactElement {
  const router = useRouter();

  const handleBack = () => {
    try {
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Silently handle navigation errors
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-background">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-9 w-9 p-0 hover:bg-accent shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground m-0 shrink-0">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground m-0 truncate">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
