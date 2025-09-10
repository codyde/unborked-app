import { test, expect } from '@playwright/test';
import { getCredentials } from './utils'; // Import the utility function

// Configurable test parameters
const TEST_RUNS = 50; // Temporarily reduced for debugging
const PRODUCT_LOAD_TIMEOUT = 3000;
const LOGIN_VERIFY_TIMEOUT = 2000;

// Create test cases for each run
for (let runNumber = 1; runNumber <= TEST_RUNS; runNumber++) {
  test(`Checkout flow test run #${runNumber}`, async ({ page }) => {
    console.log(`Starting checkout test run #${runNumber}`);
    
    // Randomize the number of items to add for each test run
    const ITEMS_TO_ADD = Math.floor(Math.random() * 5) + 1; // Random number between 1-5

    // Step 1: Navigate to homepage
    await page.goto('/');
    await expect(page.locator('text=Buggy code happens; Unbork it')).toBeVisible();
    console.log(`✓ Run #${runNumber}: Loaded homepage`);

    // Click the login link/button in the header
    await page.locator('a[href="/login"]').click();
    
    console.log(`Run #${runNumber}: Waiting for login form...`);
    await page.waitForSelector('#username'); // Wait for the username field to appear *after* clicking login link

    // Fill credentials and submit
    const { username, password } = await getCredentials();
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    // await page.waitForTimeout(2000); // Wait after submitting login

    // --- Verify Login Success ---
    console.log(`Run #${runNumber}: Verifying login success...`);
    try {
        // Add URL check: Ensure we land back on the homepage after login (2s timeout)
        await expect(page).toHaveURL('/', { timeout: 2000 }); // Check URL within 2s

        // Revert to checking for the user icon in the header (2s timeout)
        await expect(page.locator('header button:has(svg.lucide-user)')).toBeVisible({ timeout: 2000 }); // Wait up to 2s for icon

        console.log(`✓ Run #${runNumber}: Login successful! User icon visible.`);
        // await page.waitForTimeout(2000); // Wait after verifying login
    } catch (error) {
        console.error(`❌ Run #${runNumber}: Login failed or redirect/user icon not visible.`);
        await page.screenshot({ path: `./test-results/login-verify-failed-run-${runNumber}.png`, fullPage: true });
        // Add current URL to error message for debugging
        const currentUrl = page.url();
        throw new Error(`Login verification failed for run ${runNumber}. Current URL: ${currentUrl}. Error: ${error}`);
    }

    // --- Refactored: Check for Error or Success Indicator ---
    console.log(`Run #${runNumber}: Checking for 'Failed to load products' error or 'Syntax Error Shield' success indicator...`);
    const errorLocator = page.locator('text="Failed to load products"');
    const specificProductLocator = page.locator('text="Syntax Error Shield"');
    const tryAgainButtonLocator = page.locator('button:has-text("Try Again")');
    let productsLoadedSuccessfully = false;

    try {
        // Wait for EITHER the error or the specific product text to appear
        await Promise.race([
            errorLocator.waitFor({ state: 'visible', timeout: PRODUCT_LOAD_TIMEOUT }),
            specificProductLocator.waitFor({ state: 'visible', timeout: PRODUCT_LOAD_TIMEOUT })
        ]);

        // Now check WHICH ONE appeared
        if (await errorLocator.isVisible()) {
            // ERROR PATH
            console.warn(`❌ Run #${runNumber}: Found 'Failed to load products' error.`);
            if (await tryAgainButtonLocator.isVisible()) {
                 console.log(`Run #${runNumber}: Clicking 'Try Again'...`);
                 await tryAgainButtonLocator.click();
                 await page.waitForTimeout(500); // Short wait
                 console.log(`Run #${runNumber}: Clicking 'Try Again' (2nd time)...`);
                 await tryAgainButtonLocator.click();
                 await page.waitForTimeout(500); // Short wait after 2nd click
            } else {
                console.warn(`Run #${runNumber}: Error message found, but 'Try Again' button not visible.`);
            }
            await page.screenshot({ path: `./test-results/product-load-error-run-${runNumber}.png`, fullPage: true });
            throw new Error(`Found 'Failed to load products' error after login for run #${runNumber}. Failing test.`);

        } else if (await specificProductLocator.isVisible()) {
            // SUCCESS PATH
            console.log(`✓ Run #${runNumber}: 'Syntax Error Shield' product text found. Proceeding with test.`);
            productsLoadedSuccessfully = true;
            // No error needed, test continues below

        } else {
             // Should not be reached if Promise.race resolved, but acts as a safety net
             console.error(`❌ Run #${runNumber}: Unexpected state: Neither error nor success indicator visible after Promise.race resolved.`);
             await page.screenshot({ path: `./test-results/product-wait-unexpected-state-run-${runNumber}.png`, fullPage: true });
             throw new Error(`Unexpected state after waiting for products/error for run #${runNumber}.`);
        }

    } catch (err: any) {
         // TIMEOUT or other error during the wait
         console.error(`❌ Run #${runNumber}: Error or timeout waiting for 'Failed to load products' or 'Syntax Error Shield'. Error: ${err.message}`);
         await page.screenshot({ path: `./test-results/product-wait-timeout-or-error-run-${runNumber}.png`, fullPage: true });
         // Ensure the test fails if we couldn't confirm product load
         throw new Error(`Timeout or error waiting for products/error after login for run #${runNumber}. Original error: ${err.message}`);
    }
    // --- End Refactored Check ---

    // Only proceed if products loaded successfully
    if (!productsLoadedSuccessfully) {
        // This should technically be unreachable due to the throws above, but added for clarity
        console.error(`❌ Run #${runNumber}: Halting test run because products did not load successfully.`);
        // Test will already have failed due to the thrown errors above.
        return; // Exit the test function early.
    }

    // Step 4: Find and add items to cart
    console.log(`Run #${runNumber}: Adding ${ITEMS_TO_ADD} items to cart`);

    // --- Add explicit wait for the product grid container ---
    try {
        console.log(`Run #${runNumber}: Waiting for product grid container '[data-testid="product-grid"]' to be ready...`);
        await page.waitForSelector('[data-testid="product-grid"]', { state: 'visible', timeout: 5000 }); // Wait up to 5s
        console.log(`✓ Run #${runNumber}: Product grid container found.`);

        // --- Add wait for the *first* product card using the new test ID ---
        console.log(`Run #${runNumber}: Waiting for first product element '[data-testid="product-card"]' to appear...`);
        await page.waitForSelector('[data-testid="product-card"]', { state: 'visible', timeout: 5000 }); // Wait up to 5s
        console.log(`✓ Run #${runNumber}: First product card found.`);
        // --------------------------------------------------------------

    } catch (error: any) { // Catch errors from either wait
        console.error(`❌ Run #${runNumber}: Timed out waiting for product grid container or its first product card. Error: ${error.message}`);
        await page.screenshot({ path: `./test-results/no-product-grid-or-card-run-${runNumber}.png`, fullPage: true });
        throw new Error(`Product grid container or first product card not found for run #${runNumber}. Original error: ${error.message}`);
    }
    // ------------------------------------------------------

    for (let i = 0; i < ITEMS_TO_ADD; i++) {
      // Now that we've waited for the first card, locate all cards
      const productCards = page.locator('[data-testid="product-card"]');
      const count = await productCards.count();
      
      if (count === 0) {
        console.error(`❌ Run #${runNumber}: Found 0 product cards even after waiting.`);
        await page.screenshot({ path: `./test-results/no-product-cards-in-loop-run-${runNumber}.png`, fullPage: true });
        throw new Error('No product cards found');
      }
      
      const randomIndex = Math.floor(Math.random() * count);
      const productCard = productCards.nth(randomIndex);
      
      const productName = await productCard.locator('h3').textContent() || 'Unknown product';
      
      const addButton = productCard.locator('[data-testid="add-to-cart-button"]');
      await addButton.waitFor({ state: 'visible' });
      await addButton.click();
      
      console.log(`✓ Run #${runNumber}: Added "${productName}" to cart`);
     
      
   
    } 
    console.log(`Run #${runNumber}: Looking for cart button in header...`);

    await page.waitForTimeout(500); // Add small static delay before trying to locate
    const cartButton = page.locator('[data-testid="cart-button"]');
    
    if (await cartButton.isVisible()) {
      console.log(`✓ Run #${runNumber}: Found cart button in header`);
      await cartButton.click();
      console.log(`✓ Run #${runNumber}: Clicked cart button`);
    } else {
      console.log(`⚠️ Run #${runNumber}: Could not find cart button in header, taking screenshot for debugging`);
      await page.screenshot({ path: `./test-results/no-cart-button-run-${runNumber}.png` });
      
      await page.evaluate(() => {
        window.history.pushState({}, '', '/cart');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }
    
    console.log(`✓ Run #${runNumber}: Navigated to cart.`);
    await page.waitForTimeout(1000); // Small static wait just after navigation

    // --- Wait for the first cart item to render ---
    console.log(`Run #${runNumber}: Waiting for first cart item '[data-testid="cart-item"]' to appear...`);
    try {
        await page.waitForSelector('[data-testid="cart-item"]', { state: 'visible', timeout: 5000 }); // Wait up to 5s
        console.log(`✓ Run #${runNumber}: First cart item found.`);
    } catch (error: any) {
        console.error(`❌ Run #${runNumber}: Timed out waiting for first cart item on cart page. Error: ${error.message}`);
        await page.screenshot({ path: `./test-results/no-cart-items-visible-run-${runNumber}.png`, fullPage: true });
        throw new Error(`First cart item ([data-testid="cart-item"]) not found on cart page for run #${runNumber}. Original error: ${error.message}`);
    }
    // --------------------------------------------------

    const cartItems = page.locator('[data-testid="cart-item"]');
    const cartItemCount = await cartItems.count();
    console.log(`✓ Run #${runNumber}: Found ${cartItemCount} items in the cart visually.`);
    
    if (cartItemCount === 0) {
      console.log(`❌ Run #${runNumber}: No items found in cart`);
      await page.screenshot({ path: `./test-results/no-cart-items-run-${runNumber}.png` });
      throw new Error('No items found in cart');
    }
    
    // --- Proceed to Checkout ---
    console.log(`Run #${runNumber}: Proceeding to checkout...`);
    const checkoutButton = page.locator('[data-testid="checkout-button"]');
    
    // Wait for the button to be visible before clicking
    console.log(`Run #${runNumber}: Waiting for checkout button to be visible...`);
    await checkoutButton.waitFor({ state: 'visible', timeout: 5000 }); 
    console.log(`✓ Run #${runNumber}: Checkout button is visible.`);

    await checkoutButton.click();
    console.log(`✓ Run #${runNumber}: Clicked checkout.`);
    await page.waitForTimeout(100); // Wait after clicking checkout

    // --- Wait for Success Message ---
    console.log(`Run #${runNumber}: Waiting for success message 'Order placed successfully!'...`);
    try {
      const successMessage = page.locator('text=Order placed successfully!');
      await successMessage.waitFor({ state: 'visible', timeout: 10000 }); // Wait up to 10s
      console.log(`✓ Run #${runNumber}: Checkout successful! Success message found.`);
    } catch (error: any) {
      console.error(`❌ Run #${runNumber}: Checkout success message not found. Error: ${error.message}`);
      await page.screenshot({ path: `./test-results/no-success-message-run-${runNumber}.png`, fullPage: true });
      throw new Error(`Checkout success message not found for run #${runNumber}. Original error: ${error.message}`);
    }
  });
}

// Configure runs
test.describe.configure({ mode: 'parallel', timeout: 120000 });