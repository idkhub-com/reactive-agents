'use client';

import { AgentView } from '@client/components/agents/agent-view';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export default function AgentPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const handleClose = () => {
    router.push('/agents');
  };

  return <AgentView agentId={agentId} onClose={handleClose} />;
}
