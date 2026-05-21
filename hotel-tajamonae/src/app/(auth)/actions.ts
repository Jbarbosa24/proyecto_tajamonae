'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createServiceClient, type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

const ALLOWED_ROLES = ['admin', 'aseadora', 'logistico'] as const
const DEFAULT_ROLE_SLUG: (typeof ALLOWED_ROLES)[number] = 'aseadora'
type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type PerfilPayload = Database['public']['Tables']['perfiles']['Insert']

function resolveAllowedRole(value: unknown): (typeof ALLOWED_ROLES)[number] | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return ALLOWED_ROLES.includes(normalized as (typeof ALLOWED_ROLES)[number])
    ? (normalized as (typeof ALLOWED_ROLES)[number])
    : null
}

function resolveProfileName(user: User, fallbackEmail?: string) {
  const metadataName = typeof user.user_metadata?.nombre_completo === 'string' ? user.user_metadata.nombre_completo.trim() : ''

  if (metadataName.length > 0) {
    return metadataName
  }

  const emailCandidate = user.email || fallbackEmail || 'usuario@local'
  return emailCandidate.split('@')[0]
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Credenciales invalidas'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesion'
  }

  if (normalized.includes('password')) {
    return 'La contraseña no cumple los requisitos de seguridad'
  }

  if (normalized.includes('already registered')) {
    return 'Ese correo ya se encuentra registrado'
  }

  return 'No fue posible completar la solicitud de autenticacion'
}

function isDuplicateProfileError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('duplicate key') || normalized.includes('already exists')
}

async function provisionProfileWithServiceRole(payload: PerfilPayload) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return { ok: false, reason: 'service-role-missing' as const }
  }

  const adminClient = createServiceClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await adminClient.from('perfiles').upsert(payload, {
    onConflict: 'id',
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  return { ok: true, reason: null }
}

async function ensureProfileOnLogin({
  supabase,
  user,
  fallbackEmail,
}: {
  supabase: ServerSupabaseClient
  user: User
  fallbackEmail: string
}) {
  const profileRole =
    resolveAllowedRole(user.user_metadata?.rol) ||
    resolveAllowedRole(user.user_metadata?.role) ||
    DEFAULT_ROLE_SLUG

  const profilePayload: PerfilPayload = {
    id: user.id,
    nombre_completo: resolveProfileName(user, fallbackEmail),
    rol: profileRole,
    activo: true,
  }

  const { data: profileRow } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileRow?.id) {
    return
  }

  const { error: profileError } = await supabase.from('perfiles').insert(profilePayload)

  if (profileError && !isDuplicateProfileError(profileError.message)) {
    await provisionProfileWithServiceRole(profilePayload)
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Get email and password from FormData
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor ingrese correo y contraseña' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  if (data.user) {
    await ensureProfileOnLogin({
      supabase,
      user: data.user,
      fallbackEmail: email,
    })
  }

  // Se revalida el home page para que el middleware se actualize 
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const nombreCompleto = String(formData.get('nombre_completo') || '').trim()
  const rolInput = String(formData.get('rol') || '').trim()
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')
  const empresaId = formData.get('empresa_id') ? String(formData.get('empresa_id')) : null

  if (!nombreCompleto || !rolInput || !email || !password || !confirmPassword) {
    return { error: 'Todos los campos son obligatorios' }
  }

  if (rolInput === 'logistico' && !empresaId) {
    return { error: 'Debe seleccionar una empresa para el Logístico' }
  }

  if (password !== confirmPassword) {
    return { error: 'La confirmacion de contraseña no coincide' }
  }

  const rol = ALLOWED_ROLES.includes(rolInput as (typeof ALLOWED_ROLES)[number])
    ? (rolInput as (typeof ALLOWED_ROLES)[number])
    : DEFAULT_ROLE_SLUG

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre_completo: nombreCompleto,
        rol,
        rol_slug: rol,
        role: rol,
        ...(empresaId ? { empresa_id: empresaId } : {})
      },
    },
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  if (!data.user?.id) {
    return { error: 'No se pudo completar el registro. Intenta nuevamente.' }
  }

  const perfilPayload: PerfilPayload = {
    id: data.user.id,
    nombre_completo: nombreCompleto,
    rol,
    activo: true,
    ...(empresaId && rol === 'logistico' ? { empresa_id: empresaId } : {})
  }

  const { error: profileError } = await supabase.from('perfiles').insert(perfilPayload)

  if (profileError && !isDuplicateProfileError(profileError.message)) {
    const fallbackResult = await provisionProfileWithServiceRole(perfilPayload)

    if (!fallbackResult.ok) {
      console.error('Provisioning Profile Error:', fallbackResult.reason)
      return {
        warning:
          `Usuario creado en Auth, pero no fue posible aprovisionar perfil automaticamente. Detalles del error: ${fallbackResult.reason}`,
      }
    }
  }

  revalidatePath('/', 'layout')

  return {
    success:
      'Cuenta registrada y perfil aprovisionado. Si tu proyecto requiere confirmacion de correo, valida tu email antes de iniciar sesion.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

// Public action to fetch active empresas — used in registration page
// Uses the server supabase client which applies service-level access
export async function getActiveEmpresasPublicAction(): Promise<{
  ok: boolean
  data: { id: string; nombre_completo: string; sigla: string }[]
}> {
  try {
    // Use service-level supabase (by creating with the anon key; will respect RLS policies)
    // We intentionally use standard client but with a broader select to allow public read if RLS permits
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre_completo, sigla')
      .eq('activa', true)
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error fetching empresas (service role):', error)
      return { ok: false, data: [] }
    }

    return { ok: true, data: data || [] }
  } catch (e) {
    console.error('Unexpected error fetching empresas:', e)
    return { ok: false, data: [] }
  }
}
