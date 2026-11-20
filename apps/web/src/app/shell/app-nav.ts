import { Component, computed, ElementRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import {
  NavigationEnd,
  type Route,
  Router,
  RouterLink,
  RouterLinkActive,
  type Routes,
} from '@angular/router';
import { filter } from 'rxjs';
import { DeviceClassService, isAtLeast } from './device-class';
import { projectIdOf } from './project-scope';
import type { DeviceClass, ShellRouteData } from './route-data';

/** The path of the project-scoped entries. Their children are the project items. */
const PROJECT_PATH = 'projects/:projectId';

/** One nav link: its target, label, icon and the class it needs. */
interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
  readonly order: number;
  readonly min: DeviceClass;
}

/** The form of the nav for each device class, and its accessible name. */
const FORMS: Readonly<Record<DeviceClass, { form: string; label: string }>> = {
  phone: { form: 'bottom', label: 'Bottom navigation' },
  tablet: { form: 'rail', label: 'Navigation rail' },
  desktop: { form: 'side', label: 'Side navigation' },
};

function navItem(route: Route, href: string): NavItem | undefined {
  const data = route.data as Partial<ShellRouteData> | undefined;
  if (!data?.nav) return undefined;
  return {
    href,
    label: data.nav.label,
    icon: data.nav.icon,
    order: data.nav.order,
    min: data.minDeviceClass ?? 'tablet',
  };
}

/**
 * True when the event target is a field or an editable area, where the shortcuts must not act. The
 * editors use CodeMirror, whose content is `contenteditable`.
 */
function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ) !== null
  );
}

/** True when any route, at any depth, has a `data.nav` entry. */
function hasNavEntry(routes: Routes): boolean {
  return routes.some((route) => {
    const data = route.data as Partial<ShellRouteData> | undefined;
    return data?.nav !== undefined || hasNavEntry(route.children ?? []);
  });
}

/**
 * The items of the route table. App entries always count; the children of the
 * project entry count only when the URL has a project id.
 */
function navItems(routes: Routes, projectId: string | undefined): NavItem[] {
  const items: NavItem[] = [];
  for (const route of routes) {
    if (route.path === PROJECT_PATH) {
      if (projectId === undefined) continue;
      for (const child of route.children ?? []) {
        const item = navItem(
          child,
          `/projects/${projectId}/${child.path ?? ''}`,
        );
        if (item) items.push(item);
      }
      continue;
    }
    const data = route.data as Partial<ShellRouteData> | undefined;
    if (data?.scope === 'app' && route.path !== undefined) {
      const item = navItem(route, `/${route.path}`);
      if (item) items.push(item);
    }
  }
  return items;
}

/**
 * The app's navigation. Its links come from the route table's `data.nav`
 * entries. It takes one of three forms by device class: a bottom bar on a
 * phone, a rail on a tablet and a side nav on a desktop. Its `nav-project`
 * slot is empty until a feature fills it, and renders nothing when empty.
 */
@Component({
  imports: [MatIcon, RouterLink, RouterLinkActive],
  host: { '(document:keydown)': 'onKeydown($event)' },
  selector: 'app-nav',
  styles: `
    :host {
      display: flex;
    }

    nav {
      display: flex;
      flex: none;
    }

    nav.bottom {
      width: 100%;
      height: 64px;
    }

    nav.rail {
      width: 80px;
    }

    nav.side {
      width: 240px;
    }

    .items {
      display: flex;
      flex: 1 1 auto;
      min-width: 0;
    }

    nav.bottom .items {
      flex-direction: row;
    }

    nav.rail .items,
    nav.side .items {
      flex-direction: column;
    }

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 4px;
      color: inherit;
      text-decoration: none;
    }

    nav.bottom a {
      flex: 1 1 0;
      flex-direction: column;
      font-size: 12px;
      min-width: 0;
    }

    nav.bottom a span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    nav.rail a {
      flex-direction: column;
      padding: 12px 4px;
      font-size: 12px;
    }

    nav.side a {
      justify-content: flex-start;
      padding: 12px 16px;
    }

    a[aria-current='page'] {
      font-weight: 600;
    }
  `,
  template: `
    <nav [class]="form().form" [attr.aria-label]="form().label">
      <div class="items">
        @for (item of items(); track item.href) {
          <a
            [routerLink]="item.href"
            routerLinkActive
            ariaCurrentWhenActive="page"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </div>
      @if (!hasFeatures) {
        <p class="empty">No features registered.</p>
      }
      <ng-content select="[nav-project]" />
    </nav>
  `,
})
export class AppNav {
  private readonly devices = inject(DeviceClassService);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  // Emits at each navigation, so the project items follow the URL.
  private readonly navigated = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );

  /** Read once: the route table does not change while the app runs. */
  protected readonly hasFeatures = hasNavEntry(this.router.config);

  protected readonly form = computed(() => FORMS[this.devices.deviceClass()]);

  protected readonly items = computed(() => {
    this.navigated();
    const device = this.devices.deviceClass();
    const projectId = projectIdOf(this.router.routerState.snapshot.root);
    return navItems(this.router.config, projectId)
      .filter((item) => isAtLeast(device, item.min))
      .sort((a, b) => a.order - b.order);
  });

  /**
   * Alt+[ opens the previous nav entry and Alt+] the next, wrapping at both ends. It needs Alt and no
   * other modifier, matches the key by `event.code` (so Option+[ works on a Mac), and does nothing
   * while the event comes from a field or an editor.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const step =
      event.code === 'BracketLeft' ? -1 : event.code === 'BracketRight' ? 1 : 0;
    if (step === 0 || isEditable(event.target)) return;
    const items = this.items();
    if (items.length === 0) return;

    const path = this.router.url.split(/[?#]/)[0] ?? '';
    const current = items.findIndex((item) => item.href === path);
    let target: number;
    if (current === -1) {
      target = step > 0 ? 0 : items.length - 1;
    } else {
      target = (current + step + items.length) % items.length;
    }
    const item = items[target];
    if (item === undefined) return;

    event.preventDefault();
    void this.router.navigateByUrl(item.href).then(() => {
      const links =
        this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.items a');
      links[target]?.focus();
    });
  }
}
