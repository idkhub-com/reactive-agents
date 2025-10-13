'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Checkbox } from '@client/components/ui/checkbox';
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
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SkillCreateParams } from '@shared/types/data/skill';
import { sanitizeUserInput } from '@shared/utils/security';
import { Bot, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Form field constraints
const CONSTRAINTS = {
  name: { min: 1, max: 255 },
  description: { min: 25, max: 10000 },
  configuration_count: { min: 1, max: 25 },
  system_prompt_count: { min: 1, max: 25 },
  clustering_interval: { min: 1, max: 1000 },
  reflection_min_requests_per_arm: { min: 1, max: 1000 },
} as const;

const CreateSkillFormSchema = z
  .object({
    name: z
      .string()
      .min(CONSTRAINTS.name.min, 'Skill name is required')
      .max(CONSTRAINTS.name.max, 'Skill name must be less than 255 characters')
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
      .min(CONSTRAINTS.description.min)
      .max(
        CONSTRAINTS.description.max,
        'Description must be less than 10000 characters',
      ),
    optimize: z.boolean(),
    configuration_count: z
      .number()
      .int()
      .min(
        CONSTRAINTS.configuration_count.min,
        'Configuration count must be at least 1',
      )
      .max(
        CONSTRAINTS.configuration_count.max,
        'Configuration count cannot exceed 25',
      ),
    system_prompt_count: z
      .number()
      .int()
      .min(
        CONSTRAINTS.system_prompt_count.min,
        'System prompt count must be at least 1',
      )
      .max(
        CONSTRAINTS.system_prompt_count.max,
        'System prompt count cannot exceed 25',
      ),
    clustering_interval: z
      .number()
      .int()
      .min(
        CONSTRAINTS.clustering_interval.min,
        'Clustering interval must be at least 1',
      )
      .max(
        CONSTRAINTS.clustering_interval.max,
        'Clustering interval cannot exceed 1000',
      ),
    reflection_min_requests_per_arm: z
      .number()
      .int()
      .min(
        CONSTRAINTS.reflection_min_requests_per_arm.min,
        'Min requests per arms must be at least 1',
      )
      .max(
        CONSTRAINTS.reflection_min_requests_per_arm.max,
        'Requests per arms cannot exceed 1000',
      ),
  })
  .strict();

type CreateSkillFormData = z.infer<typeof CreateSkillFormSchema>;

export function CreateSkillView(): React.ReactElement {
  const { agents, selectedAgent } = useAgents();
  const { createSkill, isCreating } = useSkills();
  const { setSelectedSkill } = useNavigation();
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

  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const form = useForm<CreateSkillFormData>({
    resolver: zodResolver(CreateSkillFormSchema),
    defaultValues: {
      name: '',
      description: '',
      optimize: true,
      configuration_count: 3,
      system_prompt_count: 3,
      clustering_interval: 15,
      reflection_min_requests_per_arm: 3,
    },
  });

  const optimizeEnabled = form.watch('optimize');

  const onSubmit = async (data: CreateSkillFormData) => {
    if (!currentAgent) {
      console.error('No agent selected');
      return;
    }

    try {
      const skillParams: SkillCreateParams = {
        agent_id: currentAgent.id,
        name: sanitizeUserInput(data.name),
        description: sanitizeUserInput(data.description),
        metadata: {},
        optimize: data.optimize,
        configuration_count: data.configuration_count,
        system_prompt_count: data.system_prompt_count,
        clustering_interval: data.clustering_interval,
        reflection_min_requests_per_arm: data.reflection_min_requests_per_arm,
      };

      const newSkill = await createSkill(skillParams);

      // Reset form after successful creation
      form.reset();

      // Set the newly created skill as selected
      setSelectedSkill(newSkill);

      // Navigate to evaluations setup page
      if (agentName) {
        router.push(
          `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(newSkill.name)}/evaluations-2/create`,
        );
      } else {
        router.push('/agents');
      }
    } catch (error) {
      console.error('Error creating skill:', error);
      // Error is already handled by the skills provider
    }
  };

  // No need to update form since agent is fixed

  const handleBack = () => {
    if (agentName) {
      router.push(`/agents/${encodeURIComponent(agentName)}?skip_create=true`);
    } else {
      router.push('/agents');
    }
  };

  return (
    <>
      <PageHeader
        title="Create New Skill"
        description={
          currentAgent
            ? `Define a new capability for ${currentAgent.name}`
            : 'Define a new capability for this agent'
        }
        onBack={handleBack}
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
                <CardTitle>Skill Optimization</CardTitle>
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
                        Skill Name
                      </FormLabel>
                      <FormDescription>
                        Choose a descriptive name that reflects the skill's
                        specific capability or function.
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder="e.g., Data Analysis, Email Templates, Code Review"
                          className="h-11"
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
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
                        Description
                      </FormLabel>
                      <FormDescription>
                        Provide additional context about the skill's
                        functionality, use cases, and any special requirements
                        or limitations. This description is{' '}
                        <span className="font-bold">crucial</span> so that the
                        system can create accurate system prompts and
                        evaluations for the skill.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this skill does, how it works, and when to use it. For example: 'Analyzes datasets and generates statistical reports with visualizations. Useful for data-driven decision making and trend analysis.'"
                          className="resize-none min-h-[120px]"
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="optimize"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-medium">
                          Enable Optimization
                        </FormLabel>
                        <FormDescription>
                          Automatically optimize this skill by testing multiple
                          configurations and prompts to find the best
                          performance. Disable to use default settings.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="configuration_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Number of Partitions
                      </FormLabel>
                      <FormDescription>
                        Each request to the skill will be routed to one of the
                        partitions. Each partition has its own optimal
                        configuration consisting of its own model, system
                        prompt, and hyperparameters.
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          min={CONSTRAINTS.configuration_count.min}
                          max={CONSTRAINTS.configuration_count.max}
                          className="h-11 max-w-xs"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={isCreating || !optimizeEnabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="system_prompt_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        System Prompts per Partition
                      </FormLabel>
                      <FormDescription>
                        Number of prompt variations to generate while optimizing
                        each skill partition.
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          min={CONSTRAINTS.system_prompt_count.min}
                          max={CONSTRAINTS.system_prompt_count.max}
                          className="h-11 max-w-xs"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={isCreating || !optimizeEnabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Advanced Settings Toggle */}
                {optimizeEnabled && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span className="text-sm font-medium">
                        Advanced Settings
                      </span>
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Advanced Settings Section */}
                {showAdvanced && (
                  <>
                    <FormField
                      control={form.control}
                      name="clustering_interval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Skill Partitioning Interval
                          </FormLabel>
                          <FormDescription>
                            The number of requests between running the
                            partitioning algorithm. The algorithm uses all the
                            requests since the algorithm was last ran to
                            partition the skill semantically.
                          </FormDescription>
                          <FormControl>
                            <Input
                              type="number"
                              min={CONSTRAINTS.clustering_interval.min}
                              max={CONSTRAINTS.clustering_interval.max}
                              className="h-11 max-w-xs"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              disabled={isCreating || !optimizeEnabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reflection_min_requests_per_arm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Minimum Requests Per Arm Reflection Threshold
                          </FormLabel>
                          <FormDescription>
                            Ensures that all configurations in a partition have
                            each received at least this number of requests
                            before generating new system prompts. This helps
                            make sure that the system has better data to create
                            new system prompts on.
                          </FormDescription>
                          <FormControl>
                            <Input
                              type="number"
                              min={
                                CONSTRAINTS.reflection_min_requests_per_arm.min
                              }
                              max={
                                CONSTRAINTS.reflection_min_requests_per_arm.max
                              }
                              className="h-11 max-w-xs"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              disabled={isCreating || !optimizeEnabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleBack}
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
