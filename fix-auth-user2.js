import { createClient } from '@supabase/supabase-js'
const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'
const supabase = createClient(url, key)

async function run() {
    // Fix the profile
    const { error } = await supabase.from('perfiles').update({
        rol: 'logistico',
        empresa_id: '1c3b8417-adce-4b30-aa66-49c0da86fe22'
    }).eq('id', '62f8ead4-6716-4f46-a563-7ab54ff5fb19')
    console.log("Error? ", error)
}
run()
