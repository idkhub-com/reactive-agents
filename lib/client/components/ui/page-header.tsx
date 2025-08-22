'use client';

import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
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
    <Card className="mx-4 mb-4 border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
