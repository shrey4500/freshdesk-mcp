import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware - BEFORE body parsing
app.use((req, res, next) => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log(`║  📥 ${req.method} ${req.path}`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  next();
});

app.use(express.json());

// Log parsed body
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - sending 200');
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  console.log('✅ Health check endpoint hit');
  res.json({ 
    status: 'ok', 
    service: 'freshdesk-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      mcp: '/mcp',
      tools: '/tools'
    }
  });
});

const TOOLS_DEFINITION = [
  {
    name: "get_groups",
    description: "Get all groups in the Freshdesk account. Use this to find the group_id before creating or assigning tickets.",
    inputSchema: {
      type: "object",
      properties: {
        freshdesk_domain: {
          type: "string",
          description: "Your Freshdesk domain (e.g., yourcompany.freshdesk.com)",
        },
        freshdesk_api_key: {
          type: "string",
          description: "Your Freshdesk API key",
        },
      },
      required: ["freshdesk_domain", "freshdesk_api_key"],
    },
  },
  {
    name: "get_ticket",
    description: "Get detailed information about a specific Freshdesk ticket by ticket ID.",
    inputSchema: {
      type: "object",
      properties: {
        freshdesk_domain: {
          type: "string",
          description: "Your Freshdesk domain (e.g., yourcompany.freshdesk.com)",
        },
        freshdesk_api_key: {
          type: "string",
          description: "Your Freshdesk API key",
        },
        ticket_id: {
          type: "number",
          description: "The ID of the ticket to retrieve",
        },
      },
      required: ["freshdesk_domain", "freshdesk_api_key", "ticket_id"],
    },
  },
  {
    name: "get_agent",
    description: "Get detailed information about a specific Freshdesk agent by agent ID.",
    inputSchema: {
      type: "object",
      properties: {
        freshdesk_domain: {
          type: "string",
          description: "Your Freshdesk domain (e.g., yourcompany.freshdesk.com)",
        },
        freshdesk_api_key: {
          type: "string",
          description: "Your Freshdesk API key",
        },
        agent_id: {
          type: "number",
          description: "The ID of the agent to retrieve",
        },
      },
      required: ["freshdesk_domain", "freshdesk_api_key", "agent_id"],
    },
  },
  {
    name: "create_ticket",
    description: "Creates a new ticket in Freshdesk. Optionally assign to a group during creation.",
    inputSchema: {
      type: "object",
      properties: {
        freshdesk_domain: {
          type: "string",
          description: "Your Freshdesk domain (e.g., yourcompany.freshdesk.com)",
        },
        freshdesk_api_key: {
          type: "string",
          description: "Your Freshdesk API key",
        },
        subject: {
          type: "string",
          description: "Subject of the ticket",
        },
        description: {
          type: "string",
          description: "Description/content of the ticket",
        },
        email: {
          type: "string",
          description: "Email of the requester",
        },
        priority: {
          type: "number",
          description: "Priority: 1-Low, 2-Medium, 3-High, 4-Urgent",
        },
        status: {
          type: "number",
          description: "Status: 2-Open, 3-Pending, 4-Resolved, 5-Closed",
        },
        group_id: {
          type: "number",
          description: "Group ID to assign the ticket to. Use get_groups to find the group_id first.",
        },
        responder_id: {
          type: "number",
          description: "Agent ID to assign the ticket to (optional)",
        },
      },
      required: ["freshdesk_domain", "freshdesk_api_key", "subject", "description", "email"],
    },
  },
  {
    name: "assign_ticket",
    description: "Assign an existing Freshdesk ticket to an agent or group",
    inputSchema: {
      type: "object",
      properties: {
        freshdesk_domain: {
          type: "string",
          description: "Your Freshdesk domain (e.g., yourcompany.freshdesk.com)",
        },
        freshdesk_api_key: {
          type: "string",
          description: "Your Freshdesk API key",
        },
        ticket_id: {
          type: "number",
          description: "The ID of the ticket to assign",
        },
        responder_id: {
          type: "number",
          description: "The agent ID to assign the ticket to (optional if group_id is provided)",
        },
        group_id: {
          type: "number",
          description: "The group ID to assign the ticket to (optional if responder_id is provided)",
        },
      },
      required: ["freshdesk_domain", "freshdesk_api_key", "ticket_id"],
    },
  },
];

app.get('/tools', (req, res) => {
  console.log('✅ Tools list endpoint hit');
  res.json({ tools: TOOLS_DEFINITION });
});

