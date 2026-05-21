# Plan de Implementación - Iteración 2 (Habitaciones y Personal)

**Objetivo:** Desarrollar los módulos visuales e interactivos de Gestión de Habitaciones (mapa SVG/Grid), Gestión de Personal (CRUD), Importación Masiva de Excel (Turnos), y Asignación RFID.

## User Review Required

> [!IMPORTANT]
> - Para el "Mapa de habitaciones", construiremos una cuadrícula (grid) visual en Next.js donde el estado de la habitación determinará dinámicamente el color (Verde = Disponible, Rojo = Ocupada, Amarillo = En Limpieza).
> - Para importar desde Excel, la función edge de Supabase `procesar_cambio_turno` ya está en Base de Datos. Necesitaremos instalar la biblioteca `xlsx` para analizar el archivo en el frontend/backend antes de enviarlo a Supabase.
> - ¿Tienes preferencia sobre implementar la librería `xlsx` en el Edge Function o mandamos la data procesada como JSON desde un Server Action de Next.js? (La implementación propuesta enviará la data parseada como JSON).

## Cambios Propuestos

### 1. Mapa de Habitaciones (Admin)

#### [NEW] [page.tsx (Habitaciones)](file:///Users/sergioandresbarbosa/Desktop/Hotel%20Tajamonae/hotel-tajamonae/src/app/(admin)/habitaciones/page.tsx)
- Obtención de datos (`habitaciones`, `operarios` activos) desde Supabase.
- Renderizado de 3 grillas: Bloque T1 - Piso 1 (6 habs), Bloque T1 - Piso 2 (6 habs), Bloque T2 (8 habs).
- Click en la habitación abre un panel/modal (Sheet) mostrando quiénes la ocupan.

#### [NEW] [room-grid.tsx](file:///Users/sergioandresbarbosa/Desktop/Hotel%20Tajamonae/hotel-tajamonae/src/components/hotel/room-grid.tsx)
- Componente para reutilizar la lógica de color dependiendo del estado:
  - `Disponible` -> Color Success (Verde)
  - `Ocupada` -> Color Destructive (Rojo)
  - `En limpieza` -> Color Warning (Amarillo)

### 2. Gestión de Personal (Admin)

#### [NEW] [page.tsx (Personal)](file:///Users/sergioandresbarbosa/Desktop/Hotel%20Tajamonae/hotel-tajamonae/src/app/(admin)/personal/page.tsx)
- **Tabs**: "Lista de Personal", "Importar Turno", "Asignación RFID/Habitación".
- **Lista de Personal**: Una Datatable (Shadcn Table) con búsqueda y paginación para ver trabajadores activos.

#### [NEW] [actions.ts (Personal)](file:///Users/sergioandresbarbosa/Desktop/Hotel%20Tajamonae/hotel-tajamonae/src/app/(admin)/personal/actions.ts)
- Server Actions para llamar a la RPC `procesar_cambio_turno` con el JSON de trabajadores extraído del Excel.
- Asignar habitación y RFID por servidor para evitar manipulación de cliente.

#### [NEW] [excel-dropzone.tsx](file:///Users/sergioandresbarbosa/Desktop/Hotel%20Tajamonae/hotel-tajamonae/src/components/hotel/excel-dropzone.tsx)
- Componente interactivo drag-and-drop.
- Lectura en el frontend del Blob/File `.xlsx` usando la dependencia `xlsx` (ya instanciada en `package.json`).

## Preguntas Abiertas

- La asignación de la habitación (y RFID) se describe de la siguiente forma: "agrupa operarios disponibles por empresa para sugerencias de habitación. El admin confirma y aplica la asignación". ¿Implemento primero un autocompletar manual por defecto o prefieres que desarrolle la lógica de autoagrupamiento inicial (inteligente)?

## Plan de Verificación

### Automated Tests
- Compilación `npx tsc --noEmit` sin errores al integrar RPCs tipados.
- Chequeo de Lint en nuevas páginas servidor.

### Verificación Manual
- Acceder como admin, navegar a `/habitaciones` y validar si despliega la cuadrícula.
- Cargar un Excel `.xlsx` genérico para validar que el parseo envíe el payload esperado a la función RPC de Supabase.
- Confirmar el registro en la nueva tabla y visualizarlo en "Lista de Personal".
