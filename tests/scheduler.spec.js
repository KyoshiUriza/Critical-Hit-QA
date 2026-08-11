// Scheduler — timezone and DST.
//
// These assert the ARITHMETIC, not the wording. The whole claim of the app is
// that its defects are what a real tz database produces, so if a browser or
// ICU update changed the answers, the exercise would quietly stop being true
// and its hints would send learners looking for something that no longer
// happens. That is what these catch.
const { test, expect } = require('@playwright/test');

const APP = '/practice-apps/scheduler-broken.html';

async function addEvent(page, { title = 'Sprint review', date, time = '09:00', mins = 60, allDay = false } = {}) {
  await page.getByTestId('ev-title').fill(title);
  await page.getByTestId('ev-date').fill(date);
  if (!allDay) await page.getByTestId('ev-time').fill(time);
  await page.getByTestId('ev-duration').fill(String(mins));
  if (allDay) await page.getByTestId('ev-allday').check();
  await page.getByTestId('add-event').click();
}

const finds = (page) => page.evaluate(() => window.Progress.getBugBountyFinds('scheduler') || []);

test.describe('Scheduler — the tz maths is real', () => {
  test('the platform still produces the spring-forward gap on 8 Mar 2026', async ({ page }) => {
    // If this ever stops being true, every hint about that date is wrong.
    await page.goto(APP + '?reset');
    const r = await page.evaluate(() => {
      const i = window.SchedulerInternals.zonedToUtc('2026-03-08T02:30', 'America/New_York');
      const back = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true
      }).format(i);
      return { iso: i.toISOString(), back };
    });
    // 02:30 does not exist that morning, so it must resolve to something else.
    expect(r.back).not.toMatch(/^02:30/);
  });

  test('01:30 on 1 Nov 2026 is genuinely ambiguous, and an ordinary time is not', async ({ page }) => {
    await page.goto(APP + '?reset');
    const r = await page.evaluate(() => ({
      fall: window.SchedulerInternals.isAmbiguous('2026-11-01', '01:30', 'America/New_York'),
      ordinary: window.SchedulerInternals.isAmbiguous('2026-06-15', '09:00', 'America/New_York'),
      spring: window.SchedulerInternals.isAmbiguous('2026-03-08', '02:30', 'America/New_York'),
    }));
    expect(r.fall, 'the repeated hour must be detected').toBe(true);
    expect(r.ordinary, 'an ordinary time must not be flagged').toBe(false);
    expect(r.spring, 'the gap is not the same thing as the duplicate').toBe(false);
  });

  test('a 60-minute booking across fall-back really lasts 120 minutes', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('America/New_York');
    await addEvent(page, { title: 'Long hour', date: '2026-11-01', time: '01:30', mins: 60 });

    const row = page.getByTestId('event-row').first();
    await expect(row.locator('[data-line="ends"]')).toContainText('booked 60 min, actually 120 min');
  });

  test('an all-day event renders a day early west of UTC', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('America/Los_Angeles');
    await addEvent(page, { title: 'Company holiday', date: '2026-06-15', allDay: true });

    const row = page.getByTestId('event-row').first();
    await expect(row.locator('[data-line="as-entered"]')).toContainText('2026-06-15');
    await expect(row.locator('[data-line="shown-to-you"]')).toContainText('2026-06-14');
  });

  test('the same all-day event is correct at UTC — the defect is the zone, not the date', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('UTC');
    await addEvent(page, { title: 'Company holiday', date: '2026-06-15', allDay: true });
    await expect(page.getByTestId('event-row').first().locator('[data-line="shown-to-you"]'))
      .toContainText('2026-06-15');
  });

  test('changing timezone does not convert a stored event', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('America/New_York');
    await addEvent(page, { title: 'Standup', date: '2026-06-15', time: '09:00' });

    const shown = () => page.getByTestId('event-row').first()
      .locator('[data-line="shown-to-you"]').textContent();
    const before = await shown();

    await page.getByTestId('viewer-tz').selectOption('Asia/Tokyo');
    const after = await shown();

    expect(after, 'a stored wall clock never converts — that is the defect').toBe(before);
    await expect(page.getByTestId('tz-evidence')).toContainText('still reads the same');
  });

  test('the agenda orders 09:00 and 10:00 by string, not by time', async ({ page }) => {
    await page.goto(APP + '?reset');
    await addEvent(page, { title: 'Nine', date: '2026-06-15', time: '09:00' });
    await addEvent(page, { title: 'Ten', date: '2026-06-15', time: '10:00' });

    const titles = await page.getByTestId('event-row').evaluateAll((rows) =>
      rows.map((r) => r.querySelector('strong').textContent)
    );
    expect(titles, '"10:00 am" sorts before "9:00 am" as a string').toEqual(['Ten', 'Nine']);
  });
});

test.describe('Scheduler — detection', () => {
  test('an ordinary event on an ordinary day reveals nothing', async ({ page }) => {
    // The app must not tick defects just for being used.
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('UTC');
    await addEvent(page, { title: 'Standup', date: '2026-06-15', time: '09:00' });
    expect(await finds(page)).toEqual([]);
  });

  test('the spring-forward gap is recorded when an impossible time is entered', async ({ page }) => {
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('America/New_York');
    await addEvent(page, { title: 'Lost hour', date: '2026-03-08', time: '02:30' });
    await expect.poll(() => finds(page)).toContain('dst-spring-gap');
  });

  test('the repeated hour and the wrong duration are recorded together', async ({ page }) => {
    // Both are true of the same event, and both are visible on the same row.
    await page.goto(APP + '?reset');
    await page.getByTestId('viewer-tz').selectOption('America/New_York');
    await addEvent(page, { title: 'Twice', date: '2026-11-01', time: '01:30', mins: 60 });
    const found = await finds(page);
    expect(found).toContain('dst-fall-duplicate');
    expect(found).toContain('duration-across-dst');
  });

  test('the naive-storage defect needs the timezone experiment, not just an event', async ({ page }) => {
    await page.goto(APP + '?reset');
    await addEvent(page, { title: 'Standup', date: '2026-06-15', time: '09:00' });
    expect(await finds(page), 'adding an event is not evidence on its own').not.toContain('naive-local-store');

    await page.getByTestId('viewer-tz').selectOption('Asia/Tokyo');
    await expect.poll(() => finds(page)).toContain('naive-local-store');
  });

  test('every triggered id exists in the catalog', async ({ page }) => {
    await page.goto(APP + '?reset');
    const known = await page.evaluate(() => window.APP_DEFECTS.scheduler.defects.map((d) => d.id));
    const src = await (await page.request.get('/js/scheduler.js')).text();
    const triggered = [...new Set([...src.matchAll(/trigger\("([a-z0-9-]+)"\)/g)].map((m) => m[1]))];
    expect(triggered.length).toBeGreaterThan(3);
    expect(known).toEqual(expect.arrayContaining(triggered));
  });

  test('every cataloged defect is reachable — none are unfindable', async ({ page }) => {
    // A seeded defect the app can never surface would sit at 0% forever.
    await page.goto(APP + '?reset');
    const known = await page.evaluate(() => window.APP_DEFECTS.scheduler.defects.map((d) => d.id));
    const src = await (await page.request.get('/js/scheduler.js')).text();
    const triggered = [...new Set([...src.matchAll(/trigger\("([a-z0-9-]+)"\)/g)].map((m) => m[1]))];
    expect(known.filter((id) => !triggered.includes(id)), 'cataloged but never triggerable').toEqual([]);
  });
});
