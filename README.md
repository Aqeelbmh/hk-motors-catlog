# HK Motors — Spare Parts Catalog

A premium, localized, and fully responsive client-side web application for exploring and ordering HK Motors auto and truck spare parts. The application is built using vanilla web technologies, loads catalog products dynamically, caches files offline, and supports administrators in managing parts directly on their local device.

---

## 🚀 Features

### For Customers
- **Dynamic Catalog**: Browse 3,000+ genuine spare parts with instant search (by ID, part number, brand, compatibility) and filters.
- **Multilingual Support**: Fully localized in **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.
- **Vehicle Compatibility**: Clear specification badges showing vehicle fitments (e.g. Tata, Hino, Leyland).
- **Interactive Multi-Image Gallery**: View parts from multiple angles using a responsive thumbnail-based gallery carousel.
- **WhatsApp Checkout**: Add parts to a cart and send structured orders (excluding prices) directly to HK Motors via WhatsApp.
- **Dark & Light Modes**: Seamless dark and light themes corresponding to user system preferences.

### For Administrators
- **Sticky Admin Panel**: Accessible via `#/admin` with password security.
- **Dashboard Stats**: Real-time counters showing total products, low stock alerts, and products missing images.
- **Two-Tier Control Toolbar**: Reorganized dashboard filters (Search, Category selector, Column views) on the top tier, and operational actions (Add Product, Export CSV, Import spreadsheet data, Reset Database) on the bottom tier.
- **Stock Tracking**: Default side-by-side display of `Stock Qty` and `Quantity` with warning indicators for low stock levels.
- **Multi-Image Management**: Upload and manage multiple high-quality compressed images per product directly into IndexedDB, with multi-file selection support.

---

## 🛠️ Technology Stack
- **Frontend**: Pure Semantic HTML5, Vanilla CSS3 (custom CSS variables & transitions), and Vanilla ES6+ JavaScript.
- **Excel/CSV Parsing**: SheetJS Library (`xlsx.full.min.js`) for processing Excel spreadsheet catalogs.
- **Local Databases**:
  - `localStorage` for JSON product database state configuration.
  - `IndexedDB` (using custom wrappers) for compressed product image blob cache.
- **Localization**: Localized client dictionary bindings.

---

## ⚙️ How to Run Locally

Because the application fetches product JSON data dynamically, running it directly by opening the `index.html` file in a browser will trigger CORS restrictions. You must serve it using a local HTTP server:

### Option A: Using Python (Recommended)
1. Open your terminal in the project directory:
   ```bash
   cd /path/to/Catlog
   ```
2. Run the HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to:
   **[http://localhost:8000](http://localhost:8000)**

### Option B: Using Node.js (`http-server`)
1. Run the local server:
   ```bash
   npx http-server -p 8000
   ```
2. Open your browser and navigate to:
   **[http://localhost:8000](http://localhost:8000)**

---

## 🔐 Administrative Access

- **Admin URL**: **[http://localhost:8000/#/admin](http://localhost:8000/#/admin)**
- **Default Password**: `hkmotors2024`

### Managing Spreadsheet Data
Administrators can import catalog exports (`PSHOP_Products_Export_*.xlsx` or `.json` files) directly into the browser database. Changes are stored locally in the browser's `localStorage` and can be exported back as a CSV spreadsheet at any time.

---

## ☁️ Supabase Cloud Synchronization (Hybrid Online/Offline)

HK Motors has been upgraded to synchronize with a centralized **Supabase Cloud Database** while maintaining client-side offline capabilities (IndexedDB for image caching, localStorage for local catalog copies).

### 1. Database Setup in Supabase Dashboard
1. Create a free project on [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in the dashboard and paste/execute the contents of [schema.sql](file:///Users/mohamedhakeel/Downloads/Catlog/schema.sql). This creates the `products` table, configures RLS, indexes, and setups the `updated_at` trigger.
3. Navigate to **Storage** and create a new **public** bucket named `product-images`. Make sure the public access switch is enabled.
4. Execute the storage security policies listed in `schema.sql` to allow public select and write access to the bucket.

### 2. Local Configuration
Create a local configuration file named `supabase-config.js` in the project root containing your API credentials (based on `supabase-config.js.example`):
```javascript
window.SUPABASE_URL = "https://your-project.supabase.co";
window.SUPABASE_KEY = "your-anon-public-key";
```
*Note: `supabase-config.js` is gitignored to protect credentials.*

### 3. Migrating Catalog Data via Node.js CLI
Run the local CLI script to batch-upload the local `products.json` file into your Supabase cloud PostgreSQL instance:
```bash
SUPABASE_URL=https://your-project.supabase.co SUPABASE_KEY=your-anon-key node migrate-to-supabase.js
```
This utility parses the `products.json` file and uploads the items in optimized batches of 100 to handle 3,000+ items without timeouts.

### 4. Migrating Local Images to Supabase Storage
1. Serve the app locally and navigate to the admin dashboard (e.g. `http://localhost:8000/#/admin`).
2. Log in using the admin password (`hkmotors2024`).
3. Click the **☁️ Migrate Images to Cloud** button in the operational toolbar.
4. The system will read your offline image binary database (`IndexedDB`), upload them sequentially to Supabase Storage, and link the resulting URLs directly to their corresponding products in the cloud database.

### 5. Deploying to Vercel
When deploying this web application to Vercel, set the following **Environment Variables** in the Vercel Dashboard project settings:
* `SUPABASE_URL`: Your Supabase Project API URL.
* `SUPABASE_KEY`: Your Supabase Anon Key.

The project build script will automatically write these variables into `supabase-config.js` during deployment compilation.

