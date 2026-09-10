import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { titulo, mensaje } = await req.json()
    
    // Obtenemos info del logistico que manda el reporte
    const { data: profile } = await supabase.from('perfiles').select('nombre_completo, empresas(nombre_completo)').eq('id', user.id).single()

    const nombreLogistico = profile?.nombre_completo || 'Logístico'
    const nombreEmpresa = profile?.empresas?.nombre_completo || 'Empresa Desconocida'

    /* 
    const { error } = await supabase.from('notificaciones').insert({
      titulo: `${nombreEmpresa} : ${titulo}`,
      mensaje: `${nombreLogistico} dice: ${mensaje}`,
      rol_destino: 'admin',
      leido: false
    })

    if (error) {
       console.error("Error creating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    */

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
