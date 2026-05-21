import { createClient } from '@/lib/supabase/server'
import { Users, ClipboardList, BedDouble, ArrowRight, RefreshCcw, AlertOctagon, Utensils } from 'lucide-react'
import Link from 'next/link'
import { DashboardModals } from './dashboard-modals'
import { DashboardHeartbeat } from './dashboard-heartbeat'

/* ─── Types ─── */
interface Empresa {
  id: string
  nombre_completo: string
  sigla: string
  color_hex: string | null
}

interface Servicio {
  id: string
  tipo: string
  created_at: string | null
  operarios: { nombre_completo: string; empresa_id: string } | null
  empresas: { sigla: string; nombre_completo: string } | null
}

interface EmpresaStat {
  empresa: Empresa
  count: number
}

/* ─── Server component ─── */
export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  /* KPI: total operarios activos */
  const { count: operariosActivos } = await supabase
    .from('operarios')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  /* KPI: servicios registrados hoy */
  const { count: serviciosHoy } = await supabase
    .from('servicios')
    .select('*', { count: 'exact', head: true })
    .eq('fecha', today)

  /* KPI: Cupos Físicos Disponibles (real bed count) */
  const { data: habitaciones } = await supabase
    .from('habitaciones')
    .select('id, capacidad, estado')

  const { data: operariosConHab } = await supabase
    .from('operarios')
    .select('id, habitacion_id, nombre_completo, empresa_id')
    .eq('activo', true)
    .not('habitacion_id', 'is', null)

  // Build occupancy map
  const occupancyMap: Record<string, number> = {}
  for (const op of operariosConHab || []) {
    if (op.habitacion_id) {
      occupancyMap[op.habitacion_id] = (occupancyMap[op.habitacion_id] ?? 0) + 1
    }
  }

  let totalCapacidad = 0
  let totalOcupados = 0
  const roomsWithSpace: { id: string; disponible: number; capacidad: number }[] = []

  for (const hab of habitaciones || []) {
    const occ = occupancyMap[hab.id] ?? 0
    totalCapacidad += hab.capacidad
    totalOcupados += occ
    const disponible = hab.capacidad - occ
    if (disponible > 0) {
      roomsWithSpace.push({ id: hab.id, disponible, capacidad: hab.capacidad })
    }
  }

  const cuposFisicosDisponibles = totalCapacidad - totalOcupados
  const ocupacionPct = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0

  /* KPI: Alertas de Omisión de Servicio */
  // Operarios hospedados hoy (activos con habitación)
  const hospedadosHoy = (operariosConHab || []).length

  // Servicios de hoy agrupados por tipo
  const { data: serviciosHoyData } = await supabase
    .from('servicios')
    .select('operario_id, tipo')
    .eq('fecha', today)

  const operariosConDesayuno = new Set<string>()
  const operariosConAlmuerzo = new Set<string>()
  const operariosConCena = new Set<string>()
  const operariosConHospedaje = new Set<string>()
  const operariosConLavanderia = new Set<string>()

  for (const s of serviciosHoyData || []) {
    if (s.tipo === 'Desayuno') operariosConDesayuno.add(s.operario_id)
    if (s.tipo === 'Almuerzo') operariosConAlmuerzo.add(s.operario_id)
    if (s.tipo === 'Cena') operariosConCena.add(s.operario_id)
    if (s.tipo === 'Hospedaje') operariosConHospedaje.add(s.operario_id)
    if (s.tipo === 'Lavandería') operariosConLavanderia.add(s.operario_id)
  }

  const omisionDesayuno = hospedadosHoy - operariosConDesayuno.size
  const omisionAlmuerzo = hospedadosHoy - operariosConAlmuerzo.size
  const omisionCena = hospedadosHoy - operariosConCena.size
  const omisionHospedaje = hospedadosHoy - operariosConHospedaje.size
  const omisionLavanderia = hospedadosHoy - operariosConLavanderia.size
  const totalOmisiones = Math.max(0, omisionDesayuno) + Math.max(0, omisionAlmuerzo) + Math.max(0, omisionCena) + Math.max(0, omisionHospedaje) + Math.max(0, omisionLavanderia)

  /* Empresas + conteo de servicios */
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nombre_completo, sigla, color_hex')
    .eq('activa', true)
    .order('nombre_completo')

  const empresaStats: EmpresaStat[] = []
  if (empresas && empresas.length > 0) {
    for (const emp of empresas) {
      const { count } = await supabase
        .from('servicios')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', emp.id)
        .eq('fecha', today)
      empresaStats.push({ empresa: emp, count: count ?? 0 })
    }
  }

  const maxCount = Math.max(...empresaStats.map(e => e.count), 1)

  /* Estadísticas de Personas por Empresa (Ocupación Real) */
  const peopleByCompany: Record<string, number> = {}
  for (const op of operariosConHab || []) {
    if (op.empresa_id) {
      peopleByCompany[op.empresa_id] = (peopleByCompany[op.empresa_id] ?? 0) + 1
    }
  }

  const empresaPeopleStats = (empresas || []).map(emp => ({
    nombre: emp.nombre_completo || emp.sigla,
    count: peopleByCompany[emp.id] ?? 0
  })).sort((a,b) => b.count - a.count)

  /* Rendimiento de Camarería */
  const { data: registrosCamareria } = await supabase
    .from('registro_camareria')
    .select('aseadora_id, hora_inicio, hora_fin')
    .eq('fecha', today)
    .not('hora_fin', 'is', null)
    .not('hora_inicio', 'is', null)

  const { data: perfilesAll } = await supabase.from('perfiles').select('id, nombre_completo')
  const perfilesMap = Object.fromEntries((perfilesAll || []).map(p => [p.id, p.nombre_completo]))

  const rendimientoCamareria: Record<string, { totalMins: number, count: number }> = {}
  
  if (registrosCamareria) {
    for (const reg of registrosCamareria) {
      if (reg.aseadora_id && reg.hora_inicio && reg.hora_fin) {
        const diffMs = new Date(reg.hora_fin).getTime() - new Date(reg.hora_inicio).getTime()
        const diffMins = Math.max(0, diffMs / 60000)
        
        if (!rendimientoCamareria[reg.aseadora_id]) {
          rendimientoCamareria[reg.aseadora_id] = { totalMins: 0, count: 0 }
        }
        
        rendimientoCamareria[reg.aseadora_id].totalMins += diffMins
        rendimientoCamareria[reg.aseadora_id].count += 1
      }
    }
  }

  const aseadorasStats = Object.entries(rendimientoCamareria).map(([id, stat]) => {
    return {
      nombre: perfilesMap[id] || 'Operario Desconocido',
      avgMins: Math.round(stat.totalMins / stat.count),
      rooms: stat.count
    }
  }).sort((a, b) => a.avgMins - b.avgMins)
  
  const maxAvgMins = Math.max(...aseadorasStats.map(a => a.avgMins), 1)

  /* Actividad reciente */
  const { data: rawRecientes } = await supabase
    .from('servicios')
    .select('id, tipo, created_at, operarios(nombre_completo, empresa_id), empresas(sigla, nombre_completo)')
    .order('created_at', { ascending: false })
    .limit(6)

  const recientes = (rawRecientes ?? []) as unknown as Servicio[]

  function timeAgo(ts: string | null) {
    if (!ts) return ''
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (diff < 1) return 'Ahora'
    if (diff < 60) return `Hace ${diff}m`
    return `Hace ${Math.floor(diff / 60)}h`
  }

  const TIPO_ICON: Record<string, string> = {
    'Desayuno': '🍳',
    'Almuerzo': '🍽',
    'Cena': '🌙',
    'Hospedaje': '🛏',
    'Lavandería': '👕',
  }

  // Data for modals
  const modalData = {
    operariosActivos: operariosActivos ?? 0,
    serviciosHoy: serviciosHoy ?? 0,
    cuposFisicosDisponibles,
    ocupacionPct,
    roomsWithSpace,
    omisiones: {
      desayuno: Math.max(0, omisionDesayuno),
      almuerzo: Math.max(0, omisionAlmuerzo),
      cena: Math.max(0, omisionCena),
      hospedaje: Math.max(0, omisionHospedaje),
      lavanderia: Math.max(0, omisionLavanderia),
      total: totalOmisiones,
      hospedados: hospedadosHoy,
    },
    empresaStats: empresaStats.map(e => ({
      nombre: e.empresa.nombre_completo || e.empresa.sigla,
      count: e.count,
    })),
    empresaPeopleStats: empresaPeopleStats,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DashboardHeartbeat />

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Bienvenido, Admin
          </h1>

        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* KPI Cards — Interactive */}
      <DashboardModals data={modalData}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Operarios */}
          <button data-modal="operarios" className="text-left bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all" style={{ borderBottom: '3px solid #005d6a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#e0f2f4' }}>
                <Users className="h-4.5 w-4.5" style={{ color: '#005d6a', width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hoy</span>
            </div>
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{hospedadosHoy}</p>
            <p className="text-xs text-muted-foreground mt-1">Personas hospedadas</p>
          </button>

          {/* Servicios */}
          <button data-modal="servicios" className="text-left bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all" style={{ borderBottom: '3px solid #005d6a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#e0f2f4' }}>
                <ClipboardList className="h-4.5 w-4.5" style={{ color: '#005d6a', width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Registros</span>
            </div>
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{serviciosHoy ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Servicios hoy</p>
          </button>

          {/* Cupos Físicos Disponibles (replaces "Sin Firma") */}
          <button data-modal="cupos" className="text-left bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all relative" style={{ borderBottom: '3px solid #1a7a4a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
                <BedDouble className="h-4.5 w-4.5" style={{ color: '#1a7a4a', width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Camas</span>
            </div>
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{cuposFisicosDisponibles}</p>
            <p className="text-xs text-muted-foreground mt-1">Cupos disponibles</p>
          </button>

          {/* Ocupación */}
          <button data-modal="ocupacion" className="text-left bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all" style={{ borderBottom: '3px solid #924b08' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#fef3e2' }}>
                <BedDouble className="h-4.5 w-4.5" style={{ color: '#924b08', width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hotel</span>
            </div>
            <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ocupacionPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">Ocupación</p>
          </button>
        </div>
      </DashboardModals>

      {/* Alertas de Omisión de Servicio */}
      {totalOmisiones > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm" style={{ borderLeft: '4px solid #ba1a1a' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <AlertOctagon style={{ color: '#ba1a1a', width: 18, height: 18 }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Alertas de Omisión de Servicio
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {hospedadosHoy} personas hospedadas hoy
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {omisionHospedaje > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">🛏 Hospedaje</p>
                <p className="text-xl font-bold text-blue-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{omisionHospedaje}</p>
                <p className="text-[9px] text-blue-600 mt-0.5">sin registrar</p>
              </div>
            )}
            {omisionDesayuno > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">🍳 Desayuno</p>
                <p className="text-xl font-bold text-amber-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{omisionDesayuno}</p>
                <p className="text-[9px] text-amber-600 mt-0.5">sin consumir</p>
              </div>
            )}
            {omisionAlmuerzo > 0 && (
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-1">🍽 Almuerzo</p>
                <p className="text-xl font-bold text-orange-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{omisionAlmuerzo}</p>
                <p className="text-[9px] text-orange-600 mt-0.5">sin consumir</p>
              </div>
            )}
            {omisionCena > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1">🌙 Cena</p>
                <p className="text-xl font-bold text-red-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{omisionCena}</p>
                <p className="text-[9px] text-red-600 mt-0.5">sin consumir</p>
              </div>
            )}
            {omisionLavanderia > 0 && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 mb-1">👕 Lavandería</p>
                <p className="text-xl font-bold text-purple-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{omisionLavanderia}</p>
                <p className="text-[9px] text-purple-600 mt-0.5">sin entregar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        <div className="space-y-6">
          {/* Services by company */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Servicios por empresa contratista
              </h2>
              <Link
                href="/consolidado"
                prefetch={true}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-2 transition-colors"
              >
                Ver reporte completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {empresaStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay servicios registrados para hoy.
              </div>
            ) : (
              <div className="space-y-5">
                {empresaStats.map(({ empresa, count }) => {
                  const barColor = empresa.color_hex || '#005d6a'
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                  return (
                    <div key={empresa.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{empresa.nombre_completo || empresa.sigla}</span>
                        <span className="text-xs text-muted-foreground">{count} servicio{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full" style={{ background: '#eceef0' }}>
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rendimiento de Camarería */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Rendimiento de Camarería (Hoy)
              </h2>
            </div>
            
            {aseadorasStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay aseos finalizados para calcular promedios.
              </div>
            ) : (
              <div className="space-y-5">
                {aseadorasStats.map((stat, idx) => {
                  const pct = maxAvgMins > 0 ? (stat.avgMins / maxAvgMins) * 100 : 0
                  // Fast cleaners are green, slower are orange, very slow red
                  let barColor = '#1a7a4a'
                  if (stat.avgMins > 15) barColor = '#924b08'
                  if (stat.avgMins > 30) barColor = '#ba1a1a'

                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{stat.nombre}</span>
                        <div className="flex gap-2 items-center">
                           <span className="text-xs font-semibold" style={{ color: barColor }}>{stat.avgMins} min/hab</span>
                           <span className="text-xs text-muted-foreground">({stat.rooms} habs)</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full" style={{ background: '#eceef0' }}>
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Actividad Reciente
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              En vivo
            </span>
          </div>

          {recientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sin actividad hoy.
            </div>
          ) : (
            <div className="space-y-4">
              {recientes.map((srv) => (
                <div key={srv.id} className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ background: '#f2f4f6', color: '#3e484b' }}
                  >
                    {srv.operarios?.nombre_completo?.split(' ').slice(0, 2).map(n => n[0]).join('') || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {srv.operarios?.nombre_completo || 'Operario'}
                    </p>
                    <p className="text-xs text-muted-foreground">{srv.empresas?.nombre_completo || srv.empresas?.sigla}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TIPO_ICON[srv.tipo] || '📋'} {srv.tipo}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(srv.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
