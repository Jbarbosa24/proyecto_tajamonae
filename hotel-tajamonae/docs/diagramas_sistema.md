# Documentación Técnica: Diagramas del Sistema Hotel Tajamonae

Este documento contiene la representación visual y técnica de la arquitectura, procesos y requerimientos del sistema Hotel Tajamonae. Diseñado para la sustentación académica y el soporte técnico industrial.

---

## 1. Diagramas de Requerimientos y Casos de Uso

Estos diagramas justifican el propósito del sistema y definen las interacciones fundamentales entre los actores y los procesos de negocio.

### 1.1 Diagrama de Casos de Uso General
Este diagrama ilustra cómo los tres actores principales interactúan con los módulos centrales: Hospitalidad (Hospedaje), Alimentación (Servicios) y Mantenimiento (Camarería).

```mermaid
flowchart TD
    Admin[Administrador]
    Logistico[Logístico - Empresa]
    Aseadora[Camarería - Aseadora]

    subgraph "Sistema Hotel Tajamonae"
        UC1((Gestionar Personal y Empresas))
        UC2((Asignar Habitaciones - Check-in/Out))
        UC3((Registrar Servicios - RFID))
        UC4((Reportar Estado de Limpieza))
        UC5((Gestionar Lavandería - Tulas))
        UC6((Consultar Consolidados y Auditoría))
        UC7((Visualizar Mapa en Tiempo Real))
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC6
    Admin --> UC7

    Logistico --> UC6
    Logistico --> UC7

    Aseadora --> UC4
    Aseadora --> UC5
    Aseadora --> UC7
```

**Explicación:** El **Administrador** posee control total sobre la configuración y auditoría. El **Logístico** de cada empresa tiene un acceso restringido para supervisar sus consumos y el estado de sus empleados. La **Aseadora** se enfoca exclusivamente en la operatividad de las habitaciones y el flujo de lavandería.

### 1.2 Casos de Uso por Módulo: Validación RFID
Detalle del proceso crítico de validación de identidad y consumo mediante radiofrecuencia.

```mermaid
flowchart TD
    Operario[Operario]
    Admin[Administrador / Recepcionista]

    subgraph "Módulo de Validación RFID"
        UC_Scan((Presentar Tarjeta RFID))
        UC_Cred((Consultar Créditos Disponibles))
        UC_Reg((Registrar Consumo de Servicio))
        UC_Err((Rechazar por Duplicado/Sin Cupo))
    end

    Operario --> UC_Scan
    UC_Scan -->|Transmisión HID| Admin
    Admin --> UC_Cred
    UC_Cred -->|Si tiene crédito| UC_Reg
    UC_Cred -->|Si ya consumió| UC_Err
```

**Explicación:** Este flujo garantiza la integridad financiera evitando el doble cobro. El sistema consulta la tabla de `creditos_diarios` antes de permitir cualquier inserción en la tabla de `servicios`.

---

## 2. Diagramas de Arquitectura y Estructura

Representan la construcción técnica y el despliegue del ecosistema digital.

### 2.1 Diagrama de Arquitectura (C4 Model - Contexto/Contenedor)
El sistema utiliza una arquitectura moderna basada en Next.js y Supabase.

```mermaid
graph TD
    subgraph "Nube (Vercel / Supabase)"
        WEB[Next.js App Router]
        SA[Server Actions / API Routes]
        DB[(PostgreSQL Database)]
        AUTH[Supabase Auth / JWT]
        RT[Realtime Engine]
    end

    subgraph "Cliente / Hardware"
        BROWSER[Navegador Web Desktop/Mobile]
        RFID[Lector RFID HID]
    end

    BROWSER <--> WEB
    WEB <--> SA
    SA <--> AUTH
    SA <--> DB
    DB <--> RT
    RT -.-> BROWSER
    RFID -.->|keyboard wedge| BROWSER
```

**Explicación:** Se emplea un patrón de **Server components** para seguridad. La comunicación con la base de datos está protegida por **RLS (Row Level Security)**, asegurando que cada empresa solo acceda a sus propios datos. El motor **Realtime** actualiza el mapa de habitaciones instantáneamente cuando la aseadora reporta cambios.

### 2.2 Diagrama de Despliegue (Deployment)
Infraestructura Cloud del proyecto.

```mermaid
flowchart TD
    subgraph "Dispositivo Cliente"
        Chrome["Navegador Chrome/Edge"]
    end
    
    subgraph "Vercel Platform"
        Edge["Next.js Edge Runtime"]
        Serverless["Serverless Functions"]
    end

    subgraph "Supabase Cloud"
        DB[("PostgreSQL Instance")]
        Auth["GoTrue Auth Service"]
        API["PostgREST API Layer"]
    end

    Chrome -- HTTPS --> Edge
    Edge -- "RPC/GraphQL" --> API
    API --> DB
```

**Explicación:** El sistema es **serverless**, eliminando la necesidad de gestionar servidores físicos. Vercel escala el frontend globalmente, mientras Supabase gestiona la persistencia y autenticación de grado industrial.

### 2.3 Modelo Entidad-Relación (DER)
Representación de las tablas y relaciones lógicas integradas en Supabase.

