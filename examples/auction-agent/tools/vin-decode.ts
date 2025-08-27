import type { Logger } from 'pino';

export interface VinDetails {
  [key: string]: string;
}

// Simple NHTSA VIN decode wrapper
export async function decodeVin(
  vin: string,
  logger: Logger,
): Promise<VinDetails | null> {
  if (!vin || vin === 'UNKNOWN' || vin === 'UNKNOWNVIN') return null;
  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const results = Array.isArray((data as Record<string, unknown>)?.Results)
      ? ((data as Record<string, unknown>).Results as Record<string, unknown>[])
      : [];
    const map: VinDetails = {};
    for (const row of results) {
      const key = String(row?.Variable || '').trim();
      const val = String(row?.Value || '').trim();
      if (key && val) map[key] = val;
    }
    return Object.keys(map).length ? map : null;
  } catch (e) {
    logger.warn({ err: e, vin }, 'VIN decode failed');
    return null;
  }
}
