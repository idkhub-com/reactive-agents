export function removeTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function removeEndingPath(url: string): string {
  // https://example-eastus2.services.ai.azure.com/models -> https://example-eastus2.services.ai.azure.com
  // Only remove the ending path if there's actually a path after the domain
  const urlParts = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/);
  if (urlParts?.[2]) {
    return urlParts[1] + urlParts[2].replace(/\/[^/]+$/, '');
  }
  return url;
}

/**
 * Matches gateway paths that name the agent and skill in the URL, for example
 * `/v1/agents/my-agent/skills/my-skill/chat/completions`.
 */
const AGENT_SKILL_PATH_PATTERN =
  /^\/v1\/agents\/([^/]+)\/skills\/([^/]+)(\/.*)?$/;

export interface AgentSkillPathScope {
  agent_name: string;
  skill_name: string;
  /** The path with the `/agents/:agent_name/skills/:skill_name` segment removed. */
  pathname: string;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Malformed percent-encoding: keep the raw segment so the lookup fails with
    // an "agent not found" error instead of a decoding crash.
    return segment;
  }
}

/**
 * Reads the agent and skill names out of a path-scoped gateway URL.
 *
 * Returns `null` when the path is not scoped, in which case the names are
 * expected in the `sa-config` header instead.
 */
export function parseAgentSkillPath(
  pathname: string,
): AgentSkillPathScope | null {
  const match = AGENT_SKILL_PATH_PATTERN.exec(pathname);
  if (!match) {
    return null;
  }

  const [, agentName, skillName, rest] = match;

  return {
    agent_name: decodePathSegment(agentName),
    skill_name: decodePathSegment(skillName),
    pathname: `/v1${rest ?? ''}`,
  };
}

/**
 * Rewrites a path-scoped gateway URL to its canonical form so that route
 * matching and logging treat both request styles the same way.
 *
 * `/v1/agents/my-agent/skills/my-skill/chat/completions` -> `/v1/chat/completions`
 */
export function stripAgentSkillPath(urlString: string): string {
  const url = new URL(urlString);
  const scope = parseAgentSkillPath(url.pathname);

  if (!scope) {
    return urlString;
  }

  url.pathname = scope.pathname;
  return url.toString();
}
