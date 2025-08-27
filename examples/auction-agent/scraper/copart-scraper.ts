import type { Logger } from 'pino';
import type { CopartVehicle, SearchCriteria } from '../copart';

/**
 * Playwright scraper with multiple extraction strategies and pagination.
 * It is dynamically imported by the agent when COPART_REAL_SCRAPER=true.
 */
export async function scrapeCopartListings(
  criteria: SearchCriteria,
  logger: Logger,
): Promise<CopartVehicle[]> {
  if ((process.env.COPART_TOS_ACK || '').toLowerCase() !== 'true') {
    logger.warn(
      'COPART_TOS_ACK is not true; skipping real scraping and returning empty list',
    );
    return [];
  }
  let browser: any;
  const baseUrl =
    process.env.COPART_BASE_URL || 'https://www.copart.com/lotSearchResults/';
  const maxPages = Number(process.env.IDK_SCRAPER_MAX_PAGES || 1);
  const delayMs = Number(process.env.IDK_SCRAPER_DELAY_MS || 1500);
  const perPageLimit = Number(process.env.IDK_SCRAPER_PER_PAGE_LIMIT || 50);

  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: userAgent() });
    const page = await context.newPage();

    const queryParts = [
      (criteria.makes || []).join(' '),
      (criteria.models || []).join(' '),
      (criteria.keywords || []).join(' '),
    ].filter(Boolean);
    const searchQuery = encodeURIComponent(queryParts.join(' ').trim());
    const url = `${baseUrl}?query=${searchQuery}`;
    logger.info({ url }, 'Navigating to Copart search page');

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page
      .waitForLoadState('networkidle', { timeout: 45000 })
      .catch(() => {});
    await page.waitForTimeout(2000);

    const collected: CopartVehicle[] = [];
    let currentPage = 1;
    while (true) {
      const items = await tryExtractListings(page, perPageLimit, logger);
      collected.push(...items);
      logger.info(
        { page: currentPage, count: items.length, total: collected.length },
        'Extracted items',
      );

      if (currentPage >= maxPages) break;

      const nextClicked = await tryClickNext(page, logger);
      if (!nextClicked) break;
      currentPage += 1;
      await page
        .waitForLoadState('networkidle', { timeout: 45000 })
        .catch(() => {});
      await page.waitForTimeout(delayMs);
    }

    await context.close();
    await browser.close();
    return collected;
  } catch (error) {
    logger.warn({ err: error }, 'Scraping failed; will fall back to mock data');
    try {
      if (browser) await browser.close();
    } catch {}
    return [];
  }
}

