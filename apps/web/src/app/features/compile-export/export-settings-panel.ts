import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  ExportSettings,
  ExportSettingsView,
  TemplateFormat,
} from '@bbartolome/scriba-contracts/compile-export';
import { catchError, map, type Observable, of, Subject, switchMap } from 'rxjs';
import {
  ActiveProjectSignal,
  API_CLIENT,
  ApiError,
  DeviceClassService,
  SSE_CLIENT,
} from '../../shell';
import {
  BIBLIOGRAPHY_VALUES,
  EXPORT_COPY_DEFAULT_PATH,
  EXPORT_SETTINGS_PATH,
  exportSettingsViewCopy,
  fileWriteResultCopy,
  TEMPLATE_FORMAT_VALUES,
} from './export-contract';
import { isFilesChangedData, ORDER_CONFLICT_CODE } from './manuscript-contract';

// The export settings panel on the manuscript route (CEX-18). It reads the settings, writes the fields that
// changed with the revision it read, and copies the built-in template of a format into the project. It
// refreshes when project.yaml changes. Writes are allowed on tablet and desktop only (C18).

type TextKey =
  | 'author'
  | 'penName'
  | 'contact'
  | 'subtitle'
  | 'lang'
  | 'rights'
  | 'dedication'
  | 'docxReferenceDoc'
  | 'epubCss'
  | 'typstTemplate';

/** Every field of the form: the text keys, and the bibliography mode. */
type FieldKey = TextKey | 'bibliography';

type Values = Record<FieldKey, string>;

/** Every key that holds text: the metadata fields and the three template overrides. */
const TEXT_KEYS: readonly TextKey[] = [
  'author',
  'penName',
  'contact',
  'subtitle',
  'lang',
  'rights',
  'dedication',
  'docxReferenceDoc',
  'epubCss',
  'typstTemplate',
];

const TEXT_FIELDS: readonly { key: TextKey; label: string }[] = [
  { key: 'author', label: 'Author' },
  { key: 'penName', label: 'Pen name' },
  { key: 'contact', label: 'Contact' },
  { key: 'subtitle', label: 'Subtitle' },
  { key: 'lang', label: 'Language' },
  { key: 'rights', label: 'Rights' },
  { key: 'dedication', label: 'Dedication' },
];

/** The override key and label of each template format (C8). */
const TEMPLATE_FIELDS: Record<
  TemplateFormat,
  { key: TextKey; label: string; suggested: string }
> = {
  docx: {
    key: 'docxReferenceDoc',
    label: 'Docx template',
    suggested: 'reference.docx',
  },
  epub: { key: 'epubCss', label: 'Epub stylesheet', suggested: 'epub.css' },
  pdf: {
    key: 'typstTemplate',
    label: 'PDF template',
    suggested: 'template.typst',
  },
};

type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

/** The message of a failed request: an ApiError's own message, or the fallback for any other error. */
function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The request failed.';
}

function outcomeOf<T>(source: Observable<T>): Observable<Outcome<T>> {
  return source.pipe(
    map((value): Outcome<T> => ({ ok: true, value })),
    catchError((error: unknown) =>
      of<Outcome<T>>({ ok: false, message: failureMessage(error) }),
    ),
  );
}

/** The form values of a stored settings object: an absent text key is empty (C6). */
function valuesOf(settings: ExportSettings): Values {
  const values = { bibliography: settings.bibliography ?? 'off' } as Values;
  for (const key of TEXT_KEYS) {
    values[key] = settings[key] ?? '';
  }
  return values;
}

@Component({
  selector: 'app-export-settings-panel',
  template: `
    <section>
      <h2>Export settings</h2>

      @if (failure(); as message) {
        <p role="alert">
          {{ message }}
          @if (conflict()) {
            <button type="button" (click)="reload()">Reload settings</button>
          }
        </p>
      }

      @if (view() !== undefined) {
        @for (field of textFields; track field.key) {
          <div>
            <span>{{ field.label }}</span>
            <input
              type="text"
              [attr.aria-label]="field.label"
              [value]="values()[field.key]"
              [disabled]="!editable()"
              (input)="setValue(field.key, $event)"
            />
          </div>
        }

        <div>
          <span>Bibliography</span>
          <select
            aria-label="Bibliography"
            [disabled]="!editable()"
            (change)="setValue('bibliography', $event)"
          >
            @for (mode of bibliographyModes; track mode) {
              <option
                [value]="mode"
                [selected]="mode === values().bibliography"
              >
                {{ mode }}
              </option>
            }
          </select>
        </div>

        <div>
          @for (format of templateFormats; track format) {
            <div [attr.data-format]="format">
              <span>{{ templateField(format).label }}</span>
              <input
                type="text"
                [attr.aria-label]="templateField(format).label"
                [value]="values()[templateField(format).key]"
                [disabled]="!editable()"
                (input)="setValue(templateField(format).key, $event)"
              />
              <input
                type="text"
                [attr.aria-label]="'Copy path for ' + format"
                [value]="copyPaths()[format]"
                [disabled]="!editable()"
                (input)="setCopyPath(format, $event)"
              />
              <button
                type="button"
                [disabled]="!canCopy(format)"
                (click)="copyDefault(format)"
              >
                Copy default into project
              </button>
            </div>
          }
        </div>

        @if (copied(); as message) {
          <p>{{ message }}</p>
        }

        <button type="button" [disabled]="!canSave()" (click)="save()">
          Save
        </button>
      }
    </section>
  `,
})
export class ExportSettingsPanel {
  private readonly api = inject(API_CLIENT);
  private readonly events = inject(SSE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectId = inject(ActiveProjectSignal).projectId;
  private readonly devices = inject(DeviceClassService);

  protected readonly textFields = TEXT_FIELDS;
  protected readonly bibliographyModes = BIBLIOGRAPHY_VALUES;
  protected readonly templateFormats = TEMPLATE_FORMAT_VALUES;

  /** The settings view last answered by the server: its revision and the stored settings. */
  protected readonly view = signal<ExportSettingsView | undefined>(undefined);
  /** The form, as the author sees it. */
  protected readonly values = signal<Values>(valuesOf({}));
  protected readonly copyPaths = signal<Record<TemplateFormat, string>>({
    docx: TEMPLATE_FIELDS.docx.suggested,
    epub: TEMPLATE_FIELDS.epub.suggested,
    pdf: TEMPLATE_FIELDS.pdf.suggested,
  });
  protected readonly copied = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);
  /** True when the failure is a stale revision, which the reload button answers. */
  protected readonly conflict = signal(false);

