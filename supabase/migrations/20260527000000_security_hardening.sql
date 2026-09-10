-- =============================================================================
-- MIGRACIÓN DE SEGURIDAD FINAL — Hotel Tajamonae
-- Fecha: 2026-05-27
-- Ref:   20260527000000_security_hardening.sql
-- =============================================================================
-- Esta migración fue aplicada en 3 pasos vía Supabase SQL Editor.
-- Corrige SEC-01, SEC-02 y SEC-03 detectadas en auditoría de seguridad.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1: Funciones SECURITY DEFINER (rompen recursión RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- Problema: Las políticas de perfiles que consultaban perfiles para obtener
-- empresa_id causaban "infinite recursion detected in policy for relation perfiles".
-- Solución: Funciones SECURITY DEFINER que se ejecutan con privilegios elevados,
-- saltando RLS internamente y rompiendo el ciclo.

CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2: Políticas restrictivas por empresa_id
-- ─────────────────────────────────────────────────────────────────────────────

-- SEC-01: Habilitar RLS en servicios + políticas por empresa
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servicios_select_propia_empresa" ON public.servicios
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "servicios_insert_propia_empresa" ON public.servicios
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "servicios_update_propia_empresa" ON public.servicios
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "servicios_delete_propia_empresa" ON public.servicios
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "servicios_service_role_full_access" ON public.servicios
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SEC-02: Revocar escritura anónima + políticas en operarios
ALTER TABLE public.operarios ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.operarios FROM anon;

CREATE POLICY "operarios_select_propia_empresa" ON public.operarios
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "operarios_insert_solo_admin" ON public.operarios
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() = 'admin');

CREATE POLICY "operarios_update_solo_admin" ON public.operarios
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "operarios_delete_solo_admin" ON public.operarios
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.get_my_rol() = 'admin');

CREATE POLICY "operarios_service_role_full_access" ON public.operarios
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SEC-03: Prevenir escalada de rol en perfiles
REVOKE INSERT, UPDATE, DELETE ON public.perfiles FROM anon;

CREATE POLICY "perfiles_self_update" ON public.perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  -- WITH CHECK impide que rol cambie: compara valor entrante vs actual
  WITH CHECK (id = auth.uid() AND rol = public.get_my_rol());

CREATE POLICY "perfiles_select_propio" ON public.perfiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.get_my_rol() = 'admin' AND empresa_id = public.get_my_empresa_id())
  );

CREATE POLICY "perfiles_service_role_full_access" ON public.perfiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3: Eliminar políticas heredadas permisivas
-- ─────────────────────────────────────────────────────────────────────────────
-- Estas políticas antiguas con USING(true) anulaban todas las restricciones
-- porque en Postgres PERMISSIVE: acceso = política_1 OR política_2 OR ...
-- Con una sola USING(true), todas las demás son irrelevantes.

-- servicios
DROP POLICY IF EXISTS "Permitir leer servicios"       ON public.servicios;
DROP POLICY IF EXISTS "admin_servicios_all"           ON public.servicios;
DROP POLICY IF EXISTS "logistico_servicios_empresa"   ON public.servicios;

-- operarios
DROP POLICY IF EXISTS "Permitir leer operarios"       ON public.operarios;
DROP POLICY IF EXISTS "admin_operarios_all"           ON public.operarios;
DROP POLICY IF EXISTS "aseadora_read_operarios"       ON public.operarios;

-- perfiles
DROP POLICY IF EXISTS "Permitir leer perfiles"        ON public.perfiles;
DROP POLICY IF EXISTS "admin_full_perfiles"           ON public.perfiles;
DROP POLICY IF EXISTS "aseadora_own_perfil"           ON public.perfiles;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- SEC-01: node tests/test-rls.js
--   → "RESULTADO: ¡ÉXITO! El aislamiento RLS está bloqueando lecturas cruzadas"
-- 
-- SEC-02 + SEC-03: node tests/test-jwt-bola.js
--   → "RESULTADO: ¡ÉXITO! La validación de JWT y las políticas RLS previenen
--      accesos no autorizados y BOLA."
-- =============================================================================
