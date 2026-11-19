# ADR 0003: Typst PDF spike

Status: accepted.

## Context

Unit CEX-13 (`units/CEX-13-pdf-typst-spike.md`) asks for PDF export through Typst, with no TeX install, and for a
quality spike before the format is relied on. The spike renders the nonfiction sample and a typographic stress
fixture (`apps/api/test/fixtures/typst-spike/`) through the built-in template
(`apps/api/assets/compile-export/typst-template.typst`), and compares the result with the checklist below. The plan
is `plans/CEX-13.md`. The engine is Typst 0.15.1, the version the image and CI pin.

## Checklist

Each row is fixed before the first render. A row that fails may be fixed in the built-in template within this PR and
checked again; the Results say so.

| Row | Check              | Pass test                                                                                                                                                                                                     |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Header and engine  | The PDF of the stress fixture starts with `%PDF-` at byte 0, and its Creator is Typst 0.15.1.                                                                                                                 |
| S2  | Footnotes          | Each note's text is on the page of its marker, and the numbers run on across the book. The stress file has three notes, one of them inside a block quote.                                                     |
| S3  | Block quotes       | The quote is one indented block, and its two paragraphs stay inside it.                                                                                                                                       |
| S4  | Smart quotes       | Curly double and single quotes. No straight `"` or `'` appears in the rendered text.                                                                                                                          |
| S5  | Dashes             | `--` renders as an en dash and `---` as an em dash.                                                                                                                                                           |
| S6  | Accented Latin     | é, ü, ç and ñ render with the right glyphs.                                                                                                                                                                   |
| S7  | Greek and Cyrillic | Greek and Cyrillic render with glyphs, with no empty boxes.                                                                                                                                                   |
| S8  | CJK                | The stress file has one CJK line. Pass: the line renders with glyphs, or its only defect is a missing font (`typst fonts` lists no CJK family in the image), and Consequences name a CJK font as a follow-up. |
| S9  | Long headings      | A level-1 heading of more than two lines wraps inside the margins and appears whole in the TOC.                                                                                                               |
| S10 | TOC                | With `--toc`, every chapter appears in order with its page number.                                                                                                                                            |
| S11 | Chapter breaks     | Each level-1 heading starts a new page, and no blank page appears.                                                                                                                                            |
| S12 | Image              | `drafts/image.svg` renders no wider than the text block, with its caption.                                                                                                                                    |
| S13 | Sample             | The nonfiction sample exports its four chapters in effective order, with the author and the dedication. Pandoc and Typst write no warning on stderr, or each warning is recorded.                             |

## Results

The render used the built-in template as it stands in this PR. No row failed, so the template was not changed.
The PNG names are the pages of the scratch render (plan D12, step 11d); the pages are not committed. The host
renders and the image render differ only for CJK (S8).

- S1: pass. The stress PDF from the export route starts with `%PDF-` at byte 0, and its Creator is `Typst 0.15.1`.
- S2: pass. `stress-2.png`, page 2. Markers 1 to 3 have their notes on page 2, and note 2 (inside the block quote) is listed with them.
- S3: pass. `stress-2.png`, page 2. The two paragraphs of the quote sit in one indented block.
- S4: pass. `stress-2.png`, page 2. Curly double and single quotes; no straight quote in the rendered text.
- S5: pass. `stress-2.png`, page 2. `1--2` renders as an en dash and `---` as an em dash.
- S6: pass. `stress-2.png`, page 2. é, ü, ç and ñ render with the right glyphs.
- S7: pass. `stress-2.png`, page 2. Greek `αβγδ` and Cyrillic `Привет мир` render with glyphs.
- S8: pass under the row's rule. `stress-2.png` on the host shows the CJK line with glyphs, but the host PDF embeds IPAGothic from the host's system fonts. The pinned image has no CJK family (`typst fonts`), and its own render (`img-2.png`) shows the line as empty boxes. The only defect is the missing font, so the row passes, and the follow-up is named under Consequences.
- S9: pass. `stress-2.png`, page 2: the level-1 heading wraps across three lines inside the margins. `stress-toc-1.png`, page 1: the heading appears whole in the TOC over two lines.
- S10: pass. `stress-toc-1.png`, page 1: both chapters in order with pages 2 and 3, and their level-2 headings. `nonfiction-toc-1.png`, page 1: chapters 1 to 4 in order with pages 2 to 5.
- S11: pass. `stress-1.png` (title page), `stress-2.png` (chapter one starts on page 2), `stress-3.png` (chapter two starts on page 3). No blank page in the stress render; the nonfiction render has six pages with no blank page.
- S12: pass. `stress-2.png`, page 2: the image is narrower than the text block and has its caption, "Figure 1: Figure: a test shape".
- S13: pass. `nonfiction-toc-1.png`, page 1: title, author and dedication. `nonfiction-toc-2.png`, page 2: chapter 1 starts the body. Pandoc and Typst wrote nothing on stderr for either project, so there are no warnings to record.

## Decision

Keep Typst. Every row S1 to S13 passes with the built-in template of this PR, so the TeX Live derived image is not
recommended for v1.

## Consequences

- The PDF of the image has no CJK font. A CJK line renders as empty boxes in the pinned image (S8). A CJK font in the
  image (the follow-up) is the fix, and it belongs to the image, not to the template. The TeX Live image would need the
  same font, so it does not solve this.
- Renders on a developer host can pick up system fonts, so a host PDF is not the image's output for CJK. Checks of
  the image output must run inside the image.
- The image caption repeats the alt text ("Figure 1: Figure: a test shape"). This comes from Pandoc's handling of the
  image alt text, not from Typst, and is not a checklist row.
- Typst 0.15.1 is kept (plan open point 2). Pandoc and Typst wrote no warnings for the fixtures.
