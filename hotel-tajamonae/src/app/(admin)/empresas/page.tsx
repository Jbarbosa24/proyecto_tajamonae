import { createClient } from '@/lib/supabase/server'
import { EmpresasClient } from './empresas-client'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage() {
  const supabase = await createClient()

  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('id, nombre_completo, sigla, nit, contacto_nombre, contacto_telefono, contacto_email, color_hex, activa, tarifas_empresa(id, tipo_servicio, valor_unitario)')
    .order('nombre_completo', { ascending: true })

  if (error) {
    console.error('Error fetching empresas:', error)
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <EmpresasClient initialEmpresas={empresas || []} />
    </div>
  )
}
