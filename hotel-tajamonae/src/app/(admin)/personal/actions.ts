'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

const importedWorkerSchema = z.object({
  nombre_completo: z.string().trim().min(3),
  documento_identidad: z.string().trim().min(3),
  empresa: z.string().trim().min(2),
  cargo: z.string().trim().min(2),
  rfid_uid: z.string().trim().max(32).optional().nullable(),
  genero: z.enum(['M', 'F']).default('M'),
  tipo_cargo: z.enum(['operativo', 'administrativo']).default('operativo'),
  dias_turno: z.string().trim().optional().nullable(), // e.g., '14/7', '20/10'
})

const processTurnoSchema = z.object({
  fileName: z.string().trim().min(1),
  workers: z.array(importedWorkerSchema).min(1),
})

const assignmentSchema = z.object({
  operario_id: z.string().uuid(),
  habitacion_id: z.string().trim().min(1),
  rfid_uid: z.string().trim().max(32).optional().nullable(),
})

const applyAssignmentsSchema = z.object({
  assignments: z.array(assignmentSchema).min(1),
})

type ImportedWorker = z.infer<typeof importedWorkerSchema>

type RpcCompanyStats = {
  sigla: string
  entrantes: number
  salientes: number
  asignados_tj1: number
  asignados_tj2: number
}

export type ProcessTurnoInput = z.infer<typeof processTurnoSchema>
export type ProcessTurnoResult = {
  ok: boolean
  message: string
  totalRows: number
  registeredRows: number
  processedCompanies: string[]
  unknownCompanies: string[]
  rpcSummaryText: string
  rpcByCompany: RpcCompanyStats[]
  validationErrors: number
  errors: string[]
}

export type ApplyAssignmentsInput = z.infer<typeof applyAssignmentsSchema>
export type ApplyAssignmentsResult = {
  ok: boolean
  message: string
  appliedCount: number
  failedCount: number
  errors: string[]
}

const updateOperarioSchema = z.object({
  operario_id: z.string().uuid(),
  nombre_completo: z.string().trim().min(3),
  documento_identidad: z.string().trim().min(4),
  cargo: z.string().trim().min(2),
  empresa_id: z.string().uuid(),
  rfid_uid: z.string().trim().max(32).optional().nullable(),
  habitacion_id: z.string().trim().optional().nullable(),
  dias_turno: z.string().trim().optional().nullable(),
  fecha_ingreso_turno: z.string().trim().optional().nullable(),
  fecha_salida_turno: z.string().trim().optional().nullable(),
  genero: z.string().trim().optional().nullable(),
  tipo_cargo: z.string().trim().optional().nullable(),
})

const deleteOperarioSchema = z.object({
  operario_id: z.string().uuid(),
})

export type UpdateOperarioInput = z.infer<typeof updateOperarioSchema>
export type DeleteOperarioInput = z.infer<typeof deleteOperarioSchema>

export type PersonalCrudResult = {
  ok: boolean
  message: string
  errors: string[]
}

function normalizeCompanyKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function toRpcOperario(worker: ImportedWorker) {
  return {
    nombre_completo: worker.nombre_completo,
    documento_identidad: worker.documento_identidad,
    cargo: worker.cargo,
    rfid_uid: worker.rfid_uid && worker.rfid_uid.length > 0 ? worker.rfid_uid : null,
  }
}

