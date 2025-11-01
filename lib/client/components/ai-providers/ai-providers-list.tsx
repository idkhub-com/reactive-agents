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
import { useToast } from '@client/hooks/use-toast';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import type { AIProviderConfig } from '@shared/types/data/ai-provider';
import { format } from 'date-fns';
import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { DeleteAIProviderDialog } from './delete-ai-provider-dialog';

interface AIProvidersListViewProps {
  onProviderSelect?: (providerId: string) => void;
  selectedProviderId?: string | null;
}

export function AIProvidersListView({
  onProviderSelect,
  selectedProviderId,
}: AIProvidersListViewProps = {}): ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const {
    apiKeys,
    isLoading,
    refetch,
    deleteAPIKey,
    isDeleting,
    refreshAPIKeys,
  } = useAIProviderAPIKeys();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [providerToDelete, setProviderToDelete] =
    useState<AIProviderConfig | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const filteredAPIKeys = apiKeys.filter((apiKey) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        apiKey.name?.toLowerCase().includes(searchLower) ||
        apiKey.ai_provider?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const copyToClipboard = async (apiKey: AIProviderConfig) => {
    try {
      if (!apiKey.api_key) {
        toast({
          title: 'No API key',
          description: 'This provider does not have an API key configured.',
          variant: 'destructive',
        });
        return;
      }
      await navigator.clipboard.writeText(apiKey.api_key);
      const newCopiedKeys = new Set(copiedKeys);
      newCopiedKeys.add(apiKey.id);
      setCopiedKeys(newCopiedKeys);

      toast({
        title: 'Copied to clipboard',
        description: `API key "${apiKey.name}" copied to clipboard.`,
      });

      // Remove the copied state after 2 seconds
      setTimeout(() => {
        setCopiedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(apiKey.id);
          return newSet;
        });
      }, 2000);
    } catch (_error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy API key to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (apiKey: AIProviderConfig) => {
    setProviderToDelete(apiKey);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!providerToDelete) return;
    try {
      await deleteAPIKey(providerToDelete.id);
    } catch (_error) {
      // Error handling is done in the provider
    }
  };

  const maskAPIKey = (apiKey: string): string => {
    if (apiKey.length <= 8) {
      // If key is too short, just show dots (fixed length for security)
      return '•'.repeat(10);
    }
    // Always show first 4 characters, 10 dots, and last 4 characters
    // This hides the actual length of the API key for security
    const first4 = apiKey.slice(0, 4);
    const last4 = apiKey.slice(-4);
    return `${first4}${'•'.repeat(10)}${last4}`;
  };

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      openai:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      anthropic:
        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };
    return colors[provider.toLowerCase()] || colors.default;
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="AI Providers & Models"
          description="Configure AI providers and manage available models"
          showBackButton={false}
          actions={
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
          }
        />
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyIcon className="h-5 w-5" />
                AI Providers
              </CardTitle>
              <CardDescription>
                Manage your AI providers and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
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
        title="AI Providers & Models"
        description="Configure AI providers and manage available models"
        showBackButton={false}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                refreshAPIKeys();
                refetch();
              }}
              variant="outline"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => router.push('/ai-providers/create')}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add AI Provider
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              AI Providers ({filteredAPIKeys.length})
            </CardTitle>
            <CardDescription>
              {onProviderSelect
                ? 'Select a provider to view and manage its models below'
                : 'Manage your AI providers. API keys are encrypted and stored securely.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by provider or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* API Keys Table */}
              {filteredAPIKeys.length === 0 ? (
                <div className="text-center py-8">
                  <KeyIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No AI providers found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'No AI providers match your search criteria.'
                      : 'Get started by adding your first AI provider.'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => router.push('/ai-providers/create')}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Your First AI Provider
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAPIKeys.map((apiKey) => (
                      <TableRow
                        key={apiKey.id}
                        className={`${
                          onProviderSelect
                            ? 'cursor-pointer hover:bg-muted/50'
                            : ''
                        } ${
                          selectedProviderId === apiKey.id
                            ? 'bg-muted/30 border-l-4 border-l-primary'
                            : ''
                        }`}
                        onClick={() => onProviderSelect?.(apiKey.id)}
                      >
                        <TableCell className="font-medium">
                          {apiKey.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getProviderColor(apiKey.ai_provider)}
                          >
                            {apiKey.ai_provider}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {apiKey.api_key ? (
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {maskAPIKey(apiKey.api_key)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(apiKey);
                                }}
                              >
                                {copiedKeys.has(apiKey.id) ? (
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                ) : (
                                  <CopyIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              No API key set
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(apiKey.created_at), 'MMM d, yyyy')}
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
                                onClick={() =>
                                  router.push(`/ai-providers/${apiKey.id}/edit`)
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(apiKey);
                                }}
                                disabled={isDeleting}
                                className="text-destructive"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
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
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteAIProviderDialog
        provider={providerToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
