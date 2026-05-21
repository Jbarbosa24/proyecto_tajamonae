"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BedDouble,
  Building2,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Settings,
  ShirtIcon,
  Users,
  Utensils,
  AlertTriangle,
  CalendarClock,
  UserRoundPlus
} from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import { cn } from '@/lib/utils'

const menuItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/habitaciones', icon: BedDouble,        label: 'Habitaciones' },
  { href: '/personal',     icon: Users,            label: 'Personal' },
  { href: '/servicios',    icon: Utensils,         label: 'Servicios' },
  { href: '/auditoria',    icon: AlertTriangle,    label: 'Auditoría' },
  { href: '/consolidado',  icon: FileBarChart2,    label: 'Consolidado' },
  { href: '/empresas',     icon: Building2,        label: 'Empresas' },
  { href: '/registro',     icon: UserRoundPlus,    label: 'Registro Usuarios' },
]

export function Sidebar({ pendingTurnosCount = 0 }: { pendingTurnosCount?: number }) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden w-[232px] shrink-0 md:flex md:flex-col border-r border-border bg-surface"
      style={{ minHeight: '100vh' }}
    >
      {/* Brand */}
      <div className="px-5 py-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-low flex items-center justify-center shrink-0">
            <Image
              src="/logo-nuevo.png"
              alt="Hotel Tajamonae"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-bold text-foreground leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              HOTEL TAJAMONAE
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Admin Portal
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-surface-low hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
              />
              <div className="flex-1 flex items-center justify-between">
                <span>{item.label}</span>
                {item.href === '/personal' && pendingTurnosCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                    {pendingTurnosCount}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-border p-3 flex flex-col gap-1">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}