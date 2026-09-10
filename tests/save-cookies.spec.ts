import { test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_EMAIL = `playwright.auth.${Date.now()}@tajamonae.com`;
const TEST_PASSWORD = 'TestPassword123!';
let userId = '';

test.describe('Save Cookies for Load and Double Spend Tests', () => {

  test.beforeAll(async () => {
    // Crear usuario temporal
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre_completo: 'Cookie Saver Test', rol: 'admin' }
    });

    if (authError || !auth.user) {
      throw new Error(`Error al crear usuario: ${authError?.message}`);
    }

    userId = auth.user.id;

    // Asignar rol de admin para que pueda acceder a las rutas
    const { error: profError } = await supabaseAdmin
      .from('perfiles')
      .upsert({ id: userId, rol: 'admin', activo: true, nombre_completo: 'Cookie Saver Test' });

    if (profError) throw profError;
  });

  test.afterAll(async () => {
    // Limpieza
    console.log('Limpiando usuario cookie saver...');
    await supabaseAdmin.from('perfiles').delete().eq('id', userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  });

  test('Debería loguearse y guardar las cookies', async ({ page, context }) => {
    test.setTimeout(90000);
    console.log('Navegando a login...');
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    const formOuterHtml = await page.locator('form').evaluate(el => el.outerHTML);
    console.log('FORM OUTER HTML IN BROWSER:', formOuterHtml);

    console.log('Enviando formulario...');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(url => url.pathname !== '/login', { timeout: 60000 });
    console.log('Login completado. URL post-login:', page.url());

    // Obtener cookies del contexto
    const cookies = await context.cookies();
    console.log('Cookies obtenidas:', cookies.length);

    // Guardar cookies a un archivo
    fs.writeFileSync('tests/cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies guardadas en tests/cookies.json');
  });
});
