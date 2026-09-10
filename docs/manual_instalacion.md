# Manual de Instalación — Hotel Tajamonae

## 1. Requisitos del Sistema

### 1.1 Software Requerido

| Software | Versión Mínima | Propósito | Verificar con |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18.17+ (recomendado v22) | Runtime de JavaScript | `node --version` |
| **pnpm** | v10+ | Gestor de paquetes | `pnpm --version` |
| **Git** | v2.30+ | Control de versiones | `git --version` |
| **Navegador** | Chrome/Edge/Safari (última versión) | Acceso al sistema | — |

### 1.2 Cuentas y Servicios Externos

| Servicio | Requerido Para | URL |
| :--- | :--- | :--- |
| **Supabase** | Base de datos, Auth, Storage | [supabase.com](https://supabase.com) |
| **Vercel** | Hosting y deploy (producción) | [vercel.com](https://vercel.com) |
| **GitHub** | Repositorio de código | [github.com](https://github.com) |

---

## 2. Instalación Local (Desarrollo)

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/Jbarbosa24/proyecto_tajamonae.git
cd proyecto_tajamonae/hotel-tajamonae
```

### Paso 2: Instalar Dependencias
```bash
# Instalar pnpm si no lo tiene
npm install -g pnpm

# Instalar todas las dependencias del proyecto
pnpm install
```

### Paso 3: Configurar Variables de Entorno
Crear el archivo `.env.local` en la raíz del proyecto:
```bash
touch .env.local
```

Agregar las siguientes variables (obtenerlas del Dashboard de Supabase → Settings → API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu_anon_key_aqui]
SUPABASE_SERVICE_ROLE_KEY=[tu_service_role_key_aqui]
```

> [!WARNING]
> Nunca subir el archivo `.env.local` al repositorio. Ya está incluido en el `.gitignore` del proyecto.

### Paso 4: Configurar la Base de Datos en Supabase

#### 4.1 Crear un proyecto en Supabase
1. Ir a [app.supabase.com](https://app.supabase.com)
2. Crear un nuevo proyecto con región "South America (São Paulo)"
3. Anotar la contraseña de la base de datos

#### 4.2 Ejecutar las migraciones SQL
Ejecutar cada archivo SQL en orden desde el SQL Editor de Supabase (Dashboard → SQL Editor → New Query):

```
supabase/migrations/
├── 20260330235500_perfiles_autoprovision.sql     ← Ejecutar primero
├── 20260331000000_fix_rls_public.sql
├── 20260401221500_timezone_fix.sql
├── 20260412000000_camareria_features.sql
├── 20260420080000_operarios_constraints.sql
├── 20260527000000_security_hardening.sql
└── 20260528000000_fix_admin_rls.sql              ← Ejecutar último
```

> [!IMPORTANT]
> Las migraciones deben ejecutarse en **orden cronológico estricto** (de arriba hacia abajo). Cada una depende de la anterior.

#### 4.3 Crear el usuario administrador inicial
Desde Supabase Dashboard → Authentication → Users → "Add User":
- **Email:** `admin@hotelero.co` (o el email del administrador)
- **Password:** (contraseña segura)
- **User Metadata:** `{"rol": "admin", "nombre_completo": "Nombre del Admin"}`

### Paso 5: Iniciar el Servidor de Desarrollo
```bash
pnpm dev
```

La aplicación estará disponible en: **http://localhost:3000**

---

## 3. Estructura del Proyecto

```
hotel-tajamonae/
├── src/
│   ├── app/
│   │   ├── (admin)/          # Rutas del panel de Administrador
│   │   │   ├── dashboard/    # Dashboard principal
│   │   │   ├── habitaciones/ # Plano de habitaciones
│   │   │   ├── personal/     # Gestión de personal y operarios
│   │   │   ├── servicios/    # Registro de servicios (RFID)
│   │   │   ├── consolidado/  # Reportes consolidados
│   │   │   ├── empresas/     # Gestión de empresas contratistas
│   │   │   ├── auditoria/    # Log de auditoría
│   │   │   └── registro/     # Registro de nuevos usuarios
│   │   ├── (aseadora)/       # Rutas del rol Aseadora
│   │   │   └── camareria/    # Registro de limpieza de habitaciones
│   │   ├── (auth)/           # Login y autenticación
│   │   ├── api/              # API Routes (RFID, logístico)
│   │   └── logistico/        # Panel del rol Logístico
│   ├── components/
│   │   ├── hotel/            # Componentes específicos del hotel
│   │   ├── layout/           # Sidebar, Topbar
│   │   └── ui/               # Componentes base (shadcn/ui)
│   ├── lib/
│   │   ├── supabase/         # Clientes de Supabase (client, server, admin)
│   │   ├── store.ts          # Estado global (Zustand)
│   │   └── offline-storage.ts # Almacenamiento offline (IndexedDB)
│   └── middleware.ts         # Protección de rutas por rol
├── supabase/
│   └── migrations/           # Archivos SQL de migración
├── tests/                    # Pruebas unitarias (Vitest) y E2E (Playwright)
├── docs/                     # Documentación del sistema
├── public/                   # Archivos estáticos (logo, imágenes)
├── vitest.config.ts          # Configuración de pruebas unitarias
├── playwright.config.ts      # Configuración de pruebas E2E
├── next.config.ts            # Configuración de Next.js
├── tsconfig.json             # Configuración de TypeScript
└── package.json              # Dependencias y scripts
```

---

## 4. Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `pnpm dev` | Inicia el servidor de desarrollo en `localhost:3000` |
| `pnpm build` | Compila el proyecto para producción |
| `pnpm start` | Ejecuta el build de producción localmente |
| `pnpm lint` | Ejecuta el linter (ESLint) |
| `pnpm test:coverage` | Ejecuta pruebas unitarias con reporte de cobertura HTML |

---

## 5. Dependencias Principales

### Producción
| Paquete | Versión | Uso |
| :--- | :--- | :--- |
| `next` | 16.2.1 | Framework React con SSR |
| `react` / `react-dom` | 19.2.4 | Librería de UI |
| `@supabase/supabase-js` | ^2.100.1 | Cliente de Supabase |
| `@supabase/ssr` | ^0.9.0 | Integración SSR con cookies |
| `zustand` | ^5.0.12 | Estado global ligero |
| `zod` | ^4.3.6 | Validación de esquemas |
| `exceljs` / `xlsx` | — | Importación/exportación de Excel |
| `jspdf` + `jspdf-autotable` | — | Generación de reportes PDF |
| `lucide-react` | ^1.7.0 | Iconografía |

### Desarrollo
| Paquete | Versión | Uso |
| :--- | :--- | :--- |
| `vitest` | 4.1.7 | Pruebas unitarias |
| `@testing-library/react` | 16.3.2 | Testing de componentes React |
| `@playwright/test` | ^1.60.0 | Pruebas end-to-end |
| `tailwindcss` | ^4 | Estilos CSS |
| `typescript` | ^5 | Tipado estático |

---

## 6. Verificación de la Instalación

Después de completar todos los pasos, verificar que el sistema funciona correctamente:

```bash
# 1. Verificar que el build compila sin errores
pnpm build

# 2. Verificar que las pruebas unitarias pasan
pnpm test:coverage

# 3. Iniciar el servidor y acceder al login
pnpm dev
# Abrir http://localhost:3000 → Debe mostrar la pantalla de login
```

### Checklist de Verificación

- [ ] `pnpm install` termina sin errores
- [ ] `.env.local` tiene las 3 variables configuradas
- [ ] Migraciones SQL ejecutadas en orden en Supabase
- [ ] Usuario administrador creado en Supabase Auth
- [ ] `pnpm dev` inicia sin errores en `localhost:3000`
- [ ] Login funciona con las credenciales del admin
- [ ] Dashboard carga correctamente después del login

---

## 7. Solución de Problemas Comunes

| Problema | Causa | Solución |
| :--- | :--- | :--- |
| `ERR_MODULE_NOT_FOUND` | Dependencias no instaladas | Ejecutar `pnpm install` |
| Login redirige a `/registro` | Perfil no tiene rol asignado | Verificar que el user_metadata en Supabase Auth tenga `{"rol": "admin"}` |
| "Invalid API key" en consola | Variables de entorno incorrectas | Verificar `.env.local` contra el Dashboard de Supabase |
| Build falla con errores TypeScript | Tipos incompatibles | Ejecutar `pnpm tsc --noEmit` para ver errores detallados |
| Migraciones fallan | Orden incorrecto o migración duplicada | Ejecutar en orden cronológico estricto; verificar que no existan tablas previas |
