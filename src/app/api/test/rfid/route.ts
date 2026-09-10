import { NextRequest, NextResponse } from 'next/server'
import { registrarServicioRFIDGlobal, TipoServicio } from '@/app/(admin)/rfid-global-actions'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid, tipoServicio } = body
    if (!uid || !tipoServicio) {
      return NextResponse.json({ ok: false, message: 'Falta uid o tipoServicio' }, { status: 400 })
    }
    const result = await registrarServicioRFIDGlobal(uid, tipoServicio as TipoServicio)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  }
}
