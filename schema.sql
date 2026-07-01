-- Supabase Hybrid Cloud Database Schema for HK Motors

-- 1. Create Products Table (Comprehensive to prevent catalog data loss)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT UNIQUE NOT NULL,
    type TEXT,
    name TEXT NOT NULL,
    quantity INT DEFAULT 0,
    brand_code TEXT,
    brand TEXT,
    category TEXT,
    buy_rate NUMERIC(12, 2) DEFAULT 0.00,
    retail_price NUMERIC(12, 2) DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2) DEFAULT 0.00,
    part_number TEXT, -- maps to barcode
    expiry_date TEXT,
    low_stock_alert INT DEFAULT 0,
    retail_code TEXT,
    wholesale_code TEXT,
    mrp_code TEXT,
    sleeve TEXT,
    vehicle_fitment TEXT, -- maps to fit
    size TEXT,
    color TEXT,
    pattern TEXT,
    description TEXT,
    profit NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(5, 2) DEFAULT 0.00,
    tax NUMERIC(5, 2) DEFAULT 0.00,
    stock_qty INT DEFAULT 0,
    image_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Indexes for fast querying & sorting
CREATE INDEX IF NOT EXISTS products_product_id_idx ON public.products(product_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products(brand);

-- 2. Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone to view products (both customers and admins)
CREATE POLICY "Allow public read access" ON public.products
    FOR SELECT TO anon
    USING (true);

-- Insert/Update/Delete Policies:
-- By default, for a zero-backend static client app, these policies are open for anon writes.
-- For production deployment, you can secure writes by locking them behind Supabase Email Auth.
CREATE POLICY "Allow public insert access" ON public.products
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.products
    FOR UPDATE TO anon
    USING (true);

CREATE POLICY "Allow public delete access" ON public.products
    FOR DELETE TO anon
    USING (true);

-- 4. Storage Bucket Setup
-- Note: Create a public storage bucket named 'product-images' in the Supabase Dashboard.
-- Ensure public access is enabled so anyone can view product images.
-- Storage RLS Policies to allow public image retrieval and anonymous uploads:
-- run these in the SQL Editor if required:
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public image select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');

CREATE POLICY "Allow public image insert" ON storage.objects
    FOR INSERT TO public
    WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public image delete" ON storage.objects
    FOR DELETE TO public
    USING (bucket_id = 'product-images');
*/
