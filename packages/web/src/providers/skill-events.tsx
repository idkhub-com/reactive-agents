'use client';

import { getSkillEvents } from '@client/api/v1/reactive-agents/skill-events';
import type {
  SkillEvent,
  SkillEventQueryParams,
  SkillEventType,
} from '@shared/types/data/skill-event';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface SkillEventsContextType {
  events: SkillEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Filter setters
  skillId: string | null;
  setSkillId: (skillId: string | null) => void;
  clusterId: string | null;
  setClusterId: (clusterId: string | null) => void;
  eventType: SkillEventType | null;
  setEventType: (eventType: SkillEventType | null) => void;
  scope: 'all' | 'skill-wide' | 'cluster-specific';
  setScope: (scope: 'all' | 'skill-wide' | 'cluster-specific') => void;

  // Pagination
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  hasMore: boolean;

  // Helper functions
  getEventsByClusterId: (clusterId: string) => SkillEvent[];
  getEventsBySkillId: (skillId: string) => SkillEvent[];
  clearFilters: () => void;
}

const SkillEventsContext = createContext<SkillEventsContextType | undefined>(
  undefined,
);

export function SkillEventsProvider({ children }: { children: ReactNode }) {
  const [skillId, setSkillId] = useState<string | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<SkillEventType | null>(null);
  const [scope, setScope] = useState<'all' | 'skill-wide' | 'cluster-specific'>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryParams: SkillEventQueryParams = {};
  if (skillId) queryParams.skill_id = skillId;
  if (clusterId) queryParams.cluster_id = clusterId;
  if (eventType) queryParams.event_type = eventType;
  queryParams.limit = pageSize;
  queryParams.offset = (page - 1) * pageSize;

  const {
    data: fetchedEvents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['skillEvents', queryParams],
    queryFn: () => getSkillEvents(queryParams),
    enabled: Boolean(skillId || clusterId),
  });

  // Apply client-side scope filter (since API doesn't have a direct scope param)
  const events =
    scope === 'all'
      ? fetchedEvents
      : scope === 'skill-wide'
        ? fetchedEvents.filter((event) => event.cluster_id === null)
        : fetchedEvents.filter((event) => event.cluster_id !== null);

  // If we got fewer results than the page size, we're on the last page
  const hasMore = fetchedEvents.length === pageSize;

  const clearFilters = () => {
    setEventType(null);
    setScope('all');
    setPage(1);
  };

  const getEventsByClusterId = (targetClusterId: string): SkillEvent[] => {
    return events.filter((event) => event.cluster_id === targetClusterId);
  };

  const getEventsBySkillId = (targetSkillId: string): SkillEvent[] => {
    return events.filter((event) => event.skill_id === targetSkillId);
  };

  const value: SkillEventsContextType = {
    events,
    isLoading,
    error: error as Error | null,
    refetch,
    skillId,
    setSkillId,
    clusterId,
    setClusterId,
    eventType,
    setEventType,
    scope,
    setScope,
    page,
    pageSize,
    setPage,
    setPageSize,
    hasMore,
    getEventsByClusterId,
    getEventsBySkillId,
    clearFilters,
  };

  return (
    <SkillEventsContext.Provider value={value}>
      {children}
    </SkillEventsContext.Provider>
  );
}

export const useSkillEvents = (): SkillEventsContextType => {
  const context = useContext(SkillEventsContext);
  if (!context) {
    throw new Error('useSkillEvents must be used within a SkillEventsProvider');
  }
  return context;
};
