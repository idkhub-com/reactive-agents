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
import type { AIProviderAPIKey } from '@shared/types/data/ai-provider-api-key';
import { format } from 'date-fns';
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';

export function APIKeysListView(): ReactElement {
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
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());

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

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyToClipboard = async (apiKey: AIProviderAPIKey) => {
    try {
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

  const handleDeleteAPIKey = async (apiKey: AIProviderAPIKey) => {
    try {
      await deleteAPIKey(apiKey.id);
    } catch (_error) {
      // Error handling is done in the provider
    }
  };

  const maskAPIKey = (apiKey: string): string => {
    if (apiKey.length <= 4) return apiKey;
    return '•'.repeat(apiKey.length - 4) + apiKey.slice(-4);
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
          title="API Keys"
          description="Manage your AI provider API keys"
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
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for AI providers
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
        title="API Keys"
        description="Manage your AI provider API keys"
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
            <Button asChild>
              <Link href="/ai-providers/create">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add API Key
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              API Keys ({filteredAPIKeys.length})
            </CardTitle>
            <CardDescription>
              Manage API keys for AI providers. Keys are encrypted and stored
              securely.
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
                    No API keys found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'No API keys match your search criteria.'
                      : 'Get started by adding your first API key.'}
                  </p>
                  {!searchQuery && (
                    <Button asChild>
                      <Link href="/ai-providers/create">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Your First API Key
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAPIKeys.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getProviderColor(apiKey.ai_provider)}
                          >
                            {apiKey.ai_provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {apiKey.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {visibleKeys.has(apiKey.id)
                                ? apiKey.api_key
                                : maskAPIKey(apiKey.api_key)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                            >
                              {visibleKeys.has(apiKey.id) ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey)}
                            >
                              {copiedKeys.has(apiKey.id) ? (
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              ) : (
                                <CopyIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(apiKey.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/ai-providers/${apiKey.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteAPIKey(apiKey)}
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
    </>
  );
}
