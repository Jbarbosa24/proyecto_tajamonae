import Link from 'next/link'
import { BedDouble, FileSpreadsheet, Utensils, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConsolidadoFiltros } from './filtros'
import { ConsolidadoClient } from './consolidado-client'
import { getBogotaMonthRange } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    desde?: string
    hasta?: string
    empresa?: string
  }>
}

export default async function ConsolidadoPage({ searchParams }: Props) {
  const { desde: qDesde, hasta: qHasta, empresa: qEmpresa } = await searchParams
  const supabase = await createClient()

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

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nombre_completo, sigla, nit, color_hex, activa, tarifas_empresa(tipo_servicio, valor_unitario)')
    .eq('activa', true)
    .order('nombre_completo')

  const now = new Date()
  const bogotaYear = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric' }).format(now))
  const bogotaMonth = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', month: 'numeric' }).format(now)) - 1
  
  const defaultFirstDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(bogotaYear, bogotaMonth, 1))
  const defaultLastDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(bogotaYear, bogotaMonth + 1, 0))

  const desde = qDesde || defaultFirstDay
  const hasta = qHasta || defaultLastDay

  /* Build per-empresa stats */
  interface EmpresaStat {
    id: string; nombre: string; nit: string | null; color: string
    hospedaje: number; alimentacion: number; lavanderia: number; totalRaw: number; totalFormatted: string; activa: boolean
  }

  let totalHospedaje = 0
  let totalDesayuno = 0
  let totalAlmuerzo = 0
  let totalCena = 0
  let totalLavanderia = 0

  let sumHospedajeBase = 0, sumHospedajeTotal = 0
  let sumDesayunoBase = 0, sumDesayunoTotal = 0
  let sumAlmuerzoBase = 0, sumAlmuerzoTotal = 0
  let sumCenaBase = 0, sumCenaTotal = 0
  let sumLavanderiaBase = 0, sumLavanderiaTotal = 0

  const selectedEmpresaId = qEmpresa

  const empresaStats: EmpresaStat[] = await Promise.all(
    (empresas || [])
      .filter(emp => !selectedEmpresaId || emp.id === selectedEmpresaId)
      .map(async (emp) => {
        const { data: servicios } = await supabase
          .from('servicios')
          .select('tipo')
          .eq('empresa_id', emp.id)
          .gte('fecha', desde)
          .lte('fecha', hasta)

        const tarifas = (emp.tarifas_empresa as any[]) || []
        const getTarifa = (tipo: string) => {
          const t = tarifas.find(x => x.tipo_servicio === tipo)
          return t ? t.valor_unitario : 0
        }

        const tarifaH = getTarifa('Hospedaje')
        const tarifaD = getTarifa('Desayuno')
        const tarifaA = getTarifa('Almuerzo')
        const tarifaC = getTarifa('Cena')
        const tarifaL = getTarifa('Lavandería')

        let h = 0, d = 0, a = 0, c = 0, lav = 0

        for (const s of servicios || []) {
          if (s.tipo === 'Hospedaje') { h++; }
          else if (s.tipo === 'Desayuno') { d++; }
          else if (s.tipo === 'Almuerzo') { a++; }
          else if (s.tipo === 'Cena') { c++; }
          else if (s.tipo === 'Lavandería') { lav++; }
        }

        totalHospedaje += h
        totalDesayuno += d
        totalAlmuerzo += a
        totalCena += c
        totalLavanderia += lav

        const hTotalBase = h * tarifaH
        const dTotalBase = d * tarifaD
        const aTotalBase = a * tarifaA
        const cTotalBase = c * tarifaC
        const lavTotalBase = lav * tarifaL

        const hTotalConImpuesto = hTotalBase * (1 + IMPUESTOS.hospedaje.tasa)
        const dTotalConImpuesto = dTotalBase * (1 + IMPUESTOS.desayuno.tasa)
        const aTotalConImpuesto = aTotalBase * (1 + IMPUESTOS.almuerzo.tasa)
        const cTotalConImpuesto = cTotalBase * (1 + IMPUESTOS.cena.tasa)
        const lavTotalConImpuesto = lavTotalBase * (1 + IMPUESTOS.lavanderia.tasa)

        sumHospedajeBase += hTotalBase; sumHospedajeTotal += hTotalConImpuesto;
        sumDesayunoBase += dTotalBase; sumDesayunoTotal += dTotalConImpuesto;
        sumAlmuerzoBase += aTotalBase; sumAlmuerzoTotal += aTotalConImpuesto;
        sumCenaBase += cTotalBase; sumCenaTotal += cTotalConImpuesto;
        sumLavanderiaBase += lavTotalBase; sumLavanderiaTotal += lavTotalConImpuesto;

        const granTotalValue = hTotalConImpuesto + dTotalConImpuesto + aTotalConImpuesto + cTotalConImpuesto + lavTotalConImpuesto

        return {
          id: emp.id,
          nombre: emp.nombre_completo || emp.sigla,
          nit: emp.nit,
          color: emp.color_hex || '#005d6a',
          hospedaje: h,
          alimentacion: d + a + c,
          lavanderia: lav,
          totalRaw: granTotalValue,
          totalFormatted: formatCOP(granTotalValue),
          activa: emp.activa ?? true,
        }
      })
  )

  // Fetch full detailed history
  const detailedQuery = supabase
      .from('servicios')
      .select('id, tipo, fecha, hora_registro, es_manual, motivo_manual, empresa_id, registrado_por, operarios(nombre_completo)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
  
  if (selectedEmpresaId) {
    detailedQuery.eq('empresa_id', selectedEmpresaId)
  }

  const { data: detailedData } = await detailedQuery
      .order('fecha', { ascending: false })
      .order('hora_registro', { ascending: false })
      .limit(1000)
  
  const detailedHistory = (detailedData || []).map(r => {
    const emp = (empresas || []).find(e => e.id === r.empresa_id)
    const tarifas = (emp?.tarifas_empresa as any[]) || []
    const t = tarifas.find(x => x.tipo_servicio === r.tipo)
    const valorBaseDynamic = t ? t.valor_unitario : 0
    
    let impuestoDefault = { tasa: 0 }
    if (r.tipo === 'Hospedaje') impuestoDefault = IMPUESTOS.hospedaje
    else if (r.tipo === 'Desayuno') impuestoDefault = IMPUESTOS.desayuno
    else if (r.tipo === 'Almuerzo') impuestoDefault = IMPUESTOS.almuerzo
    else if (r.tipo === 'Cena') impuestoDefault = IMPUESTOS.cena
    else if (r.tipo === 'Lavandería') impuestoDefault = IMPUESTOS.lavanderia

    const valorImpuestoDynamic = Math.round(valorBaseDynamic * impuestoDefault.tasa)
    const valorTotalDynamic = valorBaseDynamic + valorImpuestoDynamic

    return {
      id: r.id,
      tipo: r.tipo,
      fecha: r.fecha,
      hora: r.hora_registro?.slice(0, 5) || '--:--',
      operario: (r.operarios as any)?.nombre_completo || 'Operario desconocido',
      empresa: emp ? (emp.nombre_completo || emp.sigla) : 'N/A',
      es_manual: !!r.es_manual,
      motivo_manual: r.motivo_manual,
      valor_base: valorBaseDynamic,
      porcentaje_impuesto: impuestoDefault.tasa,
      valor_impuesto: valorImpuestoDynamic,
      valor_total: valorTotalDynamic,
      registrado_por: r.registrado_por,
    }
  })

  const RESUMEN = [
    { 
      servicio: 'Alojamiento Doble', dot: '#005d6a', 
      cantidad: totalHospedaje, unidad: 'noches/personas', 
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

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Consolidado General
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Reportes analíticos de facturación y servicios agrupados por convenio corporativo.
          </p>
        </div>
        
        <ConsolidadoFiltros defaultDesde={defaultFirstDay} defaultHasta={defaultLastDay} />
      </div>

      <ConsolidadoClient 
        empresaStats={empresaStats} 
        resumen={RESUMEN} 
        detailedHistory={detailedHistory}
        desde={desde}
        hasta={hasta}
      />

    </div>
  )
}
