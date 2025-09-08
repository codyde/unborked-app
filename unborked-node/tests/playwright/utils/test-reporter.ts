import * as fs from 'fs';
import * as path from 'path';

// Interface for test results
export interface CheckoutTestResult {
  runNumber: number;
  timestamp: string;
  itemCount: number;
  duration: number;   // in seconds
  success: boolean;
  errorMessage?: string;
  productNames: string[];
}

// Class to capture and store test results
export class TestReporter {
  private results: CheckoutTestResult[] = [];
  private outputDir: string;
  
  constructor() {
    // Create output directory if it doesn't exist
    this.outputDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  // Add a test result
  addResult(result: CheckoutTestResult): void {
    this.results.push(result);
    // Log to console
    console.log(`Test #${result.runNumber}: ${result.success ? 'SUCCESS' : 'FAILURE'} - ${result.itemCount} items in ${result.duration.toFixed(2)}s`);
  }
  
  // Save results to a JSON file
  saveResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.outputDir, `checkout-test-results-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify({
      summary: this.getSummary(),
      results: this.results
    }, null, 2));
    
    console.log(`Results saved to ${filePath}`);
  }
  
  // Generate summary statistics
  getSummary(): any {
    if (this.results.length === 0) {
      return { count: 0, message: 'No test results available' };
    }
    
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;
    const totalItems = this.results.reduce((sum, r) => sum + r.itemCount, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    // Calculate averages
    const avgItemsPerRun = totalItems / this.results.length;
    const avgDuration = totalDuration / this.results.length;
    
    // Find min/max durations
    const durations = this.results.map(r => r.duration);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    return {
      totalRuns: this.results.length,
      successRate: `${((successCount / this.results.length) * 100).toFixed(2)}%`,
      successCount,
      failureCount,
      totalItems,
      totalDuration: `${totalDuration.toFixed(2)}s`,
      avgItemsPerRun: avgItemsPerRun.toFixed(2),
      avgDuration: `${avgDuration.toFixed(2)}s`,
      minDuration: `${minDuration.toFixed(2)}s`,
      maxDuration: `${maxDuration.toFixed(2)}s`,
    };
  }
  
  // Get a single instance across all tests
  private static instance: TestReporter;
  
  static getInstance(): TestReporter {
    if (!TestReporter.instance) {
      TestReporter.instance = new TestReporter();
    }
    return TestReporter.instance;
  }
} 