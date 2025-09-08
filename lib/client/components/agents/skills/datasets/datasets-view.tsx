'use client';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { Input } from '@client/components/ui/input';
import { PageHeader } from '@client/components/ui/page-header';
import { Skeleton } from '@client/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import { useSmartBack } from '@client/hooks/use-smart-back';
import { useDatasets } from '@client/providers/datasets';
import { useNavigation } from '@client/providers/navigation';
import type { Dataset, DatasetQueryParams } from '@shared/types/data';
import { format } from 'date-fns';
import {
  DatabaseIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

export function DatasetsView(): ReactElement {
  const { navigationState, navigateToCreateDataset, navigateToDatasetDetail } =
    useNavigation();
  const smartBack = useSmartBack();
  const [searchQuery, setSearchQuery] = useState('');

  // Use the Datasets provider
  const {
    datasets,
    isLoading,
    refetch,
    setQueryParams,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refreshDatasets,
  } = useDatasets();

  // Update query params when filters change
  useEffect(() => {
    if (!navigationState.selectedAgent) return;

    const queryParams: DatasetQueryParams = {
      agent_id: navigationState.selectedAgent.id,
      limit: 20,
    };

    setQueryParams(queryParams);
  }, [navigationState.selectedAgent, setQueryParams]);

  // Early return if no skill or agent selected - AFTER all hooks
  if (!navigationState.selectedSkill || !navigationState.selectedAgent) {
    return <div>No skill selected</div>;
  }

  const { selectedSkill, selectedAgent } = navigationState;

  const filteredDatasets = datasets.filter((dataset) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        dataset.name?.toLowerCase().includes(searchLower) ||
        dataset.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleBack = () => {
    // Use smart back with fallback to skill dashboard
    const fallbackUrl = `/agents/${encodeURIComponent(selectedAgent.name)}/${encodeURIComponent(selectedSkill.name)}`;
    smartBack(fallbackUrl);
  };

  const handleCreateDataset = () => {
    navigateToCreateDataset(selectedAgent.name, selectedSkill.name);
  };

  const handleDatasetClick = (dataset: Dataset) => {
    navigateToDatasetDetail(selectedAgent.name, selectedSkill.name, dataset.id);
  };

  const handleDatasetAction = (
    action: string,
    _datasetId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent row click when clicking dropdown actions
    switch (action) {
      case 'edit':
        // TODO: Implement edit dataset functionality
        break;
      case 'duplicate':
        // TODO: Implement duplicate dataset functionality
        break;
      case 'delete':
        // TODO: Implement delete dataset functionality
        break;
    }
  };

  return (
    <>
      <PageHeader
        title="Datasets"
        description={`Datasets for ${selectedSkill.name}`}
        onBack={handleBack}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                refreshDatasets();
                refetch();
              }}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreateDataset}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Dataset
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search</CardTitle>
            <CardDescription>
              Find datasets by name or description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Datasets Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Available Datasets</CardTitle>
                <CardDescription>
                  {filteredDatasets.length} datasets found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map(() => (
                  <div key={nanoid()} className="flex space-x-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="text-center py-12">
                <DatabaseIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No datasets found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'No datasets match your search criteria.'
                    : 'No datasets have been created for this skill yet.'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateDataset}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create your first dataset
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Logs</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDatasets.map((dataset) => (
                    <TableRow
                      key={dataset.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDatasetClick(dataset)}
                    >
                      <TableCell className="font-medium">
                        {dataset.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {dataset.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        {dataset.is_realtime ? (
                          <Badge variant="default" className="text-xs">
                            Realtime
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {dataset.is_realtime ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Max: {dataset.realtime_size}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Auto-managed
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDatasetClick(dataset);
                            }}
                          >
                            View logs →
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(dataset.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {dataset.updated_at
                          ? format(new Date(dataset.updated_at), 'MMM dd, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleDatasetAction('edit', dataset.id, e)
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleDatasetAction('duplicate', dataset.id, e)
                              }
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleDatasetAction('delete', dataset.id, e)
                              }
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {datasets.length > 0 && hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
