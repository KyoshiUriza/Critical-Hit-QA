const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/api-lab.html';

async function send(page, { method, url, body, token }) {
  await page.getByTestId('api-method').selectOption(method);
  await page.getByTestId('api-url').fill(url);
  await page.getByTestId('api-body').fill(body ? JSON.stringify(body) : '');
  const box = page.getByTestId('api-token');
  if (token) await box.check(); else await box.uncheck();
  await page.getByTestId('api-send').click();
}

test.describe('API Lab', () => {
  test('makes no network requests at all', async ({ page }) => {
    // The reason this lab can exist without breaking connect-src 'none' and
    // the offline guarantee. If it ever starts calling out, this fails.
    const external = [];
    page.on('request', (r) => {
      if (!r.url().includes('/practice-apps/') && !r.url().includes('/js/') &&
          !r.url().includes('/css/') && !r.url().includes('/fonts/')) {
        external.push(r.url());
      }
    });
    await page.goto(APP + '?reset');
    await send(page, { method: 'GET', url: '/users' });
    await send(page, { method: 'POST', url: '/users', body: { name: 'X', email: 'x@test.example' } });
    expect(external, 'the lab must not reach the network').toEqual([]);
  });

  test('200 on a real user, 404 on one that does not exist', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'GET', url: '/users/1' });
    await expect(page.getByTestId('api-status')).toHaveText('200');
    await expect(page.getByTestId('api-body-out')).toContainText('Ada Okonkwo');

    await send(page, { method: 'GET', url: '/users/9999' });
    await expect(page.getByTestId('api-status')).toHaveText('404');
    await expect(page.getByTestId('api-body-out')).toContainText('not_found');
  });

  test('422 names the offending field; 409 is used for a duplicate', async ({ page }) => {
    // The distinction the exercises exist to teach: invalid input vs a valid
    // request that collides with state.
    await page.goto(APP + '?reset');
    await send(page, { method: 'POST', url: '/users', body: { name: 'No Email' } });
    await expect(page.getByTestId('api-status')).toHaveText('422');
    await expect(page.getByTestId('api-body-out')).toContainText('"field": "email"');

    await send(page, { method: 'POST', url: '/users', body: { name: 'Dup', email: 'ada@test.example' } });
    await expect(page.getByTestId('api-status')).toHaveText('409');
    await expect(page.getByTestId('api-body-out')).toContainText('conflict');
  });

  test('201 carries a Location header', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'POST', url: '/users', body: { name: 'New', email: 'new@test.example' } });
    await expect(page.getByTestId('api-status')).toHaveText('201');
    await expect(page.getByTestId('api-headers')).toContainText('location: /users/');
  });

  test('orders need a token: 401 without, 200 with', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'GET', url: '/orders' });
    await expect(page.getByTestId('api-status')).toHaveText('401');

    await send(page, { method: 'GET', url: '/orders', token: true });
    await expect(page.getByTestId('api-status')).toHaveText('200');
  });

  test('DELETE is idempotent in state: 204 then 404', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'DELETE', url: '/users/2' });
    await expect(page.getByTestId('api-status')).toHaveText('204');
    await expect(page.getByTestId('api-body-out')).toContainText('no content');

    await send(page, { method: 'DELETE', url: '/users/2' });
    await expect(page.getByTestId('api-status')).toHaveText('404');

    // State is identical after both calls — that is what idempotent means.
    await send(page, { method: 'GET', url: '/users/2' });
    await expect(page.getByTestId('api-status')).toHaveText('404');
  });

  test('PUT twice leaves one record with the same values', async ({ page }) => {
    await page.goto(APP + '?reset');
    for (let i = 0; i < 2; i++) {
      await send(page, { method: 'PUT', url: '/users/1', body: { name: 'Renamed' } });
      await expect(page.getByTestId('api-status')).toHaveText('200');
    }
    await send(page, { method: 'GET', url: '/users' });
    const body = await page.getByTestId('api-body-out').textContent();
    expect((body.match(/Renamed/g) || []).length, 'PUT must not duplicate').toBe(1);
  });

  test('a known path with the wrong verb is 405, not 404', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'PUT', url: '/orders' });
    await expect(page.getByTestId('api-status')).toHaveText('405');
  });

  test('malformed request JSON is reported as the caller\'s error', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('api-method').selectOption('POST');
    await page.getByTestId('api-url').fill('/users');
    await page.getByTestId('api-body').fill('{ not json');
    await page.getByTestId('api-send').click();
    await expect(page.getByTestId('api-body-out')).toContainText('not valid JSON');
  });

  test('completing exercise 1 is graded and recorded', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'GET', url: '/users/1' });
    await expect(page.getByTestId('api-verdict')).toContainText('Correct');

    const runs = await page.evaluate(() => window.Progress.get().quiz.byCategory.api);
    expect(runs.correct).toBeGreaterThan(0);
  });

  test('a wrong answer is not marked correct', async ({ page }) => {
    await page.goto(APP + '?reset');
    // Exercise 1 wants /users/1; this is a valid request but the wrong one.
    await send(page, { method: 'GET', url: '/users' });
    await expect(page.getByTestId('api-verdict')).toContainText('Not yet');
  });

  test('reset restores the seeded data', async ({ page }) => {
    await page.goto(APP + '?reset');
    await send(page, { method: 'DELETE', url: '/users/2' });
    await page.getByTestId('api-reset').click();
    await send(page, { method: 'GET', url: '/users/2' });
    await expect(page.getByTestId('api-status')).toHaveText('200');
  });

  test('response bodies are rendered as text, never as markup', async ({ page }) => {
    // The body echoes values the user supplied. Rendering a server response
    // into innerHTML is a real vulnerability class.
    await page.goto(APP + '?reset');
    await send(page, {
      method: 'POST', url: '/users',
      body: { name: '<img src=x onerror=1>', email: 'inj@test.example' }
    });
    await expect(page.getByTestId('api-body-out')).toContainText('<img src=x onerror=1>');
    expect(await page.locator('#api-body-out img').count()).toBe(0);
  });
});
