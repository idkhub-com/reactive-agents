'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { Textarea } from '@client/components/ui/textarea';
import { useAgents } from '@client/providers/agents';
import { useSkills } from '@client/providers/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SkillCreateParams } from '@shared/types/data/skill';
import { sanitizeDescription, sanitizeUserInput } from '@shared/utils/security';
import { Bot, Wrench } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const CreateSkillFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Skill name is required')
      .max(100, 'Skill name must be less than 100 characters')
      .refine(
        (name) => {
          // Basic validation for potentially dangerous content
          const sanitized = sanitizeUserInput(name);
          return sanitized.length > 0 && sanitized === name;
        },
        {
          message: 'Skill name contains invalid characters',
        },
      ),
    description: z
      .string()
      .max(2000, 'Description must be less than 2000 characters')
      .optional(),
    max_configurations: z
      .number()
      .int()
      .positive('Max configurations must be a positive number')
      .min(1, 'Max configurations must be at least 1')
      .max(100, 'Max configurations cannot exceed 100')
      .default(10)
      .optional(),
  })
  .strict();

type CreateSkillFormData = z.infer<typeof CreateSkillFormSchema>;

export function CreateSkillView(): React.ReactElement {
  const { agents, selectedAgent } = useAgents();
  const { createSkill, isCreating } = useSkills();
  const router = useRouter();
  const params = useParams();
  const agentName = params.agentName as string;

  // Find agent by name from URL parameter
  const agentFromUrl = React.useMemo(() => {
    if (!agentName || !agents.length) return null;
    const decodedAgentName = decodeURIComponent(agentName);
    return agents.find((agent) => agent.name === decodedAgentName) || null;
  }, [agentName, agents]);

  // Use agent from URL if available, otherwise use selected agent
  const currentAgent = agentFromUrl || selectedAgent;

  const form = useForm<CreateSkillFormData>({
    resolver: zodResolver(CreateSkillFormSchema),
    defaultValues: {
      name: '',
      description: '',
      max_configurations: 3,
    },
  });

  const onSubmit = async (data: CreateSkillFormData) => {
    if (!currentAgent) {
      console.error('No agent selected');
      return;
    }

    try {
      const skillParams: SkillCreateParams = {
        agent_id: currentAgent.id,
        name: sanitizeUserInput(data.name),
        description: sanitizeDescription(data.description || ''),
        metadata: {},
        max_configurations: data.max_configurations || 3,
      };

      await createSkill(skillParams);

      // Reset form after successful creation
      form.reset();

      // Navigate back to agent's agent page
      if (agentName) {
        router.push(`/agents/${encodeURIComponent(agentName)}`);
      } else {
        router.push('/agents');
      }
    } catch (error) {
      console.error('Error creating skill:', error);
      // Error is already handled by the skills provider
    }
  };

  // No need to update form since agent is fixed

  return (
    <>
      <PageHeader
        title="Create New Skill"
        description={
          currentAgent
            ? `Define a new capability for ${currentAgent.name}`
            : 'Define a new capability for this agent'
        }
      />
      <div className="container mx-auto py-6 max-w-2xl">
        {/* Agent Context Card */}
        {currentAgent && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Creating skill for
                  </div>
                  <div className="font-semibold text-lg">
                    {currentAgent.name}
                  </div>
                  {currentAgent.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {currentAgent.description}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Skill Configuration</CardTitle>
                <CardDescription>
                  Define your skill's basic information and purpose
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Skill Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Data Analysis, Email Templates, Code Review"
                          className="h-11"
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a descriptive name that reflects the skill's
                        specific capability or function.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Description (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this skill does, how it works, and when to use it. For example: 'Analyzes datasets and generates statistical reports with visualizations. Useful for data-driven decision making and trend analysis.'"
                          className="resize-none min-h-[120px]"
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide additional context about the skill's
                        functionality, use cases, and any special requirements
                        or limitations.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_configurations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Max Configurations
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="10"
                          className="h-11"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of configurations allowed for this skill.
                        Each configuration represents a unique AI model setup
                        with specific prompts and parameters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => router.back()}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isCreating || !currentAgent}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Wrench className="mr-2 h-4 w-4 animate-pulse" />
                        Creating Skill...
                      </>
                    ) : (
                      <>
                        <Wrench className="mr-2 h-4 w-4" />
                        Create Skill
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Tips for Creating Effective Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Use specific, actionable names that clearly describe what the
                  skill accomplishes
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Include implementation details, required inputs, and expected
                  outputs in the description
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  You can always edit these details later from the skills
                  management page
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No Agent Warning */}
        {!currentAgent && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
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
        )}
      </div>
    </>
  );
}