function parseDiasTurno(diasTurno: string | null | undefined): number {
  if (!diasTurno) return 14 // default
  const parts = diasTurno.split('/')
  const days = parseInt(parts[0], 10)
  return Number.isFinite(days) && days > 0 ? days : 14
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

async function syncRoomStates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomIds: string[]
) {
  if (roomIds.length === 0) {
    return
  }

  const uniqueIds = Array.from(new Set(roomIds))

  const { data: activeWorkers, error: workersError } = await supabase
    .from('operarios')
    .select('habitacion_id')
    .eq('activo', true)
    .in('habitacion_id', uniqueIds)

  if (workersError) {
    throw new Error(workersError.message)
  }

  const occupiedRooms = new Set(
    (activeWorkers || [])
      .map((worker) => worker.habitacion_id)
      .filter((roomId): roomId is string => Boolean(roomId))
  )

  for (const roomId of uniqueIds) {
    const nextState = occupiedRooms.has(roomId) ? 'Ocupada' : 'Disponible'

    const { error: roomError } = await supabase
      .from('habitaciones')
      .update({
        estado: nextState,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq('id', roomId)

    if (roomError) {
      throw new Error(roomError.message)
    }
  }
}

function assignByPreferredBlocks(
  companyCounts: Array<{ sigla: string; entrantes: number; salientes: number }>,
  availableTj1Seats: number,
  availableTj2Seats: number
) {
  let tj1Seats = availableTj1Seats
  let tj2Seats = availableTj2Seats

  return companyCounts.map((company) => {
    const preferredBlock = company.sigla === 'INMEL' ? 'TJ2' : 'TJ1'

    let tj1 = 0
    let tj2 = 0

    if (preferredBlock === 'TJ1') {
      tj1 = Math.min(company.entrantes, tj1Seats)
      tj1Seats -= tj1

      const overflow = company.entrantes - tj1
      if (overflow > 0) {
        tj2 = Math.min(overflow, tj2Seats)
        tj2Seats -= tj2
      }
    } else {
      tj2 = Math.min(company.entrantes, tj2Seats)
      tj2Seats -= tj2

      const overflow = company.entrantes - tj2
      if (overflow > 0) {
        tj1 = Math.min(overflow, tj1Seats)
        tj1Seats -= tj1
      }
    }

    return {
      sigla: company.sigla,
      entrantes: company.entrantes,
      salientes: company.salientes,
      asignados_tj1: tj1,
      asignados_tj2: tj2,
    }
  })
}

export async function procesarCambioTurnoAction(
  rawInput: ProcessTurnoInput
): Promise<ProcessTurnoResult> {
  const parsed = processTurnoSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Archivo invalido. Revisa columnas y formato.',
      totalRows: 0,
      registeredRows: 0,
      processedCompanies: [],
      unknownCompanies: [],
      rpcSummaryText: `0 operarios procesados: Revisa columnas y formato del Excel. ${parsed.error.issues.length} errores de validación.`,
      rpcByCompany: [],
      validationErrors: parsed.error.issues.length,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion de nuevo.',
      totalRows: parsed.data.workers.length,
      registeredRows: 0,
      processedCompanies: [],
      unknownCompanies: [],
      rpcSummaryText: '0 operarios procesados: 0 de MASA asignados a TJ1, 0 de INMEL asignados a TJ2. 1 errores de validación',
      rpcByCompany: [],
      validationErrors: 1,
      errors: [userError?.message || 'Usuario no autenticado.'],
    }
  }

  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, sigla, nombre_completo, activa')
    .eq('activa', true)

  if (empresasError || !empresas) {
    return {
      ok: false,
      message: 'No fue posible cargar empresas activas.',
      totalRows: parsed.data.workers.length,
      registeredRows: 0,
      processedCompanies: [],
      unknownCompanies: [],
      rpcSummaryText: '0 operarios procesados: 0 de MASA asignados a TJ1, 0 de INMEL asignados a TJ2. 1 errores de validación',
      rpcByCompany: [],
      validationErrors: 1,
      errors: [empresasError?.message || 'Sin empresas activas.'],
    }
  }

  const companyMap = new Map<
    string,
    { id: string; sigla: string; nombre_completo: string }
  >()

  for (const company of empresas) {
    companyMap.set(normalizeCompanyKey(company.sigla), {
      id: company.id,
      sigla: company.sigla,
      nombre_completo: company.nombre_completo,
    })

    companyMap.set(normalizeCompanyKey(company.nombre_completo), {
      id: company.id,
      sigla: company.sigla,
      nombre_completo: company.nombre_completo,
    })
  }

  const groupedWorkers = new Map<string, ImportedWorker[]>()

  for (const worker of parsed.data.workers) {
    const key = normalizeCompanyKey(worker.empresa)
    const current = groupedWorkers.get(key) || []
    current.push(worker)
    groupedWorkers.set(key, current)
  }

  const unknownCompanies: string[] = []
  const processedCompanies: string[] = []
  const errors: string[] = []
  const rpcByCompanyRaw: Array<{ sigla: string; entrantes: number; salientes: number }> = []
  let registeredRows = 0

  for (const [companyKey, workers] of groupedWorkers.entries()) {
    const company = companyMap.get(companyKey)

    if (!company) {
      unknownCompanies.push(workers[0]?.empresa || companyKey)
      continue
    }

    const payload = workers.map(toRpcOperario)

    const { data: rpcData, error: rpcError } = await supabase.rpc('procesar_cambio_turno', {
      p_empresa_id: company.id,
      p_operarios_entrantes: payload as Json,
      p_procesado_por: user.id,
    })

    if (rpcError) {
      errors.push(`Empresa ${company.sigla}: ${rpcError.message}`)
      continue
    }

    processedCompanies.push(company.sigla)

    const entrantes = toNumber((rpcData as Record<string, unknown> | null)?.entrantes)
    const salientes = toNumber((rpcData as Record<string, unknown> | null)?.salientes)

    registeredRows += entrantes
    rpcByCompanyRaw.push({
      sigla: company.sigla,
      entrantes,
      salientes,
    })

    // Generate daily credits for each incoming worker
    // Update genero/tipo_cargo/dias_turno on the newly created/activated operarios
    for (const worker of workers) {
      const diasNum = parseDiasTurno(worker.dias_turno)
      
      // Buscar operario (ya sea que el RPC lo haya activado o que estuviera inactivo)
      const { data: matchedOp } = await supabase
        .from('operarios')
        .select('id, activo')
        .eq('documento_identidad', worker.documento_identidad)
        .maybeSingle()

      if (matchedOp) {
        // Asegurar que quede activo y con los campos correctos
        const { error: updateError } = await supabase.from('operarios').update({
          genero: worker.genero || 'M',
          tipo_cargo: (worker.tipo_cargo || 'operativo').toLowerCase(),
          dias_turno: worker.dias_turno || null,
          activo: true, // Forzar activo por si el RPC no lo hizo
          fecha_ingreso_turno: new Date().toISOString(),
          fecha_salida_turno: null,
          empresa_id: company.id
        }).eq('id', matchedOp.id)

        if (updateError) {
          errors.push(`Error actualizando datos de ${worker.nombre_completo}: ${updateError.message}`)
          continue
        }

        // Generate credits via RPC
        await supabase.rpc('generar_creditos_checkin', {
          p_operario_id: matchedOp.id,
          p_dias: diasNum,
        })
      } else {
        errors.push(`No se pudo encontrar el operario ${worker.nombre_completo} tras el RPC para completar su registro.`)
      }
    }
  }

  const { data: roomsForPreview, error: roomsPreviewError } = await supabase
    .from('habitaciones')
    .select('id, bloque_id, capacidad, estado')

  const { data: activeWorkersByRoom, error: workersPreviewError } = await supabase
    .from('operarios')
    .select('habitacion_id')
    .eq('activo', true)
    .not('habitacion_id', 'is', null)

  if (roomsPreviewError) {
    errors.push(`Preview habitaciones: ${roomsPreviewError.message}`)
  }

  if (workersPreviewError) {
    errors.push(`Preview ocupacion: ${workersPreviewError.message}`)
  }

  const occupancyMap = (activeWorkersByRoom || []).reduce<Record<string, number>>(
    (acc, row) => {
      if (!row.habitacion_id) {
        return acc
      }

      acc[row.habitacion_id] = (acc[row.habitacion_id] ?? 0) + 1
      return acc
    },
    {}
  )

  const availableSeats = (roomsForPreview || []).reduce(
    (acc, room) => {
      if (room.estado !== 'Disponible') {
        return acc
      }

      const occupied = occupancyMap[room.id] ?? 0
      const free = Math.max(room.capacidad - occupied, 0)

      if (room.bloque_id === 'BLQ-TJ1') {
        acc.tj1 += free
      } else if (room.bloque_id === 'BLQ-TJ2') {
        acc.tj2 += free
      }

      return acc
    },
    { tj1: 0, tj2: 0 }
  )

  const rpcByCompany = assignByPreferredBlocks(
    rpcByCompanyRaw,
    availableSeats.tj1,
    availableSeats.tj2
  )

  const masaTj1 = rpcByCompany.find((entry) => entry.sigla === 'MASA')?.asignados_tj1 ?? 0
  const inmelTj2 = rpcByCompany.find((entry) => entry.sigla === 'INMEL')?.asignados_tj2 ?? 0
  const validationErrors = errors.length + unknownCompanies.length

  const rpcSummaryText = `${registeredRows} operarios procesados: ${masaTj1} de MASA asignados a TJ1, ${inmelTj2} de INMEL asignados a TJ2. ${validationErrors} errores de validación`
  
  // Sync room states after mass import
  if (roomsForPreview && roomsForPreview.length > 0) {
    try {
      await syncRoomStates(supabase, roomsForPreview.map(r => r.id))
    } catch (e) {
      console.error('Error syncing rooms after import:', e)
    }
  }
  
  revalidatePath('/personal')
  revalidatePath('/habitaciones')

  if (processedCompanies.length === 0) {
    return {
      ok: false,
      message: 'No se pudo procesar ninguna empresa del archivo.',
      totalRows: parsed.data.workers.length,
      registeredRows,
      processedCompanies,
      unknownCompanies,
      rpcSummaryText,
      rpcByCompany,
      validationErrors,
      errors,
    }
  }

  const message = `Importacion completada: ${registeredRows} operarios procesados en ${processedCompanies.length} empresa(s).`

  return {
    ok: errors.length === 0,
    message,
    totalRows: parsed.data.workers.length,
    registeredRows,
    processedCompanies,
    unknownCompanies,
    rpcSummaryText,
    rpcByCompany,
    validationErrors,
    errors,
  }
}

