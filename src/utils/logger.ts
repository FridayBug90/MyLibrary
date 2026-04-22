const fmt = (v: unknown): string =>
  typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v);

export const log = {
  info:  (tag: string, msg: string, data?: unknown) =>
    console.log(`[${tag}] ${msg}${data !== undefined ? '\n' + fmt(data) : ''}`),
  warn:  (tag: string, msg: string, data?: unknown) =>
    console.warn(`[${tag}] ⚠ ${msg}${data !== undefined ? '\n' + fmt(data) : ''}`),
  error: (tag: string, msg: string, data?: unknown) =>
    console.error(`[${tag}] ✗ ${msg}${data !== undefined ? '\n' + fmt(data) : ''}`),
};
