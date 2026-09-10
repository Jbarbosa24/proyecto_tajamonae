import { createClient } from '@/lib/supabase/server'
import { ConsolidadoFiltros } from '@/app/(admin)/consolidado/filtros'
import { AuditoriaClient } from '@/app/(admin)/auditoria/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AuditoriaPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function AuditoriaLogisticoPage({ searchParams }: AuditoriaPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return (
      <div className="flex h-40 items-center justify-center p-8 bg-destructive/10 rounded-xl border-2 border-destructive/20 max-w-2xl mx-auto mt-10">
        <p className="text-xl font-black uppercase tracking-widest text-destructive">
          Sesión expirada o inválida
        </p>
      </div>
    )
  }

  // Obtener empresa del logistico desde metadatos
  const empresaId = user.user_metadata?.empresa_id

  if (!empresaId) {
    return (
      <div className="flex h-40 items-center justify-center p-8 bg-destructive/10 rounded-xl border-2 border-destructive/20 max-w-2xl mx-auto mt-10">
        <p className="text-xl font-black uppercase tracking-widest text-destructive text-center">
          Tu cuenta no tiene una empresa asociada
        </p>
      </div>
    )
  }

  const timeZone = 'America/Bogota'
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const today = formatter.format(new Date())

  const desde = params.desde || today
  const hasta = params.hasta || today

  // 1. Fetch Manual Services (Overrides) in the specified date range, solo para la empresa
  const { data: serviciosManualesRaw } = await supabase
    .from('servicios')
    .select('id, tipo, fecha, hora_registro, motivo_manual, valor_total, registrado_por, operarios!inner(nombre_completo, documento_identidad), empresas!inner(nombre_completo), perfiles!servicios_registrado_por_fkey(nombre_completo)')
    .eq('es_manual', true)
    .eq('empresa_id', empresaId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })
    .order('hora_registro', { ascending: false })

  const serviciosManuales = (serviciosManualesRaw || []).map((s: any) => ({
    id: s.id,
    fecha: s.fecha,
    hora: s.hora_registro?.substring(0, 5) || '--:--',
    tipo: s.tipo,
    motivo: s.motivo_manual || 'No especificado',
    operario: s.operarios?.nombre_completo || 'Desconocido',
    documento: s.operarios?.documento_identidad || 'N/A',
    empresa: s.empresas?.nombre_completo || 'N/A',
    registradoPor: s.perfiles?.nombre_completo || s.registrado_por || 'Sistema',
    valorTotal: s.valor_total || 0,
  }))

  // 2. Fetch Unused Credits (Omissions) in the specified date range, solo para la empresa
  const { data: creditosNoConsumidosRaw } = await supabase
    .from('creditos_diarios')
    .select('id, fecha, tipo, operario_id, operarios!inner(nombre_completo, documento_identidad, empresas(nombre_completo), empresa_id)')
    .eq('consumido', false)
    .eq('operarios.empresa_id', empresaId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })

  const creditosNoConsumidos = (creditosNoConsumidosRaw || []).map((c: any) => ({
    id: c.id,
    fecha: c.fecha,
    tipo: c.tipo,
    operario: c.operarios?.nombre_completo || 'Desconocido',
    documento: c.operarios?.documento_identidad || 'N/A',
    empresa: c.operarios?.empresas?.nombre_completo || 'N/A',
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight" style={{ fontFamily: 'space grotesk, sans-serif' }}>
            Auditoría
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Control de validación cruzada: Excepciones manuales vs omisiones de consumo.
          </p>
        </div>
        
        {/* We reuse the ConsolidadoFiltros component since it manages date state elegantly */}
        <ConsolidadoFiltros defaultDesde={today} defaultHasta={today} />
      </div>

      <AuditoriaClient 
        serviciosManuales={serviciosManuales} 
        creditosNoConsumidos={creditosNoConsumidos}
        desde={desde}
        hasta={hasta}
        isLogistico={true}
      />
    </div>
  )
}
