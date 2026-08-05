import * as crypto from 'crypto';
import { ToolRegistry } from './toolRegistry';
import { AuthMapper, IdentityContext } from './authMapper';
import { ValidatorSanitizer } from './validatorSanitizer';
import { PolicyEngine } from './policyEngine';
import { RateLimiter } from './rateLimiter';
import { AuditLogger, AuditRecord } from './auditLogger';
import { UserService, RoomService, OrderService, NotificationService } from '../microservices';

export interface BFAExecutionRequest {
  userToken: string;
  agentToken?: string;
  toolName: string;
  args: Record<string, any>;
}

export interface BFAExecutionResponse {
  success: boolean;
  traceId: string;
  verdict: 'ALLOWED' | 'DENIED' | 'INVALID_INPUT' | 'RATE_LIMITED' | 'HONEYPOT_TRIGGERED';
  ruleId?: string;
  data?: any;
  error?: string;
  durationMs: number;
}

export class BFACore {
  public static executeTool(req: BFAExecutionRequest): BFAExecutionResponse {
    const startTime = Date.now();
    const traceId = `tr_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 10000)}`;

    // 1. Resolve Auth & Identity
    const identity: IdentityContext | null = AuthMapper.resolveIdentity(req.userToken, req.agentToken || 'agent_default');
    if (!identity) {
      const durationMs = Date.now() - startTime;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: req.userToken || 'UNKNOWN',
        userRole: 'UNAUTHENTICATED',
        agentId: req.agentToken || 'agent_default',
        toolName: req.toolName,
        args: req.args,
        policyVerdict: 'DENIED',
        ruleId: 'AUTH_001_INVALID_TOKEN',
        reason: 'User authentication failed or identity token invalid.',
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'DENIED', ruleId: 'AUTH_001_INVALID_TOKEN', error: 'Authentication failed: Invalid user context token.', durationMs };
    }

