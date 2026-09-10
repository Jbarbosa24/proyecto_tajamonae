import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_ROLES = ['admin', 'aseadora', 'logistico'] as const

function resolveAllowedRole(value: unknown): (typeof ALLOWED_ROLES)[number] | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return ALLOWED_ROLES.includes(normalized as (typeof ALLOWED_ROLES)[number])
    ? (normalized as (typeof ALLOWED_ROLES)[number])
    : null
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentPath = request.nextUrl.pathname
  const isLegacyLaundryRoute = currentPath.startsWith('/lavanderia')
  const isAuthRoute = currentPath.startsWith('/login')
  const isProtectedAdminRoute =
    currentPath.startsWith('/dashboard') ||
    currentPath.startsWith('/personal') ||
    currentPath.startsWith('/habitaciones') ||
    currentPath.startsWith('/empresas') ||
    currentPath.startsWith('/servicios') ||
    currentPath.startsWith('/consolidado') ||
    currentPath.startsWith('/registro')
  const isProtectedAseadoraRoute = currentPath.startsWith('/camareria')
  const isProtectedLogisticoRoute = currentPath.startsWith('/logistico')

  const redirectTo = (pathname: string, searchParams = '') => {
    if (currentPath === pathname) {
      return supabaseResponse
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = pathname
    redirectUrl.search = searchParams ? `?${searchParams}` : ''

    const redirectResponse = NextResponse.redirect(redirectUrl)
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    }

    return redirectResponse
  }

  if (isLegacyLaundryRoute) {
    return redirectTo('/servicios', 'tab=lavanderia')
  }

  if (user) {
    // Fallback temporal a metadata para evitar bloqueos si el perfil aun no fue aprovisionado.
    const metadataRole =
      resolveAllowedRole(user.user_metadata?.rol) ||
      resolveAllowedRole(user.user_metadata?.role)

    let userRole: (typeof ALLOWED_ROLES)[number] | null = metadataRole

    // Solo consultar la DB si no tenemos el rol en metadata o si es una ruta crítica que requiere validación forzada.
    // Para el "/" o rutas de auth, el metadata suele ser suficiente para una transición rápida.
    const needsDatabaseCheck = !userRole && (isAuthRoute || currentPath === '/' || isProtectedAdminRoute || isProtectedAseadoraRoute || isProtectedLogisticoRoute)

    if (needsDatabaseCheck) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()

      const profileRole = resolveAllowedRole(perfil?.rol)
      if (profileRole) {
        userRole = profileRole
      } else if (metadataRole) {
        // ... (el resto de la lógica de aprovisionamiento se mantiene igual si el perfil no existe)
        const profileName =
          typeof user.user_metadata?.nombre_completo === 'string' && user.user_metadata.nombre_completo.trim().length > 0
            ? user.user_metadata.nombre_completo.trim()
            : (user.email || 'usuario@local').split('@')[0]

        const { data: provisionedProfile } = await supabase
          .from('perfiles')
          .upsert(
            {
              id: user.id,
              nombre_completo: profileName,
              rol: metadataRole,
              activo: true,
            },
            { onConflict: 'id' }
          )
          .select('rol')
          .maybeSingle()

        const provisionedRole = resolveAllowedRole(provisionedProfile?.rol)
        if (provisionedRole) {
          userRole = provisionedRole
        }
      }
    }

    if (isAuthRoute || currentPath === '/') {
      if (userRole === 'admin') {
        return redirectTo('/dashboard')
      }

      if (userRole === 'aseadora') {
        return redirectTo('/camareria')
      }

      if (userRole === 'logistico') {
        return redirectTo('/logistico/dashboard')
      }

      return redirectTo('/registro')
    }

    if (!userRole && (isProtectedAdminRoute || isProtectedAseadoraRoute || isProtectedLogisticoRoute)) {
      return redirectTo('/registro')
    }

    if (isProtectedAdminRoute && userRole !== 'admin') {
      if (userRole === 'aseadora') return redirectTo('/camareria')
      if (userRole === 'logistico') return redirectTo('/logistico/dashboard')
      return redirectTo('/registro')
    }

    if (isProtectedAseadoraRoute && userRole !== 'aseadora' && userRole !== 'admin') {
      if (userRole === 'logistico') return redirectTo('/logistico/dashboard')
      return redirectTo('/registro')
    }

    if (isProtectedLogisticoRoute && userRole !== 'logistico' && userRole !== 'admin') {
      if (userRole === 'aseadora') return redirectTo('/camareria')
      return redirectTo('/registro')
    }
  } else {
    // Redirigir a login si no está autenticado y trata de acceder a rutas protegidas o a root
    if (isProtectedAdminRoute || isProtectedAseadoraRoute || isProtectedLogisticoRoute || currentPath === '/') {
      return redirectTo('/login')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
