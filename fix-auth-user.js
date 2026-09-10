import { createClient } from '@supabase/supabase-js'
const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'
const supabase = createClient(url, key)

async function run() {
    const { data: users } = await supabase.auth.admin.listUsers()
    for (let u of users.users) {
        if (u.email && u.email.includes('logistico') || (u.user_metadata && u.user_metadata.rol === 'logistico')) {
            console.log("Logistico user:", u.email, u.user_metadata)
            // also get su perfil
            const { data: p } = await supabase.from('perfiles').select('*').eq('id', u.id).single()
            console.log("Perfil:", p)
        }
    }
}
run()
