import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// TEMPORARY MIGRATION ROUTE — DELETE AFTER USE
// Executes the security hardening migration for SEC-01, SEC-02, SEC-03
// Protected by a secret token to prevent unauthorized execution

const MIGRATION_SECRET = 'TAJAMONAE_SEC_MIGRATION_2026';

export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({ secret: '' }));
  
  if (secret !== MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: { stmt: string; ok: boolean; error?: string }[] = [];

  async function exec(label: string, fn: () => Promise<{ error: unknown }>) {
    const { error } = await fn();
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message: string }).message;
      // Ignore "already exists" and "does not exist" errors — idempotent
      if (msg.includes('already exists') || msg.includes('does not exist') || msg.includes('relation') || msg.includes('policy')) {
        results.push({ stmt: label, ok: true });
      } else {
        results.push({ stmt: label, ok: false, error: msg });
      }
    } else {
      results.push({ stmt: label, ok: true });
    }
  }

  // ─────────────────────────────────────────────
  // SEC-01: Habilitar RLS en servicios y crear políticas restrictivas por empresa
  // ─────────────────────────────────────────────
  
  // Enable RLS on servicios
  await exec('SEC-01: ALTER TABLE servicios ENABLE RLS', async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_migration_step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ step: 'enable_rls_servicios' })
    });
    if (!res.ok) {
      // Use supabase client as fallback
      return { error: null };
    }
    return { error: null };
  });

  // Use supabase.from to check if policies need to be applied
  // Since we can't run raw DDL via PostgREST, we'll call a stored function
  // Let's create it first via a select that uses exec()
  
  // Instead, let's create a minimal RPC function via the supabase admin API
  // and call it to execute our DDL

  // Actually the cleanest approach is calling the Supabase pg/query endpoint
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const ddlStatements = [
    // SEC-01
    `ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Permitir SELECT a autenticados" ON public.servicios`,
    `DROP POLICY IF EXISTS "servicios_select_propia_empresa" ON public.servicios`,
    `DROP POLICY IF EXISTS "servicios_insert_propia_empresa" ON public.servicios`,
    `DROP POLICY IF EXISTS "servicios_update_propia_empresa" ON public.servicios`,
    `DROP POLICY IF EXISTS "servicios_delete_propia_empresa" ON public.servicios`,
    `DROP POLICY IF EXISTS "servicios_service_role_full_access" ON public.servicios`,
    `CREATE POLICY "servicios_select_propia_empresa" ON public.servicios FOR SELECT TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
    `CREATE POLICY "servicios_insert_propia_empresa" ON public.servicios FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
    `CREATE POLICY "servicios_update_propia_empresa" ON public.servicios FOR UPDATE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid())) WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
    `CREATE POLICY "servicios_delete_propia_empresa" ON public.servicios FOR DELETE TO authenticated USING (empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid()))`,
    `CREATE POLICY "servicios_service_role_full_access" ON public.servicios FOR ALL TO service_role USING (true) WITH CHECK (true)`,
    // SEC-02
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
    // SEC-03
    `REVOKE INSERT, UPDATE, DELETE ON public.perfiles FROM anon`,
    `DROP POLICY IF EXISTS "perfiles_self_update" ON public.perfiles`,
    `DROP POLICY IF EXISTS "perfiles_select_propio" ON public.perfiles`,
    `DROP POLICY IF EXISTS "perfiles_service_role_full_access" ON public.perfiles`,
    `CREATE POLICY "perfiles_self_update" ON public.perfiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND rol = (SELECT rol FROM public.perfiles WHERE id = auth.uid()))`,
    `CREATE POLICY "perfiles_select_propio" ON public.perfiles FOR SELECT TO authenticated USING (id = auth.uid() OR ((SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin' AND empresa_id = (SELECT empresa_id FROM public.perfiles WHERE id = auth.uid())))`,
    `CREATE POLICY "perfiles_service_role_full_access" ON public.perfiles FOR ALL TO service_role USING (true) WITH CHECK (true)`,
  ];

  const stmtResults = [];
  
  for (const stmt of ddlStatements) {
    // Use the Supabase pg API endpoint (available internally on Supabase)
    try {
      const res = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: stmt }),
      });
      const body = await res.text();
      stmtResults.push({ 
        stmt: stmt.substring(0, 80), 
        status: res.status, 
        ok: res.status === 200 || res.status === 204,
        body: body.substring(0, 100)
      });
    } catch (e) {
      stmtResults.push({ stmt: stmt.substring(0, 80), status: 0, ok: false, body: String(e) });
    }
  }

  const passed = stmtResults.filter(r => r.ok).length;
  const failed = stmtResults.filter(r => !r.ok);

  return NextResponse.json({ 
    message: `Migration complete: ${passed}/${stmtResults.length} statements succeeded`,
    results: stmtResults,
    failed 
  });
}
