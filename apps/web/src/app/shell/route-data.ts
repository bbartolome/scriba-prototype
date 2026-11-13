/** The device classes a route can require. */
export type DeviceClass = 'phone' | 'tablet' | 'desktop';

/** Nav entry for a route: label, Material icon name and nav order. */
export interface ShellNav {
  label: string;
  icon: string;
  order: number;
}

/**
 * The `data` of a feature's route entry. An absent `minDeviceClass` means
 * `tablet`; the device-class gate that applies that default is SHL-05's.
 */
export interface ShellRouteData {
  scope: 'app' | 'project';
  minDeviceClass?: DeviceClass;
  nav?: ShellNav;
}
