# MEGA-PROMPT ANTIGRAVITY — SISTEMA INTEGRAL HOTEL TAJAMONAE
# Proyecto de Grado · Ingeniería de Software · Universidad Cooperativa de Colombia

---

Actúa simultáneamente como **Arquitecto de Software Senior**, **Diseñador UX/UI Industrial**, **Administrador de Base de Datos (DBA)** y **Desarrollador Full-Stack** para el desarrollo completo de mi proyecto de grado universitario: el **Sistema Integral de Gestión Hotelera Industrial "Hotel Tajamonae"**, ubicado en Campo Rubiales, Puerto Gaitán (Meta, Colombia).

Tienes disponible un ecosistema MCP que debes orquestar de forma **obligatoria, secuencial y autónoma**:
- `@StitchMCP` — para extraer, analizar y procesar los prototipos de interfaz ya diseñados
- `@supabase-mcp-server` — para arquitectura de datos, migraciones SQL, RLS y funciones edge
- `@coding-agent` — para escribir, ejecutar y verificar código real en mi máquina

Tu misión es entregar un producto de software de **grado empresarial**: 100% funcional, escalable, seguro, sin bugs, y listo para sustentación académica ante un comité evaluador de ingeniería de software. Toda decisión técnica debe estar alineada con mi documento de trabajo de grado.

---

## CONTEXTO DE NEGOCIO — LEE ESTO PRIMERO, NO OMITAS NADA

**El hotel no es turístico.** Es un hotel industrial en una zona petrolera. Sus clientes son empresas contratistas del sector de hidrocarburos que alojan personal bajo turnos rotativos (14/7 y 20/10). El problema central que resuelve el software es la **pérdida de ingresos por registros manuales en papel** que se deterioran, se pierden o no son firmados, generando disputas de hasta $5.000.000 COP quincenales en las mesas de conciliación con las contratistas.

**Las tres empresas que opera el hotel actualmente:**
1. **MASA** — Mecánicos y Asociados S.A.S
2. **INMEL** — Inmel (nombre exacto)
3. **MR ING** — Mr Ingeniería

**Estructura física del hotel:**
- **Bloque Tajamonae 1:** 2 pisos. Piso 1: habitaciones TJ1 a TJ6. Piso 2: habitaciones TJ7 a TJ12.
- **Bloque Tajamonae 2:** 1 piso. Habitaciones TJ2-1 a TJ2-8.
- **Total:** 20 habitaciones **dobles** (solo maneja habitaciones dobles). Máximo 40 personas alojadas simultáneamente.

**Personal interno del hotel:** Únicamente 2 roles internos:
- **Administrador** (1 persona — Jose Barboza)
- **Aseadora** (1 persona — personal de limpieza del propio hotel, sin empresa externa)

**Tabla de precios vigentes (valores base antes de impuestos):**
| Servicio       | Precio base   | Impuesto aplicable      | Total con impuesto |
|----------------|---------------|-------------------------|--------------------|
| Desayuno       | $27.000 COP   | Impoconsumo 8%          | $29.160 COP        |
| Almuerzo       | $28.500 COP   | Impoconsumo 8%          | $30.780 COP        |
| Cena           | $27.000 COP   | Impoconsumo 8%          | $29.160 COP        |
| Hospedaje doble| $80.000 COP   | IVA 19%                 | $95.200 COP        |
| Lavandería     | $14.000 COP   | IVA 19%                 | $16.660 COP        |

**Reglas críticas de negocio (implementar en lógica del servidor, no solo en UI):**
- Un operario NO puede tener más de 1 desayuno, 1 almuerzo, 1 cena, 1 hospedaje y 1 lavandería registrada en el mismo día natural.
- La lavandería es **una muda diaria por persona** — no hay categorías de tipo de ropa.
- El hospedaje es **exclusivamente doble** — no hay habitaciones individuales, suites, ni triples.
- Los impuestos se calculan y almacenan separados del valor base en la base de datos.

---

## FASE 1 — DISEÑO Y EXTRACCIÓN DE PROTOTIPOS (USO DE @StitchMCP)

