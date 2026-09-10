import { createClient } from '@/lib/supabase/server'
import { CamareriaClient } from './camareria-client'
import type { Database } from '@/types/database'
import { getBogotaDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

interface RegistroCam {
  id: string
  habitacion_id: string
  estado: string
  hora_inicio: string | null
  hora_fin: string | null
  observaciones: string | null
}

export default async function CamareriaPage() {
  const supabase = await createClient()

  // Fetch all rooms with joined block names
  const { data: roomsData } = await supabase
    .from('habitaciones')
    .select('id, bloque_id, piso, capacidad, estado, estado_aseo, bloques(nombre)')

  // Type assertion for joined data
  const rooms = (roomsData || []) as (Database['public']['Tables']['habitaciones']['Row'] & {
    bloques: { nombre: string } | null
  })[]

  // Fetch active operators to count occupancy and names
  const { data: operarios } = await supabase
    .from('operarios')
    .select('id, habitacion_id, nombre_completo')
    .eq('activo', true)

  // Map occupancy per room
  const occupancyMap = new Map<string, { count: number, names: string[] }>()
  if (operarios) {
    operarios.forEach(op => {
      if (op.habitacion_id) {
        const current = occupancyMap.get(op.habitacion_id) || { count: 0, names: [] }
        current.count += 1
        current.names.push(op.nombre_completo || 'Sin nombre')
        occupancyMap.set(op.habitacion_id, current)
      }
    })
  }

  // Fetch today's cleaning records
  const today = getBogotaDate()
  const { data: registros } = await supabase
    .from('registro_camareria')
    .select('id, habitacion_id, estado, hora_inicio, hora_fin, observaciones')
    .eq('fecha', today)
    .order('created_at', { ascending: false })

  // Deduplicate: keep the latest record per room for today
  const latestByRoom = new Map<string, RegistroCam>()
  for (const reg of (registros || []) as RegistroCam[]) {
    if (!latestByRoom.has(reg.habitacion_id)) {
      latestByRoom.set(reg.habitacion_id, reg)
    }
  }

  // Attach occupancy and prioritize sorting
  const sortedRooms = rooms.map(r => {
    const occ = occupancyMap.get(r.id) || { count: 0, names: [] }
    return {
      id: r.id,
      bloque_id: r.bloque_id,
      bloque_nombre: r.bloques?.nombre || 'Sin Bloque',
      piso: r.piso,
      capacidad: r.capacidad,
      estado: r.estado,
      estado_aseo: r.estado_aseo,
      occupancy: occ.count,
      occupantNames: occ.names
    }
  }).sort((a, b) => {
    // 1. Priority: Occupied rooms first
    if (a.occupancy > 0 && b.occupancy === 0) return -1;
    if (a.occupancy === 0 && b.occupancy > 0) return 1;

    // 2. Sort by Block names
    if (a.bloque_nombre !== b.bloque_nombre) {
      return a.bloque_nombre.localeCompare(b.bloque_nombre);
    }

    // 3. Sort by Floor
    if (a.piso !== b.piso) return a.piso - b.piso;

    // 4. Sort by Room ID num
    const aNum = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const bNum = parseInt(b.id.replace(/\D/g, ''), 10) || 0;

    if (aNum !== bNum) return aNum - bNum;
    return a.id.localeCompare(b.id);
  });

  const { data: lavanderiasData } = await supabase
    .from('registro_lavanderia')
    .select('id, habitacion_id, estado')
    .eq('fecha', today)

  const lavanderias = (lavanderiasData || []) as { id: string; habitacion_id: string; estado: string }[]

  return (
    <CamareriaClient
      rooms={sortedRooms}
      registros={Array.from(latestByRoom.values())}
      lavanderias={lavanderias}
    />
  )
}

