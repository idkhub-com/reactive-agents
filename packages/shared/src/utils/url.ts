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
