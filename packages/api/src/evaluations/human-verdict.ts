/**
 * A human pressed thumbs up or down on a log: the one signal in the system
 * that is not a model's opinion. Feedback triggers a re-run of the log's
 * evaluations carrying this note, so the judges re-derive what makes the
 * response good or bad with the verdict as an anchor instead of guessing.
 */
export type HumanVerdict = 'good' | 'bad';

export function humanVerdictNote(verdict: HumanVerdict): string {
  return verdict === 'good'
    ? 'IMPORTANT: A human has manually reviewed this exact response and verified it as a GOOD output. Treat that verdict as ground truth about the overall quality. Your job is to work out what makes it work on the dimension you are scoring and score accordingly; if your own analysis says it is bad, re-examine that analysis against the human verdict before answering -- you are likely misreading the task.'
    : 'IMPORTANT: A human has manually reviewed this exact response and verified it as a BAD output. Treat that verdict as ground truth about the overall quality. Your job is to work out what makes it fall short on the dimension you are scoring and score accordingly; if your own analysis says it is good, re-examine that analysis against the human verdict before answering -- you are likely missing the flaw.';
}
