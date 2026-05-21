'use client'

import { useMemo, useState } from 'react'
import { Shirt, DollarSign, X, CheckCircle2, Camera, Users, Building2, Plus } from 'lucide-react'
import { RoomGrid } from '@/components/hotel/room-grid'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Habitacion = Database['public']['Tables']['habitaciones']['Row']

interface OperarioActivo {
  id: string
  nombre_completo: string
  cargo: string
  empresa_id: string
  rfid_uid: string | null
  habitacion_id: string | null
  fecha_ingreso_turno: string | null
  empresas:
    | { sigla: string; nombre_completo?: string | null }
    | Array<{ sigla: string; nombre_completo?: string | null }>
    | null
}

interface HabitacionesClientProps {
  initialRooms: Habitacion[]
  activeWorkers: OperarioActivo[]
  registrosCamareria?: any[]
  registrosLavanderia?: any[]
  camareriaListaByRoom?: Record<string, boolean>
}

function roomOrderKey(roomId: string) {
  if (roomId.startsWith('TJ2-')) {
    return 200 + Number(roomId.split('-')[1] || 0)
  }

  if (roomId.startsWith('TJ')) {
    return Number(roomId.replace('TJ', ''))
  }

  return Number.MAX_SAFE_INTEGER
}

function resolveEmpresa(
  empresa:
    | { sigla: string; nombre_completo?: string | null }
    | Array<{ sigla: string; nombre_completo?: string | null }>
    | null
) {
  if (!empresa) {
    return null
  }

  return Array.isArray(empresa) ? empresa[0] ?? null : empresa
}

