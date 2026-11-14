import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// A 390 by 844 phone. The setup page must render all of its states at this size.
test.use({ viewport: { width: 390, height: 844 } });

// Sixty-six characters with no space or hyphen, so the browser has no line break in it.
const LONG_LOGIN =
  'ada.lovelace.analytical.engine.notes@exampleuniversity.example.org';

const IDENTITY_ROUTE = '**/api/setup-auth/identity';
const CONTINUE_ROUTE = '**/api/setup-auth/continue';

/** Checks every state: the layout, the host, the document and the heading rule. */
async function expectPhoneLayout(page: Page): Promise<void> {
  const elements = page.locator('app-setup-page :is(h2, p, code, button)');
  const count = await elements.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const element = elements.nth(index);
    await expect(element).toBeVisible();
    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeInViewport({ ratio: 1 });
  }

  const hostFits = await page
    .locator('app-setup-page')
    .evaluate((host) => host.scrollWidth <= host.clientWidth);
  expect(hostFits).toBe(true);

  const documentFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(documentFits).toBe(true);

  await expect(page.getByRole('heading', { name: 'Scriba' })).toHaveCount(1);
  await expect(page.getByText('This page needs a larger screen')).toHaveCount(
    0,
  );
}

function continueButton(page: Page) {
  return page.getByRole('button', { name: 'Continue', exact: true });
}

test('C2 the setup page renders at 390 by 844: the notice, the identity with Continue, the tailnet identity and explanations, and the error lines', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  // States 3 and 4 answer the identity read themselves. States 1 and 2 use the real API.
  async function answerIdentity(status: number, body: unknown): Promise<void> {
    await page.unroute(IDENTITY_ROUTE);
    await page.route(IDENTITY_ROUTE, (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      }),
    );
  }

  await test.step('state 1: no session shows the loopback notice', async () => {
    await page.goto('/setup');
    await expect(
      page.getByText('This browser is not signed in to Scriba.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator('code', { hasText: /^cat ~\/Books\/\.scriba\/setup-url$/ }),
    ).toBeVisible();
    await expect(
      page.locator('code', { hasText: /^docker compose logs scriba$/ }),
    ).toBeVisible();
    await expect(page.getByText("You're in.", { exact: true })).toHaveCount(0);
    await expect(continueButton(page)).toHaveCount(0);
    await expectPhoneLayout(page);
  });

  await test.step('state 2: a session shows the loopback identity with Continue', async () => {
    const setupUrl = (
      await readFile(
        join(process.env.SCRIBA_E2E_LIBRARY!, '.scriba', 'setup-url'),
        'utf8',
      )
    ).trim();
    await page.goto(setupUrl);
    await page.goto('/setup');
    await expect(
      page.getByText('Signed in from this computer (loopback).', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("You're in.", { exact: true })).toBeVisible();
    await expect(continueButton(page)).toBeVisible();
    await expect(page.locator('app-setup-page code')).toHaveCount(0);
    await expectPhoneLayout(page);
  });

  await test.step('state 3a: a tailnet identity with a long login and Continue', async () => {
    await answerIdentity(200, { via: 'tailnet', login: LONG_LOGIN });
    await page.goto('/setup');
    await expect(
      page.getByText(`Signed in over the tailnet as ${LONG_LOGIN}.`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("You're in.", { exact: true })).toBeVisible();
    await expect(continueButton(page)).toBeVisible();
    await expectPhoneLayout(page);
  });

  await test.step('state 3b: AUTH_TAILNET_IDENTITY_MISSING shows its explanation only', async () => {
    await answerIdentity(403, {
      error: { code: 'AUTH_TAILNET_IDENTITY_MISSING', message: 'server text' },
    });
    await page.goto('/setup');
    await expect(
      page.getByText('did not get your Tailscale identity'),
    ).toBeVisible();
    await expect(page.getByText('server text')).toHaveCount(0);
    await expect(continueButton(page)).toHaveCount(0);
    await expectPhoneLayout(page);
  });

  await test.step('state 3c: AUTH_TAILNET_NOT_ALLOWED shows its explanation only', async () => {
    await answerIdentity(403, {
      error: { code: 'AUTH_TAILNET_NOT_ALLOWED', message: 'server text' },
    });
    await page.goto('/setup');
    await expect(page.getByText("not on the owner's allowlist")).toBeVisible();
    await expect(page.getByText('server text')).toHaveCount(0);
    await expect(continueButton(page)).toHaveCount(0);
    await expectPhoneLayout(page);
  });

  await test.step('state 4a: a failed identity read shows its message in the alert line', async () => {
    await answerIdentity(500, {
      error: {
        code: 'PLATFORM_INTERNAL',
        message: 'The server could not read the identity.',
      },
    });
    await page.goto('/setup');
    await expect(page.locator('app-setup-page').getByRole('alert')).toHaveText(
      'The server could not read the identity.',
    );
    await expect(continueButton(page)).toHaveCount(0);
    await expectPhoneLayout(page);
  });

  await test.step('state 4b: a failed Continue shows its message and keeps the identity', async () => {
    await answerIdentity(200, { via: 'loopback' });
    let continueCalls = 0;
    await page.route(CONTINUE_ROUTE, (route) => {
      continueCalls += 1;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        json: {
          error: {
            code: 'PLATFORM_INTERNAL',
            message: 'The server could not finish setup.',
          },
        },
      });
    });
    await page.goto('/setup');
    await expect(continueButton(page)).toBeVisible();

    await continueButton(page).click();

    await expect(page.locator('app-setup-page').getByRole('alert')).toHaveText(
      'The server could not finish setup.',
    );
    expect(continueCalls).toBe(1);
    await expect(
      page.getByText('Signed in from this computer (loopback).', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("You're in.", { exact: true })).toBeVisible();
    await expect(continueButton(page)).toBeEnabled();
    await expectPhoneLayout(page);
  });

  expect(errors).toEqual([]);
});
