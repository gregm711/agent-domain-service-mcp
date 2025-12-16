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
    premium: boolean;
  }>;
  prompt: string;
  generated_at: string;
}

interface AnalyzeResult {
  domain: string;
  scores: {
    memorability: number;
    brandability: number;
    length: number;
    pronunciation: number;
    seo: number;
    overall: number;
  };
  pros: string[];
  cons: string[];
  verdict: string;
}

interface SearchResult {
  count: number;
  filters: {
    category: string | null;
    max_price: number | null;
    min_price: number | null;
    tlds: string[] | null;
    sort: string;
    limit: number;
  };
  domains: Array<{
    domain: string;
    name: string;
    tld: string;
    price: number | null;
    price_formatted: string | null;
    premium: boolean;
    categories: string[];
  }>;
}

interface CategoriesResult {
  total_available_domains: number;
  category_count: number;
  categories: Array<{
    slug: string;
    title: string;
    description: string | null;
    available_domains: number;
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
 * Search for available domains with filters
 */
async function searchDomains(options: {
  category?: string;
  max_price?: number;
  min_price?: number;
  tlds?: string[];
  sort?: string;
  limit?: number;
}): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.max_price) params.set("max_price", options.max_price.toString());
  if (options.min_price) params.set("min_price", options.min_price.toString());
  if (options.tlds && options.tlds.length > 0)
    params.set("tlds", options.tlds.join(","));
  if (options.sort) params.set("sort", options.sort);
  if (options.limit) params.set("limit", options.limit.toString());

  const url = `${BASE_URL}/api/v1/domains/search?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search domains: ${response.statusText}`);
  }

  return response.json() as Promise<SearchResult>;
}

/**
 * List available categories
 */
async function listCategories(): Promise<CategoriesResult> {
  const url = `${BASE_URL}/api/v1/domains/categories`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgentDomainService-MCP/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list categories: ${response.statusText}`);
  }

  return response.json() as Promise<CategoriesResult>;
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
  lines.push("");

  if (result.scores) {
    lines.push("Scores (out of 100):");
    lines.push(`  Memorability:   ${result.scores.memorability}/100`);
    lines.push(`  Brandability:   ${result.scores.brandability}/100`);
    lines.push(`  Length:         ${result.scores.length}/100`);
    lines.push(`  Pronunciation:  ${result.scores.pronunciation}/100`);
    lines.push(`  SEO Potential:  ${result.scores.seo}/100`);
    lines.push(`  Overall:        ${result.scores.overall}/100`);
    lines.push("");

    if (result.pros && result.pros.length > 0) {
      lines.push("Pros:");
      for (const pro of result.pros) {
        lines.push(`  ✓ ${pro}`);
      }
    }

    if (result.cons && result.cons.length > 0) {
      lines.push("");
      lines.push("Cons:");
      for (const con of result.cons) {
        lines.push(`  ✗ ${con}`);
      }
    }

    if (result.verdict) {
      lines.push("");
      lines.push(`Verdict: ${result.verdict}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format search result for display
 */
function formatSearchResult(result: SearchResult): string {
  const lines: string[] = [];

  lines.push(`Found ${result.count} available domains`);

  const filters: string[] = [];
  if (result.filters.category) filters.push(`category: ${result.filters.category}`);
  if (result.filters.max_price) filters.push(`max price: $${result.filters.max_price}`);
  if (result.filters.tlds) filters.push(`TLDs: ${result.filters.tlds.join(", ")}`);

  if (filters.length > 0) {
    lines.push(`Filters: ${filters.join(" | ")}`);
  }
  lines.push("");

  if (result.domains.length === 0) {
    lines.push("No domains found matching your criteria.");
    lines.push("Try adjusting your filters (higher max_price, different category, etc.)");
  } else {
    lines.push("Available Domains:");
    for (const d of result.domains) {
      const price = d.price_formatted || "price unknown";
      const premium = d.premium ? " (premium)" : "";
      lines.push(`  ✓ ${d.domain} - ${price}${premium}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format categories result for display
 */
function formatCategoriesResult(result: CategoriesResult): string {
  const lines: string[] = [];

  lines.push(`${result.total_available_domains} available domains across ${result.category_count} categories`);
  lines.push("");
  lines.push("Categories (sorted by domain count):");

  for (const cat of result.categories) {
    lines.push(`  • ${cat.title} (${cat.slug}): ${cat.available_domains} domains`);
    if (cat.description) {
      lines.push(`    ${cat.description}`);
    }
  }

  lines.push("");
  lines.push("Use search_domains with a category slug to find domains in that category.");

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
      {
        name: "search_domains",
        description:
          "Search for available domains with filters. Find domains by category (e.g., 'ai-agents', 'startup-names'), price range, or TLD. Perfect for finding affordable domains within a budget. Use list_categories first to see available categories.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Filter by category slug (e.g., 'ai-agents', 'startup-names', 'ecommerce'). Use list_categories to see all available categories.",
            },
            max_price: {
              type: "number",
              description:
                "Maximum price in USD (e.g., 15 for domains under $15). Great for finding budget-friendly domains.",
            },
            min_price: {
              type: "number",
              description: "Minimum price in USD (optional)",
            },
            tlds: {
              type: "array",
              items: { type: "string" },
              description:
                "Filter by specific TLDs (e.g., ['com', 'io', 'dev'])",
            },
            sort: {
              type: "string",
              enum: ["price_asc", "price_desc", "newest"],
              description:
                "Sort order: 'price_asc' (cheapest first), 'price_desc' (most expensive first), 'newest' (most recently checked)",
            },
            limit: {
              type: "number",
              description: "Number of results to return (default: 20, max: 100)",
            },
          },
        },
      },
      {
        name: "list_categories",
        description:
          "List all available domain categories with their domain counts. Use this to discover what categories are available before searching. Categories include things like AI agents, startups, e-commerce, developer tools, etc.",
        inputSchema: {
          type: "object",
          properties: {},
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

      case "search_domains": {
        const searchArgs = args as {
          category?: string;
          max_price?: number;
          min_price?: number;
          tlds?: string[];
          sort?: string;
          limit?: number;
        };
        const result = await searchDomains(searchArgs);
        return {
          content: [
            {
              type: "text",
              text: formatSearchResult(result),
            },
          ],
        };
      }

      case "list_categories": {
        const result = await listCategories();
        return {
          content: [
            {
              type: "text",
              text: formatCategoriesResult(result),
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
