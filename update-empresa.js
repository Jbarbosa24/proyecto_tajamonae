import { createClient } from '@supabase/supabase-js'
const url = 'https://agwtkhfmhjklcykohsid.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd3RraGZtaGprbGN5a29oc2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTgxMSwiZXhwIjoyMDkwMzk3ODExfQ.sUtnSThjlvaFdUs-MOAJg1a5kH9PnT2YcrYE6GxEY68'
const supabase = createClient(url, key)

async function run() {
    const { data: users } = await supabase.auth.admin.listUsers() // this is available to service role
    console.log("Users:", users.users.slice(0,2).map(u => u.email))
}
run()
