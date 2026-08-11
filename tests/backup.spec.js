// Backup and restore — the manual cross-device path.
//
// ADR 0004 recommended doing this first regardless of what happens with sync,
// because the capability half-existed and did not work. Two defects were live
// before these tests:
//
//   - "Export as JSON" printed the blob into a <pre>. There was no file, so
//     the one thing an export is for could not be done.
//   - Import wrote to the hard-coded key "qaprep_progress_v1" instead of the
//     active profile, so restoring while on a second profile overwrote the
//     FIRST profile and left the one you were looking at untouched.
const { test, expect } = require('@playwright/test');

const PROGRESS = '/pages/progress.html';

async function seedProgress(page) {
  return page.evaluate(() => {
    window.Progress.setBugBountyFinds('login',
      window.APP_DEFECTS.login.defects.slice(0, 3).map((d) => d.id));
    window.Progress.recordQuizRun({ category: 'automation', correct: 7, total: 10, elapsedMs: 1000 });
    window.Progress.saveArtifact({ type: 'bug-report', title: 'A saved draft', fields: { steps: 'one' } });
    return window.Progress.get().artifacts.length;
  });
}

test.describe('downloading a backup', () => {
  test('produces a real file, not text on the page', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    await seedProgress(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-backup').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^critical-hit-qa-.+-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(page.getByTestId('backup-ok')).toContainText('Move that file');
  });

  test('the file contains the progress, and parses', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    await seedProgress(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-backup').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    expect(parsed.bugBounty.login).toHaveLength(3);
    expect(parsed.artifacts).toHaveLength(1);
    expect(parsed.quiz.byCategory.automation.correct).toBe(7);
  });

  test('the filename names the profile so a folder of them is readable', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    await page.evaluate(() => window.Profiles.create('Second Device'));
    await page.goto(PROGRESS);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-backup').click(),
    ]);
    expect(download.suggestedFilename()).toContain('second-device');
  });
});

test.describe('restoring a backup', () => {
  test('a round trip returns the progress', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    await seedProgress(page);

    const json = await page.evaluate(() => window.Backup.payload());

    // Wipe, then restore.
    await page.goto(PROGRESS + '?reset');
    await expect(page.getByTestId('drop-zone')).toBeVisible();

    const result = await page.evaluate((text) => window.Backup.restoreFromText(text), json);
    expect(result.artifacts).toBe(1);

    const after = await page.evaluate(() => window.Progress.get());
    expect(after.bugBounty.login).toHaveLength(3);
    expect(after.artifacts).toHaveLength(1);
  });

  test('restores into the ACTIVE profile, not the first one', async ({ page }) => {
    // The defect this replaced. A backup restored while on a second profile
    // used to overwrite the first profile's progress and leave the visible
    // one empty — losing data in a feature whose entire job is not to.
    await page.goto(PROGRESS + '?reset');
    await seedProgress(page);
    const json = await page.evaluate(() => window.Backup.payload());

    // A fresh second profile, which becomes active.
    await page.goto(PROGRESS + '?reset');
    const keys = await page.evaluate(async (text) => {
      window.Profiles.create('Laptop');
      const activeKey = window.Profiles.storageKey();
      const firstKey = 'qaprep_progress_v1';
      await window.Backup.restoreFromText(text);
      return {
        activeKey,
        activeHasData: !!localStorage.getItem(activeKey),
        firstProfileRaw: localStorage.getItem(firstKey),
      };
    }, json);

    expect(keys.activeKey).not.toBe('qaprep_progress_v1');
    expect(keys.activeHasData, 'the profile in front of the user got nothing').toBe(true);

    const first = keys.firstProfileRaw ? JSON.parse(keys.firstProfileRaw) : { artifacts: [] };
    expect(first.artifacts || [], 'the OTHER profile was overwritten').toHaveLength(0);
  });

  test('rejects a file that is not JSON, without throwing at the user', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    const err = await page.evaluate(() =>
      window.Backup.restoreFromText('this is not json').then(() => null, (e) => e.message));
    expect(err).toContain('not valid JSON');
  });

  test('rejects JSON that is not a backup', async ({ page }) => {
    await page.goto(PROGRESS + '?reset');
    const err = await page.evaluate(() =>
      window.Backup.restoreFromText('[1,2,3]').then(() => null, (e) => e.message));
    expect(err).toContain('does not look like a progress backup');
  });

  test('a hostile backup is sanitized, not trusted', async ({ page }) => {
    // The file is attacker-suppliable input: someone can hand you one. It
    // goes through the same whitelist rebuild as the sync codes.
    await page.goto(PROGRESS + '?reset');
    const after = await page.evaluate(async () => {
      await window.Backup.restoreFromText(JSON.stringify({
        bugBounty: { login: ['email-case', 'ghost-defect'], 'no-such-app': ['x'] },
        bugReports: 999999,
        somethingInvented: 'should not survive',
      }));
      return window.Progress.get();
    });
    expect(after.bugBounty.login).toEqual(['email-case']);
    expect(after.bugBounty['no-such-app']).toBeUndefined();
    expect(after.somethingInvented).toBeUndefined();
  });

  test('the drop zone is an addition, not the only route', async ({ page }) => {
    // A drop target alone is unreachable by keyboard. The file input has to
    // stay, and the button has to open it.
    await page.goto(PROGRESS + '?reset');
    await expect(page.getByTestId('drop-zone')).toBeVisible();
    await expect(page.getByTestId('choose-backup')).toBeVisible();
    await expect(page.getByTestId('backup-file')).toHaveAttribute('accept', /json/);
  });
});

test.describe('one implementation, not two', () => {
  test('the Progress page no longer carries its own copy', async () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'pages', 'progress.html'), 'utf8');

    expect(src, 'the page writes storage directly again')
      .not.toContain("localStorage.setItem(\"qaprep_progress_v1\"");
    expect(src, 'blocking alert() is back').not.toMatch(/\balert\(/);
    expect(src).toContain('window.Backup');
  });

  test('the Account page points at a backup route that exists', async ({ page }) => {
    await page.goto('/pages/account.html?reset');
    const text = (await page.locator('#main').textContent()).replace(/\s+/g, ' ');
    expect(text).toMatch(/Progress page/i);
  });
});
