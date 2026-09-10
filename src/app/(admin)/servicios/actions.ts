'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getBogotaDate } from '@/lib/date-utils'

const registroManualSchema = z.object({
  documento: z.string().trim().min(3, 'El documento es requerido'),
  tipo: z.enum(['Desayuno', 'Almuerzo', 'Cena', 'Hospedaje', 'Lavandería']),
  cantidad: z.number().int().min(1).default(1),
})

export type RegistroManualResult = {
  ok: boolean
  message: string
}

export async function registrarServicioManualAction(formData: FormData): Promise<RegistroManualResult> {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { ok: false, message: 'Sesión expirada' }
  }

  // Parse payload
  const rawDocument = formData.get('documento') as string
  const rawTipo = formData.get('tipo') as string
  const rawCantidad = Number(formData.get('cantidad') || 1)

  const parsed = registroManualSchema.safeParse({
    documento: rawDocument,
    tipo: rawTipo,
    cantidad: rawCantidad,
  })

  if (!parsed.success) {
    return { ok: false, message: 'Datos de formulario inválidos' }
  }

  const { documento, tipo, cantidad } = parsed.data

  // Fetch operator by CC
  const { data: operario, error: opError } = await supabase
    .from('operarios')
    .select('id, activo, empresa_id, nombre_completo')
    .eq('documento_identidad', documento)
    .single()

  if (opError || !operario) {
    return { ok: false, message: 'Cédula no registrada en el sistema.' }
  }

  if (!operario.activo) {
    return { ok: false, message: 'El operario se encuentra inactivo.' }
  }

  const today = getBogotaDate()

  // Check available credits
  const { data: creditosLibres, error: credError } = await supabase
    .from('creditos_diarios')
    .select('id')
    .eq('operario_id', operario.id)
    .eq('fecha', today)
    .eq('tipo', tipo)
    .eq('consumido', false)
    .limit(tipo === 'Lavandería' ? cantidad : 1)

  if (credError || !creditosLibres || creditosLibres.length < (tipo === 'Lavandería' ? cantidad : 1)) {
    return { ok: false, message: `Créditos insuficientes para ${tipo}${tipo === 'Lavandería' ? ` (solicitados: ${cantidad}, disponibles: ${creditosLibres?.length || 0})` : ''}.` }
  }

  // Tariff and taxes lookup
  const IMPUESTOS = {
    'Hospedaje': { tasa: 0.19, nombre: 'IVA 19%', tipo: 'IVA' },
    'Desayuno': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
    'Almuerzo': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
    'Cena': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
    'Lavandería': { tasa: 0.19, nombre: 'IVA 19%', tipo: 'IVA' },
  } as const

  const TARIFAS_DEFAULT = {
    'Hospedaje': 74000,
    'Lavandería': 13000,
    'Desayuno': 12500,
    'Almuerzo': 12500,
    'Cena': 12500,
  }

  const { data: tarifa } = await supabase
    .from('tarifas_empresa')
    .select('valor_unitario')
    .eq('empresa_id', operario.empresa_id)
    .eq('tipo_servicio', tipo)
    .single()

  if (!tarifa) {
    return { ok: false, message: `El servicio "${tipo}" no está configurado para la empresa del operario.` }
  }

  const valorBase = tarifa.valor_unitario
  const impuestoDefault = IMPUESTOS[tipo as keyof typeof IMPUESTOS]
  
  const tipoImpuesto = impuestoDefault.tipo
  const tasaImpuesto = impuestoDefault.tasa

  const valorImpuesto = Math.round(valorBase * tasaImpuesto)
  const valorTotal = valorBase + valorImpuesto

  const creditosAUsar = creditosLibres.map(c => c.id)

  const inserts = Array.from({ length: tipo === 'Lavandería' ? cantidad : 1 }).map(() => ({
    operario_id: operario.id,
    empresa_id: operario.empresa_id,
    tipo: tipo,
    es_manual: true,
    motivo_manual: 'Registro por Cédula',
    registrado_por: user.id,
    valor_base: valorBase,
    tipo_impuesto: tipoImpuesto,
    porcentaje_impuesto: tasaImpuesto,
    valor_impuesto: valorImpuesto,
    valor_total: valorTotal,
  }))

  const { data: insertedServices, error: insertError } = await supabase
    .from('servicios')
    .insert(inserts)
    .select('id')

  if (insertError || !insertedServices) {
    return { ok: false, message: `Error al registrar: ${insertError?.message || 'DB error'}` }
  }

  // Consume credits
  const serviceIds = insertedServices.map(s => s.id)
  
  for (let i = 0; i < creditosAUsar.length; i++) {
    await supabase
      .from('creditos_diarios')
      .update({ consumido: true, servicio_id: serviceIds[i] })
      .eq('id', creditosAUsar[i])
  }

  revalidatePath('/dashboard')
  revalidatePath('/servicios')
  revalidatePath('/consolidado')

  return { ok: true, message: `Registro manual exitoso para ${operario.nombre_completo}` }
}
