-- Run this SQL in Supabase Dashboard > SQL Editor to create the orders table
-- Go to: https://supabase.com/dashboard > Your Project > SQL Editor > New Query

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users (using anon key) to insert orders
CREATE POLICY "Allow public to insert orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading orders (for admin order history)
CREATE POLICY "Allow public to read orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating order status (for admin)
CREATE POLICY "Allow public to update orders"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