export async function aplicarAsignacionesAction(
  rawInput: ApplyAssignmentsInput
): Promise<ApplyAssignmentsResult> {
  const parsed = applyAssignmentsSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Asignaciones invalidas.',
      appliedCount: 0,
      failedCount: 0,
      errors: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion de nuevo.',
      appliedCount: 0,
      failedCount: parsed.data.assignments.length,
      errors: [userError?.message || 'Usuario no autenticado.'],
    }
  }

  const errors: string[] = []
  const touchedRooms = new Set<string>()
  let appliedCount = 0

  // Validate capacities beforehand
  const roomIdsToAssign = Array.from(new Set(parsed.data.assignments.map(a => a.habitacion_id)))
  const { data: roomsInfo } = await supabase.from('habitaciones').select('id, capacidad').in('id', roomIdsToAssign)
  const { data: currentOcupants } = await supabase.from('operarios').select('habitacion_id').in('habitacion_id', roomIdsToAssign).eq('activo', true)
  
  const roomCapacities = new Map(roomsInfo?.map(r => [r.id, r.capacidad]) || [])
  const roomOccupancy = new Map<string, number>()
  for (const opt of currentOcupants || []) {
    if (opt.habitacion_id) {
      roomOccupancy.set(opt.habitacion_id, (roomOccupancy.get(opt.habitacion_id) || 0) + 1)
    }
  }

  // Pre-calculate new additions per room to prevent overselling inside this batch
  const additionsPerRoom = new Map<string, number>()
  for (const assignment of parsed.data.assignments) {
    // Check if the user is already in this room to avoid double counting them
    const { data: isAlreadyThere } = await supabase.from('operarios').select('habitacion_id').eq('id', assignment.operario_id).single()
    if (isAlreadyThere?.habitacion_id !== assignment.habitacion_id) {
        additionsPerRoom.set(assignment.habitacion_id, (additionsPerRoom.get(assignment.habitacion_id) || 0) + 1)
    }
  }

  // Validate all before inserting
  for (const [roomId, incomingCount] of additionsPerRoom.entries()) {
      const cap = roomCapacities.get(roomId) || 0
      const current = roomOccupancy.get(roomId) || 0
      if (current + incomingCount > cap) {
          return {
              ok: false,
              message: `Asignaciones rechazadas: La habitacion ${roomId} excede su limite (Capacidad: ${cap}, Actual: ${current}, entrantes: ${incomingCount}).`,
              appliedCount: 0,
              failedCount: parsed.data.assignments.length,
              errors: ['Sobreocupación detectada'],
          }
      }
  }

  for (const assignment of parsed.data.assignments) {
    const updatePayload: {
      habitacion_id: string
      rfid_uid?: string | null
    } = {
      habitacion_id: assignment.habitacion_id,
    }

    if (assignment.rfid_uid !== undefined) {
      updatePayload.rfid_uid = assignment.rfid_uid || null
    }

    const { error: updateError } = await supabase
      .from('operarios')
      .update(updatePayload)
      .eq('id', assignment.operario_id)
      .eq('activo', true)

    if (updateError) {
      errors.push(`Operario ${assignment.operario_id}: ${updateError.message}`)
      continue
    }

    touchedRooms.add(assignment.habitacion_id)
    appliedCount += 1
  }

  if (touchedRooms.size > 0) {
    const roomIds = Array.from(touchedRooms)

    const { error: roomsError } = await supabase
      .from('habitaciones')
      .update({
        estado: 'Ocupada',
        ultima_actualizacion: new Date().toISOString(),
      })
      .in('id', roomIds)

    if (roomsError) {
      errors.push(`Habitaciones: ${roomsError.message}`)
    }
  }

  revalidatePath('/personal')
  revalidatePath('/habitaciones')

  const failedCount = parsed.data.assignments.length - appliedCount
  const message = `Asignaciones aplicadas: ${appliedCount}. Fallidas: ${failedCount}.`

  return {
    ok: errors.length === 0,
    message,
    appliedCount,
    failedCount,
    errors,
  }
}

