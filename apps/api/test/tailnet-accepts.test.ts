import { expect, it } from 'vitest';
import { isTailnetAddress } from '../src/modules/platform/tailnet/tailnet-address';

it('the predicate accepts loopback, the Docker gateway and the range edges just outside Tailscale', () => {
  const addresses = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '172.17.0.1',
    '100.63.255.255',
    '100.128.0.0',
  ];
  expect(addresses.map(isTailnetAddress)).toEqual([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
});
