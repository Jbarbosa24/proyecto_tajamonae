import { createClient } from '@/lib/supabase/server'
import { TurnosClient } from './turnos-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TurnosAdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener turnos pendientes
  const { data: turnos } = await supabase
    .from('importaciones_turno')
    .select('*, empresas(nombre_completo)')
    .is('procesado_por', null)
    .order('fecha_proceso', { ascending: false, nullsFirst: false })

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl lg:text-4xl font-black text-primary tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Gestión de Turnos y Tránsitos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-medium">
          Revisa y aprueba el personal pre-cargado por los Logísticos para asignación o desocupación de habitaciones.
        </p>
      </div>

      <TurnosClient pendientes={(turnos || []) as any} />
    </div>
  )
}