async function tryExtractListings(
  page: any,
  perPageLimit: number,
  logger: Logger,
): Promise<CopartVehicle[]> {
  // Strategy A: Parse anchors to lot pages and nearby context
  try {
    const data = await page.$$eval('a[href*="/lot/"]', (links: any[]) => {
      // Defensive: fallback to string[] if DOM types unavailable
      return Array.from(
        new Set(
          links
            .map((a: any) => (a && typeof a.href === 'string' ? a.href : null))
            .filter(Boolean),
        ),
      )
        .slice(0, 200)
        .map((href) => ({ href }));
    });

    const vehicles: CopartVehicle[] = [] as any;
    for (const { href } of data.slice(0, perPageLimit)) {
      // Query the closest text context around the link
      const handle = await page.$(`a[href='${cssEscape(href)}']`);
      if (!handle) continue;
      const wrapper = await handle.evaluateHandle((el: any) =>
        el.closest('article,li,div'),
      );
      const text = wrapper
        ? await (await wrapper.asElement())?.innerText()
        : await handle.innerText();
      const title = firstMatch(text, /(\d{4})\s+([A-Za-z0-9-]+)\s+([^\n]+)/);
      const year = title?.groups?.[1]
        ? Number(title.groups[1])
        : inferYear(text);
      const make = title?.groups?.[2] || inferMake(text);
      const model = title?.groups?.[3] || inferModel(text);
      const lotNumber =
        firstMatch(text, /(Lot|LOT)\s*#?\s*(?<lot>[A-Za-z0-9]+)/)?.groups
          ?.lot || shortId();
      const location =
        firstMatch(text, /(Location|Yard):\s*(?<loc>[^\n]+)/)?.groups?.loc ||
        'Unknown';
      const mileage = toNumber(
        firstMatch(text, /(Mileage|Odo):\s*(?<mi>[\d,]+)\s*(mi|miles)?/i)
          ?.groups?.mi,
      );
      const currentBid = toCurrency(
        firstMatch(text, /(Current\s*Bid|Bid):\s*\$?(?<bid>[\d,]+)/i)?.groups
          ?.bid,
      );
      const estimatedValue = toCurrency(
        firstMatch(text, /(Est(imated)?\s*Value|Retail):\s*\$?(?<val>[\d,]+)/i)
          ?.groups?.val,
      );
      const damage =
        firstMatch(text, /(Damage):\s*(?<dmg>[^\n]+)/i)?.groups?.dmg ||
        'unknown';

      const vehicle: CopartVehicle = {
        id: lotNumber,
        title:
          [year, make, model].filter(Boolean).join(' ') || 'Unknown Vehicle',
        year: Number.isFinite(year) ? (year as number) : 2000,
        make: make || 'Unknown',
        model: model || 'Unknown',
        vin: 'UNKNOWN',
        mileage: Number.isFinite(mileage) ? (mileage as number) : 0,
        damage: damage,
        currentBid: Number.isFinite(currentBid) ? (currentBid as number) : 0,
        estimatedValue: Number.isFinite(estimatedValue)
          ? (estimatedValue as number)
          : 0,
        auctionEndTime: new Date(Date.now() + 3600_000).toISOString(),
        location,
        images: [],
        description: text.slice(0, 500),
        lotNumber,
        saleStatus: 'active',
      };
      vehicles.push(vehicle);
      if (vehicles.length >= perPageLimit) break;
    }
    if (vehicles.length > 0) return vehicles;
  } catch (e) {
    logger.debug({ err: String(e) }, 'Strategy A failed');
  }

  // Strategy B: Try to parse embedded JSON from scripts
  try {
    const scripts = await page.$$eval('script', (els: Element[]) =>
      els.map((s) =>
        // Use duck-typing to check for textContent property
        typeof (s as any).textContent === 'string'
          ? (s as any).textContent || ''
          : '',
      ),
    );
    for (const content of scripts) {
      const json = firstJson(content);
      if (!json) continue;
      const vehicles = mapJsonToVehiclesLoose(json).slice(0, perPageLimit);
      if (vehicles.length > 0) return vehicles as any;
    }
  } catch (e) {
    logger.debug({ err: String(e) }, 'Strategy B failed');
  }

  return [];
}

async function tryClickNext(page: any, _logger: Logger): Promise<boolean> {
  // Try common next controls
  const selectors = [
    'button[aria-label="Next"]',
    'a[aria-label="Next"]',
    'button:has-text("Next")',
    'a:has-text("Next")',
  ];
  for (const sel of selectors) {
    const found = await page.$(sel);
    if (found) {
      await found.click({ timeout: 5000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

function safeString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function toNumber(s: unknown): number | undefined {
  if (typeof s !== 'string') return undefined;
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function toCurrency(s: unknown): number | undefined {
  return toNumber(s);
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function shortId(): string {
  return cryptoRandomId().slice(0, 8).toUpperCase();
}

function userAgent(): string {
  return [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'AppleWebKit/537.36 (KHTML, like Gecko)',
    'Chrome/125.0.0.0 Safari/537.36',
  ].join(' ');
}

function cssEscape(s: string): string {
  return s.replace(/'|"|\\/g, '\\$&');
}

function firstMatch(
  text: string,
  regex: RegExp,
): (RegExpMatchArray & { groups?: Record<string, string> }) | null {
  return text.match(regex) as any;
}

function inferYear(text: string): number | undefined {
  const m = text.match(/\b(20\d{2}|19\d{2})\b/);
  return m ? Number(m[1]) : undefined;
}

function inferMake(text: string): string | undefined {
  const makes = [
    'Toyota',
    'Honda',
    'Ford',
    'Chevrolet',
    'Nissan',
    'BMW',
    'Mercedes',
    'Audi',
    'Hyundai',
    'Kia',
    'Subaru',
    'Lexus',
    'Tesla',
    'Ram',
    'Dodge',
    'Jeep',
    'Volkswagen',
  ];
  const m = makes.find((mk) => new RegExp(`\\b${mk}\\b`, 'i').test(text));
  return m;
}

function inferModel(text: string): string | undefined {
  const models = [
    'Camry',
    'Civic',
    'Accord',
    'Corolla',
    'Model 3',
    'Model Y',
    'Altima',
    'Sentra',
    'RAV4',
    'CR-V',
    'F-150',
    'Silverado',
    'Ram 1500',
  ];
  const m = models.find((md) => new RegExp(`\\b${md}\\b`, 'i').test(text));
  return m;
}

function firstJson(s: string): any | null {
  try {
    const match = s.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function mapJsonToVehiclesLoose(json: any): CopartVehicle[] {
  try {
    const items: any[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json?.data)
        ? json.data
        : [];
    const vehicles: CopartVehicle[] = [] as any;
    for (const it of items) {
      const year = toNumber(it.year);
      const make = safeString(it.make);
      const model = safeString(it.model);
      const lot = safeString(it.lotNumber) || shortId();
      const v: CopartVehicle = {
        id: lot,
        title: [year, make, model].filter(Boolean).join(' ') || 'Vehicle',
        year: Number.isFinite(year as any) ? (year as number) : 2000,
        make: make || 'Unknown',
        model: model || 'Unknown',
        vin: safeString(it.vin) || 'UNKNOWN',
        mileage: toNumber(it.mileage) || 0,
        damage: safeString(it.damage) || 'unknown',
        currentBid: toNumber(it.currentBid) || 0,
        estimatedValue: toNumber(it.estimatedValue) || 0,
        auctionEndTime:
          safeString(it.auctionEndTime) ||
          new Date(Date.now() + 3600_000).toISOString(),
        location: safeString(it.location) || 'Unknown',
        images: Array.isArray(it.images) ? it.images.map(String) : [],
        description: safeString(it.description) || '',
        lotNumber: lot,
        saleStatus: 'active',
      };
      vehicles.push(v);
    }
    return vehicles;
  } catch {
    return [];
  }
}
