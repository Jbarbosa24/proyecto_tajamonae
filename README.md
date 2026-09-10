# Sistema de Gestión y Control Hotelero

Sistema web para la operación hotelera centralizada, orientado al control de consumos, hospedaje, reportería y autenticación de usuarios. La solución está diseñada para operar con trazabilidad de movimientos, validación de accesos por perfil y persistencia de datos en una base transaccional administrada desde Supabase.

## Stack tecnológico

- Next.js para la capa web y el enrutamiento de la aplicación.
- TypeScript para tipado estático y mantenimiento de la base de código.
- PostgreSQL gestionado a través de Supabase para almacenamiento, seguridad y autenticación.
- Tailwind CSS para estilos utilitarios y composición de interfaz.
- Integraciones complementarias para exportación de reportes, hojas de cálculo y documentos operativos.

## Módulos principales

- Control de consumos: registro y seguimiento de consumos operativos y sus reportes asociados.
- Hospedaje: gestión de estados, operaciones de habitaciones y flujo de atención.
- Reportería: exportación y consolidación de información para seguimiento administrativo.
- Autenticación: acceso seguro por perfiles y políticas de autorización.

## Instalación local

1. Instala dependencias:
	```bash
	npm install
	```

2. Crea tu archivo de entorno local a partir de `.env.example` y completa las variables requeridas:
	```env
	NEXT_PUBLIC_SUPABASE_URL=
	NEXT_PUBLIC_SUPABASE_ANON_KEY=
	SUPABASE_SERVICE_ROLE_KEY=
	```

3. Ejecuta el entorno de desarrollo:
	```bash
	npm run dev
	```

4. Abre la aplicación en:
	```text
	http://localhost:3000
	```

## Comandos útiles

- `npm run build` para validar el empaquetado de producción.
- `npm run lint` para revisar estilo y errores estáticos.
- `npm run test:coverage` para ejecutar la batería de pruebas con cobertura.
