/**
 * Headless Chrome smoke test for HK Motors catalog
 */
import { spawn } from 'child_process';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));
const www = join(root, 'www');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8766;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent((req.url || '/').split('?')[0]);
      if (path === '/') path = '/index.html';
      const file = join(www, path);
      if (!file.startsWith(www) || !existsSync(file)) {
        res.writeHead(404); res.end('missing'); return;
      }
      const body = readFileSync(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function runChrome(userDataDir) {
  const outFile = join(root, '.smoke-result.json');
  const html = `<!doctype html><html><body><pre id="out">running</pre>
<script type="module">
const out = document.getElementById('out');
const log = [];
const ok = (name, pass, detail='') => log.push({ name, pass: !!pass, detail: String(detail||'') });
try {
  const page = await fetch('http://127.0.0.1:${PORT}/').then(r => r.text());
  ok('index loads', page.includes('HK Motors') && page.includes('homeView'));
  ok('products.json', (await fetch('http://127.0.0.1:${PORT}/products.json')).ok);
  ok('sw file', (await fetch('http://127.0.0.1:${PORT}/service-worker.js')).ok);
  ok('logo', (await fetch('http://127.0.0.1:${PORT}/logo-hk.png')).ok);
  ok('manifest', (await fetch('http://127.0.0.1:${PORT}/manifest.json')).ok);

  // Load app in iframe-like by navigating via location - we are on about:blank, open app
} catch (e) {
  ok('bootstrap', false, e.message);
}
out.textContent = JSON.stringify(log);
</script></body></html>`;

  // Better approach: use Chrome remote debugging with a simple evaluate via --dump-dom after visit
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      `--virtual-time-budget=12000`,
      `http://127.0.0.1:${PORT}/#/home`
    ];
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      // Use dump-dom separately
      resolve({ code, stderr });
    });
  });
}

async function dumpDom(hash) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--dump-dom',
      '--virtual-time-budget=15000',
      `http://127.0.0.1:${PORT}/${hash}`
    ];
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => resolve({ code, out, err }));
  });
}

const server = await startServer();
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

try {
  // Asset checks
  for (const path of ['/', '/products.json', '/service-worker.js', '/logo-hk.png', '/manifest.json', '/supabase-config.js']) {
    const res = await fetch(`http://127.0.0.1:${PORT}${path === '/' ? '/' : path}`);
    check(`GET ${path}`, res.ok, String(res.status));
  }

  const home = await dumpDom('#/home');
  check('home dump', home.out.includes('id="homeView"') && home.out.includes('HK Motors'), `len=${home.out.length}`);
  check('home featured categories grid exists', home.out.includes('featuredCategoriesGrid'));
  // After JS runs, tiles should be injected — virtual-time-budget should allow init
  check('home category tiles rendered', home.out.includes('category-tile') || home.out.includes('category-card'), home.out.includes('category-tile') ? 'tiles' : 'fallback');
  check('home featured products', /product-card/.test(home.out) || /featuredProductsGrid/.test(home.out));

  const cats = await dumpDom('#/categories');
  check('categories view', cats.out.includes('categoriesView') || cats.out.includes('Browse Categories'));
  check('categories tiles', (cats.out.match(/category-tile/g) || []).length >= 1, `count=${(cats.out.match(/category-tile/g)||[]).length}`);

  const products = await dumpDom('#/products');
  check('products view', products.out.includes('masterSearch') && products.out.includes('Master Catalog'));
  check('products grid cards', (products.out.match(/product-card/g) || []).length >= 1, `cards=${(products.out.match(/product-card/g)||[]).length}`);
  check('search toolbar not sticky', !/catalog-toolbar[^\{]*\{[^}]*position:\s*sticky/s.test(products.out));

  const admin = await dumpDom('#/admin');
  check('admin password modal', admin.out.includes('passwordModal'));

  // Parse JS from served index
  const html = await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.text());
  check('no navAdminLink', !html.includes('navAdminLink'));
  check('renderCategoryTile present', html.includes('function renderCategoryTile'));
  check('order confirm modal', html.includes('orderConfirmModal'));

  const failed = results.filter(r => !r.pass);
  console.log('\nSummary:', results.length - failed.length, 'passed,', failed.length, 'failed');
  if (failed.length) process.exitCode = 1;
} finally {
  server.close();
  // Force exit — Chrome headless children can keep the event loop alive
  setTimeout(() => process.exit(process.exitCode || 0), 200);
}
