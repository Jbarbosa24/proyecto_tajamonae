-- Add unique constraints to ensure upsert onConflict works correctly
-- And to ensure data integrity in the personnel and company tables.

-- 1. Unicidad de documento_identidad para operarios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'operarios_documento_identidad_key'
    ) THEN
        ALTER TABLE public.operarios 
        ADD CONSTRAINT operarios_documento_identidad_key UNIQUE (documento_identidad);
    END IF;
END $$;

-- 2. Unicidad de sigla para empresas (para normalización)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'empresas_sigla_key'
    ) THEN
        ALTER TABLE public.empresas 
        ADD CONSTRAINT empresas_sigla_key UNIQUE (sigla);
    END IF;
END $$;
