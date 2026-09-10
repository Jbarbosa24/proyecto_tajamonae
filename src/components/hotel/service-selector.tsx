'use client'

import { useState } from 'react'
import { Radio, ChevronDown } from 'lucide-react'
import { useHotelStore } from '@/lib/store'

export const SERVICIOS_OPCIONES = [
  { value: 'Desayuno' as const, label: 'Desayuno', color: '#924b08' },
  { value: 'Almuerzo' as const, label: 'Almuerzo', color: '#b45309' },
  { value: 'Cena' as const, label: 'Cena', color: '#ba1a1a' },
  { value: 'Hospedaje' as const, label: 'Hospedaje', color: '#005d6a' },
  { value: 'Lavandería' as const, label: 'Lavandería', color: '#14b8a6' },
] as const

export function ServiceSelector() {
  const [servicioDropdownOpen, setServicioDropdownOpen] = useState(false)
  const { servicioActivo, setServicioActivo } = useHotelStore()

  const activeServicio = SERVICIOS_OPCIONES.find(s => s.value === servicioActivo)!

  return (
    <div className="relative">
      <button
        onClick={() => setServicioDropdownOpen(!servicioDropdownOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all border-2 hover:shadow-md"
        style={{
          borderColor: activeServicio.color,
          color: activeServicio.color,
          background: `${activeServicio.color}08`,
        }}
      >
        <Radio className="h-4 w-4 animate-pulse" />
        <span className="hidden sm:inline uppercase tracking-wider text-xs">{activeServicio.label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {servicioDropdownOpen && (
        <div
          className="absolute left-0 mt-2 w-48 origin-top-left rounded-xl bg-surface shadow-lg ring-1 ring-border z-50 py-1"
          onMouseLeave={() => setServicioDropdownOpen(false)}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Servicio RFID Activo</p>
          </div>
          {SERVICIOS_OPCIONES.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setServicioActivo(opt.value)
                setServicioDropdownOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-low ${
                opt.value === servicioActivo ? 'font-bold' : 'text-muted-foreground'
              }`}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: opt.color }} />
              {opt.label}
              {opt.value === servicioActivo && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-primary">Activo</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
