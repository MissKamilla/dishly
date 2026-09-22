jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

import { lookup } from 'node:dns/promises';
import { isPublicIpv4, resolvePublicIpv4 } from './public-ip';

const lookupMock = jest.mocked(lookup);

describe('public IP validation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    '0.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.0.1',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '240.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'not-an-ip',
  ])('rejects unsafe address %s', (address) => {
    expect(isPublicIpv4(address)).toBe(false);
  });

  it('accepts a public IPv4 address', () => {
    expect(isPublicIpv4('8.8.8.8')).toBe(true);
  });

  it('resolves and returns a public IPv4 address', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);

    await expect(
      resolvePublicIpv4('www.bbcgoodfood.com', new AbortController().signal),
    ).resolves.toBe('8.8.8.8');
    expect(lookupMock).toHaveBeenCalledWith('www.bbcgoodfood.com', {
      all: true,
      family: 4,
    });
  });

  it('rejects the whole DNS answer when any address is unsafe', async () => {
    lookupMock.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(
      resolvePublicIpv4('www.bbcgoodfood.com', new AbortController().signal),
    ).rejects.toThrow('unsafe IP address');
  });

  it('rejects an empty DNS answer', async () => {
    lookupMock.mockResolvedValue([]);

    await expect(
      resolvePublicIpv4('www.bbcgoodfood.com', new AbortController().signal),
    ).rejects.toThrow('unsafe IP address');
  });

  it('reports DNS failures', async () => {
    lookupMock.mockRejectedValue(new Error('EAI_AGAIN'));

    await expect(
      resolvePublicIpv4('www.bbcgoodfood.com', new AbortController().signal),
    ).rejects.toThrow('Failed to resolve Good Food address');
  });

  it('stops waiting when DNS resolution times out', async () => {
    lookupMock.mockImplementation(() => new Promise(() => undefined));
    const controller = new AbortController();

    const pending = resolvePublicIpv4('www.bbcgoodfood.com', controller.signal);
    controller.abort();

    await expect(pending).rejects.toThrow('Good Food DNS lookup timed out');
  });
});
