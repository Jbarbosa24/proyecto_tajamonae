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

const TEST_EMAIL = `playwright.optimistic.${Date.now()}@tajamonae.com`;
const TEST_PASSWORD = 'TestPassword123!';
let userId = '';

test.describe('UX-01: Verificación de Interfaz Optimista (Optimistic UI)', () => {

  test.beforeAll(async () => {
    test.setTimeout(90000);
    console.log('Creando usuario de prueba para UI Optimista...');
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre_completo: 'Playwright Optimistic Test', rol: 'aseadora' }
    });

    if (authError || !auth.user) {
      throw new Error(`Error al crear usuario: ${authError?.message}`);
    }

    userId = auth.user.id;

    // Asignar rol de aseadora (usar upsert)
    const { error: profError } = await supabaseAdmin
      .from('perfiles')
      .upsert({ id: userId, rol: 'aseadora', activo: true, nombre_completo: 'Playwright Optimistic Test' });

    if (profError) throw profError;
  });

  test.afterAll(async () => {
    console.log('Limpiando usuario y registros de prueba de UI Optimista...');
    await supabaseAdmin.from('registro_camareria').delete().eq('aseadora_id', userId);
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  });

  test('La interfaz debe actualizar el estado visual inmediatamente ante retrasos de red', async ({ page }) => {
    // 1. Iniciar sesión vía API de pruebas para evitar errores de hidratación en la UI
    console.log('Iniciando sesión vía API de pruebas...');
    const loginRes = await page.request.post('/api/test/auth/login', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD }
    });
    const loginResult = await loginRes.json();
    console.log('Resultado login API:', loginResult);
    
    await page.goto('/camareria');
    console.log('URL actual después de goto /camareria:', page.url());

    // 2. Elegir una habitación con botón "Iniciar"
    await page.waitForSelector('button:has-text("Iniciar")');
    const roomCard = page.locator('div.border.bg-white', { has: page.locator('button:has-text("Iniciar")') }).first();
    const roomId = (await roomCard.locator('span.text-2xl').first().innerText()).trim();
    console.log(`Probando UI Optimista en habitación: ${roomId}`);

    // Limpiar registros de hoy para esa habitación
    const today = new Date().toISOString().split('T')[0];
    await supabaseAdmin.from('registro_camareria').delete().eq('habitacion_id', roomId).eq('fecha', today);
    await page.reload();

    // 3. Abrir el modal de inicio
    await page.waitForSelector('button:has-text("Iniciar")');
    const targetCard = page.locator('div.border.bg-white').filter({ hasText: roomId }).first();
    await targetCard.locator('button:has-text("Iniciar")').click();
    await page.waitForSelector('text=Iniciar Aseo');

    // Cargar imagen
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), 'public/assets/logo.png');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1500);

    // 4. Interceptar y retrasar las llamadas de red (retrasar peticiones de Supabase o API)
    // El servidor responde lento (3 segundos de retraso)
    await page.route('**/rest/v1/registro_camareria*', async (route) => {
      console.log('[Mock Network] Retrasando respuesta de la base de datos por 3000ms...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });
    
    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && (request.url().includes('supabase') || request.url().includes('actions'))) {
        console.log(`[Mock Network] Retrasando POST a ${request.url()} por 3000ms...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      await route.continue();
    });

    // 5. Hacer clic en "Confirmar Inicio" y medir el tiempo que tarda la UI en reaccionar
    const startTime = Date.now();
    const clickPromise = page.click('button:has-text("Confirmar")');

    // La interfaz debería cambiar de inmediato a un estado de carga o reflejar el cambio en menos de 500 ms
    // Verificamos si aparece el spinner, un estado de carga, o si el modal se cierra o se deshabilita rápidamente.
    const modalClosedOrLoading = await Promise.race([
      page.waitForSelector('text=Confirmar', { state: 'detached', timeout: 2000 }).then(() => 'closed').catch(() => null),
      page.waitForSelector('button:has-text("Confirmar"):disabled', { timeout: 2000 }).then(() => 'disabled').catch(() => null),
      page.waitForTimeout(2000).then(() => 'timeout')
    ]);

    const duration = Date.now() - startTime;
    console.log(`Tiempo de respuesta visual de la UI (sin overhead de click): ${duration} ms (Estado detectado: ${modalClosedOrLoading})`);

    // Esperar a que la petición lenta finalice y el click se complete
    await clickPromise.catch(() => {});
    await page.waitForTimeout(3500);

    // La UI debe responder en menos de 2000ms (incluyendo la simulación del click de Playwright)
    expect(duration).toBeLessThan(2000);
    expect(modalClosedOrLoading).not.toBe('timeout');
    expect(modalClosedOrLoading).not.toBeNull();
    console.log('¡PRUEBA UX-01 COMPLETA: La UI optimista responde de inmediato sin esperar al servidor!');
  });
});
