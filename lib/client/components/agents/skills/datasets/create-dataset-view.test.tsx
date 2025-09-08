import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Test the schema that's used in the CreateDatasetView component
// This is extracted from lib/client/components/agents/skills/datasets/create-dataset-view.tsx:40-51
const createDatasetSchema = z.object({
  name: z
    .string()
    .min(1, 'Dataset name is required')
    .max(100, 'Dataset name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  is_realtime: z.boolean(),
  realtime_size: z.number().min(1),
});

describe('CreateDatasetView Schema Validation', () => {
  describe('Max Character Constraints', () => {
    describe('name field', () => {
      it('should reject empty name', () => {
        const result = createDatasetSchema.safeParse({
          name: '',
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Dataset name is required',
          );
          expect(result.error.issues[0].path).toEqual(['name']);
        }
      });

      it('should reject name longer than 100 characters', () => {
        const longName = 'A'.repeat(101);
        const result = createDatasetSchema.safeParse({
          name: longName,
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Dataset name must be less than 100 characters',
          );
          expect(result.error.issues[0].path).toEqual(['name']);
          expect(result.error.issues[0].code).toBe('too_big');
        }
      });

      it('should accept name exactly at 100 character limit', () => {
        const maxName = 'A'.repeat(100);
        const result = createDatasetSchema.safeParse({
          name: maxName,
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(maxName);
        }
      });

      it('should accept valid name within limits', () => {
        const result = createDatasetSchema.safeParse({
          name: 'Valid Dataset Name',
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Valid Dataset Name');
        }
      });
    });

    describe('description field', () => {
      it('should accept undefined description', () => {
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeUndefined();
        }
      });

      it('should accept empty string description', () => {
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          description: '',
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe('');
        }
      });

      it('should reject description longer than 500 characters', () => {
        const longDescription = 'A'.repeat(501);
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          description: longDescription,
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Description must be less than 500 characters',
          );
          expect(result.error.issues[0].path).toEqual(['description']);
          expect(result.error.issues[0].code).toBe('too_big');
        }
      });

      it('should accept description exactly at 500 character limit', () => {
        const maxDescription = 'A'.repeat(500);
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          description: maxDescription,
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(maxDescription);
        }
      });

      it('should accept valid description within limits', () => {
        const validDescription = 'This is a valid description for the dataset.';
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          description: validDescription,
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(validDescription);
        }
      });
    });

    describe('combined validation', () => {
      it('should reject when both name and description exceed limits', () => {
        const result = createDatasetSchema.safeParse({
          name: 'A'.repeat(101),
          description: 'B'.repeat(501),
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toHaveLength(2);

          const nameIssue = result.error.issues.find(
            (issue) => issue.path[0] === 'name',
          );
          const descriptionIssue = result.error.issues.find(
            (issue) => issue.path[0] === 'description',
          );

          expect(nameIssue?.message).toBe(
            'Dataset name must be less than 100 characters',
          );
          expect(descriptionIssue?.message).toBe(
            'Description must be less than 500 characters',
          );
        }
      });

      it('should accept when both name and description are exactly at limits', () => {
        const result = createDatasetSchema.safeParse({
          name: 'A'.repeat(100),
          description: 'B'.repeat(500),
          is_realtime: false,
          realtime_size: 1,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('A'.repeat(100));
          expect(result.data.description).toBe('B'.repeat(500));
        }
      });

      it('should accept valid data for realtime dataset', () => {
        const result = createDatasetSchema.safeParse({
          name: 'Realtime Dataset',
          description: 'A realtime dataset for testing',
          is_realtime: true,
          realtime_size: 100,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.is_realtime).toBe(true);
          expect(result.data.realtime_size).toBe(100);
          expect(result.data.name).toBe('Realtime Dataset');
          expect(result.data.description).toBe(
            'A realtime dataset for testing',
          );
        }
      });

      it('should validate realtime_size minimum constraint', () => {
        const result = createDatasetSchema.safeParse({
          name: 'Test Dataset',
          description: 'Test description',
          is_realtime: true,
          realtime_size: 0,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const realtimeSizeIssue = result.error.issues.find(
            (issue) => issue.path[0] === 'realtime_size',
          );
          expect(realtimeSizeIssue?.code).toBe('too_small');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters in name length validation', () => {
      // Test with emoji and unicode characters - emojis actually count as multiple characters in JS
      // So we use fewer emojis to stay under limit
      const nameWithEmoji = '🚀'.repeat(20) + 'A'.repeat(20); // Well under 100 characters
      const result = createDatasetSchema.safeParse({
        name: nameWithEmoji,
        is_realtime: false,
        realtime_size: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in description length validation', () => {
      // Test with emoji and unicode characters - emojis count as multiple characters
      // So we use fewer emojis to stay under limit
      const descriptionWithEmoji = '📊'.repeat(50) + 'A'.repeat(100); // Well under 500 characters
      const result = createDatasetSchema.safeParse({
        name: 'Test Dataset',
        description: descriptionWithEmoji,
        is_realtime: false,
        realtime_size: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should reject name with unicode characters over limit', () => {
      const nameWithEmoji = '🚀'.repeat(101); // 101 characters
      const result = createDatasetSchema.safeParse({
        name: nameWithEmoji,
        is_realtime: false,
        realtime_size: 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Dataset name must be less than 100 characters',
        );
      }
    });

    it('should reject description with unicode characters over limit', () => {
      const descriptionWithEmoji = '📊'.repeat(501); // 501 characters
      const result = createDatasetSchema.safeParse({
        name: 'Test Dataset',
        description: descriptionWithEmoji,
        is_realtime: false,
        realtime_size: 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Description must be less than 500 characters',
        );
      }
    });
  });
});
