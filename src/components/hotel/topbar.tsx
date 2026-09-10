'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, LogOut, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/(auth)/actions'
import { useHotelStore } from '@/lib/store'
import { ServiceSelector } from './service-selector'

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [sessionInfo, setSessionInfo] = useState<{ nombre: string; rol: string } | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notificaciones, setNotificaciones] = useState<any[]>([])

  const { servicioActivo } = useHotelStore()

  // Active clock state
  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('perfiles')
          .select('nombre_completo, rol')
          .eq('id', user.id)
          .single()

        if (profile) setSessionInfo({ nombre: profile.nombre_completo, rol: profile.rol })
      }
    }
    loadData()
  }, [])


  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard'
    if (pathname.startsWith('/habitaciones')) return 'Plano de Habitaciones'
    if (pathname.startsWith('/personal')) return 'Gestión de Personal'
    if (pathname.startsWith('/servicios')) return 'Servicios'
    if (pathname.startsWith('/consolidado')) return 'Consolidado General'
    if (pathname.startsWith('/empresas')) return 'Empresas Contratistas'
    if (pathname.startsWith('/lavanderia')) return 'Lavandería'
    return 'Hotel Tajamonae'
  }, [pathname])

  const initials = sessionInfo?.nombre
    ? sessionInfo.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <header className="sticky top-0 z-20 bg-surface px-6 py-4 text-foreground shadow-sm border-b border-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          {/* RFID Service Selector */}
          <ServiceSelector />

          <div className="relative hidden max-w-md flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Presiona Enter para buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  router.push(`/personal`)
                  setSearchTerm('')
                }
              }}
              className="h-10 w-full rounded-lg bg-surface-low pl-10 pr-4 text-sm text-foreground outline-none border border-transparent focus:border-primary focus:bg-background transition-all"
            />
          </div>

          <div className="min-w-0 flex flex-col items-end w-full lg:w-auto ml-auto">
            <p className="truncate text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {pageTitle}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5 min-h-[1rem]">
              {mounted && (
                <>
                  {time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })} — {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-low hover:text-primary focus:outline-none"
            >
              <Bell className="h-5 w-5" />
              {notificaciones.some((n: any) => !n.leido) ? (
                 <span className="absolute top-1 right-1 flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                 </span>
              ) : (
                 <span className="absolute top-1 right-1 inline-flex rounded-full h-2 w-2 bg-[#10b981] border border-surface"></span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-surface shadow-lg ring-1 ring-border focus:outline-none z-50 flex flex-col max-h-[400px]"
                onMouseLeave={() => setNotificationsOpen(false)}
              >
                <div className="p-3 border-b border-border flex justify-between items-center bg-surface-low rounded-t-xl">
                   <h4 className="text-xs font-black uppercase tracking-widest">Notificaciones</h4>
                   <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                     <Bell className="h-3 w-3" /> {notificaciones.length}
                   </span>
                </div>
                
                <div className="overflow-auto flex-1 p-2 space-y-1">
                   {notificaciones.length === 0 ? (
                      <div className="p-4 text-center">
                        <div className="mx-auto h-10 w-10 rounded-full bg-surface-low flex items-center justify-center mb-2">
                          <Bell className="h-5 w-5 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-xs font-bold text-foreground">Bandeja al día</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">No hay notificaciones</p>
                      </div>
                   ) : notificaciones.map((n: any) => (
                      <div key={n.id} className={`p-3 rounded-lg border text-left ${n.leido ? 'bg-background border-border opacity-70' : 'bg-primary/5 border-primary/20 shadow-sm'}`}>
                         <p className="text-xs font-bold leading-tight">{n.titulo}</p>
                         <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{n.mensaje}</p>
                         <p className="text-[8px] font-mono text-muted-foreground mt-2">{new Date(n.creado_en).toLocaleString()}</p>
                      </div>
                   ))}
                </div>
              </div>
            )}
          </div>

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
                  <p className="text-sm font-semibold text-foreground truncate">{sessionInfo?.nombre || 'Administrador'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                    {sessionInfo?.rol || 'Admin'}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface-low hover:text-primary transition-colors"
                  >
                    <UserIcon className="h-4 w-4" />
                    Mi Perfil
                  </Link>
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
