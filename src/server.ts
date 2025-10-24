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

app.get('/tools', (req, res) => {
  console.log('✅ Tools list endpoint hit');
  res.json({
    tools: [
      {
        name: "create_ticket",
        description: "Creates a new ticket in Freshdesk",
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
          },
          required: ["freshdesk_domain", "freshdesk_api_key", "subject", "description", "email"],
        },
      },
    ],
  });
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

    if (request.method === 'tools/list') {
      console.log('📋 Returning tools list');
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: "create_ticket",
              description: "Creates a new ticket in Freshdesk",
              inputSchema: {
                type: "object",
                properties: {
                  freshdesk_domain: { type: "string", description: "Your Freshdesk domain" },
                  freshdesk_api_key: { type: "string", description: "Your Freshdesk API key" },
                  subject: { type: "string", description: "Subject of the ticket" },
                  description: { type: "string", description: "Description/content" },
                  email: { type: "string", description: "Email of the requester" },
                  priority: { type: "number", description: "Priority: 1-4" },
                  status: { type: "number", description: "Status: 2-5" },
                },
                required: ["freshdesk_domain", "freshdesk_api_key", "subject", "description", "email"],
              },
            },
          ],
        },
      };
      console.log('✅ Sending tools list response');
      return res.json(response);
      
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params || {};
      console.log('🔧 Tool call:', name);
      console.log('Arguments:', JSON.stringify(args, null, 2));

      if (name === 'create_ticket') {
        console.log('📞 Creating Freshdesk ticket...');
        console.log('Domain:', args?.freshdesk_domain);
        console.log('Email:', args?.email);
        
        const apiKey = args?.freshdesk_api_key;
        const authString = Buffer.from(apiKey + ':X').toString('base64');
        
        console.log('Making API call to Freshdesk...');
        const response = await fetch(
          `https://${args.freshdesk_domain}/api/v2/tickets`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: args.subject,
              description: args.description,
              email: args.email,
              priority: args.priority || 1,
              status: args.status || 2,
            }),
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
  console.log('═══════════════════════════════════════════');
  console.log('');
});
