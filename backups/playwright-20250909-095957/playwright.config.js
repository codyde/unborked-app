module.exports = {
  testDir: './tests',
  workers: 10, // 10 concurrent workers
  timeout: 60000, // 60 second timeout per test
  retries: 1, // Retry failed tests once
  use: {
    headless: true, // Run headless for performance
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
};
