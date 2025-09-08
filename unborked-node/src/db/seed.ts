import { db } from './index';
import { products, users, flagsTable } from './schema';
import { eq } from 'drizzle-orm';

// Sample product data
const sampleProducts = [
  {
    name: 'Missing Semicolon Detector',
    description: 'Never miss a semicolon again! This tool automatically detects and fixes missing semicolons in your code.',
    price: '19.99',
    image: 'https://placehold.co/300x200?text=Semicolon+Detector',
    category: 'Syntax Errors'
  },
  {
    name: 'Infinite Loop Breaker',
    description: 'Stop those pesky infinite loops before they crash your browser. This tool analyzes your loops and prevents them from running forever.',
    price: '24.99',
    image: 'https://placehold.co/300x200?text=Loop+Breaker',
    category: 'Runtime Errors'
  },
  {
    name: 'Undefined Variable Finder',
    description: 'Say goodbye to "undefined is not a function" errors. This tool scans your code and identifies potential undefined variables before they cause problems.',
    price: '29.99',
    image: 'https://placehold.co/300x200?text=Variable+Finder',
    category: 'Runtime Errors'
  },
  {
    name: 'CSS Specificity Calculator',
    description: 'Confused why your styles aren\'t applying? This tool calculates CSS specificity and helps you understand which rules are taking precedence.',
    price: '15.99',
    image: 'https://placehold.co/300x200?text=CSS+Calculator',
    category: 'Styling Issues'
  },
  {
    name: 'Callback Hell Escape Ladder',
    description: 'Climb out of callback hell with this tool that transforms nested callbacks into clean, readable async/await code.',
    price: '34.99',
    image: 'https://placehold.co/300x200?text=Callback+Escape',
    category: 'Code Quality'
  },
  {
    name: 'Memory Leak Detector',
    description: 'Find and fix memory leaks in your JavaScript applications before they slow down your users.',
    price: '49.99',
    image: 'https://placehold.co/300x200?text=Memory+Leak+Detector',
    category: 'Performance Issues'
  }
];

// Sample user
const sampleUser = {
  username: 'demo',
  password: 'demo123' // In a real app, this would be hashed
};

// Initial feature flags
const initialFlags = [
  { name: 'STORE_CHECKOUT_ENABLED', defaultValue: true },
  { name: 'MAIN_STORE', defaultValue: true },
  { name: 'SITE_RELAUNCH', defaultValue: false },
  { name: 'BACKEND_V2', defaultValue: true },
  { name: 'UNBORKED_V2', defaultValue: false }
];

export async function seed() {
  console.log('Seeding database...');

  try {
    // Insert sample user
    const existingUser = await db.select().from(users).where(eq(users.username, sampleUser.username)).limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values(sampleUser);
      console.log('Sample user created');
    } else {
      console.log('Sample user already exists');
    }

    // Insert sample products
    const existingProducts = await db.select().from(products);
    
    if (existingProducts.length === 0) {
      await db.insert(products).values(sampleProducts);
      console.log('Sample products created');
    } else {
      console.log('Products already exist, skipping seed');
    }

    // Insert initial flags
    const existingFlags = await db.select().from(flagsTable);
    
    if (existingFlags.length === 0) {
      await db.insert(flagsTable).values(initialFlags);
      console.log('Initial flags created');
    } else {
      console.log('Flags already exist, skipping seed');
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}