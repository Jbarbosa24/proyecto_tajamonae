import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_EMAIL = `playwright.cleaner.${Date.now()}@tajamonae.com`;
const TEST_PASSWORD = 'TestPassword123!';
let userId = '';

test.describe('REL-01 and REL-02: Disponibilidad y Sincronización Offline', () => {
  
  test.beforeAll(async () => {
    test.setTimeout(90000);
    console.log('Creando usuario temporal de camarería...');
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre_completo: 'Playwright Aseadora Test', rol: 'aseadora' }
    });

    if (authError || !auth.user) {
      throw new Error(`No se pudo crear el usuario de prueba: ${authError?.message}`);
    }

    userId = auth.user.id;

    // Asignar rol de aseadora (usar upsert para asegurar creación del perfil)
    const { error: profError } = await supabaseAdmin
      .from('perfiles')
      .upsert({ id: userId, rol: 'aseadora', activo: true, nombre_completo: 'Playwright Aseadora Test' });

    if (profError) {
      throw new Error(`No se pudo actualizar el perfil: ${profError.message}`);
    }
  });

  test.afterAll(async () => {
    console.log('Limpiando usuario y registros de prueba...');
    
    // Limpiar limpiezas creadas por este test para no contaminar
    await supabaseAdmin.from('registro_camareria').delete().eq('aseadora_id', userId);
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  });

  test('Debería guardar la limpieza en IndexedDB estando offline y sincronizarla al volver online', async ({ page, context }) => {
    // 1. Iniciar sesión vía API de pruebas para evitar errores de hidratación en la UI
    console.log('Iniciando sesión vía API de pruebas...');
    const loginRes = await page.request.post('/api/test/auth/login', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD }
    });
    const loginResult = await loginRes.json();
    console.log('Resultado login API:', loginResult);
    
    await page.goto('/camareria');
    console.log('Navegado a camareria. URL actual:', page.url());
    const bodyText = await page.innerText('body');
    console.log('Contenido inicial del body (primeros 300 caracteres):', bodyText.substring(0, 300).replace(/\n/g, ' '));

    // 2. Buscar una habitación con botón "Iniciar"
    await page.waitForSelector('button:has-text("Iniciar")');
    const roomCard = page.locator('div.border.bg-white', { has: page.locator('button:has-text("Iniciar")') }).first();
    const roomId = (await roomCard.locator('span.text-2xl').first().innerText()).trim();
    console.log(`Habitación seleccionada para la prueba: ${roomId}`);

    // Limpiar registros previos de esa habitación de hoy para evitar conflictos
    const today = new Date().toISOString().split('T')[0]; // simple split is fine for DB cleanup in test
    await supabaseAdmin.from('registro_camareria').delete().eq('habitacion_id', roomId).eq('fecha', today);

    // Recargar página para asegurar estado limpio
    await page.reload();

    // 3. Abrir el modal para iniciar aseo
    await page.waitForSelector('button:has-text("Iniciar")');
    const targetCard = page.locator('div.border.bg-white').filter({ hasText: roomId }).first();
    await targetCard.locator('button:has-text("Iniciar")').click();
    await page.waitForSelector('text=Iniciar Aseo');

    // 4. Activar el modo OFFLINE en el navegador (REL-01)
    console.log('Cambiando a estado OFFLINE...');
    await context.setOffline(true);

    // 5. Cargar imagen de prueba y enviar
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), 'public/assets/logo.png');
    await fileInput.setInputFiles(testImagePath);

    // Esperar a que la imagen se procese (el indicador cambie)
    await page.waitForTimeout(1500);

    console.log('Confirmando inicio de limpieza en modo offline...');
    await page.click('button:has-text("Confirmar Inicio")');

    // 6. Verificar que IndexedDB contenga la tarea (REL-01 completado)
    console.log('Consultando IndexedDB para confirmar retención local...');
    const pendingTasks = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('TajamonaeOfflineDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('tasks', 'readonly');
          const store = tx.objectStore('tasks');
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result);
        };
      });
    }) as any[];

    console.log('Tareas encontradas en IndexedDB:', pendingTasks);
    expect(pendingTasks.length).toBe(1);
    expect(pendingTasks[0].type).toBe('INICIAR_LIMPIEZA');
    expect(pendingTasks[0].payload.roomId).toBe(roomId);
    console.log('¡PRUEBA REL-01 COMPLETA: Transacción almacenada en IndexedDB!');

    // 7. Volver a estar ONLINE (REL-02)
    console.log('Cambiando a estado ONLINE...');
    await context.setOffline(false);
    
    // Disparar evento online manualmente en la ventana para forzar la sincronización
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Esperar a que termine la sincronización
    console.log('Esperando sincronización de tareas...');
    await page.waitForTimeout(8000);

    // 8. Verificar que IndexedDB esté vacío
    const remainingTasks = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('TajamonaeOfflineDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('tasks', 'readonly');
          const store = tx.objectStore('tasks');
          const getAll = store.getAll();
          getAll.onsuccess = () => resolve(getAll.result);
        };
      });
    }) as any[];

    console.log('Tareas restantes en IndexedDB:', remainingTasks);
    expect(remainingTasks.length).toBe(0);

    // 9. Verificar en Supabase que el registro se creó (REL-02 completado)
    const { data: dbRecord } = await supabaseAdmin
      .from('registro_camareria')
      .select('id, estado')
      .eq('habitacion_id', roomId)
      .eq('aseadora_id', userId)
      .single();

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.estado).toBe('En proceso');
    console.log(`¡PRUEBA REL-02 COMPLETA: Tarea sincronizada exitosamente. Registro creado en DB: ${dbRecord?.id}!`);
  });
});