Inicia utilizando `@StitchMCP` para analizar todos los prototipos existentes. El sistema ya tiene diseñadas las siguientes pantallas: Login, Dashboard, Mapa de habitaciones, Gestión de personal, Registro de servicios RFID, Módulo de lavandería, Gestión de empresas y Consolidado de facturación.

**Stack tecnológico obligatorio — no hay negociación:**
- **Framework:** Next.js 14+ con App Router, Server Components y Server Actions
- **Lenguaje:** TypeScript con tipado estricto (`strict: true` en tsconfig)
- **Estilos:** Tailwind CSS con la configuración de paleta corporativa
- **Componentes:** Shadcn UI como librería base de componentes
- **Iconos:** Lucide React exclusivamente
- **Fuentes:** Manrope (títulos y headings) + Inter (cuerpo y datos)
- **Monospace:** JetBrains Mono para UIDs RFID, timestamps y valores monetarios

**Paleta corporativa — implementar como tokens CSS y variables Tailwind:**
```
--color-primary:     #005d6a  /* Azul petróleo — barras, botones primarios */
--color-primary-2:   #0e7787  /* Azul petróleo claro — gradientes */
--color-secondary:   #924b08  /* Naranja tierra — alertas, acciones secundarias */
--color-success:     #1a6b3c  /* Verde — aseo listo, disponible, confirmado */
--color-background:  #f0f3f5  /* Fondo canvas principal */
--color-surface:     #ffffff  /* Superficie de tarjetas */
--color-surface-low: #f2f4f6  /* Fondo de tablas y campos */
```

**Regla anti-fatiga visual (OBLIGATORIA — los evaluadores de tesis verificarán esto):**
El sistema es usado en turnos de 8-12 horas por personal con brechas digitales. Implementar:
- Tipografía cuerpo mínimo: 14px (16px ideal). Títulos de sección: 18-20px.
- Área táctil mínima de botones de acción: 44×44px (especialmente en el módulo de camarería, usado en tablet por la aseadora).
- Modo oscuro nativo usando `next-themes` con preferencia del sistema operativo.
- Botones de acción principal con gradiente `from-[#005d6a] to-[#0e7787]`.
- El botón **"Aseo listo"** debe ser grande, verde, y prominente — es el CTA más crítico en la tablet de la aseadora.
- Contraste mínimo WCAG AA en todos los textos.

---

## FASE 2 — ARQUITECTURA DE BASE DE DATOS (USO DE @supabase-mcp-server)

Usa `@supabase-mcp-server` para diseñar y ejecutar todas las migraciones. La base de datos PostgreSQL debe estar en **Tercera Forma Normal (3NF)**. No tolero redundancia de datos ni campos calculados en base de datos (los totales se calculan en runtime).

### Schema completo — tablas requeridas

