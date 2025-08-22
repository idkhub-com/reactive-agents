import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/components/ui/dropdown-menu';
import { Skeleton } from '@client/components/ui/skeleton';
import { getHttpMethodColor } from '@client/utils/http-method-colors';
import type { DataPoint } from '@shared/types/data';
import { Code, MoreVertical, Star, Trash2 } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface DataPointsListProps {
  dataPoints: DataPoint[];
  datasetId: string;
  isLoading?: boolean;
  onDataPointsDeleted?: () => void;
  onDeleteDataPoint?: (dataPoint: DataPoint) => void;
}

function DataPointsListComponent({
  dataPoints,
  datasetId: _datasetId,
  isLoading,
  onDataPointsDeleted: _onDataPointsDeleted,
  onDeleteDataPoint,
}: DataPointsListProps): React.ReactElement {
  const dataPointsRef = useRef<DataPoint[]>(dataPoints);
  const isMountedRef = useRef(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [dataPointToView, setDataPointToView] = useState<DataPoint | null>(
    null,
  );

  // Update ref when dataPoints changes
  useEffect(() => {
    dataPointsRef.current = dataPoints;
  }, [dataPoints]);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true; // Ensure it's set to true on mount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDeleteClick = useCallback(
    (dataPoint: DataPoint) => {
      onDeleteDataPoint?.(dataPoint);
    },
    [onDeleteDataPoint],
  );

  const handleViewClick = useCallback((dataPoint: DataPoint) => {
    if (!isMountedRef.current) return;

    // Set the data point to view in the dialog
    setDataPointToView(dataPoint);
    setViewDialogOpen(true);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, []);

  // Loading skeleton component
  const skeletonKeys = ['req', 'res', 'meta'] as const;
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {skeletonKeys.map((key) => (
        <Card key={key} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="shrink-0 mt-1">
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center gap-4 text-sm mb-2">
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        {dataPoints.map((dataPoint) => (
          <Card
            key={dataPoint.id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={(e) => {
              e.stopPropagation();
              handleViewClick(dataPoint);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="shrink-0 mt-1">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={getHttpMethodColor(dataPoint.method)}>
                        {dataPoint.method}
                      </Badge>
                      <span className="font-medium text-sm truncate">
                        {dataPoint.endpoint}
                      </span>
                      {dataPoint.is_golden && (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Golden
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span>Function: {dataPoint.function_name}</span>
                      {/* Ground truth display commented out - should check for improved responses instead
                      {dataPoint.ground_truth && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Has Ground Truth
                        </span>
                      )} */}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {formatDate(dataPoint.created_at)}</span>
                      {Object.keys(dataPoint.metadata).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(dataPoint.metadata).length} metadata
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(dataPoint);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Data Point
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Data Point Details
            </DialogTitle>
            <DialogDescription>
              {dataPointToView &&
                `${dataPointToView.method} ${dataPointToView.endpoint}`}
            </DialogDescription>
            {dataPointToView && (
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getHttpMethodColor(dataPointToView.method)}>
                  {dataPointToView.method}
                </Badge>
                <span>{dataPointToView.endpoint}</span>
              </div>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {dataPointToView && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Request Body</h4>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(dataPointToView.request_body, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {/* Ground truth display commented out - should be based on improved responses
                {dataPointToView.ground_truth && (
                  <div>
                    <h4 className="font-medium mb-2">Ground Truth</h4>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(
                            dataPointToView.ground_truth,
                            null,
                            2,
                          )}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )} */}

                {Object.keys(dataPointToView.metadata).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm overflow-auto">
                          {JSON.stringify(dataPointToView.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Function Name:</span>
                        <span>{dataPointToView.function_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Golden:</span>
                        <span>{dataPointToView.is_golden ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Created:</span>
                        <span>{formatDate(dataPointToView.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const DataPointsList = memo(DataPointsListComponent);
