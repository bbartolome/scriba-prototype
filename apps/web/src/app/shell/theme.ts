import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

/** The theme the user picked. `system` follows the OS colour scheme. */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** Device-local storage key. There is no server-side preference. */
const STORAGE_KEY = 'scriba.theme';

function readStored(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function writeStored(choice: ThemeChoice): void {
  try {
    if (choice === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
  } catch {
    // Storage can throw (for example, when it is disabled). The choice still applies to this page.
  }
}

/**
 * Applies the theme choice to `<html>` as `data-theme`. The stylesheet maps the
 * attribute to `color-scheme`. The stored choice applies at load, because App
 * injects this service before its first render.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly current = signal<ThemeChoice>(readStored());

  /** The current choice. */
  readonly choice = this.current.asReadonly();

  constructor() {
    this.apply(this.current());
  }

  /** Stores the choice on this device and applies it at once. */
  set(choice: ThemeChoice): void {
    writeStored(choice);
    this.current.set(choice);
    this.apply(choice);
  }

  private apply(choice: ThemeChoice): void {
    if (choice === 'system') {
      this.root.removeAttribute('data-theme');
    } else {
      this.root.setAttribute('data-theme', choice);
    }
  }
}
