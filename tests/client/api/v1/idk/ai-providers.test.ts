import {
  type AIProviderSchemaResponse,
  type AIProviderSchemasResponse,
  createAIProvider,
  deleteAIProvider,
  getAIProviderAPIKeys,
  getAIProviderSchema,
  getAIProviderSchemas,
  updateAIProvider,
} from '@client/api/v1/idk/ai-providers';
import type {
  AIProviderConfig,
  AIProviderConfigCreateParams,
  AIProviderConfigUpdateParams,
} from '@shared/types/data/ai-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the entire module
vi.mock('@client/api/v1/idk/ai-providers', () => ({
  getAIProviderSchemas: vi.fn(),
  getAIProviderSchema: vi.fn(),
  getAIProviderAPIKeys: vi.fn(),
  createAIProvider: vi.fn(),
  updateAIProvider: vi.fn(),
  deleteAIProvider: vi.fn(),
}));

// Get the mocked functions
const mockedGetAIProviderSchemas = vi.mocked(getAIProviderSchemas);
const mockedGetAIProviderSchema = vi.mocked(getAIProviderSchema);
const mockedGetAIProviderAPIKeys = vi.mocked(getAIProviderAPIKeys);
const mockedCreateAIProvider = vi.mocked(createAIProvider);
const mockedUpdateAIProvider = vi.mocked(updateAIProvider);
const mockedDeleteAIProvider = vi.mocked(deleteAIProvider);

