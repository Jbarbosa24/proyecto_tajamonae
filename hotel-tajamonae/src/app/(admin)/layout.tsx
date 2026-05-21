import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/hotel/topbar'
import { RFIDGlobalProvider } from '@/components/hotel/rfid-global-provider'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Fetch pending turnos count
  const { count: turnosPendientes } = await supabase
    .from('importaciones_turno')
    .select('*', { count: 'exact', head: true })
    .is('procesado_por', null)

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar pendingTurnosCount={turnosPendientes || 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background px-6 py-6 md:px-8 md:py-8">
          <RFIDGlobalProvider>
            {children}
          </RFIDGlobalProvider>
        </main>
      </div>
    </div>
  )
}
