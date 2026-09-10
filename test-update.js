import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Faltan credenciales')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  console.log('Intentando actualizar habitacion con ID ficticio para ver tipo de error...')
  const { error } = await supabase
    .from('habitaciones')
    .update({ estado_aseo: 'En proceso' })
    .eq('id', 'test-id')

  console.log('Update Error:', error)
}

testUpdate()
