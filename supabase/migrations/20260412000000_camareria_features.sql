-- 1. Eliminar la restricción de validación por nombre/fecha que causaba el error de 'Reportar Incidencia'
ALTER TABLE public.registro_camareria DROP CONSTRAINT IF EXISTS registro_camareria_habitacion_id_fecha_key;

-- 2. Añadir nuevas columnas necesarias a registro_camareria (check lists y fotos)
ALTER TABLE public.registro_camareria ADD COLUMN IF NOT EXISTS foto_antes_url text NULL;
ALTER TABLE public.registro_camareria ADD COLUMN IF NOT EXISTS foto_despues_url text NULL;
ALTER TABLE public.registro_camareria ADD COLUMN IF NOT EXISTS lista_chequeo jsonb DEFAULT '{}'::jsonb;

-- 3. Crear tabla opcional para registro de lavanderia_lotes_recibidos (si no existe un control mas detallado de prendas)
-- En este caso agregamos lavanderia_lotes un historial completo por habitación y prenda.
CREATE TABLE IF NOT EXISTS public.registro_lavanderia (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  habitacion_id uuid NOT NULL REFERENCES public.habitaciones(id),
  operario_id uuid NULL REFERENCES public.operarios(id), -- a quien pertenece
  registrado_por uuid NULL REFERENCES public.perfiles(id), -- quien recibe
  fecha date NOT NULL DEFAULT current_date,
  estado varchar NOT NULL DEFAULT 'En proceso', -- 'En proceso', 'Entregado'
  
  -- Conteo de prendas
  jeans int NOT NULL DEFAULT 0,
  camisas int NOT NULL DEFAULT 0,
  overoles int NOT NULL DEFAULT 0,
  pantalonetas int NOT NULL DEFAULT 0,
  toallas int NOT NULL DEFAULT 0,
  capuchones int NOT NULL DEFAULT 0,
  
  -- Fotos de la bolsa (tula)
  foto_tula_recibida_url text NULL,
  foto_tula_entregada_url text NULL,
  
  created_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT registro_lavanderia_pkey PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.registro_lavanderia ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'registro_lavanderia') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON registro_lavanderia FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir INSERT a autenticados' AND tablename = 'registro_lavanderia') THEN
        CREATE POLICY "Permitir INSERT a autenticados" ON registro_lavanderia FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir UPDATE a autenticados' AND tablename = 'registro_lavanderia') THEN
        CREATE POLICY "Permitir UPDATE a autenticados" ON registro_lavanderia FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;
