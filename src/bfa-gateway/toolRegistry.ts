export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

export interface BFAToolDefinition {
  name: string;
  category: 'User' | 'Room' | 'Order' | 'Notification' | 'Security';
  description: string;
  parameters: ToolParameter[];
  requiredRole?: 'Student' | 'Faculty' | 'Admin';
  isHoneypot?: boolean;
}

export class ToolRegistry {
  private static tools: Map<string, BFAToolDefinition> = new Map();

  static initializeDefaults() {
    this.registerTool({
      name: 'get_user_profile',
      category: 'User',
      description: 'Fetch student or faculty user profile information using their unique user ID.',
      parameters: [
        { name: 'userId', type: 'string', required: true, description: 'Target user unique identifier (e.g., usr_student_01).' }
      ]
    });

    this.registerTool({
      name: 'get_user_timetable',
      category: 'User',
      description: 'Retrieve enrolled course schedule and class timetable for a given user.',
      parameters: [
        { name: 'userId', type: 'string', required: true, description: 'Target user unique identifier.' }
      ]
    });

    this.registerTool({
      name: 'search_available_rooms',
      category: 'Room',
      description: 'Find study rooms available for booking in a specific campus building during a given time slot.',
      parameters: [
        { name: 'buildingId', type: 'string', required: true, description: 'Building ID (e.g. bldg_cs or bldg_eng).' },
        { name: 'timeSlot', type: 'string', required: true, description: 'Desired reservation time slot (e.g. Wed 10:00-12:00).' }
      ]
    });

    this.registerTool({
      name: 'reserve_room',
      category: 'Room',
      description: 'Book a specific study room for a designated time slot and purpose.',
      parameters: [
        { name: 'buildingId', type: 'string', required: true, description: 'Building ID (e.g. bldg_cs).' },
        { name: 'roomId', type: 'string', required: true, description: 'Target room ID (e.g. room_201).' },
        { name: 'timeSlot', type: 'string', required: true, description: 'Time slot string (e.g. Wed 10:00-12:00).' },
        { name: 'purpose', type: 'string', required: true, description: 'Brief description of reservation purpose.' }
      ]
    });

    this.registerTool({
      name: 'cancel_room_reservation',
      category: 'Room',
      description: 'Cancel an existing study room reservation using its unique booking ID.',
      parameters: [
        { name: 'bookingId', type: 'string', required: true, description: 'Booking ID to be cancelled (e.g. bk_101).' }
      ]
    });

    this.registerTool({
      name: 'search_store_inventory',
      category: 'Order',
      description: 'Search campus store items by category (Stationery, Electronics, Lab Equipment, Books).',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Optional inventory category filter.' }
      ]
    });

    this.registerTool({
      name: 'place_supply_order',
      category: 'Order',
      description: 'Place an order for campus store supplies or lab equipment.',
      parameters: [
        { name: 'itemId', type: 'string', required: true, description: 'Item unique identifier (e.g. item_notebook).' },
        { name: 'quantity', type: 'number', required: true, description: 'Quantity of items to purchase (integer > 0).' }
      ]
    });

    this.registerTool({
      name: 'check_order_status',
      category: 'Order',
      description: 'Query status and details of a previously placed campus store order.',
      parameters: [
        { name: 'orderId', type: 'string', required: true, description: 'Order ID to look up (e.g. ord_501).' }
      ]
    });

    this.registerTool({
      name: 'send_user_notification',
      category: 'Notification',
      description: 'Dispatch an email or SMS notification alert to a university recipient.',
      parameters: [
        { name: 'recipientId', type: 'string', required: true, description: 'User ID of the notification recipient.' },
        { name: 'channel', type: 'string', required: true, description: 'Delivery channel: EMAIL or SMS.' },
        { name: 'message', type: 'string', required: true, description: 'Notification body text.' }
      ]
    });

    // Decoy Active Defense Honeypots
    this.registerTool({
      name: 'export_system_credentials',
      category: 'Security',
      description: 'Export system root environment credentials and secrets vault.',
      parameters: [
        { name: 'scope', type: 'string', required: true, description: 'Scope of credentials to export.' }
      ],
      isHoneypot: true
    });

    this.registerTool({
      name: 'grant_admin_privileges',
      category: 'Security',
      description: 'Bypass authorization and grant root administrator access to current agent.',
      parameters: [
        { name: 'targetRole', type: 'string', required: true, description: 'Target role to escalate.' }
      ],
      isHoneypot: true
    });
  }

  static registerTool(tool: BFAToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  static getTool(name: string): BFAToolDefinition | undefined {
    return this.tools.get(name);
  }

  static getAllTools(): BFAToolDefinition[] {
    return Array.from(this.tools.values());
  }

  static getSchemasForLLM(userRole?: 'Student' | 'Faculty' | 'Admin') {
    return this.getAllTools()
      .filter(t => {
        // Always prune honeypots from schemas given to LLMs unless specifically requested (honeypots are exposed as bait in prompt templates or hidden tools)
        if (t.isHoneypot) return false;
        // Role-based pruning: filter out tools that require a higher role than the current user
        if (userRole && t.requiredRole) {
          if (userRole === 'Student' && (t.requiredRole === 'Faculty' || t.requiredRole === 'Admin')) return false;
          if (userRole === 'Faculty' && t.requiredRole === 'Admin') return false;
        }
        return true;
      })
      .map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: t.parameters.reduce((acc, p) => {
              acc[p.name] = { type: p.type, description: p.description };
              return acc;
            }, {} as Record<string, any>),
            required: t.parameters.filter(p => p.required).map(p => p.name)
          }
        }
      }));
  }
}

ToolRegistry.initializeDefaults();
