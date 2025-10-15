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
import { useNavigation } from '@client/providers/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AgentCreateParams } from '@shared/types/data';
import { sanitizeUserInput } from '@shared/utils/security';
import { Bot, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const CreateAgentFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Agent name is required')
      .max(100, 'Agent name must be less than 100 characters')
      .refine(
        (name) => {
          // Basic validation for potentially dangerous content
          const sanitized = sanitizeUserInput(name);
          return sanitized.length > 0 && sanitized === name;
        },
        {
          message: 'Agent name contains invalid characters',
        },
      ),
    description: z
      .string()
      .max(2000, 'Description must be less than 2000 characters')
      .optional(),
  })
  .strict();

type CreateAgentFormData = z.infer<typeof CreateAgentFormSchema>;

export function CreateAgentView(): React.ReactElement {
  const { createAgent, isCreating } = useAgents();
  const { setSelectedAgent } = useNavigation();
  const router = useRouter();

  const form = useForm<CreateAgentFormData>({
    resolver: zodResolver(CreateAgentFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: CreateAgentFormData) => {
    try {
      const agentParams: AgentCreateParams = {
        name: sanitizeUserInput(data.name),
        description: sanitizeUserInput(data.description || ''),
        metadata: {},
      };

      const newAgent = await createAgent(agentParams);

      // Reset form after successful creation
      form.reset();

      // Set the selected agent and navigate to the agent's skills page
      setSelectedAgent(newAgent);
    } catch (error) {
      console.error('Error creating agent:', error);
      // Error is already handled by the agents provider
    }
  };

  const handleBack = () => {
    router.push('/agents');
  };

  return (
    <>
      <PageHeader
        title="Create New Agent"
        description="Build a new AI agent to help with your tasks"
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
                  Define your agent's basic information and purpose
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
                        Agent Name
                      </FormLabel>
                      <FormDescription>
                        Choose a descriptive name that reflects your agent's
                        role and purpose.
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder="e.g., Customer Support Bot, Content Writer, Data Analyst"
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
                        Provide additional context about the agent's purpose,
                        capabilities, and expected behavior. This description is{' '}
                        <span className="font-bold">crucial</span> for
                        generating accurate system prompts and evaluations for
                        each of the agent's skills.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this agent will do, its capabilities, and how it should behave. For example: 'A helpful customer support agent that can answer questions about our products, handle basic troubleshooting, and escalate complex issues to human agents.'"
                          className="resize-none min-h-[120px]"
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
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
                    onClick={handleBack}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Bot className="mr-2 h-4 w-4 animate-pulse" />
                        Creating Agent...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Agent
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
              <Bot className="h-5 w-5 text-primary" />
              Tips for Creating Effective Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Use clear, specific names that describe the agent's primary
                  function
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  Include context about the agent's role, expertise, and
                  communication style in the description
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-medium">•</span>
                <span>
                  You can always edit these details later from the agents
                  management page
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
