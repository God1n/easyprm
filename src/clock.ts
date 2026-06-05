/** Returns today's date as YYYY-MM-DD. Centralized so it can be stubbed if needed. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
