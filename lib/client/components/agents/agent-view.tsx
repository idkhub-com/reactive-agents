'use client';

import {
  AGENT_VIEW_FOCUS_DELAY_MS,
  UUID_V4_REGEX,
} from '@client/components/agents/constants';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Separator } from '@client/components/ui/separator';
import { Textarea } from '@client/components/ui/textarea';
import { useAgents } from '@client/providers/agents';
import type { Agent } from '@shared/types/data';
import { sanitizeMetadata, sanitizeUserInput } from '@shared/utils/security';
import { format } from 'date-fns';
import {
  Bot,
  Calendar,
  Check,
  Edit,
  Settings,
  Trash2,
  X,
  XIcon,
} from 'lucide-react';
import * as React from 'react';
import { useId } from 'react';

interface AgentViewProps {
  agentId: string;
  onCloseAction: () => void;
}

export function AgentView({
  agentId,
  onCloseAction,
}: AgentViewProps): React.ReactElement {
  const agentViewCardId = useId();
  const agentViewCloseButtonId = useId();

  const {
    agents,
    selectedAgent,
    setSelectedAgent,
    deleteAgent,
    updateAgent,
    isUpdating,
  } = useAgents();
  const [currentAgent, setCurrentAgent] = React.useState<Agent | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editDescription, setEditDescription] = React.useState('');
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Find agent by ID
  React.useEffect(() => {
    if (agentId && UUID_V4_REGEX.test(agentId)) {
      const agent = agents.find((a) => a.id === agentId) || null;
      setCurrentAgent(agent);
    } else {
      setCurrentAgent(null);
    }
  }, [agentId, agents]);

  // Reset edit state when agent changes
  React.useEffect(() => {
    if (currentAgent) {
      setEditDescription(currentAgent.description || '');
      setIsEditing(false);
    }
  }, [currentAgent]);

  const handleClose = () => {
    onCloseAction();
  };

  const handleEdit = () => {
    if (currentAgent) {
      setEditDescription(currentAgent.description || '');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!currentAgent) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await updateAgent(currentAgent.id, {
        description: editDescription || null,
      });
      if (abortController.signal.aborted) return;
      setIsEditing(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error updating agent:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditDescription(currentAgent?.description || '');
  };

  const handleDelete = async () => {
    if (!currentAgent) return;

    if (confirm(`Are you sure you want to delete "${currentAgent.name}"?`)) {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await deleteAgent(currentAgent.id);
        if (abortController.signal.aborted) return;
        onCloseAction();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error deleting agent:', error);
      }
    }
  };

  const handleSetActive = () => {
    if (currentAgent) {
      setSelectedAgent(currentAgent);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm:ss a');
  };

  React.useEffect(() => {
    if (currentAgent) {
      const agentView = document.getElementById(agentViewCloseButtonId);
      if (agentView) {
        // Delay until animation is complete
        setTimeout(() => {
          agentView.focus();
        }, AGENT_VIEW_FOCUS_DELAY_MS);
      }
    }
  }, [currentAgent, agentViewCloseButtonId]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!currentAgent) {
    return <div className="hidden" />;
  }

  const isActiveAgent = selectedAgent?.id === currentAgent.id;

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      data-testid="agent-view"
    >
      <Card
        id={agentViewCardId}
        className="flex flex-col h-full relative overflow-hidden shadow-xl"
        data-testid="agent-view-card"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        <CardHeader className="flex flex-row justify-between items-center p-2 bg-card-header">
          <CardTitle className="text-sm font-light m-0 pl-2 flex flex-row items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-light">{currentAgent.name}</span>
            {isActiveAgent && (
              <>
                <Separator orientation="vertical" />
                <span className="text-xs font-light bg-green-100 px-2 py-1 rounded-full text-green-800">
                  Active
                </span>
              </>
            )}
          </CardTitle>
          <div className="flex flex-row justify-end shrink-0 gap-1">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:bg-green-100"
                  title="Save changes"
                  disabled={isUpdating}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:bg-red-100"
                  title="Cancel editing"
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                {!isActiveAgent && (
                  <Button
                    onClick={handleSetActive}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Set as active agent"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit agent"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Delete agent"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              id={agentViewCloseButtonId}
              className="invert-0 hover:invert-100"
              onClick={handleClose}
              variant="ghost"
              size="icon"
              aria-label="Close agent view"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-row p-0 h-full relative border-t overflow-hidden">
          <div className="inset-0 flex flex-col flex-1 w-full p-4 gap-4 overflow-hidden overflow-y-auto">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Agent Name
                    </p>
                    <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                      {currentAgent.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </p>
                  {isEditing ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Enter agent description..."
                      className="text-sm min-h-[60px]"
                      disabled={isUpdating}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-2 rounded min-h-[60px]">
                      {currentAgent.description ? (
                        sanitizeUserInput(currentAgent.description)
                      ) : (
                        <span className="text-muted-foreground italic">
                          No description provided
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Created At
                    </p>
                    <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                      {formatTimestamp(currentAgent.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(currentAgent.metadata).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      sanitizeMetadata(currentAgent.metadata),
                    ).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {key}
                        </p>
                        <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Settings className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No metadata configured
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
