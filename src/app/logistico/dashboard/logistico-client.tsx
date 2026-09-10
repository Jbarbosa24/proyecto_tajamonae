'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Users, BedDouble, Calendar, Search, Info, LogIn, LogOut, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ExcelDropzone, type ParsedExcelWorker } from '@/components/hotel/excel-dropzone'

interface DetailRecord {
  id: string
  tipo: string
  fecha: string
  hora: string
  operario: string
  empresa: string
  cedula?: string
  cargo?: string
}

interface LogisticoClientProps {
  empresaStat: any
  resumen: any[]
  detailedHistory: DetailRecord[]
  desde: string
  hasta: string
  alojados: any[]
  alojadosCount: number
}

export function LogisticoClient({ 
  empresaStat, 
  resumen, 
  detailedHistory, 
  desde, 
  hasta,
  alojados,
  alojadosCount
}: LogisticoClientProps) {
  
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 10000)
    return () => clearInterval(interval)
  }, [router])

  const [activeTab, setActiveTab] = useState<'consolidado' | 'personal' | 'turnos'>('consolidado')
  const [search, setSearch] = useState('')
  const [modalData, setModalData] = useState<{titulo: string, list: DetailRecord[]} | null>(null)

  const [entrantesList, setEntrantesList] = useState<any[]>([])
  const [turnoSalientes, setTurnoSalientes] = useState<string[]>([])
  const [enviandoTurno, setEnviandoTurno] = useState(false)

  const handleEnviarTurno = async () => {
    try {
      setEnviandoTurno(true)
      const entrantesParsed = entrantesList.filter(e => e.nombre_completo && e.documento_identidad)
      
      const operariosSalientesObjects = turnoSalientes.map(id => {
        const op = alojados.find(a => a.id === id)
        return op ? { id: op.id, nombre_completo: op.nombre_completo, cargo: op.cargo, habitacion_id: op.habitacion_id } : id
      })

      const payload = {
        empresa_id: empresaStat.id,
        archivo_nombre: `Turno Manual ${new Date().toLocaleDateString()}`,
        operarios_entrantes: entrantesParsed,
        operarios_salientes: operariosSalientesObjects,
      }

      const res = await fetch('/api/logistico/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(res.ok) {
        alert("Turno enviado al administrador para revisión.")
        setEntrantesList([])
        setTurnoSalientes([])
      } else {
        alert("Error enviando turno")
      }
    } catch(err) {
      console.error(err)
      alert("Error enviando turno")
    } finally {
      setEnviandoTurno(false)
    }
  }

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/Consolidado_base.xlsx')
      const arrayBuffer = await response.arrayBuffer()

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.worksheets[0]

      // Llenar datos cabecera
      sheet.getCell('I7').value = empresaStat.nombre
      sheet.getCell('G8').value = `${desde} al ${hasta}`

      // Agrupar historia por fecha
      const agrupado = new Map<string, { hospedaje: number, lavanderia: number }>()

      // Inicializar dias en rango
      const dInicio = new Date(desde + 'T00:00:00')
      const dFin = new Date(hasta + 'T00:00:00')
      for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
         const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
         agrupado.set(dateStr, { hospedaje: 0, lavanderia: 0 })
      }

      for (const rec of detailedHistory) {
         if (agrupado.has(rec.fecha)) {
             const ag = agrupado.get(rec.fecha)!
             if (rec.tipo === 'Lavandería') ag.lavanderia += 1
             else if (rec.tipo === 'Hospedaje') ag.hospedaje += 1
         }
      }

      // Escribir en base a la fila 10
      let rowNum = 10
      for (const [date, counts] of Array.from(agrupado.entries())) {
          sheet.getCell(`C${rowNum}`).value = date
          sheet.getCell(`D${rowNum}`).value = counts.hospedaje
          sheet.getCell(`E${rowNum}`).value = counts.hospedaje
          sheet.getCell(`F${rowNum}`).value = counts.lavanderia
          rowNum++
      }

      const bufferOut = await workbook.xlsx.writeBuffer()
      const blob = new Blob([bufferOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Consolidado_${empresaStat.nombre.replace(/\s+/g, '_')}_${desde}_AL_${hasta}.xlsx`)
      
    } catch(err) {
      console.error(err)
      alert("No se pudo exportar el Excel. Asegurate de que Consolidado_base.xlsx exista.")
    }
  }

  const granSubtotalConsolidado = resumen.reduce((acc, obj) => acc + obj.subtotalBruto, 0)
  const granTotalConsolidado = resumen.reduce((acc, obj) => acc + obj.totalConImpuesto, 0)

  return (
    <div className="space-y-6">
      
      {/* Tarjetería principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
           className="bg-surface hover:bg-surface-low cursor-pointer transition-colors rounded-xl border border-border p-5 shadow-sm" 
           title="Clic interactivamente para el detalle de alojados."
           onClick={() => setModalData({ titulo: 'Personal Alojado', list: alojados.map(a => ({ id: a.id, fecha: '', hora: '', tipo: 'Hospedaje Activo', operario: a.nombre_completo, cedula: a.documento_identidad, cargo: a.cargo, empresa: empresaStat.nombre })) })}
        >
           <div className="flex items-center gap-3 mb-2">
             <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><Users className="h-5 w-5"/></div>
             <div>
               <div className="flex items-center gap-1">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alojados</p>
                 <Info className="h-3 w-3 text-muted-foreground/60" />
               </div>
               <h3 className="text-2xl font-black">{alojadosCount}</h3>
             </div>
           </div>
        </div>

        <div 
           className="bg-surface hover:bg-surface-low cursor-pointer transition-colors rounded-xl border border-border p-5 shadow-sm" 
           title="Clic interactivo."
           onClick={() => setModalData({ titulo: 'Todos los Servicios del Período', list: detailedHistory })}
        >
           <div className="flex items-center gap-3 mb-2">
             <div className="h-10 w-10 bg-[#005d6a]/10 rounded-lg flex items-center justify-center text-[#005d6a]"><Calendar className="h-5 w-5"/></div>
             <div>
               <div className="flex items-center gap-1">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Servicios Período</p>
                 <Info className="h-3 w-3 text-muted-foreground/60" />
               </div>
               <h3 className="text-2xl font-black">{empresaStat.hospedaje + empresaStat.lavanderia}</h3>
             </div>
           </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm md:col-span-1 lg:col-span-1" title="Número total de mudas lavadas y entregadas al personal.">
             <div className="flex items-center justify-between mb-1">
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lavandería Entregada</p>
               <Info className="h-3 w-3 text-muted-foreground/60" />
             </div>
             <h3 className="text-sm font-bold text-right flex justify-end gap-2 items-center">{empresaStat.lavanderia} <span className="text-[9px] text-muted-foreground font-black">UNIDADES</span></h3>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm ring-1 ring-primary/20 bg-primary/5" title="Suma total de cobranza incluyendo impuestos aplicables de todos los servicios del período.">
             <div className="flex items-center justify-between mb-1">
               <p className="text-[10px] font-black uppercase text-primary tracking-widest">Total Liquidado</p>
               <Info className="h-3 w-3 text-primary/60" />
             </div>
             <h3 className="text-2xl font-black text-right text-primary">{formatCOP(granTotalConsolidado)}</h3>
        </div>
      </div>

      <div className="flex bg-surface-low border border-border rounded-xl p-1 mb-6 w-fit mx-auto lg:mx-0">
          <button 
           onClick={() => setActiveTab('consolidado')}
           className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'consolidado' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-surface'}`}>
             Consolidado
          </button>
          <button 
           onClick={() => setActiveTab('personal')}
           className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'personal' ? 'bg-[#005d6a] text-white shadow-md' : 'text-muted-foreground hover:bg-surface'}`}>
             Ubicación de Personal
          </button>
          <button 
           onClick={() => setActiveTab('turnos')}
           className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'turnos' ? 'bg-[#005d6a] text-white shadow-md' : 'text-muted-foreground hover:bg-surface'}`}>
             Turnos
          </button>
      </div>

      {activeTab === 'consolidado' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-surface rounded-xl border border-border shadow-soft overflow-hidden">
                <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-surface-low/30">
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Distribución de Costos Totales</h2>
                <Button 
                    onClick={handleExportExcel}
                    className="text-[10px] font-bold uppercase h-9 shadow-sm"
                >
                    <Download className="mr-2 h-4 w-4" /> Exportar Informe
                </Button>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-background/80">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Servicio</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 text-center">Cantidad</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Tarifa Unit.</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-6 text-primary">Total (COP)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {resumen.map((item) => (
                            <TableRow key={item.servicio} className="group hover:bg-primary/[0.02]">
                              <TableCell className="px-6 py-4 font-bold text-sm">
                                  <span className="h-2 w-2 rounded-full inline-block mr-2" style={{ background: item.dot }} />
                                  {item.servicio}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-xs font-black text-center">{item.cantidad || 0}</TableCell>
                              <TableCell className="px-6 py-4 font-mono text-[11px]">{formatCOP(item.subtotalBruto ? (item.subtotalBruto / item.cantidad) : 0)}</TableCell>
                              <TableCell className="px-6 py-4 text-right font-black text-primary/80">{formatCOP(item.totalConImpuesto)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-surface-low border-t-2 border-border/50">
                            <TableCell colSpan={3} className="px-6 py-4 text-sm font-black uppercase tracing-widest text-muted-foreground">
                            Subtotal Sin Impuestos
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right font-mono font-bold">
                            {formatCOP(granSubtotalConsolidado)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/[0.03] border-t border-primary/20">
                            <TableCell colSpan={3} className="px-6 py-4 text-sm font-black uppercase tracing-widest text-primary">
                            Gran Total Cobro
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right font-black text-xl text-primary">
                            {formatCOP(granTotalConsolidado)}
                            </TableCell>
                        </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
            
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="border-b border-border px-6 py-4 bg-surface-low/30">
                  <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Historial Detallado de Registros</h2>
                </div>
                <div className="max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur shadow-sm z-10">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Fecha</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Hora</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Persona</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Documento</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Cargo</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-6">Servicio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {detailedHistory.slice(0, 150).map((r) => (
                             <TableRow key={r.id}>
                                <TableCell className="font-mono text-xs">{r.fecha}</TableCell>
                                <TableCell className="font-mono text-xs text-primary">{r.hora}</TableCell>
                                <TableCell className="text-sm font-semibold">{r.operario}</TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">{r.cedula}</TableCell>
                                <TableCell className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{r.cargo}</TableCell>
                                <TableCell className="text-right">
                                    <span className="px-2 py-1 rounded-md bg-surface-low text-[9px] font-black uppercase tracking-tight border border-border inline-block">
                                        {r.tipo}
                                    </span>
                                </TableCell>
                             </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="bg-surface rounded-xl border border-border shadow-soft p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase">Control de Ubicación</h2>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Verifica en qué habitación se encuentra cada empleado registrado e ingresado al campamento.</p>
                    </div>
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar operario por nombre..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-background border-border pl-10" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {alojados.filter(h => h.nombre_completo.toLowerCase().includes(search.toLowerCase())).map((op) => (
                        <div key={op.id} className="border border-border/80 bg-background hover:bg-surface-low transition-colors rounded-xl p-4 shadow-sm flex flex-col justify-between h-32">
                            <div>
                                <h3 className="font-bold text-sm tracking-tight text-foreground line-clamp-2">{op.nombre_completo}</h3>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{op.cargo}</p>
                            </div>
                            <div className="flex items-end justify-between mt-4">
                                <div className="text-[9px] font-black text-primary/70 uppercase tracking-widest">Ubicación Actual</div>
                                <div className="flex items-center gap-1.5 bg-[#005d6a]/10 text-[#005d6a] px-2.5 py-1 rounded-md font-mono text-xs font-bold shadow-sm">
                                   <BedDouble className="h-3 w-3" /> Hab. {op.habitacion_id}
                                </div>
                            </div>
                        </div>
                    ))}
                    {alojados.length === 0 && (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground">
                            <p className="font-bold text-sm">No hay personal de su empresa hospedado actualmente.</p>
                        </div>
                    )}
                </div>
           </div>
        </div>
      )}

      {activeTab === 'turnos' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="bg-surface rounded-xl border border-border shadow-soft p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-black text-foreground uppercase">Gestión de Turnos</h2>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Pre-carga los ingresos y salidas para que el área de administración asigne o libere las habitaciones.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 outline-none focus:outline-none">
                  <div className="space-y-4">
                      <div className="col-span-full">
                       <div className="flex justify-between items-center mb-3">
                         <div>
                            <h3 className="font-bold text-sm text-foreground uppercase tracking-widest flex items-center gap-2 mb-1"><LogIn className="h-4 w-4"/> Pre-Checkin (Ingresos)</h3>
                            <p className="text-[10px] text-muted-foreground">Llena el listado interactivo o carga un archivo Excel. Empresa por defecto: {empresaStat.nombre}</p>
                         </div>
                       </div>
                       
                        <div className="mb-4">
                          <ExcelDropzone 
                            onParsed={(rows) => {
                              const newRows = rows.map(r => ({
                                nombre_completo: r.nombre_completo,
                                documento_identidad: String(r.documento_identidad).trim(),
                                tipo_cargo: 'operativo',
                                cargo: r.cargo || 'Operario',
                                dias_turno: '14',
                                genero: 'M',
                                rfid_uid: r.rfid_uid || ''
                              }))
                              setEntrantesList(prev => [...prev, ...newRows])
                            }} 
                          />
                        </div>
                        
                        <div className="overflow-x-auto border border-border rounded-lg bg-background shadow-inner">
                          <table className="w-full text-xs">
                             <thead>
                               <tr className="bg-surface-low border-b border-border text-left">
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Nombre Completo</th>
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Documento (CC)</th>
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Tipo de Cargo</th>
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Cargo</th>
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Días</th>
                                  <th className="p-3 font-black uppercase tracking-widest text-[9px] text-muted-foreground">Gén.</th>
                                  <th className="p-3 text-center"></th>
                               </tr>
                             </thead>
                             <tbody>
                                {entrantesList.map((row, idx) => (
                                  <tr key={idx} className="border-b last:border-0 border-border/50 hover:bg-surface-low/30 transition-colors">
                                    <td className="p-1"><Input className="h-8 text-xs px-2 border-transparent bg-transparent focus:bg-background focus:ring-1" placeholder="Nombre completo" value={row.nombre_completo} onChange={e => { const n = [...entrantesList]; n[idx].nombre_completo = e.target.value; setEntrantesList(n); }} /></td>
                                    <td className="p-1"><Input className="h-8 text-xs px-2 border-transparent bg-transparent focus:bg-background focus:ring-1" placeholder="Documento" value={row.documento_identidad} onChange={e => { const n = [...entrantesList]; n[idx].documento_identidad = e.target.value; setEntrantesList(n); }} /></td>
                                    <td className="p-1">
                                       <select className="h-8 w-28 text-xs px-2 border-0 bg-transparent outline-none cursor-pointer focus:ring-1 rounded" value={row.tipo_cargo} onChange={e => { const n = [...entrantesList]; n[idx].tipo_cargo = e.target.value; setEntrantesList(n); }}>
                                         <option value="operativo">Operativo</option>
                                         <option value="administrativo">Administrativo</option>
                                       </select>
                                    </td>
                                    <td className="p-1"><Input className="h-8 text-xs px-2 border-transparent bg-transparent focus:bg-background focus:ring-1" placeholder="Cargo" value={row.cargo} onChange={e => { const n = [...entrantesList]; n[idx].cargo = e.target.value; setEntrantesList(n); }} /></td>
                                    <td className="p-1"><Input className="h-8 w-14 text-xs px-2 border-transparent bg-transparent focus:bg-background focus:ring-1 text-center" placeholder="14" value={row.dias_turno} onChange={e => { const n = [...entrantesList]; n[idx].dias_turno = e.target.value; setEntrantesList(n); }} /></td>
                                    <td className="p-1">
                                       <select className="h-8 text-xs px-2 w-full border-0 bg-transparent outline-none cursor-pointer focus:ring-1 rounded" value={row.genero} onChange={e => { const n = [...entrantesList]; n[idx].genero = e.target.value; setEntrantesList(n); }}>
                                         <option value="M">M</option>
                                         <option value="F">F</option>
                                       </select>
                                    </td>
                                    <td className="p-1 text-center">
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setEntrantesList(entrantesList.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4"/></Button>
                                    </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                          {entrantesList.length === 0 && (
                            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                                <Plus className="h-8 w-8 opacity-20" />
                                <p className="font-bold opacity-60">Presiona 'Añadir Fila' o carga un Excel para iniciar el pre-checkin.</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            onClick={() => setEntrantesList([...entrantesList, { nombre_completo: '', documento_identidad: '', cargo: '', genero: 'M', tipo_cargo: 'operativo', dias_turno: '14', rfid_uid: '' }])} 
                            variant="outline" 
                            size="sm" 
                            className="font-black text-[10px] uppercase tracking-widest shadow-sm"
                          >
                             <Plus className="h-3.5 w-3.5 mr-1" /> Añadir Operario
                          </Button>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                       <h3 className="font-bold text-sm text-foreground uppercase tracking-widest flex items-center gap-2 mb-2"><LogOut className="h-4 w-4"/> Pre-Checkout (Salidas)</h3>
                       <p className="text-[10px] text-muted-foreground mb-3">Selecciona al personal alojado actualmente que va a desocupar las habitaciones.</p>
                       <div className="w-full h-40 bg-background border border-border rounded-lg p-3 text-xs overflow-auto space-y-2">
                           {alojados.length === 0 ? <p className="italic text-muted-foreground">No hay personal alojado.</p> : alojados.map(op => (
                             <label key={op.id} className="flex flex-row items-center gap-3 p-2 bg-surface hover:bg-surface-low rounded cursor-pointer border border-border">
                               <input 
                                 type="checkbox" 
                                 className="rounded text-primary focus:ring-primary h-4 w-4"
                                 checked={turnoSalientes.includes(op.id)}
                                 onChange={(e) => {
                                   if(e.target.checked) setTurnoSalientes(prev => [...prev, op.id])
                                   else setTurnoSalientes(prev => prev.filter(i => i !== op.id))
                                 }}
                               />
                               <div className="flex-1 min-w-0">
                                 <p className="font-bold truncate">{op.nombre_completo}</p>
                                 <p className="text-[9px] text-muted-foreground font-mono">Hab: {op.habitacion_id}</p>
                               </div>
                             </label>
                           ))}
                       </div>
                     </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                   <Button 
                      onClick={handleEnviarTurno} 
                      disabled={enviandoTurno || (entrantesList.filter(e => e.nombre_completo && e.documento_identidad).length === 0 && turnoSalientes.length === 0)}
                      className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-black tracking-widest uppercase"
                   >
                     {enviandoTurno ? 'Enviando...' : 'Enviar a Administración'}
                   </Button>
                </div>
           </div>
        </div>
      )}

      {/* Interactive Modal overlay */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface border border-border rounded-xl shadow-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-border bg-surface-low/50">
               <h3 className="font-black text-sm uppercase tracking-widest">{modalData.titulo}</h3>
               <Button variant="ghost" size="sm" onClick={() => setModalData(null)}>Cerrar</Button>
            </div>
            <div className="overflow-auto p-4 flex-1">
               <table className="w-full text-left text-xs">
                 <thead>
                   <tr className="border-b border-border font-bold uppercase tracking-widest text-[#10b981]">
                     <th className="pb-2">Dato Persona</th>
                     <th className="pb-2">Doc / Cargo</th>
                     <th className="pb-2 text-right">Categoría / Fecha</th>
                   </tr>
                 </thead>
                 <tbody>
                    {modalData.list.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 border-border hover:bg-surface-low">
                        <td className="py-3 font-semibold text-sm">{r.operario}</td>
                        <td className="py-3 font-mono text-muted-foreground">
                           {r.cedula}
                           <br />
                           <span className="text-[10px] uppercase font-black">{r.cargo}</span>
                        </td>
                        <td className="py-3 text-right">
                           <span className="px-2 py-0.5 rounded bg-surface border border-border inline-block font-black text-[9px] uppercase tracking-widest mb-1">{r.tipo}</span>
                           {r.fecha && <div className="text-[10px] font-mono">{r.fecha} {r.hora}</div>}
                        </td>
                      </tr>
                    ))}
                    {modalData.list.length === 0 && (
                      <tr><td colSpan={3} className="py-6 text-center text-muted-foreground italic">No hay registros detallados.</td></tr>
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