export async function actualizarOperarioAction(
  rawInput: UpdateOperarioInput
): Promise<PersonalCrudResult> {
  const parsed = updateOperarioSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Datos invalidos para actualizar operario.',
      errors: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion nuevamente.',
      errors: [userError?.message || 'Usuario no autenticado.'],
    }
  }

  const { data: existingWorker, error: existingError } = await supabase
    .from('operarios')
    .select('id, habitacion_id')
    .eq('id', parsed.data.operario_id)
    .single()

  if (existingError || !existingWorker) {
    return {
      ok: false,
      message: 'No fue posible encontrar el operario a editar.',
      errors: [existingError?.message || 'Operario no encontrado.'],
    }
  }

  const nextRoom = parsed.data.habitacion_id?.trim() || null

  if (nextRoom && nextRoom !== existingWorker.habitacion_id) {
    const [{ data: roomData }, { count }] = await Promise.all([
      supabase.from('habitaciones').select('capacidad').eq('id', nextRoom).single(),
      supabase.from('operarios').select('id', { count: 'exact', head: true }).eq('habitacion_id', nextRoom).eq('activo', true)
    ])
    
    if (!roomData) return { ok: false, message: 'Habitación inexistente', errors: [] }
    if ((count ?? 0) >= roomData.capacidad) {
      return { 
        ok: false, 
        message: `La habitación ${nextRoom} ya ha alcanzado su capacidad máxima (${roomData.capacidad})`, 
        errors:[] 
      }
    }
  }

  const { error: updateError } = await supabase
    .from('operarios')
    .update({
      nombre_completo: parsed.data.nombre_completo,
      documento_identidad: parsed.data.documento_identidad,
      cargo: parsed.data.cargo,
      empresa_id: parsed.data.empresa_id,
      rfid_uid: parsed.data.rfid_uid?.trim() || null,
      habitacion_id: nextRoom,
      dias_turno: parsed.data.dias_turno || null,
      fecha_ingreso_turno: parsed.data.fecha_ingreso_turno || null,
      fecha_salida_turno: parsed.data.fecha_salida_turno || null,
      genero: parsed.data.genero || 'M',
      tipo_cargo: parsed.data.tipo_cargo || 'operativo',
    })
    .eq('id', parsed.data.operario_id)
    .eq('activo', true)

  if (updateError) {
    return {
      ok: false,
      message: 'No fue posible actualizar el operario.',
      errors: [updateError.message],
    }
  }

  const touchedRooms = [existingWorker.habitacion_id, nextRoom].filter(
    (roomId): roomId is string => Boolean(roomId)
  )

  try {
    await syncRoomStates(supabase, touchedRooms)
  } catch (syncError) {
    return {
      ok: false,
      message: 'Operario actualizado, pero fallo sincronizando estados de habitaciones.',
      errors: [syncError instanceof Error ? syncError.message : 'Error desconocido de sincronizacion.'],
    }
  }

  revalidatePath('/personal')
  revalidatePath('/habitaciones')

  return {
    ok: true,
    message: 'Operario actualizado correctamente.',
    errors: [],
  }
}

