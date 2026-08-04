export class RateLimiter {
  private static userCallTimestamps: Map<string, number[]> = new Map();
  private static MAX_CALLS_PER_WINDOW = 5;
  private static WINDOW_MS = 10000; // 10 seconds

  public static checkLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const timestamps = this.userCallTimestamps.get(key) || [];

    // Filter out calls older than the sliding window
    const validTimestamps = timestamps.filter(t => now - t < this.WINDOW_MS);

    if (validTimestamps.length >= this.MAX_CALLS_PER_WINDOW) {
      const oldestInWindow = validTimestamps[0];
      const retryAfterMs = this.WINDOW_MS - (now - oldestInWindow);
      return { allowed: false, retryAfterMs };
    }

    validTimestamps.push(now);
    this.userCallTimestamps.set(key, validTimestamps);
    return { allowed: true };
  }

  public static reset() {
    this.userCallTimestamps.clear();
  }
}
