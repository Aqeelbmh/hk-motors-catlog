const fs = require('fs');
const path = require('path');
let url, key;
function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, fileName);
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length < 2) return;
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    if (k === 'SUPABASE_URL' || k === 'NEXT_PUBLIC_SUPABASE_URL') url = v;
    if (k === 'SUPABASE_KEY' || k === 'SUPABASE_ANON_KEY' || k === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = v;
  });
}
loadEnvFile('.env');
loadEnvFile('.env.local');

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
const newProducts = products.filter(p => Number(p.productId) >= 3124);

(async () => {
  const BATCH = 100;
  for (let i = 0; i < newProducts.length; i += BATCH) {
    const batch = newProducts.slice(i, i + BATCH).map(p => ({
      product_id: p.productId,
      type: p.type || null,
      name: p.productName,
      quantity: parseInt(p.quantity, 10) || 0,
      brand_code: p.brandCode || null,
      brand: p.brand || 'GENUINE',
      category: p.category || 'Accessories',
      buy_rate: 0.0,
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
    }));
    const res = await fetch(`${url}/rest/v1/products?on_conflict=product_id`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(batch)
    });
    if (!res.ok) {
      console.error('Upload failed:', res.status, await res.text());
      process.exit(1);
    }
    console.log(`Uploaded ${i + 1}-${Math.min(i + BATCH, newProducts.length)}`);
  }
  console.log('Done. Upserted', newProducts.length, 'products');
})();
