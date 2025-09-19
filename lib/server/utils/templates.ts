export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  let systemPrompt = template;
  // Simple Jinja-style variable replacement
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{ ${key} }}`;
    systemPrompt = systemPrompt.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(value),
    );
  });

  return systemPrompt;
}
