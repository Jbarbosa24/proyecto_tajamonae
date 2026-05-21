import Link from 'next/link'
import { ArrowRight, Shield, Zap, Database, BarChart3, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Dynamic Industrial Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05] [background:radial-gradient(circle_at_2px_2px,#8eff71_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,transparent_0%,#0e0e0e_100%)]" />
        
        {/* Animated Scanline */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_bottom,transparent_50%,#8eff71_50%)] bg-[length:100%_4px] animate-scanline" />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-8 md:px-12">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_20px_rgba(142,255,113,0.3)]">
            <img src="/logo-nuevo.png" alt="HT" className="h-6 logo-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Consola Industrial</span>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Hotel Tajamonae v4.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
           <div className="hidden md:flex gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-r border-surface-highest pr-8">
              <span className="hover:text-primary cursor-pointer transition-colors">Infraestructura</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Seguridad RLS</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Terminales</span>
           </div>
           <Link href="/login">
             <Button className="h-10 rounded-sm bg-primary text-background font-black uppercase tracking-[0.2em] text-[10px] px-6 hover:bg-surface hover:text-primary hover:border-primary border-2 border-transparent transition-all shadow-[0_0_15px_rgba(142,255,113,0.2)]">
               Acceder al Sistema <ArrowRight className="ml-2 h-3.5 w-3.5" />
             </Button>
           </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-32 md:px-12 text-center lg:text-left grid lg:grid-cols-2 items-center gap-16">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-lowest border border-surface-highest rounded-sm mb-8">
             <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Sistema Operativo HT-OS</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black font-heading leading-[0.85] tracking-tighter uppercase italic mb-8">
            Precision <br/>
            <span className="text-primary text-outline-primary">Hospitalaria</span>
            <br/> Industrial
          </h1>
          
          <p className="max-w-xl text-lg font-bold text-muted-foreground uppercase tracking-widest leading-relaxed mb-12 border-l-4 border-primary pl-8 text-left">
            Gestion integrada de grado corporativo para <span className="text-foreground">MASA</span>, <span className="text-foreground">INMEL</span> y <span className="text-foreground">MR ING</span>. 
            El estándar de oro en logística hotelera para el sector industrial.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="h-16 w-full sm:w-auto px-12 rounded-sm bg-primary text-background font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_30px_rgba(142,255,113,0.3)] hover:scale-105 transition-transform">
                Iniciar Terminal Operativa
              </Button>
            </Link>
            <Link href="/registro" className="w-full sm:w-auto">
              <Button variant="outline" className="h-16 w-full sm:w-auto px-12 rounded-sm border-2 border-surface-highest hover:bg-surface-lowest transition-all font-black uppercase tracking-[0.2em] text-xs">
                Aprovisionar Cuenta
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid / Visual */}
        <div className="relative">
           {/* Decorative Grid Overlay */}
           <div className="absolute -inset-10 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
           
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-surface-low border border-surface-highest p-8 rounded-sm hover:border-primary transition-colors group">
                 <Shield className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-sm font-black uppercase tracking-widest mb-2">Seguridad RLS</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                    Políticas de acceso estricto a nivel de fila mediante Supabase Auth.
                 </p>
              </div>
              <div className="bg-surface-low border border-surface-highest p-8 rounded-sm hover:border-secondary transition-colors group mt-8">
                 <Zap className="h-8 w-8 text-secondary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-sm font-black uppercase tracking-widest mb-2">Sync Realtime</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                    Actualización de habitaciones y servicios en microsegundos.
                 </p>
              </div>
              <div className="bg-surface-low border border-surface-highest p-8 rounded-sm hover:border-primary transition-colors group">
                 <Database className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-sm font-black uppercase tracking-widest mb-2">BIG DATA</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                    Consolidación de nóminas y reportes para múltiples contratistas.
                 </p>
              </div>
              <div className="bg-surface-low border border-surface-highest p-8 rounded-sm hover:border-secondary transition-colors group mt-8">
                 <BarChart3 className="h-8 w-8 text-secondary mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-sm font-black uppercase tracking-widest mb-2">Analytics</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                    Visualización de ocupación y eficiencia de servicios industriales.
                 </p>
              </div>
           </div>
        </div>
      </main>

      {/* Corporate Strip */}
      <div className="relative z-10 border-y border-surface-highest bg-surface-lowest/50 backdrop-blur-md py-12 overflow-hidden">
         <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
            <div className="text-center md:text-left">
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground block mb-4">Partner Estratégico</span>
               <h4 className="text-4xl font-black font-heading tracking-tighter uppercase italic">MASA Energy</h4>
            </div>
            <div className="text-center md:text-left">
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground block mb-4">Servicios Eléctricos</span>
               <h4 className="text-4xl font-black font-heading tracking-tighter uppercase italic">INMEL S.A.S</h4>
            </div>
            <div className="text-center md:text-left">
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground block mb-4">Soluciones de Ingeniería</span>
               <h4 className="text-4xl font-black font-heading tracking-tighter uppercase italic">MR ING</h4>
            </div>
         </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-16 md:px-12 border-t border-surface-highest mt-20">
         <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start justify-between gap-12">
            <div>
               <img src="/logo-nuevo.png" alt="Logo" className="h-10 mb-6 brightness-150" />
               <p className="max-w-xs text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                  Sistema de gestión hotelera restrictivo diseñado específicamente para campamentos industriales y sectores energéticos.
               </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
               <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Terminal</h5>
                  <ul className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest space-y-2">
                     <li className="hover:text-foreground cursor-pointer">Login</li>
                     <li className="hover:text-foreground cursor-pointer">Status</li>
                     <li className="hover:text-foreground cursor-pointer">Debug</li>
                  </ul>
               </div>
               <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Recursos</h5>
                  <ul className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest space-y-2">
                     <li className="hover:text-foreground cursor-pointer">Manual</li>
                     <li className="hover:text-foreground cursor-pointer">Soporte</li>
                     <li className="hover:text-foreground cursor-pointer">API</li>
                  </ul>
               </div>
               <div className="space-y-4 col-span-2 sm:col-span-1">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Legal</h5>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                     © 2026 Hotel Tajamonae. <br/>All Rights Reserved. <br/>Industrial Protocol v4.0.0.
                  </p>
               </div>
            </div>
         </div>
      </footer>
    </div>
  )
}
