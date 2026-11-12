import { BlockList, isIP } from 'node:net';

// Tailscale's ranges. IPv4-mapped IPv6 forms (::ffff:100.x.x.x) match the IPv4 rule.
const TAILNET = new BlockList();
TAILNET.addSubnet('100.64.0.0', 10, 'ipv4');
TAILNET.addSubnet('fd7a:115c:a1e0::', 48, 'ipv6');

// True when the address is in a Tailscale range, so the filter refuses it.
export function isTailnetAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  return TAILNET.check(address, family === 4 ? 'ipv4' : 'ipv6');
}
