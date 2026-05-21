import { LogOut, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/(auth)/actions'

export default function AseadoraLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary/20">
      <div className="relative z-10 flex min-h-screen w-full flex-col max-w-[1400px] mx-auto bg-white shadow-xl shadow-slate-200/50">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-sm">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-heading text-slate-900 uppercase tracking-tight leading-none">Camarería</h1>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Operaciones en Campo
              </span>
            </div>
          </div>
          
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              className="h-10 border-slate-200 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2 shadow-sm transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Desconectar</span>
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 lg:p-8 pb-32">
          {children}
        </main>
      </div>
    </div>
  )
}
