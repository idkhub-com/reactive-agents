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
    it('escapes script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeUserInput(input);
      // Script tags are escaped, not removed - this is safe because < > are HTML entities
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('escapes script tags with malformed closing tags', () => {
      // All < and > are escaped, making them safe
      expect(sanitizeUserInput('<script>alert(1)</script >')).toContain(
        '&lt;script&gt;',
      );
      expect(sanitizeUserInput('<script>alert(1)</script >')).not.toContain(
        '<script>',
      );
    });

    it('escapes nested/crafted script tags', () => {
      // Even nested attempts are safe because all < > are escaped
      const input = '<scrip<script>removed</script>t>alert(1)</script>';
      const result = sanitizeUserInput(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('&lt;');
    });

    it('escapes event handlers', () => {
      // Event handlers are escaped - the = and " are HTML entities
      const input = 'onclick="a" onmouseover="b" onfocus="c"';
      const result = sanitizeUserInput(input);
      // The = is escaped to &#x3D; and " to &quot;
      expect(result).not.toContain('onclick=');
      expect(result).toContain('onclick&#x3D;');
    });

    it('escapes protocols', () => {
      // Protocols are escaped - : remains but < > = " are escaped
      expect(sanitizeUserInput('javascript:alert(1)')).toBe(
        'javascript:alert(1)',
      );
      // The protocol itself is not dangerous without being in an href or src attribute
      // which would require < > to construct
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

    it('prevents XSS with complex malicious input', () => {
      const input = `  <script>alert('xss')</script>
        <img src="x" onerror="alert(1)">
        javascript:void(0)
        data:text/html,<script>
        onclick="malicious()"  `;
      const result = sanitizeUserInput(input);
      // All < > = " are escaped, preventing HTML injection
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('onclick=');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;img');
    });

    it('preserves safe text content', () => {
      const input = 'Hello World! This is safe text.';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello World! This is safe text.');
    });

    it('escapes all XSS vectors', () => {
      // Various XSS vectors should all be neutralized by escaping
      const vectors = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<a href="javascript:alert(1)">',
        '<div onclick="alert(1)">',
        "'-alert(1)-'",
        '"><script>alert(1)</script>',
      ];

      for (const vector of vectors) {
        const result = sanitizeUserInput(vector);
        // None of these should contain unescaped < > = "
        expect(result).not.toMatch(/<[a-zA-Z]/);
        expect(result).not.toContain('="');
      }
    });
  });

  /**
   * Regression tests for CodeQL security issues:
   * - Incomplete multi-character sanitization
   * - Bad HTML filtering regex
   *
   * These tests ensure our HTML entity escaping approach prevents all XSS attacks
   * that regex-based sanitization might miss.
   */
  describe('XSS Prevention Regression Tests', () => {
    /**
     * Helper to verify output cannot be used for HTML injection.
     * After sanitization, the output should not contain any characters
     * that could form HTML tags or attributes.
     */
    function assertSafeOutput(result: string): void {
      // No unescaped angle brackets (would allow tag injection)
      expect(result).not.toMatch(/<[a-zA-Z!/?]/);
      expect(result).not.toContain('>');

      // No unescaped quotes with equals (would allow attribute injection)
      expect(result).not.toContain('="');
      expect(result).not.toContain("='");

      // No unescaped equals followed by content (would allow attribute values)
      expect(result).not.toMatch(/=[^&]/);
    }

    describe('Multi-character sanitization bypass attempts', () => {
      it('prevents nested script tag bypass', () => {
        // Classic bypass: <scrip<script>t> becomes <script> after naive removal
        const input = '<scrip<script>removed</script>t>alert(1)</script>';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('prevents nested event handler bypass', () => {
        // Nested event handler: oonclick becomes onclick after naive removal
        const input = '<div oonclickclick="alert(1)">';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('prevents nested javascript protocol bypass', () => {
        // Nested protocol: javajavascript:script: becomes javascript: after naive removal
        const input = '<a href="javajavascript:script:alert(1)">';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('prevents nested data protocol bypass', () => {
        // Nested data: dadata:ta: becomes data: after naive removal
        const input =
          '<a href="dadata:ta:text/html,<script>alert(1)</script>">';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('prevents recursive injection after removal', () => {
        // Multiple levels of nesting
        const input = '<<script>script>alert(1)<</script>/script>';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('prevents HTML comment bypass', () => {
        // Nested comments: <!-<!--- becomes <!-- after naive removal
        const input = '<!-<!--->- comment -->';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });
    });

    describe('OWASP XSS attack vectors', () => {
      it('prevents basic script injection', () => {
        const vectors = [
          '<script>alert(1)</script>',
          '<SCRIPT>alert(1)</SCRIPT>',
          '<ScRiPt>alert(1)</ScRiPt>',
          '<script src="evil.js"></script>',
          '<script>alert(String.fromCharCode(88,83,83))</script>',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents event handler injection', () => {
        const vectors = [
          '<img src=x onerror=alert(1)>',
          '<body onload=alert(1)>',
          '<div onmouseover=alert(1)>',
          '<input onfocus=alert(1) autofocus>',
          '<marquee onstart=alert(1)>',
          '<video><source onerror=alert(1)>',
          '<details open ontoggle=alert(1)>',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents SVG-based XSS', () => {
        const vectors = [
          '<svg onload=alert(1)>',
          '<svg><script>alert(1)</script></svg>',
          '<svg><animate onbegin=alert(1)>',
          '<svg><set onbegin=alert(1)>',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents math-based XSS', () => {
        const vectors = [
          '<math><maction actiontype=statusline#http://evil.com>',
          '<math><mi xlink:href="javascript:alert(1)">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents iframe injection', () => {
        const vectors = [
          '<iframe src="javascript:alert(1)">',
          '<iframe src="data:text/html,<script>alert(1)</script>">',
          '<iframe srcdoc="<script>alert(1)</script>">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents object/embed injection', () => {
        const vectors = [
          '<object data="javascript:alert(1)">',
          '<embed src="javascript:alert(1)">',
          '<object data="data:text/html,<script>alert(1)</script>">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents form-based XSS', () => {
        const vectors = [
          '<form action="javascript:alert(1)"><input type=submit>',
          '<button formaction="javascript:alert(1)">',
          '<input type="image" formaction="javascript:alert(1)">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents meta refresh XSS', () => {
        const vectors = [
          '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
          '<meta http-equiv="refresh" content="0;url=data:text/html,<script>">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents base tag hijacking', () => {
        const input = '<base href="javascript:alert(1)//">';
        assertSafeOutput(sanitizeUserInput(input));
      });

      it('prevents link-based XSS', () => {
        const vectors = [
          '<link rel="import" href="data:text/html,<script>alert(1)</script>">',
          '<link rel="stylesheet" href="javascript:alert(1)">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });
    });

    describe('Attribute injection attempts', () => {
      it('prevents breaking out of attributes', () => {
        const vectors = [
          '" onclick="alert(1)"',
          "' onclick='alert(1)'",
          '"><script>alert(1)</script>',
          "'><script>alert(1)</script>",
          '" onmouseover="alert(1)" "',
          '`onclick=alert(1)`',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents style-based XSS', () => {
        const vectors = [
          '<div style="background:url(javascript:alert(1))">',
          '<div style="behavior:url(evil.htc)">',
          '<div style="-moz-binding:url(evil.xml#xss)">',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('prevents expression-based XSS (IE)', () => {
        const input = '<div style="width:expression(alert(1))">';
        assertSafeOutput(sanitizeUserInput(input));
      });
    });

    describe('Encoding bypass attempts', () => {
      it('handles mixed case evasion', () => {
        const vectors = [
          '<SCRIPT>alert(1)</SCRIPT>',
          '<ScRiPt>alert(1)</ScRiPt>',
          '<sCrIpT>alert(1)</sCrIpT>',
          '<IMG SRC=x ONERROR=alert(1)>',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('handles null byte injection', () => {
        const vectors = [
          '<scr\x00ipt>alert(1)</script>',
          '<img src=x one\x00rror=alert(1)>',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });

      it('handles newline/tab injection', () => {
        const vectors = [
          '<img src=x\nonerror=alert(1)>',
          '<img src=x\tonerror=alert(1)>',
          '<img src=x\r\nonerror=alert(1)>',
          'java\nscript:alert(1)',
          'java\tscript:alert(1)',
        ];
        for (const vector of vectors) {
          assertSafeOutput(sanitizeUserInput(vector));
        }
      });
    });

    describe('Edge cases', () => {
      it('handles empty string', () => {
        expect(sanitizeUserInput('')).toBe('');
      });

      it('handles whitespace-only string', () => {
        expect(sanitizeUserInput('   ')).toBe('');
      });

      it('handles very long malicious input', () => {
        const longScript = `<script>${'a'.repeat(10000)}</script>`;
        const result = sanitizeUserInput(longScript);
        assertSafeOutput(result);
      });

      it('handles repeated dangerous patterns', () => {
        const input = `${'<script>'.repeat(100)}alert(1)${'</script>'.repeat(100)}`;
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
      });

      it('handles Unicode lookalikes', () => {
        // These are visually similar to < and > but are different characters
        const input = '＜script＞alert(1)＜/script＞'; // Fullwidth characters
        const result = sanitizeUserInput(input);
        // Fullwidth angle brackets pass through, but regular / is still escaped
        expect(result).toBe('＜script＞alert(1)＜&#x2F;script＞');
        // The important thing: no actual HTML tags can be formed
        expect(result).not.toMatch(/<[a-zA-Z]/);
      });

      it('preserves legitimate text with special characters', () => {
        const input = 'Math: 5 < 10 and 10 > 5, also a & b';
        const result = sanitizeUserInput(input);
        // Should be escaped but content preserved
        expect(result).toContain('5 &lt; 10');
        expect(result).toContain('10 &gt; 5');
        expect(result).toContain('a &amp; b');
      });

      it('handles consecutive special characters', () => {
        const input = '<<<>>>==="""\'\'\'```';
        const result = sanitizeUserInput(input);
        assertSafeOutput(result);
        expect(result).toBe(
          '&lt;&lt;&lt;&gt;&gt;&gt;&#x3D;&#x3D;&#x3D;&quot;&quot;&quot;&#39;&#39;&#39;&#x60;&#x60;&#x60;',
        );
      });
    });
  });
});