    // 2. Active Defense Honeypot Interception
    const toolDef = ToolRegistry.getTool(req.toolName);
    if (toolDef && toolDef.isHoneypot) {
      const durationMs = Date.now() - startTime;
      const ruleId = 'HONEYPOT_001_DECOY_TRIGGERED';
      const errorMsg = `Security Alarm: Active Defense Honeypot decoy tool '${req.toolName}' triggered by agent '${identity.agentId}'. Session flagged for intrusion review.`;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        userRole: identity.userRole,
        agentId: identity.agentId,
        toolName: req.toolName,
        args: req.args,
        policyVerdict: 'DENIED',
        ruleId,
        reason: errorMsg,
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'HONEYPOT_TRIGGERED', ruleId, error: errorMsg, durationMs };
    }

    // 3. Rate Limiting Check (Dual Bucket: Tool-specific + Global User)
    const rateLimitKey = `${identity.userId}:${req.toolName}`;
    const rateLimitCheck = RateLimiter.checkLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      const durationMs = Date.now() - startTime;
      const ruleId = rateLimitCheck.ruleId || 'RATE_001_WINDOW_EXCEEDED';
      const errorMsg = `Rate limit exceeded. Retry after ${Math.ceil((rateLimitCheck.retryAfterMs || 1000) / 1000)}s.`;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        userRole: identity.userRole,
        agentId: identity.agentId,
        toolName: req.toolName,
        args: req.args,
        policyVerdict: 'RATE_LIMITED',
        ruleId,
        reason: errorMsg,
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'RATE_LIMITED', ruleId, error: errorMsg, durationMs };
    }

    // 4. Schema & Input Validation with Whitelist Sanitization
    const validation = ValidatorSanitizer.validateInput(req.toolName, req.args);
    if (!validation.valid) {
      const durationMs = Date.now() - startTime;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        userRole: identity.userRole,
        agentId: identity.agentId,
        toolName: req.toolName,
        args: req.args,
        policyVerdict: 'INVALID_INPUT',
        ruleId: 'VAL_001_SCHEMA_ERROR',
        reason: validation.error || 'Schema validation failed.',
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'INVALID_INPUT', ruleId: 'VAL_001_SCHEMA_ERROR', error: validation.error, durationMs };
    }

    const cleanArgs = validation.sanitizedArgs || req.args;

    // 5. Policy Engine (ABAC) Evaluation
    const policyVerdict = PolicyEngine.evaluate({
      userId: identity.userId,
      userRole: identity.userRole,
      agentId: identity.agentId,
      toolName: req.toolName,
      args: cleanArgs
    });

    if (!policyVerdict.allowed) {
      const durationMs = Date.now() - startTime;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        userRole: identity.userRole,
        agentId: identity.agentId,
        toolName: req.toolName,
        args: cleanArgs,
        policyVerdict: 'DENIED',
        ruleId: policyVerdict.ruleId,
        reason: policyVerdict.reason,
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'DENIED', ruleId: policyVerdict.ruleId, error: policyVerdict.reason, durationMs };
    }

    // 6. Execute Internal Microservice Action
    let rawResult: any;
    try {
      switch (req.toolName) {
        case 'get_user_profile':
          rawResult = UserService.getUserProfile(cleanArgs.userId);
          break;
        case 'get_user_timetable':
          rawResult = UserService.getUserTimetable(cleanArgs.userId);
          break;
        case 'search_available_rooms':
          rawResult = RoomService.searchAvailableRooms(cleanArgs.buildingId, cleanArgs.timeSlot);
          break;
        case 'reserve_room':
          rawResult = RoomService.bookRoom(identity.userId, identity.userName, cleanArgs.buildingId, cleanArgs.roomId, cleanArgs.timeSlot, cleanArgs.purpose);
          break;
        case 'cancel_room_reservation':
          rawResult = RoomService.cancelBooking(cleanArgs.bookingId);
          break;
        case 'search_store_inventory':
          rawResult = OrderService.searchInventory(cleanArgs.category);
          break;
        case 'place_supply_order':
          rawResult = OrderService.placeOrder(identity.userId, identity.userName, identity.userRole, cleanArgs.itemId, cleanArgs.quantity);
          break;
        case 'check_order_status':
          rawResult = OrderService.checkOrderStatus(cleanArgs.orderId);
          break;
        case 'send_user_notification':
          rawResult = NotificationService.sendNotification(cleanArgs.recipientId, cleanArgs.channel, cleanArgs.message);
          break;
        default:
          rawResult = { success: false, error: `Handler for tool '${req.toolName}' is missing.` };
      }
    } catch (err: any) {
      rawResult = { success: false, error: err.message || 'Internal microservice execution exception.' };
    }

    const durationMs = Date.now() - startTime;

    // 7. Sanitize Output Data & Attach Cryptographic Output Attestation
    const sanitizedData = ValidatorSanitizer.sanitizeOutput(rawResult);

    if (sanitizedData && typeof sanitizedData === 'object') {
      const payloadString = JSON.stringify(sanitizedData);
      const hmac = crypto.createHmac('sha256', 'BFA_ATTESTATION_SECRET_KEY');
      hmac.update(payloadString + traceId);
      const attestationToken = `bfa_attest_${hmac.digest('hex').substring(0, 16)}`;
      sanitizedData._attestation = {
        token: attestationToken,
        traceId,
        timestamp: new Date().toISOString(),
        issuer: 'BFA_GATEWAY_V1'
      };
    }

    // 8. Record Immutable Audit Log
    AuditLogger.log({
      traceId,
      timestamp: new Date().toISOString(),
      userId: identity.userId,
      userRole: identity.userRole,
      agentId: identity.agentId,
      toolName: req.toolName,
      args: cleanArgs,
      policyVerdict: 'ALLOWED',
      ruleId: policyVerdict.ruleId,
      reason: policyVerdict.reason,
      executionDurationMs: durationMs,
      responsePayload: sanitizedData
    });

    return {
      success: sanitizedData?.success ?? true,
      traceId,
      verdict: 'ALLOWED',
      ruleId: policyVerdict.ruleId,
      data: sanitizedData,
      durationMs
    };
  }
}
