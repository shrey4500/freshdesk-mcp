#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

interface CreateTicketArgs {
  freshdesk_domain: string;
  freshdesk_api_key: string;
  subject: string;
  description: string;
  email: string;
  priority?: number;
  status?: number;
  source?: number;
}

const server = new Server(
  {
    name: "freshdesk-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("ListTools request received");
  return {
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
              enum: [1, 2, 3, 4],
            },
            status: {
              type: "number",
              description: "Status: 2-Open, 3-Pending, 4-Resolved, 5-Closed",
              enum: [2, 3, 4, 5],
            },
            source: {
              type: "number",
              description: "Source: 1-Email, 2-Portal, 3-Phone, 7-Chat",
              enum: [1, 2, 3, 7],
            },
          },
          required: ["freshdesk_domain", "freshdesk_api_key", "subject", "description", "email"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("CallTool request received:", request.params.name);
  
  if (request.params.name === "create_ticket") {
    const args = request.params.arguments as any as CreateTicketArgs;
    console.error("Creating ticket with domain:", args.freshdesk_domain);

    try {
      const response = await axios.post(
        `https://${args.freshdesk_domain}/api/v2/tickets`,
        {
          subject: args.subject,
          description: args.description,
          email: args.email,
          priority: args.priority || 1,
          status: args.status || 2,
          source: args.source || 2,
        },
        {
          auth: {
            username: args.freshdesk_api_key,
            password: "X",
          },
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.error("Ticket created successfully, ID:", response.data.id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error creating ticket:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error creating ticket: ${error.response?.data?.description || error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  console.error("=== MCP Server Starting ===");
  console.error("Node version:", process.version);
  console.error("Platform:", process.platform);
  console.error("CWD:", process.cwd());
  console.error("Stdin is TTY:", process.stdin.isTTY);
  console.error("Stdout is TTY:", process.stdout.isTTY);
  console.error("Environment:", process.env.NODE_ENV || "not set");
  
  // Keep process alive
  console.error("Setting up keep-alive interval...");
  setInterval(() => {
    console.error(`[${new Date().toISOString()}] Server still running...`);
  }, 30000);
  
  console.error("Creating StdioServerTransport...");
  const transport = new StdioServerTransport();
  
  console.error("Connecting server to transport...");
  await server.connect(transport);
  
  console.error("=== Freshdesk MCP Server running on stdio ===");
  console.error("Waiting for connections...");
  
  // Prevent exit
  process.stdin.resume();
  
  // Log any data received
  process.stdin.on('data', (data) => {
    console.error("Received stdin data:", data.toString());
  });
  
  process.stdin.on('end', () => {
    console.error("Stdin ended");
  });
}

main().catch((error) => {
  console.error("=== Server error ===");
  console.error("Error name:", error.name);
  console.error("Error message:", error.message);
  console.error("Error stack:", error.stack);
  process.exit(1);
});
