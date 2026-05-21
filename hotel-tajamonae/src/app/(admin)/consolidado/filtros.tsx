'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { CalendarDays, Download } from 'lucide-react'
import { useRef } from 'react'

export function ConsolidadoFiltros({ defaultDesde, defaultHasta }: { defaultDesde: string, defaultHasta: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const inputDesdeRef = useRef<HTMLInputElement>(null)
  const inputHastaRef = useRef<HTMLInputElement>(null)

  const desde = searchParams.get('desde') || defaultDesde
  const hasta = searchParams.get('hasta') || defaultHasta

  const updateFilters = (newDesde: string, newHasta: string) => {
    const params = new URLSearchParams()
    if (newDesde) params.set('desde', newDesde)
    if (newHasta) params.set('hasta', newHasta)
    // Use pathname to stay on the same page (Auditoria or Consolidado)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <div 
        onClick={() => inputDesdeRef.current?.showPicker()}
        className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all cursor-pointer hover:bg-surface-low"
      >
        <span className="text-xs font-medium uppercase tracking-widest hidden sm:block pointer-events-none">Desde</span>
        <CalendarDays className="h-4 w-4 text-primary pointer-events-none" />
        <input 
          ref={inputDesdeRef}
          type="date" 
          value={desde} 
          onChange={(e) => {
            e.stopPropagation()
            updateFilters(e.target.value, hasta)
          }}
          className="text-xs font-semibold text-foreground bg-transparent outline-none ring-0 w-max cursor-pointer"
        />
      </div>
      
      <div 
        onClick={() => inputHastaRef.current?.showPicker()}
        className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all cursor-pointer hover:bg-surface-low"
      >
        <span className="text-xs font-medium uppercase tracking-widest hidden sm:block pointer-events-none">Hasta</span>
        <CalendarDays className="h-4 w-4 text-primary pointer-events-none" />
        <input 
          ref={inputHastaRef}
          type="date" 
          value={hasta} 
          onChange={(e) => {
            e.stopPropagation()
            updateFilters(desde, e.target.value)
          }}
          className="text-xs font-semibold text-foreground bg-transparent outline-none ring-0 w-max cursor-pointer"
        />
      </div>

      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
        style={{ background: '#005d6a' }}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:block">Exportar PDF</span>
      </button>
    </div>
  )
}
