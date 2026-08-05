import { BFACore, BFAExecutionResponse } from '../bfa-gateway/bfaCore';
import { AuthMapper } from '../bfa-gateway/authMapper';
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
  responseMode?: 'conversational' | 'tool';
}

export class NaturalAgentEngine {
  private static getUserName(userToken: string): string {
    const identity = AuthMapper.resolveIdentity(userToken, 'agent_natural_assistant');
    return identity?.userName || 'there';
  }

  private static conversationalReply(
    userPrompt: string,
    thoughtProcess: string,
    naturalResponse: string
  ): AgentChatResponse {
    return {
      userPrompt,
      thoughtProcess,
      naturalResponse,
      responseMode: 'conversational'
    };
  }

  private static matchConversational(
    userPrompt: string,
    promptLower: string,
    userToken: string
  ): AgentChatResponse | null {
    const name = this.getUserName(userToken);
    const trimmed = promptLower.replace(/[!?.,"']/g, '').trim();

    const isGreeting =
      /^(hi|hello|hey|hiya|howdy|greetings|good morning|good afternoon|good evening|morning|evening)\b/.test(trimmed) ||
      /^(what'?s up|whats up|sup)\b/.test(trimmed);

    const isThanks = /\b(thank you|thanks|thank u|thx|appreciate it|much appreciated)\b/.test(trimmed);
    const isGoodbye = /\b(bye|goodbye|good bye|see you|see ya|later|take care|good night)\b/.test(trimmed);
    const isHelp =
      /\b(help|what can you do|what do you do|what are your capabilities|show commands|how do i use|how to use)\b/.test(trimmed) ||
      trimmed === '?' || trimmed === 'commands';
    const isIdentity =
      /\b(who are you|what are you|your name|what is your name|who is this|introduce yourself)\b/.test(trimmed);
    const isHowAreYou =
      /\b(how are you|how r u|how're you|how is it going|how's it going|how are things)\b/.test(trimmed);
    const isSmallTalk =
      /\b(nice|cool|awesome|great|ok|okay|sure|alright|got it|understood|perfect)\b/.test(trimmed) &&
      trimmed.split(/\s+/).length <= 4;

    if (isGreeting) {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return this.conversationalReply(
        userPrompt,
        'Detected greeting intent — responding conversationally without BFA tool call.',
        `${timeGreeting}, ${name}! 👋 I'm your BFA campus assistant. I can help you check your timetable, find and book study rooms, manage bookings, browse the campus store, place supply orders, and more.\n\nTry asking naturally, e.g. "What classes do I have today?" or "Find me a free room in the CS building on Wednesday."`
      );
    }

    if (isThanks) {
      return this.conversationalReply(
        userPrompt,
        'Detected gratitude intent — responding conversationally.',
        `You're welcome, ${name}! Let me know if you need anything else — rooms, supplies, or your schedule.`
      );
    }

    if (isGoodbye) {
      return this.conversationalReply(
        userPrompt,
        'Detected farewell intent — responding conversationally.',
        `Goodbye, ${name}! Have a great day on campus. I'll be here whenever you need help.`
      );
    }

    if (isIdentity) {
      return this.conversationalReply(
        userPrompt,
        'Detected identity query — responding conversationally.',
        `I'm the BFA Campus AI Assistant — a secure agent backed by the Back-end for Agents (BFA) Gateway. Every action I take goes through ABAC policy checks, rate limiting, and audit logging before touching any campus microservice.\n\nYou're signed in as ${name}. Ask me anything about rooms, orders, or your schedule!`
      );
    }

    if (isHowAreYou) {
      return this.conversationalReply(
        userPrompt,
        'Detected small-talk intent — responding conversationally.',
        `I'm running smoothly and all BFA security policies are active! Ready to help you, ${name}. What would you like to do today?`
      );
    }

    if (isHelp) {
      const tools = ToolRegistry.getAllTools();
      const capabilityList = tools
        .map(t => `• ${t.description}`)
        .join('\n');
      return this.conversationalReply(
        userPrompt,
        'Detected help request — listing registered BFA capabilities.',
        `Here's what I can help you with, ${name}:\n\n${capabilityList}\n\nJust type naturally — you don't need exact commands. Examples:\n• "Show my timetable"\n• "Find available rooms on Wednesday"\n• "Book room_203 for Thursday afternoon"\n• "Order 2 notebooks"\n• "What's in the lab equipment store?"`
      );
    }

    if (isSmallTalk) {
      return this.conversationalReply(
        userPrompt,
        'Detected acknowledgment — responding conversationally.',
        `Got it, ${name}! Is there anything else I can help you with?`
      );
    }

    return null;
  }

  private static buildFallback(userPrompt: string, promptLower: string, userToken: string): AgentChatResponse {
    const name = this.getUserName(userToken);
    const hints: string[] = [];

    if (/\b(room|study|reserve|booking)\b/.test(promptLower)) {
      hints.push('Try: "Find available rooms in bldg_cs for Wed 10:00-12:00" or "Book room_203 for Thu 14:00-16:00"');
    }
    if (/\b(class|course|lecture|timetable|schedule)\b/.test(promptLower)) {
      hints.push('Try: "Show my timetable" or "What classes do I have?"');
    }
    if (/\b(order|buy|store|supply|equipment|inventory)\b/.test(promptLower)) {
      hints.push('Try: "Show campus store inventory" or "Order item_notebook quantity 2"');
    }
    if (/\b(profile|info|email|department)\b/.test(promptLower)) {
      hints.push('Try: "Show my profile" or "Who am I?"');
    }

    const hintBlock = hints.length
      ? `\n\nBased on your message, you might want to:\n${hints.map(h => `• ${h}`).join('\n')}`
      : '\n\nTry asking about your timetable, study rooms, campus store supplies, or say "help" to see everything I can do.';

    return this.conversationalReply(
      userPrompt,
      'No tool intent matched — returning contextual conversational fallback.',
      `I'm not sure how to handle that specific request, ${name}.${hintBlock}`
    );
  }

  public static processQuery(userPrompt: string, userToken: string = 'usr_student_01'): AgentChatResponse {
    const trimmedPrompt = userPrompt.trim();
    const promptLower = trimmedPrompt.toLowerCase();
    let thoughtProcess = '';
    let toolName = '';
    let args: Record<string, any> = {};

    // 1. Conversational intents (greetings, help, small talk — no BFA tool call)
    const conversational = this.matchConversational(trimmedPrompt, promptLower, userToken);
    if (conversational) return conversational;

    // 2. Tool intent recognition with expanded natural language patterns
    if (
      promptLower.includes('timetable') ||
      promptLower.includes('schedule') ||
      promptLower.includes('my classes') ||
      /\b(what classes|which classes|class list|my courses|what courses)\b/.test(promptLower)
    ) {
      thoughtProcess = "User wants to view their academic timetable. Selecting tool 'get_user_timetable'.";
      toolName = 'get_user_timetable';

      if (promptLower.includes('bob') || promptLower.includes('student_02')) {
        args = { userId: 'usr_student_02' };
      } else if (promptLower.includes('evelyn') || promptLower.includes('faculty')) {
        args = { userId: 'usr_faculty_01' };
      } else {
        args = { userId: userToken };
      }

    } else if (
      promptLower.includes('profile') ||
      promptLower.includes('my info') ||
      /\b(who am i|about me|my details|my account)\b/.test(promptLower)
    ) {
      thoughtProcess = "User wants to view user profile details. Selecting tool 'get_user_profile'.";
      toolName = 'get_user_profile';
      if (promptLower.includes('bob') || promptLower.includes('student_02')) {
        args = { userId: 'usr_student_02' };
      } else {
        args = { userId: userToken };
      }

    } else if (
      promptLower.includes('available') ||
      promptLower.includes('search room') ||
      promptLower.includes('find room') ||
      /\b(free room|any room|rooms free|room availability|study room)\b/.test(promptLower)
    ) {
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
      } else if (promptLower.includes('mon') || promptLower.includes('monday')) {
        timeSlot = 'Mon 09:00-11:00';
      } else if (promptLower.includes('tue') || promptLower.includes('tuesday')) {
        timeSlot = 'Tue 11:00-13:00';
      }

      args = { buildingId, timeSlot };

    } else if (promptLower.includes('cancel')) {
      thoughtProcess = "User wants to cancel a room reservation. Selecting tool 'cancel_room_reservation'.";
      toolName = 'cancel_room_reservation';

      const bkMatch = promptLower.match(/bk_\d+/);
      const bookingId = bkMatch ? bkMatch[0] : (promptLower.includes('bob') ? 'bk_102' : 'bk_101');
      args = { bookingId };

    } else if (promptLower.includes('order') || promptLower.includes('buy') || promptLower.includes('purchase')) {
      thoughtProcess = "User wants to place a supply order. Selecting tool 'place_supply_order'.";
      toolName = 'place_supply_order';

      const itemMatch = promptLower.match(/item_[a-z0-9_]+/);
      let itemId = itemMatch ? itemMatch[0] : 'item_notebook';
      if (!itemMatch) {
        if (promptLower.includes('oscilloscope')) itemId = 'item_oscilloscope';
        else if (promptLower.includes('logic analyzer')) itemId = 'item_logic_analyzer';
        else if (promptLower.includes('raspberry pi') || promptLower.includes('pi')) itemId = 'item_raspberry_pi';
        else if (promptLower.includes('notebook')) itemId = 'item_notebook';
      }

      let quantity = 1;
      const qtyMatch = promptLower.match(/\bquantity\s+(\d+)\b/) || promptLower.match(/\b(\d+)\s+(notebook|item|piece|unit)/);
      if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);

      args = { itemId, quantity };

    } else if (/\bbook\b/.test(promptLower) || promptLower.includes('reserve')) {
      thoughtProcess = "User wants to reserve a study room. Selecting tool 'reserve_room'.";
      toolName = 'reserve_room';

      let buildingId = 'bldg_cs';
      if (promptLower.includes('bldg_eng') || promptLower.includes('engineering')) buildingId = 'bldg_eng';

      const roomMatch = promptLower.match(/room_\d+/);
      const roomId = roomMatch ? roomMatch[0] : 'room_201';

      let timeSlot = 'Wed 10:00-12:00';
      if (promptLower.includes('thu') || promptLower.includes('thursday')) timeSlot = 'Thu 14:00-16:00';
      else if (promptLower.includes('fri') || promptLower.includes('friday')) timeSlot = 'Fri 14:00-16:00';

      args = {
        buildingId,
        roomId,
        timeSlot,
        purpose: 'Study session requested via AI Agent'
      };

    } else if (
      promptLower.includes('inventory') ||
      promptLower.includes('store') ||
      promptLower.includes('supplies') ||
      /\b(what can i order|show items|campus shop|lab equipment list)\b/.test(promptLower)
    ) {
      thoughtProcess = "User wants to search campus store inventory. Selecting tool 'search_store_inventory'.";
      toolName = 'search_store_inventory';

      let category = undefined;
      if (promptLower.includes('stationery')) category = 'Stationery';
      if (promptLower.includes('lab') || promptLower.includes('equipment')) category = 'Lab Equipment';
      if (promptLower.includes('electronic')) category = 'Electronics';

      args = category ? { category } : {};

    } else if (promptLower.includes('status') || promptLower.includes('ord_')) {
      thoughtProcess = "User wants to check order status. Selecting tool 'check_order_status'.";
      toolName = 'check_order_status';

      const ordMatch = promptLower.match(/ord_\d+/);
      const orderId = ordMatch ? ordMatch[0] : 'ord_501';
      args = { orderId };

    } else if (promptLower.includes('credentials') || promptLower.includes('secret') || promptLower.includes('export credentials')) {
      thoughtProcess = "User requested sensitive credential export. Selecting tool 'export_system_credentials'.";
      toolName = 'export_system_credentials';
      args = { scope: 'all_secrets' };
    } else if (promptLower.includes('grant admin') || promptLower.includes('escalate')) {
      thoughtProcess = "User requested admin privilege escalation. Selecting tool 'grant_admin_privileges'.";
      toolName = 'grant_admin_privileges';
      args = { targetRole: 'Admin' };
    } else if (promptLower.includes('notify') || promptLower.includes('email') || promptLower.includes('sms') || promptLower.includes('send message')) {
      thoughtProcess = "User wants to send a notification alert. Selecting tool 'send_user_notification'.";
      toolName = 'send_user_notification';
      args = {
        recipientId: 'usr_student_02',
        channel: promptLower.includes('sms') ? 'SMS' : 'EMAIL',
        message: 'Notification alert sent via AI Assistant.'
      };
    } else {
      return this.buildFallback(trimmedPrompt, promptLower, userToken);
    }

    // 3. Execute selected tool through BFA Core Layer
    const bfaResult = BFACore.executeTool({
      userToken,
      agentToken: 'agent_natural_assistant',
      toolName,
      args
    });

    // 4. Format Natural Language Output based on BFA Verdict
    let naturalResponse = '';

    if (bfaResult.verdict === 'ALLOWED') {
      if (toolName === 'get_user_profile') {
        const u = bfaResult.data?.user;
        naturalResponse = u
          ? `Here's your profile, ${u.name}:\n• Role: ${u.role}\n• Department: ${u.department}\n• Email: ${u.email}\n• ID: ${u.id}`
          : `✅ Profile retrieved successfully.`;
      } else if (toolName === 'get_user_timetable') {
        const list = bfaResult.data?.timetable || [];
        naturalResponse = list.length
          ? `Here is the requested class timetable:\n` +
            list.map((c: any) => `• ${c.courseCode} - ${c.courseName} (${c.timeSlot} at ${c.room})`).join('\n')
          : `No timetable entries found for this user.`;
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
    } else if (bfaResult.verdict === 'HONEYPOT_TRIGGERED') {
      naturalResponse = `🚨 ACTIVE DEFENSE ALARM: Decoy Honeypot tool triggered [${bfaResult.ruleId}]: ${bfaResult.error}`;
    } else if (bfaResult.verdict === 'DENIED') {
      naturalResponse = `⚠️ Security Action Blocked by BFA Policy Engine [${bfaResult.ruleId}]: ${bfaResult.error}`;
    } else if (bfaResult.verdict === 'RATE_LIMITED') {
      naturalResponse = `⏱️ BFA Rate Limit Triggered [${bfaResult.ruleId}]: ${bfaResult.error}`;
    } else {
      naturalResponse = `❌ BFA Validation Error: ${bfaResult.error}`;
    }

    return {
      userPrompt: trimmedPrompt,
      thoughtProcess,
      toolSelected: toolName,
      extractedArgs: args,
      bfaVerdict: bfaResult.verdict,
      policyRule: bfaResult.ruleId,
      executionResult: bfaResult,
      naturalResponse,
      responseMode: 'tool'
    };
  }
}
