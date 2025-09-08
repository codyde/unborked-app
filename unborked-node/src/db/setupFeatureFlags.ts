import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const setupFeatureFlags = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create the feature_flags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        value BOOLEAN NOT NULL DEFAULT false,
        description TEXT,
        last_updated_by VARCHAR(255),
        last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Feature flags table created successfully');

    // Insert initial flags
    const initialFlags = [
      {
        name: 'STORE_CHECKOUT_ENABLED',
        value: false,
        description: 'Legacy flag, maintained for compatibility but not used functionally.'
      },
      {
        name: 'MAIN_STORE',
        value: false,
        description: 'Legacy flag, maintained for compatibility but not used functionally.'
      },
      {
        name: 'SITE_RELAUNCH',
        value: false,
        description: 'Enables the neo-brutalism basketball theme. Will cause checkout errors if enabled without BACKEND_V2.'
      },
      {
        name: 'BACKEND_V2',
        value: false,
        description: 'Required for checkout to work with SITE_RELAUNCH. When both are enabled, checkout will function correctly.'
      }
    ];

    for (const flag of initialFlags) {
      await pool.query(`
        INSERT INTO feature_flags (name, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET value = EXCLUDED.value,
            description = EXCLUDED.description
        RETURNING *;
      `, [flag.name, flag.value, flag.description]);
    }

    console.log('✅ Initial flags inserted successfully');

    // Verify the table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'feature_flags';
    `);

    console.log('\n📊 Feature Flags Table Structure:');
    console.table(tableInfo.rows);

    // Verify the flags
    const flags = await pool.query('SELECT * FROM feature_flags;');
    
    console.log('\n🚩 Current Feature Flags:');
    console.table(flags.rows);

  } catch (error) {
    console.error('❌ Error setting up feature flags:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupFeatureFlags()
    .then(() => console.log('✨ Setup completed successfully'))
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupFeatureFlags }; 