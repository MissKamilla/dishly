import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const blockedAddresses = new BlockList();
for (const [address, prefix] of BLOCKED_IPV4_RANGES) {
  blockedAddresses.addSubnet(address, prefix, 'ipv4');
}

export function isPublicIpv4(address: string): boolean {
  return isIP(address) === 4 && !blockedAddresses.check(address, 'ipv4');
}

export async function resolvePublicIpv4(
  hostname: string,
  signal: AbortSignal,
): Promise<string> {
  let addresses;
  try {
    addresses = await lookupWithTimeout(hostname, signal);
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    throw new Error('Failed to resolve Good Food address', { cause: error });
  }

  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) => family !== 4 || !isPublicIpv4(address),
    )
  ) {
    throw new Error('Good Food resolved to an unsafe IP address');
  }

  return addresses[0].address;
}

async function lookupWithTimeout(hostname: string, signal: AbortSignal) {
  let onAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new Error('Good Food DNS lookup timed out'));
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    signal.throwIfAborted();
    return await Promise.race([
      lookup(hostname, { all: true, family: 4 }),
      aborted,
    ]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
