-- Cambiar fecha_ingreso_turno y fecha_salida_turno a TIMESTAMPTZ para que no recorten la hora local
ALTER TABLE public.operarios 
ALTER COLUMN fecha_ingreso_turno TYPE timestamptz USING fecha_ingreso_turno::timestamptz;

ALTER TABLE public.operarios 
ALTER COLUMN fecha_salida_turno TYPE timestamptz USING fecha_salida_turno::timestamptz;

-- Para garantizar consistencia, también se recomienda ajustar la columna 'fecha' en registros de camarería u otros si llega a surgir el problema, 
-- pero nos ceñimos a lo solicitado para evitar colapsar datos existentes que dependían de formato date literal.
