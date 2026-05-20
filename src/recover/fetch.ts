export interface FetchOptions {
  /** Number of additional attempts on 5xx / network errors. Default 3. */
  readonly retries?: number;
  /** Initial delay between retries in ms (doubled on each retry). Default 500. */
  readonly retryDelayMs?: number;
  /** Polite delay before every request, in ms. Default 0. */
  readonly politeDelayMs?: number;
}

const DEFAULT_OPTS: Required<FetchOptions> = {
  retries: 3,
  retryDelayMs: 500,
  politeDelayMs: 0,
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  opts: FetchOptions,
): Promise<Response> {
  const cfg = { ...DEFAULT_OPTS, ...opts };
  let lastError: unknown;
  let delay = cfg.retryDelayMs;
  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    if (cfg.politeDelayMs > 0) await sleep(cfg.politeDelayMs);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${String(response.status)} fetching ${url}`);
      }
      lastError = new Error(
        `HTTP ${String(response.status)} fetching ${url}`,
      );
    } catch (e) {
      lastError = e;
      // 4xx errors are thrown above and shouldn't be retried.
      if (e instanceof Error && /^HTTP 4\d\d/u.test(e.message)) {
        throw e;
      }
    }
    if (attempt < cfg.retries) {
      await sleep(delay);
      delay *= 2;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed: ${url}`);
}

export async function fetchText(
  url: string,
  opts: FetchOptions = {},
): Promise<string> {
  const response = await fetchWithRetry(url, opts);
  return response.text();
}

export async function fetchBuffer(
  url: string,
  opts: FetchOptions = {},
): Promise<Uint8Array> {
  const response = await fetchWithRetry(url, opts);
  const arr = await response.arrayBuffer();
  return new Uint8Array(arr);
}
