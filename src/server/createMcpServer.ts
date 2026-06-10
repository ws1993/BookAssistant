import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createDisabledToolError, getToolByName, listToolDefinitions } from "./toolRegistry.js";
import { errorContent } from "./toolResponse.js";

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "book-assistant-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolDefinitions()
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};

    try {
      const tool = getToolByName(request.params.name);

      if (!tool) {
        throw createDisabledToolError(request.params.name);
      }

      return await tool.handle(args);
    } catch (error) {
      return errorContent(error);
    }
  });

  return server;
}
