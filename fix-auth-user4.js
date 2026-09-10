import { createClient } from '@supabase/supabase-js'
const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'
const supabase = createClient(url, key)

async function run() {
    // Add logistico role
    await supabase.from('roles').insert({ nombre: 'logistico' });
    
    // Fix the profile
    const { error } = await supabase.from('perfiles').update({
        rol: 'logistico',
        empresa_id: '1c3b8417-adce-4b30-aa66-49c0da86fe22'
    }).eq('id', '62f8ead4-6716-4f46-a563-7ab54ff5fb19')
    console.log("Error updated: ", error)
    
    // Update admin user
    const { data: users } = await supabase.auth.admin.listUsers()
    for (let u of users.users) {
        if (u.email === 'logistico@hotel.com') { // Try to fix another logistico if exists
           await supabase.from('perfiles').update({
                rol: 'logistico',
                empresa_id: '1c3b8417-adce-4b30-aa66-49c0da86fe22'
           }).eq('id', u.id)
        }
    }
}
run()