describe('AI Providers Client API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAIProvider: AIProviderConfig = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ai_provider: 'openai',
    name: 'Production Key',
    api_key: 'sk-test',
    custom_fields: {},
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  const mockOllamaProvider: AIProviderConfig = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    ai_provider: 'ollama',
    name: 'Local Ollama',
    api_key: null,
    custom_fields: {
      custom_host: 'http://localhost:11434',
    },
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  describe('Schema Endpoints', () => {
    describe('getAIProviderSchemas', () => {
      it('should fetch all provider schemas successfully', async () => {
        const mockSchemas: AIProviderSchemasResponse = {
          openai: {
            hasCustomFields: false,
            isAPIKeyRequired: true,
          },
          ollama: {
            hasCustomFields: true,
            isAPIKeyRequired: false,
            schema: {
              properties: {
                custom_host: {
                  type: 'string',
                  description: 'Custom Ollama server URL',
                },
              },
            },
          },
        };

        mockedGetAIProviderSchemas.mockResolvedValue(mockSchemas);

        const result = await getAIProviderSchemas();

        expect(result).toEqual(mockSchemas);
        expect(mockedGetAIProviderSchemas).toHaveBeenCalledWith();
      });

      it('should throw error when request fails', async () => {
        mockedGetAIProviderSchemas.mockRejectedValue(
          new Error('Failed to fetch AI provider schemas'),
        );

        await expect(getAIProviderSchemas()).rejects.toThrow(
          'Failed to fetch AI provider schemas',
        );
      });

      it('should handle empty schemas response', async () => {
        mockedGetAIProviderSchemas.mockResolvedValue({});

        const result = await getAIProviderSchemas();

        expect(result).toEqual({});
      });
    });

    describe('getAIProviderSchema', () => {
      it('should fetch Ollama provider schema successfully', async () => {
        const mockSchema: AIProviderSchemaResponse = {
          hasCustomFields: true,
          isAPIKeyRequired: false,
          schema: {
            properties: {
              custom_host: {
                type: 'string',
                description: 'Custom Ollama server URL',
              },
            },
          },
        };

        mockedGetAIProviderSchema.mockResolvedValue(mockSchema);

        const result = await getAIProviderSchema('ollama');

        expect(result).toEqual(mockSchema);
        expect(mockedGetAIProviderSchema).toHaveBeenCalledWith('ollama');
      });

      it('should fetch OpenAI provider schema successfully', async () => {
        const mockSchema: AIProviderSchemaResponse = {
          hasCustomFields: false,
          isAPIKeyRequired: true,
        };

        mockedGetAIProviderSchema.mockResolvedValue(mockSchema);

        const result = await getAIProviderSchema('openai');

        expect(result).toEqual(mockSchema);
        expect(mockedGetAIProviderSchema).toHaveBeenCalledWith('openai');
      });

      it('should throw error when provider not found', async () => {
        mockedGetAIProviderSchema.mockRejectedValue(
          new Error('Failed to fetch schema for provider: non-existent'),
        );

        await expect(getAIProviderSchema('non-existent')).rejects.toThrow(
          'Failed to fetch schema for provider: non-existent',
        );
      });

      it('should throw error when request fails', async () => {
        mockedGetAIProviderSchema.mockRejectedValue(new Error('Network error'));

        await expect(getAIProviderSchema('openai')).rejects.toThrow(
          'Network error',
        );
      });
    });
  });

  describe('CRUD Endpoints', () => {
    describe('getAIProviderAPIKeys', () => {
      it('should fetch AI providers successfully', async () => {
        const mockProviders = [mockAIProvider];
        mockedGetAIProviderAPIKeys.mockResolvedValue(mockProviders);

        const result = await getAIProviderAPIKeys({});

        expect(result).toEqual(mockProviders);
        expect(mockedGetAIProviderAPIKeys).toHaveBeenCalledWith({});
      });

      it('should fetch AI providers with query parameters', async () => {
        const mockProviders = [mockAIProvider];
        mockedGetAIProviderAPIKeys.mockResolvedValue(mockProviders);

        const queryParams = {
          ai_provider: 'openai',
          name: 'Production',
          limit: 10,
          offset: 0,
        };

        const result = await getAIProviderAPIKeys(queryParams);

        expect(result).toEqual(mockProviders);
        expect(mockedGetAIProviderAPIKeys).toHaveBeenCalledWith(queryParams);
      });

      it('should handle empty response', async () => {
        mockedGetAIProviderAPIKeys.mockResolvedValue([]);

        const result = await getAIProviderAPIKeys({});

        expect(result).toEqual([]);
      });

      it('should throw error when request fails', async () => {
        mockedGetAIProviderAPIKeys.mockRejectedValue(
          new Error('Failed to fetch AI provider API keys'),
        );

        await expect(getAIProviderAPIKeys({})).rejects.toThrow(
          'Failed to fetch AI provider API keys',
        );
      });

      it('should filter by provider type', async () => {
        const mockOllamaProviders = [mockOllamaProvider];
        mockedGetAIProviderAPIKeys.mockResolvedValue(mockOllamaProviders);

        const result = await getAIProviderAPIKeys({ ai_provider: 'ollama' });

        expect(result).toEqual(mockOllamaProviders);
        expect(mockedGetAIProviderAPIKeys).toHaveBeenCalledWith({
          ai_provider: 'ollama',
        });
      });
    });

    describe('createAIProvider', () => {
      it('should create AI provider successfully', async () => {
        const createParams: AIProviderConfigCreateParams = {
          ai_provider: 'openai',
          name: 'Test Key',
          api_key: 'sk-test',
          custom_fields: {},
        };

        mockedCreateAIProvider.mockResolvedValue(mockAIProvider);

        const result = await createAIProvider(createParams);

        expect(result).toEqual(mockAIProvider);
        expect(mockedCreateAIProvider).toHaveBeenCalledWith(createParams);
      });

      it('should create Ollama provider with custom fields', async () => {
        const createParams: AIProviderConfigCreateParams = {
          ai_provider: 'ollama',
          name: 'Local Ollama',
          api_key: null,
          custom_fields: {
            custom_host: 'http://localhost:11434',
          },
        };

        mockedCreateAIProvider.mockResolvedValue(mockOllamaProvider);

        const result = await createAIProvider(createParams);

        expect(result).toEqual(mockOllamaProvider);
        expect(mockedCreateAIProvider).toHaveBeenCalledWith(createParams);
      });

      it('should throw error when creation fails', async () => {
        const createParams: AIProviderConfigCreateParams = {
          ai_provider: 'openai',
          name: 'Test Key',
          api_key: 'sk-test',
          custom_fields: {},
        };

        mockedCreateAIProvider.mockRejectedValue(
          new Error('Failed to create AI provider API key'),
        );

        await expect(createAIProvider(createParams)).rejects.toThrow(
          'Failed to create AI provider API key',
        );
      });

      it('should handle validation errors', async () => {
        const createParams: AIProviderConfigCreateParams = {
          ai_provider: 'openai',
          name: '',
          api_key: 'sk-test',
          custom_fields: {},
        };

        mockedCreateAIProvider.mockRejectedValue(new Error('Validation error'));

        await expect(createAIProvider(createParams)).rejects.toThrow(
          'Validation error',
        );
      });
    });

    describe('updateAIProvider', () => {
      it('should update AI provider successfully', async () => {
        const updateParams: AIProviderConfigUpdateParams = {
          name: 'Updated Key',
        };

        const updatedProvider: AIProviderConfig = {
          ...mockAIProvider,
          name: 'Updated Key',
          updated_at: '2023-01-02T00:00:00.000Z',
        };

        mockedUpdateAIProvider.mockResolvedValue(updatedProvider);

        const result = await updateAIProvider(
          '123e4567-e89b-12d3-a456-426614174000',
          updateParams,
        );

        expect(result).toEqual(updatedProvider);
        expect(mockedUpdateAIProvider).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000',
          updateParams,
        );
      });

      it('should update API key', async () => {
        const updateParams: AIProviderConfigUpdateParams = {
          api_key: 'sk-new-key',
        };

        const updatedProvider: AIProviderConfig = {
          ...mockAIProvider,
          api_key: 'sk-new-key',
          updated_at: '2023-01-02T00:00:00.000Z',
        };

        mockedUpdateAIProvider.mockResolvedValue(updatedProvider);

        const result = await updateAIProvider(
          '123e4567-e89b-12d3-a456-426614174000',
          updateParams,
        );

        expect(result).toEqual(updatedProvider);
      });

      it('should update custom fields', async () => {
        const updateParams: AIProviderConfigUpdateParams = {
          custom_fields: {
            custom_host: 'http://localhost:11435',
          },
        };

        const updatedProvider: AIProviderConfig = {
          ...mockOllamaProvider,
          custom_fields: {
            custom_host: 'http://localhost:11435',
          },
          updated_at: '2023-01-02T00:00:00.000Z',
        };

        mockedUpdateAIProvider.mockResolvedValue(updatedProvider);

        const result = await updateAIProvider(
          '223e4567-e89b-12d3-a456-426614174000',
          updateParams,
        );

        expect(result).toEqual(updatedProvider);
      });

      it('should throw error when update fails', async () => {
        const updateParams: AIProviderConfigUpdateParams = {
          name: 'Updated Key',
        };

        mockedUpdateAIProvider.mockRejectedValue(
          new Error('Failed to update AI provider API key'),
        );

        await expect(
          updateAIProvider(
            '123e4567-e89b-12d3-a456-426614174000',
            updateParams,
          ),
        ).rejects.toThrow('Failed to update AI provider API key');
      });

      it('should throw error when provider not found', async () => {
        const updateParams: AIProviderConfigUpdateParams = {
          name: 'Updated Key',
        };

        mockedUpdateAIProvider.mockRejectedValue(
          new Error('AI provider not found'),
        );

        await expect(
          updateAIProvider('non-existent-id', updateParams),
        ).rejects.toThrow('AI provider not found');
      });
    });

    describe('deleteAIProvider', () => {
      it('should delete AI provider successfully', async () => {
        mockedDeleteAIProvider.mockResolvedValue();

        await deleteAIProvider('123e4567-e89b-12d3-a456-426614174000');

        expect(mockedDeleteAIProvider).toHaveBeenCalledWith(
          '123e4567-e89b-12d3-a456-426614174000',
        );
      });

      it('should throw error when deletion fails', async () => {
        mockedDeleteAIProvider.mockRejectedValue(
          new Error('Failed to delete AI provider API key'),
        );

        await expect(
          deleteAIProvider('123e4567-e89b-12d3-a456-426614174000'),
        ).rejects.toThrow('Failed to delete AI provider API key');
      });

      it('should throw error when provider not found', async () => {
        mockedDeleteAIProvider.mockRejectedValue(
          new Error('AI provider not found'),
        );

        await expect(deleteAIProvider('non-existent-id')).rejects.toThrow(
          'AI provider not found',
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in getAIProviderSchemas', async () => {
      mockedGetAIProviderSchemas.mockRejectedValue(new Error('Network error'));

      await expect(getAIProviderSchemas()).rejects.toThrow('Network error');
    });

    it('should handle network errors in getAIProviderSchema', async () => {
      mockedGetAIProviderSchema.mockRejectedValue(new Error('Network error'));

      await expect(getAIProviderSchema('openai')).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle network errors in getAIProviderAPIKeys', async () => {
      mockedGetAIProviderAPIKeys.mockRejectedValue(new Error('Network error'));

      await expect(getAIProviderAPIKeys({})).rejects.toThrow('Network error');
    });

    it('should handle network errors in createAIProvider', async () => {
      const createParams: AIProviderConfigCreateParams = {
        ai_provider: 'openai',
        name: 'Test Key',
        api_key: 'sk-test',
        custom_fields: {},
      };

      mockedCreateAIProvider.mockRejectedValue(new Error('Network error'));

      await expect(createAIProvider(createParams)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle network errors in updateAIProvider', async () => {
      const updateParams: AIProviderConfigUpdateParams = {
        name: 'Updated Key',
      };

      mockedUpdateAIProvider.mockRejectedValue(new Error('Network error'));

      await expect(
        updateAIProvider('123e4567-e89b-12d3-a456-426614174000', updateParams),
      ).rejects.toThrow('Network error');
    });

    it('should handle network errors in deleteAIProvider', async () => {
      mockedDeleteAIProvider.mockRejectedValue(new Error('Network error'));

      await expect(
        deleteAIProvider('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Network error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete CRUD workflow', async () => {
      const createParams: AIProviderConfigCreateParams = {
        ai_provider: 'openai',
        name: 'Test Key',
        api_key: 'sk-test',
        custom_fields: {},
      };

      // Create
      mockedCreateAIProvider.mockResolvedValue(mockAIProvider);
      const created = await createAIProvider(createParams);
      expect(created).toEqual(mockAIProvider);

      // Update
      const updateParams: AIProviderConfigUpdateParams = {
        name: 'Updated Key',
      };
      const updatedProvider = { ...mockAIProvider, name: 'Updated Key' };
      mockedUpdateAIProvider.mockResolvedValue(updatedProvider);
      const updated = await updateAIProvider(created.id, updateParams);
      expect(updated.name).toBe('Updated Key');

      // Delete
      mockedDeleteAIProvider.mockResolvedValue();
      await deleteAIProvider(created.id);
      expect(mockedDeleteAIProvider).toHaveBeenCalledWith(created.id);
    });

    it('should handle Ollama provider with custom fields workflow', async () => {
      const createParams: AIProviderConfigCreateParams = {
        ai_provider: 'ollama',
        name: 'Local Ollama',
        api_key: null,
        custom_fields: {
          custom_host: 'http://localhost:11434',
        },
      };

      // Fetch schema first
      const mockSchema: AIProviderSchemaResponse = {
        hasCustomFields: true,
        isAPIKeyRequired: false,
        schema: {
          properties: {
            custom_host: {
              type: 'string',
              description: 'Custom Ollama server URL',
            },
          },
        },
      };
      mockedGetAIProviderSchema.mockResolvedValue(mockSchema);
      const schema = await getAIProviderSchema('ollama');
      expect(schema.hasCustomFields).toBe(true);
      expect(schema.isAPIKeyRequired).toBe(false);

      // Create provider
      mockedCreateAIProvider.mockResolvedValue(mockOllamaProvider);
      const created = await createAIProvider(createParams);
      expect(created.custom_fields?.custom_host).toBe('http://localhost:11434');
    });
  });
});
