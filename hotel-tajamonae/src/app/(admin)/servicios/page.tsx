import Link from 'next/link'
import { ArrowRight, CircleCheck, IdCard, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ManualRegistro } from './manual-registro'
import { RFIDScanner } from './rfid-scanner'
import { getBogotaDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage() {
  const supabase = await createClient()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

  // Registros en vivo
  const { data: registros } = await supabase
    .from('servicios')
    .select('id, tipo, fecha, hora_registro, operarios(nombre_completo, empresas(sigla, nombre_completo))')
    .eq('fecha', today)
    .order('created_at', { ascending: false })
    .limit(30)

  // Agrupar por empresa
  const groupedRegistros: Record<string, { total: number; items: any[] }> = {}
  
  if (registros) {
    for (const r of registros) {
      const op = r.operarios as any
      if (!op) continue
      
      const empresaData = op.empresas
      const empNombre = empresaData?.nombre_completo || empresaData?.sigla || 'Otros'
      
      if (!groupedRegistros[empNombre]) {
        groupedRegistros[empNombre] = { total: 0, items: [] }
      }
      
      groupedRegistros[empNombre].total += 1
      groupedRegistros[empNombre].items.push({
        nombre: op.nombre_completo,
        hora: r.hora_registro ? r.hora_registro.slice(0, 5) : '',
        tipo: r.tipo,
        estado: 'REGISTRADO' 
      })
    }
  }

  const groupedArray = Object.entries(groupedRegistros).map(([empresa, data]) => ({
    empresa,
    ...data
  }))

  const hasRegistros = groupedArray.length > 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Servicios e Ingresos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Control de asistencia y asignación de alimentación en tiempo real.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-6 flex flex-col items-center">
              <div 
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg mb-4"
                style={{ background: 'rgba(0, 93, 106, 0.1)', color: '#005d6a' }}
              >
                <IdCard className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Control de Punto
              </h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estación de Lectura RFID</p>
            </div>

            <RFIDScanner />
          </article>

          <ManualRegistro />
        </section>

        <section className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Registros de Hoy
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1 text-success flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
              Sincronizado en tiempo real
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {hasRegistros ? (
              groupedArray.map((grupo) => (
                <div key={grupo.empresa} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <p className="font-semibold text-foreground text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {grupo.empresa}
                    </p>
                    <span className="rounded-full bg-surface-low px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                      {grupo.total} reg
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {grupo.items.map((item, idx) => (
                      <li key={idx} className="rounded-lg bg-surface-low p-3 border border-border">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-md bg-surface flex items-center justify-center border border-border shrink-0">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground text-sm truncate">{item.nombre}</p>
                              <span className="text-[10px] font-medium text-muted-foreground shrink-0">{item.hora}</span>
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{item.tipo}</p>
                            <p className="text-[10px] font-bold text-success mt-1">{item.estado}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border bg-surface-low">
                <p className="text-sm font-semibold text-muted-foreground">Sin registros hoy</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
