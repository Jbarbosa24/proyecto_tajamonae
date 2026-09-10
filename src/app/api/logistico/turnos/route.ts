import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    
    // Usamos admin para bypass RLS al crear el turno en colas pendientes
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('importaciones_turno').insert({
      empresa_id: body.empresa_id,
      archivo_nombre: body.archivo_nombre,
      operarios_entrantes: body.operarios_entrantes,
      operarios_salientes: body.operarios_salientes
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
