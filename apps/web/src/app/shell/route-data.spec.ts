import { describe, expect, it } from 'vitest';
import type { ShellRouteData } from './index';

describe('ShellRouteData', () => {
  it('accepts the app and project scopes, with optional nav and device class', () => {
    const settings: ShellRouteData = {
      scope: 'app',
      minDeviceClass: 'phone',
      nav: { label: 'Settings', icon: 'settings', order: 5 },
    };
    const chat: ShellRouteData = { scope: 'project' };

    expect([settings.scope, chat.scope]).toEqual(['app', 'project']);

    // @ts-expect-error the scope must be 'app' or 'project'
    const badScope: ShellRouteData = { scope: 'global' };
    // @ts-expect-error the device class must be phone, tablet or desktop
    const badClass: ShellRouteData = { scope: 'app', minDeviceClass: 'watch' };

    expect([badScope.scope, badClass.minDeviceClass]).toEqual([
      'global',
      'watch',
    ]);
  });
});
