const SELECTED_AGENT_NAME_KEY = 'selectedAgentName';

export function checkStorageAvailability(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function saveSelectedAgentName(agentName: string): void {
  if (!checkStorageAvailability()) return;
  try {
    localStorage.setItem(SELECTED_AGENT_NAME_KEY, agentName);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

export function getSelectedAgentName(): string | null {
  if (!checkStorageAvailability()) return null;
  try {
    const stored = localStorage.getItem(SELECTED_AGENT_NAME_KEY);
    return stored ?? null;
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
}

export function removeSelectedAgentName(): void {
  if (!checkStorageAvailability()) return;
  try {
    localStorage.removeItem(SELECTED_AGENT_NAME_KEY);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
}
