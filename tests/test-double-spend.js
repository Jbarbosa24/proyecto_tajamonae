import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
})

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function runDoubleSpendTest() {
  console.log('=== INICIANDO PRUEBA SCA-02: PREVENCIÓN DE DOBLE GASTO ===')
  
  // 1. Obtener operario de prueba con UID 'TEST-RFID-001'
  const { data: operario, error: opError } = await supabaseAdmin
    .from('operarios')
    .select('id, nombre_completo, empresa_id')
    .eq('rfid_uid', 'TEST-RFID-001')
    .single()

  if (opError || !operario) {
    console.error('Error: No se encontró el operario de prueba con RFID TEST-RFID-001', opError)
    return
  }

  console.log(`Operario de prueba: ${operario.nombre_completo} (ID: ${operario.id})`)

  // 2. Garantizar que tenga EXACTAMENTE UN crédito no consumido de 'Desayuno' para hoy
  const today = new Date().toISOString().split('T')[0]
  console.log(`Configurando créditos de prueba para hoy (${today})...`)
  
  // Borrar créditos anteriores de Desayuno para hoy
  await supabaseAdmin
    .from('creditos_diarios')
    .delete()
    .eq('operario_id', operario.id)
    .eq('fecha', today)
    .eq('tipo', 'Desayuno')

  // Borrar servicios de Desayuno de hoy para este operario
  await supabaseAdmin
    .from('servicios')
    .delete()
    .eq('operario_id', operario.id)
    .eq('fecha', today)
    .eq('tipo', 'Desayuno')

  // Crear exactamente un crédito de Desayuno no consumido
  const { data: creditRecord, error: creditCreateError } = await supabaseAdmin
    .from('creditos_diarios')
    .insert({
      operario_id: operario.id,
      fecha: today,
      tipo: 'Desayuno',
      consumido: false
    })
    .select('id')
    .single()

  if (creditCreateError || !creditRecord) {
    console.error('Error creando crédito de prueba:', creditCreateError)
    return
  }

  console.log(`Crédito de Desayuno creado con ID: ${creditRecord.id}`)

  // 3. Crear usuario temporal y obtener sesión vía API para autenticar peticiones
  const TEST_EMAIL = `double.spend.${Date.now()}@tajamonae.com`
  const TEST_PASSWORD = 'TestPassword123!'
  
  console.log(`Creando usuario de autenticación temporal (${TEST_EMAIL})...`)
  const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { nombre_completo: 'Double Spend Auth Test', rol: 'admin' }
  })

  if (authErr || !auth.user) {
    console.error('Error al crear usuario temporal de autenticación:', authErr)
    return
  }

  // Crear perfil
  await supabaseAdmin.from('perfiles').upsert({ id: auth.user.id, rol: 'admin', activo: true, nombre_completo: 'Double Spend Auth Test' })

  let cookieHeader = '';
  try {
    console.log('Autenticando contra la API local para obtener cookies de sesión...')
    const loginResponse = await fetch('http://localhost:3000/api/test/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    })
    const loginResult = await loginResponse.json()
    console.log('Login API status:', loginResponse.status, loginResult)
    
    cookieHeader = loginResponse.headers.get('set-cookie') || '';
    if (!cookieHeader) {
      console.warn('Advertencia: No se recibió cabecera set-cookie del API. Intentando continuar sin cookies.');
    }
  } catch (err) {
    console.error('Error al autenticar en la API:', err.message)
  }

  // 4. Lanzar dos peticiones concurrentes en el mismo instante
  console.log('Lanzando 2 solicitudes concurrentes de RFID a la API...')
  
  const postUrl = 'http://localhost:3000/api/test/rfid'
  const payload = {
    uid: 'TEST-RFID-001',
    tipoServicio: 'Desayuno'
  }

  const callApi = async (reqId) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader
      }
      
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      console.log(`[Solicitud ${reqId}] Status: ${response.status}, Res:`, result)
      return { reqId, status: response.status, ok: result.ok, msg: result.message }
    } catch (e) {
      console.error(`[Solicitud ${reqId}] Falló la conexión:`, e.message)
      return { reqId, status: 0, ok: false, msg: e.message }
    }
  }

  // Ejecutamos ambas solicitudes concurrentemente usando Promise.all
  const results = await Promise.all([
    callApi(1),
    callApi(2)
  ])

  // 5. Analizar los resultados de base de datos
  console.log('\nAnalizando estado en la base de datos...')
  
  // Buscar cuántos registros de servicios de tipo Desayuno se crearon hoy para este operario
  const { data: serviciosInsertados } = await supabaseAdmin
    .from('servicios')
    .select('id, tipo, valor_total')
    .eq('operario_id', operario.id)
    .eq('fecha', today)
    .eq('tipo', 'Desayuno')

  const countServicios = serviciosInsertados ? serviciosInsertados.length : 0
  console.log(`- Servicios creados hoy: ${countServicios}`)
  
  // Verificar estado del crédito
  const { data: creditoActual } = await supabaseAdmin
    .from('creditos_diarios')
    .select('consumido, servicio_id')
    .eq('id', creditRecord.id)
    .single()

  console.log(`- Crédito consumido: ${creditoActual?.consumido}, servicio_id asociado: ${creditoActual?.servicio_id}`)

  console.log('\n--- CONCLUSIÓN ---')
  if (countServicios > 1) {
    console.log('RESULTADO: ¡VULNERABILIDAD DETECTADA! (Doble Gasto).');
    console.log(`Razón: Se crearon ${countServicios} servicios usando un único crédito diario debido a condiciones de carrera (Race Condition) en Next.js Server Actions.`);
  } else if (results.some(r => r.ok === false) && countServicios === 1) {
    console.log('RESULTADO: ¡ÉXITO! Se previno el doble gasto. Una solicitud fue aceptada y la otra fue rechazada.');
  } else {
    console.log('RESULTADO: Incierto. Ambos fallaron o no se insertaron registros.');
  }

  // 6. Limpiar registros de prueba
  console.log('\nLimpiando registros de prueba...');
  await supabaseAdmin.from('servicios').delete().eq('operario_id', operario.id).eq('fecha', today).eq('tipo', 'Desayuno')
  await supabaseAdmin.from('creditos_diarios').delete().eq('operario_id', operario.id).eq('fecha', today).eq('tipo', 'Desayuno')
  await supabaseAdmin.from('perfiles').delete().eq('id', auth.user.id)
  await supabaseAdmin.auth.admin.deleteUser(auth.user.id)
  console.log('Limpieza completada.');
}

runDoubleSpendTest()
