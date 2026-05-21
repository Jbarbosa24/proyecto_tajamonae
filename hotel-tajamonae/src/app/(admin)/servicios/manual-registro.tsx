'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { registrarServicioManualAction } from './actions'

export function ManualRegistro() {
  const [documento, setDocumento] = useState('')
  const [tipo, setTipo] = useState('Desayuno')
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('documento', documento)
    formData.append('tipo', tipo)
    formData.append('cantidad', cantidad.toString())

    const res = await registrarServicioManualAction(formData)
    setResult(res)
    setLoading(false)

    if (res.ok) {
      setDocumento('')
      setCantidad(1)
      setTimeout(() => setResult(null), 3000)
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2 text-destructive">
        <ShieldAlert className="h-5 w-5" />
        <h2 className="text-base font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Registro Manual de Emergencia
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Documento Operario</label>
          <input 
            type="number"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" 
            placeholder="Ingrese CC manual" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Servicio Asignado</label>
          <select 
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
          >
            <option value="Desayuno">Desayuno</option>
            <option value="Almuerzo">Almuerzo</option>
            <option value="Cena">Cena</option>
            <option value="Hospedaje">Hospedaje</option>
            <option value="Lavandería">Lavandería (Mudas)</option>
          </select>
        </div>

        {tipo === 'Lavandería' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cantidad (Mudas)</label>
            <input 
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" 
            />
          </div>
        ) : (
          <div className="hidden md:block"></div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 mt-2 justify-self-start rounded-lg border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-low transition-colors disabled:opacity-50"
        >
          {loading ? 'Procesando...' : 'Procesar Registro Manual'}
        </button>

        {result && (
          <div className={`col-span-1 md:col-span-2 flex items-center gap-2 text-sm font-semibold p-3 mt-2 rounded-lg ${result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {result.message}
          </div>
        )}
      </form>
    </article>
  )
}
