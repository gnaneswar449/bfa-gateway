export class RateLimiter {
  private static userCallTimestamps: Map<string, number[]> = new Map();
  private static globalUserTimestamps: Map<string, number[]> = new Map();

  private static MAX_CALLS_PER_TOOL_WINDOW = 5;
  private static MAX_GLOBAL_CALLS_WINDOW  = 12;
  private static WINDOW_MS = 10000; // 10 seconds

  public static checkLimit(key: string): { allowed: boolean; retryAfterMs?: number; ruleId?: string } {
    const now = Date.now();
    const parts = key.split(':');
    const userId = parts[0];

    // 1. Check Global Per-User Rate Limit Across All Tools
    const globalTimestamps = (this.globalUserTimestamps.get(userId) || []).filter(t => now - t < this.WINDOW_MS);
    if (globalTimestamps.length >= this.MAX_GLOBAL_CALLS_WINDOW) {
      const oldestInWindow = globalTimestamps[0];
      const retryAfterMs = this.WINDOW_MS - (now - oldestInWindow);
      return { allowed: false, retryAfterMs, ruleId: 'RATE_002_GLOBAL_LIMIT_EXCEEDED' };
    }

    // 2. Check Per-Tool Rate Limit for specific user:tool pair
    const toolTimestamps = (this.userCallTimestamps.get(key) || []).filter(t => now - t < this.WINDOW_MS);
    if (toolTimestamps.length >= this.MAX_CALLS_PER_TOOL_WINDOW) {
      const oldestInWindow = toolTimestamps[0];
      const retryAfterMs = this.WINDOW_MS - (now - oldestInWindow);
      return { allowed: false, retryAfterMs, ruleId: 'RATE_001_WINDOW_EXCEEDED' };
    }

    // Record valid call in both buckets
    toolTimestamps.push(now);
    globalTimestamps.push(now);

    this.userCallTimestamps.set(key, toolTimestamps);
    this.globalUserTimestamps.set(userId, globalTimestamps);

    return { allowed: true };
  }

  public static reset() {
    this.userCallTimestamps.clear();
    this.globalUserTimestamps.clear();
  }
}
