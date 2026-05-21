-- Politicas de Seguridad de Nivel de Fila (RLS) para Hotel Tajamonae
-- Proposito: Resolver "Error cargando datos" permitiendo lectura SELECT a perfiles autenticados.

-- 1. Habilitar RLS en tablas principales
ALTER TABLE IF EXISTS habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bloques ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rfid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lavanderia_lotes ENABLE ROW LEVEL SECURITY;

-- 2. Crear politicas de SELECCION (Lectura) para usuarios autenticados
-- Nota: Se asume que cualquier usuario logueado en el sistema puede ver estas tablas.

DO $$ 
BEGIN
    -- Politica para Habitaciones
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'habitaciones') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON habitaciones FOR SELECT TO authenticated USING (true);
    END IF;

    -- Politica para Operarios
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'operarios') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON operarios FOR SELECT TO authenticated USING (true);
    END IF;

    -- Politica para Empresas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'empresas') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON empresas FOR SELECT TO authenticated USING (true);
    END IF;

    -- Politica para Bloques
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'bloques') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON bloques FOR SELECT TO authenticated USING (true);
    END IF;

    -- Politica para RFID Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'rfid_logs') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON rfid_logs FOR SELECT TO authenticated USING (true);
    END IF;

    -- Politica para Lavanderia
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir SELECT a autenticados' AND tablename = 'lavanderia_lotes') THEN
        CREATE POLICY "Permitir SELECT a autenticados" ON lavanderia_lotes FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 3. Asegurar que las empresas esten alineadas con el nuevo diseño
-- MASA, INMEL y MR ING deben existir en la tabla si se usa para FKs
INSERT INTO empresas (nombre, sigla, nit, activa)
VALUES 
  ('MASA', 'MASA', '901.145.672-3', true),
  ('INMEL', 'INMEL', '900.218.944-0', true),
  ('MR ING', 'MR ING', '901.880.067-5', true)
ON CONFLICT (sigla) DO UPDATE SET activa = true;
