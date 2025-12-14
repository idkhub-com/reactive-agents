'use client';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@client/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useSkillEvents } from '@client/providers/skill-events';
import { useSkills } from '@client/providers/skills';
import { SkillEventType } from '@shared/types/data/skill-event';
import {
  CalendarIcon,
  CheckCircle2,
  FilterXIcon,
  LayersIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  XCircle,
  XIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

const EVENT_TYPE_CONFIG = {
  [SkillEventType.MODEL_ADDED]: {
    label: 'Model Added',
    icon: PlusIcon,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  [SkillEventType.MODEL_REMOVED]: {
    label: 'Model Removed',
    icon: XIcon,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  [SkillEventType.EVALUATION_ADDED]: {
    label: 'Evaluation Added',
    icon: PlusIcon,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  [SkillEventType.EVALUATION_REMOVED]: {
    label: 'Evaluation Removed',
    icon: XIcon,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  [SkillEventType.REFLECTION]: {
    label: 'Reflection',
    icon: RefreshCwIcon,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  [SkillEventType.CLUSTERS_UPDATED]: {
    label: 'Clusters Updated',
    icon: RefreshCwIcon,
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  [SkillEventType.EVALUATION_REGENERATED]: {
    label: 'Evaluation Regenerated',
    icon: LayersIcon,
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  [SkillEventType.PARTITION_RESET]: {
    label: 'Partition Reset',
    icon: RefreshCwIcon,
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  [SkillEventType.DESCRIPTION_UPDATED]: {
    label: 'Description Updated',
    icon: CalendarIcon,
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  [SkillEventType.PARTITIONS_RECLUSTERED]: {
    label: 'Partitions Reclustered',
    icon: LayersIcon,
    color:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  [SkillEventType.OPTIMIZATION_ENABLED]: {
    label: 'Optimization Enabled',
    icon: CheckCircle2,
    color:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  [SkillEventType.OPTIMIZATION_DISABLED]: {
    label: 'Optimization Disabled',
    icon: XCircle,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
  [SkillEventType.CONTEXT_GENERATED]: {
    label: 'Context Generated',
    icon: SparklesIcon,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
};

export function SkillEventsView(): ReactElement {
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const {
    events,
    isLoading,
    setSkillId,
    page,
    setPage,
    hasMore,
    eventType,
    setEventType,
    scope,
    setScope,
    clearFilters,
  } = useSkillEvents();
  const goBack = useSmartBack();

  useEffect(() => {
    if (!selectedSkill) {
      setSkillId(null);
      return;
    }
    setSkillId(selectedSkill.id);
    setPage(1); // Reset to page 1 when skill changes
    clearFilters(); // Clear filters when skill changes
  }, [selectedSkill, setSkillId, setPage, clearFilters]);

  // Early return if no skill or agent selected
  if (!selectedSkill || !selectedAgent) {
    return (
      <>
        <PageHeader
          title="Events"
          description="No skill selected. Please select a skill to view its events."
        />
        <div className="p-6">
          <div className="text-center text-muted-foreground">
            No skill selected. Please select a skill to view its events.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Events for ${selectedSkill.name}`}
        description="Track important changes and updates to this skill"
        showBackButton={true}
        onBack={goBack}
      />

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Select
            value={eventType || 'all'}
            onValueChange={(value) => {
              setEventType(value === 'all' ? null : (value as SkillEventType));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              <SelectItem value={SkillEventType.MODEL_ADDED}>
                Model Added
              </SelectItem>
              <SelectItem value={SkillEventType.MODEL_REMOVED}>
                Model Removed
              </SelectItem>
              <SelectItem value={SkillEventType.EVALUATION_ADDED}>
                Evaluation Added
              </SelectItem>
              <SelectItem value={SkillEventType.EVALUATION_REMOVED}>
                Evaluation Removed
              </SelectItem>
              <SelectItem value={SkillEventType.EVALUATION_REGENERATED}>
                Evaluation Regenerated
              </SelectItem>
              <SelectItem value={SkillEventType.REFLECTION}>
                Reflection
              </SelectItem>
              <SelectItem value={SkillEventType.PARTITION_RESET}>
                Reset
              </SelectItem>
              <SelectItem value={SkillEventType.DESCRIPTION_UPDATED}>
                Description Updated
              </SelectItem>
              <SelectItem value={SkillEventType.PARTITIONS_RECLUSTERED}>
                Partitions Reclustered
              </SelectItem>
              <SelectItem value={SkillEventType.OPTIMIZATION_ENABLED}>
                Optimization Enabled
              </SelectItem>
              <SelectItem value={SkillEventType.OPTIMIZATION_DISABLED}>
                Optimization Disabled
              </SelectItem>
              <SelectItem value={SkillEventType.CLUSTERS_UPDATED}>
                Clusters Updated
              </SelectItem>
              <SelectItem value={SkillEventType.CONTEXT_GENERATED}>
                Context Generated
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={scope}
            onValueChange={(value) => {
              setScope(value as 'all' | 'skill-wide' | 'cluster-specific');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="skill-wide">Skill-wide</SelectItem>
              <SelectItem value="cluster-specific">Cluster-specific</SelectItem>
            </SelectContent>
          </Select>

          {(eventType || scope !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearFilters();
              }}
            >
              <FilterXIcon className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map(() => (
              <Card key={nanoid()}>
                <CardContent className="py-3">
                  <div className="flex gap-3 items-center">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="pt-16 pb-16 text-center">
              <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events yet</h3>
              <p className="text-muted-foreground">
                Events will appear here as you make changes to this skill
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {events.map((event) => {
                const config = EVENT_TYPE_CONFIG[event.event_type];
                const Icon = config.icon;
                const eventTime = new Date(event.created_at);
                const timeString = eventTime.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <Card
                    key={event.id}
                    className={`border-l-4 ${config.borderColor}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex gap-3 items-center">
                        <div className={`p-2 rounded-md ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-xs font-medium"
                            >
                              {config.label}
                            </Badge>
                            {event.cluster_id ? (
                              <Badge variant="secondary" className="text-xs">
                                Cluster-specific
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Skill-wide
                              </Badge>
                            )}
                            {event.metadata.model_name ? (
                              <span className="text-sm font-medium">
                                {String(event.metadata.model_name)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{timeString}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {(page > 1 || hasMore) && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink isActive>{page}</PaginationLink>
                    </PaginationItem>
                    {hasMore && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(page + 1)}
                          disabled={!hasMore}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
