import { createClient } from '@/lib/supabase/server'
import { PersonalClient } from './personal-client'

export const dynamic = 'force-dynamic'

export default async function PersonalPage() {
  const supabase = await createClient()

  const { data: workers } = await supabase
    .from('operarios')
    .select(
      'id, nombre_completo, documento_identidad, cargo, dias_turno, genero, tipo_cargo, empresa_id, rfid_uid, habitacion_id, fecha_ingreso_turno, fecha_salida_turno, activo, empresas(sigla, nombre_completo)'
    )
    .order('activo', { ascending: false })
    .order('nombre_completo', { ascending: true })

  const { data: rooms } = await supabase
    .from('habitaciones')
    .select('id, bloque_id, piso, capacidad, estado, estado_aseo, ultima_actualizacion')
    .order('bloque_id', { ascending: true })
    .order('piso', { ascending: true })
    .order('id', { ascending: true })

  /* Stats */
  const { count: totalOperarios } = await supabase
    .from('operarios')
    .select('*', { count: 'exact', head: true })

  const { count: activosHoy } = await supabase
    .from('operarios')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  const { data: turnos } = await supabase
    .from('importaciones_turno')
    .select('*, empresas(nombre_completo)')
    .is('procesado_por', null)
    .order('fecha_proceso', { ascending: false, nullsFirst: false })

  const companyCounts: Record<string, { count: number, name: string }> = {}
  for (const w of workers || []) {
    if (w.activo) {
      const cmp = Array.isArray(w.empresas) ? w.empresas[0] : w.empresas;
      const nombre = cmp?.sigla || 'Desconocida';
      if (!companyCounts[nombre]) companyCounts[nombre] = { count: 0, name: nombre }
      companyCounts[nombre].count += 1
    }
  }
  const companyStats = Object.values(companyCounts).sort((a,b) => b.count - a.count)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Gestión de Personal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administración y asignación de operarios del proyecto.
          </p>
        </div>
      </div>

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Operarios</p>
          <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {totalOperarios ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Personas Activas</p>
          <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {activosHoy ?? 0}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Turno Día</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#005d6a' }}>
            {Math.ceil((activosHoy ?? 0) / 2)}
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Sin Asignar</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#924b08' }}>
            {(workers || []).filter(w => w.activo && !w.habitacion_id).length}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Personal Activo por Empresa (Personas)
        </h2>
        {companyStats.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay operarios activos alojados.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {companyStats.map(stat => (
              <div key={stat.name} className="flex flex-col p-3 rounded-lg border border-border bg-surface-low">
                <span className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-widest" title={stat.name}>{stat.name}</span>
                <span className="text-xl font-black text-foreground mt-1">{stat.count} <span className="text-[9px] font-normal text-muted-foreground">Pers.</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <PersonalClient workers={workers || []} rooms={rooms || []} turnosPendientes={turnos || []} />
    </div>
  )
}