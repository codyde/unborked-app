import { seed } from './seed';
import { db } from './index';
import { users } from './schema';

async function testSeed() {
  // First check if any users exist
  const existingUsersBefore = await db.select().from(users);
  console.log('Users before seeding:', existingUsersBefore);
  
  // Run the seed function
  await seed();
  
  // Check if users were added
  const existingUsersAfter = await db.select().from(users);
  console.log('Users after seeding:', existingUsersAfter);
}

testSeed()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });