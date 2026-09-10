'use client'

import { useState } from 'react'
import { Download, AlertTriangle, Info, Clock, AlertCircle, MessageSquare } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ServicioManual {
  id: string
  fecha: string
  hora: string
  tipo: string
  motivo: string
  operario: string
  documento: string
  empresa: string
  registradoPor: string
  valorTotal: number
}

interface CreditoNoConsumido {
  id: string
  fecha: string
  tipo: string
  operario: string
  documento: string
  empresa: string
}

interface AuditoriaClientProps {
  serviciosManuales: ServicioManual[]
  creditosNoConsumidos: CreditoNoConsumido[]
  desde: string
  hasta: string
  isLogistico?: boolean
}

export function AuditoriaClient({ serviciosManuales, creditosNoConsumidos, desde, hasta, isLogistico }: AuditoriaClientProps) {
  const [activeTab, setActiveTab] = useState('manuales')
  const [reportando, setReportando] = useState<string | null>(null)

  const handleReportar = async (registroId: string, operario: string, tipo: string) => {
    const coment = prompt(`Escribe tu comentario para el Administrador respecto al registro de ${operario} (${tipo}):`)
    if (!coment) return

    setReportando(registroId)
    try {
      const res = await fetch('/api/logistico/reportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          titulo: 'Revision Logistica: ' + tipo, 
          mensaje: `Sobre ${operario}: ${coment}` 
        })
      })
      if (res.ok) alert('Comentario enviado al Administrador exitosamente.')
      else alert('Error al enviar.')
    } catch {
      alert('Error de red al enviar el reporte.')
    } finally {
      setReportando(null)
    }
  }

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(activeTab === 'manuales' ? 'Excepciones Manuales' : 'Omisiones')

    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    if (activeTab === 'manuales') {
      sheet.columns = [
        { header: 'FECHA', key: 'fecha', width: 12 },
        { header: 'HORA', key: 'hora', width: 10 },
        { header: 'OPERARIO', key: 'operario', width: 35 },
        { header: 'DOCUMENTO', key: 'documento', width: 15 },
        { header: 'EMPRESA', key: 'empresa', width: 25 },
        { header: 'TIPO SERVICIO', key: 'tipo', width: 20 },
        { header: 'MOTIVO DE FORZADO', key: 'motivo', width: 30 },
        { header: 'REGISTRADO POR', key: 'registradoPor', width: 25 },
        { header: 'VALOR AFECTADO', key: 'valorTotal', width: 18 },
      ]

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8A00' } } // Orange indicator
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      for (const rec of serviciosManuales) {
        sheet.addRow(rec)
      }

      sheet.getColumn('I').numFmt = '"$"#,##0'
    } else {
      sheet.columns = [
        { header: 'FECHA NO SHOW', key: 'fecha', width: 15 },
        { header: 'OPERARIO', key: 'operario', width: 35 },
        { header: 'DOCUMENTO', key: 'documento', width: 15 },
        { header: 'EMPRESA', key: 'empresa', width: 25 },
        { header: 'TIPO DE CREDITO PERDIDO', key: 'tipo', width: 25 },
      ]

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } } // Red indicator
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      for (const rec of creditosNoConsumidos) {
        sheet.addRow(rec)
      }
    }

    sheet.autoFilter = 'A1:' + String.fromCharCode(64 + sheet.columns.length) + '1'

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fileName = `Auditoria_${activeTab}_${desde}_AL_${hasta}.xlsx`
    saveAs(blob, fileName)
  }

  return (
    <div className="space-y-6">
      
      {/* Alert Banner depending on selected tab */}
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        {activeTab === 'manuales' ? (
          <Alert className="border-warning/50 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning font-black uppercase tracking-widest text-xs">Atención a la facturación</AlertTitle>
            <AlertDescription className="text-muted-foreground text-xs font-medium">
              Estos registros fueron ingresados por cédula y eludieron el lector RFID. Deben revisarse para evitar la suplantación de identidad o doble consumo.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive font-black uppercase tracking-widest text-xs">Pérdida de Alimentos o Fraude de Asignación</AlertTitle>
            <AlertDescription className="text-muted-foreground text-xs font-medium">
              Estos empleados tenían turno activo y crédito asignado, pero jamás consumieron el servicio. Esto puede indicar ausentismo encubierto o desperdicio de comida.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-low/30">
            <TabsList className="bg-background border border-border">
              <TabsTrigger value="manuales" className="text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-warning/20 data-[state=active]:text-warning">
                Excepciones Manuales ({serviciosManuales.length})
              </TabsTrigger>
              <TabsTrigger value="no_consumidos" className="text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
                Omisiones (No Show) ({creditosNoConsumidos.length})
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[10px] font-bold uppercase h-8 shadow-sm"
              onClick={() => void downloadExcel()}
              disabled={(activeTab === 'manuales' && serviciosManuales.length === 0) || (activeTab === 'no_consumidos' && creditosNoConsumidos.length === 0)}
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Exportar Hallazgos
            </Button>
          </div>

          <div className="overflow-x-auto">
            <TabsContent value="manuales" className="m-0 border-none p-0 outline-none">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/80 hover:bg-background/80">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Timestamp</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Operario</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Servicio</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Justificación / Emisor</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Impacto</TableHead>
                    {isLogistico && <TableHead className="text-[10px] font-black uppercase tracking-widest py-3"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviciosManuales.map((s) => (
                    <TableRow key={s.id} className="hover:bg-warning/[0.02]">
                      <TableCell className="py-3">
                        <p className="text-xs font-mono font-bold">{s.fecha}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.hora}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{s.operario}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">CC: {s.documento} · {s.empresa}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="px-2 py-0.5 rounded-sm bg-warning/10 text-warning text-[10px] font-bold uppercase border border-warning/20">
                          {s.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-xs text-foreground font-medium">{s.motivo}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Por: {s.registradoPor}</p>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <p className="text-sm font-black font-mono text-foreground">{formatCOP(s.valorTotal)}</p>
                      </TableCell>
                      {isLogistico && (
                        <TableCell className="py-3 text-right">
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-primary/20 hover:bg-primary/5" onClick={() => handleReportar(s.id, s.operario, 'Excepción Manual: '+s.tipo)} disabled={reportando === s.id}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Reportar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {serviciosManuales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                            <Info className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-medium">No se detectaron sobreescrituras manuales en este rango de fechas.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="no_consumidos" className="m-0 border-none p-0 outline-none">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/80 hover:bg-background/80">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Fecha Emisión</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Operario</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-3">Empresa</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-3">Crédito Omitido</TableHead>
                    {isLogistico && <TableHead className="text-[10px] font-black uppercase tracking-widest py-3"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditosNoConsumidos.map((c) => (
                    <TableRow key={c.id} className="hover:bg-destructive/[0.02]">
                      <TableCell className="py-3">
                         <div className="flex items-center gap-2">
                           <Clock className="h-3 w-3 text-muted-foreground" />
                           <span className="text-xs font-mono font-bold text-muted-foreground">{c.fecha}</span>
                         </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{c.operario}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">CC: {c.documento}</p>
                      </TableCell>
                      <TableCell className="py-3">
                         <span className="text-xs font-medium text-foreground">{c.empresa}</span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive text-[10px] font-bold uppercase border border-destructive/20 inline-block">
                          {c.tipo}
                        </span>
                      </TableCell>
                      {isLogistico && (
                        <TableCell className="py-3 text-right">
                          <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-primary/20 hover:bg-primary/5" onClick={() => handleReportar(c.id, c.operario, 'Omisión: '+c.tipo)} disabled={reportando === c.id}>
                            <MessageSquare className="h-3 w-3 mr-1" /> Reportar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {creditosNoConsumidos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                            <Info className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-medium">Asistencia perfecta. Todos los créditos asignados fueron consumidos en este rango.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
