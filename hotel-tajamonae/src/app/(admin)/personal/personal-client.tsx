'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Pencil, RefreshCw, Trash2, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  actualizarOperarioAction,
  aplicarAsignacionesAction,
  eliminarOperarioAction,
  procesarCambioTurnoAction,
  intercambiarHabitacionesAction,
  type ApplyAssignmentsResult,
  type PersonalCrudResult,
  type ProcessTurnoResult,
} from './actions'
import {
  ExcelDropzone,
  type ParsedExcelWorker,
} from '@/components/hotel/excel-dropzone'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TurnosClient } from '../turnos/turnos-client'
import type { Database } from '@/types/database'

type Habitacion = Database['public']['Tables']['habitaciones']['Row']
type Operario = Database['public']['Tables']['operarios']['Row']

type OperarioListado = Pick<
  Operario,
  | 'id'
  | 'nombre_completo'
  | 'documento_identidad'
  | 'cargo'
  | 'empresa_id'
  | 'rfid_uid'
  | 'habitacion_id'
  | 'fecha_ingreso_turno'
  | 'fecha_salida_turno'
  | 'activo'
  | 'dias_turno'
  | 'tipo_cargo'
  | 'genero'
> & {
  empresas:
    | { sigla: string; nombre_completo?: string | null }
    | Array<{ sigla: string; nombre_completo?: string | null }>
    | null
}

interface SuggestedAssignment {
  operario_id: string
  nombre_completo: string
  empresa_sigla: string
  habitacion_id: string
  rfid_uid: string
}

interface PersonalClientProps {
  workers: OperarioListado[]
  rooms: Habitacion[]
  turnosPendientes: any[]
}

interface EditFormState {
  operario_id: string
  nombre_completo: string
  documento_identidad: string
  cargo: string
  empresa_id: string
  rfid_uid: string
  habitacion_id: string
  dias_turno?: string
  fecha_ingreso_turno?: string | null
  fecha_salida_turno?: string | null
  tipo_cargo?: string
  genero?: string
}

const PAGE_SIZE = 8

function roomSortKey(room: Habitacion) {
  const blockOrder = room.bloque_id === 'BLQ-TJ1' ? 0 : 1
  const roomNumber = room.id.startsWith('TJ2-')
    ? Number(room.id.split('-')[1] || 0)
    : Number(room.id.replace('TJ', ''))

  return blockOrder * 1000 + room.piso * 100 + roomNumber
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

function companySigla(worker: OperarioListado) {
  return resolveEmpresa(worker.empresas)?.sigla || 'N/A'
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin registro'
  }

  return new Date(value).toLocaleString('es-CO')
}

function buildSuggestedAssignments(
  workers: OperarioListado[],
  rooms: Habitacion[]
): SuggestedAssignment[] {
  // Solo sugerimos para operarios ACTIVOS que no tengan habitacion
  const unassignedWorkers = workers
    .filter((worker) => worker.activo && !worker.habitacion_id)
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))

  // Calcular ocupacion actual (solo activos)
  const occupancyMap = workers.reduce<Record<string, number>>((acc, w) => {
    if (w.activo && w.habitacion_id) {
      acc[w.habitacion_id] = (acc[w.habitacion_id] ?? 0) + 1
    }
    return acc
  }, {})

  // Habitaciones con espacio (aunque esten "Ocupadas" pero no llenas)
  const availableRooms = [...rooms]
    .filter((room) => {
      const current = occupancyMap[room.id] ?? 0
      return room.estado !== 'En limpieza' && current < room.capacidad
    })
    .sort((a, b) => roomSortKey(a) - roomSortKey(b))

  const groupedByCompany = new Map<string, OperarioListado[]>()

  for (const worker of unassignedWorkers) {
    const sigla = companySigla(worker)
    const list = groupedByCompany.get(sigla) || []
    list.push(worker)
    groupedByCompany.set(sigla, list)
  }

  const sortedGroups = [...groupedByCompany.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) {
      return b[1].length - a[1].length
    }

    return a[0].localeCompare(b[0])
  })

  const suggestions: SuggestedAssignment[] = []
  let roomPointer = 0
  
  // Track remaining seats in the current availableRooms pointer
  let currentRoomRemaining = availableRooms[0] ? (availableRooms[0].capacidad - (occupancyMap[availableRooms[0].id] || 0)) : 0

  for (const [sigla, groupWorkers] of sortedGroups) {
    for (const worker of groupWorkers) {
      // Find room with space
      while (roomPointer < availableRooms.length && currentRoomRemaining === 0) {
        roomPointer++
        if (availableRooms[roomPointer]) {
            currentRoomRemaining = availableRooms[roomPointer].capacidad - (occupancyMap[availableRooms[roomPointer].id] || 0)
        }
      }

      const currentRoom = availableRooms[roomPointer]

      suggestions.push({
        operario_id: worker.id,
        nombre_completo: worker.nombre_completo,
        empresa_sigla: sigla,
        habitacion_id: currentRoom?.id || '',
        rfid_uid: worker.rfid_uid || '',
      })

      if (currentRoomRemaining > 0) {
        currentRoomRemaining -= 1
      }
    }
  }

  return suggestions
}

