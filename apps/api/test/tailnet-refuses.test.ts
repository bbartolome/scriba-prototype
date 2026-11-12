import { expect, it } from 'vitest';
import { isTailnetAddress } from '../src/modules/platform/tailnet/tailnet-address';

it('the predicate refuses Tailscale-range peers, including the IPv4-mapped IPv6 form', () => {
  const addresses = [
    '100.64.0.1',
    '100.127.255.254',
    '::ffff:100.100.1.1',
    'fd7a:115c:a1e0::1',
  ];
  expect(addresses.map(isTailnetAddress)).toEqual([true, true, true, true]);
});
