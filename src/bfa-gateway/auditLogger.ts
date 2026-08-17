import fs from 'fs';
import path from 'path';

export interface AuditRecord {
  traceId: string;
  timestamp: string;
  userId: string;
  userRole: string;
  agentId: string;
  toolName: string;
  args: Record<string, any>;
  policyVerdict: 'ALLOWED' | 'DENIED' | 'INVALID_INPUT' | 'RATE_LIMITED';
  ruleId: string;
  reason: string;
  executionDurationMs: number;
  responsePayload?: any;
}

export class AuditLogger {
  private static records: AuditRecord[] = [];
  private static STORAGE_FILE = path.join(process.cwd(), 'data', 'audit_logs.json');
  private static saveTimer: ReturnType<typeof setTimeout> | null = null;
  private static SAVE_DEBOUNCE_MS = 250;

  static {
    this.loadFromDisk();
  }

  private static loadFromDisk() {
    try {
      const dataDir = path.dirname(this.STORAGE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.STORAGE_FILE)) {
        const fileContent = fs.readFileSync(this.STORAGE_FILE, 'utf-8');
        this.records = JSON.parse(fileContent);
      }
    } catch (e) {
      console.warn('[AuditLogger] Could not load disk audit logs, starting fresh.');
      this.records = [];
    }
  }

  private static saveToDisk() {
    try {
      const dataDir = path.dirname(this.STORAGE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.STORAGE_FILE, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (e) {
      console.error('[AuditLogger] Error writing audit log to disk:', e);
    }
  }

  private static scheduleSaveToDisk() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveToDisk();
    }, this.SAVE_DEBOUNCE_MS);
  }

  public static log(record: AuditRecord) {
    this.records.unshift(record); // Prepend so newest logs are first
    if (this.records.length > 500) {
      this.records.pop();
    }
    this.scheduleSaveToDisk();
  }

  public static getLogs(filter?: { verdict?: string; userId?: string; toolName?: string }): AuditRecord[] {
    let result = [...this.records];
    if (filter?.verdict) {
      result = result.filter(r => r.policyVerdict === filter.verdict);
    }
    if (filter?.userId) {
      result = result.filter(r => r.userId === filter.userId);
    }
    if (filter?.toolName) {
      result = result.filter(r => r.toolName === filter.toolName);
    }
    return result;
  }

  public static clearLogs() {
    this.records = [];
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveToDisk();
  }
}
