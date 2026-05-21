'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Phone, 
  Mail, 
  Plus, 
  Hash, 
  Palette, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  User,
  BarChart3,
  Settings2,
  DollarSign,
  X
} from 'lucide-react'
import { upsertEmpresaAction, getLogisticByEmpresaAction } from './actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Tarifa {
  id?: string
  tipo_servicio: string
  valor_unitario: number
  tipo_impuesto?: string
  porcentaje_impuesto?: number
}

interface Empresa {
  id: string
  nombre_completo: string
  sigla: string
  nit: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  contacto_email: string | null
  color_hex: string | null
  activa: boolean | null
  tarifas_empresa?: Tarifa[]
}

const SERVICIOS_BASE = [
  { nombre: 'Hospedaje',   emoji: '🏠', defPrecio: 80000,  defImpuesto: 'IVA 19%',          defPorcentaje: 0.19 },
  { nombre: 'Desayuno',   emoji: '☕', defPrecio: 27000,  defImpuesto: 'Impoconsumo 8%',    defPorcentaje: 0.08 },
  { nombre: 'Almuerzo',   emoji: '🍽️', defPrecio: 28500,  defImpuesto: 'Impoconsumo 8%',    defPorcentaje: 0.08 },
  { nombre: 'Cena',       emoji: '🌙', defPrecio: 27000,  defImpuesto: 'Impoconsumo 8%',    defPorcentaje: 0.08 },
  { nombre: 'Lavandería', emoji: '👕', defPrecio: 13500,  defImpuesto: 'IVA 19%',           defPorcentaje: 0.19 },
]

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ── Campo estilo "Editar Operario" ─────────────────────────────────────────
function Field({
  label,
  children,
  className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        {label}
      </span>
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-background px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15',
        className
      )}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
