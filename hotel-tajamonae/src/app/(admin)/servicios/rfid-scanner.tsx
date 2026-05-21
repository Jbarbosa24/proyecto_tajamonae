'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ShieldAlert, XCircle, Radio } from 'lucide-react'
import { registrarServicioRFIDGlobal, TipoServicio } from '../rfid-global-actions'
import { useHotelStore } from '@/lib/store'

const SERVICIOS_OPCIONES = [
  { value: 'Desayuno' as const, label: 'Desayuno', color: '#924b08' },
  { value: 'Almuerzo' as const, label: 'Almuerzo', color: '#b45309' },
  { value: 'Cena' as const, label: 'Cena', color: '#ba1a1a' },
  { value: 'Hospedaje' as const, label: 'Hospedaje', color: '#005d6a' },
  { value: 'Lavandería' as const, label: 'Lavandería', color: '#14b8a6' },
] as const

export function RFIDScanner() {
  const { servicioActivo, setServicioActivo } = useHotelStore()
  const [uid, setUid] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof window !== 'undefined' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
         inputRef.current?.focus()
      }
    }, 500)
    return () => clearInterval(timer)
  }, [])

  const handleRegister = async (scannedUid: string) => {
    if (!scannedUid) return
    setStatus('loading')
    const res = await registrarServicioRFIDGlobal(scannedUid, servicioActivo)
    
    setUid('')
    if (res.ok) {
      setStatus('success')
      setMessage(res.message)
    } else {
      setStatus('error')
      setMessage(res.message)
    }

    // Reset status after a few seconds
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 4000)
  }

  return (
    <div className="rounded-xl border border-border bg-surface-low p-5">
      {/* Selector de Servicio Integrado */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SERVICIOS_OPCIONES.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setServicioActivo(opt.value)}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
              servicioActivo === opt.value
                ? 'shadow-md scale-[1.02]'
                : 'border-transparent bg-surface opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: servicioActivo === opt.value ? opt.color : 'transparent',
              color: servicioActivo === opt.value ? 'white' : opt.color,
              backgroundColor: servicioActivo === opt.value ? opt.color : undefined,
            }}
          >
            <Radio className={`h-3 w-3 ${servicioActivo === opt.value ? 'animate-pulse' : ''}`} />
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3">
          {status === 'loading' ? (
             <span className="animate-spin absolute inline-flex h-full w-full rounded-full border-2 border-primary border-t-transparent"></span>
          ) : (
            <>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'error' ? 'bg-destructive' : 'bg-success'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'error' ? 'bg-destructive' : 'bg-success'}`}></span>
            </>
          )}
        </span>
        <p className={`text-sm font-semibold ${status === 'error' ? 'text-destructive' : 'text-success'}`}>
          {status === 'loading' ? 'Procesando...' : status === 'error' ? 'Error en Lectura' : `Scanner Activo (${servicioActivo})`}
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative group">
           <div className="absolute inset-0 bg-primary/5 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">Entrada Manual / RFID Keyboard</p>
           <input
             ref={inputRef}
             type="text"
             value={uid}
             onChange={(e) => setUid(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 handleRegister(uid)
               }
             }}
             autoFocus
             placeholder="Esperando señal..."
             className="w-full bg-surface border-2 border-dashed border-border focus:border-primary/50 focus:border-solid rounded-lg px-4 py-3 font-mono text-lg font-bold text-center text-primary outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
           />
        </div>

        <div className={`min-h-[80px] flex flex-col items-center justify-center rounded-lg border border-border bg-surface p-4 transition-colors ${status === 'success' ? 'border-success/30 bg-success/5' : status === 'error' ? 'border-destructive/30 bg-destructive/5' : ''}`}>
          {status === 'idle' && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              Acerque una tarjeta al lector para registrar <span className="font-bold text-foreground">{servicioActivo}</span>
            </p>
          )}
          
          {status === 'loading' && (
            <p className="text-sm font-medium animate-pulse text-primary">Validando UID en base de datos...</p>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-1 text-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <p className="text-sm font-bold text-success leading-tight">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-1 text-center">
              <XCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm font-bold text-destructive leading-tight">{message}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => handleRegister(uid)}
        disabled={status === 'loading' || !uid}
        className="mt-6 w-full rounded-lg py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
        style={{ background: 'linear-gradient(135deg, #005d6a 0%, #007c8d 100%)', fontFamily: 'Space Grotesk, sans-serif' }}
      >
        REGISTRAR {servicioActivo.toUpperCase()}
      </button>

      {/* Manual Emergency Tip */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
         <ShieldAlert className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
         <p className="text-[10px] text-secondary-foreground leading-snug">
           <span className="font-bold">MODO HÍBRIDO:</span> El lector RFID emula un teclado. Si falla, ingrese el código manualmente y presione Enter.
         </p>
      </div>
    </div>
  )
}
