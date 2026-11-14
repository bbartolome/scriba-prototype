import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../app.config';
import { MarkdownPreview } from './index';
import { SSE_CLIENT } from './tokens';

@Component({
  imports: [MarkdownPreview],
  template: '<app-markdown-preview [content]="text()" />',
})
class PreviewHost {
  readonly text = signal('');
}

const FRONT = 'title: Zebra Anthem\nstatus: draft\ntags: [alpha, beta]';
const BODY = '# Chapter One\n\nThe rain began at noon.\n\n- outer\n  - inner\n';
const LF = '---\n' + FRONT + '\n---\n\n' + BODY;

const URL_ATTRS = [
  'href',
  'src',
  'xlink:href',
  'action',
  'formaction',
  'poster',
  'background',
  'cite',
];

// Fixtures of criterion 2, each wrapped in safe text so that an empty pane cannot pass.
const around = (fixtureText: string): string =>
  'Safe text before.\n\n' + fixtureText + '\n\nSafe text after.\n';

let fixture: ComponentFixture<PreviewHost>;

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  await TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      { provide: SSE_CLIENT, useValue: { start: () => undefined } },
      provideHttpClientTesting(),
    ],
  }).compileComponents();
  fixture = TestBed.createComponent(PreviewHost);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.title = '';
});

// Sets the text, waits for ngx-markdown's asynchronous render, and returns the pane.
async function render(text: string): Promise<HTMLElement> {
  fixture.componentInstance.text.set(text);
  fixture.detectChanges();
  await fixture.whenStable();
  const pane = (
    fixture.nativeElement as HTMLElement
  ).querySelector<HTMLElement>('app-markdown-preview markdown');
  if (!pane) throw new Error('no rendered pane');
  return pane;
}

function protocolOf(value: string): string | null {
  try {
    return new URL(value, 'http://example.test/').protocol;
  } catch {
    return null;
  }
}

function commentsIn(node: Node): string[] {
  return Array.from(node.childNodes).flatMap((child) =>
    child.nodeType === Node.COMMENT_NODE
      ? [(child as Comment).data]
      : commentsIn(child),
  );
}

// The checks of section 4: nothing active, no on* attribute, no javascript:
// URL, the safe text shows, and no inline handler runs.
function expectInert(pane: HTMLElement): void {
  const elements = [
    pane,
    ...Array.from(pane.querySelectorAll<HTMLElement>('*')),
  ];
  // a
  expect(
    pane.querySelectorAll(
      'script, iframe, object, embed, form, style, link, meta, base, svg',
    ),
  ).toHaveLength(0);
  for (const element of elements) {
    // b
    for (const attribute of Array.from(element.attributes)) {
      expect(attribute.name.toLowerCase().startsWith('on')).toBe(false);
    }
    // c
    for (const name of URL_ATTRS) {
      const value = element.getAttribute(name);
      if (value !== null) expect(protocolOf(value)).not.toBe('javascript:');
    }
  }
  // d
  expect(pane.textContent).toContain('Safe text before.');
  expect(pane.textContent).toContain('Safe text after.');
  // e
  for (const element of elements) {
    for (const type of ['error', 'load', 'click', 'mouseover']) {
      element.dispatchEvent(new Event(type));
    }
  }
  expect(document.title).toBe('');
}

describe('criterion 1: a draft with front matter renders without the front-matter block', () => {
  it.each([
    ['LF', LF],
    ['CRLF', LF.replace(/\n/g, '\r\n')],
    ['a leading BOM', '\u{FEFF}' + LF],
    ['a closing ... fence', '---\n' + FRONT + '\n...\n\n' + BODY],
  ])('C1 hides a leading front-matter block (%s)', async (_name, text) => {
    const pane = await render(text);
    const shown = pane.textContent ?? '';
    expect(shown).toContain('Chapter One');
    expect(shown).toContain('The rain began at noon.');
    expect(shown).not.toContain('Zebra Anthem');
    expect(shown).not.toContain('status');
    expect(shown).not.toContain('alpha');
    expect(pane.querySelector('hr')).toBeNull();
    expect(pane.querySelector('h2')).toBeNull();
    expect(pane.querySelectorAll('h1')).toHaveLength(1);
    expect(pane.firstElementChild?.tagName).toBe('H1');
    const items = Array.from(pane.querySelectorAll('ul ul li'), (item) =>
      item.textContent?.trim(),
    );
    expect(items).toContain('inner');
  });

  it('C1 keeps a thematic break that is in the body', async () => {
    const pane = await render(LF + '\n---\n\nSecond scene.\n');
    const shown = pane.textContent ?? '';
    expect(shown).not.toContain('Zebra Anthem');
    expect(shown).toContain('Second scene.');
    expect(pane.querySelectorAll('hr')).toHaveLength(1);
  });

  it('C1 shows everything when the opening --- has no closing fence', async () => {
    const pane = await render('---\n' + FRONT + '\n\n' + BODY);
    const shown = pane.textContent ?? '';
    expect(shown).toContain('Zebra Anthem');
    expect(shown).toContain('Chapter One');
    expect(shown).toContain('The rain began at noon.');
  });

  it('C1 shows both scenes when the opening --- is followed by a blank line', async () => {
    const pane = await render('---\n\nScene one.\n\n---\n\nScene two.\n');
    const shown = pane.textContent ?? '';
    expect(shown).toContain('Scene one.');
    expect(shown).toContain('Scene two.');
    expect(pane.querySelectorAll('hr')).toHaveLength(2);
  });

  it('C1 shows both scenes when a blank-line scene break holds a line that looks like a key', async () => {
    const pane = await render(
      '---\n\nChapter two: the road\n\n---\n\nScene two.\n',
    );
    const shown = pane.textContent ?? '';
    expect(shown).toContain('Chapter two: the road');
    expect(shown).toContain('Scene two.');
    expect(pane.querySelectorAll('hr')).toHaveLength(2);
  });

  it('C1 shows prose between two rules when its first line is not a key', async () => {
    const pane = await render('---\nScene one.\n\n---\n\nScene two.\n');
    const shown = pane.textContent ?? '';
    expect(shown).toContain('Scene one.');
    expect(shown).toContain('Scene two.');
    expect(pane.querySelectorAll('hr')).toHaveLength(2);
  });
});

