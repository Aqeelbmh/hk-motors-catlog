// CLI Database Migration Script: local products.json -> Supabase (Comprehensive Mapping)
// Run with: SUPABASE_URL=your-url SUPABASE_KEY=your-anon-key node migrate-to-supabase.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Resolve environment credentials
let url = process.env.SUPABASE_URL;
let key = process.env.SUPABASE_KEY;

// Check if .env file exists and parse it manually if needed
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (k === 'SUPABASE_URL') url = v;
      if (k === 'SUPABASE_KEY' || k === 'SUPABASE_ANON_KEY') key = v;
    }
  });
}

if (!url || !key) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY are required.');
  console.log('Set them in a .env file or run as:');
  console.log('SUPABASE_URL=https://... SUPABASE_KEY=... node migrate-to-supabase.js\n');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const productsPath = path.join(__dirname, 'products.json');
    if (!fs.existsSync(productsPath)) {
      console.error('❌ Error: products.json not found in this directory.');
      process.exit(1);
    }

    console.log('📖 Reading products.json...');
    const rawData = fs.readFileSync(productsPath, 'utf-8');
    const catalog = JSON.parse(rawData);

    if (!Array.isArray(catalog) || catalog.length === 0) {
      console.error('❌ Error: products.json is empty or not a valid JSON array.');
      process.exit(1);
    }

    console.log(`⚡ Found ${catalog.length} products to migrate.`);
    console.log('🚀 Starting batch upload (100 products per request)...');

    const BATCH_SIZE = 100;
    for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
      const batch = catalog.slice(i, i + BATCH_SIZE);
      const rows = batch.map(p => {
        // Parse numbers safely
        const stockQty = parseInt(p.stockQty || p.quantity || '0', 10) || 0;
        const quantity = parseInt(p.quantity || p.stockQty || '0', 10) || 0;
        const buyRate = parseFloat(p.buyRate) || 0.0;
        const retailPrice = parseFloat(p.retailPrice) || 0.0;
        const wholesalePrice = parseFloat(p.wholesalePrice) || 0.0;
        const profit = parseFloat(p.profit) || 0.0;
        const discount = parseFloat(p.discount) || 0.0;
        const tax = parseFloat(p.tax) || 0.0;
        const lowStockAlert = parseInt(p.lowStockAlert || '0', 10) || 0;

        return {
          product_id: String(p.productId),
          type: p.type ? String(p.type).trim() : null,
          name: String(p.productName || 'Unnamed spare part').replace(/\s+/g, ' ').trim(),
          quantity: quantity,
          brand_code: p.brandCode ? String(p.brandCode).trim() : null,
          brand: p.brand ? String(p.brand).trim() : 'GENUINE',
          category: p.category ? String(p.category).trim() : 'Accessories',
          buy_rate: buyRate,
          retail_price: retailPrice,
          wholesale_price: wholesalePrice,
          part_number: p.barcode ? String(p.barcode) : null,
          expiry_date: p.expiryDate ? String(p.expiryDate).trim() : null,
          low_stock_alert: lowStockAlert,
          retail_code: p.retailCode ? String(p.retailCode).trim() : null,
          wholesale_code: p.wholesaleCode ? String(p.wholesaleCode).trim() : null,
          mrp_code: p.mrpCode ? String(p.mrpCode).trim() : null,
          sleeve: p.sleeve ? String(p.sleeve).trim() : null,
          vehicle_fitment: p.fit ? String(p.fit).trim() : 'General',
          size: p.size ? String(p.size).trim() : 'Standard',
          color: p.color ? String(p.color).trim() : null,
          pattern: p.pattern ? String(p.pattern).trim() : null,
          description: p.description ? String(p.description).replace(/\s+/g, ' ').trim() : null,
          profit: profit,
          discount: discount,
          tax: tax,
          stock_qty: stockQty,
          image_urls: [] // Populated by browser image sync utility
        };
      });

      // Upsert to merge items and prevent duplicates on product_id
      const { error } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'product_id' });

      if (error) {
        console.error(`❌ Batch upload failed at index ${i}:`, error.message);
        throw error;
      }

      console.log(`✅ Uploaded products ${i + 1} to ${Math.min(i + BATCH_SIZE, catalog.length)}...`);
    }

    console.log('\n🎉 Database migration complete! All products are now in Supabase.');
    console.log('Next step: Log into the HK Motors Admin Panel online and run the "Cloud Image Migration Utility" to upload images.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message || err);
    process.exit(1);
  }
}

run();
