import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const updateFeatureFlags = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting feature flag update...');

    // Clear existing flags
    await pool.query(`DELETE FROM feature_flags;`);
    console.log('✅ Cleared existing feature flags');

    // Insert new flags
    const updatedFlags = [
      {
        name: 'UNBORKED_V2',
        value: true,
        description: 'Enables the new version of the Unborked application interface and functionality.'
      },
      {
        name: 'EXPERIMENTAL_CHECKOUT',
        value: false,
        description: 'Enables the experimental checkout flow with enhanced UX and analytics.'
      },
      {
        name: 'DARK_MODE',
        value: false,
        description: 'Activates dark mode across the entire application interface.'
      },
      {
        name: 'ADVANCED_FILTERING',
        value: false,
        description: 'Enables advanced product filtering and sorting options in the catalog.'
      }
    ];

    for (const flag of updatedFlags) {
      await pool.query(`
        INSERT INTO feature_flags (name, value, description)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [flag.name, flag.value, flag.description]);
    }

    console.log('✅ Updated feature flags inserted successfully');

    // Verify the updated flags
    const flags = await pool.query('SELECT * FROM feature_flags;');
    
    console.log('\n🚩 Current Feature Flags:');
    console.table(flags.rows);

  } catch (error) {
    console.error('❌ Error updating feature flags:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run update if this file is executed directly
if (require.main === module) {
  updateFeatureFlags()
    .then(() => console.log('✨ Feature flags update completed successfully'))
    .catch(error => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

export { updateFeatureFlags }; 