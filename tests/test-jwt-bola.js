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

async function runJwtBolaTest() {
  console.log('=== INICIANDO PRUEBA SEC-02 & SEC-03: VALIDACIÓN JWT Y PREVENCIÓN BOLA ===')
  
  // --- 1. PRUEBA SEC-02: INTENTO DE ACCESO NO AUTENTICADO (O ANÓNIMO SIN SESIÓN) ---
  console.log('\n--- 1. SEC-02: Validando que consultas sin JWT autenticado (solo anon key sin sesión) no puedan escribir/editar ---')
  
  // Buscamos un operario existente para intentar modificarlo de forma anónima
  const { data: operarios, error: opErr } = await supabaseAdmin.from('operarios').select('id, nombre_completo').limit(1)
  if (opErr || !operarios || operarios.length === 0) {
    console.error('Error: No se encontró ningún operario para la prueba.', opErr)
    return
  }
  const targetOperario = operarios[0]
  console.log(`Operario objetivo para prueba de edición: ${targetOperario.nombre_completo} (ID: ${targetOperario.id})`)

  // Intentar modificar el nombre del operario usando el cliente anónimo (sin sesión iniciada)
  const originalNombre = targetOperario.nombre_completo
  const nuevoNombreFake = originalNombre + ' (HACKED)'
  
  console.log(`Intentando actualizar operario con cliente anónimo (sin login)...`)
  const { data: updateAnonData, error: updateAnonError } = await supabaseAnon
    .from('operarios')
    .update({ nombre_completo: nuevoNombreFake })
    .eq('id', targetOperario.id)
    .select()

  console.log(`- Estado: ${updateAnonError ? `Error bloqueado con éxito (${updateAnonError.message})` : 'Éxito (¡Vulnerabilidad SEC-02!)'}`)
  if (!updateAnonError) {
    console.log(`- ¡ATENCIÓN!: Se pudo modificar el registro de forma anónima. Retornó:`, updateAnonData)
    // Restaurar
    await supabaseAdmin.from('operarios').update({ nombre_completo: originalNombre }).eq('id', targetOperario.id)
  }

  // --- 2. PRUEBA SEC-03: BROKEN OBJECT LEVEL AUTHORIZATION (BOLA) ---
  console.log('\n--- 2. SEC-03: Validando Broken Object Level Authorization (BOLA) con usuario de bajos privilegios ---')

  // Crear dos usuarios en Auth: uno de bajo privilegio ("aseadora") y otro que representa al objetivo
  const emailAseadora = `test.aseadora.${Date.now()}@tajamonae.com`
  const emailVictima = `test.victima.${Date.now()}@tajamonae.com`
  const password = 'TestPassword123!'

  console.log(`Creando usuario temporal de bajo privilegio Aseadora (${emailAseadora})...`)
  const { data: authAseadora, error: authAseadoraError } = await supabaseAdmin.auth.admin.createUser({
    email: emailAseadora,
    password: password,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Aseadora BOLA Test', rol: 'aseadora' }
  })

  if (authAseadoraError || !authAseadora.user) {
    console.error('Error creando usuario de prueba Aseadora:', authAseadoraError)
    return
  }

  console.log(`Creando usuario objetivo Víctima (${emailVictima})...`)
  const { data: authVictima, error: authVictimaError } = await supabaseAdmin.auth.admin.createUser({
    email: emailVictima,
    password: password,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Víctima BOLA Test', rol: 'camarera' }
  })

  if (authVictimaError || !authVictima.user) {
    console.error('Error creando usuario de prueba Víctima:', authVictimaError)
    await supabaseAdmin.auth.admin.deleteUser(authAseadora.user.id)
    return
  }

  try {
    // Vincular perfiles
    console.log('Vinculando perfiles en base de datos...')
    await supabaseAdmin.from('perfiles').update({ rol: 'aseadora', activo: true }).eq('id', authAseadora.user.id)
    await supabaseAdmin.from('perfiles').update({ rol: 'aseadora', activo: true }).eq('id', authVictima.user.id)

    // Iniciar sesión como Aseadora (bajo privilegio)
    console.log('Iniciando sesión como Aseadora...')
    const clientAseadora = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    })
    const { data: loginAseadora, error: loginAseadoraError } = await clientAseadora.auth.signInWithPassword({
      email: emailAseadora,
      password: password
    })

    if (loginAseadoraError) {
      console.error('Error al iniciar sesión como Aseadora:', loginAseadoraError)
      return
    }

    // Aseadora intenta editar el perfil de la Víctima (cambiar su nombre_completo o rol a admin)
    console.log(`Aseadora intenta editar el perfil de Víctima (ID: ${authVictima.user.id})...`)
    const { data: updateProfileData, error: updateProfileError } = await clientAseadora
      .from('perfiles')
      .update({ rol: 'admin', nombre_completo: 'Víctima Hackeada' })
      .eq('id', authVictima.user.id)
      .select()

    // RLS blocks silently: no SQL error but 0 rows affected — that IS a block, not a success
    const bolaSucceeded = !updateProfileError && updateProfileData && updateProfileData.length > 0
    console.log(`- Estado: ${updateProfileError ? `Bloqueado con éxito (${updateProfileError.message})` : bolaSucceeded ? 'Éxito (¡Vulnerabilidad SEC-03 BOLA!)' : 'Bloqueado con éxito (RLS retornó 0 filas — acceso denegado silenciosamente)'}`)
    if (bolaSucceeded) {
      console.log(`- ¡ATENCIÓN!: La aseadora pudo editar el perfil de otro usuario. Retornó:`, updateProfileData)
    }

    // Aseadora intenta editar su propio rol para ser 'admin'
    console.log(`Aseadora intenta elevar sus propios privilegios a 'admin'...`)
    const { data: privilegeEscData, error: privilegeEscError } = await clientAseadora
      .from('perfiles')
      .update({ rol: 'admin' })
      .eq('id', authAseadora.user.id)
      .select()

    console.log(`- Estado: ${privilegeEscError ? `Bloqueado con éxito (${privilegeEscError.message})` : 'Éxito (¡Vulnerabilidad Elevación de Privilegios!)'}`)
    if (!privilegeEscError && privilegeEscData && privilegeEscData.length > 0 && privilegeEscData[0].rol === 'admin') {
      console.log(`- ¡ATENCIÓN!: La aseadora pudo elevar sus propios privilegios a admin.`)
    }

    console.log('\n--- CONCLUSIÓN SEC-02 & SEC-03 ---')
    const hasSec02Vulnerability = !updateAnonError
    const hasSec03BolaVulnerability = !updateProfileError && updateProfileData && updateProfileData.length > 0
    const hasSec03EscVulnerability = !privilegeEscError && privilegeEscData?.[0]?.rol === 'admin'
    const hasSec03Vulnerability = hasSec03BolaVulnerability || hasSec03EscVulnerability
    
    if (!hasSec02Vulnerability && !hasSec03Vulnerability) {
      console.log('RESULTADO: ¡ÉXITO! La validación de JWT y las políticas RLS previenen accesos no autorizados y BOLA.');
    } else {
      console.log('RESULTADO: ¡VULNERABILIDADES DETECTADAS!');
      if (hasSec02Vulnerability) console.log('- SEC-02: Se permiten escrituras anónimas sin token JWT válido.');
      if (hasSec03Vulnerability) console.log('- SEC-03 (BOLA): Usuarios de bajo privilegio pueden modificar perfiles ajenos o elevar sus propios privilegios.');
    }

  } finally {
    // Limpieza
    console.log('\nLimpiando usuarios de prueba de BOLA...');
    await supabaseAdmin.from('perfiles').delete().eq('id', authAseadora.user.id)
    await supabaseAdmin.from('perfiles').delete().eq('id', authVictima.user.id)
    await supabaseAdmin.auth.admin.deleteUser(authAseadora.user.id)
    await supabaseAdmin.auth.admin.deleteUser(authVictima.user.id)
    console.log('Limpieza completada.');
  }
}

runJwtBolaTest()
