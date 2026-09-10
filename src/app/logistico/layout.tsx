import { LogisticoTopbar } from '@/components/layout/logistico-topbar'
import { RFIDGlobalProvider } from '@/components/hotel/rfid-global-provider'

export default function LogisticoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="flex min-w-0 flex-1 flex-col">
        <LogisticoTopbar />
        <main className="flex-1 overflow-y-auto bg-background px-6 py-6 md:px-8 md:py-8">
          <RFIDGlobalProvider>
            {children}
          </RFIDGlobalProvider>
        </main>
      </div>
    </div>
  )
}
