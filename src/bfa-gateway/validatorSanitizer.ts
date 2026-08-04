import { ToolRegistry, BFAToolDefinition } from './toolRegistry';

export class ValidatorSanitizer {
  private static MAX_STRING_LENGTH = 1000;

  // Case-insensitive security patterns for indirect prompt injection, SQLi, and XSS
  private static FORBIDDEN_PATTERNS: RegExp[] = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:\s*override/i,
    /you\s+are\s+now\s+free/i,
    /dan\s+mode/i,
    /bypass\s+policy/i,
    /drop\s+table/i,
    /select\s+.*\s+from/i,
    /<script\b[^>]*>/i,
    /javascript:/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /__proto__/i,
    /prototype/i,
    /constructor/i
  ];

  public static validateInput(toolName: string, args: Record<string, any>): { valid: boolean; sanitizedArgs?: Record<string, any>; error?: string } {
    const toolDef = ToolRegistry.getTool(toolName);
    if (!toolDef) {
      return { valid: false, error: `Tool '${toolName}' is not registered in the BFA Tool Registry.` };
    }

    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return { valid: false, error: `Tool arguments must be a non-null object.` };
    }

    const sanitizedArgs: Record<string, any> = {};
    const allowedParamNames = new Set(toolDef.parameters.map(p => p.name));

    // 1. Parameter Whitelisting — Reject/strip parameter pollution
    for (const key of Object.keys(args)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        return { valid: false, error: `Security Violation: Prototype pollution attempt detected via property '${key}'.` };
      }
      if (!allowedParamNames.has(key)) {
        // Strip undeclared parameters to prevent unexpected mass assignment
        continue;
      }
      sanitizedArgs[key] = args[key];
    }

    // 2. Validate declared parameters against schema
    for (const param of toolDef.parameters) {
      const val = sanitizedArgs[param.name];

      // Required parameter check
      if (param.required && (val === undefined || val === null || val === '')) {
        return { valid: false, error: `Missing required parameter '${param.name}' for tool '${toolName}'.` };
      }

      if (val !== undefined && val !== null) {
        const actualType = typeof val;

        // Number type validation (disallow NaN, Infinity, -Infinity)
        if (param.type === 'number') {
          if (actualType !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
            return { valid: false, error: `Invalid number value for parameter '${param.name}'. Received '${val}'.` };
          }
        }

        // String type validation
        if (param.type === 'string') {
          if (actualType !== 'string') {
            return { valid: false, error: `Invalid string value for parameter '${param.name}'. Expected string, received ${actualType}.` };
          }

          // Length boundary check
          if (val.length > this.MAX_STRING_LENGTH) {
            return { valid: false, error: `Parameter '${param.name}' exceeds maximum allowed length of ${this.MAX_STRING_LENGTH} characters.` };
          }

          // Case-insensitive security inspection
          for (const pattern of this.FORBIDDEN_PATTERNS) {
            if (pattern.test(val)) {
              return { valid: false, error: `Security Warning: Input parameter '${param.name}' contains forbidden pattern or injection payload.` };
            }
          }
        }
      }
    }

    return { valid: true, sanitizedArgs };
  }

  public static sanitizeOutput(data: any, visited = new WeakSet()): any {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    // Prevent circular reference loops
    if (visited.has(data)) return '[Circular]';
    visited.add(data);

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item, visited));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Strip internal system, database, and credential metadata fields
      if (['internalNodeId', 'databaseHash', 'rawBooking', 'passwordHash', '__v', 'secretKey', 'accessToken'].includes(key)) {
        continue;
      }
      sanitized[key] = (typeof value === 'object' && value !== null) ? this.sanitizeOutput(value, visited) : value;
    }
    return sanitized;
  }
}
