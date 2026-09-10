'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useHotelStore } from '@/lib/store'
import { registrarServicioRFIDGlobal } from '@/app/(admin)/rfid-global-actions'
import { CheckCircle2, XCircle, Loader2, Radio } from 'lucide-react'

/**
 * Global RFID EventListener Provider
 * Captures keyboard-wedge RFID scanner input from anywhere in the admin layout.
 * Scanner sends characters rapidly (< 50ms between chars) and terminates with Enter.
 */
export function RFIDGlobalProvider({ children }: { children: React.ReactNode }) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { servicioActivo, lastScan, setLastScan, isScanning, setIsScanning } = useHotelStore()

  const processRFID = useCallback(
    async (uid: string) => {
      if (!uid.trim() || uid.length < 4) return

      setIsScanning(true)
      try {
        const result = await registrarServicioRFIDGlobal(uid.trim(), servicioActivo)
        setLastScan({
          ok: result.ok,
          operarioNombre: result.operarioNombre,
          tipo: result.tipo,
          message: result.message,
          timestamp: Date.now(),
        })
      } catch {
        setLastScan({
          ok: false,
          operarioNombre: 'Error',
          tipo: servicioActivo,
          message: 'Error de conexión al procesar el escaneo.',
          timestamp: Date.now(),
        })
      } finally {
        setIsScanning(false)
      }
    },
    [servicioActivo, setLastScan, setIsScanning]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const now = Date.now()
      const timeDiff = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Reset buffer if too much time between keystrokes (> 100ms = human typing)
      if (timeDiff > 100) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const uid = bufferRef.current.trim()
        bufferRef.current = ''
        if (uid.length >= 4) {
          e.preventDefault()
          processRFID(uid)
        }
        return
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

      // Safety: clear buffer after 500ms of no input (fallback)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, 500)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [processRFID])

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!lastScan) return
    const timer = setTimeout(() => setLastScan(null), 4000)
    return () => clearTimeout(timer)
  }, [lastScan, setLastScan])

  return (
    <>
      {children}

      {/* Scanning indicator */}
      {isScanning && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl bg-primary px-5 py-3 text-white shadow-2xl shadow-primary/30 animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Procesando RFID...</span>
        </div>
      )}

      {/* Result toast */}
      {lastScan && !isScanning && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border px-5 py-4 shadow-2xl max-w-sm transition-all animate-in slide-in-from-bottom-4 ${
            lastScan.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {lastScan.ok ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{lastScan.operarioNombre}</p>
            <p className="text-xs mt-0.5 opacity-80">{lastScan.message}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Radio className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{lastScan.tipo}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
