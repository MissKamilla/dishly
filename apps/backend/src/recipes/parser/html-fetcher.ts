import { request } from 'node:https';
import { IncomingMessage } from 'node:http';
import { resolvePublicIpv4 } from './public-ip';
import { validateGoodFoodUrl } from './url-validator';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export async function fetchHtml(input: string): Promise<string> {
  const url = validateGoodFoodUrl(input);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  try {
    const address = await resolvePublicIpv4(url.hostname, signal);
    signal.throwIfAborted();
    const response = await requestHtml(url, address, signal);
    validateHtmlResponse(response);
    return await readHtml(response);
  } catch (error) {
    if (signal.aborted) {
      throw new Error('Good Food HTML request timed out', { cause: error });
    }

    throw error;
  }
}

function requestHtml(
  url: URL,
  address: string,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const connection = request(
      {
        hostname: address,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        agent: false,
        servername: url.hostname,
        rejectUnauthorized: true,
        signal,
        headers: {
          Host: url.hostname,
          Accept: 'text/html',
          'Accept-Encoding': 'identity',
        },
      },
      resolve,
    );

    connection.once('error', (error: Error) => {
      reject(new Error('Failed to fetch Good Food HTML', { cause: error }));
    });
    connection.end();
  });
}

function validateHtmlResponse(response: IncomingMessage): void {
  const contentType = response.headers['content-type'];
  const contentEncoding = response.headers['content-encoding'];
  let errorMessage: string | null = null;

  if (
    response.statusCode &&
    response.statusCode >= 300 &&
    response.statusCode < 400
  ) {
    errorMessage = 'Good Food redirected the HTML request';
  } else if (
    !response.statusCode ||
    response.statusCode < 200 ||
    response.statusCode >= 300
  ) {
    errorMessage = `Good Food returned HTTP ${response.statusCode ?? 'unknown'}`;
  } else if (
    contentType?.split(';', 1)[0].trim().toLowerCase() !== 'text/html'
  ) {
    errorMessage = 'Good Food returned a non-HTML response';
  } else if (
    contentEncoding &&
    contentEncoding.trim().toLowerCase() !== 'identity'
  ) {
    errorMessage = 'Good Food returned unsupported HTML encoding';
  }

  if (errorMessage) {
    response.destroy();
    throw new Error(errorMessage);
  }
}

async function readHtml(response: IncomingMessage): Promise<string> {
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let html = '';

  try {
    for await (const chunk of response) {
      const bytes = chunk as Buffer;
      receivedBytes += bytes.byteLength;
      if (receivedBytes > MAX_HTML_BYTES) {
        throw new Error('Good Food HTML exceeds the 5 MiB size limit');
      }

      html += decoder.decode(bytes, { stream: true });
    }

    return html + decoder.decode();
  } finally {
    response.destroy();
  }
}
