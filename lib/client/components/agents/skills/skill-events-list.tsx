'use client';

import { Badge } from '@client/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSkillEvents } from '@client/providers/skill-events';
import { SkillEventType } from '@shared/types/data/skill-event';
import {
  CalendarIcon,
  CheckCircle2Icon,
  FileEditIcon,
  LayersIcon,
  PlusIcon,
  RefreshCwIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  XIcon,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

interface SkillEventsListProps {
  skillId: string;
}

const EVENT_TYPE_CONFIG: Record<
  SkillEventType,
  { label: string; icon: typeof PlusIcon; color: string }
> = {
  [SkillEventType.MODEL_ADDED]: {
    label: 'Model Added',
    icon: PlusIcon,
    color: 'bg-green-100 text-green-800',
  },
  [SkillEventType.MODEL_REMOVED]: {
    label: 'Model Removed',
    icon: XIcon,
    color: 'bg-red-100 text-red-800',
  },
  [SkillEventType.REFLECTION]: {
    label: 'Reflection',
    icon: RefreshCwIcon,
    color: 'bg-blue-100 text-blue-800',
  },
  [SkillEventType.EVALUATION_ADDED]: {
    label: 'Evaluation Added',
    icon: PlusIcon,
    color: 'bg-green-100 text-green-800',
  },
  [SkillEventType.EVALUATION_REMOVED]: {
    label: 'Evaluation Removed',
    icon: XIcon,
    color: 'bg-red-100 text-red-800',
  },
  [SkillEventType.EVALUATION_REGENERATED]: {
    label: 'Evaluation Regenerated',
    icon: LayersIcon,
    color: 'bg-purple-100 text-purple-800',
  },
  [SkillEventType.PARTITION_RESET]: {
    label: 'Partition Reset',
    icon: RefreshCwIcon,
    color: 'bg-orange-100 text-orange-800',
  },
  [SkillEventType.DESCRIPTION_UPDATED]: {
    label: 'Description Updated',
    icon: FileEditIcon,
    color: 'bg-blue-100 text-blue-800',
  },
  [SkillEventType.PARTITIONS_RECLUSTERED]: {
    label: 'Partitions Reclustered',
    icon: LayersIcon,
    color: 'bg-purple-100 text-purple-800',
  },
  [SkillEventType.OPTIMIZATION_ENABLED]: {
    label: 'Optimization Enabled',
    icon: ToggleRightIcon,
    color: 'bg-green-100 text-green-800',
  },
  [SkillEventType.OPTIMIZATION_DISABLED]: {
    label: 'Optimization Disabled',
    icon: ToggleLeftIcon,
    color: 'bg-gray-100 text-gray-800',
  },
  [SkillEventType.CLUSTERS_UPDATED]: {
    label: 'Clusters Updated',
    icon: RefreshCwIcon,
    color: 'bg-blue-100 text-blue-800',
  },
  [SkillEventType.CONTEXT_GENERATED]: {
    label: 'Context Generated',
    icon: CheckCircle2Icon,
    color: 'bg-green-100 text-green-800',
  },
};

export function SkillEventsList({
  skillId,
}: SkillEventsListProps): ReactElement {
  const { events, isLoading, setSkillId } = useSkillEvents();

  useEffect(() => {
    setSkillId(skillId);
  }, [skillId, setSkillId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Loading events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Track important changes to this skill
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            No events recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
        <CardDescription>
          Recent changes to this skill ({events.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.event_type];
            const Icon = config.icon;
            const timestamp = new Date(event.created_at).toLocaleString();

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-md ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                    {event.cluster_id && (
                      <Badge variant="secondary" className="text-xs">
                        Cluster-specific
                      </Badge>
                    )}
                  </div>
                  {event.metadata.model_name ? (
                    <p className="text-sm font-medium">
                      {String(event.metadata.model_name)}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
