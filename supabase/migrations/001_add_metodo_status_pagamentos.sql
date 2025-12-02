-- Migration: add metodo and status columns to pagamentos
-- Run this in Supabase SQL editor or via psql connected to your Supabase DB

ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS metodo TEXT DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';

-- Optional: ensure data_pagamento is date and valor is numeric
-- ALTER TABLE pagamentos ALTER COLUMN data_pagamento TYPE date USING (data_pagamento::date);
-- ALTER TABLE pagamentos ALTER COLUMN valor TYPE numeric USING (valor::numeric);

-- Verify
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pagamentos';
