'use client'

import { useState } from 'react'
import { X, BedDouble, Users, ClipboardList, TrendingUp } from 'lucide-react'

interface ModalData {
  operariosActivos: number
  serviciosHoy: number
  cuposFisicosDisponibles: number
  ocupacionPct: number
  roomsWithSpace: { id: string; disponible: number; capacidad: number }[]
  omisiones: {
    desayuno: number
    almuerzo: number
    cena: number
    total: number
    hospedados: number
  }
  empresaStats: { nombre: string; count: number }[]
  empresaPeopleStats: { nombre: string; count: number }[]
}

interface Props {
  data: ModalData
  children: React.ReactNode
}

export function DashboardModals({ data, children }: Props) {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-modal]')
    if (target) {
      setActiveModal(target.getAttribute('data-modal'))
    }
  }

  return (
    <>
      <div onClick={handleClick}>{children}</div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div
            className="bg-surface rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface rounded-t-xl z-10">
              <h3 className="text-base font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {activeModal === 'operarios' && '👷 Operarios Activos'}
                {activeModal === 'servicios' && '📋 Servicios Registrados Hoy'}
                {activeModal === 'cupos' && '🛏 Cupos Físicos Disponibles'}
                {activeModal === 'ocupacion' && '📊 Ocupación del Hotel'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-low transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {activeModal === 'operarios' && (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.operariosActivos}</p>
                      <p className="text-xs text-muted-foreground">operarios en turno activo</p>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ocupación por Empresa</h4>
                  <div className="space-y-2">
                    {data.empresaPeopleStats.map((e) => (
                      <div key={e.nombre} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-sm font-medium">{e.nombre}</span>
                        <span className="text-xs font-bold text-primary">{e.count} personas</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeModal === 'servicios' && (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4">
                    <ClipboardList className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.serviciosHoy}</p>
                      <p className="text-xs text-muted-foreground">servicios registrados hoy</p>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Por Empresa</h4>
                  <div className="space-y-2">
                    {data.empresaStats.map((e) => (
                      <div key={e.nombre} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <span className="text-sm font-medium">{e.nombre}</span>
                        <span className="text-xs font-bold text-primary">{e.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeModal === 'cupos' && (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                    <BedDouble className="h-8 w-8 text-emerald-700" />
                    <div>
                      <p className="text-2xl font-bold text-emerald-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.cuposFisicosDisponibles}</p>
                      <p className="text-xs text-emerald-600">camas disponibles en todo el hotel</p>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Habitaciones con Espacio</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.roomsWithSpace.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Hotel al máximo de capacidad.</p>
                    ) : (
                      data.roomsWithSpace.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <span className="text-sm font-bold">{r.id}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.disponible} de {r.capacidad} disponible{r.disponible > 1 ? 's' : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeModal === 'ocupacion' && (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-100 p-4">
                    <TrendingUp className="h-8 w-8 text-amber-700" />
                    <div>
                      <p className="text-2xl font-bold text-amber-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.ocupacionPct}%</p>
                      <p className="text-xs text-amber-600">ocupación general del hotel</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="rounded-lg bg-surface-low p-3 text-center">
                      <p className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.operariosActivos}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Hospedados</p>
                    </div>
                    <div className="rounded-lg bg-surface-low p-3 text-center">
                      <p className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.cuposFisicosDisponibles}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Disponibles</p>
                    </div>
                  </div>
                  {data.omisiones.total > 0 && (
                    <>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-destructive mt-4">⚠️ Omisiones de Servicio Hoy</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-amber-50 p-2 text-center border border-amber-100">
                          <p className="text-sm font-bold text-amber-900">{data.omisiones.desayuno}</p>
                          <p className="text-[9px] text-amber-600">Desayuno</p>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-2 text-center border border-orange-100">
                          <p className="text-sm font-bold text-orange-900">{data.omisiones.almuerzo}</p>
                          <p className="text-[9px] text-orange-600">Almuerzo</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-2 text-center border border-red-100">
                          <p className="text-sm font-bold text-red-900">{data.omisiones.cena}</p>
                          <p className="text-[9px] text-red-600">Cena</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
