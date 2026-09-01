'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { AgentUpdateParams } from '@shared/types/data';
import { sanitizeUserInput } from '@shared/utils/security';
import { useParams } from '@tanstack/react-router';
import { Button } from '@web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@web/components/ui/form';
import { Input } from '@web/components/ui/input';
import { PageHeader } from '@web/components/ui/page-header';
import { Switch } from '@web/components/ui/switch';
import { Textarea } from '@web/components/ui/textarea';
import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { useAgents } from '@web/providers/agents';
import { Bot, Settings } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const EditAgentFormSchema = z
  .object({
    description: z
      .string()
      .min(25, 'Description must be at least 25 characters')
      .max(10000, 'Description must be less than 10000 characters'),
    auto_create_skills: z.boolean(),
    skill_match_threshold: z
      .number({ error: 'Enter a number between 0 and 1' })
      .min(0, 'Must be between 0 and 1')
      .max(1, 'Must be between 0 and 1'),
    max_auto_created_skills: z
      .number({ error: 'Enter a whole number' })
      .int('Must be a whole number')
      .min(0, 'Cannot be negative'),
  })
  .strict();

type EditAgentFormData = z.infer<typeof EditAgentFormSchema>;

export function EditAgentView(): React.ReactElement {
  const { selectedAgent, updateAgent, isUpdating } = useAgents();
  const navigate = usePermissiveNavigate();
  const { agentName } = useParams({ strict: false }) as { agentName?: string };
  const agentNameInputId = React.useId();

  const form = useForm<EditAgentFormData>({
    resolver: zodResolver(EditAgentFormSchema),
    defaultValues: {
      description: '',
      auto_create_skills: true,
      skill_match_threshold: 0.8,
      max_auto_created_skills: 10,
    },
  });

  // Update form defaults when agent data is available
  React.useEffect(() => {
    if (selectedAgent) {
      form.reset({
        description: selectedAgent.description || '',
        auto_create_skills: selectedAgent.auto_create_skills,
        skill_match_threshold: selectedAgent.skill_match_threshold,
        max_auto_created_skills: selectedAgent.max_auto_created_skills,
      });
    }
  }, [selectedAgent, form]);

  const onSubmit = async (data: EditAgentFormData) => {
    if (!selectedAgent) {
      console.error('No agent selected');
      return;
    }

    try {
      const updateParams: AgentUpdateParams = {
        description: sanitizeUserInput(data.description),
        auto_create_skills: data.auto_create_skills,
        skill_match_threshold: data.skill_match_threshold,
        max_auto_created_skills: data.max_auto_created_skills,
      };

      await updateAgent(selectedAgent.id, updateParams);

      // Navigate back to agent skills list
      if (agentName) {
        navigate({ to: '/agents/$agentName', params: { agentName } });
      } else {
        navigate({ to: '/agents' });
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      // Error is already handled by the agents provider
    }
  };

  const handleBack = () => {
    if (agentName) {
      navigate({ to: '/agents/$agentName', params: { agentName } });
    } else {
      navigate({ to: '/agents' });
    }
  };

  if (!selectedAgent) {
    return (
      <>
        <PageHeader title="Edit Agent" description="Agent not found" />
        <div className="container mx-auto py-6 max-w-2xl">
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Agent not found
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Unable to find the specified agent. Please ensure the agent
                    exists and try again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Agent"
        description={`Update ${selectedAgent.name} configuration`}
        onBack={handleBack}
      />
      <div className="container mx-auto py-6 max-w-2xl">
        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Agent Configuration</CardTitle>
                <CardDescription>
                  Update your agent's information
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Agent Name (read-only) */}
                <div className="space-y-2">
                  <label
                    htmlFor={agentNameInputId}
                    className="text-sm font-medium text-foreground"
                  >
                    Agent Name
                  </label>
                  <Input
                    id={agentNameInputId}
                    value={selectedAgent.name}
                    disabled
                    className="h-11 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Agent name cannot be changed after creation
                  </p>
                </div>

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Description (required)
                      </FormLabel>
                      <FormDescription>
                        Provide a detailed description of what this agent does
                        and when to use it.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="This agent helps with..."
                          className="min-h-[120px] resize-y"
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Automatic skills: requests that name only the agent */}
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="text-base font-medium">Automatic skills</h3>
                    <p className="text-sm text-muted-foreground">
                      Requests sent to{' '}
                      <code className="text-xs">
                        /v1/agents/{selectedAgent.name}/...
                      </code>{' '}
                      are routed to the closest skill. These settings decide
                      when such a request becomes a new skill instead.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="auto_create_skills"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <FormLabel>Create skills automatically</FormLabel>
                          <FormDescription>
                            New skills take this agent's default models and
                            start from the caller's own system prompt.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isUpdating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="skill_match_threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Match threshold</FormLabel>
                          <FormDescription>
                            Similarity (0 to 1) below which a request gets a
                            skill of its own.
                          </FormDescription>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.05"
                              min={0}
                              max={1}
                              name={field.name}
                              value={field.value}
                              onBlur={field.onBlur}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
                              disabled={isUpdating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="max_auto_created_skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum automatic skills</FormLabel>
                          <FormDescription>
                            Past this many, requests go to the closest skill.
                          </FormDescription>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min={0}
                              name={field.name}
                              value={field.value}
                              onBlur={field.onBlur}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
                              disabled={isUpdating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={isUpdating || !form.formState.isDirty}
                    className="w-full sm:w-auto"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isUpdating}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