export async function intercambiarHabitacionesAction(
  params: { id1: string; id2: string }
): Promise<PersonalCrudResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      message: 'Sesion expirada.',
      errors: [userError?.message || 'Usuario no autenticado.'],
    }
  }

  // Get both operators
  const { data: op1 } = await supabase.from('operarios').select('id, habitacion_id').eq('id', params.id1).single()
  const { data: op2 } = await supabase.from('operarios').select('id, habitacion_id').eq('id', params.id2).single()

  if (!op1 || !op2) {
    return { ok: false, message: 'Operadores no encontrados', errors: [] }
  }

  const hab1 = op1.habitacion_id
  const hab2 = op2.habitacion_id

  if (hab1 === hab2) {
    return { ok: false, message: 'Ambos operarios están en la misma situación, no hay nada que intercambiar.', errors: [] }
  }

  // Swap
  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from('operarios').update({ habitacion_id: hab2 }).eq('id', op1.id),
    supabase.from('operarios').update({ habitacion_id: hab1 }).eq('id', op2.id)
  ])

  if (err1 || err2) {
    return { ok: false, message: 'Error al actualizar habitaciones', errors: [err1?.message || '', err2?.message || ''] }
  }

  const touchedRooms = [hab1, hab2].filter((r): r is string => Boolean(r))
  if (touchedRooms.length > 0) {
    try {
      await syncRoomStates(supabase, touchedRooms)
    } catch (e) {
      console.error(e)
    }
  }

  revalidatePath('/personal')
  revalidatePath('/habitaciones')

  return {
    ok: true,
    message: 'Habitaciones intercambiadas correctamente.',
    errors: [],
  }
}

