'use client';

import { CompletionViewer } from '@client/components/agents/skills/logs/components/completion-viewer';
import { LogMap } from '@client/components/agents/skills/logs/components/log-map';
import { MessagesView } from '@client/components/agents/skills/logs/components/messages-view';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { PageHeader } from '@client/components/ui/page-header';
import { Separator } from '@client/components/ui/separator';
import { Skeleton } from '@client/components/ui/skeleton';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useAgents } from '@client/providers/agents';
import { useLogs } from '@client/providers/logs';
import { useSkills } from '@client/providers/skills';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeftIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function LogDetailsView(): ReactElement {
  const { selectedAgent } = useAgents();
  const { selectedSkill } = useSkills();
  const { selectedLog, isLoading, setAgentId, setSkillId } = useLogs();
  const smartBack = useSmartBack();
  const [raRequestData, setReactiveAgentsRequestData] =
    useState<ReactiveAgentsRequestData | null>(null);

  // Set agentId and skillId when agent/skill changes
  useEffect(() => {
    if (selectedAgent && selectedSkill) {
      setAgentId(selectedAgent.id);
      setSkillId(selectedSkill.id);
    } else {
      setAgentId(null);
      setSkillId(null);
    }
  }, [selectedAgent, selectedSkill, setAgentId, setSkillId]);

  // Function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  useEffect(() => {
    if (selectedLog) {
      const raRequestData = produceReactiveAgentsRequestData(
        selectedLog.ai_provider_request_log.method,
        selectedLog.ai_provider_request_log.request_url,
        {},
        selectedLog.ai_provider_request_log.request_body,
        selectedLog.ai_provider_request_log.response_body,
      );

      setReactiveAgentsRequestData(raRequestData);
    }
  }, [selectedLog]);

  const handleBack = () => {
    if (selectedAgent && selectedSkill) {
      const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}/logs`;
      smartBack(fallbackUrl);
    } else {
      smartBack('/agents');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!selectedLog) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Log not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The log you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Log Details"
        description={formatTimestamp(selectedLog.start_time)}
        showBackButton
        onBack={handleBack}
      />
      <div className="p-6 space-y-6">
        {/* Log Detail Card */}
        <Card className="flex flex-col h-[calc(100vh-200px)] overflow-hidden">
          <CardHeader className="flex flex-row justify-between items-center p-4 bg-card-header border-b">
            <CardTitle className="text-lg font-medium m-0 flex flex-row items-center gap-2">
              <span className="text-sm font-light">
                {formatTimestamp(selectedLog.start_time)}
              </span>
              {selectedLog.span_name && (
                <>
                  <Separator orientation="vertical" />
                  <span className="text-xs font-light">
                    {selectedLog.span_name}
                  </span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-row p-0 h-full relative overflow-hidden">
            <div className="flex h-full w-[200px] border-r">
              <LogMap logs={[selectedLog]} />
            </div>
            <div className="inset-0 flex flex-col flex-1 w-full p-4 gap-4 overflow-hidden overflow-y-auto">
              {selectedLog && raRequestData && (
                <MessagesView
                  logId={selectedLog.id}
                  raRequestData={raRequestData}
                />
              )}
              {selectedLog &&
                raRequestData &&
                ('choices' in
                  selectedLog.ai_provider_request_log.response_body ||
                  'output' in
                    selectedLog.ai_provider_request_log.response_body) && (
                  <CompletionViewer
                    logId={selectedLog.id}
                    raRequestData={raRequestData}
                  />
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
