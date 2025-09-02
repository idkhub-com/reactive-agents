'use client';

import { useAgents } from '@client/providers/agents';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export default function AgentsPage(): ReactElement {
  const { agents, isLoading, selectedAgent } = useAgents();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only running redirect logic after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (error === 'agent-not-found') {
      // Could show a toast or notification here
      console.warn('Agent not found in URL');
    } else if (error === 'skill-not-found') {
      console.warn('Skill not found in URL');
    }
  }, [error]);

  useEffect(() => {
    if (!isMounted || hasRedirected) return;

    console.log('🔍 /agentsPage useEffect:', {
      isLoading,
      selectedAgent,
      agentsCount: agents.length,
    });

    if (isLoading) {
      console.log('⏳ Still loading, waiting...');
      return;
    }

    // If we have a selected agent, redirect to its pipeline page
    if (selectedAgent) {
      console.log('✅ Redirecting to selected agent:', selectedAgent.name);
      setHasRedirected(true);
      const targetUrl = `/agents/${encodeURIComponent(selectedAgent.name)}`;
      console.log('🔗 Target URL:', targetUrl);
      router.replace(targetUrl);
      return;
    }

    // If we have agents but no selected agent, redirect to the first agent
    if (agents.length > 0) {
      const firstAgent = agents[0];
      console.log('✅ Redirecting to first agent:', firstAgent.name);
      setHasRedirected(true);
      const targetUrl = `/agents/${encodeURIComponent(firstAgent.name)}`;
      console.log('🔗 Target URL:', targetUrl);
      router.replace(targetUrl);
      return;
    }

    // If no agents exist, redirect to create page
    console.log('✅ No agents found, redirecting to create page');
    setHasRedirected(true);
    router.replace('/agents/create');
  }, [isMounted, agents, selectedAgent, isLoading, hasRedirected, router]);

  // Fallback timeout redirect in case something goes wrong
  useEffect(() => {
    if (!isMounted) return;

    const timeout = setTimeout(() => {
      if (!hasRedirected) {
        console.log('⚠️ Timeout reached, forcing redirect to create page');
        setHasRedirected(true);
        router.replace('/agents/create');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isMounted, hasRedirected, router]);

  // Show consistent loading state during SSR and hydration
  if (!isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting (client-side only)
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
