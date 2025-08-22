import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader } from '@client/components/ui/card';
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
import { Textarea } from '@client/components/ui/textarea';
import { useToast } from '@client/hooks/use-toast';
import { useAgents } from '@client/providers/agents';
import { useDatasets } from '@client/providers/datasets';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DatasetCreateParams } from '@shared/types/data';
import { ArrowLeft, Database, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const createDatasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  description: z.string().optional(),
});

type CreateDatasetFormData = z.infer<typeof createDatasetSchema>;

export function CreateDatasetView(): React.ReactElement {
  const { selectedAgent } = useAgents();
  const { createDataset } = useDatasets();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreateDatasetFormData>({
    resolver: zodResolver(createDatasetSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: CreateDatasetFormData) => {
    try {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      const createParams: DatasetCreateParams = {
        name: data.name,
        agent_id: selectedAgent.id,
        description: data.description || null,
        metadata: {},
      };

      const newDataset = await createDataset(createParams);

      toast({
        title: 'Dataset created',
        description: `Successfully created ${newDataset.name}`,
      });

      // Replace history and go back to datasets list where the new dataset will appear
      router.replace('/datasets');
    } catch (error) {
      console.error('Failed to create dataset:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating dataset',
        description: 'Please try again later',
      });
    }
  };

  const handleBack = () => {
    window.location.hash = 'datasets';
  };

  const handleCancel = () => {
    window.location.hash = 'datasets';
  };

  return (
    <div className="p-2 h-full overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h3 className="font-semibold leading-none tracking-tight">
                  Create Dataset
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create a new evaluation dataset
                </p>
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
                      <FormLabel>Dataset Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter dataset name..."
                          {...field}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for your evaluation dataset
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose and contents of this dataset..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description of what this dataset contains and
                        its intended use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Database className="mr-2 h-4 w-4" />
                    Create Dataset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h4 className="font-medium">About Datasets</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Datasets organize evaluation data points for model testing
                  </li>
                  <li>
                    • Data points can be created from existing logs or manually
                  </li>
                  <li>
                    • Each data point contains request/response pairs for
                    evaluation
                  </li>
                  <li>• Use datasets to track model performance over time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
