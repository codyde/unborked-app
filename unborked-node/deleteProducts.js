const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function deleteAllProducts() {
  try {
    await client.connect();
    console.log('Connected to the database');

    const query = 'DELETE FROM products';
    await client.query(query);
    console.log('All products deleted from the database');
  } catch (err) {
    console.error('Error deleting products:', err);
  } finally {
    await client.end();
    console.log('Disconnected from the database');
  }
}

deleteAllProducts(); 