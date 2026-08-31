import {
  SkillRoutingDecision,
  type SkillRoutingMethod,
} from '@shared/types/data/skill-routing';

/** The routing decision a log carries, if the gateway chose its skill. */
export function readSkillRouting(
  metadata: Record<string, unknown> | null | undefined,
): SkillRoutingDecision | null {
  const parsed = SkillRoutingDecision.safeParse(metadata?.skill_routing);
  return parsed.success ? parsed.data : null;
}

const METHOD_LABELS: Record<SkillRoutingMethod, string> = {
  only_skill: 'only skill',
  embedding: 'closest skill',
  most_used: 'most used (fallback)',
  created: 'new skill',
};

const METHOD_TITLES: Record<SkillRoutingMethod, string> = {
  only_skill: 'The agent had one skill, so no choice was needed',
  embedding:
    "The skill whose recent traffic is closest to this request's system prompt and tools",
  most_used:
    'The request could not be embedded, so the most used skill served it',
  created: 'No skill was close enough, so this request became a new one',
};

export interface SkillRoutingDescription {
  label: string;
  /** Similarity against the threshold, when both were computed. */
  detail: string | null;
  title: string;
}

/** Words for a routing decision, for the log view. */
export function describeSkillRouting(
  decision: SkillRoutingDecision,
): SkillRoutingDescription {
  const { method, similarity, threshold, candidates } = decision;
  const parts: string[] = [];
  if (similarity !== null) {
    parts.push(
      threshold !== null
        ? `${similarity.toFixed(2)} ${similarity < threshold ? '<' : '\u2265'} ${threshold.toFixed(2)}`
        : similarity.toFixed(2),
    );
  }
  if (candidates > 0) {
    parts.push(`${candidates} candidate${candidates === 1 ? '' : 's'}`);
  }
  return {
    label: METHOD_LABELS[method],
    detail: parts.length > 0 ? parts.join(' \u00b7 ') : null,
    title: METHOD_TITLES[method],
  };
}
