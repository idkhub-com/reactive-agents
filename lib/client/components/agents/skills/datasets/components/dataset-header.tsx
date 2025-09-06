import { Button } from '@client/components/ui/button';
import { Card, CardHeader } from '@client/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@client/components/ui/form';
import { Input } from '@client/components/ui/input';
import { Textarea } from '@client/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Dataset, DatasetUpdateParams } from '@shared/types/data';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const updateDatasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  description: z.string().optional(),
});

type UpdateDatasetFormData = z.infer<typeof updateDatasetSchema>;

interface DatasetHeaderProps {
  dataset: Dataset;
  isEditing: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (data: DatasetUpdateParams) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function DatasetHeader({
  dataset,
  isEditing,
  isLoading,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onBack,
  showBackButton = false,
}: DatasetHeaderProps): React.ReactElement {
  const form = useForm<UpdateDatasetFormData>({
    resolver: zodResolver(updateDatasetSchema),
    defaultValues: {
      name: dataset.name,
      description: dataset.description || '',
    },
  });

  useEffect(() => {
    if (dataset) {
      form.reset({
        name: dataset.name,
        description: dataset.description || '',
      });
    }
  }, [dataset, form]);

  const handleSave = async (data: UpdateDatasetFormData) => {
    await onSave(data);
    form.reset(data);
  };

  const handleCancel = () => {
    form.reset({
      name: dataset.name,
      description: dataset.description || '',
    });
    onCancel();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSave)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Dataset name..."
                              {...field}
                              className="font-semibold"
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
                          <FormControl>
                            <Textarea
                              placeholder="Dataset description..."
                              {...field}
                              className="resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" disabled={isLoading}>
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        type="button"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold truncate">
                    {dataset.name}
                  </h2>
                  {dataset.description && (
                    <p className="text-muted-foreground mt-1">
                      {dataset.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
