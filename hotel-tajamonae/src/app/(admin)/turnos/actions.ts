'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function procesarTurnoAction(turnoId: string, type: 'ingresos' | 'salidas' | 'todos') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'No autenticado' }

  // Obtener el turno
  const { data: turno, error: fetchError } = await supabase
    .from('importaciones_turno')
    .select('*')
    .eq('id', turnoId)
    .single()

  if (fetchError || !turno) return { ok: false, message: 'Turno no encontrado' }

  const entrantes: any[] = Array.isArray(turno.operarios_entrantes) ? turno.operarios_entrantes : []
  const salientes: string[] = Array.isArray(turno.operarios_salientes) ? (turno.operarios_salientes as unknown as string[]) : []

  const errors: string[] = []
  let processedCount = 0

  try {
    if (type === 'ingresos' || type === 'todos') {
      if (entrantes.length > 0) {
        for (const op of entrantes) {
          const payload: any = {
            empresa_id: turno.empresa_id,
            nombre_completo: op.nombre_completo,
            cargo: op.cargo || 'Operario',
            genero: op.genero || 'M',
            activo: true,
            tipo_cargo: (op.tipo_cargo || 'operativo').toLowerCase(),
            dias_turno: op.dias_turno || '14',
            documento_identidad: op.documento_identidad || `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          }
          if (op.rfid_uid) {
             payload.rfid_uid = op.rfid_uid
          }
          if (op.habitacion_id) {
             payload.habitacion_id = op.habitacion_id
          }

          const { error: upsertError } = await supabase
            .from('operarios')
            .upsert(payload, { onConflict: 'documento_identidad' })
          
          if (upsertError) {
            errors.push(`Error con ${op.nombre_completo}: ${upsertError.message}`)
          } else {
            processedCount++
          }
        }
      }
    }

    if (type === 'salidas' || type === 'todos') {
      if (salientes.length > 0) {
        for (const salienteData of salientes) {
          // Extraer ID si mandaron el objeto enriquecido desde el dashboard logístico
          const opId = typeof salienteData === 'object' && salienteData !== null 
            ? (salienteData as any).id 
            : salienteData;

          const { error: updateError } = await supabase.from('operarios').update({
            activo: false,
            habitacion_id: null,
            fecha_salida_turno: new Date().toISOString()
          }).eq('id', opId)

          if (updateError) {
            errors.push(`Error en salida de ID ${opId}: ${updateError.message}`)
          }
        }
      }
    }

    // Solo marcar como procesado si no hubo errores criticos que impidieran la operacion
    await supabase.from('importaciones_turno').update({
      procesado_por: user.id,
      fecha_proceso: new Date().toISOString()
    }).eq('id', turnoId)

    revalidatePath('/turnos')
    revalidatePath('/personal')
    revalidatePath('/habitaciones')

    if (errors.length > 0) {
      return { 
        ok: false, 
        message: `Procesado con ${errors.length} errores. ${processedCount} ingresos registrados.`,
        errors 
      }
    }

    return { ok: true, message: `Turno procesado correctamente. ${processedCount} ingresos registrados.` }
  } catch (error: any) {
    return { ok: false, message: `Error fatal al procesar: ${error.message}` }
  }
}

export async function rechazarTurnoAction(turnoId: string) {
  const supabase = await createClient()
  await supabase.from('importaciones_turno').delete().eq('id', turnoId)
  revalidatePath('/turnos')
  return { ok: true, message: 'Carga de turno rechazada / eliminada' }
}