export function HabitacionesClient({ initialRooms, activeWorkers, registrosCamareria = [], registrosLavanderia = [], camareriaListaByRoom = {} }: HabitacionesClientProps) {
  const [selectedRoom, setSelectedRoom] = useState<Habitacion | null>(null)

  const sortedRooms = useMemo(
    () => [...initialRooms].sort((a, b) => roomOrderKey(a.id) - roomOrderKey(b.id)),
    [initialRooms]
  )

  const tj1Piso1 = useMemo(
    () => sortedRooms.filter((room) => room.bloque_id === 'BLQ-TJ1' && room.piso === 1),
    [sortedRooms]
  )

  const tj1Piso2 = useMemo(
    () => sortedRooms.filter((room) => room.bloque_id === 'BLQ-TJ1' && room.piso === 2),
    [sortedRooms]
  )

  const tj2 = useMemo(
    () => sortedRooms.filter((room) => room.bloque_id === 'BLQ-TJ2'),
    [sortedRooms]
  )

  const occupantsByRoom = useMemo(() => {
    return activeWorkers.reduce<Record<string, number>>((acc, worker) => {
      if (!worker.habitacion_id) {
        return acc
      }

      acc[worker.habitacion_id] = (acc[worker.habitacion_id] ?? 0) + 1
      return acc
    }, {})
  }, [activeWorkers])

  const currentRoom = useMemo(() => {
    return selectedRoom ? initialRooms.find(r => r.id === selectedRoom.id) || selectedRoom : null
  }, [selectedRoom, initialRooms])

  const workersInSelectedRoom = useMemo(() => {
    if (!currentRoom) {
      return []
    }

    return activeWorkers
      .filter((worker) => worker.habitacion_id === currentRoom.id)
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
  }, [activeWorkers, currentRoom])

  const effectiveEstadoForSelected = currentRoom
    ? (occupantsByRoom[currentRoom.id] ?? 0) > 0 ? 'Ocupada' : currentRoom.estado
    : 'Disponible'

  const selectedStatusColor =
    effectiveEstadoForSelected === 'Disponible'
      ? 'text-success'
      : effectiveEstadoForSelected === 'Ocupada'
        ? 'text-destructive'
        : effectiveEstadoForSelected === 'En limpieza'
          ? 'text-secondary'
          : 'text-muted-foreground'

  // Extract records for selected room
  const selectedCamareria = currentRoom 
    ? registrosCamareria.filter(r => r.habitacion_id === currentRoom.id)
    : []
  const currentCamareria = selectedCamareria.length > 0 ? selectedCamareria[0] : null

  const selectedLavanderia = currentRoom 
    ? registrosLavanderia.filter(r => r.habitacion_id === currentRoom.id)
    : []
  const currentLavanderia = selectedLavanderia.length > 0 ? selectedLavanderia[0] : null

  const laundryEntregadoByRoom = useMemo(() => {
    return registrosLavanderia.reduce<Record<string, boolean>>((acc, reg) => {
      if (reg.estado === 'Entregado') {
        acc[reg.habitacion_id] = true
      }
      return acc
    }, {})
  }, [registrosLavanderia])

  return (
    <>
      <div className="space-y-6 -mt-2">
        <div className="flex flex-wrap gap-6 text-sm font-medium pl-1">
          <span className="inline-flex items-center gap-2 text-foreground">
            <span className="size-2.5 rounded-full" style={{ background: '#005d6a' }} /> Disponible
          </span>
          <span className="inline-flex items-center gap-2 text-foreground">
            <span className="size-2.5 rounded-full" style={{ background: '#ba1a1a' }} /> Ocupada
          </span>
          <span className="inline-flex items-center gap-2 text-foreground">
            <span className="size-2.5 rounded-full" style={{ background: '#b45309' }} /> En limpieza
          </span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <div className="space-y-8">
            <RoomGrid
              title="Bloque Tajamonae 1 - Piso 1"
              rooms={tj1Piso1}
              onRoomClick={setSelectedRoom}
              columns={6}
              occupantsByRoom={occupantsByRoom}
              laundryEntregadoByRoom={laundryEntregadoByRoom}
              camareriaListaByRoom={camareriaListaByRoom}
            />
            <RoomGrid
              title="Bloque Tajamonae 1 - Piso 2"
              rooms={tj1Piso2}
              onRoomClick={setSelectedRoom}
              columns={6}
              occupantsByRoom={occupantsByRoom}
              laundryEntregadoByRoom={laundryEntregadoByRoom}
              camareriaListaByRoom={camareriaListaByRoom}
            />
            <RoomGrid
              title="Bloque Tajamonae 2"
              rooms={tj2}
              onRoomClick={setSelectedRoom}
              columns={8}
              occupantsByRoom={occupantsByRoom}
              laundryEntregadoByRoom={laundryEntregadoByRoom}
              camareriaListaByRoom={camareriaListaByRoom}
            />
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedRoom)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoom(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl w-full max-h-[85vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden bg-surface border-border shadow-2xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2 border-b border-border/50 bg-surface-low/30">
            <DialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-xl font-bold tracking-tight">
              {currentRoom ? `Habitación ${currentRoom.id}` : 'Monitoreo de Habitación'}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
              Estado de Ocupación, Aseo y Lavandería en Tiempo Real.
            </DialogDescription>
          </DialogHeader>

          {currentRoom && (
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <div className="px-6 py-5 space-y-6">
                
                {/* Indicadores Superiores DASHBOARD */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 shadow-sm">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-slate-50", selectedStatusColor.replace('text-', 'bg-').replace('success', 'emerald-100').replace('destructive', 'red-100').replace('secondary', 'amber-100'))}>
                      <Building2 className={cn("h-4 w-4", selectedStatusColor)} />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Ocupación</Label>
                      <p className={cn("text-[11px] font-black uppercase tracking-tight", selectedStatusColor)}>
                        {effectiveEstadoForSelected}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 shadow-sm">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Estado Aseo</Label>
                      <p className={cn("text-[11px] font-black uppercase tracking-tight", 
                        (currentCamareria?.estado === 'Aseo listo' || currentRoom.estado_aseo === 'Aseo listo') ? 'text-emerald-600' : 'text-amber-600'
                      )}>
                        {currentCamareria?.estado ?? currentRoom.estado_aseo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 shadow-sm">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Personal</Label>
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">
                        {occupantsByRoom[currentRoom.id] ?? 0} / {currentRoom.capacidad}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* COLUMNA IZQUIERDA: Personal (5/12) */}
                  <div className="lg:col-span-5 space-y-5">
                    <div className="rounded-2xl border border-border bg-background/50 overflow-hidden shadow-sm">
                      <div className="bg-surface-low/30 px-4 py-3 border-b border-border/50">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" /> Ocupantes Actuales
                        </h3>
                      </div>

                      <div className="p-4">
                        {workersInSelectedRoom.length > 0 ? (
                          <div className="space-y-2">
                            {workersInSelectedRoom.map((worker) => {
                              const empresa = resolveEmpresa(worker.empresas)
                              return (
                                <div key={worker.id} className="rounded-lg border border-border bg-background p-3 transition-all hover:border-primary/40 group relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                                  <div className="flex items-start justify-between gap-3 pl-1">
                                    <div className="min-w-0">
                                      <p className="font-black text-xs text-slate-900 truncate">{worker.nombre_completo}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                          {empresa?.sigla || 'N/A'}
                                        </span>
                                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{worker.cargo}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                                        {worker.fecha_ingreso_turno ? new Date(worker.fecha_ingreso_turno).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '---'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="py-10 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Sin personal asignado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: Reportes (7/12) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Camareria Section */}
                    <div className="rounded-2xl border border-border bg-background/50 overflow-hidden shadow-sm">
                      <div className="bg-surface-low/30 px-4 py-3 border-b border-border/50 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reporte de Camarería
                        </h3>
                        {currentCamareria && (
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm", currentCamareria.estado === 'Aseo listo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200')}>
                            {currentCamareria.estado}
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        {currentCamareria ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                               {[
                                 { label: 'Antes de Iniciar', img: currentCamareria.foto_antes },
                                 { label: 'Entrega Final', img: currentCamareria.foto_despues }
                               ].map((pic, i) => (
                                 <div key={i} className="space-y-1.5">
                                   <Label className="text-[8px] font-black uppercase text-muted-foreground tracking-widest pl-1">{pic.label}</Label>
                                   <div className="aspect-video rounded-lg overflow-hidden border border-border bg-slate-100 relative group shadow-sm">
                                     {pic.img ? (
                                       <>
                                         <img src={pic.img} alt={pic.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                         <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="text-white h-5 w-5" />
                                         </div>
                                       </>
                                     ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/20">
                                         <Camera className="h-5 w-5 mb-1" />
                                         <span className="text-[8px] font-black uppercase">Sin evidencia</span>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               ))}
                            </div>

                            {currentCamareria.observaciones && (
                               <div className="p-3 rounded-lg bg-surface-low/50 border border-border/50">
                                 <Label className="text-[8px] font-black uppercase tracking-widest text-amber-700 block mb-1">Observaciones:</Label>
                                 <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic">"{currentCamareria.observaciones}"</p>
                               </div>
                            )}

                            {currentCamareria.lista_chequeo && (
                              <div className="pt-3 border-t border-border/50">
                                <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Insumos Verificados</Label>
                                <div className="grid grid-cols-4 gap-2">
                                  {Object.entries(currentCamareria.lista_chequeo).map(([k, v]) => (
                                    <div key={k} className={cn("px-2 py-1.5 rounded-md border text-[8px] font-black uppercase text-center transition-all", v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-background text-muted-foreground/30 border-border opacity-40')}>
                                      {k}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Sin reporte de aseo hoy</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lavanderia Section */}
                    <div className="rounded-2xl border border-border bg-background/50 overflow-hidden shadow-sm">
                       <div className="bg-surface-low/30 px-4 py-3 border-b border-border/50 flex items-center justify-between">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                           <Shirt className="h-3.5 w-3.5" /> Entrega de Lavandería
                         </h3>
                         {currentLavanderia && (
                           <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-primary/5 text-primary border border-primary/20 rounded-full shadow-sm">
                             {currentLavanderia.estado}
                           </span>
                         )}
                       </div>

                       <div className="p-4">
                        {currentLavanderia ? (
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                             {['jeans', 'camisas', 'overoles', 'pantalonetas', 'toallas', 'capuchones'].map(prenda => (
                               <div key={prenda} className={cn("p-1.5 rounded-lg border flex flex-col items-center transition-all shadow-sm", (currentLavanderia[prenda] ?? 0) > 0 ? 'bg-background border-primary/30 ring-1 ring-primary/5' : 'bg-slate-50/50 border-border opacity-30')}>
                                 <Label className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter mb-0.5 truncate w-full text-center">{prenda}</Label>
                                 <p className={cn("text-xs font-black", (currentLavanderia[prenda] ?? 0) > 0 ? 'text-primary' : 'text-slate-300')}>
                                   {currentLavanderia[prenda] || 0}
                                 </p>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Sin tulas registradas</p>
                          </div>
                        )}
                       </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="shrink-0 px-6 py-4 border-t border-border bg-surface-low/30 flex items-center justify-end">
            <Button variant="outline" onClick={() => setSelectedRoom(null)} className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] border-border hover:border-border hover:bg-background shadow-sm">
              Cerrar Panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
