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

interface BrainstormResult {
  suggestions: Array<{
    name: string;
    domain: string;
    tld: string;
    available: boolean;
    purchase_price: number | null;
    renewal_price: number | null;
    premium: boolean;
  }>;
  prompt: string;
  generated_at: string;
}

interface AnalyzeResult {
  domain: string;
  available: boolean;
  status: string;
  purchase_price: number | null;
  analysis: {
    scores: {
      memorability: number;
      brandability: number;
      pronunciation: number;
      seo_potential: number;
      overall: number;
    };
    pros: string[];
    cons: string[];
    verdict: string;
  };
  analyzed_at: string;
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
 * Brainstorm domain names based on a description
 */
async function brainstormDomains(
  prompt: string,
  count: number = 10
): Promise<BrainstormResult> {
  const url = `${BASE_URL}/api/v1/brainstorm`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ prompt, count }),
  });

  if (!response.ok) {
    throw new Error(`Failed to brainstorm: ${response.statusText}`);
  }

  return response.json() as Promise<BrainstormResult>;
}

/**
 * Analyze a domain name with AI scoring
 */
async function analyzeDomain(domain: string): Promise<AnalyzeResult> {
  const url = `${BASE_URL}/api/v1/analyze-domain`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ domain }),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze domain: ${response.statusText}`);
  }

  return response.json() as Promise<AnalyzeResult>;
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

/**
 * Format brainstorm result for display
 */
function formatBrainstormResult(result: BrainstormResult): string {
  const lines: string[] = [];

  lines.push(`Brainstorm Results for: "${result.prompt}"`);
  lines.push("");

  const available = result.suggestions.filter((s) => s.available);
  const taken = result.suggestions.filter((s) => !s.available);

  if (available.length > 0) {
    lines.push(`✓ Available Domains (${available.length}):`);
    for (const s of available) {
      const price = s.purchase_price ? ` - $${s.purchase_price}` : "";
      const premium = s.premium ? " (premium)" : "";
      lines.push(`  • ${s.domain}${price}${premium}`);
    }
  }

  if (taken.length > 0) {
    lines.push("");
    lines.push(`✗ Already Taken (${taken.length}):`);
    for (const s of taken) {
      lines.push(`  • ${s.domain}`);
    }
  }

  if (available.length === 0) {
    lines.push("");
    lines.push("No available domains found. Try a different description or be more specific.");
  }

  return lines.join("\n");
}

/**
 * Format analyze result for display
 */
function formatAnalyzeResult(result: AnalyzeResult): string {
  const lines: string[] = [];

  lines.push(`Domain Analysis: ${result.domain}`);
  lines.push(`Status: ${result.available ? "✓ Available" : "✗ Taken"}`);
  if (result.available && result.purchase_price) {
    lines.push(`Price: $${result.purchase_price}`);
  }
  lines.push("");

  if (result.analysis) {
    lines.push("Scores (out of 10):");
    lines.push(`  Memorability:   ${result.analysis.scores.memorability}/10`);
    lines.push(`  Brandability:   ${result.analysis.scores.brandability}/10`);
    lines.push(`  Pronunciation:  ${result.analysis.scores.pronunciation}/10`);
    lines.push(`  SEO Potential:  ${result.analysis.scores.seo_potential}/10`);
    lines.push(`  Overall:        ${result.analysis.scores.overall}/10`);
    lines.push("");

    if (result.analysis.pros.length > 0) {
      lines.push("Pros:");
      for (const pro of result.analysis.pros) {
        lines.push(`  ✓ ${pro}`);
      }
    }

    if (result.analysis.cons.length > 0) {
      lines.push("");
      lines.push("Cons:");
      for (const con of result.analysis.cons) {
        lines.push(`  ✗ ${con}`);
      }
    }

    lines.push("");
    lines.push(`Verdict: ${result.analysis.verdict}`);
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
      {
        name: "brainstorm_domains",
        description:
          "Generate creative domain name ideas based on a description of your project, business, or idea. Uses AI to suggest available domain names that match your concept. Returns only domains that are actually available for registration with real pricing. Perfect for finding the right domain for a new startup, app, or project.",
        inputSchema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "A description of your project, business, or idea (e.g., 'AI-powered recipe app for busy parents', 'sustainable fashion marketplace', 'developer tools for API testing')",
            },
            count: {
              type: "number",
              description:
                "Number of suggestions to generate (default: 10, max: 20)",
            },
          },
          required: ["description"],
        },
      },
      {
        name: "analyze_domain",
        description:
          "Get an AI-powered analysis of a domain name. Scores the domain on memorability, brandability, pronunciation ease, and SEO potential. Lists pros, cons, and provides an overall verdict. Useful for evaluating domain name options before purchasing.",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description:
                "The domain to analyze (e.g., 'coolstartup.com', 'myapp.io')",
            },
          },
          required: ["domain"],
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

      case "brainstorm_domains": {
        const { description, count } = args as {
          description: string;
          count?: number;
        };
        if (!description) {
          throw new Error("Description is required");
        }
        const result = await brainstormDomains(
          description,
          Math.min(count || 10, 20)
        );
        return {
          content: [
            {
              type: "text",
              text: formatBrainstormResult(result),
            },
          ],
        };
      }

      case "analyze_domain": {
        const domainArg = (args as { domain: string }).domain;
        if (!domainArg) {
          throw new Error("Domain is required");
        }
        const result = await analyzeDomain(domainArg);
        return {
          content: [
            {
              type: "text",
              text: formatAnalyzeResult(result),
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
