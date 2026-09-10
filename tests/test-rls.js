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

async function runRlsTest() {
  console.log('=== INICIANDO PRUEBA SEC-01: AISLAMIENTO RLS ===')
  
  // 1. Obtener dos empresas
  const { data: empresas, error: empError } = await supabaseAdmin
    .from('empresas')
    .select('id, sigla')
    .limit(2)

  if (empError || !empresas || empresas.length < 2) {
    console.error('Error: Se necesitan al menos 2 empresas en la base de datos para correr este test.', empError)
    return
  }

  const empresaA = empresas[0]
  const empresaB = empresas[1]
  console.log(`Empresa A: ${empresaA.sigla} (ID: ${empresaA.id})`)
  console.log(`Empresa B: ${empresaB.sigla} (ID: ${empresaB.id})`)

  // 2. Crear dos usuarios temporales en Auth
  const emailA = `test.contractor.a.${Date.now()}@tajamonae.com`
  const emailB = `test.contractor.b.${Date.now()}@tajamonae.com`
  const password = 'TestPassword123!'

  console.log(`Creando usuario temporal A (${emailA})...`)
  const { data: authA, error: authErrorA } = await supabaseAdmin.auth.admin.createUser({
    email: emailA,
    password: password,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Contratista A Test', rol: 'admin' }
  })

  if (authErrorA || !authA.user) {
    console.error('Error creando usuario A:', authErrorA)
    return
  }

  console.log(`Creando usuario temporal B (${emailB})...`)
  const { data: authB, error: authErrorB } = await supabaseAdmin.auth.admin.createUser({
    email: emailB,
    password: password,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Contratista B Test', rol: 'admin' }
  })

  if (authErrorB || !authB.user) {
    console.error('Error creando usuario B:', authErrorB)
    // Limpieza
    await supabaseAdmin.auth.admin.deleteUser(authA.user.id)
    return
  }

  try {
    // 3. Vincular los perfiles creados con sus respectivas empresas en la tabla perfiles
    console.log('Asociando perfiles con empresas...')
    const { error: profErrorA } = await supabaseAdmin
      .from('perfiles')
      .update({ empresa_id: empresaA.id, rol: 'admin' })
      .eq('id', authA.user.id)

    if (profErrorA) console.error('Error perfil A:', profErrorA)

    const { error: profErrorB } = await supabaseAdmin
      .from('perfiles')
      .update({ empresa_id: empresaB.id, rol: 'admin' })
      .eq('id', authB.user.id)

    if (profErrorB) console.error('Error perfil B:', profErrorB)

    // 4. Iniciar sesión como Usuario A
    console.log('\nIniciando sesión como Contratista A...')
    const clientA = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    })
    const { data: sessionA, error: loginErrorA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: password
    })

    if (loginErrorA) {
      console.error('Error de login A:', loginErrorA)
      return
    }

    // 5. Iniciar sesión como Usuario B
    console.log('Iniciando sesión como Contratista B...')
    const clientB = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    })
    const { data: sessionB, error: loginErrorB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: password
    })

    if (loginErrorB) {
      console.error('Error de login B:', loginErrorB)
      return
    }

    // 6. Ejecutar consultas cruzadas en la tabla servicios
    console.log('\n--- EVALUANDO CONSULTAS CON RLS ---')

    // Consulta de A
    const { data: servA, error: errQueryA } = await clientA
      .from('servicios')
      .select('id, empresa_id, tipo')

    console.log(`Contratista A ejecutó SELECT en servicios:`)
    console.log(`- Estado: ${errQueryA ? `Error (${errQueryA.message})` : 'Éxito'}`)
    console.log(`- Total registros leídos por A: ${servA?.length || 0}`)
    
    const registrosDeBA = (servA || []).filter(s => s.empresa_id === empresaB.id)
    console.log(`- Registros de la Empresa B leídos por A: ${registrosDeBA.length} (Debería ser 0 para un RLS correcto)`)

    // Consulta de B
    const { data: servB, error: errQueryB } = await clientB
      .from('servicios')
      .select('id, empresa_id, tipo')

    console.log(`\nContratista B ejecutó SELECT en servicios:`)
    console.log(`- Estado: ${errQueryB ? `Error (${errQueryB.message})` : 'Éxito'}`)
    console.log(`- Total registros leídos por B: ${servB?.length || 0}`)
    
    const registrosDeAB = (servB || []).filter(s => s.empresa_id === empresaA.id)
    console.log(`- Registros de la Empresa A leídos por B: ${registrosDeAB.length} (Debería ser 0 para un RLS correcto)`)

    console.log('\n--- CONCLUSIÓN ---')
    if (registrosDeBA.length === 0 && registrosDeAB.length === 0) {
      console.log('RESULTADO: ¡ÉXITO! El aislamiento RLS está bloqueando las lecturas cruzadas de servicios entre empresas.');
    } else {
      console.log('RESULTADO: ¡VULNERABILIDAD DETECTADA! Un contratista puede leer los servicios de otras empresas.');
      console.log('Razón: La tabla de servicios no tiene habilitada RLS o carece de una política restrictiva por empresa_id.');
    }

  } finally {
    // 7. Limpieza de usuarios
    console.log('\nLimpiando usuarios temporales...');
    await supabaseAdmin.from('perfiles').delete().eq('id', authA.user.id)
    await supabaseAdmin.from('perfiles').delete().eq('id', authB.user.id)
    await supabaseAdmin.auth.admin.deleteUser(authA.user.id)
    await supabaseAdmin.auth.admin.deleteUser(authB.user.id)
    console.log('Limpieza completada.');
  }
}

runRlsTest()
