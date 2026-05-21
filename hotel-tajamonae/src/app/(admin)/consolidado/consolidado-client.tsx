'use client'

import { useState, useMemo } from 'react'
import { 
  BedDouble, 
  FileSpreadsheet, 
  Utensils, 
  Download, 
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Search
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface EmpresaStat {
  id: string
  nombre: string
  nit: string | null
  color: string
  hospedaje: number
  alimentacion: number
  lavanderia: number
  totalRaw: number
  totalFormatted: string
  activa: boolean
}

interface SummaryRow {
  servicio: string
  dot: string
  cantidad: number
  unidad: string
  subtotalInfo: string
  subtotalBruto: number
  impuestoAsignado: string
  totalConImpuesto: number
}

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface DetailRecord {
  id: string
  tipo: string
  fecha: string
  hora: string
  operario: string
  empresa: string
  es_manual?: boolean
  motivo_manual?: string | null
  valor_base?: number
  porcentaje_impuesto?: number
  valor_impuesto?: number
  valor_total?: number
  registrado_por?: string | null
}

interface ConsolidadoClientProps {
  empresaStats: EmpresaStat[]
  resumen: SummaryRow[]
  detailedHistory: DetailRecord[]
  desde: string
  hasta: string
}

export function ConsolidadoClient({ 
  empresaStats, 
  resumen, 
  detailedHistory, 
  desde, 
  hasta 
}: ConsolidadoClientProps) {
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string
    records: DetailRecord[]
  } | null>(null)
  
  const [detailSearch, setDetailSearch] = useState('')

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const granSubtotalConsolidado = resumen.reduce((acc, obj) => acc + obj.subtotalBruto, 0)
  const granTotalConsolidado = resumen.reduce((acc, obj) => acc + obj.totalConImpuesto, 0)

  // ExcelJS Export Helper — Plantilla base (Consolidado_base.xlsx)
  const downloadExcel = async (title: string, data: DetailRecord[], empresaNombre?: string) => {
    try {
      const response = await fetch('/Consolidado_base.xlsx')
      const arrayBuffer = await response.arrayBuffer()

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.worksheets[0]

      // Llenar datos cabecera
      sheet.getCell('I7').value = empresaNombre || 'COMPILADO GENERAL'
      sheet.getCell('G8').value = `${desde} al ${hasta}`

      // Agrupar historia por fecha
      const agrupado = new Map<string, { hospedaje: number, lavanderia: number }>()

      const dInicio = new Date(desde + 'T00:00:00')
      const dFin = new Date(hasta + 'T00:00:00')
      for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
         const dateStr = d.toISOString().split('T')[0]
         agrupado.set(dateStr, { hospedaje: 0, lavanderia: 0 })
      }

      for (const rec of data) {
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

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `Consolidado_${title.replace(/\s+/g, '_')}_${desde}_AL_${hasta}.xlsx`
      saveAs(blob, fileName)
    } catch(e) {
      console.error(e)
      alert("No se pudo exportar. Verifica que la plantilla Consolidado_base.xlsx exista en public.")
    }
  }

  // Segunda descarga: Reporte Dinámico por Operario con columnas variables por empresa
  const downloadDetalleExcel = async (data: DetailRecord[], empresaNombre?: string) => {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Hotel Tajamonae'
      workbook.created = new Date()

      const sheet = workbook.addWorksheet('Detalle Operarios', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      })

      // Detectar tipos únicos de servicio presentes en los datos
      const tiposUnicos = Array.from(new Set(data.map(r => r.tipo))).sort()

      // Estilo encabezado
      const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005D6A' } }
      const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }

      // Título del reporte
      sheet.mergeCells(1, 1, 1, tiposUnicos.length + 3)
      const titleCell = sheet.getCell('A1')
      titleCell.value = `REPORTE DETALLE — ${(empresaNombre || 'TODAS LAS EMPRESAS').toUpperCase()}`
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF005D6A' } }
      titleCell.alignment = { horizontal: 'center' }

      sheet.mergeCells(2, 1, 2, tiposUnicos.length + 3)
      const dateCell = sheet.getCell('A2')
      dateCell.value = `Período: ${desde} al ${hasta}`
      dateCell.font = { size: 10, italic: true, color: { argb: 'FF888888' } }
      dateCell.alignment = { horizontal: 'center' }

      // Fila vacía
      sheet.addRow([])

      // Encabezados de columna
      const headerRow = sheet.addRow(['Operario', 'Empresa', 'Fecha', ...tiposUnicos])
      headerRow.eachCell(cell => {
        cell.fill = headerFill
        cell.font = headerFont
        cell.border = borderStyle
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      sheet.getRow(4).height = 20

      // Anchos de columnas
      sheet.getColumn(1).width = 30
      sheet.getColumn(2).width = 20
      sheet.getColumn(3).width = 15
      tiposUnicos.forEach((_, i) => {
        sheet.getColumn(i + 4).width = 16
      })

      // Agrupar por operario + fecha
      const grupoPorOperario = new Map<string, { empresa: string, servicios: Record<string, number> }>()
      for (const rec of data) {
        const key = `${rec.operario}|||${rec.fecha}`
        if (!grupoPorOperario.has(key)) {
          grupoPorOperario.set(key, { empresa: rec.empresa, servicios: {} })
        }
        const entry = grupoPorOperario.get(key)!
        entry.servicios[rec.tipo] = (entry.servicios[rec.tipo] || 0) + 1
      }

      // Filas de datos
      let rowIdx = 5
      for (const [key, entry] of Array.from(grupoPorOperario.entries())) {
        const [nombreOp, fecha] = key.split('|||')
        const serviciosRow = tiposUnicos.map(t => entry.servicios[t] || 0)
        const dataRow = sheet.addRow([nombreOp, entry.empresa, fecha, ...serviciosRow])
        dataRow.eachCell(cell => {
          cell.border = borderStyle
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        // Nombre operario alineado izquierda
        dataRow.getCell(1).alignment = { horizontal: 'left' }
        // Zebra
        if (rowIdx % 2 === 0) {
          dataRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FA' } }
          })
        }
        rowIdx++
      }

      // Fila totales
      const totalsRow = sheet.addRow(['TOTAL', '', '', ...tiposUnicos.map(t => data.filter(r => r.tipo === t).length)])
      totalsRow.eachCell(cell => {
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F4' } }
        cell.border = borderStyle
        cell.alignment = { horizontal: 'center' }
      })
      totalsRow.getCell(1).alignment = { horizontal: 'left' }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `Detalle_Operarios_${(empresaNombre || 'General').replace(/\s+/g, '_')}_${desde}_AL_${hasta}.xlsx`
      saveAs(blob, fileName)
    } catch (e) {
      console.error(e)
      alert('No se pudo generar el reporte detallado.')
    }
  }

  const handleShowDetails = (category: string, empresaId?: string) => {
    let filtered = [...detailedHistory]
    let title = category

    if (empresaId) {
       const emp = empresaStats.find(e => e.id === empresaId)
       title = `${category} - ${emp?.nombre || 'Empresa'}`
       filtered = filtered.filter(r => r.empresa === emp?.nombre)
    }

    if (category !== 'Todos') {
      if (category === 'Alimentación') {
        filtered = filtered.filter(r => ['Desayuno', 'Almuerzo', 'Cena'].includes(r.tipo))
      } else {
        filtered = filtered.filter(r => r.tipo === category || (category === 'Alojamiento Doble' && r.tipo === 'Hospedaje'))
      }
    }

    setSelectedDetail({ title, records: filtered })
  }

  const filteredModalRecords = useMemo(() => {
    if (!selectedDetail) return []
    const s = detailSearch.toLowerCase().trim()
    if (!s) return selectedDetail.records
    return selectedDetail.records.filter(r => 
      r.operario.toLowerCase().includes(s) || 
      r.tipo.toLowerCase().includes(s) ||
      r.fecha.includes(s)
    )
  }, [selectedDetail, detailSearch])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Cards de Empresa con Interacción */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {empresaStats.map((emp) => (
          <div 
            key={emp.id} 
            onClick={() => handleShowDetails('Todos', emp.id)}
            className="group bg-surface rounded-xl border border-border p-6 shadow-sm hover:border-primary/40 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-black"
                  style={{ background: emp.color }}
                >
                  {emp.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {emp.nombre}
                  </p>
                  {emp.nit && <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">NIT: {emp.nit}</p>}
                </div>
              </div>
              <div className="h-6 w-6 rounded-full bg-surface-low border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-colors">
                 <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-white" />
              </div>
            </div>

            <div className="space-y-2 my-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <BedDouble className="h-3 w-3" /> Alojamiento
                </span>
                <span className="text-xs font-bold text-foreground">{emp.hospedaje}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Utensils className="h-3 w-3" /> Alimentación
                </span>
                <span className="text-xs font-bold text-foreground">{emp.alimentacion}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <FileSpreadsheet className="h-3 w-3" /> Lavandería
                </span>
                <span className="text-xs font-bold text-foreground">{emp.lavanderia}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Total Liquidado</p>
                  <p className="text-lg font-black text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {emp.totalFormatted}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[9px] font-bold uppercase h-7 shadow-sm"
                  onClick={() => void downloadExcel(emp.nombre, detailedHistory.filter(r => r.empresa === emp.nombre), emp.nombre)}
                >
                  <Download className="mr-1 h-3 w-3" /> Base
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-[9px] font-bold uppercase h-7 shadow-sm"
                  onClick={() => void downloadDetalleExcel(detailedHistory.filter(r => r.empresa === emp.nombre), emp.nombre)}
                >
                  <Download className="mr-1 h-3 w-3" /> Detalle
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de Resumen Clickable */}
      <div className="bg-surface rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-surface-low/30">
          <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Distribución de Costos por Categoría</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[10px] font-bold uppercase h-8 shadow-sm"
              onClick={() => void downloadExcel('General', detailedHistory, 'TODAS LAS EMPRESAS')}
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Consolidado Base
            </Button>
            <Button 
              variant="default"
              size="sm" 
              className="text-[10px] font-bold uppercase h-8 shadow-sm"
              onClick={() => void downloadDetalleExcel(detailedHistory, 'TODAS LAS EMPRESAS')}
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Detalle por Operario
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-background/80">
                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Servicio</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Consumo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Promedio / Valor Base</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest px-6">Impuestos</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest px-6 text-primary">Total (COP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumen.map((item) => (
                <TableRow 
                  key={item.servicio} 
                  className="group hover:bg-primary/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleShowDetails(item.servicio)}
                >
                  <TableCell className="px-6 py-4 font-bold text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.dot }} />
                      {item.servicio}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity ml-1" />
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-medium text-muted-foreground">{item.cantidad} {item.unidad}</TableCell>
                  <TableCell className="px-6 py-4 font-mono text-xs font-bold text-muted-foreground">{item.subtotalInfo}</TableCell>
                  <TableCell className="px-6 py-4 font-mono text-[10px] uppercase font-bold text-muted-foreground/60">{item.impuestoAsignado}</TableCell>
                  <TableCell className="px-6 py-4 text-right font-black text-sm text-foreground">{formatCOP(item.totalConImpuesto)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-surface-low border-t-2 border-border/80">
                <TableCell colSpan={4} className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Subtotal Operativo
                </TableCell>
                <TableCell className="px-6 py-4 text-right font-mono text-base font-bold text-muted-foreground">
                  {formatCOP(granSubtotalConsolidado)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary/[0.03] border-t-2 border-primary/20">
                <TableCell colSpan={4} className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Gran Total Consolidado
                </TableCell>
                <TableCell className="px-6 py-4 text-right text-2xl font-black text-primary" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatCOP(granTotalConsolidado)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Detalle */}
      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface border-border shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border bg-surface-low/50 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <DialogTitle className="text-xl font-black tracking-tight text-primary uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {selectedDetail?.title}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    Auditoría de registros: {desde} — {hasta}
                  </DialogDescription>
               </div>
               <Button 
                onClick={() => selectedDetail && void downloadExcel(selectedDetail.title, selectedDetail.records, selectedDetail.title.includes('-') ? selectedDetail.title.split('-')[1].trim() : 'COMPILADO GENERAL')}
                size="sm"
                className="font-bold text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-background shadow-lg shadow-primary/20 h-10 px-6 rounded-lg transition-all"
               >
                 <Download className="mr-2 h-4 w-4" /> Exportar a Excel
               </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
             <div className="px-6 py-4 border-b border-border/40 bg-surface-low/20">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Filtrar por operario, servicio o fecha (AAAA-MM-DD)..." 
                    className="pl-10 h-10 bg-surface border-border focus:ring-primary/10 rounded-lg shadow-inner text-sm font-medium"
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                  />
                </div>
             </div>

             <div className="flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-surface-low z-20 shadow-sm">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-muted-foreground">Fecha / Día</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-muted-foreground">Personal Operativo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-muted-foreground">Categoría</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-muted-foreground">Empresa</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4 px-6 text-muted-foreground">Hora Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModalRecords.map((row) => (
                      <TableRow key={row.id} className="hover:bg-primary/[0.02] border-b border-border/30 transition-colors group">
                        <td className="px-6 py-3.5 text-xs font-bold font-mono text-muted-foreground">{row.fecha}</td>
                        <td className="px-6 py-3.5">
                           <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{row.operario}</p>
                           {row.es_manual && <span className="text-[9px] font-black uppercase tracking-tighter text-secondary opacity-70">Registro Manual</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex px-2.5 py-1 rounded-md bg-surface border border-border text-[9px] font-black uppercase tracking-widest shadow-sm">
                            {row.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                           <span className="text-[10px] font-bold text-muted-foreground">{row.empresa}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs font-black text-primary/80">
                           {row.hora}
                        </td>
                      </TableRow>
                    ))}
                    {filteredModalRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20">
                           <div className="flex flex-col items-center gap-2 opacity-30">
                              <ClipboardList className="h-10 w-10" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Sin coincidencias encontradas</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
             </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-surface-low/30 shrink-0 flex items-center justify-between sm:justify-between">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Total Registros: <span className="text-foreground">{filteredModalRecords.length}</span>
             </p>
             <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(null)} className="text-[10px] font-black uppercase tracking-widest h-8 px-4 hover:bg-destructive/10 hover:text-destructive">
                Cerrar Panel
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
