'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getBogotaDate, getBogotaTime } from '@/lib/date-utils'

export type TipoServicio = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Hospedaje' | 'Lavandería'

const IMPUESTOS: Record<TipoServicio, { tasa: number; nombre: string; tipo: string }> = {
  'Hospedaje': { tasa: 0.19, nombre: 'IVA 19%', tipo: 'IVA' },
  'Desayuno': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
  'Almuerzo': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
  'Cena': { tasa: 0.08, nombre: 'Impoconsumo 8%', tipo: 'Impoconsumo' },
  'Lavandería': { tasa: 0.19, nombre: 'IVA 19%', tipo: 'IVA' },
}

const TARIFAS_DEFAULT: Record<TipoServicio, number> = {
  'Hospedaje': 74000,
  'Lavandería': 13000,
  'Desayuno': 12500,
  'Almuerzo': 12500,
  'Cena': 12500,
}

export interface RFIDGlobalResult {
  ok: boolean
  operarioNombre: string
  tipo: TipoServicio
  message: string
}

export async function registrarServicioRFIDGlobal(
  uid: string,
  tipoServicio: TipoServicio
): Promise<RFIDGlobalResult> {
  const supabase = await createClient()

  // 1. Buscar operario por RFID UID
  const { data: operario, error: opError } = await supabase
    .from('operarios')
    .select('id, nombre_completo, empresa_id, activo')
    .eq('rfid_uid', uid.trim())
    .single()

  if (opError || !operario) {
    return {
      ok: false,
      operarioNombre: 'Desconocido',
      tipo: tipoServicio,
      message: `UID "${uid}" no registrado en el sistema.`,
    }
  }

  if (!operario.activo) {
    return {
      ok: false,
      operarioNombre: operario.nombre_completo,
      tipo: tipoServicio,
      message: `${operario.nombre_completo} está INACTIVO. No puede recibir servicios.`,
    }
  }

  // 2. Buscar crédito disponible para hoy (Zona Horaria Colombia)
  const today = getBogotaDate()
  const nowTime = getBogotaTime()

  const { data: credito, error: credError } = await supabase
    .from('creditos_diarios')
    .select('id')
    .eq('operario_id', operario.id)
    .eq('fecha', today)
    .eq('tipo', tipoServicio)
    .eq('consumido', false)
    .single()

  if (credError || !credito) {
    return {
      ok: false,
      operarioNombre: operario.nombre_completo,
      tipo: tipoServicio,
      message: `Sin crédito disponible de ${tipoServicio} para hoy (${today}).`,
    }
  }

  // 3. Buscar tarifa de la empresa
  const { data: tarifa } = await supabase
    .from('tarifas_empresa')
    .select('valor_unitario')
    .eq('empresa_id', operario.empresa_id)
    .eq('tipo_servicio', tipoServicio)
    .single()

  if (!tarifa) {
    return {
      ok: false,
      operarioNombre: operario.nombre_completo,
      tipo: tipoServicio,
      message: `El servicio "${tipoServicio}" no está configurado para la empresa de este operario.`,
    }
  }

  const valorBase = tarifa.valor_unitario
  const impuestoDefault = IMPUESTOS[tipoServicio]
  
  const tipoImpuesto = impuestoDefault.tipo
  const tasaImpuesto = impuestoDefault.tasa

  const valorImpuesto = Math.round(valorBase * tasaImpuesto)
  const valorTotal = valorBase + valorImpuesto

  // 4. Get auth user
  const { data: { user } } = await supabase.auth.getUser()

  // 5. Insert service record with explicit Local Time
  const { data: servicio, error: servError } = await supabase
    .from('servicios')
    .insert({
      operario_id: operario.id,
      empresa_id: operario.empresa_id,
      tipo: tipoServicio,
      valor_base: valorBase,
      tipo_impuesto: tipoImpuesto,
      porcentaje_impuesto: tasaImpuesto,
      valor_impuesto: valorImpuesto,
      valor_total: valorTotal,
      rfid_uid_lectura: uid.trim(),
      es_manual: false,
      registrado_por: user?.id || null,
      fecha: today,
      hora_registro: nowTime,
    })
    .select('id')
    .single()

  if (servError || !servicio) {
    return {
      ok: false,
      operarioNombre: operario.nombre_completo,
      tipo: tipoServicio,
      message: `Error al registrar servicio: ${servError?.message || 'desconocido'}`,
    }
  }

  // 6. Consume credit
  await supabase
    .from('creditos_diarios')
    .update({ consumido: true, servicio_id: servicio.id })
    .eq('id', credito.id)

  revalidatePath('/dashboard')
  revalidatePath('/servicios')
  revalidatePath('/consolidado')

  return {
    ok: true,
    operarioNombre: operario.nombre_completo,
    tipo: tipoServicio,
    message: `${tipoServicio} registrado para ${operario.nombre_completo}`,
  }
}
