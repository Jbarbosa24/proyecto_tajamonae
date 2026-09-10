'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { ArrowLeft, ArrowRight, UserRoundPlus, Server, Shield } from 'lucide-react'
import { register, getActiveEmpresasPublicAction } from '../../(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type NoticeState = {
  type: 'error' | 'warning' | 'success'
  text: string
}

export default function RegistroPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [role, setRole] = useState('aseadora')
  const [empresas, setEmpresas] = useState<{id: string, nombre_completo: string, sigla: string}[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)

  useEffect(() => {
    if (role === 'logistico') {
      setLoadingEmpresas(true)
      getActiveEmpresasPublicAction().then(res => {
        if (res.ok) setEmpresas(res.data)
        setLoadingEmpresas(false)
      })
    }
  }, [role])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await register(formData)

      if (result?.error) {
        setNotice({ type: 'error', text: result.error })
        return
      }

      if (result?.warning) {
        setNotice({ type: 'warning', text: result.warning })
        return
      }

      if (result?.success) {
        setNotice({ type: 'success', text: result.success })
        setTimeout(() => {
          router.push('/login')
        }, 1200)
      }
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background scanline effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(142, 255, 113, 0.5) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0e0e0e_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <div className="w-full border-2 border-surface-highest bg-surface-low shadow-[0_0_60px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden grid lg:grid-cols-5">
          
          {/* Side Banner (Industrial) */}
          <section className="hidden lg:flex lg:col-span-2 bg-surface-lowest p-10 flex-col justify-between border-r border-surface-highest relative">
            <div className="absolute top-0 left-0 p-4 opacity-10">
               <Server className="h-40 w-40 text-primary" />
            </div>
            
            <div className="relative">
              <div className="h-1 w-12 bg-primary mb-6" />
            </div>

            <div className="relative space-y-4">
              <div className="bg-surface p-4 border border-surface-highest rounded-sm">
                 <Shield className="h-6 w-6 text-secondary mb-3" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Acceso Controlado</p>
                 <p className="mt-1 text-[9px] font-bold text-muted-foreground uppercase leading-tight">
                   Todas las cuentas requieren validacion por el Administrador de Seguridad.
                 </p>
              </div>
              <p className="text-[8px] font-mono text-muted-foreground/40 break-all underline decoration-primary/20">
                AUTH_KEY_GEN: {Math.random().toString(36).substring(7).toUpperCase()}
              </p>
            </div>
          </section>

          {/* Registration Form */}
          <section className="lg:col-span-3 p-8 md:p-12">
            <div className="mb-10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Terminal v4.0</span>
                <h1 className="mt-2 text-3xl font-black font-heading text-foreground uppercase tracking-tight italic">Registro de Usuario</h1>
                <p className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  Aprovisionamiento de credenciales operativas.
                </p>
              </div>
              <div className="rounded-sm bg-surface border border-surface-highest p-3 text-primary shadow-[0_0_15px_rgba(142,255,113,0.1)]">
                <UserRoundPlus className="h-6 w-6" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nombre_completo" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Nombre Completo
                </Label>
                <Input
                  id="nombre_completo"
                  name="nombre_completo"
                  placeholder="OPERADOR / ADMIN NAME"
                  required
                  disabled={isPending}
                  className="h-12 rounded-sm border-2 border-surface-highest bg-surface-lowest px-4 text-xs font-bold uppercase tracking-widest focus:border-primary focus:ring-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Perfil de Acceso
                </Label>
                <select
                  id="rol"
                  name="rol"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={isPending}
                  className="h-12 w-full rounded-sm border-2 border-surface-highest bg-surface-lowest px-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:border-secondary transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23484847\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  <option value="aseadora">OPERARIO (STANDARD)</option>
                  <option value="logistico">LOGÍSTICO (EMPRESA)</option>
                  <option value="admin">ADMINISTRADOR (SU)</option>
                </select>
              </div>

              {role === 'logistico' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="empresa_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    Empresa Asignada
                  </Label>
                  {loadingEmpresas ? (
                    <div className="h-12 rounded-sm border-2 border-surface-highest bg-surface-lowest flex items-center px-4 gap-3">
                      <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Cargando empresas...</span>
                    </div>
                  ) : empresas.length === 0 ? (
                    <div className="h-12 rounded-sm border-2 border-destructive/20 bg-destructive/5 flex items-center px-4">
                      <span className="text-[10px] font-bold uppercase text-destructive">⚠ No hay empresas activas disponibles. Registra una empresa primero.</span>
                    </div>
                  ) : (
                    <select
                      id="empresa_id"
                      name="empresa_id"
                      required
                      disabled={isPending}
                      className="h-12 w-full rounded-sm border-2 border-surface-highest bg-surface-lowest px-3 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="">-- SELECCIONE UNA EMPRESA ({empresas.length} disponibles) --</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          [{emp.sigla}] {emp.nombre_completo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="USER@TAJAMONAE.COM"
                  required
                  disabled={isPending}
                  className="h-12 rounded-sm border-2 border-surface-highest bg-surface-lowest px-4 text-xs font-bold uppercase tracking-widest focus:border-primary focus:ring-0 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isPending}
                  className="h-12 rounded-sm border-2 border-surface-highest bg-surface-lowest px-4 text-lg tracking-[0.3em] focus:border-primary focus:ring-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm_password"
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1"
                >
                  Validar Contraseña
                </Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  disabled={isPending}
                  className="h-12 rounded-sm border-2 border-surface-highest bg-surface-lowest px-4 text-lg tracking-[0.3em] focus:border-primary focus:ring-0 transition-all"
                />
              </div>

              {notice && (
                <div
                  className={`md:col-span-2 rounded-sm border px-4 py-3 flex items-center gap-3 ${
                    notice.type === 'error'
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : notice.type === 'warning'
                        ? 'bg-warning/15 border-warning/30 text-warning'
                        : 'bg-success/10 border-success/30 text-success'
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full animate-pulse ${notice.type === 'error' ? 'bg-destructive shadow-[0_0_8px_#ff7166]' : notice.type === 'warning' ? 'bg-warning shadow-[0_0_8px_#00e3fd]' : 'bg-success shadow-[0_0_8px_#8eff71]'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{notice.text}</p>
                </div>
              )}

              <div className="md:col-span-2 mt-4 flex flex-wrap items-center justify-between gap-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-all hover:text-foreground hover:translate-x-[-4px]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Regresar al Login
                </Link>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-14 rounded-sm bg-primary text-background font-black uppercase tracking-[0.2em] text-xs px-10 shadow-[0_0_20px_rgba(142,255,113,0.2)] hover:bg-surface hover:text-primary hover:border-primary border-2 border-transparent transition-all"
                >
                  {isPending ? 'PROCESANDO...' : 'REGISTRAR USUARIO'}
                  {!isPending && <ArrowRight className="ml-3 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
