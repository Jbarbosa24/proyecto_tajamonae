import { createClient } from '@supabase/supabase-js'
const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'
const supabase = createClient(url, key)
async function test() {
  const { data } = await supabase.from('perfiles').select('rol, empresa_id').limit(5)
  console.log(data)
  
  const { data: d2 } = await supabase.from('empresas').select('*')
  console.log("Empresas:", d2?.map(e => [e.id, e.sigla]))
}
test()
