import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  AppDefault,
  ModelChoice,
  Preset,
  ProviderRead,
} from '@bbartolome/scriba-contracts/providers';
import { map, Observable, tap } from 'rxjs';
import { API_CLIENT } from '../../shell';
import {
  APP_DEFAULT_PATH,
  appDefaultCopy,
  emptyBodyCopy,
  KEY_CLEAR_PATH,
  KEY_SET_PATH,
  MODELS_PATH,
  modelListCopy,
  PRESETS_PATH,
  presetListCopy,
  PROVIDER_DELETE_PATH,
  PROVIDER_UPDATE_PATH,
  PROVIDERS_PATH,
  providerListCopy,
  providerPath,
  providerReadCopy,
} from './providers-copies';
import { TEXTS } from './providers-texts';

/** The editable fields of a provider: the body of an update, and the config part of a create. */
export interface ProviderFields {
  baseURL: string;
  model: string;
  temperature: number;
  contextSize: number;
  maxTokens: number;
  timeout: number;
  retries: number;
}

/** A create body: the fields, the kind, and a preset id or a label (never a key). */
export type CreateBody = ProviderFields & { kind: 'openai-compatible' } & (
    { presetId: string } | { label: string }
  );

/** The message of a failure: an Error's message, or the fallback for any other value. */
export function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== ''
    ? error.message
    : fallback;
}

/** The message of an Error, or undefined for any other value (a picker shows no message line then). */
export function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

/**
 * The panel's state and its calls to the providers API. It is provided by the panel, so every host
 * gets its own state. The reads start when the store is created. Each command's reply replaces
 * the matching row (or the app default) as soon as the reply arrives; the panel never re-reads
 * after a command, except where the decisions say so.
 */
@Injectable()
export class ProvidersStore {
  private readonly api = inject(API_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  /** The provider list. Undefined while the first read runs. */
  readonly providers = signal<ProviderRead[] | undefined>(undefined);
  readonly providersError = signal<string | undefined>(undefined);
  readonly presets = signal<Preset[] | undefined>(undefined);
  readonly presetsError = signal<string | undefined>(undefined);
  /** The app default: undefined while the read runs, null when none is set. */
  readonly appDefault = signal<ModelChoice | null | undefined>(undefined);
  readonly appDefaultError = signal<string | undefined>(undefined);

  constructor() {
    this.loadProviders();
    this.loadPresets();
    this.loadAppDefault();
  }

  loadProviders(): void {
    this.providersError.set(undefined);
    this.api
      .get(PROVIDERS_PATH, providerListCopy)
      .pipe(
        map((list) => list.providers),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (providers) => this.providers.set(providers),
        error: (error: unknown) =>
          this.providersError.set(
            failureMessage(error, TEXTS.loadProvidersFailed),
          ),
      });
  }

  loadPresets(): void {
    this.presetsError.set(undefined);
    this.api
      .get(PRESETS_PATH, presetListCopy)
      .pipe(
        map((list) => list.presets),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (presets) => this.presets.set(presets),
        error: (error: unknown) =>
          this.presetsError.set(failureMessage(error, TEXTS.loadPresetsFailed)),
      });
  }

  loadAppDefault(): void {
    this.appDefaultError.set(undefined);
    this.api
      .get(APP_DEFAULT_PATH, appDefaultCopy)
      .pipe(
        map((reply) => reply.appDefault),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (appDefault) => this.appDefault.set(appDefault),
        error: (error: unknown) =>
          this.appDefaultError.set(
            failureMessage(error, TEXTS.loadDefaultFailed),
          ),
      });
  }

  /** The model list of one provider. Not stored: the form holds its state. */
  listModels(id: string): Observable<string[]> {
    return this.api
      .get(providerPath(MODELS_PATH, id), modelListCopy)
      .pipe(map((reply) => reply.models));
  }

  create(body: CreateBody): Observable<ProviderRead> {
    return this.api
      .post(PROVIDERS_PATH, body, providerReadCopy)
      .pipe(tap((read) => this.upsert(read)));
  }

  update(id: string, fields: ProviderFields): Observable<ProviderRead> {
    return this.api
      .post(providerPath(PROVIDER_UPDATE_PATH, id), fields, providerReadCopy)
      .pipe(tap((read) => this.upsert(read)));
  }

  setKey(providerId: string, key: string): Observable<ProviderRead> {
    return this.api
      .post(KEY_SET_PATH, { providerId, key }, providerReadCopy)
      .pipe(tap((read) => this.upsert(read)));
  }

  clearKey(providerId: string): Observable<ProviderRead> {
    return this.api
      .post(KEY_CLEAR_PATH, { providerId }, providerReadCopy)
      .pipe(tap((read) => this.upsert(read)));
  }

  remove(id: string): Observable<null> {
    return this.api
      .post(providerPath(PROVIDER_DELETE_PATH, id), undefined, emptyBodyCopy)
      .pipe(
        tap(() =>
          this.providers.update((list) =>
            list?.filter((provider) => provider.id !== id),
          ),
        ),
      );
  }

  setAppDefault(choice: ModelChoice): Observable<AppDefault> {
    return this.api
      .post(APP_DEFAULT_PATH, choice, appDefaultCopy)
      .pipe(tap((reply) => this.appDefault.set(reply.appDefault)));
  }

  /** Replaces the row with the reply's id, or appends the row when the id is new. */
  private upsert(read: ProviderRead): void {
    this.providers.update((list) => {
      const current = list ?? [];
      return current.some((provider) => provider.id === read.id)
        ? current.map((provider) => (provider.id === read.id ? read : provider))
        : [...current, read];
    });
  }
}
