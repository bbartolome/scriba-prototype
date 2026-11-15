import { expect, test, type Locator, type Page } from '@playwright/test';

// SHL-20's one criterion (units/SHL-20-phone-toolbar.md line 32): at 390 by 844, with the connection
// label showing, the page does not scroll sideways, and the heading, the label and the theme toggle
// are each fully inside the viewport. Plan: plans/SHL-20.md, sections 4 and 5.
const VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: VIEWPORT });

type Box = { x: number; y: number; width: number; height: number };

// Checks the scroll width and the boxes after a step's label check. The measures are logged, so the
// run output records them (plan section 3, steps 2 and 4).
async function expectFitsViewport(
  page: Page,
  step: string,
  items: Record<string, Locator>,
): Promise<void> {
  const scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  const boxes: Record<string, Box | null> = {};
  for (const [name, locator] of Object.entries(items)) {
    boxes[name] = await locator.boundingBox();
  }
  console.log(`measures ${step}: ${JSON.stringify({ ...scroll, boxes })}`);

  expect(
    scroll.scrollWidth,
    `${step}: the page scrolls sideways`,
  ).toBeLessThanOrEqual(scroll.innerWidth);
  for (const [name, box] of Object.entries(boxes)) {
    expect(box, `${step}: ${name} has a box`).not.toBeNull();
    const { x, y, width, height } = box!;
    expect(
      x,
      `${step}: ${name} starts left of the viewport`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      y,
      `${step}: ${name} starts above the viewport`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      x + width,
      `${step}: ${name} ends right of the viewport`,
    ).toBeLessThanOrEqual(VIEWPORT.width);
    expect(
      y + height,
      `${step}: ${name} ends below the viewport`,
    ).toBeLessThanOrEqual(VIEWPORT.height);
  }
}

test('phone toolbar fits 390 by 844 with the connection label showing', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  const heading = page.getByRole('heading', { name: 'Scriba', level: 1 });
  const label = page.locator('app-connection-status [data-state]');
  const toggle = page.getByRole('radiogroup', { name: 'Theme' });

  await test.step('reconnecting', async () => {
    // An aborted /events leaves the EventSource in CONNECTING, which the client reports as reconnecting.
    await page.route('**/events', (route) => route.abort());
    await page.goto('/core-gate');
    await expect(label).toHaveText('Reconnecting');
    await expect(label).toHaveAttribute('data-state', 'reconnecting');
    await expectFitsViewport(page, 'reconnecting', { heading, label, toggle });
  });

  await test.step('closed', async () => {
    // A 401 on /events leaves the EventSource in CLOSED, which the client reports as closed. The check
    // runs before the first recovery probe, which comes one second after a closed stream.
    await page.unrouteAll();
    await page.route('**/events', (route) => route.fulfill({ status: 401 }));
    await page.goto('/core-gate');
    await expect(label).toHaveText('Connection lost, retrying');
    await expect(label).toHaveAttribute('data-state', 'closed');
    await expectFitsViewport(page, 'closed', { heading, label, toggle });
  });

  expect(errors, 'page errors').toEqual([]);
});
