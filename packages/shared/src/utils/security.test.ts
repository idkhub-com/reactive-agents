import { describe, expect, it } from 'vitest';
import { safeJsonStringify, sanitizeHtml, sanitizeUserInput } from './security';

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
});
