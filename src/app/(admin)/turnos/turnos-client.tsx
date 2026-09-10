'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Users, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { procesarTurnoAction, rechazarTurnoAction } from './actions'

interface OperarioDraft {
  nombre_completo: string
  documento_identidad: string
  cargo: string
  genero?: string
  tipo_cargo?: string
  dias_turno?: string
  rfid_uid?: string
}

interface Turno {
  id: string
  empresa_id: string
  archivo_nombre: string
  operarios_entrantes: OperarioDraft[] | null
  operarios_salientes: any[] | null
  empresas?: { nombre_completo: string }
}

export function TurnosClient({ pendientes }: { pendientes: Turno[] }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleProcesar = async (id: string, type: 'ingresos' | 'salidas' | 'todos') => {
    setLoading(id)
    const res = await procesarTurnoAction(id, type)
    setLoading(null)
    if (res.ok) alert(res.message)
    else alert(res.message)
  }

  const handleRechazar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta carga?')) return
    setLoading(id)
    const res = await rechazarTurnoAction(id)
    setLoading(null)
    if (res.ok) alert('Carga eliminada')
  }

  if (pendientes.length === 0) {
    return (
      <div className="bg-surface border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground animate-in fade-in">
        <Users className="h-10 w-10 mx-auto mb-4 opacity-50" />
        <h3 className="font-bold text-lg">No hay turnos pendientes</h3>
        <p className="text-sm mt-1">Los logísticos no han cargado nuevos ingresos o salidas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pendientes.map((turno) => {
        const entrantesCount = Array.isArray(turno.operarios_entrantes) ? turno.operarios_entrantes.length : 0
        const salientesCount = Array.isArray(turno.operarios_salientes) ? turno.operarios_salientes.length : 0

        return (
          <div key={turno.id} className="bg-surface border border-border shadow-soft rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-start gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-2">Solicitud de Turno</p>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                   Empresa: {turno.empresas?.nombre_completo}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Archivo cargado: <strong>{turno.archivo_nombre}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                   variant="outline" 
                   onClick={() => handleRechazar(turno.id)} 
                   disabled={loading === turno.id}
                   className="text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Rechazar
                </Button>
                <Button 
                   onClick={() => handleProcesar(turno.id, 'todos')} 
                   disabled={loading === turno.id}
                   className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                >
                  {loading === turno.id ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar Todo</>}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Ingresos */}
              <div className="p-6 bg-surface-low/30">
                <div className="flex items-center gap-2 mb-4 text-[#10b981]">
                  <LogIn className="h-5 w-5" />
                  <h4 className="font-bold text-foreground">Pre-Checkin ({entrantesCount})</h4>
                </div>
                {entrantesCount > 0 ? (
                  <ul className="space-y-2 max-h-[250px] overflow-auto">
                    {turno.operarios_entrantes!.map((op, i) => (
                      <li key={i} className="flex flex-col gap-1 text-sm p-3 bg-background border border-border rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-bold leading-tight">{op.nombre_completo} <span className="text-muted-foreground text-xs font-normal">({op.genero})</span></span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-surface-low px-1.5 py-0.5 rounded">{op.cargo || 'Operario'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                          <span className="font-mono">CC: {op.documento_identidad}</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider">{op.tipo_cargo} ({op.dias_turno}d)</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-sm text-muted-foreground italic">No hay ingresos en este turno.</p>
                )}
              </div>

              {/* Salidas */}
              <div className="p-6 bg-surface-low/30">
                <div className="flex items-center gap-2 mb-4 text-[#ef4444]">
                  <LogOut className="h-5 w-5" />
                  <h4 className="font-bold text-foreground">Pre-Checkout ({salientesCount})</h4>
                </div>
                {salientesCount > 0 ? (
                  <ul className="space-y-2 max-h-[250px] overflow-auto">
                     <span className="text-sm italic text-muted-foreground">Personal que desocupará habitaciones:</span>
                    {turno.operarios_salientes!.map((op, i) => {
                      const isObj = typeof op === 'object' && op !== null;
                      return (
                        <li key={i} className="flex flex-col gap-1 text-sm p-3 bg-background border border-border rounded-lg shadow-sm">
                          {isObj ? (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="font-bold leading-tight truncate">{op.nombre_completo || 'Sin nombre'}</span>
                                <span className="text-[10px] uppercase font-black tracking-widest text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded">Hab: {op.habitacion_id || '?'}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                <span>{op.cargo || 'Operario'}</span>
                                <span className="font-mono text-[9px]">ID: {op.id}</span>
                              </div>
                            </>
                          ) : (
                            <div className="font-mono text-xs truncate">ID: {op}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                   <p className="text-sm text-muted-foreground italic">No hay salidas en este turno.</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