```mermaid
erDiagram
    BLOQUES ||--o{ HABITACIONES : contiene
    EMPRESAS ||--o{ OPERARIOS : emplea
    EMPRESAS ||--o{ TARIFAS_EMPRESA : define
    EMPRESAS ||--o{ SERVICIOS : factura
    OPERARIOS ||--o{ SERVICIOS : consume
    OPERARIOS ||--o{ CREDITOS_DIARIOS : posee
    OPERARIOS }o--|| HABITACIONES : reside
    HABITACIONES ||--o{ REGISTRO_CAMARERIA : audita_aseo
    HABITACIONES ||--o{ REGISTRO_LAVANDERIA : gestiona_prendas
    PERFILES ||--o{ AUDIT_LOG : genera
    ROLES ||--o{ PERFILES : asigna

    OPERARIOS {
        uuid id PK
        string nombre_completo
        string documento_identidad UK
        string rfid_uid UK
        boolean activo
        string genero
        string tipo_cargo
    }

    SERVICIOS {
        uuid id PK
        uuid operario_id FK
        string tipo
        integer valor_total
        date fecha
    }

    CREDITOS_DIARIOS {
        uuid id PK
        uuid operario_id FK
        string tipo
        date fecha
        boolean consumido
    }

    HABITACIONES {
        string id PK
        string bloque_id FK
        string estado
        string estado_aseo
    }
```

**Explicación:** El modelo está normalizado en 3NF. La tabla `CREDITOS_DIARIOS` actúa como un semáforo lógico para la tabla `SERVICIOS`. Se han añadido campos de auditoría y metadatos (`genero`, `tipo_cargo`) para cumplir con los requerimientos industriales de segregación de personal.

---

## 3. Diagramas de Comportamiento y Procesos

Estos diagramas explican la lógica operativa y la secuencia de eventos del software.

### 3.1 Diagrama de Actividades: Flujo de Proceso RFID
Describe el paso a paso desde el escaneo hasta la persistencia.

```mermaid
flowchart TD
    A[Inicio: Operario acerca tarjeta] --> B[Escaneo RFID vía HID]
    B --> C{¿Operario Existe?}
    C -- No --> D[Error: Operario no registrado]
    C -- Si --> E[Consultar CREDITOS_DIARIOS]
    E --> F{¿Tiene Crédito Disponible?}
    F -- No --> G[Error: Servicio ya consumido hoy]
    F -- Si --> H[Confirmación Visual del Administrador]
    H --> I[Insertar registro en SERVICIOS]
    I --> J[Marcar CREDITO como Consumido]
    J --> K[Notificación Success]
    K --> L[Fin]
```

**Explicación:** Este flujo asegura que el sistema sea **resiliente a errores de doble escaneo**. La validación de créditos es atómica y ocurre en el backend mediante procedimientos almacenados (RPC).

### 3.2 Diagrama de Secuencia: Transacción de Validación
Detalla la comunicación entre el cliente y las capas de backend.

```mermaid
sequenceDiagram
    participant B as Browser (Client)
    participant A as Server Action (Next.js)
    participant S as Supabase (API/DB)
    participant R as Realtime

    B->>A: registrarServicio(rfid_uid, tipo)
    A->>S: RPC verificar_duplicado(uid, tipo)
    S-->>A: { ok: true, credit_id: "xyz" }
    A->>S: Insert SERVICIO & Update CREDITO
    S-->>A: Success 201
    A->>R: Broadcast Event
    R-->>B: Update Dashboard Store
    A-->>B: Response: Registro Exitoso
```

**Explicación:** Se utiliza un patrón asíncrono donde la UI se actualiza reactivamente a través de los eventos de **Realtime** de Supabase, permitiendo que otros administradores vean el consumo al instante.

### 3.3 Diagrama de Estado del Servicio (Offline-First)
Explica la arquitectura planificada para la resiliencia en zonas de baja conectividad (Campo Rubiales).

```mermaid
stateDiagram-v2
    [*] --> Pendiente : Registro local (Offline)
    Pendiente --> Sincronizando : Conexión recuperada
    Sincronizando --> Sincronizado : Éxito (PostgreSQL 201)
    Sincronizando --> Fallido : Error de Validación/Red
    Fallido --> Pendiente : Reintento Automático
    Sincronizado --> [*]
```

**Explicación:** En zonas petroleras de conectividad intermitente, el sistema implementa una **estrategia de cola de sincronización**. Los registros se almacenan localmente hasta que el navegador detecta señal estable para despachar el conjunto de Server Actions.

---

## 4. Diagramas de Integración de Hardware

Específicos para el componente de radiofrecuencia.

### 4.1 Diagrama de Bloques del Hardware
Muestra la conexión física y lógica del lector.

```mermaid
graph LR
    TAG[Tarjeta RFID / Tag] -- Radiofrecuencia 125kHz/13.56MHz --> LECTOR[Lector RFID Desktop]
    LECTOR -- Interfaz USB HID --> PC[PC Administrador]
    PC -- Navegador --> APP[Aplicación Web Tajamonae]
    
    subgraph "Emulación de Teclado"
        LECTOR -->|UID + Enter| FOCUS[Campo de Texto en Foco]
    end
```

**Explicación:** El hardware funciona como un periférico **HID (Human Interface Device)**. Esto permite una compatibilidad universal sin necesidad de instalar drivers específicos, inyectando el UID directamente en los formularios del software.

### 4.2 Diagrama de Flujo de Datos (DFD) Nivel 1
Visualiza el movimiento de la cadena de datos desde el origen.

```mermaid
flowchart LR
    ID[Microchip RFID] -->|UID crudo| SCAN[Lector RFID]
    SCAN -->|UID String| BRIDGE[Middleware de Navegador]
    BRIDGE -->|Validación Zod| SERVER[Server Action]
    SERVER -->|Query SQL| DB[(Supabase DB)]
    DB -->|Registro Auditado| REPORT[Módulo Consolidado]
```

**Explicación:** El flujo transforma un evento físico (acercar tarjeta) en un registro logístico digital inmutable. La cadena de datos viaja encriptada vía HTTPS desde que sale del navegador hacia la infraestructura de Supabase.
