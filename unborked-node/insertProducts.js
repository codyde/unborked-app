const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// CSV parser utilities (no external deps)
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function unquote(field) {
  const trimmed = field.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function loadProductsFromCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return null;
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(unquote);
  const idx = {
    name: headers.indexOf('name'),
    description: headers.indexOf('description'),
    price: headers.indexOf('price'),
    image: headers.indexOf('image'),
    category: headers.indexOf('category'),
  };

  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]).map(unquote);
    const name = cols[idx.name];
    const description = cols[idx.description];
    const price = cols[idx.price];
    const image = cols[idx.image];
    const category = cols[idx.category];
    if (!name || !description || !price || !image) continue;
    products.push({ name, description, price, image, category });
  }
  return products;
}

// Prefer CSV-sourced products; fall back to static sample array if missing
const csvPath = path.join(__dirname, 'products.csv');
const sampleProducts = loadProductsFromCsv(csvPath) || [];

// Create a new PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Verify that the DATABASE_URL is loaded correctly
console.log('Database URL:', process.env.DATABASE_URL);

async function insertProducts() {
  try {
    await client.connect();
    console.log('Connected to the database');

    if (!sampleProducts.length) {
      console.warn('No products loaded from CSV. Nothing to insert.');
      return;
    }

    for (const product of sampleProducts) {
      const { name, description, price, image, category } = product;
      const query = `
        INSERT INTO products (name, description, price, image, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [name, description, price, image, category];

      const res = await client.query(query, values);
      console.log('Inserted product:', res.rows[0]);
    }
  } catch (err) {
    console.error('Error inserting products:', err);
  } finally {
    await client.end();
    console.log('Disconnected from the database');
  }
}

insertProducts(); 
