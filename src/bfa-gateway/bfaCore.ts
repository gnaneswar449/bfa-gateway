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
  verdict: 'ALLOWED' | 'DENIED' | 'INVALID_INPUT' | 'RATE_LIMITED';
  ruleId?: string;
  data?: any;
  error?: string;
  durationMs: number;
}

export class BFACore {
  public static executeTool(req: BFAExecutionRequest): BFAExecutionResponse {
    const startTime = Date.now();
    const traceId = `tr_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`;

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
      return { success: false, traceId, verdict: 'DENIED', error: 'Authentication failed: Invalid user context token.', durationMs };
    }

    // 2. Rate Limiting Check
    const rateLimitKey = `${identity.userId}:${req.toolName}`;
    const rateLimitCheck = RateLimiter.checkLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      const durationMs = Date.now() - startTime;
      const errorMsg = `Rate limit exceeded. Maximum 5 tool invocations allowed per 10-second window. Retry after ${Math.ceil((rateLimitCheck.retryAfterMs || 1000) / 1000)}s.`;
      AuditLogger.log({
        traceId,
        timestamp: new Date().toISOString(),
        userId: identity.userId,
        userRole: identity.userRole,
        agentId: identity.agentId,
        toolName: req.toolName,
        args: req.args,
        policyVerdict: 'RATE_LIMITED',
        ruleId: 'RATE_001_WINDOW_EXCEEDED',
        reason: errorMsg,
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'RATE_LIMITED', ruleId: 'RATE_001_WINDOW_EXCEEDED', error: errorMsg, durationMs };
    }

    // 3. Schema & Input Validation
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

    // 4. Policy Engine (ABAC) Evaluation
    const policyVerdict = PolicyEngine.evaluate({
      userId: identity.userId,
      userRole: identity.userRole,
      agentId: identity.agentId,
      toolName: req.toolName,
      args: req.args
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
        args: req.args,
        policyVerdict: 'DENIED',
        ruleId: policyVerdict.ruleId,
        reason: policyVerdict.reason,
        executionDurationMs: durationMs
      });
      return { success: false, traceId, verdict: 'DENIED', ruleId: policyVerdict.ruleId, error: policyVerdict.reason, durationMs };
    }

    // 5. Execute Internal Microservice Action
    let rawResult: any;
    try {
      switch (req.toolName) {
        case 'get_user_profile':
          rawResult = UserService.getUserProfile(req.args.userId);
          break;
        case 'get_user_timetable':
          rawResult = UserService.getUserTimetable(req.args.userId);
          break;
        case 'search_available_rooms':
          rawResult = RoomService.searchAvailableRooms(req.args.buildingId, req.args.timeSlot);
          break;
        case 'reserve_room':
          rawResult = RoomService.bookRoom(identity.userId, identity.userName, req.args.buildingId, req.args.roomId, req.args.timeSlot, req.args.purpose);
          break;
        case 'cancel_room_reservation':
          rawResult = RoomService.cancelBooking(req.args.bookingId);
          break;
        case 'search_store_inventory':
          rawResult = OrderService.searchInventory(req.args.category);
          break;
        case 'place_supply_order':
          rawResult = OrderService.placeOrder(identity.userId, identity.userName, identity.userRole, req.args.itemId, req.args.quantity);
          break;
        case 'check_order_status':
          rawResult = OrderService.checkOrderStatus(req.args.orderId);
          break;
        case 'send_user_notification':
          rawResult = NotificationService.sendNotification(req.args.recipientId, req.args.channel, req.args.message);
          break;
        default:
          rawResult = { success: false, error: `Handler for tool '${req.toolName}' is missing.` };
      }
    } catch (err: any) {
      rawResult = { success: false, error: err.message || 'Internal microservice execution exception.' };
    }

    const durationMs = Date.now() - startTime;

    // 6. Sanitize Output Data
    const sanitizedData = ValidatorSanitizer.sanitizeOutput(rawResult);

    // 7. Record Audit Log
    AuditLogger.log({
      traceId,
      timestamp: new Date().toISOString(),
      userId: identity.userId,
      userRole: identity.userRole,
      agentId: identity.agentId,
      toolName: req.toolName,
      args: req.args,
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
