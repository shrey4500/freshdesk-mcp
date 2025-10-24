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
  if (request.params.name === "create_ticket") {
    const args = request.params.arguments as any as CreateTicketArgs;

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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Freshdesk MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});