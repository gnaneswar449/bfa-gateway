import { RoomService, OrderService } from '../microservices';

export interface EvaluationContext {
  userId: string;
  userRole: 'Student' | 'Faculty' | 'Admin';
  agentId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface PolicyVerdict {
  allowed: boolean;
  ruleId: string;
  reason: string;
}

export class PolicyEngine {
  public static evaluate(ctx: EvaluationContext): PolicyVerdict {
    const { userId, userRole, toolName, args } = ctx;

    // Rule 1: User Profile Access - Students can only query their own profile/timetable
    if (toolName === 'get_user_profile' || toolName === 'get_user_timetable') {
      const targetUserId = args.userId;
      if (userRole === 'Student' && targetUserId !== userId) {
        return {
          allowed: false,
          ruleId: 'POL_001_PROFILE_ISOLATION',
          reason: `Access Denied: Students are not authorized to view user profiles or timetables of other students (${targetUserId}).`
        };
      }
    }

    // Rule 2: Booking Cancellation Ownership Check (Resource ABAC)
    if (toolName === 'cancel_room_reservation') {
      const bookingId = args.bookingId;
      const booking = RoomService.getBooking(bookingId);
      if (booking && booking.userId !== userId && userRole !== 'Admin') {
        return {
          allowed: false,
          ruleId: 'POL_002_RESOURCE_OWNERSHIP',
          reason: `Access Denied: You can only cancel room bookings that belong to your user account. Booking '${bookingId}' belongs to '${booking.userId}'.`
        };
      }
    }

    // Rule 3: Faculty-Only Lab Equipment Orders
    if (toolName === 'place_supply_order') {
      const itemId = args.itemId;
      if (itemId === 'item_oscilloscope' || itemId === 'item_logic_analyzer') {
        if (userRole !== 'Faculty' && userRole !== 'Admin') {
          return {
            allowed: false,
            ruleId: 'POL_003_FACULTY_ONLY_ORDER',
            reason: `Access Denied: Ordering restricted lab equipment ('${itemId}') requires Faculty role privileges.`
          };
        }
      }

      // Quantity boundary check
      if (typeof args.quantity === 'number' && args.quantity > 10 && userRole !== 'Admin') {
        return {
          allowed: false,
          ruleId: 'POL_004_BULK_ORDER_LIMIT',
          reason: `Access Denied: Order quantity (${args.quantity}) exceeds max allowed limit (10 items) per agent transaction.`
        };
      }
    }

    // Rule 4: Order Status View Authorization
    if (toolName === 'check_order_status') {
      const orderId = args.orderId;
      const order = OrderService.getOrder(orderId);
      if (order && order.userId !== userId && userRole !== 'Admin') {
        return {
          allowed: false,
          ruleId: 'POL_005_ORDER_OWNERSHIP',
          reason: `Access Denied: Order '${orderId}' belongs to another user (${order.userId}).`
        };
      }
    }

    // Default Allow
    return {
      allowed: true,
      ruleId: 'POL_DEFAULT_ALLOW',
      reason: `Action authorized for user '${userId}' under role '${userRole}'.`
    };
  }
}
