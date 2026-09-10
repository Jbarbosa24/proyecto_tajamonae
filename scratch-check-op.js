import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function checkOp() {
  const { data: operarios } = await supabase
    .from('operarios')
    .select('id, nombre_completo, documento_identidad')
    .eq('documento_identidad', '1045223881') // Claudia's CC from the log
    .single()

  if (!operarios) {
    console.log('Operario no encontrado')
    return
  }

  console.log(`Operario: ${operarios.nombre_completo} (ID: ${operarios.id})`)

  const { data: credits, error } = await supabase
    .from('creditos_diarios')
    .select('id, fecha, tipo, consumido')
    .eq('operario_id', operarios.id)
    .order('fecha', { ascending: true })

  if (error) {
    console.error('Error fetching credits:', error)
    return
  }

  console.log(`Total créditos para ella: ${credits.length}`)
  
  // Group by date
  const grouped = {}
  credits.forEach(c => {
    if (!grouped[c.fecha]) grouped[c.fecha] = []
    grouped[c.fecha].push(`${c.tipo} (Consumido: ${c.consumido})`)
  })

  console.log('Fechas y tipos de créditos que posee:')
  console.log(JSON.stringify(grouped, null, 2))
}

checkOp()
