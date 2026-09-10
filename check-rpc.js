import { createClient } from '@supabase/supabase-js'

const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'

const supabase = createClient(url, key)

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { query: `
    SELECT prosrc 
    FROM pg_proc 
    WHERE proname = 'procesar_cambio_turno';
  `})
  if (error) {
    // If 'execute_sql' doesn't exist, we can create a temporary RPC or use pg_meta.
    console.error('Error:', error.message)
    return
  }
  console.log(data)
}

check()
