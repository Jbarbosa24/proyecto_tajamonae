/**
 * apply-security-migration.js
 * Aplica las políticas de seguridad directamente a Supabase
 * usando llamadas individuales al cliente con service_role.
 * 
 * Ejecutar con: node --input-type=module apply-security-migration.js
 * O: node apply-security-migration.js (si package.json tiene "type":"module")
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://agwtkhfmhjklcykohsid.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68';

// Execute raw SQL via PostgREST with service_role
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Profile': 'public',
      'X-Client-Info': 'supabase-js/2.0.0',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query })
  });
  return { status: res.status, body: await res.text() };
}

// Use the Supabase query interface for a stored procedure approach
async function execViaRPC(sqlText) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sqlText })
  });
  return { status: res.status, body: await res.text() };
}

// Statements to execute
const statements = [
  // SEC-01: Enable RLS on servicios
  `ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY`,
  
  // Drop old permissive policies
  `DROP POLICY IF EXISTS "Permitir SELECT a autenticados" ON public.servicios`,
  `DROP POLICY IF EXISTS "servicios_select_propia_empresa" ON public.servicios`,
  `DROP POLICY IF EXISTS "servicios_insert_propia_empresa" ON public.servicios`,
  `DROP POLICY IF EXISTS "servicios_update_propia_empresa" ON public.servicios`,
  `DROP POLICY IF EXISTS "servicios_delete_propia_empresa" ON public.servicios`,
  `DROP POLICY IF EXISTS "servicios_service_role_full_access" ON public.servicios`,

  // SEC-01: Create restrictive policies on servicios
  `CREATE POLICY "servicios_select_propia_empresa" ON public.servicios FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "servicios_insert_propia_empresa" ON public.servicios FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "servicios_update_propia_empresa" ON public.servicios FOR UPDATE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid())) WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "servicios_delete_propia_empresa" ON public.servicios FOR DELETE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "servicios_service_role_full_access" ON public.servicios FOR ALL TO service_role USING (true) WITH CHECK (true)`,

  // SEC-02: Lock down operarios
  `ALTER TABLE public.operarios ENABLE ROW LEVEL SECURITY`,
  `REVOKE INSERT, UPDATE, DELETE ON public.operarios FROM anon`,
  `DROP POLICY IF EXISTS "Permitir SELECT a autenticados" ON public.operarios`,
  `DROP POLICY IF EXISTS "Permitir UPDATE a autenticados" ON public.operarios`,
  `DROP POLICY IF EXISTS "Permitir INSERT a autenticados" ON public.operarios`,
  `DROP POLICY IF EXISTS "operarios_select_propia_empresa" ON public.operarios`,
  `DROP POLICY IF EXISTS "operarios_insert_solo_admin" ON public.operarios`,
  `DROP POLICY IF EXISTS "operarios_update_solo_admin" ON public.operarios`,
  `DROP POLICY IF EXISTS "operarios_delete_solo_admin" ON public.operarios`,
  `DROP POLICY IF EXISTS "operarios_service_role_full_access" ON public.operarios`,
  
  `CREATE POLICY "operarios_select_propia_empresa" ON public.operarios FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "operarios_insert_solo_admin" ON public.operarios FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin')`,
  `CREATE POLICY "operarios_update_solo_admin" ON public.operarios FOR UPDATE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin') WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "operarios_delete_solo_admin" ON public.operarios FOR DELETE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()) AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin')`,
  `CREATE POLICY "operarios_service_role_full_access" ON public.operarios FOR ALL TO service_role USING (true) WITH CHECK (true)`,

  // SEC-03: Prevent role escalation in perfiles
  `REVOKE INSERT, UPDATE, DELETE ON public.perfiles FROM anon`,
  `DROP POLICY IF EXISTS "perfiles_self_update" ON public.perfiles`,
  `DROP POLICY IF EXISTS "perfiles_select_propio" ON public.perfiles`,
  `DROP POLICY IF EXISTS "perfiles_service_role_full_access" ON public.perfiles`,
  
  `CREATE POLICY "perfiles_self_update" ON public.perfiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND rol = (SELECT rol FROM public.perfiles WHERE id = auth.uid()))`,
  `CREATE POLICY "perfiles_select_propio" ON public.perfiles FOR SELECT TO authenticated USING (id = auth.uid() OR ((SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin' AND empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid())))`,
  `CREATE POLICY "perfiles_service_role_full_access" ON public.perfiles FOR ALL TO service_role USING (true) WITH CHECK (true)`,
];

console.log(`\n🔐 Aplicando migración de seguridad — ${statements.length} sentencias\n`);

let passed = 0;
let failed = [];

for (const stmt of statements) {
  // Try via pg/query endpoint
  const result = await execViaRPC(stmt);
  const label = stmt.substring(0, 65).replace(/\n/g, ' ');
  
  if (result.status === 200 || result.status === 204) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    console.log(`     → Status ${result.status}: ${result.body.substring(0, 150)}`);
    failed.push({ stmt: label, status: result.status, body: result.body.substring(0, 200) });
  }
}

console.log(`\n📊 Resultado: ${passed} OK, ${failed.length} fallidas`);
if (failed.length > 0) {
  console.log('\nSentencias fallidas:', JSON.stringify(failed, null, 2));
}
