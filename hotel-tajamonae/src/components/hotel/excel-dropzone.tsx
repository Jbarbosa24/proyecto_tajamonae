'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ParsedExcelWorker {
  nombre_completo: string
  documento_identidad: string
  empresa: string
  cargo: string
  rfid_uid: string | null
  genero: 'M' | 'F'
  tipo_cargo: 'operativo' | 'administrativo'
  dias_turno: string | null
}

interface ExcelDropzoneProps {
  onParsed: (rows: ParsedExcelWorker[], fileName: string) => void
  disabled?: boolean
}

const HEADER_ALIASES = {
  nombre_completo: ['nombre_completo', 'nombre completo', 'nombre', 'operario'],
  documento_identidad: ['documento_identidad', 'documento', 'cedula', 'identificacion', 'cc', 'c.c.', 'c.c', 'numero de documento', 'id'],
  empresa: ['empresa', 'sigla', 'compania', 'contratista'],
  cargo: ['cargo', 'rol', 'puesto'],
  rfid_uid: ['rfid_uid', 'rfid', 'uid', 'tag'],
  genero: ['genero', 'género', 'sexo', 'gen'],
  tipo_cargo: ['tipo_cargo', 'tipo cargo', 'tipo de cargo', 'categoria', 'categoría', 'tipo'],
  dias_turno: ['dias_turno', 'dias turno', 'días turno', 'dias de turno', 'días de turno', 'turno', 'ciclo'],
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function toText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function pickByAliases(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const found = row[normalizeKey(alias)]
    if (found) {
      return found
    }
  }

  return ''
}

export function ExcelDropzone({ onParsed, disabled = false }: ExcelDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parseExcelFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      throw new Error('Formato no soportado. Usa archivos .xlsx, .xls o .csv.')
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheet = workbook.SheetNames[0]

    if (!firstSheet) {
      throw new Error('El archivo no contiene hojas para procesar.')
    }

    const sheet = workbook.Sheets[firstSheet]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })

    if (rows.length === 0) {
      throw new Error('La hoja esta vacia o no contiene datos validos.')
    }

    const parsedRows: ParsedExcelWorker[] = []

    for (const rawRow of rows) {
      const normalized: Record<string, string> = {}

      for (const [key, value] of Object.entries(rawRow)) {
        normalized[normalizeKey(key)] = toText(value)
      }

      const nombre = pickByAliases(normalized, HEADER_ALIASES.nombre_completo)
      const documento = pickByAliases(normalized, HEADER_ALIASES.documento_identidad)
      const empresa = pickByAliases(normalized, HEADER_ALIASES.empresa)
      const cargo = pickByAliases(normalized, HEADER_ALIASES.cargo)
      const rfid = pickByAliases(normalized, HEADER_ALIASES.rfid_uid)
      const generoRaw = pickByAliases(normalized, HEADER_ALIASES.genero).toUpperCase()
      const tipoCargoRaw = pickByAliases(normalized, HEADER_ALIASES.tipo_cargo).toLowerCase()
      const diasTurno = pickByAliases(normalized, HEADER_ALIASES.dias_turno)

      if (!nombre || !documento || !empresa || !cargo) {
        continue
      }

      const genero: 'M' | 'F' = generoRaw === 'F' || generoRaw === 'FEMENINO' || generoRaw === 'MUJER' ? 'F' : 'M'
      const tipo_cargo: 'operativo' | 'administrativo' = 
        tipoCargoRaw.includes('admin') ? 'administrativo' : 'operativo'

      parsedRows.push({
        nombre_completo: nombre,
        documento_identidad: documento,
        empresa,
        cargo,
        rfid_uid: rfid || null,
        genero,
        tipo_cargo,
        dias_turno: diasTurno || null,
      })
    }

    if (parsedRows.length === 0) {
      throw new Error(
        'No se encontraron filas completas con las columnas requeridas: nombre_completo, documento_identidad, empresa, cargo.'
      )
    }

    return parsedRows
  }

  const handleFile = async (file: File) => {
    if (disabled) {
      return
    }

    try {
      setError(null)
      setStatus('Procesando archivo...')

      const parsedRows = await parseExcelFile(file)

      setStatus(`Archivo ${file.name} procesado: ${parsedRows.length} filas validas.`)
      onParsed(parsedRows, file.name)
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Error inesperado al procesar el archivo.'
      setError(message)
      setStatus(null)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleFile(file)
          }

          event.currentTarget.value = ''
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragOver(false)
 
          const file = event.dataTransfer.files?.[0]
          if (file) {
            void handleFile(file)
          }
        }}
        className={cn(
          'rounded-sm border-2 border-dashed p-8 transition-all duration-300',
          isDragOver 
            ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(142,255,113,0.1)]' 
            : 'border-surface-highest bg-surface-low hover:border-secondary hover:shadow-[0_0_15px_rgba(0,227,253,0.05)]',
          disabled && 'cursor-not-allowed opacity-40'
        )}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <div className={cn(
            "rounded-sm p-4 transition-colors",
            isDragOver ? "bg-primary text-background" : "bg-surface-highest text-secondary"
          )}>
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black font-heading uppercase tracking-widest text-foreground">Importar turno desde Excel</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Arrastra un archivo .xlsx/.csv o haz clic para seleccionarlo.
            </p>
          </div>
          
          <div className="bg-surface border border-surface-highest p-4 rounded-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">Columnas requeridas</p>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
              nombre_completo · documento_identidad · empresa · cargo · rfid_uid · genero · tipo_cargo · dias_turno
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-2 rounded-sm border-2 border-primary text-primary hover:bg-primary hover:text-background font-black uppercase tracking-widest text-[10px] h-10 px-6 transition-all shadow-[0_0_10px_rgba(142,255,113,0.1)]"
            onClick={(event) => {
              event.stopPropagation()
              inputRef.current?.click()
            }}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      {status ? <p className="text-[10px] font-black uppercase tracking-widest text-success border border-success/30 bg-success/5 px-3 py-2 rounded-sm">{status}</p> : null}
      {error ? <p className="text-[10px] font-black uppercase tracking-widest text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2 rounded-sm">{error}</p> : null}
    </div>
  )
}