import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4173';
const LOGIN_CREDENTIALS = {
  username: 'cody',
  password: 'cody123'
};

// Total number of test runs and concurrency
const TOTAL_RUNS = 500;
const CONCURRENT_WORKERS = 10;

// Available products to choose from randomly
const AVAILABLE_PRODUCTS = [
  'Callback Hell Rescuer',
  'Memory Leak Fixer',
  'Infinite Loop Guard',
  'Code Formatter',
  'Syntax Error Shield',
  'Undefined Variable Protector',
  'Error Logger',
  'Performance Profiler',
  'Security Scanner',
  'Accessibility Checker',
  'Responsive Design Tester',
  'Unit Test Generator',
  'Code Complexity Analyzer',
  'Code Coverage Reporter',
  'API Mocking Tool',
  'Data Migration Assistant',
  'GraphQL Explorer',
  'Docker Image Optimizer'
];

// Configure Playwright to use multiple workers
test.describe.configure({ mode: 'parallel' });

// Helper function to get random products
function getRandomProducts() {
  const numProducts = Math.floor(Math.random() * 4) + 1; // 1-4 products
  const shuffled = [...AVAILABLE_PRODUCTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numProducts);
}

// Helper function to add a product to cart
async function addProductToCart(page, productName) {
  try {
    const productCard = page.getByTestId('product-grid')
      .locator('div')
      .filter({ hasText: productName })
      .filter({ hasText: 'Add to Cart' });

    await productCard.getByTestId('add-to-cart-button').click();
    await page.waitForTimeout(100); // Brief wait for cart update
    return true;
  } catch (error) {
    console.error(`Failed to add ${productName} to cart:`, error.message);
    return false;
  }
}

// Helper function to perform login
async function loginUser(page) {
  await page.goto(BASE_URL);

  // Check if already logged in
  const userButton = page.getByRole('button', { name: LOGIN_CREDENTIALS.username });
  if (await userButton.isVisible()) {
    return true; // Already logged in
  }

  // Perform login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(LOGIN_CREDENTIALS.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(LOGIN_CREDENTIALS.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Verify login success
  await expect(userButton).toBeVisible({ timeout: 5000 });
  return true;
}

// Helper function to perform checkout
async function performCheckout(page, products) {
  const startTime = Date.now();

  try {
    // Go to cart
    await page.getByTestId('header-cart-button').click();
    await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible({ timeout: 5000 });

    // Verify products are in cart
    for (const productName of products) {
      await expect(page.getByRole('heading', { name: productName, level: 3 })).toBeVisible({ timeout: 3000 });
    }

    // Get total before checkout
    const totalElement = page.locator('text=Total').locator('..').locator('text=$').last();
    const totalText = await totalElement.textContent();

    // Proceed to checkout
    await page.getByTestId('checkout-button').click();

    // Verify successful checkout
    await expect(page.getByText('Order placed successfully!')).toBeVisible({ timeout: 5000 });

    // Get transaction ID
    const transactionElement = page.locator('text=Your transaction ID:').locator('..').locator('text=#');
    const transactionId = await transactionElement.textContent();

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: true,
      transactionId,
      total: totalText,
      duration,
      products
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: false,
      error: error.message,
      duration,
      products
    };
  }
}

