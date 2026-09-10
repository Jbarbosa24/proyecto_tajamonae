-- =============================================================================
-- FIXED SECURITY POLICIES FOR ADMIN
-- =============================================================================
-- El hardening de seguridad anterior (SEC-02/SEC-03) incluyó la restricción:
-- (empresa_id = public.get_my_empresa_id())
-- Sin embargo, los perfiles con rol 'admin' tienen empresa_id = null,
-- lo que provoca que empresa_id = null evalúe a false/null en SQL, 
-- ocultando todos los operarios y servicios a los administradores.
--
-- Ejecuta este script en el SQL Editor de Supabase para solucionarlo.

-- 1. Arreglar PERFILES: El admin debe poder ver y actualizar cualquier perfil.
DROP POLICY IF EXISTS "perfiles_select_propio" ON public.perfiles;
CREATE POLICY "perfiles_select_propio" ON public.perfiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_my_rol() = 'admin'
  );

-- 2. Arreglar OPERARIOS: El admin tiene acceso integral, las empresas solo a lo suyo.
DROP POLICY IF EXISTS "operarios_select_propia_empresa" ON public.operarios;
CREATE POLICY "operarios_select_propia_empresa" ON public.operarios
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  );

DROP POLICY IF EXISTS "operarios_insert_solo_admin" ON public.operarios;
CREATE POLICY "operarios_insert_solo_admin" ON public.operarios
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_rol() = 'admin');

DROP POLICY IF EXISTS "operarios_update_solo_admin" ON public.operarios;
CREATE POLICY "operarios_update_solo_admin" ON public.operarios
  FOR UPDATE TO authenticated
  USING (public.get_my_rol() = 'admin' OR empresa_id = public.get_my_empresa_id())
  WITH CHECK (public.get_my_rol() = 'admin' OR empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "operarios_delete_solo_admin" ON public.operarios;
CREATE POLICY "operarios_delete_solo_admin" ON public.operarios
  FOR DELETE TO authenticated
  USING (public.get_my_rol() = 'admin');


-- 3. Arreglar SERVICIOS: Igual que arriba
DROP POLICY IF EXISTS "servicios_select_propia_empresa" ON public.servicios;
CREATE POLICY "servicios_select_propia_empresa" ON public.servicios
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  );

DROP POLICY IF EXISTS "servicios_insert_propia_empresa" ON public.servicios;
CREATE POLICY "servicios_insert_propia_empresa" ON public.servicios
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  );

DROP POLICY IF EXISTS "servicios_update_propia_empresa" ON public.servicios;
CREATE POLICY "servicios_update_propia_empresa" ON public.servicios
  FOR UPDATE TO authenticated
  USING (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  )
  WITH CHECK (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  );

DROP POLICY IF EXISTS "servicios_delete_propia_empresa" ON public.servicios;
CREATE POLICY "servicios_delete_propia_empresa" ON public.servicios
  FOR DELETE TO authenticated
  USING (
    empresa_id = public.get_my_empresa_id()
    OR public.get_my_rol() = 'admin'
  );