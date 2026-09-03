import { ServedConfiguration } from '@shared/types/data/skill-optimization-arm';

/** The configuration a log was served by, if the optimizer pulled one. */
export function readServedConfiguration(
  metadata: Record<string, unknown> | null | undefined,
): ServedConfiguration | null {
  const parsed = ServedConfiguration.safeParse(metadata?.served_configuration);
  return parsed.success ? parsed.data : null;
}

export interface SystemPromptOrigin {
  label: string;
  title: string;
}

/**
 * Where the system prompt that reached the provider came from, in the words
 * the rest of the dashboard uses: an optimized skill substitutes the prompt
 * of the configuration it pulled, and every other skill forwards what the
 * client sent, sometimes with instructions appended.
 *
 * `configuration` is absent on logs written before it was recorded, and on
 * requests the optimizer did not serve; `partition` is what the log row
 * itself keeps.
 */
export function describeSystemPromptOrigin({
  partition,
  configuration,
  clientPrompt,
  sentPrompt,
}: {
  partition: string | null;
  configuration: ServedConfiguration | null;
  /** The system prompt the client sent, as received. */
  clientPrompt: string | null;
  /** The system prompt that reached the provider. */
  sentPrompt: string | null;
}): SystemPromptOrigin | null {
  if (partition && configuration) {
    return {
      label: `partition ${partition} · configuration ${configuration.name}`,
      title: `The optimizer served this request with configuration ${configuration.name} of partition ${partition}, whose system prompt replaced the one the client sent`,
    };
  }
  if (partition) {
    return {
      label: `partition ${partition}`,
      title: `The optimizer served this request from partition ${partition}; which configuration it pulled was not recorded`,
    };
  }
  if (!clientPrompt || !sentPrompt) return null;
  if (sentPrompt === clientPrompt) {
    return {
      label: 'as sent by the client',
      title:
        'This skill substituted no prompt, so the provider saw what the client sent',
    };
  }
  if (sentPrompt.startsWith(clientPrompt)) {
    return {
      label: 'client prompt + gateway instructions',
      title:
        "The client's prompt, with instructions the gateway appended -- the response schema in prose, for a provider that does not enforce response_format itself",
    };
  }
  return null;
}