```sql
-- USUARIOS Y AUTENTICACIÓN (ligado a Supabase Auth)
-- Roles: 'admin' | 'aseadora'
-- (Los logísticos de empresas tienen acceso de solo lectura externo, ver RLS)

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE -- 'admin', 'aseadora'
);

CREATE TABLE perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo text NOT NULL,
  rol text NOT NULL REFERENCES roles(nombre),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- EMPRESAS CONTRATISTAS
CREATE TABLE empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  sigla text NOT NULL UNIQUE,
  nit text,
  contacto_nombre text,
  contacto_telefono text,
  color_hex text DEFAULT '#005d6a',
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES perfiles(id)
);

-- OPERARIOS (personal de las empresas contratistas)
CREATE TABLE operarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  documento_identidad text UNIQUE NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  cargo text NOT NULL,
  rfid_uid text UNIQUE, -- UID del tag RFID (alfanumérico 4-8 chars)
  activo boolean DEFAULT true, -- false cuando sale de turno, registro histórico se mantiene
  fecha_ingreso_turno date,
  fecha_salida_turno date,
  habitacion_id text REFERENCES habitaciones(id),
  created_at timestamptz DEFAULT now()
);

-- BLOQUES Y HABITACIONES
CREATE TABLE bloques (
  id text PRIMARY KEY, -- 'TJ1', 'TJ2'
  nombre text NOT NULL, -- 'Tajamonae 1', 'Tajamonae 2'
  pisos int NOT NULL DEFAULT 1
);

CREATE TABLE habitaciones (
  id text PRIMARY KEY, -- 'TJ1', 'TJ2', ..., 'TJ12', 'TJ2-1', ..., 'TJ2-8'
  bloque_id text NOT NULL REFERENCES bloques(id),
  piso int NOT NULL DEFAULT 1,
  capacidad int NOT NULL DEFAULT 2, -- siempre 2
  estado text NOT NULL DEFAULT 'Disponible'
    CHECK (estado IN ('Disponible','Ocupada','En limpieza')),
  estado_aseo text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_aseo IN ('Pendiente','En proceso','Aseo listo')),
  ultima_actualizacion timestamptz DEFAULT now()
);

-- SERVICIOS REGISTRADOS (tabla central)
CREATE TABLE servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id uuid NOT NULL REFERENCES operarios(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  tipo text NOT NULL CHECK (tipo IN ('Desayuno','Almuerzo','Cena','Hospedaje','Lavandería')),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_registro time NOT NULL DEFAULT CURRENT_TIME,
  valor_base integer NOT NULL, -- en pesos COP sin decimales
  tipo_impuesto text NOT NULL CHECK (tipo_impuesto IN ('IVA','Impoconsumo')),
  porcentaje_impuesto numeric(4,2) NOT NULL, -- 0.19 o 0.08
  valor_impuesto integer NOT NULL,
  valor_total integer NOT NULL, -- valor_base + valor_impuesto
  es_manual boolean DEFAULT false,
  motivo_manual text, -- obligatorio si es_manual = true
  rfid_uid_lectura text, -- UID leído en el momento del registro
  registrado_por uuid REFERENCES perfiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(operario_id, tipo, fecha) -- CONSTRAINT CRÍTICO: 1 servicio por tipo por día por persona
);

-- REGISTRO DE ASEO / CAMARERÍA
CREATE TABLE registro_camareria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habitacion_id text NOT NULL REFERENCES habitaciones(id),
  aseadora_id uuid REFERENCES perfiles(id), -- siempre la aseadora del hotel
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente','En proceso','Aseo listo')),
  hora_inicio timestamptz,
  hora_fin timestamptz,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habitacion_id, fecha) -- 1 registro de aseo por habitación por día
);

-- IMPORTACIONES DE TURNO (trazabilidad de cambios de personal)
CREATE TABLE importaciones_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  archivo_nombre text NOT NULL,
  operarios_entrantes jsonb, -- lista de operarios nuevos
  operarios_salientes jsonb, -- lista de operarios que salen (se desactivan)
  fecha_proceso timestamptz DEFAULT now(),
  procesado_por uuid REFERENCES perfiles(id)
);

-- AUDIT LOG (inmutable — no tiene UPDATE ni DELETE por RLS)
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES perfiles(id),
  accion text NOT NULL,
  tabla_afectada text,
  registro_id text,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
```

### Políticas Row Level Security (RLS) — IMPLEMENTACIÓN OBLIGATORIA

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_camareria ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- POLÍTICA: Admin ve y modifica todo
CREATE POLICY "admin_full_access" ON servicios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- POLÍTICA: Aseadora solo ve y modifica registro_camareria
CREATE POLICY "aseadora_camareria_only" ON registro_camareria
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','aseadora'))
  );

CREATE POLICY "aseadora_habitaciones_read" ON habitaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','aseadora'))
  );

CREATE POLICY "aseadora_habitaciones_update_aseo" ON habitaciones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','aseadora'))
  )
  WITH CHECK (true);

-- POLÍTICA: Audit log — solo INSERT, nadie puede UPDATE ni DELETE
CREATE POLICY "audit_insert_only" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- NO crear política de UPDATE ni DELETE para audit_log

-- POLÍTICA: Logísticos externos (JWT claim 'empresa_id') solo ven su empresa
CREATE POLICY "logistico_empresa_propia" ON servicios
  FOR SELECT USING (
    empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );
