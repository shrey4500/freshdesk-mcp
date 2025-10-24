import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'freshdesk-mcp-server',
    version: '1.0.0',
    endpoints: {
      mcp: '/mcp',
      tools: '/tools'
    }
  });
});

app.get('/tools', (req, res) => {
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
    console.log('MCP Request:', request.method);

    if (request.method === 'tools/list') {
      res.json({
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
                  freshdesk_domain: { type: "string" },
                  freshdesk_api_key: { type: "string" },
                  subject: { type: "string" },
                  description: { type: "string" },
                  email: { type: "string" },
                  priority: { type: "number" },
                  status: { type: "number" },
                },
                required: ["freshdesk_domain", "freshdesk_api_key", "subject", "description", "email"],
              },
            },
          ],
        },
      });
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;

      if (name === 'create_ticket') {
        const response = await fetch(
          `https://${args.freshdesk_domain}/api/v2/tickets`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(args.freshdesk_api_key + ':X').toString('base64')}`,
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

        const data = await response.json();
        
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          },
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: error.message,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Freshdesk MCP Server running on port ${PORT}`);
  console.log(`📡 MCP Endpoint: http://localhost:${PORT}/mcp`);
});
