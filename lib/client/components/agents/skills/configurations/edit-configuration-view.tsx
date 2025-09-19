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
import { useNavigation } from '@client/providers/navigation';
import { useSkillConfigurations } from '@client/providers/skill-configurations';
import { zodResolver } from '@hookform/resolvers/zod';
import { AIProvider, PrettyAIProvider } from '@shared/types/constants';
import { SkillConfigurationUpdateParams } from '@shared/types/data/skill-configuration';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

export function EditConfigurationView(): ReactElement {
  const { updateSkillConfiguration, skillConfigurations } =
    useSkillConfigurations();
  const { navigationState } = useNavigation();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const [selectedVersionHash, setSelectedVersionHash] =
    useState<string>('current');
  const router = useRouter();
  const params = useParams();

  const { selectedAgent, selectedSkill } = navigationState;
  const configurationName = params.configurationName as string;

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

  // Find the configuration by name
  const configuration = skillConfigurations.find(
    (config) =>
      config.name.toLowerCase() ===
      decodeURIComponent(configurationName).toLowerCase(),
  );

  const form = useForm<SkillConfigurationUpdateParams>({
    resolver: zodResolver(SkillConfigurationUpdateParams),
    defaultValues: {
      name: '',
      description: '',
      data: {
        ai_provider: AIProvider.OPENAI,
        model: 'gpt-4',
        system_prompt: '',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
        seed: null,
        additional_params: null,
      },
    },
  });

  // Update form values and active fields when configuration changes
  useEffect(() => {
    if (configuration) {
      const currentParams = configuration.data.current.params;
      form.reset({
        name: configuration.name,
        description: configuration.description,
        data: {
          ai_provider: currentParams.ai_provider,
          system_prompt: currentParams.system_prompt,
          model: currentParams.model,
          temperature: currentParams.temperature,
          max_tokens: currentParams.max_tokens,
          top_p: currentParams.top_p,
          frequency_penalty: currentParams.frequency_penalty,
          presence_penalty: currentParams.presence_penalty,
          stop: currentParams.stop,
          seed: currentParams.seed,
          additional_params: currentParams.additional_params,
        },
      });

      // Set active fields based on existing non-null values
      const newActiveFields = new Set<string>();
      advancedFields.forEach((field) => {
        const value = currentParams[field.key as keyof typeof currentParams];
        if (value !== null && value !== undefined) {
          newActiveFields.add(field.key);
        }
      });
      setActiveFields(newActiveFields);
      // Reset to current version when configuration changes
      setSelectedVersionHash('current');
    }
  }, [configuration, form, advancedFields]);

  const onSubmit = async (data: SkillConfigurationUpdateParams) => {
    if (!configuration) return;

    try {
      await updateSkillConfiguration(configuration.id, data);
      if (selectedAgent && selectedSkill) {
        router.push(
          `/agents/${selectedAgent.name}/${selectedSkill.name}/configurations`,
        );
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
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

  // If no configuration found, show loading or not found state
  if (!selectedAgent || !selectedSkill || !configuration) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center text-muted-foreground">
          {!configuration ? 'Configuration not found.' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Configuration"
        description={`Update the AI configuration for ${selectedSkill.name}`}
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

              {/* Version History */}
              {configuration && Object.keys(configuration.data).length > 1 && (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium text-sm">Version History</h3>
                    <span className="text-xs text-muted-foreground">
                      ({Object.keys(configuration.data).length} versions)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {Object.entries(configuration.data)
                      .filter(([key]) => key !== 'current')
                      .sort(
                        ([, a], [, b]) =>
                          new Date(a.created_at).getTime() -
                          new Date(b.created_at).getTime(),
                      )
                      .map(([hash, version]) => (
                        <button
                          key={hash}
                          type="button"
                          className={`w-full flex items-center justify-between p-2 rounded border cursor-pointer transition-colors text-left ${
                            selectedVersionHash === hash
                              ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                              : 'bg-background hover:bg-muted/50'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            console.log('Loading version:', hash, version);

                            // Load this version into the form
                            const formData = {
                              name: configuration.name,
                              description: configuration.description,
                              data: {
                                ai_provider: version.params.ai_provider,
                                system_prompt: version.params.system_prompt,
                                model: version.params.model,
                                temperature: version.params.temperature,
                                max_tokens: version.params.max_tokens,
                                top_p: version.params.top_p,
                                frequency_penalty:
                                  version.params.frequency_penalty,
                                presence_penalty:
                                  version.params.presence_penalty,
                                stop: version.params.stop,
                                seed: version.params.seed,
                                additional_params:
                                  version.params.additional_params,
                              },
                            };

                            console.log('Form data:', formData);
                            form.reset(formData);

                            // Update active fields
                            const newActiveFields = new Set<string>();
                            advancedFields.forEach((field) => {
                              const value =
                                version.params[
                                  field.key as keyof typeof version.params
                                ];
                              if (value !== null && value !== undefined) {
                                newActiveFields.add(field.key);
                              }
                            });
                            console.log(
                              'Setting active fields:',
                              newActiveFields,
                            );
                            setActiveFields(newActiveFields);

                            // Update selected version
                            setSelectedVersionHash(hash);

                            // Force re-render by updating a dummy state or forcing form to recognize changes
                            setTimeout(() => {
                              console.log(
                                'Current form values:',
                                form.getValues(),
                              );
                            }, 100);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {hash}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              {new Date(version.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {version.params.model}
                          </span>
                        </button>
                      ))}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <button
                      type="button"
                      className={`w-full flex items-center justify-between p-2 rounded border cursor-pointer transition-colors text-left ${
                        selectedVersionHash === 'current'
                          ? 'border-primary/50 bg-primary/5 hover:bg-primary/10'
                          : 'border-muted bg-background hover:bg-muted/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('Loading current version');

                        // Load current version into the form
                        const currentParams = configuration.data.current.params;
                        const formData = {
                          name: configuration.name,
                          description: configuration.description,
                          data: {
                            ai_provider: currentParams.ai_provider,
                            system_prompt: currentParams.system_prompt,
                            model: currentParams.model,
                            temperature: currentParams.temperature,
                            max_tokens: currentParams.max_tokens,
                            top_p: currentParams.top_p,
                            frequency_penalty: currentParams.frequency_penalty,
                            presence_penalty: currentParams.presence_penalty,
                            stop: currentParams.stop,
                            seed: currentParams.seed,
                            additional_params: currentParams.additional_params,
                          },
                        };

                        console.log('Current form data:', formData);
                        form.reset(formData);

                        // Update active fields
                        const newActiveFields = new Set<string>();
                        advancedFields.forEach((field) => {
                          const value =
                            currentParams[
                              field.key as keyof typeof currentParams
                            ];
                          if (value !== null && value !== undefined) {
                            newActiveFields.add(field.key);
                          }
                        });
                        setActiveFields(newActiveFields);
                        setSelectedVersionHash('current');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <code className="text-xs bg-primary/20 px-1.5 py-0.5 rounded font-mono">
                          {configuration.data.current.hash}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            configuration.data.current.created_at,
                          ).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-primary">
                          {selectedVersionHash === 'current'
                            ? 'Current (Selected)'
                            : 'Current'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {configuration.data.current.params.model}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* AI Provider and Model */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="data.ai_provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select
                        key={`${configuration?.id}-${field.value}`}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an AI provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AIProvider).map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {PrettyAIProvider[provider]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The AI provider to use for this configuration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data.model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter a model name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The AI model to use for this configuration
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
                    ? 'Updating...'
                    : 'Update Configuration'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
