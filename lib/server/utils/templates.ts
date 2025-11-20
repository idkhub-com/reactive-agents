export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
  allowedVariables?: string[],
): string {
  // If allowedVariables is specified, only use variables that are in the allowed list
  const filteredVariables = allowedVariables
    ? Object.fromEntries(
        Object.entries(variables).filter(([key]) =>
          allowedVariables.includes(key),
        ),
      )
    : variables;

  let systemPrompt = template;
  // Simple Jinja-style variable replacement
  Object.entries(filteredVariables).forEach(([key, value]) => {
    const placeholder = `{{ ${key} }}`;
    systemPrompt = systemPrompt.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(value),
    );
  });

  return systemPrompt;
}
