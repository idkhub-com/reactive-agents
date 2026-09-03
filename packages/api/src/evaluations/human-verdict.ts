/**
 * A human pressed thumbs up or down on a log: the one signal in the system
 * that is not a model's opinion. Feedback triggers a re-run of the log's
 * evaluations carrying this note, so the judges re-derive what makes the
 * response good or bad with the verdict as an anchor instead of guessing.
 */
export type HumanVerdict = 'good' | 'bad';

export function humanVerdictNote(
  verdict: HumanVerdict,
  reason?: string | null,
): string {
  const base =
    verdict === 'good'
      ? 'IMPORTANT: A human has manually reviewed this exact response and verified it as a GOOD output. Treat that verdict as ground truth about the overall quality. Your job is to work out what makes it work on the dimension you are scoring and score accordingly; if your own analysis says it is bad, re-examine that analysis against the human verdict before answering -- you are likely misreading the task.'
      : 'IMPORTANT: A human has manually reviewed this exact response and verified it as a BAD output. Treat that verdict as ground truth about the overall quality. Your job is to work out what makes it fall short on the dimension you are scoring and score accordingly; if your own analysis says it is good, re-examine that analysis against the human verdict before answering -- you are likely missing the flaw.';

  // The reviewer may also have said why. That is the most specific evidence
  // in the prompt, but it is about the response as a whole: a complaint that
  // belongs to another dimension must not be double-counted into this score.
  const trimmed = reason?.trim();
  if (!trimmed) {
    return base;
  }
  return `${base} The reviewer gave this reason, in their own words: "${trimmed}". Treat it as ground truth as well, and read it before you score: where it bears on the dimension you are scoring, it is the explanation you were looking for and your reasoning should follow it; where it is about some other dimension, do not import its complaint into this score -- the overall verdict still stands either way.`;
}
