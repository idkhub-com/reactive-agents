import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Skeleton } from '@client/components/ui/skeleton';
import { useAgents } from '@client/providers/agents';
import { useDatasets } from '@client/providers/datasets';
import { Database, Plus, RotateCcw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DatasetList } from './components/dataset-list';

export function DatasetListView(): React.ReactElement {
  const { selectedAgent } = useAgents();
  const router = useRouter();
  const { datasets, isLoading, error, setQueryParams } = useDatasets();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setQueryParams({ agent_id: selectedAgent?.id });
  }, [selectedAgent, setQueryParams]);

  const filteredDatasets = datasets?.filter((dataset) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      dataset.name.toLowerCase().includes(searchLower) ||
      dataset.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreateDataset = () => {
    // Replace so the create step doesn't add a history entry
    router.replace('/datasets/create');
  };

  const handleReset = () => {
    setSearchQuery('');
  };

  const showEmptyState = !isLoading && filteredDatasets?.length === 0;
  const showSearchEmptyState =
    !isLoading &&
    datasets &&
    datasets.length > 0 &&
    filteredDatasets?.length === 0 &&
    searchQuery;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold leading-none tracking-tight">
              Datasets
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage evaluation datasets and data points
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col overflow-hidden p-2">
        <div className="flex flex-col md:flex-row gap-2 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateDataset} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Create Dataset
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="shrink-0"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">Error loading datasets</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {error.message}
              </p>
            </div>
          </div>
        )}

        {showSearchEmptyState && (
          <div className="flex justify-center py-8">
            <Card className="max-w-md">
              <CardContent className="flex flex-col space-y-1.5 p-6 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold leading-none tracking-tight">
                  No datasets found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {showEmptyState && !searchQuery && (
          <div className="flex justify-center py-8">
            <Card className="max-w-md">
              <CardContent className="flex flex-col space-y-1.5 p-6 text-center">
                <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold leading-none tracking-tight">
                  No datasets yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create your first dataset to start organizing evaluation data.
                </p>
                <Button onClick={handleCreateDataset} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Dataset
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {filteredDatasets && filteredDatasets.length > 0 && (
          <DatasetList datasets={filteredDatasets} />
        )}
      </CardContent>
    </Card>
  );
}
