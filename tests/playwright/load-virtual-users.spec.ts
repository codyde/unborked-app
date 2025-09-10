import { test, expect } from '@playwright/test';
import { getCredentials } from './utils';

// Config
const RUNS = Number(process.env.RUNS || 10); // default 10 per execution
const SHORT = 5000; // 5s per step timeouts
const FLAGS_QS = 'ADVANCED_FILTERING=1&EXPERIMENTAL_CHECKOUT=1';

// Helpers
async function gotoHomeWithFlags(page: any) {
  await page.goto(`/?${FLAGS_QS}`);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function maybeFailSearchIfPresent(page: any, run: number) {
  const searchInput = page.getByLabel('Search products');
  if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Force the autocomplete API to fail to satisfy the scenario
    await page.route('**/api/products/search**', async (route: any) => {
      await route.abort('failed');
    });

    const query = `test-${Math.random().toString(36).slice(2, 6)}`;
    await searchInput.fill(query);
    // Small wait for the debounced request to fire and fail
    await page.waitForTimeout(700);
    // Expect the error message rendered by AdvancedSearch
    // Error message text can vary (e.g., network abort message), match broadly
    const container = searchInput.locator('xpath=ancestor::div[1]');
    await expect(
      container.locator('text=/failed|error/i').first()
    ).toBeVisible({ timeout: SHORT });
    // Remove the route so it doesn't affect later navigation
    await page.unroute('**/api/products/search**');
  }
}

async function login(page: any) {
  await gotoHomeWithFlags(page);
  const creds = await getCredentials();

  // If already logged in, header shows username next to user icon
  const maybeUserButton = page.getByRole('button', { name: creds.username });
  if (await maybeUserButton.isVisible().catch(() => false)) {
    return;
  }

  await page.locator('a[href="/login"]').click();
  await page.locator('#username').fill(creds.username);
  await page.locator('#password').fill(creds.password);
  await page.locator('button[type="submit"]').click();

  // Verify login success via header (button with username text)
  await expect(page.getByRole('button', { name: creds.username })).toBeVisible({ timeout: SHORT });

  // Return to home with flags to ensure correct UI is present post-login
  await gotoHomeWithFlags(page);
}

async function addItemsViaDetailPages(page: any, count: number) {
  // Use explicit test IDs from the components
  const grid = page.locator('[data-testid="product-grid"]');
  const cards = page.locator('[data-testid="product-card"]');
  const loadError = page.locator('text=Failed to load products');
  const tryAgain = page.getByRole('button', { name: 'Try Again' });

  // Retry to recover from transient product load errors
  for (let attempt = 0; attempt < 3; attempt++) {
    // Wait either for grid/cards or error
    await Promise.race([
      grid.waitFor({ state: 'visible', timeout: SHORT }).catch(() => {}),
      cards.first().waitFor({ state: 'visible', timeout: SHORT }).catch(() => {}),
      loadError.waitFor({ state: 'visible', timeout: SHORT }).catch(() => {}),
    ]);

    if ((await grid.isVisible().catch(() => false)) || (await cards.first().isVisible().catch(() => false))) break;

    if (await loadError.isVisible().catch(() => false)) {
      if (await tryAgain.isVisible().catch(() => false)) {
        await tryAgain.click();
        await page.waitForTimeout(300);
      } else {
        await page.reload();
      }
    }
  }

  // If grid/cards are still not present, fall back to direct product detail navigation
  const gridOk = await grid.isVisible().catch(() => false);
  const cardOk = await cards.first().isVisible().catch(() => false);
  if (!gridOk || !cardOk) {
    await addViaDirectDetailFallback(page, count);
    return;
  }

  await expect(grid).toBeVisible({ timeout: SHORT });
  await expect(cards.first()).toBeVisible({ timeout: SHORT });

  for (let i = 0; i < count; i++) {
    const total = await cards.count();
    if (total === 0) {
      throw new Error('No product links available');
    }
    const index = randomInt(0, total - 1);
    await cards.nth(index).click();

    // On detail page, click Add to Cart
    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible({ timeout: SHORT });
    await page.getByRole('button', { name: 'Add to Cart' }).click();

    // Back to products
    await page.getByRole('link', { name: 'Back to Products' }).click();
    await expect(cards.first()).toBeVisible({ timeout: SHORT });
  }
}

// Fallback path: navigate directly to product detail pages by ID and add items
async function addViaDirectDetailFallback(page: any, count: number) {
  let added = 0;
  for (let id = 1; id <= 50 && added < count; id++) {
    await page.goto(`/product/${id}`);
    const addBtn = page.getByRole('button', { name: 'Add to Cart' });
    if (await addBtn.isVisible({ timeout: SHORT }).catch(() => false)) {
      await addBtn.click();
      added++;
      // Return to products
      const back = page.getByRole('link', { name: 'Back to Products' });
      if (await back.isVisible({ timeout: SHORT }).catch(() => false)) {
        await back.click();
      } else {
        await gotoHomeWithFlags(page);
      }
      await page.waitForTimeout(150);
    }
  }
  if (added === 0) {
    throw new Error('Fallback failed: Could not add any items via direct product pages');
  }
}

async function proceedToCartAndFailOneClick(page: any) {
  // Go to cart
  await page.getByTestId('header-cart-button').click();
  // At least one cart item should exist
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible({ timeout: SHORT });

  // One‑click button appears only with EXPERIMENTAL_CHECKOUT flag enabled
  const oneClick = page.getByText('One‑Click with BorkedPay');
  if (await oneClick.isVisible({ timeout: SHORT }).catch(() => false)) {
    await oneClick.click();
    // Backend returns 402; UI shows an error banner. Look for decline text.
    await expect(
      page.locator('text=declined').or(page.locator('text=Failed to process checkout'))
    ).toBeVisible({ timeout: SHORT });
  }
}

test.describe.configure({ mode: 'parallel' });

for (let run = 1; run <= RUNS; run++) {
  test(`VU load flow run ${run}/${RUNS}`, async ({ page, browserName }) => {
    // Login (app sets Sentry user itself)
    await login(page);

    // Optional search step (only when the search component is present)
    await maybeFailSearchIfPresent(page, run);

    // Add 1–5 random items via detail pages
    const itemsToAdd = randomInt(1, 5);
    await addItemsViaDetailPages(page, itemsToAdd);

    // Proceed to cart and attempt one‑click (expect failure UI)
    await proceedToCartAndFailOneClick(page);
  });
}
