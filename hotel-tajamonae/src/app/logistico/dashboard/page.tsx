import { createClient } from '@/lib/supabase/server'
import { LogisticoClient } from './logistico-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    desde?: string
    hasta?: string
  }>
}

export default async function LogisticoDashboardPage({ searchParams }: Props) {
  const { desde: qDesde, hasta: qHasta } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.rol !== 'logistico') {
    redirect('/login')
  }

  // Obtener empresa del logistico (prioridad tabla perfiles, fallback metadatos)
  const { data: profile } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle()

  const empresaId = profile?.empresa_id || user.user_metadata?.empresa_id

  if (!empresaId) {
    return (
      <div className="p-10 text-center font-bold text-red-500 bg-red-50 rounded-xl border border-red-200">
        <h2 className="text-xl mb-2">Acceso No Configurado</h2>
        <p>Tu cuenta de logístico no tiene una empresa asignada en el sistema. Contacta al administrador para vincular tu perfil a una empresa operativa.</p>
      </div>
    )
  }

  const PRECIOS_BASE = {
    hospedaje: 80000,
    desayuno: 27000,
    almuerzo: 28500,
    cena: 27000,
    lavanderia: 13500,
  }
  const IMPUESTOS = {
    hospedaje: { tasa: 0.19, nombre: 'IVA 19%' },
    desayuno: { tasa: 0.08, nombre: 'Impoconsumo 8%' },
    almuerzo: { tasa: 0.08, nombre: 'Impoconsumo 8%' },
    cena: { tasa: 0.08, nombre: 'Impoconsumo 8%' },
    lavanderia: { tasa: 0.19, nombre: 'IVA 19%' },
  }

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nombre_completo, sigla, nit, color_hex')
    .eq('id', empresaId)
    .single()

  if (!empresa) {
    return <div className="p-10 text-center font-bold text-red-500">Error: Empresa no encontrada.</div>
  }

  const today = new Date()
  const defaultFirstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const defaultLastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  const desde = qDesde || defaultFirstDay
  const hasta = qHasta || defaultLastDay

  // Fetch Servicios
  const { data: servicios } = await supabase
    .from('servicios')
    .select('tipo, valor_base, valor_total, porcentaje_impuesto')
    .eq('empresa_id', empresa.id)
    .gte('fecha', desde)
    .lte('fecha', hasta)

  let totalHospedaje = 0
  let totalDesayuno = 0
  let totalAlmuerzo = 0
  let totalCena = 0
  let totalLavanderia = 0

  let hTotal = 0, dTotal = 0, aTotal = 0, cTotal = 0, lavTotal = 0

  for (const s of servicios || []) {
    const valTot = Number(s.valor_total) || 0;
    if (s.tipo === 'Hospedaje') { totalHospedaje++; hTotal += valTot; }
    else if (s.tipo === 'Desayuno') { totalDesayuno++; dTotal += valTot; }
    else if (s.tipo === 'Almuerzo') { totalAlmuerzo++; aTotal += valTot; }
    else if (s.tipo === 'Cena') { totalCena++; cTotal += valTot; }
    else if (s.tipo === 'Lavandería') { totalLavanderia++; lavTotal += valTot; }
  }

  const granTotalValue = hTotal + dTotal + aTotal + cTotal + lavTotal

  const empresaStat = {
    id: empresa.id,
    nombre: empresa.nombre_completo || empresa.sigla,
    nit: empresa.nit,
    color: empresa.color_hex || '#005d6a',
    hospedaje: totalHospedaje,
    alimentacion: totalDesayuno + totalAlmuerzo + totalCena,
    lavanderia: totalLavanderia,
    totalRaw: granTotalValue,
    totalFormatted: formatCOP(granTotalValue)
  }

  // Fetch detailed history
  const { data: detailedData } = await supabase
      .from('servicios')
      .select('id, tipo, fecha, hora_registro, es_manual, motivo_manual, valor_base, porcentaje_impuesto, valor_impuesto, valor_total, registrado_por, operarios(nombre_completo, documento_identidad, cargo)')
      .eq('empresa_id', empresa.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('hora_registro', { ascending: false })
      .limit(1000)

  const detailedHistory = (detailedData || []).map(r => ({
    id: r.id,
    tipo: r.tipo,
    fecha: r.fecha,
    hora: r.hora_registro?.slice(0, 5) || '--:--',
    operario: (r.operarios as any)?.nombre_completo || 'Operario',
    cedula: (r.operarios as any)?.documento_identidad || 'N/A',
    cargo: (r.operarios as any)?.cargo || 'N/A',
    empresa: empresa.nombre_completo || empresa.sigla,
    es_manual: !!r.es_manual,
    motivo_manual: r.motivo_manual,
    valor_base: r.valor_base || 0,
    porcentaje_impuesto: r.porcentaje_impuesto || 0,
    valor_impuesto: r.valor_impuesto || 0,
    valor_total: r.valor_total || 0,
    registrado_por: r.registrado_por,
  }))

  let sumHospedajeBase = 0, sumHospedajeTotal = 0
  let sumDesayunoBase = 0, sumDesayunoTotal = 0
  let sumAlmuerzoBase = 0, sumAlmuerzoTotal = 0
  let sumCenaBase = 0, sumCenaTotal = 0
  let sumLavanderiaBase = 0, sumLavanderiaTotal = 0

  for (const r of detailedHistory) {
    if (r.tipo === 'Hospedaje') { sumHospedajeBase += r.valor_base; sumHospedajeTotal += r.valor_total; }
    else if (r.tipo === 'Desayuno') { sumDesayunoBase += r.valor_base; sumDesayunoTotal += r.valor_total; }
    else if (r.tipo === 'Almuerzo') { sumAlmuerzoBase += r.valor_base; sumAlmuerzoTotal += r.valor_total; }
    else if (r.tipo === 'Cena') { sumCenaBase += r.valor_base; sumCenaTotal += r.valor_total; }
    else if (r.tipo === 'Lavandería') { sumLavanderiaBase += r.valor_base; sumLavanderiaTotal += r.valor_total; }
  }

  const RESUMEN = [
    { 
      servicio: 'Alojamiento Doble', dot: '#005d6a', 
      cantidad: totalHospedaje, unidad: 'noches', 
      subtotalInfo: formatCOP(sumHospedajeBase),
      subtotalBruto: sumHospedajeBase,
      impuestoAsignado: IMPUESTOS.hospedaje.nombre, 
      totalConImpuesto: sumHospedajeTotal 
    },
    { 
      servicio: 'Desayunos', dot: '#924b08', 
      cantidad: totalDesayuno, unidad: 'servicios', 
      subtotalInfo: formatCOP(sumDesayunoBase),
      subtotalBruto: sumDesayunoBase,
      impuestoAsignado: IMPUESTOS.desayuno.nombre, 
      totalConImpuesto: sumDesayunoTotal 
    },
    { 
      servicio: 'Almuerzos', dot: '#b45309', 
      cantidad: totalAlmuerzo, unidad: 'servicios', 
      subtotalInfo: formatCOP(sumAlmuerzoBase),
      subtotalBruto: sumAlmuerzoBase,
      impuestoAsignado: IMPUESTOS.almuerzo.nombre, 
      totalConImpuesto: sumAlmuerzoTotal 
    },
    { 
      servicio: 'Cenas', dot: '#ba1a1a', 
      cantidad: totalCena, unidad: 'servicios', 
      subtotalInfo: formatCOP(sumCenaBase),
      subtotalBruto: sumCenaBase,
      impuestoAsignado: IMPUESTOS.cena.nombre, 
      totalConImpuesto: sumCenaTotal 
    },
    { 
      servicio: 'Lavandería', dot: '#14b8a6', 
      cantidad: totalLavanderia, unidad: 'mudas', 
      subtotalInfo: formatCOP(sumLavanderiaBase),
      subtotalBruto: sumLavanderiaBase,
      impuestoAsignado: IMPUESTOS.lavanderia.nombre, 
      totalConImpuesto: sumLavanderiaTotal 
    },
  ]

  // Obtener operarios hospedados currently
  const { data: operariosData } = await supabase
    .from('operarios')
    .select('id, nombre_completo, cargo, habitacion_id')
    .eq('empresa_id', empresa.id)
    .eq('activo', true)
    .not('habitacion_id', 'is', null)

  const alojadosCount = operariosData?.length || 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col mb-4">
        <h1 className="text-3xl lg:text-4xl font-black text-foreground uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Información Consolidada
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-bold">
          Visualizando registros para {empresa.nombre_completo}
        </p>
      </div>

      <LogisticoClient 
        empresaStat={empresaStat} 
        resumen={RESUMEN} 
        detailedHistory={detailedHistory}
        desde={desde}
        hasta={hasta}
        alojados={operariosData || []}
        alojadosCount={alojadosCount}
      />
    </div>
  )
}
