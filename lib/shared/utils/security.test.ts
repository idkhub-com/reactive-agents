import { describe, expect, it } from 'vitest';
import {
  safeJsonStringify,
  sanitizeDescription,
  sanitizeHtml,
  sanitizeMetadata,
  sanitizeUserInput,
} from './security';

describe('Security Utils', () => {
  describe('sanitizeHtml', () => {
    it('escapes HTML entities', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const expected =
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      expect(sanitizeHtml(maliciousInput)).toBe(expected);
    });

    it('escapes all dangerous characters', () => {
      const input = '&<>"\'`=/';
      const expected = '&amp;&lt;&gt;&quot;&#39;&#x60;&#x3D;&#x2F;';
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it('preserves safe characters', () => {
      const input = 'Hello World 123!@#$%^*()_+-[]{}|\\:;,.?~';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('safeJsonStringify', () => {
    it('safely stringifies simple objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeJsonStringify(obj, 2);
      expect(result).toContain('&quot;name&quot;: &quot;test&quot;');
      expect(result).toContain('&quot;value&quot;: 123');
    });

    it('handles malicious object values', () => {
      const maliciousObj = {
        script: '<script>alert("xss")</script>',
        onclick: 'onclick="alert(1)"',
      };
      const result = safeJsonStringify(maliciousObj);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onclick=');
      expect(result).toContain('&lt;script&gt;');
    });

    it('handles circular references', () => {
      const obj: { name: string; self?: unknown } = { name: 'test' };
      obj.self = obj; // Create circular reference

      const result = safeJsonStringify(obj);
      expect(result).toBe('[Invalid JSON data]');
    });

    it('handles undefined values', () => {
      const result = safeJsonStringify(undefined);
      expect(result).toBe('undefined');
    });

    it('handles functions', () => {
      const obj = {
        name: 'test',
        fn: () => console.log('test'),
      };
      const result = safeJsonStringify(obj, 2);
      expect(result).toContain('&quot;name&quot;: &quot;test&quot;');
      expect(result).not.toContain('function');
    });
  });

  describe('sanitizeUserInput', () => {
    it('removes script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello  World');
    });

    it('removes javascript protocol', () => {
      const input = 'Click javascript:alert("xss") here';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Click  here');
    });

    it('removes data protocol', () => {
      const input = 'Image data:text/html,<script>alert(1)</script>';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Image');
    });

    it('removes event handlers', () => {
      const input = 'Text onclick="alert(1)" onload="hack()" more text';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Text   more text');
    });

    it('escapes HTML entities', () => {
      const input = 'Safe <em>text</em> & more';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Safe &lt;em&gt;text&lt;&#x2F;em&gt; &amp; more');
    });

    it('trims whitespace', () => {
      const input = '   Hello World   ';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello World');
    });

    it('handles complex malicious input', () => {
      const input = `  <script>alert('xss')</script>
        <img src="x" onerror="alert(1)">
        javascript:void(0)
        data:text/html,<script>
        onclick="malicious()"  `;
      const result = sanitizeUserInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('data:');
      expect(result).not.toContain('onclick=');
      expect(result).not.toContain('onerror=');
    });
  });

  describe('sanitizeDescription', () => {
    it('sanitizes valid description', () => {
      const input = 'This is <em>my</em> description';
      const result = sanitizeDescription(input);
      expect(result).toBe('This is &lt;em&gt;my&lt;&#x2F;em&gt; description');
    });

    it('returns null for null input', () => {
      expect(sanitizeDescription(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
      expect(sanitizeDescription(undefined)).toBe(null);
    });

    it('returns null for non-string input', () => {
      expect(sanitizeDescription(123 as unknown as string)).toBe(null);
    });

    it('returns null for empty string after sanitization', () => {
      expect(sanitizeDescription('   ')).toBe(null);
    });

    it('truncates long descriptions', () => {
      const longInput = 'a'.repeat(2500);
      const result = sanitizeDescription(longInput);
      expect(result).toHaveLength(2003); // 2000 + '...'
      expect(result?.endsWith('...')).toBe(true);
    });

    it('preserves normal length descriptions', () => {
      const input = 'This is a normal description';
      const result = sanitizeDescription(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeMetadata', () => {
    it('sanitizes simple metadata', () => {
      const metadata = {
        name: 'test',
        description: '<script>alert("xss")</script>',
      };
      const result = sanitizeMetadata(metadata);
      expect(result.name).toBe('test');
      // Script tags are removed, so description becomes empty and is filtered out
      expect(result.description).toBeUndefined();
      expect(Object.keys(result)).toEqual(['name']);
    });

    it('sanitizes object values as JSON', () => {
      const metadata = {
        config: {
          dangerous: '<script>alert(1)</script>',
          safe: 'value',
        },
      };
      const result = sanitizeMetadata(metadata);
      expect(result.config).toContain('&quot;dangerous&quot;');
      expect(result.config).not.toContain('<script>');
      expect(result.config).toContain('&lt;script&gt;');
    });

    it('sanitizes malicious keys', () => {
      const metadata = {
        'onclick="alert(1)"': 'value',
        '<script>': 'dangerous',
        normalKey: 'safe',
      };
      const result = sanitizeMetadata(metadata);
      expect(result).not.toHaveProperty('onclick="alert(1)"');
      expect(result).not.toHaveProperty('<script>');
      expect(result.normalKey).toBe('safe');
    });

    it('skips keys that become empty after sanitization', () => {
      const metadata = {
        '   ': 'value1',
        '<<<>>>': 'value2',
        valid: 'value3',
      };
      const result = sanitizeMetadata(metadata);
      // '   ' becomes empty after trim, '<<<>>>' becomes only HTML entities and is removed
      expect(result).toEqual({ valid: 'value3' });
    });

    it('handles mixed data types', () => {
      const metadata = {
        string: 'test',
        number: 123,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3],
        null: null,
      };
      const result = sanitizeMetadata(metadata);
      expect(result.string).toBe('test');
      expect(result.number).toBe('123');
      expect(result.boolean).toBe('true');
      expect(result.object).toContain('&quot;nested&quot;');
      expect(result.array).toContain('[');
      expect(result.null).toBe('null');
    });

    it('handles empty metadata', () => {
      const result = sanitizeMetadata({});
      expect(result).toEqual({});
    });
  });
});
