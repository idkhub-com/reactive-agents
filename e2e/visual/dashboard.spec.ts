import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { AGENTS_PATH, createAgent } from '../fixtures/agents';

/**
 * Pixel baselines for the dashboard.
 *
 * These are the only specs in the suite that compare images, and they carry
 * two constraints nothing else does.
 *
 * **The environment has to be pinned.** FreeType hinting and antialiasing
 * differ between distributions, so a baseline written on a workstation and
 * compared on a CI runner disagrees on pixels that no one changed. Playwright
 * labels both `linux` and would silently reuse the file. So the project is
 * opt-in, and `pnpm test:e2e:visual` runs it inside the Playwright container
 * image -- the same image CI uses -- which is what makes the comparison mean
 * anything. Baselines are regenerated with `pnpm test:e2e:visual:update`.
 *
 * **The page has to be deterministic.** Two sources of drift are handled for
 * us: `screenshot.css` hides the endlessly animating sidebar logo, and this
 * project gets its own server and database so no other spec's agents appear in
 * the list. What is left is the fixture below, which -- unlike every other
 * spec in this suite -- uses a *fixed* name. `uniqueAgentName()` would put a
 * different string on screen every run and no baseline could ever match.
 */

const FIXTURE_AGENT = 'visual-fixture-agent';
const FIXTURE_DESCRIPTION =
  'A fixed agent, so the dashboard always has the same thing to render.';

/**
 * Idempotent rather than a create/delete pair: the server truncates its
 * database on boot, and locally the server is reused between runs, so the row
 * is either already right or absent. Nothing else writes to this database.
 */
async function ensureFixtureAgent(request: APIRequestContext): Promise<void> {
  const response = await request.get(AGENTS_PATH, {
    params: { name: FIXTURE_AGENT },
  });
  const existing = (await response.json()) as { name: string }[];

  if (!existing.some((agent) => agent.name === FIXTURE_AGENT)) {
    await createAgent(request, FIXTURE_AGENT, FIXTURE_DESCRIPTION);
  }
}

/**
 * Web fonts land after first paint, and they move text. Waiting on them is the
 * difference between a stable baseline and one that depends on how warm the
 * cache was.
 */
async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ request }) => {
  await ensureFixtureAgent(request);
});

test.describe('dashboard appearance', () => {
  test('the agents list', async ({ page }) => {
    await page.goto('/agents');
    await expect(
      page.getByRole('heading', { name: 'Agents', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: FIXTURE_AGENT }),
    ).toBeVisible();
    await settle(page);

    await expect(page).toHaveScreenshot('agents-list.png', { fullPage: true });
  });

  test('the create agent form', async ({ page }) => {
    // No server data of its own, so this one pins the form controls and the
    // page chrome around them.
    await page.goto('/agents/create');
    await expect(page.getByLabel('Agent Name')).toBeVisible();
    await settle(page);

    await expect(page).toHaveScreenshot('create-agent.png', { fullPage: true });
  });

  test('the sidebar', async ({ page }) => {
    // Scoped to the sidebar because that is where the regressions have been:
    // #244 left an empty `SidebarFooter` behind when the log out button was
    // hidden, which renders as a stray gap that no assertion on the DOM
    // notices. With no ACCESS_PASSWORD on this server there is no footer at
    // all, and this baseline is what says so.
    await page.goto('/agents');
    await expect(
      page.getByRole('link', { name: 'AI Providers & Models' }),
    ).toBeVisible();
    await settle(page);

    await expect(
      page.locator('[data-slot="sidebar"]').first(),
    ).toHaveScreenshot('sidebar.png');
  });
});

test.describe('dashboard appearance in dark mode', () => {
  // The theme follows the system preference, so emulating it is enough --
  // there is no toggle to click and no state to reset afterwards.
  test.use({ colorScheme: 'dark' });

  test('the agents list', async ({ page }) => {
    await page.goto('/agents');
    await expect(
      page.getByRole('heading', { name: 'Agents', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: FIXTURE_AGENT }),
    ).toBeVisible();
    await settle(page);

    await expect(page).toHaveScreenshot('agents-list-dark.png', {
      fullPage: true,
    });
  });
});
