'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const empresaSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  nombre_completo: z.string().trim().min(3),
  sigla: z.string().trim().min(2).toUpperCase(),
  nit: z.string().trim().min(5).optional().nullable(),
  contacto_nombre: z.string().trim().optional().nullable(),
  contacto_telefono: z.string().trim().optional().nullable(),
  contacto_email: z.string().email('Email inválido').or(z.string().trim().length(0)).optional().nullable(),
  color_hex: z.string().trim().startsWith('#').optional().default('#005d6a'),
  activa: z.boolean().default(true),
  tarifas_empresa: z.array(z.object({
    id: z.string().optional(),
    tipo_servicio: z.string(),
    valor_unitario: z.number(),
  })).optional()
})

export type EmpresaInput = z.infer<typeof empresaSchema>

export async function upsertEmpresaAction(input: EmpresaInput) {
  const parsed = empresaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Datos de empresa inválidos', errors: parsed.error.issues.map(i => i.message) }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'No autenticado' }

  const { id, ...data } = parsed.data
  const payload = {
    ...data,
    created_by: user.id
  }

  // Remove keys with null values for Insert/Update to satisfy TS and DB defaults
  Object.keys(payload).forEach(key => {
    if ((payload as any)[key] === null) {
      delete (payload as any)[key]
    }
  })

  const { tarifas_empresa } = parsed.data
  delete (payload as any).tarifas_empresa


  let error;
  let createdEmpresaId: string | null = null

  if (id) {
    const { error: updateError } = await supabase
      .from('empresas')
      .update(payload)
      .eq('id', id)
    error = updateError
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('empresas')
      .insert(payload)
      .select('id')
      .single()
    error = insertError
    createdEmpresaId = inserted?.id || null
  }

  if (error) {
    return { ok: false, message: `Error en base de datos: ${error.message}` }
  }

  // Upsert tarifas
  const targetEmpresaId = id || createdEmpresaId
  if (targetEmpresaId && tarifas_empresa !== undefined) {
    // Delete existing services
    await supabase.from('tarifas_empresa').delete().eq('empresa_id', targetEmpresaId)
    
    // Insert new services
    if (tarifas_empresa.length > 0) {
      const { error: insertTarifasError } = await supabase.from('tarifas_empresa').insert(
        tarifas_empresa.map(t => ({
          empresa_id: targetEmpresaId,
          tipo_servicio: t.tipo_servicio,
          valor_unitario: t.valor_unitario
        }))
      )
      if (insertTarifasError) {
        console.error('Error insertando tarifas:', insertTarifasError)
        return { ok: false, message: `Error guardando tarifas: ${insertTarifasError.message}` }
      }
    }
  } else if (createdEmpresaId) {
    // Seed default tariffs for new company if no explicit tarifas passed
    const TARIFAS_DEFAULT = [
      { tipo_servicio: 'Hospedaje', valor_unitario: 80000 },
      { tipo_servicio: 'Lavandería', valor_unitario: 13500 },
      { tipo_servicio: 'Desayuno', valor_unitario: 27000 },
      { tipo_servicio: 'Almuerzo', valor_unitario: 28500 },
      { tipo_servicio: 'Cena', valor_unitario: 27000 },
    ]

    await supabase.from('tarifas_empresa').insert(
      TARIFAS_DEFAULT.map(t => ({
        empresa_id: createdEmpresaId,
        tipo_servicio: t.tipo_servicio,
        valor_unitario: t.valor_unitario
      }))
    )
  }

  revalidatePath('/empresas')
  revalidatePath('/personal')
  revalidatePath('/consolidado')
  
  return { ok: true, message: id ? 'Empresa actualizada' : 'Empresa creada con tarifas predeterminadas' }
}

export async function toggleEmpresaStatusAction(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ activa: !currentStatus })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  
  revalidatePath('/empresas')
  return { ok: true }
}

/* ─── Tariff management ─── */
const tarifaSchema = z.object({
  empresa_id: z.string().uuid(),
  tipo_servicio: z.enum(['Desayuno', 'Almuerzo', 'Cena', 'Hospedaje', 'Lavandería']),
  valor_unitario: z.number().int().min(0),
})

export type TarifaInput = z.infer<typeof tarifaSchema>

export async function upsertTarifaAction(input: TarifaInput) {
  const parsed = tarifaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Datos de tarifa inválidos' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('tarifas_empresa')
    .upsert(
      {
        empresa_id: parsed.data.empresa_id,
        tipo_servicio: parsed.data.tipo_servicio,
        valor_unitario: parsed.data.valor_unitario,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id,tipo_servicio' }
    )

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath('/empresas')
  revalidatePath('/consolidado')
  return { ok: true, message: 'Tarifa actualizada' }
}

export async function getLogisticByEmpresaAction(empresaId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, rol, empresa_id')
      .eq('rol', 'logistico')
      .eq('empresa_id', empresaId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching logistic:', error)
      return { ok: true, data: null }
    }

    return { ok: true, data }
  } catch (e) {
    return { ok: true, data: null }
  }
}
