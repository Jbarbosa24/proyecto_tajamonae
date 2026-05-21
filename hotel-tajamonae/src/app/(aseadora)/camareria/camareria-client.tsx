'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  MessageSquare, 
  Camera, 
  Shirt, 
  Filter, 
  Users, 
  BedDouble 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { saveTask, getPendingTasks } from '@/lib/offline-storage'
import { synchronizeTasks } from '@/lib/sync-manager'
import { cn } from '@/lib/utils'

interface RegistroCamareria {
  id: string
  habitacion_id: string
  estado: string
  hora_inicio: string | null
  hora_fin: string | null
  observaciones: string | null
}

interface Habitacion {
  id: string
  bloque_id: string
  bloque_nombre: string
  piso: number
  capacidad: number
  estado: string
  estado_aseo: string
  occupancy?: number
  occupantNames?: string[]
}

interface Lavanderia {
  id: string
  habitacion_id: string
  estado: string
}

interface CamareriaClientProps {
  rooms: Habitacion[]
  registros: RegistroCamareria[]
  lavanderias: Lavanderia[]
}

export function CamareriaClient({ rooms, registros, lavanderias }: CamareriaClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [incidenciaRoom, setIncidenciaRoom] = useState<string | null>(null)
  const [incidenciaText, setIncidenciaText] = useState('')
  const [finalizarModal, setFinalizarModal] = useState<{ registroId: string; roomId: string } | null>(null)
  const [checklist, setChecklist] = useState({ jabones: false, papel: false, sabanas: false, toallas: false })
  const [fotos, setFotos] = useState<{ despues: string | null }>({ despues: null })
  
  const [iniciarModal, setIniciarModal] = useState<string | null>(null)
  const [fotoAntes, setFotoAntes] = useState<string | null>(null)

  // Lavanderia State
  const initialPrendas = { jeans: 0, camisas: 0, overoles: 0, pantalonetas: 0, toallas: 0, capuchones: 0 }
  const [lavanderiaModal, setLavanderiaModal] = useState<{ roomId: string, activeId: string | null, isTerminada: boolean } | null>(null)
  const [prendas, setPrendas] = useState(initialPrendas)
  const [tulaFoto, setTulaFoto] = useState<string | null>(null)

  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)

  // Sincronización inicial y periódica
  useEffect(() => {
    setMounted(true)
    const updatePending = async () => {
      const tasks = await getPendingTasks()
      setPendingSyncCount(tasks.length)
    }

    updatePending()
    synchronizeTasks()

    const interval = setInterval(() => {
      updatePending()
      synchronizeTasks()
    }, 30000)

    window.addEventListener('online', synchronizeTasks)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', synchronizeTasks)
    }
  }, [])

  const registroMap = new Map<string, RegistroCamareria>()
  for (const reg of registros) {
    registroMap.set(reg.habitacion_id, reg)
  }

  const pendingCount = rooms.filter(r => {
    const reg = registroMap.get(r.id)
    return !reg || reg.estado === 'Pendiente'
  }).length

  const inProgressCount = rooms.filter(r => {
    const reg = registroMap.get(r.id)
    return reg?.estado === 'En proceso'
  }).length

  const completedCount = rooms.filter(r => {
    const reg = registroMap.get(r.id)
    return reg?.estado === 'Aseo listo'
  }).length

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Error al cargar la imagen'))
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.5))
        } catch (err) {
          reject(err)
        }
      }
      img.src = base64Str
    })
  }

  const handleIniciarSubmit = () => {
    if (!iniciarModal || !fotoAntes) return
    const roomId = iniciarModal
    const foto = fotoAntes

    startTransition(async () => {
      await saveTask({
        id: `init-${Date.now()}`,
        type: 'INICIAR_LIMPIEZA',
        payload: { roomId, foto },
        timestamp: Date.now(),
        status: 'pending'
      })

      setFeedback({ ok: true, msg: 'Reporte guardado localmente. Sincronizando...' })
      setIniciarModal(null)
      setFotoAntes(null)
      
      synchronizeTasks().then(() => {
        getPendingTasks().then(t => setPendingSyncCount(t.length))
      })
    })
  }

  const openFinalizar = (registroId: string, roomId: string) => {
    setFinalizarModal({ registroId, roomId })
    setChecklist({ jabones: false, papel: false, sabanas: false, toallas: false })
    setFotos({ despues: null })
  }

  const handleFinalizarSubmit = () => {
    if (!finalizarModal) return
    const { registroId: regId, roomId } = finalizarModal
    const fFoto = fotos.despues

    startTransition(async () => {
      await saveTask({
        id: `fin-${Date.now()}`,
        type: 'FINALIZAR_ASEO',
        payload: { regId, roomId, checklist, foto: fFoto },
        timestamp: Date.now(),
        status: 'pending'
      })

      setFeedback({ ok: true, msg: 'Aseo finalizado localmente. Sincronizando...' })
      setFinalizarModal(null)
      synchronizeTasks().then(() => {
        getPendingTasks().then(t => setPendingSyncCount(t.length))
      })
    })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'despues' | 'antes_init') => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const resized = await resizeImage(event.target?.result as string)
        if (tipo === 'antes_init') {
          setFotoAntes(resized)
        } else {
          setFotos(prev => ({ ...prev, [tipo]: resized }))
        }
      } catch (err) {
        console.error('Error al procesar imagen:', err)
        setFeedback({ ok: false, msg: 'Error al procesar la imagen. Intente de nuevo.' })
      } finally {
        setImageLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleIncidencia = () => {
    if (!incidenciaRoom || !incidenciaText.trim()) return
    const roomId = incidenciaRoom
    const text = incidenciaText

    startTransition(async () => {
      await saveTask({
        id: `inc-${Date.now()}`,
        type: 'REPORTAR_INCIDENCIA',
        payload: { roomId, text },
        timestamp: Date.now(),
        status: 'pending'
      })

      setFeedback({ ok: true, msg: 'Incidencia registrada localmente.' })
      setIncidenciaRoom(null)
      setIncidenciaText('')
      synchronizeTasks().then(() => {
        getPendingTasks().then(t => setPendingSyncCount(t.length))
      })
    })
  }

  const openLavanderia = async (roomId: string) => {
    // Buscar en datos del servidor
    let isTerminada = lavanderias.some(l => String(l.habitacion_id) === String(roomId) && l.estado === 'Entregado')
    let activeId = lavanderias.find(l => String(l.habitacion_id) === String(roomId) && l.estado === 'En proceso')?.id || null
    
    // Buscar en tareas locales pendientes
    const pendingTasks = await getPendingTasks()
    
    // Si hay una entrega local pendiente, se considera terminada por hoy
    if (pendingTasks.some(t => t.type === 'ENTREGAR_LAVANDERIA' && String(t.payload.roomId) === String(roomId))) {
      isTerminada = true
    }

    const localReg = pendingTasks.find(t => t.type === 'REGISTRAR_LAVANDERIA' && String(t.payload.roomId) === String(roomId))
    
    if (localReg && !activeId && !isTerminada) {
      activeId = localReg.id // Usar ID temporal de la tarea local
    }

    setLavanderiaModal({ roomId, activeId, isTerminada })
    setPrendas(initialPrendas)
    setTulaFoto(null)
    setImageLoading(false)
  }

  const handleLavanderiaSubmit = (isSinPrendas: boolean = false) => {
    if (!lavanderiaModal) return
    const { roomId, activeId: regId } = lavanderiaModal
    const foto = tulaFoto
    const sPrendas = isSinPrendas ? initialPrendas : prendas

    // Cierre inmediato del modal para evitar sensación de bloqueo
    setLavanderiaModal(null)
    setFeedback({ ok: true, msg: 'Guardando datos localmente...' })

    startTransition(async () => {
      await saveTask({
        id: `lav-${Date.now()}`,
        type: regId ? 'ENTREGAR_LAVANDERIA' : 'REGISTRAR_LAVANDERIA',
        payload: { regId, roomId, prendas: sPrendas, foto },
        timestamp: Date.now(),
        status: 'pending'
      })

      setFeedback({ ok: true, msg: 'Datos guardados. Sincronizando con el servidor...' })
      
      // Sincronización en segundo plano sin bloquear el estado modal
      synchronizeTasks().then(async () => {
        const remaining = await getPendingTasks()
        setPendingSyncCount(remaining.length)
        if (remaining.length === 0) {
          setFeedback({ ok: true, msg: 'Sincronización completada.' })
        }
        router.refresh()
      })
    })
  }

  const handleTulaPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const resized = await resizeImage(event.target?.result as string)
        setTulaFoto(resized)
      } catch (err) {
        console.error('Error laundry photo:', err)
        setFeedback({ ok: false, msg: 'Error al cargar foto de lavandería.' })
      } finally {
        setImageLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const getRoomStatus = (roomId: string) => {
    const reg = registroMap.get(roomId)
    if (!reg || reg.estado === 'Pendiente') return 'DIRTY'
    if (reg.estado === 'En proceso') return 'IN_PROGRESS'
    return 'CLEAN'
  }

  // Filter & Group Rooms
  const filteredRooms = rooms.filter(r => {
    if (filter === 'OCCUPIED') return (r.occupancy ?? 0) > 0;
    if (filter === 'PENDING') return getRoomStatus(r.id) === 'DIRTY';
    if (filter === 'TJ1-1') return r.bloque_id === 'BLQ-TJ1' && r.piso === 1;
    if (filter === 'TJ1-2') return r.bloque_id === 'BLQ-TJ1' && r.piso === 2;
    if (filter === 'TJ2') return r.bloque_id === 'BLQ-TJ2';
    return true; // ALL
  })

  const groupedRooms: Record<string, Habitacion[]> = {}
  filteredRooms.forEach(room => {
    const key = `${room.bloque_nombre} - Piso ${room.piso}`
    if (!groupedRooms[key]) groupedRooms[key] = []
    groupedRooms[key].push(room)
  })

  return (
    <div className="flex flex-col gap-6 w-full max-w-full relative">
      {/* Banner Sincronización */}
      {pendingSyncCount > 0 && (
        <div className="sticky top-4 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 animate-pulse" />
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Sincronización Pendiente</p>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                {pendingSyncCount} reportes locales. Conéctese para sincronizar.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={async () => {
              await synchronizeTasks(true);
              const remaining = await getPendingTasks();
              setPendingSyncCount(remaining.length);
              router.refresh();
            }} 
            className="text-white hover:bg-white/10 font-bold uppercase text-[10px] border border-white/20"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black font-heading tracking-tight uppercase text-slate-900">Operaciones</h2>
          <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-3 w-3" /> {mounted && new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center min-w-[90px]">
            <span className="text-2xl font-black text-red-500">{pendingCount}</span>
            <span className="text-[9px] font-black uppercase text-slate-400">Pends</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center min-w-[90px]">
            <span className="text-2xl font-black text-amber-500">{inProgressCount}</span>
            <span className="text-[9px] font-black uppercase text-slate-400">Proceso</span>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center min-w-[90px]">
            <span className="text-2xl font-black text-emerald-500">{completedCount}</span>
            <span className="text-[9px] font-black uppercase text-slate-400">Listas</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-4 text-sm font-bold shadow-sm ${feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {[
          { val: 'ALL', label: 'Todos' },
          { val: 'OCCUPIED', label: 'Ocupadas' },
          { val: 'PENDING', label: 'Pendientes' },
          { val: 'TJ1-1', label: 'TJ1 Piso 1' },
          { val: 'TJ1-2', label: 'TJ1 Piso 2' },
          { val: 'TJ2', label: 'TJ2' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold uppercase transition-all border ${
              filter === val ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tarjetas */}
      <div className="space-y-10 mt-4">
        {Object.entries(groupedRooms).map(([groupName, groupRooms]) => (
          <div key={groupName} className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-2">{groupName}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {groupRooms.map((room) => {
                const status = getRoomStatus(room.id)
                const registro = registroMap.get(room.id)
                const isOccupied = (room.occupancy ?? 0) > 0

                return (
                  <div key={room.id} className={`border bg-white rounded-xl shadow-sm flex flex-col ${status === 'IN_PROGRESS' ? 'ring-2 ring-amber-500/20 border-amber-300' : 'border-slate-200'}`}>
                    <div className="p-4 pb-2 border-b flex justify-between items-start">
                      <span className="text-2xl font-black text-slate-800">{room.id}</span>
                      <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                        status === 'DIRTY' ? 'bg-red-50 text-red-600' 
                        : status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' 
                        : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {status === 'DIRTY' ? 'Pendiente' : status === 'IN_PROGRESS' ? 'En proceso' : 'Listo ✓'}
                      </div>
                    </div>

                    <div className="p-4 flex-1 bg-slate-50/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Users className="h-4 w-4" /> {room.occupancy}/{room.capacidad} ocupantes
                      </div>
                      {room.occupantNames && room.occupantNames.length > 0 && (
                        <div className="space-y-0.5">
                          {room.occupantNames.map((name, i) => (
                            <p key={i} className="text-[9px] font-bold text-slate-500 uppercase truncate flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-primary/40 shrink-0" />
                              {name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white grid grid-cols-2 gap-2 border-t">
                      {status === 'DIRTY' && (
                        <Button onClick={() => setIniciarModal(room.id)} className="col-span-2 h-10 bg-slate-900 text-white uppercase text-[10px] font-black">Iniciar</Button>
                      )}
                      {status === 'IN_PROGRESS' && registro && (
                        <Button onClick={() => openFinalizar(registro.id, room.id)} className="col-span-2 h-10 bg-primary text-white uppercase text-[10px] font-black">Finalizar</Button>
                      )}
                      <Button onClick={() => setIncidenciaRoom(room.id)} variant="outline" className="h-9 uppercase text-[9px] font-black">Incidencia</Button>
                      <Button onClick={() => openLavanderia(room.id)} variant="outline" className="h-9 uppercase text-[9px] font-black">Ropa</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modales */}
      <Dialog open={Boolean(incidenciaRoom)} onOpenChange={o => !o && setIncidenciaRoom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-xl">Reportar Incidencia — {incidenciaRoom}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <textarea 
              value={incidenciaText} 
              onChange={e => setIncidenciaText(e.target.value)} 
              className="w-full p-4 border rounded-xl min-h-[120px] outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Describa el problema..."
            />
          </div>
          <DialogFooter className="p-6">
            <Button onClick={handleIncidencia} disabled={isPending || !incidenciaText.trim()} className="w-full bg-red-600 text-white font-black uppercase">Reportar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(finalizarModal)} onOpenChange={o => !o && setFinalizarModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="uppercase font-black">Verificación de Salida — {finalizarModal?.roomId}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <label className="block p-8 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-slate-50">
              <Camera className={`h-8 w-8 mx-auto mb-2 ${imageLoading ? 'animate-pulse text-primary' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase font-black">
                {imageLoading ? 'Procesando imagen...' : (fotos.despues ? 'Foto capturada ✓' : 'Tomar evidencia')}
              </span>
              <input type="file" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, 'despues')} disabled={imageLoading} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(checklist).map(([k, v]) => (
                <button key={k} onClick={() => setChecklist(prev => ({ ...prev, [k]: !v }))} className={`p-3 border-2 rounded-xl text-[10px] font-black uppercase transition-all ${v ? 'border-primary bg-primary/5' : 'border-slate-100'}`}>
                  {k} {v ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="p-6 border-t">
            <Button 
              onClick={handleFinalizarSubmit} 
              disabled={isPending || imageLoading || !fotos.despues || Object.values(checklist).some(v => !v)} 
              className="w-full h-12 bg-primary text-white font-black uppercase"
            >
              {imageLoading ? 'Espere...' : 'Finalizar Turno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lavanderiaModal)} onOpenChange={o => {
        if (!o) {
          setLavanderiaModal(null)
          setImageLoading(false)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="uppercase font-black">Gestión de Ropa — {lavanderiaModal?.roomId}</DialogTitle>
          </DialogHeader>
          
          {lavanderiaModal?.isTerminada ? (
            <div className="p-10 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase">Lavandería Lista</h3>
              <p className="text-sm font-bold text-slate-500 uppercase">Ya se ha confirmado la entrega de la bolsa para esta habitación en el día de hoy.</p>
            </div>
          ) : (
            <>
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <label className="block p-8 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-slate-50">
                  <Camera className={`h-8 w-8 mx-auto mb-2 ${imageLoading ? 'animate-pulse text-indigo-600' : ''}`} />
                  <span className="text-[10px] uppercase font-black">
                    {imageLoading ? 'Procesando...' : (tulaFoto ? 'Foto de tula lista' : 'Evidencia de bolsa')}
                  </span>
                  <input type="file" capture="environment" className="hidden" onChange={handleTulaPhoto} disabled={imageLoading} />
                </label>

                {/* Formulario de cantidades */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(prendas).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">{key}</label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPrendas(p => ({ ...p, [key]: Math.max(0, p[key as keyof typeof prendas] - 1) }))}
                          className="h-8 w-8 p-0"
                        >
                          -
                        </Button>
                        <span className="flex-1 text-center font-bold">{value}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPrendas(p => ({ ...p, [key]: p[key as keyof typeof prendas] + 1 }))}
                          className="h-8 w-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {!lavanderiaModal?.activeId && (
                  <Button onClick={() => handleLavanderiaSubmit(true)} variant="ghost" className="w-full text-slate-400 uppercase text-[9px]">Esta habitación no tiene ropa</Button>
                )}
              </div>
              <DialogFooter className="p-6 border-t">
                <Button onClick={() => handleLavanderiaSubmit(false)} disabled={isPending || imageLoading} className="w-full h-12 bg-indigo-600 text-white font-black uppercase">
                  {imageLoading ? 'Espere...' : (lavanderiaModal?.activeId ? 'Confirmar Entrega' : 'Registrar Bolsa')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(iniciarModal)} onOpenChange={o => !o && setIniciarModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="uppercase font-black">Iniciar Aseo — {iniciarModal}</DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <label className="block p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer hover:bg-slate-50">
              <Camera className={`h-10 w-10 mx-auto mb-3 ${imageLoading ? 'animate-pulse text-slate-900' : ''}`} />
              <span className="text-xs uppercase font-black">
                {imageLoading ? 'Procesando...' : (fotoAntes ? 'Foto enviada ✓' : 'Capture estado inicial')}
              </span>
              <input type="file" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e, 'antes_init')} disabled={imageLoading} />
            </label>
          </div>
          <DialogFooter className="p-6 border-t">
            <Button onClick={handleIniciarSubmit} disabled={isPending || !fotoAntes} className="w-full h-14 bg-slate-900 text-white font-black uppercase">Confirmar Inicio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
