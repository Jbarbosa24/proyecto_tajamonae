import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function listOperarios() {
  const { data, error } = await supabase
    .from('operarios')
    .select('id, nombre_completo, rfid_uid, activo')
  
  if (error) {
    console.error('Error listing operarios:', error)
    return
  }
  
  console.log('Operarios en el sistema:')
  data.forEach(o => {
    console.log(`- ID: ${o.id}, Nombre: ${o.nombre_completo}, RFID: "${o.rfid_uid}", Activo: ${o.activo}`)
  })
}

listOperarios()
