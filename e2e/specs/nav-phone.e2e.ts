import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// SHL-23's criteria 1 and 2 (SHL-23 unit lines 29 and 30): at 390 by 844,
// with the ten phone nav items shown, the page does not scroll sideways (N1), and each of the ten
// bottom nav links stays visible, shrunk, with its label truncated, and none overlaps the title (N2).
// Plan: SHL-23 plan, sections 4 and 6.
test.use({ viewport: { width: 390, height: 844 } });

const PROJECT = 'nav-phone';
const TITLE = 'Nav phone with a long title';
const LABELS = [
  'Chat',
  'Projects',
  'Review',
  'Files',
  'Manuscript',
  'Graphs',
  'Tools',
  'Providers',
  'Settings',
  'Core gate',
];

test.afterAll(async () => {
  await rm(join(process.env.SCRIBA_E2E_LIBRARY!, PROJECT), {
    recursive: true,
    force: true,
  });
});

/** Signs in, writes the project, and makes it active as its row's Switch button does. */
async function openProject(page: Page): Promise<void> {
  const library = process.env.SCRIBA_E2E_LIBRARY!;
  const setupUrl = (
    await readFile(join(library, '.scriba', 'setup-url'), 'utf8')
  ).trim();
  await page.goto(setupUrl);

  await mkdir(join(library, PROJECT), { recursive: true });
  await writeFile(
    join(library, PROJECT, 'project.yaml'),
    `schemaVersion: 1\ntitle: ${TITLE}\ngenrePack: nonfiction\n`,
  );

  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();

  const row = page.locator('li').filter({
    has: page.locator('code', { hasText: /^nav-phone$/ }),
  });
  await expect(row).toHaveCount(1);
  const switchButton = row.getByRole('button', {
    name: 'Switch',
    exact: true,
  });
  // The first test leaves the project active on the shared server, so a second test has no Switch.
  if ((await switchButton.count()) > 0) {
    await switchButton.click();
    await expect(page).toHaveURL(/\/projects\/nav-phone\/chat$/);
  } else {
    await page.goto('/projects/nav-phone/chat');
  }
}

test('the ten bottom nav items show at 390 by 844 and the page does not scroll sideways', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  await openProject(page);

  const links = page.locator('nav.bottom .items > a');
  await expect(links).toHaveCount(10);
  const labels = await links.locator('span').allTextContents();
  expect(labels).toEqual(LABELS);

  const scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  console.log(`measures N1: ${JSON.stringify(scroll)}`);
  expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.innerWidth);
  expect(errors).toEqual([]);
});

test('each of the ten bottom nav links stays visible, shrunk, with its label truncated, and none overlaps the title', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));

  await openProject(page);

  const viewport = page.viewportSize()!;
  const itemsBox = await page.locator('nav.bottom .items').boundingBox();
  expect(itemsBox).not.toBeNull();

  const titleSpan = page.locator('nav.bottom span', { hasText: TITLE });
  await expect(titleSpan).toHaveCount(1);
  const titleBox = await titleSpan.boundingBox();
  expect(titleBox).not.toBeNull();

  const links = page.locator('nav.bottom .items > a');
  await expect(links).toHaveCount(10);

  const measures: Record<string, unknown>[] = [];
  for (let i = 0; i < 10; i++) {
    const link = links.nth(i);
    const label = link.locator('span');
    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport({ ratio: 1 });

    const box = await link.boundingBox();
    const labelBox = await label.boundingBox();
    expect(box).not.toBeNull();
    expect(labelBox).not.toBeNull();
    const text = (await label.textContent()) ?? '';
    const style = await label.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        textOverflow: s.textOverflow,
        overflowX: s.overflowX,
        whiteSpace: s.whiteSpace,
      };
    });
    const clip = await label.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    measures.push({ text, box, labelBox, style, clip });

    expect(
      box!.x,
      `${text}: starts inside the viewport`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      box!.x + box!.width,
      `${text}: ends inside the viewport`,
    ).toBeLessThanOrEqual(viewport.width);
    expect(
      box!.width,
      `${text}: shrunk to its share of the items`,
    ).toBeLessThanOrEqual(itemsBox!.width / 10 + 0.5);
    expect(style, `${text}: label is truncated, not wrapped`).toEqual({
      textOverflow: 'ellipsis',
      overflowX: 'hidden',
      whiteSpace: 'nowrap',
    });
    expect(
      labelBox!.width,
      `${text}: label does not spill out of its link`,
    ).toBeLessThanOrEqual(box!.width);
  }

  // The Manuscript label is the one that must be cut at this width.
  const manuscript = measures.find((m) => m.text === 'Manuscript') as {
    clip: { scrollWidth: number; clientWidth: number };
  };
  expect(manuscript.clip.scrollWidth).toBeGreaterThan(
    manuscript.clip.clientWidth,
  );

  // The nav and its items do not scroll sideways.
  const navScroll = await page.evaluate(() => {
    const nav = document.querySelector('nav.bottom') as HTMLElement;
    const items = nav.querySelector('.items') as HTMLElement;
    return {
      navScrollWidth: nav.scrollWidth,
      navClientWidth: nav.clientWidth,
      navOverflowX: getComputedStyle(nav).overflowX,
      itemsOverflowX: getComputedStyle(items).overflowX,
    };
  });
  expect(navScroll.navScrollWidth).toBeLessThanOrEqual(
    navScroll.navClientWidth,
  );
  expect(['auto', 'scroll']).not.toContain(navScroll.navOverflowX);
  expect(['auto', 'scroll']).not.toContain(navScroll.itemsOverflowX);

  // No link overlaps the title: the last link ends at or before the title starts.
  const last = measures[9].box as { x: number; width: number };
  expect(last.x + last.width).toBeLessThanOrEqual(titleBox!.x);

  console.log(
    `measures N2: ${JSON.stringify({
      items: itemsBox,
      title: titleBox,
      nav: navScroll,
      links: measures,
    })}`,
  );
  expect(errors).toEqual([]);
});