```

### Función Edge: Verificar duplicado antes de insertar servicio

```sql
CREATE OR REPLACE FUNCTION verificar_duplicado_servicio(
  p_operario_id uuid,
  p_tipo text,
  p_fecha date DEFAULT CURRENT_DATE
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM servicios
    WHERE operario_id = p_operario_id
      AND tipo = p_tipo
      AND fecha = p_fecha
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Función Edge: Importar turno desde Excel (procesamiento backend)

```sql
CREATE OR REPLACE FUNCTION procesar_cambio_turno(
  p_empresa_id uuid,
  p_operarios_entrantes jsonb,
  p_procesado_por uuid
) RETURNS jsonb AS $$
DECLARE
  op jsonb;
  resultado jsonb = '{"entrantes": 0, "salientes": 0}';
BEGIN
  -- Desactivar todos los operarios actuales de la empresa
  UPDATE operarios SET activo = false, fecha_salida_turno = CURRENT_DATE
  WHERE empresa_id = p_empresa_id AND activo = true;

  -- Registrar o reactivar cada operario entrante
  FOR op IN SELECT * FROM jsonb_array_elements(p_operarios_entrantes)
  LOOP
    INSERT INTO operarios (nombre_completo, documento_identidad, empresa_id, cargo, rfid_uid, activo, fecha_ingreso_turno)
    VALUES (
      op->>'nombre_completo', op->>'documento_identidad',
      p_empresa_id, op->>'cargo', op->>'rfid_uid',
      true, CURRENT_DATE
    )
    ON CONFLICT (documento_identidad) DO UPDATE SET
      activo = true, fecha_ingreso_turno = CURRENT_DATE,
      cargo = EXCLUDED.cargo, rfid_uid = COALESCE(EXCLUDED.rfid_uid, operarios.rfid_uid);
  END LOOP;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## FASE 3 — MÓDULOS FUNCIONALES (USO DE @coding-agent)

### Módulo A — Autenticación y Control de Acceso

- Login con email y contraseña a través de Supabase Auth.
- Al hacer login exitoso, animación del candado SVG: LED rojo → verde, arco se abre en 500ms.
- Al fallar: vibración del formulario + parpadeo del LED rojo.
- El sistema detecta el rol del usuario y redirige: admin → `/dashboard`, aseadora → `/camareria`.
- No existe registro público. Los usuarios solo los crea el administrador desde el panel.
- Middleware de Next.js que protege todas las rutas según rol.

### Módulo B — Dashboard (Admin únicamente)

KPIs en tiempo real via Supabase Realtime:
1. **Operarios activos hoy** — COUNT de operarios con activo=true
2. **Servicios registrados hoy** — COUNT de servicios con fecha=hoy
3. **Habitaciones ocupadas / total** — con porcentaje de ocupación
4. **Aseos pendientes** — habitaciones ocupadas con estado_aseo='Pendiente'

Gráfico de barras: servicios por empresa del día actual.
Feed en vivo de últimos 5 registros con empresa, tipo de servicio y hora.
Tabla de estado de aseos diarios con botón "Aseo listo" para cada habitación pendiente.
Panel de precios vigentes (solo visualización).

### Módulo C — Mapa de Habitaciones

Renderizado SVG o grilla visual con las 20 habitaciones divididas en:
- **Bloque Tajamonae 1 · Piso 1:** TJ1 a TJ6 (grilla 6 columnas)
- **Bloque Tajamonae 1 · Piso 2:** TJ7 a TJ12 (grilla 6 columnas)
- **Bloque Tajamonae 2:** TJ2-1 a TJ2-8 (grilla 8 columnas)

Estados de color: verde=Disponible, rojo=Ocupada, amarillo=En limpieza.
Indicador visual adicional: checkmark verde cuando estado_aseo='Aseo listo'.

Al hacer click en una habitación: panel lateral con ocupantes actuales (nombre, empresa, UID RFID, hora check-in).

**Tab "Camarería diaria":** tabla de todas las habitaciones, estado de aseo del día, responsable (siempre "Aseadora hotel"), botón "Aseo listo" para las pendientes.

### Módulo D — Gestión de Personal

**Tab Lista:** tabla con todos los operarios activos. Columnas: nombre, empresa, cargo, UID RFID, habitación asignada, check-in.

**Tab Importar turno (Excel) — CRÍTICO:** formulario con zona de arrastre para subir archivo .xlsx o .csv. El archivo debe tener columnas: `nombre_completo`, `documento_identidad`, `empresa`, `cargo`, `rfid_uid`. Al procesar:
1. Llama a la función edge `procesar_cambio_turno()` del servidor.
2. Muestra un resumen: "N operarios entrantes registrados, M operarios salientes desactivados (historial conservado)."
3. Los servicios históricos de los operarios salientes NO se eliminan ni modifican.

**Tab Asignación sugerida:** agrupa operarios disponibles por empresa para sugerencias de habitación. El admin confirma y aplica la asignación.

### Módulo E — Registro de Servicios RFID

**Flujo principal (3 pasos obligatorios):**
1. **Leer RFID** (simulado en MVP): al recibir el UID, busca el operario en la base de datos y autocompleta nombre + empresa.
2. **Verificar duplicado**: llama a `verificar_duplicado_servicio()`. Si ya tiene ese servicio hoy, muestra error claro: *"Carlos Mendoza ya tiene Almuerzo registrado hoy. Solo se permite 1 por día."*
3. **Confirmar**: modal con resumen completo (nombre, empresa, tipo, valor base, impuesto, total). Solo al confirmar se hace el INSERT en la base de datos.

**Campos del formulario:** tipo de servicio (Desayuno/Almuerzo/Cena/Hospedaje — sin Lavandería aquí), empresa (auto por RFID), operario (auto por RFID o manual).

**Preview de precio en tiempo real:** al cambiar el tipo de servicio, mostrar: `$27.000 + Impoconsumo 8% = $29.160`

**Modo de emergencia manual:** toggle que activa un campo "Motivo" obligatorio. El registro queda marcado como `es_manual=true` y requiere aprobación del admin.

**Feed en vivo:** columna derecha con los últimos registros del día, actualizándose via Supabase Realtime.

**Tab Lavandería (dentro de Servicios):**
- Formulario: leer RFID → autocompleta operario y empresa → confirmar.
- Valor fijo: $14.000 + IVA 19% = $16.660. No hay campos adicionales.
- Verificación de duplicado: solo 1 lavandería por persona por día.
- Lista de mudas registradas hoy con tracker de 4 estados: Recibida → En proceso → Lista → Entregada.
- Cada lote muestra el valor cobrado y la empresa.

**Tab Historial del día:** tabla completa de todos los servicios del día con columnas: hora, tipo, operario, empresa, valor base, impuesto (tipo + monto), total. Exportable.

### Módulo F — Módulo de Camarería (vista aseadora — MOBILE FIRST)

Esta vista es la que usa la aseadora en su tablet/teléfono. Diseño completamente diferente al panel admin:
- Fondo oscuro o neutro para reducir fatiga visual.
- Lista de habitaciones que necesitan aseo: las ocupadas con estado_aseo='Pendiente'.
- Cada habitación en un card grande con: número, bloque, y un botón **verde, grande, de al menos 56px de alto**: **"ASEO LISTO"**.
- Al presionar "Aseo listo":
  1. UPDATE en `registro_camareria` con `estado='Aseo listo'` y `hora_fin=now()`.
  2. UPDATE en `habitaciones` con `estado_aseo='Aseo listo'`.
  3. Supabase Realtime notifica al dashboard del admin en tiempo real.
  4. La habitación desaparece de la lista de pendientes de la aseadora.
  5. INSERT en `audit_log`.
- Campo de observaciones opcional: "Faltan toallas", "Problema con llave", etc.
- Indicador de progreso: "3 de 8 habitaciones completadas hoy."

### Módulo G — Gestión de Empresas

Tarjetas por empresa con: sigla, nombre completo, operarios activos, servicios registrados, total facturado.
**Botón "+ Nueva empresa"** con formulario: razón social, sigla (máx 8 chars), NIT, nombre de contacto, teléfono. Al guardar, la empresa queda disponible inmediatamente en todos los módulos.
Estado activa/inactiva (no se elimina para mantener historial).

### Módulo H — Consolidado de Facturación (Admin únicamente)

**Tab Por empresa:** una tarjeta por cada empresa activa con:
- Conteo de cada tipo de servicio: Hospedaje N noches, Desayuno N, Almuerzo N, Cena N, Lavandería N mudas.
- Subtotal (suma de valores base), Impuestos (suma de valores_impuesto), **Total con impuestos**.
- Dos botones de exportación: **"Exportar PDF"** y **"Exportar Excel (.xlsx)"** — ambos generan el reporte con todos los servicios detallados del período (fecha, operario, tipo, valor base, impuesto, total).
- Selector de rango de fechas o mes/año.

**Tab Resumen global:** tabla consolidada de TODOS los servicios por tipo y por empresa:

| Tipo         | MASA | INMEL | MR ING | Total unidades | Total COP |
|--------------|------|-------|--------|----------------|-----------|
| Desayuno     |  40  |  30   |   20   |      90        | $2.624.400|
| Almuerzo     |  ...  |  ...  |  ...   |     ...        |   ...     |
| Total general|      |       |        |                |           |

Botón "Exportar PDF global" y "Exportar Excel global".

**Tab Audit log:** tabla de todos los eventos del sistema. Registro inmutable. Solo lectura. Columnas: fecha/hora, usuario, acción, detalle, registro afectado.

---

## FASE 4 — PROTOCOLO OBLIGATORIO DEL @coding-agent

### Reglas de orquestación — sin excepciones

1. **Prohibido el copy-paste.** No me des bloques de código para copiar. Escribe todos los archivos directamente en mi máquina usando el coding agent.

2. **PTY y Background obligatorios.** Todas las ejecuciones de terminal deben usar `pty:true` y `background:true` para evitar bloqueos en procesos largos.

3. **Versionamiento con Git.** Antes de iniciar cada iteración XP:
   ```bash
   git checkout -b feature/iteracion-X-nombre
   ```
   Al finalizar cada historia de usuario, commit atómico con mensaje descriptivo:
   ```
   feat(servicios): implementar verificación de duplicado diario por operario
   fix(rls): corregir política de lectura para rol aseadora
   ```

4. **Estructura de carpetas de Next.js — crear exactamente así:**
   ```
   /src
     /app
       /(auth)
         /login
           page.tsx
       /(admin)
         /dashboard
           page.tsx
         /habitaciones
           page.tsx
         /personal
           page.tsx
         /servicios
           page.tsx
         /empresas
           page.tsx
         /consolidado
           page.tsx
       /(aseadora)
         /camareria
           page.tsx
       /layout.tsx
       /not-found.tsx
     /components
       /ui           -- componentes Shadcn
       /hotel        -- componentes de dominio del hotel
       /charts       -- componentes de gráficas
     /lib
       /supabase     -- cliente y tipos generados
       /validations  -- schemas Zod
       /utils        -- helpers, formateadores de precio
       /hooks        -- custom hooks de Supabase Realtime
     /types
       index.ts      -- todos los tipos TypeScript del dominio
   /supabase
     /migrations     -- archivos SQL numerados
     /seed.sql       -- datos iniciales (empresas, habitaciones, usuarios)
   ```

5. **Validación con Zod en cada Server Action:**
   ```typescript
   const RegistroServicioSchema = z.object({
     operario_id: z.string().uuid(),
     empresa_id: z.string().uuid(),
     tipo: z.enum(['Desayuno','Almuerzo','Cena','Hospedaje','Lavandería']),
     es_manual: z.boolean().default(false),
     motivo_manual: z.string().optional().refine(
       (val, ctx) => !ctx.parent.es_manual || (val && val.length > 0),
       { message: 'El motivo es obligatorio para registro manual' }
     ),
   });
   ```

6. **Tipos TypeScript del dominio — generar desde Supabase:**
   ```bash
   npx supabase gen types typescript --project-id [PROJECT_ID] > src/types/database.ts
   ```

7. **Verificación obligatoria antes de cada commit:**
   ```bash
   npx tsc --noEmit          # zero TypeScript errors
   npx next build            # build exitoso
   ```

---

## FASE 5 — METODOLOGÍA ÁGIL XP (Extreme Programming)

**Metodología oficial del proyecto: Programación Extrema (XP).** No usar Scrum. Las iteraciones se llaman **"Iteraciones XP"**, no sprints.

### Prácticas XP obligatorias:

- **TDD (Test-Driven Development):** Escribe el test unitario ANTES del código de producción para cada función crítica de negocio. Mínimo 70% de cobertura en lógica de negocio.
- **Integración Continua:** Cada merge a `main` pasa por `tsc --noEmit` y `next build`.
- **Diseño Simple:** No over-engineer. Si una función cumple el requerimiento con menos código, usa menos código.
- **Refactorización continua:** Después de que cada historia de usuario funcione, refactoriza antes de pasar a la siguiente.
- **Cliente como parte del equipo:** Cada historia de usuario fue definida en entrevistas reales con el dueño del hotel.

### Plan de iteraciones XP:

**Iteración 1 (Meses 1-2): Base del ecosistema**
- [ ] Setup Next.js 14 + TypeScript + Tailwind + Shadcn UI
- [ ] Configuración de Supabase: migraciones SQL, RLS, seed inicial
- [ ] Autenticación con Supabase Auth + middleware de rutas
- [ ] Layout del sistema: sidebar, topbar, sistema de navegación
- [ ] Pipeline CI/CD en GitHub Actions

**Iteración 2 (Mes 3): Habitaciones y personal**
- [ ] Módulo de mapa de habitaciones (Tajamonae 1 Piso 1, Piso 2, Tajamonae 2)
- [ ] Módulo de gestión de personal con tabla de operarios
- [ ] Importación de turno desde Excel (función edge + UI)
- [ ] Asignación de habitaciones con RFID

**Iteración 3 (Mes 4): Registro de servicios**
- [ ] Módulo de servicios RFID con flujo de 3 pasos
- [ ] Verificación de duplicado diario (constraint BD + validación UI)
- [ ] Módulo de lavandería integrado en Servicios
- [ ] Modo de emergencia manual con audit trail
- [ ] Camarería diaria para la aseadora (vista mobile-first)

**Iteración 4 (Meses 5-6): Consolidado, empresas y pruebas**
- [ ] Dashboard con KPIs en tiempo real (Supabase Realtime)
- [ ] Módulo de gestión de empresas con registro de nueva empresa
- [ ] Consolidado de facturación: PDF + Excel por empresa + resumen global
- [ ] Audit log completo
- [ ] Pruebas de penetración OWASP API Security Top 10 con Postman
- [ ] Período de prueba piloto 30 días con datos reales

---

## PRIMERA TAREA — EJECUTA AHORA

Sin pedirme confirmación, ejecuta en este orden:

1. **`@StitchMCP`**: Analiza todos los diseños existentes del proyecto Hotel Tajamonae. Extrae la paleta de colores, tipografía, componentes y flujos de navegación. Genera un informe de los elementos de UI que deben traducirse a componentes React.

2. **`@supabase-mcp-server`**: Crea el proyecto Supabase si no existe. Ejecuta las migraciones SQL en el orden correcto: bloques → habitaciones → roles → perfiles → empresas → operarios → servicios → registro_camareria → importaciones_turno → audit_log. Configura las políticas RLS. Ejecuta el seed inicial con: los 2 bloques, las 20 habitaciones, los 2 roles, las 3 empresas (MASA, INMEL, MR ING) y el usuario administrador.

3. **`@coding-agent`**: 
   ```
   /plan -- genera el árbol de carpetas completo del proyecto Next.js
   ```
   Luego ejecuta:
   ```bash
   npx create-next-app@latest hotel-tajamonae \
     --typescript --tailwind --app --src-dir \
     --import-alias "@/*" --use-pnpm
   ```
   Instala dependencias, configura Shadcn UI y Supabase client. Crea el layout base con sidebar y el sistema de temas (claro/oscuro).

4. Reporta: **"Iteración 1 iniciada — ecosistema base configurado"** y muestra el árbol de archivos creados y el estado de las migraciones ejecutadas.

---

*Este prompt fue diseñado específicamente para el proyecto de grado: "Diseño de un sistema de gestión y control de servicios hoteleros mediante plataforma web para el Hotel Tajamonae en Campo Rubiales, Meta." — Jose Antonio Barboza Vega, Universidad Cooperativa de Colombia, 2026.*
