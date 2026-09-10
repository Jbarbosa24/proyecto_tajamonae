'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function DashboardHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    // Refresh the dashboard data every 45 seconds to keep KPIs "live"
    const interval = setInterval(() => {
      router.refresh()
    }, 45000)

    return () => clearInterval(interval)
  }, [router])

  return null
}