export function EmpresasClient({ initialEmpresas }: { initialEmpresas: Empresa[] }) {
  const router = useRouter()
  const [empresas, setEmpresas] = useState(initialEmpresas)

  useEffect(() => {
    setEmpresas(initialEmpresas)
  }, [initialEmpresas])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Partial<Empresa> | null>(null)
  const [editingTarifas, setEditingTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(false)
  const [logisticData, setLogisticData] = useState<any>(null)
  const [loadingLogistic, setLoadingLogistic] = useState(false)

  useEffect(() => {
    if (editingEmpresa?.id && isModalOpen) {
      setLoadingLogistic(true)
      getLogisticByEmpresaAction(editingEmpresa.id).then(res => {
        if (res.ok) setLogisticData(res.data)
        setLoadingLogistic(false)
      })
    } else {
      setLogisticData(null)
    }
  }, [editingEmpresa?.id, isModalOpen])

  const openAddModal = () => {
    setEditingEmpresa({ nombre_completo: '', sigla: '', nit: '', contacto_nombre: '', contacto_telefono: '', contacto_email: '', color_hex: '#005d6a', activa: true })
    setEditingTarifas([])
    setIsModalOpen(true)
  }

  const openEditModal = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    // Map existing tariffs and fill missing tax info from SERVICIOS_BASE if columns are missing
    const enriched = (empresa.tarifas_empresa || []).map(t => ({
      ...t
    }))
    setEditingTarifas(enriched)
    setIsModalOpen(true)
  }

  const handleToggleService = (srv: typeof SERVICIOS_BASE[number], checked: boolean) => {
    if (checked) {
      setEditingTarifas(prev => [...prev, { tipo_servicio: srv.nombre, valor_unitario: srv.defPrecio }])
    } else {
      setEditingTarifas(prev => prev.filter(t => t.tipo_servicio !== srv.nombre))
    }
  }

  const handleTarifaChange = (nombre: string, field: keyof Tarifa, val: any) => {
    setEditingTarifas(prev => prev.map(t => {
      if (t.tipo_servicio !== nombre) return t
      return { ...t, [field]: val }
    }))
  }

  const handleSubmit = async () => {
    if (!editingEmpresa) return
    setLoading(true)
    const result = await upsertEmpresaAction({ ...editingEmpresa, tarifas_empresa: editingTarifas } as any)
    if (result.ok) { setIsModalOpen(false); window.location.reload() }
    else { alert(result.message); setLoading(false) }
  }

  const set = (field: keyof Empresa, val: any) =>
    setEditingEmpresa(prev => ({ ...prev, [field]: val }))

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── PAGE HEADER ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Empresas Contratistas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Aliados estratégicos y convenios industriales activos.
          </p>
        </div>
        <Button onClick={openAddModal} className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-background text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 gap-2">
          <Plus className="h-4 w-4" /> Nueva Empresa
        </Button>
      </header>

      {/* ── GRID DE CARDS ── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {empresas.length > 0 ? empresas.map(empresa => (
          <article
            key={empresa.id}
            className="relative rounded-2xl bg-surface border border-border hover:border-primary/40 hover:shadow-md transition-all group overflow-hidden"
          >
            {/* Barra de color superior */}
            <div className="h-1.5 w-full" style={{ backgroundColor: empresa.color_hex || '#005d6a' }} />

            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="h-11 px-4 min-w-[3rem] shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
                  style={{ backgroundColor: empresa.color_hex || '#005d6a' }}
                >
                  {empresa.sigla || <Building2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    title={empresa.nombre_completo}
                  >
                    {empresa.nombre_completo}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{empresa.sigla}</span>
                    <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full border',
                      empresa.activa
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-surface-low text-muted-foreground border-border'
                    )}>
                      {empresa.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-5 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">NIT</span>
                  <span className="font-mono font-bold text-foreground">{empresa.nit || '—'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Servicios Pac.</span>
                  <span className="font-bold text-primary">{empresa.tarifas_empresa?.length || 0} configurados</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => openEditModal(empresa)}
                  variant="outline"
                  className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all gap-1.5"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Configurar
                </Button>
                <Button
                  onClick={() => router.push(`/consolidado?empresa=${empresa.id}`)}
                  variant="outline"
                  className="h-9 w-9 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all p-0 shrink-0"
                  title="Ver Consolidado"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>
        )) : (
          <article className="rounded-2xl bg-surface border border-dashed border-border grid place-items-center p-14 text-center lg:col-span-2 xl:col-span-3">
            <div className="h-16 w-16 rounded-full bg-surface-low flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">Directorio vacío</p>
          </article>
        )}
      </section>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-5xl w-full max-h-[85vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden bg-surface border-border shadow-2xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2 border-b border-border/50 bg-surface-low/30">
            <DialogTitle style={{ fontFamily: 'Space Grotesk, sans-serif' }} className="text-xl font-bold tracking-tight">
              {editingEmpresa?.id ? `Gestión: ${editingEmpresa?.nombre_completo}` : 'Nueva Empresa Industrial'}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
              Configuración de Identidad y Matriz de Tarifas Comerciales.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              
              {/* COLUMNA IZQUIERDA: IDENTIDAD (4/12) */}
              <div className="lg:col-span-4 border-r border-border/50 p-6 space-y-6">
                <section>
                   <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-5 flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4" /> Identidad Corporativa
                   </Label>
                   <div className="space-y-4">
                     <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Razón Social</Label>
                       <Input
                         value={editingEmpresa?.nombre_completo || ''}
                         onChange={e => set('nombre_completo', e.target.value)}
                         className="h-10 rounded-lg bg-background border-border font-bold text-sm"
                         placeholder="Ej. MASA STORK S.A.S"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Sigla</Label>
                         <Input
                           value={editingEmpresa?.sigla || ''}
                           onChange={e => set('sigla', e.target.value.toUpperCase())}
                           className="h-10 rounded-lg bg-background border-border font-black text-xs"
                           placeholder="SIGLA"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Color HEX</Label>
                         <div className="flex gap-2">
                            <Input
                              type="color"
                              value={editingEmpresa?.color_hex || '#005d6a'}
                              onChange={e => set('color_hex', e.target.value)}
                              className="h-10 w-12 p-1 rounded-lg border-border cursor-pointer shadow-inner"
                            />
                            <Input
                              value={editingEmpresa?.color_hex || ''}
                              onChange={e => set('color_hex', e.target.value)}
                              className="h-10 flex-1 rounded-lg text-xs font-mono"
                              placeholder="#HEX"
                            />
                         </div>
                       </div>
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">NIT / ID Fiscal</Label>
                       <Input
                         value={editingEmpresa?.nit || ''}
                         onChange={e => set('nit', e.target.value)}
                         className="h-10 rounded-lg bg-background border-border font-mono text-xs"
                         placeholder="000.000.000-0"
                       />
                     </div>
                   </div>
                </section>

                <section className="pt-6 border-t border-border/50">
                   <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary mb-5 flex items-center gap-2">
                     <User className="h-4 w-4" /> Punto de Contacto
                   </Label>
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Responsable</Label>
                        <Input
                          value={editingEmpresa?.contacto_nombre || ''}
                          onChange={e => set('contacto_nombre', e.target.value)}
                          className="h-9 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Teléfono</Label>
                        <Input
                          value={editingEmpresa?.contacto_telefono || ''}
                          onChange={e => set('contacto_telefono', e.target.value)}
                          className="h-9 rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Email</Label>
                        <Input
                          value={editingEmpresa?.contacto_email || ''}
                          onChange={e => set('contacto_email', e.target.value)}
                          className="h-9 rounded-lg lowercase text-xs"
                        />
                      </div>
                   </div>
                </section>
              </div>

              {/* COLUMNA DERECHA: TARIFAS (8/12) */}
              <div className="lg:col-span-8 p-6 bg-surface-low/30 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Matriz de Servicios Pactados
                  </Label>
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-200/50 rounded-lg flex flex-col items-end shadow-sm">
                    <span className="text-[8px] font-black uppercase text-emerald-600/70 tracking-widest">Inversión Diaria / Persona</span>
                    <span className="text-xl font-black text-emerald-700 tabular-nums font-mono">
                      ${formatCOP(editingTarifas.reduce((s, t) => s + t.valor_unitario, 0))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERVICIOS_BASE.map((srv, index) => {
                    const tarifa = editingTarifas.find(t => t.tipo_servicio === srv.nombre)
                    const isEnabled = !!tarifa

                    return (
                      <div 
                        key={index} 
                        className={cn(
                          "rounded-xl border p-4 transition-all duration-300 relative group overflow-hidden",
                          isEnabled 
                            ? "bg-background border border-primary/20 shadow-md ring-1 ring-primary/5" 
                            : "bg-surface-low/50 border-border/40 opacity-50 hover:opacity-80"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center text-lg border transition-colors shadow-inner",
                              isEnabled ? "bg-primary/5 border-primary/20" : "bg-white border-border"
                            )}>
                              {srv.emoji}
                            </div>
                            <Label className={cn("text-[11px] font-black uppercase tracking-wider", isEnabled ? "text-slate-900" : "text-muted-foreground")}>
                              {srv.nombre}
                            </Label>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleService(srv, !isEnabled)}
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center border-2 transition-all",
                              isEnabled ? "bg-primary border-primary text-white" : "border-slate-300 bg-white hover:border-primary/40"
                            )}
                          >
                            {isEnabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-slate-300" />}
                          </button>
                        </div>

                        {isEnabled ? (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                               <Label className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Valor Unitario</Label>
                               <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60 z-10">$</span>
                                 <Input
                                   type="number"
                                   value={tarifa.valor_unitario}
                                   onChange={e => handleTarifaChange(srv.nombre, 'valor_unitario', Number(e.target.value))}
                                   className="h-10 pl-6 pr-2 rounded-lg font-black text-sm text-primary bg-slate-50 border-slate-200 focus:bg-white"
                                 />
                               </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[52px] flex items-center justify-center">
                            <span className="text-[9px] font-black uppercase text-muted-foreground/20 tracking-[0.2em]">Servicio no habilitado</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 p-4 rounded-xl border border-dashed border-border bg-background/50">
                   <div className="flex items-start gap-3">
                     <AlertCircle className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                     <p className="text-[9px] font-medium text-muted-foreground uppercase leading-relaxed tracking-tighter">
                       Las tarifas configuradas impactan directamente en el consolidado de facturación y auditoría. Asegúrese de que los valores coincidan con el contrato vigente.
                     </p>
                   </div>
                </div>
              </div>

            </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-border bg-surface-low/30 flex items-center justify-end gap-3">
            <Button 
               variant="ghost" 
               onClick={() => setIsModalOpen(false)} 
               disabled={loading}
               className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="h-10 px-8 rounded-xl bg-primary hover:bg-primary/90 text-background font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Guardando...' : editingEmpresa?.id ? 'Guardar Cambios' : 'Registrar Empresa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
