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
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SkillUpdateParams } from '@shared/types/data/skill';
import { sanitizeUserInput } from '@shared/utils/security';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Form field constraints
const CONSTRAINTS = {
  description: { min: 25, max: 10000 },
  configuration_count: { min: 1, max: 25 },
  system_prompt_count: { min: 1, max: 25 },
  clustering_interval: { min: 1, max: 1000 },
  reflection_min_requests_per_arm: { min: 1, max: 1000 },
} as const;

const EditSkillFormSchema = z
  .object({
    name: z.string(), // Read-only field for display
    description: z
      .string()
      .min(
        CONSTRAINTS.description.min,
        'Description must be at least 25 characters',
      )
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
        'Min configurations must be at least 1',
      )
      .max(
        CONSTRAINTS.configuration_count.max,
        'Max configurations cannot exceed 25',
      ),
    system_prompt_count: z
      .number()
      .int()
      .min(
        CONSTRAINTS.system_prompt_count.min,
        'Min system prompts must be at least 1',
      )
      .max(
        CONSTRAINTS.system_prompt_count.max,
        'Max system prompts cannot exceed 25',
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

type EditSkillFormData = z.infer<typeof EditSkillFormSchema>;

export function EditSkillView(): React.ReactElement {
  const { navigationState } = useNavigation();
  const { updateSkill, isUpdating } = useSkills();
  const router = useRouter();
  const params = useParams();
  const agentName = params.agentName as string;
  const skillName = params.skillName as string;

  // Get current agent and skill from navigation state
  const currentAgent = navigationState.selectedAgent;
  const currentSkill = navigationState.selectedSkill;

  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const form = useForm<EditSkillFormData>({
    resolver: zodResolver(EditSkillFormSchema),
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

  // Update form defaults when skill data is available
  React.useEffect(() => {
    if (currentSkill) {
      form.reset({
        name: currentSkill.name,
        description: currentSkill.description || '',
        optimize: currentSkill.optimize,
        configuration_count: currentSkill.configuration_count,
        system_prompt_count: currentSkill.system_prompt_count,
        clustering_interval: currentSkill.clustering_interval,
        reflection_min_requests_per_arm:
          currentSkill.reflection_min_requests_per_arm,
      });
    }
  }, [currentSkill, form]);

  const onSubmit = async (data: EditSkillFormData) => {
    if (!currentSkill) {
      console.error('No skill selected');
      return;
    }

    try {
      const updateParams: SkillUpdateParams = {
        description: sanitizeUserInput(data.description),
        optimize: data.optimize,
        configuration_count: data.configuration_count,
        system_prompt_count: data.system_prompt_count,
        clustering_interval: data.clustering_interval,
        reflection_min_requests_per_arm: data.reflection_min_requests_per_arm,
      };

      await updateSkill(currentSkill.id, updateParams);

      // Navigate back to skill dashboard
      if (agentName && skillName) {
        router.push(
          `/agents/${encodeURIComponent(agentName)}/${encodeURIComponent(skillName)}`,
        );
      } else {
        router.push('/agents');
      }
    } catch (error) {
      console.error('Error updating skill:', error);
      // Error is already handled by the skills provider
    }
  };

  if (!currentAgent || !currentSkill) {
    return (
      <>
        <PageHeader title="Edit Skill" description="Skill not found" />
        <div className="container mx-auto py-6 max-w-2xl">
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Skill not found
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Unable to find the specified skill. Please ensure the skill
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
        title="Edit Skill"
        description={`Update settings for ${currentSkill.name}`}
      />
      <div className="container mx-auto py-6 max-w-2xl">
        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Skill Settings</CardTitle>
                <CardDescription>
                  Update your skill's description and configuration limits
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
                        The skill name cannot be changed after creation to
                        maintain consistency across configurations and
                        evaluations.
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          disabled
                          className="h-11 bg-muted cursor-not-allowed"
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
                        Description (required)
                      </FormLabel>
                      <FormDescription>
                        Provide additional context about the skill's
                        functionality, use cases, and any special requirements
                        or limitations (minimum 25 characters). This description
                        is <span className="font-bold">crucial</span> so that
                        the system can create accurate system prompts and
                        evaluations for the skill.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this skill does, how it works, and when to use it. For example: 'Analyzes datasets and generates statistical reports with visualizations. Useful for data-driven decision making and trend analysis.'"
                          className="resize-none min-h-[120px]"
                          {...field}
                          disabled={isUpdating}
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
                          disabled={isUpdating}
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
                          disabled={isUpdating || !optimizeEnabled}
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
                          disabled={isUpdating || !optimizeEnabled}
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
                              disabled={isUpdating || !optimizeEnabled}
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
                              disabled={isUpdating || !optimizeEnabled}
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
                    onClick={() => router.back()}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? (
                      <>
                        <Settings className="mr-2 h-4 w-4 animate-pulse" />
                        Updating Skill...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Update Skill
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
              <Settings className="h-5 w-5 text-primary" />
              Tips for Configuring Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  The skill name is permanent and cannot be changed to maintain
                  consistency across configurations and evaluations
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Set max configurations based on how many different AI model
                  setups you anticipate needing for this skill
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Update the description as your skill evolves to help team
                  members understand its current capabilities
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
