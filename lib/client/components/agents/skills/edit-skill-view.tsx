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
import { useNavigation } from '@client/providers/navigation';
import { useSkills } from '@client/providers/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SkillUpdateParams } from '@shared/types/data/skill';
import { sanitizeUserInput } from '@shared/utils/security';
import { Bot, Settings, Wrench } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const EditSkillFormSchema = z
  .object({
    description: z
      .string()
      .min(25)
      .max(10000, 'Description must be less than 10000 characters'),
    max_configurations: z
      .number()
      .int()
      .min(1, 'Min configurations must be at least 1')
      .max(25, 'Max configurations cannot exceed 25'),
    num_system_prompts: z
      .number()
      .int()
      .min(1, 'Min system prompts must be at least 1')
      .max(25, 'Max system prompts cannot exceed 25'),
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

  const form = useForm<EditSkillFormData>({
    resolver: zodResolver(EditSkillFormSchema),
    defaultValues: {
      description: '',
      max_configurations: 3,
    },
  });

  // Update form defaults when skill data is available
  React.useEffect(() => {
    if (currentSkill) {
      form.reset({
        description: currentSkill.description || '',
        max_configurations: currentSkill.max_configurations,
        num_system_prompts: currentSkill.num_system_prompts,
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
        max_configurations: data.max_configurations,
        num_system_prompts: data.num_system_prompts,
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
        {/* Agent Context Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Editing skill for
                </div>
                <div className="font-semibold text-lg">{currentAgent.name}</div>
                {currentAgent.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {currentAgent.description}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skill Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Skill Name (Read-only)
                </div>
                <div className="font-semibold text-lg text-blue-800 dark:text-blue-200">
                  {currentSkill.name}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  The skill name cannot be changed after creation
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                          disabled={isUpdating}
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
                          className="h-11"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={isUpdating}
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

                <FormField
                  control={form.control}
                  name="num_system_prompts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Number of System Prompts
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="h-11"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormDescription>
                        The number of system prompts that will be generated for
                        this skill.
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
