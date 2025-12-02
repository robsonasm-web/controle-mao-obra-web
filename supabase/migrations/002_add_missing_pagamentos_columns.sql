-- Migration: add missing columns to pagamentos
-- Use this in Supabase SQL editor or via psql connected to your DB

-- Add obra_id and colaborador_id as UUIDs (nullable to avoid failing existing inserts)
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS obra_id UUID;

ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS colaborador_id UUID;

-- Add valor as numeric with 2 decimals and default 0.00
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2) DEFAULT 0.00;

-- Add data_pagamento as date
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;

-- Optionally, you can add foreign keys if your other tables exist and you want referential integrity:
-- ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;
-- ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL;

-- Verify columns
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'pagamentos';
