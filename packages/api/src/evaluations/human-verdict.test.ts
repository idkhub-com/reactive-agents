import { humanVerdictNote } from '@api/evaluations/human-verdict';
import { describe, expect, it } from 'vitest';

/**
 * The note is the whole of what a human verdict contributes to a judge's
 * prompt, so what it does and does not say is the behaviour under test.
 */
describe('humanVerdictNote', () => {
  it('anchors the judge to the verdict', () => {
    expect(humanVerdictNote('good')).toContain('verified it as a GOOD output');
    expect(humanVerdictNote('bad')).toContain('verified it as a BAD output');
  });

  it("quotes the reviewer's reason when they typed one", () => {
    const note = humanVerdictNote('bad', 'It invented the citation.');

    expect(note).toContain('"It invented the citation."');
    // The reason is about the response as a whole, and each judge scores one
    // dimension: a complaint from elsewhere must not be double-counted here.
    expect(note).toContain('do not import its complaint into this score');
  });

  it('says nothing about a reason for a bare thumb', () => {
    // Whitespace and the nullable column both mean "no reason given" -- an
    // empty quotation would read to the judge as a reviewer with no answer.
    for (const reason of [undefined, null, '   \n  ']) {
      const note = humanVerdictNote('good', reason);
      expect(note).not.toContain('in their own words');
      expect(note).toBe(humanVerdictNote('good'));
    }
  });

  it('trims the stored reason before quoting it', () => {
    expect(humanVerdictNote('good', '  Nailed the tone.  ')).toContain(
      '"Nailed the tone."',
    );
  });
});
