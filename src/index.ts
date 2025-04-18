import { FastMCP } from "fastmcp";
import { createTools } from "./tools";

// Initialize server
const server = new FastMCP({
  name: "flow-mcp",
  version: "0.1.0",
});

// Register all tools
const tools = createTools();
for (const tool of tools) {
  server.addTool({
    name: tool.name,
    description: tool.description,
    parameters: tool.zodSchema,
    execute: async (args, context) => {
      const result = await tool.handler(args);
      if (typeof result.content[0].text === "string") {
        return result.content[0].text;
      }
      return JSON.stringify(result.content[0].text);
    },
  });
}

// Get command line arguments
const args = process.argv.slice(2);
const useSSE = args.includes("--sse");

// Start server with appropriate transport
if (useSSE) {
  server.start({
    transportType: "sse",
    sse: {
      endpoint: "/sse",
      port: 8080,
    },
  });
} else {
  server.start({
    transportType: "stdio",
  });
}

export default server;
