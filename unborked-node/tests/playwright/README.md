# Playwright E2E Tests for KidsHoops

This directory contains end-to-end tests using Playwright for testing the KidsHoops application.

## Checkout Stress Test

The checkout stress test (`checkout-stress.spec.ts`) simulates 500 checkout flows with random cart items to test the stability and performance of the checkout system.

### Configuration

You can configure the test parameters in the test file:

```typescript
// Configurable test parameters
const TEST_RUNS = 500;          // Number of test runs
const MAX_ITEMS_PER_RUN = 5;    // Maximum items per cart
const MIN_ITEMS_PER_RUN = 1;    // Minimum items per cart
```

### Running the Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm run test:e2e

# Run just the checkout stress test
npm run test:checkout

# Run the checkout test with the Playwright UI
npm run test:checkout:ui

# Show the test report after running tests
npm run report
```

### Test Results

Test results are stored in two locations:

1. **Playwright Report**: Playwright generates an HTML report in the `playwright-report` directory. View it with `npm run report`.

2. **Test Results JSON**: Detailed test data is stored in the `test-results` directory as JSON files. Each file contains:
   - Summary statistics (success rate, average duration, etc.)
   - Detailed data for each test run

### Troubleshooting

If the tests fail, check the following:

1. Make sure the application is running (`npm run dev`)
2. Check that the selectors in the test match your current UI
3. Verify that your app has products available to add to cart
4. Look at the failure screenshots in the `test-results` directory

## Modifying Selectors

If your UI components have different class names or text, update the selectors in the test file:

```typescript
// Example selectors that might need adjustment
await page.locator('.product-card').all();
await page.locator('.product-title').textContent();
await page.locator('button:has-text("Add to Cart")').click();
await page.locator('a[href="/cart"]').click();
await page.locator('.cart-item').count();
await page.locator('button:has-text("Checkout")').click();
await page.locator('text=Thank you for your order').toBeVisible();
```

## Adding More Tests

To add more tests, create new `.spec.ts` files in this directory and follow the Playwright testing patterns. 