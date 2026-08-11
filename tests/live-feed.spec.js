// Live Feed — async and races.
//
// The delays are fixed rather than random precisely so these tests are not
// flaky: a race that only reproduces sometimes is a bad exercise and a worse
// test. Every assertion below drives the exact overlap the defect needs.
const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/live-feed-broken.html';
const finds = (page) => page.evaluate(() => window.Progress.getBugBountyFinds('live-feed') || []);

test.describe('Live Feed — the races are real', () => {
  test('two clicks inside the in-flight window post the message twice', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('composer').fill('deploying now');

    // dblclick, not two clicks. Playwright's second click() waits for the
    // element to be stable after the feed re-renders, which pushes it past
    // the 600ms window and misses the defect entirely. A user double-clicking
    // an unresponsive button is also the real scenario.
    await page.getByTestId('send').dblclick();

    const mine = page.getByTestId('post-text').filter({ hasText: 'deploying now' });
    await expect(mine, 'the same message was posted twice').toHaveCount(2);
  });

  test('waiting for the first post to land makes the second click harmless', async ({ page }) => {
    // Proves the defect is the window and not the button — which is exactly
    // the distinction a learner has to make to report it correctly.
    await page.goto(APP + '?reset');
    await page.getByTestId('composer').fill('deploying now');
    await page.getByTestId('send').click();
    await expect(page.getByTestId('save-log')).toContainText('POST /posts');
    await page.getByTestId('send').click();

    await expect(page.getByTestId('post-text').filter({ hasText: 'deploying now' })).toHaveCount(1);
    await expect(page.getByTestId('compose-error')).toContainText('Write something first');
  });

  test('a rejected save leaves the post on screen labelled Sent', async ({ page }) => {
    await page.goto(APP + '?reset');
    // Every third save is rejected.
    for (let i = 1; i <= 3; i++) {
      await page.getByTestId('composer').fill('message ' + i);
      await page.getByTestId('send').click();
      await expect(page.getByTestId('save-log')).toContainText('save #' + i);
    }
    await expect(page.getByTestId('save-log')).toContainText('400 Rejected');

    // The row for the rejected message is still there, and still claims Sent.
    const row = page.locator('[data-testid="post"]').filter({ hasText: 'message 3' });
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('post-status')).toHaveText('Sent');
  });

  test('a slower earlier search overwrites the newer results', async ({ page }) => {
    await page.goto(APP + '?reset');
    // Per-character input events: the 1-char query is the slow one, so it
    // lands last and wins.
    await page.getByTestId('search').pressSequentially('sl', { delay: 20 });

    await expect(page.getByTestId('result-count')).toContainText('for “s”');
    await expect(page.getByTestId('search'), 'the box says something else').toHaveValue('sl');
  });

  test('a single settled query gives results that match the box', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('search').fill('search');
    await expect(page.getByTestId('result-count')).toContainText('for “search”');
  });

  test('two overlapping refreshes append the same items twice', async ({ page }) => {
    await page.goto(APP + '?reset');
    const before = await page.getByTestId('post').count();

    await page.getByTestId('refresh').click();
    await page.getByTestId('refresh').click();
    await expect(page.getByTestId('refresh-status')).toContainText('refreshed');

    await expect.poll(() => page.getByTestId('post').count())
      .toBe(before + before * 2);

    const ids = await page.getByTestId('post').evaluateAll((rows) =>
      rows.map((r) => r.getAttribute('data-post-id'))
    );
    expect(new Set(ids).size, 'items were appended, not merged by id').toBeLessThan(ids.length);
  });

  test('a refresh discards what you were typing', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('composer').fill('half-written thought');
    await page.getByTestId('refresh').click();

    await expect(page.getByTestId('composer')).toHaveValue('');
    await expect(page.getByTestId('refresh-status')).toContainText('your draft was replaced');
  });

  test('three simultaneous arrivals increment the counter once', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('simulate').click();
    await expect(page.getByTestId('unread')).toContainText('unread');
    // Read-then-write: all three read 0 and all three write 1.
    await expect.poll(() => page.getByTestId('unread').textContent()).toBe('1 unread');
  });
});

test.describe('Live Feed — detection', () => {
  test('loading the app and reading it reveals nothing', async ({ page }) => {
    await page.goto(APP + '?reset');
    await expect(page.getByTestId('post')).toHaveCount(3);
    expect(await finds(page)).toEqual([]);
  });

  test('one careful post at a time reveals nothing', async ({ page }) => {
    // The point of the app: doing one thing and waiting finds none of these.
    await page.goto(APP + '?reset');
    await page.getByTestId('composer').fill('careful message');
    await page.getByTestId('send').click();
    await expect(page.getByTestId('save-log')).toContainText('201 Created');
    expect(await finds(page)).toEqual([]);
  });

  test('each defect is recorded by the overlap that reveals it', async ({ page }) => {
    await page.goto(APP + '?reset');

    await page.getByTestId('composer').fill('twice');
    await page.getByTestId('send').dblclick();
    await expect.poll(() => finds(page)).toContain('double-submit');

    await page.getByTestId('search').pressSequentially('sl', { delay: 20 });
    await expect.poll(() => finds(page)).toContain('stale-response');

    await page.getByTestId('composer').fill('draft');
    await page.getByTestId('refresh').click();
    await expect.poll(() => finds(page)).toContain('lost-update');

    await page.getByTestId('simulate').click();
    await expect.poll(() => finds(page)).toContain('counter-race');
  });

  test('every catalogued defect is reachable — none are unfindable', async ({ page }) => {
    await page.goto(APP + '?reset');
    const known = await page.evaluate(() =>
      window.APP_DEFECTS['live-feed'].defects.map((d) => d.id));
    const src = await (await page.request.get('/js/live-feed.js')).text();
    const triggered = [...new Set([...src.matchAll(/trigger\("([a-z0-9-]+)"\)/g)].map((m) => m[1]))];

    expect(known.filter((id) => !triggered.includes(id)), 'catalogued but never triggerable').toEqual([]);
    expect(triggered.filter((id) => !known.includes(id)), 'triggered but not catalogued').toEqual([]);
  });

  test('the app is not random — the same overlap gives the same result', async ({ page }) => {
    // A learner cannot report what they cannot reproduce, and the site should
    // not ship an exercise that behaves differently on the second attempt.
    const counts = [];
    for (let run = 0; run < 3; run++) {
      await page.goto(APP + '?reset');
      await page.getByTestId('composer').fill('repeatable');
      await page.getByTestId('send').dblclick();
      await expect(page.getByTestId('save-log')).toContainText('POST /posts');
      counts.push(await page.getByTestId('post-text').filter({ hasText: 'repeatable' }).count());
    }
    expect(new Set(counts).size, `not reproducible: ${counts.join(', ')}`).toBe(1);
    expect(counts[0], 'the double-submit must reproduce every time').toBe(2);
  });
});
