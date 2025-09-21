'use client';

import { Button } from '@client/components/ui/button';
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
import { JinjaSystemPromptEditor } from '@client/components/ui/jinja-system-prompt-editor';
import { PageHeader } from '@client/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useModels } from '@client/providers/models';
import { useNavigation } from '@client/providers/navigation';
import { useSkillConfigurations } from '@client/providers/skill-configurations';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Model } from '@shared/types/data/model';
import { SkillConfigurationCreateParams } from '@shared/types/data/skill-configuration';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

export function CreateConfigurationView(): ReactElement {
  const { createSkillConfiguration } = useSkillConfigurations();
  const { models, setQueryParams } = useModels();
  const { navigationState } = useNavigation();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const router = useRouter();

  const { selectedAgent, selectedSkill } = navigationState;

  // Initialize models fetch
  useEffect(() => {
    setQueryParams({});
  }, [setQueryParams]);

  // Define advanced field configurations
  const advancedFields = useMemo(
    () => [
      {
        key: 'max_tokens' as const,
        label: 'Max Tokens',
        description: 'Maximum number of tokens to generate',
        type: 'number' as const,
        min: 1,
        max: 8192,
      },
      {
        key: 'temperature' as const,
        label: 'Temperature',
        description: 'Controls randomness (0 = deterministic, 2 = very random)',
        type: 'number' as const,
        min: 0,
        max: 2,
        step: 0.1,
      },
      {
        key: 'top_p' as const,
        label: 'Top P',
        description: 'Nucleus sampling parameter',
        type: 'number' as const,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        key: 'frequency_penalty' as const,
        label: 'Frequency Penalty',
        description: 'Reduces repetition of frequent tokens',
        type: 'number' as const,
        min: -2,
        max: 2,
        step: 0.1,
      },
      {
        key: 'presence_penalty' as const,
        label: 'Presence Penalty',
        description: 'Reduces repetition of any tokens',
        type: 'number' as const,
        min: -2,
        max: 2,
        step: 0.1,
      },
    ],
    [],
  );

  const toggleField = (fieldKey: string) => {
    const newActiveFields = new Set(activeFields);
    if (newActiveFields.has(fieldKey)) {
      newActiveFields.delete(fieldKey);
      // Reset the field value when removing
      const fieldPath = `data.${fieldKey}` as const;
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic form field path requires any
      form.setValue(fieldPath as any, null);
    } else {
      newActiveFields.add(fieldKey);
    }
    setActiveFields(newActiveFields);
  };

  const form = useForm<SkillConfigurationCreateParams>({
    resolver: zodResolver(SkillConfigurationCreateParams),
    defaultValues: {
      agent_id: selectedAgent?.id || '',
      skill_id: selectedSkill?.id || '',
      name: '',
      description: undefined,
      data: {
        model_id: '',
        system_prompt: '',
        temperature: null,
        max_tokens: null,
        top_p: null,
        frequency_penalty: null,
        presence_penalty: null,
        stop: null,
        seed: null,
        additional_params: null,
      },
    },
  });

  const onSubmit = async (data: SkillConfigurationCreateParams) => {
    if (!selectedAgent || !selectedSkill) return;

    try {
      await createSkillConfiguration({
        ...data,
        agent_id: selectedAgent.id,
        skill_id: selectedSkill.id,
      });
      if (selectedAgent && selectedSkill) {
        router.push(
          `/agents/${selectedAgent.name}/${selectedSkill.name}/configurations`,
        );
      }
    } catch (error) {
      console.error('Failed to create configuration:', error);
    }
  };

  const handleCancel = () => {
    if (selectedAgent && selectedSkill) {
      router.push(
        `/agents/${selectedAgent.name}/${selectedSkill.name}/configurations`,
      );
    }
  };

  const handleBack = () => {
    if (selectedAgent && selectedSkill) {
      router.push(
        `/agents/${selectedAgent.name}/${selectedSkill.name}/configurations`,
      );
    }
  };

  if (!selectedAgent || !selectedSkill) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center text-muted-foreground">
          No agent or skill selected. Please navigate back and select an agent
          and skill.
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Create Configuration"
        description={`Create a new AI configuration for ${selectedSkill.name}`}
        onBack={handleBack}
      />
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., High Creativity Config"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this configuration
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
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., High temperature for creative responses"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of this configuration (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Model Selection */}
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="data.model_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a Model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {models.map((model: Model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.model_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the model to use for this configuration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* System Prompt */}
              <FormField
                control={form.control}
                name="data.system_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <JinjaSystemPromptEditor
                        value={field.value!}
                        placeholder="You are a helpful AI assistant that..."
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      The system prompt that will guide the AI's behavior. Use
                      Jinja syntax like{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">{`{{ variable }}`}</code>{' '}
                      for variables.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Advanced Settings */}
              <div className="border-t pt-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-2 p-0 h-auto font-medium text-sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                >
                  {showAdvancedSettings ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Advanced Settings
                </Button>

                {showAdvancedSettings && (
                  <div className="mt-6 space-y-6">
                    {/* Available Field Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {advancedFields
                        .filter((field) => !activeFields.has(field.key))
                        .map((field) => (
                          <Button
                            key={field.key}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => toggleField(field.key)}
                          >
                            <Plus className="h-3 w-3" />
                            {field.label}
                          </Button>
                        ))}
                    </div>

                    {/* Active Field Forms */}
                    <div className="space-y-4">
                      {advancedFields
                        .filter((field) => activeFields.has(field.key))
                        .map((field) => (
                          <FormField
                            key={field.key}
                            control={form.control}
                            name={
                              // biome-ignore lint/suspicious/noExplicitAny: Dynamic form field path requires any
                              `data.${field.key}` as any
                            }
                            render={({ field: formField }) => (
                              <FormItem className="relative border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <FormLabel>{field.label}</FormLabel>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleField(field.key)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <FormControl>
                                  <Input
                                    type={field.type}
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    value={formField.value?.toString() ?? ''}
                                    onChange={(e) =>
                                      formField.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  {field.description}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-8 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? 'Creating...'
                    : 'Create Configuration'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
