'use client'

import { create } from 'zustand'

type TipoServicio = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Hospedaje' | 'Lavandería'

interface RFIDScanResult {
  ok: boolean
  operarioNombre: string
  tipo: TipoServicio
  message: string
  timestamp: number
}

interface HotelStore {
  // RFID service selector
  servicioActivo: TipoServicio
  setServicioActivo: (tipo: TipoServicio) => void

  // Last scan result for global toast
  lastScan: RFIDScanResult | null
  setLastScan: (result: RFIDScanResult | null) => void

  // Scanning state
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void
}

export const useHotelStore = create<HotelStore>((set) => ({
  servicioActivo: 'Almuerzo',
  setServicioActivo: (tipo) => set({ servicioActivo: tipo }),

  lastScan: null,
  setLastScan: (result) => set({ lastScan: result }),

  isScanning: false,
  setIsScanning: (scanning) => set({ isScanning: scanning }),
}))
