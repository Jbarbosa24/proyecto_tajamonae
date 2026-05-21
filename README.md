# Hotel Tajamonae - Sistema de Control y Gestión Hotelero

Este repositorio contiene el sistema integral de gestión y control para el Hotel Tajamonae, incluyendo el panel administrativo, control de lavandería, operación logística y registro de servicios. 

## Estructura del Proyecto

- `hotel-tajamonae/`: Contiene la aplicación web principal desarrollada en **Next.js**. Incluye toda la lógica del cliente (React, Tailwind CSS, shadcn/ui) y la integración con la base de datos (Supabase).
- `stitch_login_seguro_hotel_tajamonae/`: Archivos y plantillas base de diseño (prototipos y estructuras en HTML/CSS).
- Otros documentos de planificación e iteración (archivos Markdown).

## Requisitos Previos

Asegúrate de tener instalados:
- [Node.js](https://nodejs.org/) (versión 20 o superior recomendada)
- [pnpm](https://pnpm.io/) (El manejador de paquetes de este proyecto)
- [Git](https://git-scm.com/)

## Cómo iniciar el proyecto localmente

1. **Clonar el repositorio y entrar al proyecto web:**
   ```bash
   git clone https://github.com/Jbarbosa24/proyecto_tajamonae.git
   cd "proyecto_tajamonae/hotel-tajamonae"
   ```

2. **Instalar las dependencias:**
   Usamos `pnpm`, por lo cual debes ejecutar:
   ```bash
   pnpm install
   ```

3. **Variables de entorno:**
   Deberás configurar tu archivo `.env.local` dentro de `hotel-tajamonae` para enlazar tus claves de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

5. **Acceder a la aplicación:**
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador preferido.

## Tecnologías Principales

- **Framework:** Next.js (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS 
- **Base de Datos & Auth:** Supabase
- **Manejo de Estado:** Zustand
- **Reportes:** exceljs, jspdf
