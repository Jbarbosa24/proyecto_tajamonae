import autocannon from 'autocannon';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envRaw = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envRaw.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [k, ...v] = line.split('=');
    envVars[k.trim()] = v.join('=').trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching a valid operario RFID...');
  const { data, error } = await supabase.from('operarios').select('rfid_uid').not('rfid_uid', 'is', null).limit(1);
  let uid = 'fake-123';
  if (data && data.length > 0) {
    uid = data[0].rfid_uid;
    console.log(`Found valid UID: ${uid}`);
  } else {
    console.log('No valid UID found, using fake one.');
  }

  console.log(`Starting stress test on http://localhost:3000/api/test/rfid with UID ${uid}...`);

  const instance = autocannon({
    url: 'http://localhost:3000/api/test/rfid',
    connections: 50, // 50 concurrent connections
    pipelining: 1,
    duration: 10, // 10 seconds of sustained load
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uid: uid,
      tipoServicio: 'Hospedaje'
    })
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log('Stress test complete!');
    fs.writeFileSync('stress-result.json', JSON.stringify(result, null, 2));
    process.exit(0);
  });
}

run();
