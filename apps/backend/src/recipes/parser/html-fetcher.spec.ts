jest.mock('node:https', () => ({ request: jest.fn() }));
jest.mock('./public-ip', () => ({ resolvePublicIpv4: jest.fn() }));

import { EventEmitter } from 'node:events';
import { ClientRequest, IncomingMessage } from 'node:http';
import { request, RequestOptions } from 'node:https';
import { Readable } from 'node:stream';
import { resolvePublicIpv4 } from './public-ip';
import { fetchHtml } from './html-fetcher';

const GOOD_FOOD_URL = 'https://www.bbcgoodfood.com/recipes/example';
const requestMock = jest.mocked(request);
const resolveMock = jest.mocked(resolvePublicIpv4);

describe('fetchHtml', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resolveMock.mockResolvedValue('8.8.8.8');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches HTML from the pinned IP with the original hostname for TLS and Host', async () => {
    mockResponse(200, '<html>Recipe</html>', 'text/html; charset=utf-8');

    await expect(fetchHtml(GOOD_FOOD_URL)).resolves.toBe('<html>Recipe</html>');
    expect(resolveMock).toHaveBeenCalledWith(
      'www.bbcgoodfood.com',
      expect.anything(),
    );
    const options = requestMock.mock.calls[0][0] as RequestOptions;
    expect(options).toMatchObject({
      hostname: '8.8.8.8',
      port: 443,
      path: '/recipes/example',
      method: 'GET',
      agent: false,
      servername: 'www.bbcgoodfood.com',
      rejectUnauthorized: true,
      headers: {
        Host: 'www.bbcgoodfood.com',
        Accept: 'text/html',
        'Accept-Encoding': 'identity',
      },
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([403, 404, 500])('rejects HTTP %i', async (status) => {
    const response = mockResponse(status, 'Error', 'text/html');

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      `Good Food returned HTTP ${status}`,
    );
    expect(response.destroyed).toBe(true);
  });

  it('rejects redirects without following Location', async () => {
    mockResponse(302, '', undefined, { location: 'http://127.0.0.1/private' });

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Good Food redirected the HTML request',
    );
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-HTML Content-Type', async () => {
    mockResponse(200, '{}', 'application/json');

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Good Food returned a non-HTML response',
    );
  });

  it('rejects a missing Content-Type', async () => {
    mockResponse(200, '<html></html>');

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Good Food returned a non-HTML response',
    );
  });

  it('rejects compressed HTML that node:https would not decode', async () => {
    mockResponse(200, 'compressed', 'text/html', {
      'content-encoding': 'gzip',
    });

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Good Food returned unsupported HTML encoding',
    );
  });

  it('rejects more than 5 MiB even when Content-Length is false', async () => {
    const response = mockResponse(
      200,
      Buffer.alloc(5 * 1024 * 1024 + 1),
      'text/html',
      {
        'content-length': '1',
      },
    );

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Good Food HTML exceeds the 5 MiB size limit',
    );
    expect(response.destroyed).toBe(true);
  });

  it('accepts exactly 5 MiB', async () => {
    mockResponse(200, Buffer.alloc(5 * 1024 * 1024, 65), 'text/html');

    await expect(fetchHtml(GOOD_FOOD_URL)).resolves.toHaveLength(
      5 * 1024 * 1024,
    );
  });

  it('reports a timeout while reading the response body', async () => {
    const controller = new AbortController();
    jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const response = Object.assign(new Readable({ read() {} }), {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
    }) as IncomingMessage;
    mockIncomingMessage(response);

    const pending = fetchHtml(GOOD_FOOD_URL);
    await new Promise<void>((resolve) => setImmediate(resolve));
    controller.abort();

    await expect(pending).rejects.toThrow('Good Food HTML request timed out');
  });

  it('reports network failures', async () => {
    requestMock.mockImplementation(() => {
      const connection = new EventEmitter() as ClientRequest;
      connection.end = jest.fn(() => {
        queueMicrotask(() =>
          connection.emit('error', new Error('connection failed')),
        );
        return connection;
      }) as ClientRequest['end'];
      return connection;
    });

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow(
      'Failed to fetch Good Food HTML',
    );
  });

  it('never opens a connection when DNS is unsafe', async () => {
    resolveMock.mockRejectedValue(
      new Error('Good Food resolved to an unsafe IP address'),
    );

    await expect(fetchHtml(GOOD_FOOD_URL)).rejects.toThrow('unsafe IP address');
    expect(requestMock).not.toHaveBeenCalled();
  });
});

function mockResponse(
  statusCode: number,
  body: string | Buffer,
  contentType?: string,
  extraHeaders: Record<string, string> = {},
): IncomingMessage {
  const headers = { ...extraHeaders };
  if (contentType) {
    headers['content-type'] = contentType;
  }
  const response = Object.assign(Readable.from([Buffer.from(body)]), {
    statusCode,
    headers,
  }) as IncomingMessage;
  mockIncomingMessage(response);
  return response;
}

function mockIncomingMessage(response: IncomingMessage): void {
  requestMock.mockImplementation(((
    options: RequestOptions,
    callback: (response: IncomingMessage) => void,
  ) => {
    const connection = new EventEmitter() as ClientRequest;
    options.signal?.addEventListener('abort', () =>
      response.destroy(new Error('aborted')),
    );
    connection.end = jest.fn(() => {
      queueMicrotask(() => callback(response));
      return connection;
    }) as ClientRequest['end'];
    return connection;
  }) as typeof request);
}
