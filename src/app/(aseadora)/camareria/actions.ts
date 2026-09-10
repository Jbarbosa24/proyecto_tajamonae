'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getBogotaDate } from '@/lib/date-utils'

export interface CamareriaResult {
  ok: boolean
  message: string
}

export async function iniciarLimpiezaAction(habitacionId: string, fotoAntes: string | null = null): Promise<CamareriaResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: 'No autenticado.' }
  }

  const today = getBogotaDate()

  // Check if there's already an active cleaning record for today
  const { data: existing } = await supabase
    .from('registro_camareria')
    .select('id, estado')
    .eq('habitacion_id', habitacionId)
    .eq('fecha', today)
    .in('estado', ['Pendiente', 'En proceso'])
    .single()

  if (existing?.estado === 'En proceso') {
    return { ok: true, message: 'La limpieza ya estaba en curso.' }
  }

  if (existing) {
    // Update existing pending record
    const { error } = await supabase
      .from('registro_camareria')
      .update({
        estado: 'En proceso',
        hora_inicio: new Date().toISOString(),
        aseadora_id: user.id,
        ...(fotoAntes ? { foto_antes: fotoAntes } : {})
      })
      .eq('id', existing.id)

    if (error) {
      return { ok: false, message: `Error: ${error.message}` }
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('registro_camareria')
      .insert({
        habitacion_id: habitacionId,
        aseadora_id: user.id,
        estado: 'En proceso',
        hora_inicio: new Date().toISOString(),
        fecha: today,
        foto_antes: fotoAntes
      })

    if (error) {
      return { ok: false, message: `Error: ${error.message}` }
    }
  }

  // Update room estado_aseo and estado with admin privileges
  const adminSupabase = createAdminClient()
  const { error: errorHabitacion } = await adminSupabase
    .from('habitaciones')
    .update({
      estado_aseo: 'En proceso',
      estado: 'En limpieza',
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq('id', habitacionId)

  if (errorHabitacion) {
    return { ok: false, message: `Error actualizando el estado de la habitación: ${errorHabitacion.message}` }
  }

  revalidatePath('/camareria')
  revalidatePath('/dashboard')
  revalidatePath('/habitaciones')

  return { ok: true, message: `Limpieza iniciada en habitación ${habitacionId}.` }
}

export async function finalizarLimpiezaAction(
  registroId: string,
  habitacionId: string,
  checklist: any,
  fotoDespues: string | null
): Promise<CamareriaResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('registro_camareria')
    .update({
      estado: 'Aseo listo',
      hora_fin: new Date().toISOString(),
      lista_chequeo: checklist,
      foto_despues: fotoDespues
    })
    .eq('id', registroId)

  if (error) {
    return { ok: false, message: `Error: ${error.message}` }
  }

  // Check if there are active workers in this room to determine room state
  const { data: activeWorkers } = await supabase
    .from('operarios')
    .select('id')
    .eq('habitacion_id', habitacionId)
    .eq('activo', true)

  const hasOccupants = (activeWorkers?.length ?? 0) > 0

  const adminSupabase = createAdminClient()
  
  // Diagnostic log
  console.log('[Camareria] Intentando actualizar habitación:', habitacionId, { hasOccupants })

  const { error: errorHabitacion } = await adminSupabase
    .from('habitaciones')
    .update({
      estado_aseo: 'Aseo listo',
      estado: hasOccupants ? 'Ocupada' : 'Disponible',
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq('id', habitacionId)

  if (errorHabitacion) {
    console.error('[Camareria] Error en update habitacion:', errorHabitacion)
    return { ok: false, message: `Error guardando el finalizado en la habitación: ${errorHabitacion.message}` }
  }

  revalidatePath('/camareria')
  revalidatePath('/dashboard')
  revalidatePath('/habitaciones')

  return { ok: true, message: `Habitación ${habitacionId} limpia.` }
}

export async function reportarIncidenciaAction(
  habitacionId: string,
  observaciones: string
): Promise<CamareriaResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = getBogotaDate()

  const { error } = await supabase
    .from('registro_camareria')
    .insert({
      habitacion_id: habitacionId,
      aseadora_id: user?.id || null,
      estado: 'Pendiente',
      fecha: today,
      observaciones,
    })

  if (error) {
    return { ok: false, message: `Error: ${error.message}` }
  }

  revalidatePath('/camareria')
  return { ok: true, message: `Incidencia registrada para habitación ${habitacionId}.` }
}

export async function registrarLavanderiaAction(
  habitacionId: string,
  prendas: { jeans: number; camisas: number; overoles: number; pantalonetas: number; toallas: number; capuchones: number },
  fotoRecibida: string | null
): Promise<CamareriaResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = getBogotaDate()

  const { error } = await supabase
    .from('registro_lavanderia')
    .insert({
      habitacion_id: habitacionId,
      registrado_por: user?.id || null,
      fecha: today,
      ...prendas,
      foto_tula_recibida_url: fotoRecibida,
      estado: Object.values(prendas).every(v => v === 0) ? 'Sin prendas' : 'En proceso'
    })

  if (error) {
    return { ok: false, message: `Error: ${error.message}` }
  }
  
  revalidatePath('/camareria')
  return { ok: true, message: `Tula recibida para habitación ${habitacionId}.` }
}

export async function entregarLavanderiaAction(id: string, fotoEntregada: string | null): Promise<CamareriaResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('registro_lavanderia')
    .update({
      estado: 'Entregado',
      foto_tula_entregada_url: fotoEntregada
    })
    .eq('id', id)

  if (error) {
    return { ok: false, message: `Error: ${error.message}` }
  }
  
  revalidatePath('/camareria')
  return { ok: true, message: `Tula entregada.` }
}
