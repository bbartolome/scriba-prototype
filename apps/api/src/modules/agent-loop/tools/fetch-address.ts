import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { BlockList, isIPv4, isIPv6, type LookupFunction } from 'node:net';

// The address rules of fetch_page (AGL-22, plan P4 to P6). A page the agent fetches must not reach the local host, the
// local network, the tailnet or a host service. The ranges are checked with BlockList, as the Platform's tailnet
// helper does; that helper is not an entry file of its module, so the list is written here again.

const REFUSED = new BlockList();
const IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  // Multicast and reserved (with 255.255.255.255).
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];
const IPV6_RANGES: Array<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['fd7a:115c:a1e0::', 48],
  // NAT64 and 6to4 can reach a private IPv4 address through a gateway.
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['2002::', 16],
];
for (const [address, prefix] of IPV4_RANGES) {
  REFUSED.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of IPV6_RANGES) {
  REFUSED.addSubnet(address, prefix, 'ipv6');
}

// The host of a first hop or a redirect that is refused by its name, before any lookup. A name that resolves to a
// refused address is refused by checkedLookup.
const REFUSED_NAMES = new Set(['host.docker.internal']);

// The answer of a refused address or name. The handler turns it into the readable refusal of its hop.
export class RefusedAddressError extends Error {
  constructor() {
    super('The address is on a local or private network, so it is refused.');
    this.name = 'RefusedAddressError';
  }
}

// An IPv4-mapped IPv6 address is checked as its IPv4 address. Both forms are read: the dotted one and the hex one that
// `new URL` writes, for example [::ffff:7f00:1] for [::ffff:127.0.0.1].
function unwrapMapped(address: string): string {
  const lower = address.toLowerCase();
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted !== null) return dotted[1] ?? lower;
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (hex !== null) {
    const value =
      parseInt(hex[1] ?? '0', 16) * 65536 + parseInt(hex[2] ?? '0', 16);
    return [
      value >>> 24,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ].join('.');
  }
  return lower;
}

// True when an IP address (without brackets) is in a refused range. Anything that is not an IP address is refused.
export function isRefusedAddress(address: string): boolean {
  const ip = unwrapMapped(address);
  if (isIPv4(ip)) return REFUSED.check(ip, 'ipv4');
  if (isIPv6(ip)) return REFUSED.check(ip, 'ipv6');
  return true;
}

// True when a host name is refused by its name. The host is lower-cased, without a trailing dot and without brackets.
export function isRefusedName(host: string): boolean {
  const name = host
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/^\[(.*)\]$/, '$1');
  return REFUSED_NAMES.has(name);
}

// A lookup for http.request. It resolves the name, and refuses the hop if any answer is in a refused range. Otherwise
// Node connects to one of the checked addresses, so no second lookup can change the target.
export function checkedLookup(): LookupFunction {
  return (hostname, options, callback) => {
    dnsLookup(hostname, { all: true }, (error, addresses: LookupAddress[]) => {
      if (error !== null) {
        callback(error, '', 0);
        return;
      }
      if (addresses.some((entry) => isRefusedAddress(entry.address))) {
        const refused = new RefusedAddressError();
        callback(refused, '', 0);
        return;
      }
      if (options.all === true) {
        callback(null, addresses as never, 0);
        return;
      }
      const [first] = addresses;
      callback(null, first?.address ?? '', first?.family ?? 4);
    });
  };
}
