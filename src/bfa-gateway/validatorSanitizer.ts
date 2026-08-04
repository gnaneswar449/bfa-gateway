import { ToolRegistry, BFAToolDefinition } from './toolRegistry';

export class ValidatorSanitizer {
  public static validateInput(toolName: string, args: Record<string, any>): { valid: boolean; error?: string } {
    const toolDef = ToolRegistry.getTool(toolName);
    if (!toolDef) {
      return { valid: false, error: `Tool '${toolName}' is not registered in the BFA Tool Registry.` };
    }

    // Check required parameters
    for (const param of toolDef.parameters) {
      if (param.required && (args[param.name] === undefined || args[param.name] === null)) {
        return { valid: false, error: `Missing required parameter '${param.name}' for tool '${toolName}'.` };
      }

      if (args[param.name] !== undefined && args[param.name] !== null) {
        const actualType = typeof args[param.name];
        if (param.type === 'number' && actualType !== 'number') {
          return { valid: false, error: `Invalid type for parameter '${param.name}'. Expected number, received ${actualType}.` };
        }
        if (param.type === 'string' && actualType !== 'string') {
          return { valid: false, error: `Invalid type for parameter '${param.name}'. Expected string, received ${actualType}.` };
        }
      }
    }

    // Check string injection patterns (e.g. SQLi / indirect prompt injection payloads)
    for (const [key, val] of Object.entries(args)) {
      if (typeof val === 'string') {
        if (val.includes("IGNORE PREVIOUS INSTRUCTIONS") || val.includes("DROP TABLE") || val.includes("<script>")) {
          return { valid: false, error: `Security Warning: Input parameter '${key}' contains forbidden command payload pattern.` };
        }
      }
    }

    return { valid: true };
  }

  public static sanitizeOutput(data: any): any {
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Strip internal system/database metadata fields
      if (['internalNodeId', 'databaseHash', 'rawBooking', 'passwordHash', '__v'].includes(key)) {
        continue;
      }
      sanitized[key] = (typeof value === 'object' && value !== null) ? this.sanitizeOutput(value) : value;
    }
    return sanitized;
  }
}
