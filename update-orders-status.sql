-- Run once in Supabase Dashboard → SQL Editor
-- Adds "sent" so admins can mark orders as Pending → Sent → Completed / Cancelled

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'sent', 'completed', 'cancelled'));

COMMENT ON COLUMN orders.status IS 'Order workflow: pending → sent → completed | cancelled';