// Generate 500 individual test cases
for (let i = 1; i <= TOTAL_RUNS; i++) {
  test(`Checkout Test Run ${i}/${TOTAL_RUNS}`, async ({ page, browserName }) => {
    const runStartTime = Date.now();
    const products = getRandomProducts();

    try {
      // Login
      await loginUser(page);

      // Add random products to cart
      let itemsInCart = 0;
      const addedProducts = [];

      for (const productName of products) {
        const success = await addProductToCart(page, productName);
        if (success) {
          itemsInCart++;
          addedProducts.push(productName);

          // Verify cart count updated
          await expect(page.getByTestId('header-cart-button')).toContainText(itemsInCart.toString(), { timeout: 3000 });
        }
      }

      // Only proceed if at least one product was added
      if (addedProducts.length === 0) {
        throw new Error('No products were successfully added to cart');
      }

      // Perform checkout
      const result = await performCheckout(page, addedProducts);

      if (result.success) {
        const totalDuration = Date.now() - runStartTime;
        console.log(`✅ Run ${i}: ${result.transactionId} | ${addedProducts.length} items | ${result.total} | ${totalDuration}ms | Browser: ${browserName}`);

        // Return to shopping for next test
        await page.getByRole('link', { name: 'Continue Shopping' }).click();
      } else {
        throw new Error(`Checkout failed: ${result.error}`);
      }

    } catch (error) {
      const totalDuration = Date.now() - runStartTime;
      console.error(`❌ Run ${i} failed: ${error.message} | ${totalDuration}ms | Products: ${products.join(', ')}`);
      throw error; // Re-throw to mark test as failed
    }
  });
}

// Summary test to track overall statistics
test('Test Summary and Statistics', async ({ page }) => {
  // This test runs after all others and provides a summary
  console.log('\n📊 Test Summary:');
  console.log(`Total Test Runs: ${TOTAL_RUNS}`);
  console.log(`Concurrent Workers: ${CONCURRENT_WORKERS}`);
  console.log(`Available Products: ${AVAILABLE_PRODUCTS.length}`);
  console.log('Test execution completed. Check individual test results above.\n');
});

// Load test configuration
test.describe('E-commerce Load Test Configuration', () => {
  test.beforeAll(async () => {
    console.log('\n🚀 Starting E-commerce Load Test');
    console.log(`📋 Configuration:`);
    console.log(`   • Total runs: ${TOTAL_RUNS}`);
    console.log(`   • Concurrent workers: ${CONCURRENT_WORKERS}`);
    console.log(`   • Random products per run: 1-4`);
    console.log(`   • Available products: ${AVAILABLE_PRODUCTS.length}`);
    console.log(`   • Target URL: ${BASE_URL}`);
    console.log(`   • Login: ${LOGIN_CREDENTIALS.username}\n`);
  });
});

// Stress test that runs a subset with high concurrency
test.describe('Quick Stress Test', () => {
  for (let i = 1; i <= 20; i++) {
    test(`Stress Test ${i}/20`, async ({ page }) => {
      const products = getRandomProducts();

      await loginUser(page);

      // Add products quickly
      for (const productName of products) {
        await addProductToCart(page, productName);
      }

      // Quick checkout
      await page.getByTestId('header-cart-button').click();
      await page.getByTestId('checkout-button').click();
      await expect(page.getByText('Order placed successfully!')).toBeVisible();

      console.log(`🚄 Stress test ${i} completed with ${products.length} products`);
    });
  }
});

// Performance benchmark test
test('Performance Benchmark', async ({ page }) => {
  const benchmarkRuns = 10;
  const durations = [];

  console.log(`\n⏱️  Running ${benchmarkRuns} performance benchmark tests...`);

  for (let i = 1; i <= benchmarkRuns; i++) {
    const startTime = Date.now();

    await loginUser(page);
    await addProductToCart(page, 'Code Formatter'); // Use consistent product for benchmarking
    await page.getByTestId('header-cart-button').click();
    await page.getByTestId('checkout-button').click();
    await expect(page.getByText('Order placed successfully!')).toBeVisible();
    await page.getByRole('link', { name: 'Continue Shopping' }).click();

    const duration = Date.now() - startTime;
    durations.push(duration);

    console.log(`   Benchmark run ${i}: ${duration}ms`);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(`\n📈 Performance Results:`);
  console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Fastest: ${minDuration}ms`);
  console.log(`   Slowest: ${maxDuration}ms`);

  // Assert performance requirements
  expect(avgDuration).toBeLessThan(15000); // Average should be under 15 seconds
  expect(maxDuration).toBeLessThan(30000); // No single run should exceed 30 seconds
});
