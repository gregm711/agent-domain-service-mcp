#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://agentdomainservice.com";

interface DomainCheckResult {
  domain: string;
  available: boolean;
  status: "available" | "registered" | "unknown";
  checked_at: string;
  expires_at: string | null;
  source: string;
  purchase_price: number | null;
  renewal_price: number | null;
  premium: boolean;
  cache: {
    hit: boolean;
    ttl_seconds: number;
    stale: boolean;
  };
  suggestions?: Array<{
    domain: string;
    available: boolean;
    purchase_price: number | null;
    renewal_price: number | null;
    premium: boolean;
  }>;
}

interface ExploreResult {
  name: string;
  checked_at: string;
  summary: string;
  available_count: number;
  taken_count: number;
  tlds_checked: string[];
  results: Array<{
    tld: string;
    domain: string;
    available: boolean;
    status: "available" | "registered" | "unknown";
    purchase_price: number | null;
    renewal_price: number | null;
    premium: boolean;
  }>;
}

/**
 * Check a single domain's availability
 */
async function checkDomain(domain: string): Promise<DomainCheckResult> {
  const url = `${BASE_URL}/api/v1/lookup/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check domain: ${response.statusText}`);
  }

  return response.json() as Promise<DomainCheckResult>;
}

/**
 * Explore a name across multiple TLDs
 */
async function exploreName(name: string): Promise<ExploreResult> {
  const url = `${BASE_URL}/api/v1/explore/${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to explore name: ${response.statusText}`);
  }

  return response.json() as Promise<ExploreResult>;
}

/**
 * Format domain check result for display
 */
function formatDomainResult(result: DomainCheckResult): string {
  const lines: string[] = [];

  lines.push(`Domain: ${result.domain}`);
  lines.push(`Status: ${result.status.toUpperCase()}`);
  lines.push(`Available: ${result.available ? "Yes" : "No"}`);

  if (result.available && result.purchase_price) {
    lines.push(`Purchase Price: $${result.purchase_price}`);
    if (result.renewal_price) {
      lines.push(`Renewal Price: $${result.renewal_price}/year`);
    }
    if (result.premium) {
      lines.push(`Note: This is a PREMIUM domain`);
    }
  }

  if (result.suggestions && result.suggestions.length > 0) {
    lines.push("");
    lines.push("Available Alternatives:");
    for (const s of result.suggestions.slice(0, 5)) {
      const price = s.purchase_price ? ` - $${s.purchase_price}` : "";
      const premium = s.premium ? " (premium)" : "";
      lines.push(`  • ${s.domain}${price}${premium}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format explore result for display
 */
function formatExploreResult(result: ExploreResult): string {
  const lines: string[] = [];

  lines.push(`Name: ${result.name}`);
  lines.push(`Summary: ${result.summary}`);
  lines.push(`Available: ${result.available_count} | Taken: ${result.taken_count}`);
  lines.push("");
  lines.push("Results by TLD:");

  for (const r of result.results) {
    const status = r.available ? "✓ Available" : "✗ Taken";
    const price = r.available && r.purchase_price ? ` - $${r.purchase_price}` : "";
    const premium = r.premium ? " (premium)" : "";
    lines.push(`  ${r.domain}: ${status}${price}${premium}`);
  }

  return lines.join("\n");
}

// Create the MCP server
const server = new Server(
  {
    name: "agent-domain-service",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "check_domain",
        description:
          "Check if a specific domain is available for registration. Returns availability status, pricing, and alternative suggestions if the domain is taken. Powered by AgentDomainService.com - no CAPTCHAs or API keys required.",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description:
                "The full domain to check (e.g., 'example.com', 'myapp.io')",
            },
          },
          required: ["domain"],
        },
      },
      {
        name: "explore_name",
        description:
          "Explore a name across multiple TLDs (.com, .io, .ai, .co, .dev, .app, .net, .xyz, .org) to see which variations are available. Great for brainstorming domain names for a new project. Powered by AgentDomainService.com.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "The base name to explore (without TLD, e.g., 'myawesomeapp')",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "check_domain": {
        const domain = (args as { domain: string }).domain;
        if (!domain) {
          throw new Error("Domain is required");
        }
        const result = await checkDomain(domain);
        return {
          content: [
            {
              type: "text",
              text: formatDomainResult(result),
            },
          ],
        };
      }

      case "explore_name": {
        const nameArg = (args as { name: string }).name;
        if (!nameArg) {
          throw new Error("Name is required");
        }
        const result = await exploreName(nameArg);
        return {
          content: [
            {
              type: "text",
              text: formatExploreResult(result),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentDomainService MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
