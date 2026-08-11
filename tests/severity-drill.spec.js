// The drill's value rests entirely on its grading being defensible: one band
// apart must be treated as a disagreement, two bands as a mistake, and the
// bias readout must reflect the direction the learner actually leaned.
const { test, expect } = require('@playwright/test');

const DRILL = '/pages/severity-drill.html';

// Answer the current scenario at a chosen offset from the model answer.
async function answer(page, sevOffset, priOffset) {
  const SEV = ['low', 'medium', 'high', 'critical'];
  const PRI = ['P3', 'P2', 'P1', 'P0'];
  const model = await page.evaluate(() => {
    const title = document.querySelector('[data-testid="scenario-title"]').textContent;
    const s = window.SEVERITY_SCENARIOS.find((x) => x.title === title);
    return { sev: s.severity, pri: s.priority };
  });
  const clamp = (i) => Math.max(0, Math.min(3, i));
  await page.getByTestId('pick-severity').selectOption(SEV[clamp(SEV.indexOf(model.sev) + sevOffset)]);
  await page.getByTestId('pick-priority').selectOption(PRI[clamp(PRI.indexOf(model.pri) + priOffset)]);
  await page.getByTestId('commit').click();
}

test.describe('Severity & Priority Drill', () => {
  test('every scenario has both calls, a reason, and a what-would-change-it', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    const problems = await page.evaluate(() => {
      const SEV = ['low', 'medium', 'high', 'critical'];
      const PRI = ['P3', 'P2', 'P1', 'P0'];
      const out = [];
      window.SEVERITY_SCENARIOS.forEach((s) => {
        if (!SEV.includes(s.severity)) out.push(s.id + ': severity off the scale');
        if (!PRI.includes(s.priority)) out.push(s.id + ': priority off the scale');
        if (!s.context || s.context.length < 120) out.push(s.id + ': context too thin to judge from');
        if (!s.why || s.why.length < 150) out.push(s.id + ': reasoning too thin');
        // Without this, the drill teaches that calibration is context-free.
        if (!s.changes || s.changes.length < 60) out.push(s.id + ': does not say what would change the answer');
      });
      return out;
    });
    expect(problems).toEqual([]);
  });

  test('the set teaches divergence without pretending it is the norm', async ({ page }) => {
    // A drill where severity and priority always match teaches nothing. A
    // drill where they never match is worse — it trains a reflex to split
    // them, and in real triage they usually do agree. So: enough divergent
    // cases to make the distinction land, and enough aligned ones that the
    // learner does not leave believing every defect is a trick question.
    await page.goto(DRILL + '?reset');
    const split = await page.evaluate(() => {
      const SEV = ['low', 'medium', 'high', 'critical'];
      const PRI = ['P3', 'P2', 'P1', 'P0'];
      let diverge = 0;
      window.SEVERITY_SCENARIOS.forEach((s) => {
        if (SEV.indexOf(s.severity) !== PRI.indexOf(s.priority)) diverge++;
      });
      return { diverge, total: window.SEVERITY_SCENARIOS.length };
    });
    expect(split.diverge, 'not enough divergent cases to teach the distinction')
      .toBeGreaterThanOrEqual(Math.ceil(split.total / 3));
    expect(split.total - split.diverge, 'no aligned cases — that teaches a new reflex')
      .toBeGreaterThanOrEqual(2);
  });

  test('you cannot read the model answer without committing first', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    await page.getByTestId('commit').click();
    await expect(page.getByTestId('verdict')).toContainText('Commit to both');
    await expect(page.getByTestId('model-answer')).toHaveCount(0);
  });

  test('an exact match is graded as the same call', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    await answer(page, 0, 0);
    await expect(page.getByTestId('verdict')).toContainText('Same call');
  });

  test('one band apart is treated as defensible, not wrong', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    await answer(page, 1, 0);
    const v = page.getByTestId('verdict');
    await expect(v).toContainText('One band apart');
    await expect(v).toContainText('defensible');
  });

  test('two bands apart is called out as more than a disagreement', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    await answer(page, 2, 0);
    await expect(page.getByTestId('verdict')).toContainText('Two bands apart');
  });

  test('the reasoning and the what-would-change-it both appear after committing', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    await answer(page, 0, 0);
    await expect(page.getByTestId('verdict')).toContainText('What would change it');
  });

  test('answering everything one band high reports an over-rating lean', async ({ page }) => {
    // This is the finding the drill exists for: a consistent lean is a habit,
    // not a knowledge gap, and nobody gets told about it on the job.
    await page.goto(DRILL + '?reset');
    const n = await page.evaluate(() => window.SEVERITY_SCENARIOS.length);
    for (let i = 0; i < n; i++) {
      await answer(page, 1, 0);
      await page.getByTestId('next').click();
    }
    const bias = page.getByTestId('drill-bias');
    await expect(bias).toContainText('rate severity higher');
    await expect(bias, 'it must say why the habit costs something').toContainText('critical');
  });

  test('answering everything one band low reports an under-rating lean', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    const n = await page.evaluate(() => window.SEVERITY_SCENARIOS.length);
    for (let i = 0; i < n; i++) {
      await answer(page, -1, 0);
      await page.getByTestId('next').click();
    }
    await expect(page.getByTestId('drill-bias')).toContainText('rate severity lower');
  });

  test('matching every model answer reports calibrated, and scores full marks', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    const n = await page.evaluate(() => window.SEVERITY_SCENARIOS.length);
    for (let i = 0; i < n; i++) {
      await answer(page, 0, 0);
      await page.getByTestId('next').click();
    }
    await expect(page.getByTestId('drill-score')).toContainText(`${n} same call`);
    await expect(page.getByTestId('drill-bias')).toContainText('what calibrated looks like');

    // And a one-band disagreement must still count toward the score, or the
    // scoring contradicts what the page tells the learner.
    const run = await page.evaluate(() => window.Progress.get().quiz.byCategory.manual);
    expect(run.correct).toBe(n);
  });

  test('a one-band run still scores full marks', async ({ page }) => {
    await page.goto(DRILL + '?reset');
    const n = await page.evaluate(() => window.SEVERITY_SCENARIOS.length);
    for (let i = 0; i < n; i++) {
      await answer(page, 1, 0);
      await page.getByTestId('next').click();
    }
    const run = await page.evaluate(() => window.Progress.get().quiz.byCategory.manual);
    expect(run.correct, 'defensible disagreement is not a miss').toBe(n);
  });

  test('is reachable from Bug Bounty and from the report builder', async ({ page }) => {
    for (const from of ['/pages/bug-bounty.html', '/pages/bug-report-builder.html']) {
      await page.goto(from + '?reset');
      await expect(page.locator('a[href="severity-drill.html"]').first()).toBeVisible();
    }
  });

  test('the drill highlights Bug Bounty in the nav rather than nothing', async ({ page }) => {
    // It is not a 12th nav item — the header has no room. It still has to
    // light up somewhere, or the page reads as outside the site.
    await page.goto(DRILL + '?reset');
    const current = page.locator('.site-header nav a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText('Bug Bounty');
  });
});