export async function eliminarOperarioAction(
  rawInput: DeleteOperarioInput
): Promise<PersonalCrudResult> {
  const parsed = deleteOperarioSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Solicitud invalida para eliminar operario.',
      errors: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      message: 'Sesion expirada. Inicia sesion nuevamente.',
      errors: [userError?.message || 'Usuario no autenticado.'],
    }
  }

  const { data: existingWorker, error: existingError } = await supabase
    .from('operarios')
    .select('id, habitacion_id')
    .eq('id', parsed.data.operario_id)
    .single()

  if (existingError || !existingWorker) {
    return {
      ok: false,
      message: 'No fue posible encontrar el operario a eliminar.',
      errors: [existingError?.message || 'Operario no encontrado.'],
    }
  }

  const { error: deleteError } = await supabase
    .from('operarios')
    .update({
      activo: false,
      fecha_salida_turno: new Date().toISOString(),
    })
    .eq('id', parsed.data.operario_id)

  if (deleteError) {
    return {
      ok: false,
      message: 'No fue posible eliminar (desactivar) el operario.',
      errors: [deleteError.message],
    }
  }

  try {
    await syncRoomStates(supabase, existingWorker.habitacion_id ? [existingWorker.habitacion_id] : [])
  } catch (syncError) {
    return {
      ok: false,
      message: 'Operario eliminado, pero fallo sincronizando habitacion.',
      errors: [syncError instanceof Error ? syncError.message : 'Error desconocido de sincronizacion.'],
    }
  }

  revalidatePath('/personal')
  revalidatePath('/habitaciones')

  return {
    ok: true,
    message: 'Operario eliminado correctamente (baja logica).',
    errors: [],
  }
}