app.post('/mcp', async (req, res) => {
  try {
    const request = req.body;
    console.log('═══════════════════════════════════════════');
    console.log('🔵 MCP Request Received');
    console.log('Method:', request?.method);
    console.log('ID:', request?.id);
    console.log('Full Request:', JSON.stringify(request, null, 2));
    console.log('═══════════════════════════════════════════');

    if (!request || !request.method) {
      console.log('❌ Invalid request - missing method');
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request - method is required'
        }
      });
    }

    // Handle initialize handshake
    if (request.method === 'initialize') {
      console.log('🤝 Initialize handshake received');
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'freshdesk-mcp-server',
            version: '1.0.0',
          },
        },
      };
      console.log('✅ Sending initialize response');
      return res.json(response);
    }

    // Handle notifications/initialized
    if (request.method === 'notifications/initialized') {
      console.log('✅ Initialized notification received');
      return res.status(200).end();
    }

    if (request.method === 'tools/list') {
      console.log('📋 Returning tools list');
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: TOOLS_DEFINITION,
        },
      };
      console.log('✅ Sending tools list response');
      return res.json(response);
      
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params || {};
      console.log('🔧 Tool call:', name);
      console.log('Arguments:', JSON.stringify(args, null, 2));

      const apiKey = args?.freshdesk_api_key;
      const domain = args?.freshdesk_domain;
      const authString = Buffer.from(apiKey + ':X').toString('base64');

      if (name === 'get_groups') {
        console.log('👥 Fetching Freshdesk groups...');
        console.log('Domain:', domain);
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${domain}/api/v2/groups`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Freshdesk API Status:', response.status);
        const data = await response.json();
        console.log('Freshdesk Response:', JSON.stringify(data, null, 2));
        
        const result = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        };
        
        console.log('✅ Sending success response');
        return res.json(result);

      } else if (name === 'get_ticket') {
        console.log('🎫 Fetching Freshdesk ticket...');
        console.log('Domain:', domain);
        console.log('Ticket ID:', args?.ticket_id);
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${domain}/api/v2/tickets/${args.ticket_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Freshdesk API Status:', response.status);
        const data = await response.json();
        console.log('Freshdesk Response:', JSON.stringify(data, null, 2));
        
        const result = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        };
        
        console.log('✅ Sending success response');
        return res.json(result);

      } else if (name === 'get_agent') {
        console.log('👤 Fetching Freshdesk agent...');
        console.log('Domain:', domain);
        console.log('Agent ID:', args?.agent_id);
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${domain}/api/v2/agents/${args.agent_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Freshdesk API Status:', response.status);
        const data = await response.json();
        console.log('Freshdesk Response:', JSON.stringify(data, null, 2));
        
        const result = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        };
        
        console.log('✅ Sending success response');
        return res.json(result);

      } else if (name === 'create_ticket') {
        console.log('📞 Creating Freshdesk ticket...');
        console.log('Domain:', domain);
        console.log('Email:', args?.email);
        console.log('Group ID:', args?.group_id);
        
        const payload: any = {
          subject: args.subject,
          description: args.description,
          email: args.email,
          priority: args.priority || 1,
          status: args.status || 2,
        };
        
        if (args.group_id) payload.group_id = args.group_id;
        if (args.responder_id) payload.responder_id = args.responder_id;
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${domain}/api/v2/tickets`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        console.log('Freshdesk API Status:', response.status);
        const data = await response.json();
        console.log('Freshdesk Response:', JSON.stringify(data, null, 2));
        
        const result = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        };
        
        console.log('✅ Sending success response');
        return res.json(result);
        
      } else if (name === 'assign_ticket') {
        console.log('👤 Assigning Freshdesk ticket...');
        console.log('Domain:', domain);
        console.log('Ticket ID:', args?.ticket_id);
        console.log('Responder ID:', args?.responder_id);
        console.log('Group ID:', args?.group_id);
        
        const updatePayload: any = {};
        if (args.responder_id) updatePayload.responder_id = args.responder_id;
        if (args.group_id) updatePayload.group_id = args.group_id;
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${domain}/api/v2/tickets/${args.ticket_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          }
        );

        console.log('Freshdesk API Status:', response.status);
        const data = await response.json();
        console.log('Freshdesk Response:', JSON.stringify(data, null, 2));
        
        const result = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        };
        
        console.log('✅ Sending success response');
        return res.json(result);
        
      } else {
        console.log('❌ Unknown tool:', name);
        return res.status(400).json({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${name}`
          }
        });
      }
    } else {
      console.log('❌ Unknown method:', request.method);
      return res.status(400).json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`
        }
      });
    }
  } catch (error: any) {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║            ❌ ERROR ❌                    ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.error('Error Type:', error?.constructor?.name);
    console.error('Error Message:', error?.message);
    console.error('Stack:', error?.stack);
    
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: error?.message || 'Internal error',
        data: error?.stack
      },
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.path);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    availableEndpoints: ['/', '/tools', '/mcp']
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   🚀 FRESHDESK MCP SERVER STARTED        ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`   📡 Port: ${PORT}`);
  console.log(`   🔗 MCP Endpoint: /mcp`);
  console.log(`   💚 Health: /`);
  console.log(`   🔧 Tools: /tools`);
  console.log(`   📊 Total Tools: 5`);
  console.log('   🔹 get_groups - Fetch all groups');
  console.log('   🔹 get_ticket - Get ticket details');
  console.log('   🔹 get_agent - Get agent details');
  console.log('   🔹 create_ticket - Create ticket');
  console.log('   🔹 assign_ticket - Assign existing ticket');
  console.log('═══════════════════════════════════════════');
  console.log('');
});
