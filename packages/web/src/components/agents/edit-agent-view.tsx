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
import { zodResolver } from '@hookform/resolvers/zod';
import type { AgentUpdateParams } from '@shared/types/data';
import { sanitizeUserInput } from '@shared/utils/security';
import { Bot, Settings } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const EditAgentFormSchema = z
  .object({
    description: z
      .string()
      .min(25, 'Description must be at least 25 characters')
      .max(10000, 'Description must be less than 10000 characters'),
  })
  .strict();

type EditAgentFormData = z.infer<typeof EditAgentFormSchema>;

export function EditAgentView(): React.ReactElement {
  const { selectedAgent, updateAgent, isUpdating } = useAgents();
  const router = useRouter();
  const params = useParams();
  const agentName = params.agentName as string;
  const agentNameInputId = React.useId();

  const form = useForm<EditAgentFormData>({
    resolver: zodResolver(EditAgentFormSchema),
    defaultValues: {
      description: '',
    },
  });

  // Update form defaults when agent data is available
  React.useEffect(() => {
    if (selectedAgent) {
      form.reset({
        description: selectedAgent.description || '',
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
      };

      await updateAgent(selectedAgent.id, updateParams);

      // Navigate back to agent skills list
      if (agentName) {
        router.push(`/agents/${encodeURIComponent(agentName)}`);
      } else {
        router.push('/agents');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      // Error is already handled by the agents provider
    }
  };

  const handleBack = () => {
    if (agentName) {
      router.push(`/agents/${encodeURIComponent(agentName)}`);
    } else {
      router.push('/agents');
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