describe('criterion 2: fixtures with script, handlers or javascript: links render nothing active', () => {
  it.each([
    [
      '1 a script block',
      around("<script>document.title = 'script-block'</script>"),
    ],
    [
      '2 an inline script',
      around("Hello <script>document.title = 'script-inline'</script> world"),
    ],
    [
      '3 an onerror attribute',
      around(`<img src="x" onerror="document.title = 'onerror'">`),
    ],
    [
      '4 onclick, onmouseover and onload attributes',
      around(
        `<a href="https://example.test/" onclick="document.title = 'onclick'">link</a> <div onmouseover="document.title = 'onmouseover'">hover</div> <svg onload="document.title = 'onload'"></svg>`,
      ),
    ],
    [
      '5 a Markdown javascript: link',
      around(`[click me](javascript:document.title='md-link')`),
    ],
    [
      '6 a mixed-case javascript: link',
      around(`<a href="JaVaScRiPt:document.title='mixed-case'">mixed</a>`),
    ],
    [
      '7 an entity-encoded javascript: link',
      around(
        `<a href="&#106;avascript&colon;document.title='entity'">entity</a>`,
      ),
    ],
    [
      '8 a tab-split javascript: link',
      around(`<a href="java&#x09;script:document.title='tab'">tab</a>`),
    ],
    [
      '9 embedding elements',
      around(
        `<iframe src="javascript:document.title='iframe'"></iframe><object data="javascript:document.title='object'"></object><embed src="javascript:document.title='embed'"><form action="javascript:document.title='form'"><button>send</button></form><style>body { display: none }</style>`,
      ),
    ],
    [
      '10 a script after front matter',
      "---\ntitle: Zebra Anthem\n---\nSafe text before.\n\n<script>document.title = 'after-front-matter'</script>\n\nSafe text after.\n",
    ],
  ])('C2 renders nothing active for %s', async (_name, text) => {
    document.title = '';
    const pane = await render(text);
    expectInert(pane);
  });

  it('C2 control: safe Markdown still renders', async () => {
    const pane = await render(
      '# Heading\n\nSome *emphasis*, **strong** and a [link](https://example.test/path).\n\n- one\n- two\n\n> quote\n\n```\ncode block\n```\n',
    );
    expect(pane.querySelector('h1')?.textContent).toBe('Heading');
    expect(pane.querySelector('em')?.textContent).toBe('emphasis');
    expect(pane.querySelector('strong')).not.toBeNull();
    expect(
      pane.querySelector('a[href="https://example.test/path"]')?.textContent,
    ).toBe('link');
    expect(pane.querySelectorAll('ul > li')).toHaveLength(2);
    expect(pane.querySelector('blockquote')).not.toBeNull();
    expect(pane.querySelector('pre code')?.textContent).toContain('code block');
  });
});

describe('supplementary', () => {
  it('renders from the string alone, with no HTTP request', async () => {
    await render(LF);
    TestBed.inject(HttpTestingController).verify();
  });
});

describe('C3 raw HTML shows as literal text', () => {
  it.each([
    [
      'an img in a paragraph',
      'Look <img src="https://example.test/pic.png" alt="pic"> here.',
      '<img src="https://example.test/pic.png" alt="pic">',
    ],
    [
      'an a element',
      'Read <a href="https://example.test/">this link</a> now.',
      '<a href="https://example.test/">this link</a>',
    ],
    ['a div block', '<div>hover</div>', '<div>hover</div>'],
    [
      'an HTML comment',
      'Draft <!-- note for the author --> text.',
      '<!-- note for the author -->',
    ],
  ])('C3 shows %s as text, with no element', async (_name, text, literal) => {
    const pane = await render(text);
    expect(pane.textContent).toContain(literal);
    expect(pane.querySelector('img, a, div')).toBeNull();
    expect(
      commentsIn(pane).some((data) => data.includes('note for the author')),
    ).toBe(false);
  });
});
