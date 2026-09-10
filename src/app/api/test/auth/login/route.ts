import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
    }

    // Asegurar que el perfil exista en la base de datos
    const { data: profileRow } = await supabase
      .from('perfiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profileRow?.id) {
      const profileRole = data.user.user_metadata?.rol || 'aseadora'
      const profileName = data.user.user_metadata?.nombre_completo || email.split('@')[0]
      
      await supabase.from('perfiles').insert({
        id: data.user.id,
        nombre_completo: profileName,
        rol: profileRole,
        activo: true,
      })
    }

    return NextResponse.json({ ok: true, user: data.user })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
