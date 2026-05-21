import { BedDouble, CheckCircle2, Sparkles, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Habitacion = Database['public']['Tables']['habitaciones']['Row']

interface RoomGridProps {
  title: string
  rooms: Habitacion[]
  onRoomClick?: (room: Habitacion) => void
  columns?: 6 | 8
  occupantsByRoom?: Record<string, number>
  laundryEntregadoByRoom?: Record<string, boolean>
  camareriaListaByRoom?: Record<string, boolean>
}

export function RoomGrid({
  title,
  rooms,
  onRoomClick,
  columns = 6,
  occupantsByRoom = {},
  laundryEntregadoByRoom = {},
  camareriaListaByRoom = {},
}: RoomGridProps) {
  const getStatusStyles = (estado: string) => {
    if (estado === 'Disponible') {
      return {
        card: 'border-success/60 bg-success/5 shadow-[0_0_12px_rgba(142,255,113,0.05)] hover:border-success',
        icon: <BedDouble className="h-4 w-4 text-success" />,
        tag: 'Disponible',
        tagBg: 'bg-success/20 text-success border-success/40'
      }
    }

    if (estado === 'Ocupada') {
      return {
        card: 'border-destructive/60 bg-destructive/5 shadow-[0_0_12px_rgba(255,113,102,0.05)] hover:border-destructive',
        icon: <Users className="h-4 w-4 text-destructive" />,
        tag: 'Ocupada',
        tagBg: 'bg-destructive/20 text-destructive border-destructive/40'
      }
    }

    if (estado === 'En limpieza') {
      return {
        card: 'border-secondary/60 bg-secondary/5 shadow-[0_0_12px_rgba(0,227,253,0.05)] hover:border-secondary',
        icon: <Sparkles className="h-4 w-4 text-secondary" />,
        tag: 'Limpieza',
        tagBg: 'bg-secondary/20 text-secondary border-secondary/40'
      }
    }

    return {
      card: 'border-border bg-surface-low text-muted-foreground',
      icon: <BedDouble className="h-4 w-4 text-muted-foreground" />,
      tag: estado,
      tagBg: 'bg-surface border-border text-muted-foreground'
    }
  }

  const gridWrapperClass = 'flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pt-3 pb-4 -mx-2 px-2 styling-scrollbar'
  const cardWidthClass = 'min-w-[180px] sm:min-w-[200px] md:min-w-[220px] snap-center shrink-0'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <h3 className="text-lg font-black font-heading text-primary">{title}</h3>
        <span className="rounded-full bg-surface-low px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {rooms.length} habitaciones
        </span>
      </div>

      <div className={cn(gridWrapperClass)}>
        {rooms.map((room) => {
          const count = occupantsByRoom[room.id] ?? 0
          const effectiveEstado = count > 0 ? 'Ocupada' : room.estado
          const status = getStatusStyles(effectiveEstado)
          const isAseoListo = camareriaListaByRoom[room.id] === true
          const isLavanderiaEntregada = laundryEntregadoByRoom[room.id] === true

          return (
            <Card
              key={room.id}
              onClick={() => onRoomClick?.(room)}
              className={cn(
                'group relative h-28 cursor-pointer overflow-hidden rounded-xl border-2 p-0 ring-0 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02]',
                status.card,
                cardWidthClass
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onRoomClick?.(room)
                }
              }}
            >
              <div className="relative flex h-full flex-col justify-between p-3.5">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Habitación</span>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black tracking-tight font-heading leading-none mt-1">{room.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between w-full">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground border border-surface-highest px-1.5 py-0.5 rounded-sm shadow-inner inline-block w-fit">
                        PISO {room.piso}
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {occupantsByRoom[room.id] ?? 0}/{room.capacidad} <span className="text-secondary tracking-tight text-[10px]">Ocupantes</span>
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${status.tagBg}`}>
                      {status.icon}
                      <span>{status.tag}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ping rojo si está ocupada */}
              {effectiveEstado === 'Ocupada' && (
                <span className="absolute left-2 top-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
              )}

              {/* Indicadores en fila superior derecha: Aseo ✓ + Lavandería ✓ */}
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {isAseoListo && (
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white shadow-sm ring-2 ring-white border border-[#059669]"
                    title="Aseo Finalizado"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
                {isLavanderiaEntregada && (
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm ring-2 ring-surface border border-blue-500/50"
                    title="Ropa Entregada"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
