import { BFACore, BFAExecutionResponse } from '../bfa-gateway/bfaCore';
import { ToolRegistry } from '../bfa-gateway/toolRegistry';

export interface AgentChatResponse {
  userPrompt: string;
  thoughtProcess: string;
  toolSelected?: string;
  extractedArgs?: Record<string, any>;
  bfaVerdict?: string;
  policyRule?: string;
  executionResult?: BFAExecutionResponse;
  naturalResponse: string;
}

export class NaturalAgentEngine {
  public static processQuery(userPrompt: string, userToken: string = 'usr_student_01'): AgentChatResponse {
    const promptLower = userPrompt.toLowerCase();
    let thoughtProcess = '';
    let toolName = '';
    let args: Record<string, any> = {};

    // 1. Intent Recognition and Argument Extraction Rules
    if (promptLower.includes('timetable') || promptLower.includes('schedule') || promptLower.includes('my classes')) {
      thoughtProcess = "User wants to view their academic timetable. Selecting tool 'get_user_timetable'.";
      toolName = 'get_user_timetable';

      // Check if user is asking for someone else's timetable
      if (promptLower.includes('bob') || promptLower.includes('student_02')) {
        args = { userId: 'usr_student_02' };
      } else if (promptLower.includes('evelyn') || promptLower.includes('faculty')) {
        args = { userId: 'usr_faculty_01' };
      } else {
        args = { userId: userToken };
      }

    } else if (promptLower.includes('profile') || promptLower.includes('my info') || promptLower.includes('who am i')) {
      thoughtProcess = "User wants to view user profile details. Selecting tool 'get_user_profile'.";
      toolName = 'get_user_profile';
      if (promptLower.includes('bob') || promptLower.includes('student_02')) {
        args = { userId: 'usr_student_02' };
      } else {
        args = { userId: userToken };
      }

    } else if (promptLower.includes('available') || promptLower.includes('search room') || promptLower.includes('find room')) {
      thoughtProcess = "User wants to find available study rooms. Selecting tool 'search_available_rooms'.";
      toolName = 'search_available_rooms';

      let buildingId = 'bldg_cs';
      if (promptLower.includes('engineering') || promptLower.includes('bldg_eng')) {
        buildingId = 'bldg_eng';
      }

      let timeSlot = 'Wed 10:00-12:00';
      if (promptLower.includes('thu') || promptLower.includes('thursday')) {
        timeSlot = 'Thu 14:00-16:00';
      } else if (promptLower.includes('fri') || promptLower.includes('friday')) {
        timeSlot = 'Fri 14:00-16:00';
      }

      args = { buildingId, timeSlot };

    } else if (promptLower.includes('cancel')) {
      thoughtProcess = "User wants to cancel a room reservation. Selecting tool 'cancel_room_reservation'.";
      toolName = 'cancel_room_reservation';

      // Extract booking ID pattern (e.g. bk_101 or bk_102)
      const bkMatch = promptLower.match(/bk_\d+/);
      const bookingId = bkMatch ? bkMatch[0] : (promptLower.includes('bob') ? 'bk_102' : 'bk_101');
      args = { bookingId };

    } else if (promptLower.includes('book') || promptLower.includes('reserve')) {
      thoughtProcess = "User wants to reserve a study room. Selecting tool 'reserve_room'.";
      toolName = 'reserve_room';

      let buildingId = 'bldg_cs';
      if (promptLower.includes('eng')) buildingId = 'bldg_eng';

      let roomId = 'room_201';
      if (promptLower.includes('202')) roomId = 'room_202';
      if (promptLower.includes('105')) roomId = 'room_105';

      let timeSlot = 'Wed 10:00-12:00';
      if (promptLower.includes('thu')) timeSlot = 'Thu 14:00-16:00';

      args = {
        buildingId,
        roomId,
        timeSlot,
        purpose: 'Study session requested via AI Agent'
      };

    } else if (promptLower.includes('inventory') || promptLower.includes('store') || promptLower.includes('supplies')) {
      thoughtProcess = "User wants to search campus store inventory. Selecting tool 'search_store_inventory'.";
      toolName = 'search_store_inventory';

      let category = undefined;
      if (promptLower.includes('stationery')) category = 'Stationery';
      if (promptLower.includes('lab') || promptLower.includes('equipment')) category = 'Lab Equipment';
      if (promptLower.includes('electronic')) category = 'Electronics';

      args = category ? { category } : {};

    } else if (promptLower.includes('order') || promptLower.includes('buy') || promptLower.includes('purchase')) {
      thoughtProcess = "User wants to place a supply order. Selecting tool 'place_supply_order'.";
      toolName = 'place_supply_order';

      let itemId = 'item_notebook';
      if (promptLower.includes('oscilloscope')) itemId = 'item_oscilloscope';
      if (promptLower.includes('logic analyzer')) itemId = 'item_logic_analyzer';
      if (promptLower.includes('raspberry pi') || promptLower.includes('pi')) itemId = 'item_raspberry_pi';

      let quantity = 1;
      const qtyMatch = promptLower.match(/\b\d+\b/);
      if (qtyMatch) quantity = parseInt(qtyMatch[0], 10);

      args = { itemId, quantity };

    } else if (promptLower.includes('status') || promptLower.includes('ord_')) {
      thoughtProcess = "User wants to check order status. Selecting tool 'check_order_status'.";
      toolName = 'check_order_status';

      const ordMatch = promptLower.match(/ord_\d+/);
      const orderId = ordMatch ? ordMatch[0] : 'ord_501';
      args = { orderId };

    } else if (promptLower.includes('notify') || promptLower.includes('email') || promptLower.includes('sms') || promptLower.includes('send message')) {
      thoughtProcess = "User wants to send a notification alert. Selecting tool 'send_user_notification'.";
      toolName = 'send_user_notification';
      args = {
        recipientId: 'usr_student_02',
        channel: promptLower.includes('sms') ? 'SMS' : 'EMAIL',
        message: 'Notification alert sent via AI Assistant.'
      };
    } else {
      // Fallback intent
      return {
        userPrompt,
        thoughtProcess: "Could not map query to any registered BFA tool.",
        naturalResponse: `I'm sorry, I couldn't understand which action to take. Available capabilities include checking timetables, searching/booking study rooms, cancelling bookings, ordering supplies, checking order status, and sending notifications.`
      };
    }

    // 2. Execute selected tool through BFA Core Layer
    const bfaResult = BFACore.executeTool({
      userToken,
      agentToken: 'agent_natural_assistant',
      toolName,
      args
    });

    // 3. Format Natural Language Output based on BFA Verdict
    let naturalResponse = '';

    if (bfaResult.verdict === 'ALLOWED') {
      if (toolName === 'get_user_timetable') {
        const list = bfaResult.data?.timetable || [];
        naturalResponse = `Here is the requested class timetable:\n` +
          list.map((c: any) => `• ${c.courseCode} - ${c.courseName} (${c.timeSlot} at ${c.room})`).join('\n');
      } else if (toolName === 'search_available_rooms') {
        const rooms = bfaResult.data?.availableRooms || [];
        naturalResponse = `Found ${rooms.length} available room(s) in '${args.buildingId}' for '${args.timeSlot}':\n` +
          rooms.map((r: any) => `• Room ${r.roomId} (Capacity: ${r.capacity}, Projector: ${r.hasProjector ? 'Yes' : 'No'})`).join('\n');
      } else if (toolName === 'reserve_room') {
        const b = bfaResult.data?.booking || bfaResult.data;
        naturalResponse = `✅ Room reservation successful! Booking ID: ${b?.bookingId || 'bk_new'} for Room ${b?.roomId || args.roomId} (${b?.timeSlot || args.timeSlot}).`;
      } else if (toolName === 'cancel_room_reservation') {
        naturalResponse = `✅ Booking '${args.bookingId}' has been successfully cancelled.`;
      } else if (toolName === 'place_supply_order') {
        const o = bfaResult.data?.order;
        naturalResponse = `✅ Order placed successfully! Order ID: ${o?.orderId} | Total: $${o?.totalCost} (${o?.quantity}x ${o?.itemName}).`;
      } else if (toolName === 'search_store_inventory') {
        const items = bfaResult.data?.items || [];
        naturalResponse = `Found ${items.length} inventory item(s):\n` +
          items.map((i: any) => `• ${i.name} ($${i.price}) - Stock: ${i.stock} ${i.facultyOnly ? '[Faculty Only]' : ''}`).join('\n');
      } else if (toolName === 'check_order_status') {
        const o = bfaResult.data?.order;
        naturalResponse = `Order ${o?.orderId} for '${o?.itemName}' is currently **${o?.status}**.`;
      } else {
        naturalResponse = `✅ Action completed successfully: ${JSON.stringify(bfaResult.data)}`;
      }
    } else if (bfaResult.verdict === 'DENIED') {
      naturalResponse = `⚠️ Security Action Blocked by BFA Policy Engine [${bfaResult.ruleId}]: ${bfaResult.error}`;
    } else if (bfaResult.verdict === 'RATE_LIMITED') {
      naturalResponse = `⏱️ BFA Rate Limit Triggered [${bfaResult.ruleId}]: ${bfaResult.error}`;
    } else {
      naturalResponse = `❌ BFA Validation Error: ${bfaResult.error}`;
    }

    return {
      userPrompt,
      thoughtProcess,
      toolSelected: toolName,
      extractedArgs: args,
      bfaVerdict: bfaResult.verdict,
      policyRule: bfaResult.ruleId,
      executionResult: bfaResult,
      naturalResponse
    };
  }
}
