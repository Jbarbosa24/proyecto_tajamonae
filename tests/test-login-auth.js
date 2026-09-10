import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
})

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const supabaseAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function testLogin() {
  const email = `test.login.${Date.now()}@tajamonae.com`
  const password = 'TestPassword123!'
  
  console.log(`Creando usuario de prueba: ${email}`)
  const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Test Login User', rol: 'aseadora' }
  })
  
  if (authError || !auth.user) {
    console.error('Error al crear usuario:', authError)
    return
  }
  
  console.log(`Usuario creado ID: ${auth.user.id}. Intentando iniciar sesión con cliente anon...`)
  
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  })
  
  if (loginError) {
    console.error('Error de inicio de sesión:', loginError)
  } else {
    console.log('Inicio de sesión exitoso. JWT Token:', loginData.session?.access_token ? 'Sí' : 'No')
  }
  
  // Limpieza
  console.log('Limpiando usuario...')
  await supabaseAdmin.auth.admin.deleteUser(auth.user.id)
  console.log('Limpieza completada.')
}

testLogin()