  /** Writes are allowed on tablet and desktop only (C18). */
  protected readonly editable = computed(() => {
    const deviceClass = this.devices.deviceClass();
    return deviceClass === 'tablet' || deviceClass === 'desktop';
  });

  /** The values the server holds, as the form reads them. */
  private readonly baseline = computed(() => {
    const current = this.view();
    return current === undefined ? undefined : valuesOf(current.settings);
  });

  /** The fields that differ from the baseline, with their form values (C6). */
  protected readonly changed = computed<Partial<Values>>(() => {
    const base = this.baseline();
    if (base === undefined) return {};
    const form = this.values();
    const changes: Partial<Values> = {};
    for (const key of Object.keys(form) as FieldKey[]) {
      if (form[key] !== base[key]) changes[key] = form[key];
    }
    return changes;
  });

  protected readonly canSave = computed(
    () => this.editable() && Object.keys(this.changed()).length > 0,
  );

  /** Each read of the settings. A new read cancels the one before it; a failed read ends only itself. */
  private readonly reads = new Subject<void>();

  constructor() {
    this.reads
      .pipe(
        switchMap(() =>
          outcomeOf(this.api.get(EXPORT_SETTINGS_PATH, exportSettingsViewCopy)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.adopt(result.value);
        } else {
          this.failure.set(result.message);
          this.conflict.set(false);
        }
      });

    this.events
      .stream('project-store')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((envelope) => {
        if (envelope.type !== 'files-changed') return;
        if (!isFilesChangedData(envelope.data)) return;
        if (envelope.data.projectId !== this.projectId()) return;
        if (!envelope.data.paths.includes('project.yaml')) return;
        this.reads.next();
      });

    this.reads.next();
  }

  protected templateField(format: TemplateFormat) {
    return TEMPLATE_FIELDS[format];
  }

  protected setValue(key: FieldKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((current) => ({ ...current, [key]: value }));
  }

  protected setCopyPath(format: TemplateFormat, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.copyPaths.update((current) => ({ ...current, [format]: value }));
  }

  protected canCopy(format: TemplateFormat): boolean {
    return this.editable() && this.copyPaths()[format].trim() !== '';
  }

  /** Reads the settings again, as the reload button does. */
  protected reload(): void {
    this.reads.next();
  }

  /**
   * Writes the changed fields with the revision that was read. A bibliography mode is never empty; a
   * cleared text field is sent as '', which the server turns into a removed key (D6).
   */
  protected save(): void {
    const current = this.view();
    const changes = this.changed();
    if (!this.editable() || current === undefined) return;
    if (Object.keys(changes).length === 0) return;
    this.api
      .post(
        EXPORT_SETTINGS_PATH,
        { revision: current.revision, settings: changes },
        exportSettingsViewCopy,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.adopt(answer);
        },
        error: (error: unknown) => {
          this.conflict.set(
            error instanceof ApiError &&
              error.status === 409 &&
              error.code === ORDER_CONFLICT_CODE,
          );
          this.failure.set(failureMessage(error));
        },
      });
  }

  /** Copies the built-in template to the typed path. An existing file is never replaced (D7, C8). */
  protected copyDefault(format: TemplateFormat): void {
    const path = this.copyPaths()[format].trim();
    if (!this.editable() || path === '') return;
    this.api
      .post(EXPORT_COPY_DEFAULT_PATH, { format, path }, fileWriteResultCopy)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.copied.set(
            `Copied the built-in ${format} template to ${answer.path}.`,
          );
          this.failure.set(undefined);
        },
        error: (error: unknown) => {
          this.copied.set(undefined);
          this.failure.set(failureMessage(error));
        },
      });
  }

  /** A read's or a write's answer: the form takes the stored values and the revision is kept (C7). */
  private adopt(next: ExportSettingsView): void {
    this.view.set(next);
    this.values.set(valuesOf(next.settings));
    this.failure.set(undefined);
    this.conflict.set(false);
  }
}