/* ─── Manual operator creation ─── */
const crearOperarioManualSchema = z.object({
  nombre_completo: z.string().trim().min(3, 'Nombre muy corto'),
  documento_identidad: z.string().trim().min(4, 'Documento inválido'),
  empresa_id: z.string().uuid('Empresa inválida'),
  cargo: z.string().trim().min(2, 'Cargo requerido'),
  genero: z.enum(['M', 'F']),
  tipo_cargo: z.enum(['operativo', 'administrativo']),
  dias_turno: z.string().trim().optional().nullable(),
  rfid_uid: z.string().trim().max(32).optional().nullable(),
})

export type CrearOperarioManualInput = z.infer<typeof crearOperarioManualSchema>

export async function crearOperarioManualAction(
  rawInput: CrearOperarioManualInput
): Promise<PersonalCrudResult> {
  const parsed = crearOperarioManualSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Datos inválidos.',
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, message: 'Sesión expirada.', errors: [] }
  }

  // Check if document already exists as active
  const { data: existing } = await supabase
    .from('operarios')
    .select('id, activo')
    .eq('documento_identidad', parsed.data.documento_identidad)
    .single()

  if (existing?.activo) {
    return { ok: false, message: 'Ya existe un operario activo con ese documento.', errors: [] }
  }

  if (existing && !existing.activo) {
    // Re-activate
    const { error } = await supabase.from('operarios').update({
      nombre_completo: parsed.data.nombre_completo,
      empresa_id: parsed.data.empresa_id,
      cargo: parsed.data.cargo,
      genero: parsed.data.genero,
      tipo_cargo: parsed.data.tipo_cargo,
      dias_turno: parsed.data.dias_turno || null,
      rfid_uid: parsed.data.rfid_uid || null,
      activo: true,
      fecha_ingreso_turno: new Date().toISOString(),
      fecha_salida_turno: null,
      habitacion_id: null,
    }).eq('id', existing.id)

    if (error) return { ok: false, message: error.message, errors: [] }

    // Generate credits
    const dias = parseDiasTurno(parsed.data.dias_turno)
    await supabase.rpc('generar_creditos_checkin', {
      p_operario_id: existing.id,
      p_dias: dias,
    })

    revalidatePath('/personal')
    return { ok: true, message: 'Operario reactivado exitosamente.', errors: [] }
  }

  // Insert new
  const { data: newOp, error: insertError } = await supabase.from('operarios').insert({
    nombre_completo: parsed.data.nombre_completo,
    documento_identidad: parsed.data.documento_identidad,
    empresa_id: parsed.data.empresa_id,
    cargo: parsed.data.cargo,
    genero: parsed.data.genero,
    tipo_cargo: parsed.data.tipo_cargo,
    dias_turno: parsed.data.dias_turno || null,
    rfid_uid: parsed.data.rfid_uid || null,
    activo: true,
    fecha_ingreso_turno: new Date().toISOString(),
  }).select('id').single()

  if (insertError || !newOp) {
    return { ok: false, message: insertError?.message || 'Error insertando.', errors: [] }
  }

  // Generate credits
  const dias = parseDiasTurno(parsed.data.dias_turno)
  await supabase.rpc('generar_creditos_checkin', {
    p_operario_id: newOp.id,
    p_dias: dias,
  })

  revalidatePath('/personal')
  return { ok: true, message: 'Operario registrado exitosamente.', errors: [] }
}