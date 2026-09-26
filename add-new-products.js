const fs = require('fs');
const path = require('path');

const BRANDS = ['TATA PACKING', 'LUCAS', 'LEYPARTS', 'BENARA'];
const brandToCategory = {
  'TATA PACKING': 'COMMON ITEMS',
  'LUCAS': 'ELECTRICALS',
  'LEYPARTS': 'LEYPARTS',
  'BENARA': 'EINGINE ITEMS'
};

const raw = fs.readFileSync(path.join(__dirname, 'new-products-raw.txt'), 'utf8');
const parsed = [];
const errors = [];

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const idMatch = trimmed.match(/^(\d{4})\s+/);
  if (!idMatch) {
    errors.push(`No ID: ${trimmed}`);
    continue;
  }
  const productId = idMatch[1];
  const rest = trimmed.slice(idMatch[0].length);
  const upper = rest.toUpperCase();
  let brand = null;
  let brandIdx = -1;
  for (const b of BRANDS) {
    const i = upper.indexOf(b);
    if (i >= 0) {
      brand = b;
      brandIdx = i;
      break;
    }
  }
  if (brandIdx < 0) {
    errors.push(`No brand: ${trimmed}`);
    continue;
  }
  const productName = rest.slice(0, brandIdx).replace(/\s+/g, ' ').trim();
  const after = rest.slice(brandIdx + brand.length).trim();
  const tokens = after.split(/\s+/);
  const nums = [];
  let descStart = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (/^-?\d+(\.\d+)?$/.test(tokens[i]) && nums.length < 6) {
      nums.push(tokens[i]);
    } else {
      descStart = i;
      break;
    }
  }
  const description = tokens.slice(descStart).join(' ').replace(/\s+/g, ' ').trim();
  if (nums.length < 6) {
    errors.push(`Incomplete numbers (${nums.length}) for ${productId}: ${trimmed}`);
    continue;
  }
  parsed.push({
    productId,
    productName,
    brand,
    buyRate: nums[0],
    retailPrice: nums[1],
    wholesalePrice: nums[2],
    quantity: nums[3],
    discount: nums[4],
    tax: nums[5],
    description
  });
}

if (errors.length) {
  console.error('Parse errors:', errors);
  process.exit(1);
}

const ids = parsed.map(p => Number(p.productId));
const missing = [];
for (let i = 3124; i <= 3368; i++) {
  if (!ids.includes(i)) missing.push(i);
}
const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);

console.log(`Parsed ${parsed.length} products`);
console.log('Missing IDs:', missing.length ? missing.join(',') : 'none');
console.log('Duplicate IDs:', dupes.length ? dupes.join(',') : 'none');
if (missing.length || dupes.length) process.exit(1);

const productsPath = path.join(__dirname, 'products.json');
const exportPath = path.join(__dirname, 'PSHOP_Products_Export_20260622_192931.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const catalog = exportData['All Products'];

const existingIds = new Set(products.map(p => String(p.productId)));
const toAdd = parsed.filter(p => !existingIds.has(p.productId));
if (toAdd.length !== parsed.length) {
  console.log(`Skipping ${parsed.length - toAdd.length} already present IDs`);
}

const localRows = toAdd.map(p => ({
  productId: p.productId,
  type: '',
  productName: p.productName,
  quantity: p.quantity,
  brandCode: '',
  brand: p.brand,
  category: brandToCategory[p.brand],
  buyRate: '0',
  retailPrice: '0',
  wholesalePrice: '0',
  barcode: p.productId.padStart(5, '0'),
  expiryDate: '',
  lowStockAlert: '0',
  retailCode: '0',
  wholesaleCode: '0',
  mrpCode: '',
  dateAdded: '',
  sleeve: '',
  fit: 'General',
  size: 'Standard',
  color: '',
  pattern: '',
  description: p.description,
  profit: '0',
  discount: '0',
  tax: '0',
  stockQty: '0',
  image_urls: []
}));

const exportRows = toAdd.map(p => ({
  'Product ID': Number(p.productId),
  'Product Name': p.productName + ' ',
  'Quantity': Number(p.quantity),
  'Brand': p.brand + ' ',
  'Category': brandToCategory[p.brand] + ' ',
  'Buy Rate (Cost)': Number(p.buyRate),
  'Retail Price': Number(p.retailPrice),
  'Wholesale Price': Number(p.wholesalePrice),
  'Barcode': p.productId.padStart(5, '0'),
  'Low Stock Alert': '0',
  'Retail Code': '0',
  'Wholesale Code': '0',
  'Discount': Number(p.discount),
  'Tax': Number(p.tax),
  'Stock Qty': 0,
  ...(p.description ? { 'Description': p.description } : {})
}));

products.push(...localRows);
catalog.push(...exportRows);

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

const byBrand = {};
toAdd.forEach(p => { byBrand[p.brand] = (byBrand[p.brand] || 0) + 1; });
console.log('Added', toAdd.length, 'products');
console.log('By brand', byBrand);
console.log('New totals: products.json', products.length, 'export', catalog.length);
console.log('Sample', JSON.stringify(localRows[0], null, 2));
console.log('Priced sample', JSON.stringify(exportRows[0], null, 2));
