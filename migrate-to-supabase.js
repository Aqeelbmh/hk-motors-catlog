// CLI Database Migration Script: local products.json -> Supabase (Comprehensive Mapping)
// Run with: SUPABASE_URL=your-url SUPABASE_KEY=your-anon-key node migrate-to-supabase.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Resolve environment credentials
let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
let key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Check if .env or .env.local files exist and parse them manually if needed
function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, fileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k === 'SUPABASE_URL' || k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
        if (k === 'SUPABASE_KEY' || k === 'SUPABASE_ANON_KEY' || k === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = v;
      }
    });
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

if (!url || !key) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY are required.');
  console.log('Set them in a .env file or run as:');
  console.log('SUPABASE_URL=https://... SUPABASE_KEY=... node migrate-to-supabase.js\n');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const exportPath = path.join(__dirname, 'PSHOP_Products_Export_20260622_192931.json');
    if (!fs.existsSync(exportPath)) {
      console.error('❌ Error: PSHOP_Products_Export_20260622_192931.json not found in this directory.');
      process.exit(1);
    }

    console.log('📖 Reading PSHOP_Products_Export_20260622_192931.json...');
    const rawData = fs.readFileSync(exportPath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    const catalog = parsedData["All Products"] || parsedData;

    if (!Array.isArray(catalog) || catalog.length === 0) {
      console.error('❌ Error: Export array is empty or invalid.');
      process.exit(1);
    }

    console.log(`⚡ Found ${catalog.length} products to process.`);

    // 1. Generate local products.json content with 0 prices
    const localProducts = catalog.map((p, idx) => {
      const productId = String(p["Product ID"] || p.productId || idx + 1);
      return {
        productId: productId,
        type: String(p["Type"] || p.type || '').trim(),
        productName: String(p["Product Name"] || p.productName || 'Unnamed Part').replace(/\s+/g, ' ').trim(),
        quantity: String(p["Quantity"] || p.quantity || '0'),
        brandCode: String(p["Brand Code"] || p.brandCode || '').trim(),
        brand: String(p["Brand"] || p.brand || 'GENUINE').trim(),
        category: String(p["Category"] || p.category || 'Accessories').trim(),
        buyRate: "0",          // NOT uploading the price!
        retailPrice: "0",     // NOT uploading the price!
        wholesalePrice: "0",   // NOT uploading the price!
        barcode: String(p["Barcode"] || p.barcode || '').trim(),
        expiryDate: String(p["Expiry Date"] || p.expiryDate || '').trim(),
        lowStockAlert: String(p["Low Stock Alert"] || p.lowStockAlert || '0'),
        retailCode: String(p["Retail Code"] || p.retailCode || '').trim(),
        wholesaleCode: String(p["Wholesale Code"] || p.wholesaleCode || '').trim(),
        mrpCode: String(p["MRP Code"] || p.mrpCode || '').trim(),
        dateAdded: String(p["Date Added"] || p.dateAdded || '').trim(),
        sleeve: String(p["Sleeve"] || p.sleeve || '').trim(),
        fit: String(p["Fit"] || p.fit || p.vehicle_fitment || 'General').trim(),
        size: String(p["Size"] || p.size || 'Standard').trim(),
        color: String(p["Color"] || p.color || '').trim(),
        pattern: String(p["Pattern"] || p.pattern || '').trim(),
        description: String(p["Description"] || p.description || '').replace(/\s+/g, ' ').trim(),
        profit: "0",          // NOT uploading the price!
        discount: "0",
        tax: "0",
        stockQty: String(p["Stock Qty"] || p.stockQty || '0'),
        image_urls: p.image_urls || []
      };
    });

    console.log('✍️ Writing clean products.json file (0 prices)...');
    fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(localProducts, null, 2));

    console.log('🚀 Starting batch upload to Supabase (100 products per request)...');
    const BATCH_SIZE = 100;
    for (let i = 0; i < localProducts.length; i += BATCH_SIZE) {
      const batch = localProducts.slice(i, i + BATCH_SIZE);
      const rows = batch.map(p => {
        return {
          product_id: p.productId,
          type: p.type || null,
          name: p.productName,
          quantity: parseInt(p.quantity, 10) || 0,
          brand_code: p.brandCode || null,
          brand: p.brand || 'GENUINE',
          category: p.category || 'Accessories',
          buy_rate: 0.0,          // Set prices to 0.0
          retail_price: 0.0,
          wholesale_price: 0.0,
          part_number: p.barcode || null,
          expiry_date: p.expiryDate || null,
          low_stock_alert: parseInt(p.lowStockAlert, 10) || 0,
          retail_code: p.retailCode || null,
          wholesale_code: p.wholesaleCode || null,
          mrp_code: p.mrpCode || null,
          sleeve: p.sleeve || null,
          vehicle_fitment: p.fit || 'General',
          size: p.size || 'Standard',
          color: p.color || null,
          pattern: p.pattern || null,
          description: p.description || null,
          profit: 0.0,
          discount: 0.0,
          tax: 0.0,
          stock_qty: parseInt(p.stockQty, 10) || 0,
          image_urls: p.image_urls || []
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

      console.log(`✅ Uploaded products ${i + 1} to ${Math.min(i + BATCH_SIZE, localProducts.length)}...`);
    }

    console.log('\n🎉 Database migration complete! All products are now in Supabase with $0 prices.');
    console.log('Next step: Log into the HK Motors Admin Panel online and run the "Cloud Image Migration Utility" to upload images.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message || err);
    process.exit(1);
  }
}

run();