export function PersonalClient({ workers, rooms, turnosPendientes }: PersonalClientProps) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [listFilter, setListFilter] = useState<'todos' | 'activos' | 'inactivos'>('activos')
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set())
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const [parsedWorkers, setParsedWorkers] = useState<ParsedExcelWorker[]>([])
  const [parsedFileName, setParsedFileName] = useState('')
  const [importResult, setImportResult] = useState<ProcessTurnoResult | null>(null)
  const [importPending, startImportTransition] = useTransition()

  const initialSuggestions = useMemo(
    () => buildSuggestedAssignments(workers, rooms),
    [workers, rooms]
  )

  const [assignments, setAssignments] = useState<SuggestedAssignment[]>(initialSuggestions)
  const [assignmentResult, setAssignmentResult] =
    useState<ApplyAssignmentsResult | null>(null)
  const [assignmentPending, startAssignmentTransition] = useTransition()

  const [crudResult, setCrudResult] = useState<PersonalCrudResult | null>(null)
  const [crudPending, startCrudTransition] = useTransition()
  const [editingWorker, setEditingWorker] = useState<OperarioListado | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  useEffect(() => {
    setAssignments(initialSuggestions)
  }, [initialSuggestions])

  const filteredWorkers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    let base = [...workers]
    if (listFilter === 'activos') base = base.filter(w => w.activo)
    if (listFilter === 'inactivos') base = base.filter(w => !w.activo)

    if (!normalizedSearch) {
      return base.sort((a, b) =>
        a.nombre_completo.localeCompare(b.nombre_completo)
      )
    }

    return base
      .filter((worker) => {
        const empresa = companySigla(worker).toLowerCase()

        return (
          worker.nombre_completo.toLowerCase().includes(normalizedSearch) ||
          worker.documento_identidad.toLowerCase().includes(normalizedSearch) ||
          worker.cargo.toLowerCase().includes(normalizedSearch) ||
          empresa.includes(normalizedSearch) ||
          (worker.rfid_uid || '').toLowerCase().includes(normalizedSearch)
        )
      })
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
  }, [search, workers, listFilter])

  const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
    // Clear selections on page/filter change to avoid invisible selected workers
    setSelectedWorkerIds(new Set())
  }, [page, totalPages, search])

  const paginatedWorkers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredWorkers.slice(start, start + PAGE_SIZE)
  }, [filteredWorkers, page])

  const toggleAllSelected = () => {
    const activeWorkers = paginatedWorkers.filter(w => w.activo)
    if (selectedWorkerIds.size === activeWorkers.length && activeWorkers.length > 0) {
      setSelectedWorkerIds(new Set())
    } else {
      setSelectedWorkerIds(new Set(activeWorkers.map(w => w.id)))
    }
  }

  const toggleWorkerSelection = (id: string) => {
    const next = new Set(selectedWorkerIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedWorkerIds(next)
  }

  const availableRoomOptions = useMemo(
    () => [...rooms].filter((room) => room.estado === 'Disponible').sort((a, b) => roomSortKey(a) - roomSortKey(b)),
    [rooms]
  )

  const roomOptions = useMemo(
    () => [...rooms].sort((a, b) => roomSortKey(a) - roomSortKey(b)),
    [rooms]
  )

  const companyOptions = useMemo(() => {
    const uniqueCompanies = new Map<string, string>()

    for (const worker of workers) {
      const sigla = companySigla(worker)
      uniqueCompanies.set(worker.empresa_id, sigla)
    }

    return Array.from(uniqueCompanies.entries())
      .map(([id, sigla]) => ({ id, sigla }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla))
  }, [workers])

  const readyAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.habitacion_id),
    [assignments]
  )

  const missingAssignments = assignments.length - readyAssignments.length

  const handleProcessImport = () => {
    if (parsedWorkers.length === 0) {
      return
    }

    startImportTransition(async () => {
      setCrudResult(null)

      const result = await procesarCambioTurnoAction({
        fileName: parsedFileName || 'importacion_turno.xlsx',
        workers: parsedWorkers,
      })

      setImportResult(result)
    })
  }

  const handleApplyAssignments = () => {
    if (readyAssignments.length === 0) {
      return
    }

    startAssignmentTransition(async () => {
      setCrudResult(null)

      const result = await aplicarAsignacionesAction({
        assignments: readyAssignments.map((assignment) => ({
          operario_id: assignment.operario_id,
          habitacion_id: assignment.habitacion_id,
          rfid_uid: assignment.rfid_uid || null,
        })),
      })

      setAssignmentResult(result)

      if (result.ok) {
        router.refresh()
      }
    })
  }

  const openEditDialog = (worker: OperarioListado) => {
    setEditingWorker(worker)
    setEditForm({
      operario_id: worker.id,
      nombre_completo: worker.nombre_completo,
      documento_identidad: worker.documento_identidad,
      cargo: worker.cargo,
      empresa_id: worker.empresa_id,
      rfid_uid: worker.rfid_uid || '',
      habitacion_id: worker.habitacion_id || '',
      dias_turno: worker.dias_turno || '',
      fecha_ingreso_turno: worker.fecha_ingreso_turno || null,
      fecha_salida_turno: worker.fecha_salida_turno || null,
      tipo_cargo: worker.tipo_cargo || '',
      genero: worker.genero || '',
    })
  }

  const handleUpdateWorker = () => {
    if (!editForm) {
      return
    }

    startCrudTransition(async () => {
      const result = await actualizarOperarioAction({
        operario_id: editForm.operario_id,
        nombre_completo: editForm.nombre_completo,
        documento_identidad: editForm.documento_identidad,
        cargo: editForm.cargo,
        empresa_id: editForm.empresa_id,
        rfid_uid: editForm.rfid_uid || null,
        habitacion_id: editForm.habitacion_id || null,
        dias_turno: editForm.dias_turno || null,
        fecha_ingreso_turno: editForm.fecha_ingreso_turno || null,
        fecha_salida_turno: editForm.fecha_salida_turno || null,
        tipo_cargo: editForm.tipo_cargo || null,
        genero: editForm.genero || null,
      })

      setCrudResult(result)

      if (result.ok) {
        setEditingWorker(null)
        setEditForm(null)
        router.refresh()
      }
    })
  }

  const handleDeleteWorker = (worker: OperarioListado) => {
    const isConfirmed = window.confirm(
      `Deseas realizar el Checkout a ${worker.nombre_completo} y liberarlo de su turno?`
    )

    if (!isConfirmed) {
      return
    }

    startCrudTransition(async () => {
      const result = await eliminarOperarioAction({
        operario_id: worker.id,
      })

      setCrudResult(result)

      if (result.ok) {
        // Remove from selection if checking out
        if (selectedWorkerIds.has(worker.id)) {
          const next = new Set(selectedWorkerIds)
          next.delete(worker.id)
          setSelectedWorkerIds(next)
        }
        router.refresh()
      }
    })
  }

  const handleBulkCheckout = () => {
    if (selectedWorkerIds.size === 0) return

    const isConfirmed = window.confirm(`Vas a realizar Checkout a ${selectedWorkerIds.size} operario(s) al mismo tiempo. ¿Proceder?`)
    if (!isConfirmed) return

    startCrudTransition(async () => {
      let hasError = false
      let successCount = 0
      let lastMessage = ''

      for (const id of Array.from(selectedWorkerIds)) {
        const res = await eliminarOperarioAction({ operario_id: id })
        if (!res.ok) {
          hasError = true
          lastMessage = res.message
        } else {
          successCount++
        }
      }

      setCrudResult({
        ok: !hasError,
        message: hasError ? `Checkout parcial: Fallaron algunos. Ultimo error: ${lastMessage}` : `Checkout aplicado a ${successCount} operario(s) exitosamente.`,
        errors: []
      })

      setSelectedWorkerIds(new Set())
      router.refresh()
    })
  }

  const handleSwapRooms = () => {
    if (selectedWorkerIds.size !== 2) return

    const [id1, id2] = Array.from(selectedWorkerIds)
    const op1 = workers.find(w => w.id === id1)
    const op2 = workers.find(w => w.id === id2)

    if (!op1 || !op2) return

    const isConfirmed = window.confirm(`Deseas intercambiar las habitaciones de ${op1.nombre_completo} y ${op2.nombre_completo}?`)
    if (!isConfirmed) return

    startCrudTransition(async () => {
      const res = await intercambiarHabitacionesAction({ id1, id2 })
      setCrudResult(res)

      if (res.ok) {
        setSelectedWorkerIds(new Set())
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">Gestion de Personal</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Lista de operarios activos, importacion de turnos en Excel y asignacion sugerida por empresa.
        </p>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList className="rounded-xl bg-surface-low p-1">
          <TabsTrigger value="lista">Lista de personal</TabsTrigger>
          <TabsTrigger value="importar">Importar turno (Excel)</TabsTrigger>
          <TabsTrigger value="aprobacion-turnos">Aprobación de Turnos</TabsTrigger>
          <TabsTrigger value="asignacion">Asignacion RFID/Habitacion</TabsTrigger>
        </TabsList>

        <TabsContent value="aprobacion-turnos" className="space-y-4">
          <TurnosClient pendientes={turnosPendientes} />
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <div className="rounded-sm border-none bg-surface-low p-6 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por nombre, documento, empresa, cargo o RFID"
                className="h-10 md:max-w-md bg-surface border-b-2 border-transparent focus:border-primary rounded-none shadow-inner"
              />
              <div className="flex items-center gap-3">
                <div className="flex bg-surface border border-border p-1 rounded-lg">
                  <button 
                    onClick={() => { setListFilter('activos'); setPage(1); }}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-tight rounded-md transition-colors ${listFilter === 'activos' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-surface-low'}`}
                  >
                    Activos
                  </button>
                  <button 
                    onClick={() => { setListFilter('inactivos'); setPage(1); }}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-tight rounded-md transition-colors ${listFilter === 'inactivos' ? 'bg-secondary text-white' : 'text-muted-foreground hover:bg-surface-low'}`}
                  >
                    Inactivos
                  </button>
                  <button 
                    onClick={() => { setListFilter('todos'); setPage(1); }}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-tight rounded-md transition-colors ${listFilter === 'todos' ? 'bg-surface-highest text-foreground border border-border' : 'text-muted-foreground hover:bg-surface-low'}`}
                  >
                    Todos
                  </button>
                </div>
                <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground border border-muted px-3 py-1.5 rounded-sm">
                  {filteredWorkers.length} {listFilter}
                </div>
                {selectedWorkerIds.size > 0 && (
                  <div className="flex gap-2">
                    {selectedWorkerIds.size === 2 && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleSwapRooms}
                        disabled={crudPending}
                        className="font-bold shadow-md"
                      >
                        Intercambiar Habitaciones
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleBulkCheckout}
                      disabled={crudPending}
                      className="font-bold shadow-md shadow-destructive/20"
                    >
                      Check-out Seleccionados ({selectedWorkerIds.size})
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-sm border-none shadow-md overflow-hidden bg-surface">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-highest border-b-2 border-surface-lowest">
                    <TableHead className="w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-primary/50 cursor-pointer accent-primary"
                        onChange={toggleAllSelected}
                        checked={paginatedWorkers.filter(w => w.activo).length > 0 && selectedWorkerIds.size === paginatedWorkers.filter(w => w.activo).length}
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Nombre</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Cédula</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Empresa</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Tipo Cargo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Cargo</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Días Turno</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Género</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">UID RFID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Habitación</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Estado</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Check-in</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary">Check-out</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWorkers.map((worker) => (
                    <TableRow key={worker.id} className={!worker.activo ? 'opacity-50 grayscale bg-surface-low' : ''}>
                      <TableCell className="text-center">
                        {worker.activo ? (
                          <input 
                            type="checkbox" 
                            className="rounded border-primary/50 cursor-pointer accent-primary"
                            checked={selectedWorkerIds.has(worker.id)}
                            onChange={() => toggleWorkerSelection(worker.id)}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">{worker.nombre_completo}</TableCell>
                      <TableCell className="font-mono text-xs">{worker.documento_identidad}</TableCell>
                      <TableCell>{companySigla(worker)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          worker.tipo_cargo === 'administrativo' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {worker.tipo_cargo || 'Operativo'}
                        </span>
                      </TableCell>
                      <TableCell>{worker.cargo}</TableCell>
                      <TableCell className="text-xs">{worker.dias_turno || '-'}</TableCell>
                      <TableCell className="text-xs">{worker.genero || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {worker.rfid_uid || 'Sin UID'}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-primary">
                        {worker.habitacion_id || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${worker.activo ? 'bg-success/10 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                          {worker.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {hasMounted ? formatDateTime(worker.fecha_ingreso_turno) : '---'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {worker.activo ? '-' : (hasMounted ? formatDateTime(worker.fecha_salida_turno || null) : '---')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {worker.activo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(worker)}
                              disabled={crudPending}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                            </Button>
                          )}
                          {worker.activo && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteWorker(worker)}
                              disabled={crudPending}
                            >
                              Check-out
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedWorkers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No hay resultados para el filtro actual.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>

          {crudResult ? (
            <Alert variant={crudResult.ok ? 'default' : 'destructive'}>
              <AlertTitle>{crudResult.ok ? 'Operacion completada' : 'Operacion con errores'}</AlertTitle>
              <AlertDescription>
                <p>{crudResult.message}</p>
                {crudResult.errors.length > 0 ? (
                  <p className="mt-1">Errores: {crudResult.errors.join(' | ')}</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </TabsContent>

        <TabsContent value="importar" className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-sm">
            <ExcelDropzone
              onParsed={(rows, fileName) => {
                setParsedWorkers(rows)
                setParsedFileName(fileName)
                setImportResult(null)
              }}
              disabled={importPending}
            />

            <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm">
              <p>
                Archivo actual: <span className="font-semibold">{parsedFileName || 'No seleccionado'}</span>
              </p>
              <p className="mt-1">Filas listas para RPC: {parsedWorkers.length}</p>
            </div>

            {parsedWorkers.length > 0 ? (
              <div className="mt-4 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>RFID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedWorkers.slice(0, 8).map((worker, index) => (
                      <TableRow key={`${worker.documento_identidad}-${index}`}>
                        <TableCell>{worker.nombre_completo}</TableCell>
                        <TableCell>{worker.documento_identidad}</TableCell>
                        <TableCell>{worker.empresa}</TableCell>
                        <TableCell>{worker.cargo}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {worker.rfid_uid || 'Sin UID'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleProcessImport}
                disabled={importPending || parsedWorkers.length === 0}
                className="bg-gradient-to-r from-primary to-primary-2 text-primary-foreground hover:opacity-95"
              >
                {importPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  'Procesar cambio de turno'
                )}
              </Button>
            </div>
          </div>

          {importResult ? (
            <Alert variant={importResult.ok ? 'default' : 'destructive'}>
              <AlertTitle>{importResult.ok ? 'Importacion completada' : 'Importacion con errores'}</AlertTitle>
              <AlertDescription>
                <p className="font-medium">{importResult.rpcSummaryText}</p>
                <p className="mt-1">{importResult.message}</p>
                <p className="mt-1">
                  Empresas procesadas: {importResult.processedCompanies.join(', ') || 'Ninguna'}
                </p>
                {importResult.unknownCompanies.length > 0 ? (
                  <p className="mt-1">
                    Empresas sin match: {importResult.unknownCompanies.join(', ')}
                  </p>
                ) : null}
                {importResult.errors.length > 0 ? (
                  <p className="mt-1">Errores: {importResult.errors.join(' | ')}</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </TabsContent>

        <TabsContent value="asignacion" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sin habitacion</p>
              <p className="mt-2 text-2xl font-bold">{assignments.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Con sugerencia lista</p>
              <p className="mt-2 text-2xl font-bold text-success">{readyAssignments.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sin cupo disponible</p>
              <p className="mt-2 text-2xl font-bold text-secondary">{missingAssignments}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Asignacion sugerida por empresa</h2>
              <Button
                variant="outline"
                onClick={() => setAssignments(initialSuggestions)}
                disabled={assignmentPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Recalcular
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operario</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Habitacion sugerida</TableHead>
                    <TableHead>UID RFID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment, index) => (
                    <TableRow key={assignment.operario_id}>
                      <TableCell className="font-medium">{assignment.nombre_completo}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {assignment.empresa_sigla}
                        </span>
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                          value={assignment.habitacion_id}
                          onChange={(event) => {
                            const next = [...assignments]
                            next[index] = {
                              ...next[index],
                              habitacion_id: event.target.value,
                            }
                            setAssignments(next)
                          }}
                        >
                          <option value="">Sin sugerencia</option>
                          {availableRoomOptions.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.id} ({room.bloque_id}, piso {room.piso})
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={assignment.rfid_uid}
                          placeholder="UID RFID"
                          onChange={(event) => {
                            const next = [...assignments]
                            next[index] = {
                              ...next[index],
                              rfid_uid: event.target.value,
                            }
                            setAssignments(next)
                          }}
                          className="font-mono text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  ))}

                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay operarios activos pendientes por asignar.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Las sugerencias agrupan operarios por empresa y llenan habitaciones disponibles por capacidad.
              </p>

              <Button
                onClick={handleApplyAssignments}
                disabled={assignmentPending || readyAssignments.length === 0}
                className="bg-gradient-to-r from-primary to-primary-2 text-primary-foreground hover:opacity-95"
              >
                {assignmentPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Aplicando...
                  </>
                ) : (
                  `Confirmar y aplicar (${readyAssignments.length})`
                )}
              </Button>
            </div>
          </div>

          {assignmentResult ? (
            <Alert variant={assignmentResult.ok ? 'default' : 'destructive'}>
              <AlertTitle>{assignmentResult.ok ? 'Asignaciones aplicadas' : 'Asignaciones parciales'}</AlertTitle>
              <AlertDescription>
                <p>{assignmentResult.message}</p>
                {assignmentResult.errors.length > 0 ? (
                  <p className="mt-1">Errores: {assignmentResult.errors.join(' | ')}</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(editingWorker)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingWorker(null)
            setEditForm(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[550px] rounded-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface border-border shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/50 bg-surface-low/30">
            <DialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-xl font-bold">
              Editar Operario
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ajuste los datos del personal para mantener la integridad del turno.
            </DialogDescription>
          </DialogHeader>

          {editForm ? (
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Nombre Completo</Label>
                  <Input
                    value={editForm.nombre_completo}
                    onChange={(event) => setEditForm(p => p ? { ...p, nombre_completo: event.target.value } : p)}
                    className="h-10 rounded-lg bg-background border-border focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Documento</Label>
                  <Input
                    value={editForm.documento_identidad}
                    onChange={(event) => setEditForm(p => p ? { ...p, documento_identidad: event.target.value } : p)}
                    className="h-10 rounded-lg bg-background font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Cargo</Label>
                  <Input
                    value={editForm.cargo}
                    onChange={(event) => setEditForm(p => p ? { ...p, cargo: event.target.value } : p)}
                    className="h-10 rounded-lg bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Empresa</Label>
                  <select
                    value={editForm.empresa_id}
                    onChange={(event) => setEditForm(p => p ? { ...p, empresa_id: event.target.value } : p)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-bold outline-none focus:border-primary shadow-sm"
                  >
                    {companyOptions.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.sigla}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">UID RFID</Label>
                  <Input
                    value={editForm.rfid_uid}
                    onChange={(event) => setEditForm(p => p ? { ...p, rfid_uid: event.target.value } : p)}
                    className="h-10 rounded-lg bg-background font-mono text-xs text-primary"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 border-t border-border pt-4 mt-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-secondary ml-1 mb-2 block">Detalles del Turno</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Días de Turno</Label>
                      <Input
                        value={editForm.dias_turno || ''}
                        onChange={(event) => setEditForm(p => p ? { ...p, dias_turno: event.target.value } : p)}
                        placeholder="Ej. 14x7"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Género</Label>
                      <select
                        value={editForm.genero || ''}
                        onChange={(event) => setEditForm(p => p ? { ...p, genero: event.target.value } : p)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold outline-none focus:border-primary shadow-sm"
                      >
                        <option value="">No especificado</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Habitación Actual</Label>
                  <select
                    value={editForm.habitacion_id}
                    onChange={(event) => setEditForm(p => p ? { ...p, habitacion_id: event.target.value } : p)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold font-mono outline-none focus:border-primary shadow-sm"
                  >
                    <option value="">Sin asignar</option>
                    {roomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.id} ({room.bloque_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Tipo Cargo</Label>
                  <Input
                    value={editForm.tipo_cargo || ''}
                    onChange={(event) => setEditForm(p => p ? { ...p, tipo_cargo: event.target.value } : p)}
                    className="h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 border-t border-border pt-4 mt-2">
                   <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Fecha Ingreso</Label>
                   <Input
                    type="date"
                    value={editForm.fecha_ingreso_turno ? editForm.fecha_ingreso_turno.split('T')[0] : ''}
                    onChange={(event) => setEditForm(p => p ? { ...p, fecha_ingreso_turno: event.target.value ? new Date(event.target.value).toISOString() : null } : p)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 border-t border-border pt-4 mt-2">
                   <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Fecha Salida</Label>
                   <Input
                    type="date"
                    value={editForm.fecha_salida_turno ? editForm.fecha_salida_turno.split('T')[0] : ''}
                    onChange={(event) => setEditForm(p => p ? { ...p, fecha_salida_turno: event.target.value ? new Date(event.target.value).toISOString() : null } : p)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="px-6 py-4 bg-background border-t border-border flex sm:justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditingWorker(null)
                setEditForm(null)
              }}
              disabled={crudPending}
              className="rounded-lg h-10 px-6 font-bold uppercase text-[11px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateWorker}
              disabled={crudPending || !editForm}
              className="rounded-lg bg-primary hover:bg-primary/90 text-background font-bold h-10 px-8 uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20"
            >
              {crudPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}