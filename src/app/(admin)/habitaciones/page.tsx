import { createClient } from '@/lib/supabase/server'
import { HabitacionesClient } from './habitaciones-client'
import { getBogotaDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export default async function HabitacionesPage() {
  const supabase = await createClient()
  const today = getBogotaDate()

  // Reset estado_aseo daily: if ultima_actualizacion < today, reset to 'Pendiente'
  await supabase
    .from('habitaciones')
    .update({ estado_aseo: 'Pendiente', ultima_actualizacion: today })
    .lt('ultima_actualizacion', today)
    .eq('estado_aseo', 'Aseo listo')

  const { data: habitaciones } = await supabase
    .from('habitaciones')
    .select('id, bloque_id, piso, capacidad, estado, estado_aseo, ultima_actualizacion')
    .order('bloque_id', { ascending: true })
    .order('piso', { ascending: true })
    .order('id')

  const { data: operarios } = await supabase
    .from('operarios')
    .select('id, nombre_completo, cargo, empresa_id, rfid_uid, habitacion_id, fecha_ingreso_turno, empresas(sigla, nombre_completo)')
    .eq('activo', true)
    .not('habitacion_id', 'is', null)
    .order('nombre_completo', { ascending: true })

  const { data: registrosCamareria } = await supabase
    .from('registro_camareria')
    .select('*')
    .eq('fecha', today)
    .order('created_at', { ascending: false })

  const { data: registrosLavanderia } = await supabase
    .from('registro_lavanderia')
    .select('*')
    .eq('fecha', today)
    .order('created_at', { ascending: false })

  // Build map: which rooms have completed cleaning TODAY
  const camareriaListaByRoom: Record<string, boolean> = {}
  for (const reg of registrosCamareria || []) {
    if (reg.estado === 'Aseo listo') {
      camareriaListaByRoom[reg.habitacion_id] = true
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Plano de Habitaciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoreo en tiempo real de ocupación y servicios de camarería.
        </p>
      </div>

      <HabitacionesClient
        initialRooms={habitaciones || []}
        activeWorkers={operarios || []}
        registrosCamareria={registrosCamareria || []}
        registrosLavanderia={registrosLavanderia || []}
        camareriaListaByRoom={camareriaListaByRoom}
      />
    </div>
  )
}
