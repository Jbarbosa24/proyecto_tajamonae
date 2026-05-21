'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LogOut, User as UserIcon, LayoutDashboard, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/(auth)/actions'
import { ServiceSelector } from '../hotel/service-selector'

export function LogisticoTopbar() {
  const [sessionInfo, setSessionInfo] = useState<{ nombre: string; rol: string, empresa: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()

  // Active clock state
  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('perfiles')
          .select('nombre_completo, rol')
          .eq('id', user.id)
          .single()

        let empresaName = 'Sin Empresa'
        if (user.user_metadata?.empresa_id) {
            const { data: emp } = await supabase
               .from('empresas')
               .select('nombre_completo')
               .eq('id', user.user_metadata.empresa_id)
               .single()
            if (emp) empresaName = emp.nombre_completo
        }

        if (profile) setSessionInfo({ nombre: profile.nombre_completo, rol: profile.rol, empresa: empresaName })
      }
    }
    loadUser()
  }, [])

  const initials = sessionInfo?.nombre
    ? sessionInfo.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'LO'

  return (
    <header className="sticky top-0 z-20 bg-surface px-6 py-4 text-foreground shadow-sm border-b border-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <ServiceSelector />

          <div className="min-w-0 flex flex-col w-full lg:w-auto">
            <p className="truncate text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Portal Logístico {sessionInfo?.empresa ? `- ${sessionInfo.empresa}` : ''}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5 min-h-[1rem]">
              {mounted && (
                <>
                  {time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })} — {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </p>
          </div>
          
          <nav className="hidden md:flex items-center gap-2 ml-4">
            <Link 
              href="/logistico/dashboard" 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/logistico/dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-low hover:text-foreground'}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link 
              href="/logistico/auditoria" 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/logistico/auditoria' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-low hover:text-foreground'}`}
            >
              <AlertTriangle className="h-4 w-4" /> Auditoría
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <div className="relative ml-2">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div
                className="grid h-10 w-10 place-content-center rounded-lg text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: '#005d6a' }}
              >
                {initials}
              </div>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-surface shadow-lg ring-1 ring-border focus:outline-none"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{sessionInfo?.nombre || 'Logístico'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                    {sessionInfo?.empresa || 'Cargando...'}
                  </p>
                </div>
                <div className="py-1">
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
