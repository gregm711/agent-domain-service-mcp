# AgentDomainService MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that enables AI assistants like Claude to check domain availability in real-time. Powered by [AgentDomainService.com](https://agentdomainservice.com).

## Why This Exists

**The Problem:** AI assistants can't help you check if a domain is available. Traditional registrars like GoDaddy and Namecheap block automated access with CAPTCHAs and bot detection.

**The Solution:** [AgentDomainService](https://agentdomainservice.com) provides a simple API that AI can use. This MCP server wraps that API so Claude and other MCP-compatible assistants can check domains directly.

## Features

- **AI Brainstorming** - Describe your project and get creative domain suggestions that are actually available
- **Domain Analysis** - AI-powered scoring for memorability, brandability, and SEO potential
- **Check any domain** - Verify if `yourproject.com`, `startup.io`, or `brand.ai` is available
- **Explore names across TLDs** - See availability for `.com`, `.io`, `.ai`, `.co`, `.dev`, `.app`, `.net`, `.xyz`, `.org` at once
- **Real pricing** - See actual purchase and renewal prices from Name.com (not just WHOIS/DNS checks)
- **No API keys required** - Just install and use
- **No CAPTCHAs** - [AgentDomainService](https://agentdomainservice.com) handles all the complexity

## Installation

### For Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "domain-availability": {
      "command": "npx",
      "args": ["-y", "agent-domain-service-mcp"]
    }
  }
}
```

Then restart Claude Desktop.

### Manual Installation

```bash
npm install -g agent-domain-service-mcp
```

## Available Tools

### `check_domain`

Check if a specific domain is available for registration.

**Example prompts:**
- "Is example.com available?"
- "Check if myawesomestartup.io is taken"
- "What's the price for coolproject.ai?"

**Returns:**
- Availability status (available/registered/unknown)
- Purchase price in USD
- Renewal price per year
- Whether it's a premium domain
- Alternative suggestions if the domain is taken

### `explore_name`

Explore a name across multiple TLDs to find available options.

**Example prompts:**
- "What TLDs are available for 'acmewidgets'?"
- "Explore domain options for 'nextstartup'"
- "Which extensions can I get for 'brandname'?"

**Returns:**
- Availability across 9 popular TLDs
- Pricing for each available option
- Summary of available vs taken

### `brainstorm_domains`

Generate creative domain name ideas based on a description of your project. **This is what makes this MCP different** - it uses AI to suggest names AND verifies they're actually available with real pricing.

**Example prompts:**
- "I need a domain for an AI-powered recipe app for busy parents"
- "Brainstorm domain names for a sustainable fashion marketplace"
- "Find me available domains for a developer tools startup focused on API testing"

**Returns:**
- 10+ creative domain suggestions
- Only domains that are actually available
- Real purchase prices from Name.com
- Premium domain indicators

### `analyze_domain`

Get an AI-powered analysis of any domain name to help you decide if it's a good choice.

**Example prompts:**
- "Analyze coolstartup.com - is it a good domain?"
- "What do you think of neuralflow.ai as a domain name?"
- "Score brandify.io for brandability and memorability"

**Returns:**
- Scores (0-10) for: Memorability, Brandability, Pronunciation, SEO Potential
- List of pros and cons
- Overall verdict and recommendation
- Availability status and pricing

## Example Usage

Once installed, you can ask Claude:

> "I'm building an app that helps remote teams do async standups. Can you brainstorm some domain names?"

Claude will use the `brainstorm_domains` tool to generate creative suggestions like `asynchuddle.com`, `standupflow.io`, etc. - all verified as available with real pricing.

> "I'm starting a new AI company called 'NeuralFlow'. Can you check which domain options are available?"

Claude will use the `explore_name` tool to check `neuralflow.com`, `neuralflow.io`, `neuralflow.ai`, etc. and show you which are available with pricing.

> "What do you think of 'quickpulse.ai' as a domain? Is it any good?"

Claude will use `analyze_domain` to score it on memorability, brandability, and SEO potential, then give you pros/cons and a verdict.

## How It Works

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────────────────┐
│   Claude    │─────▶│   MCP Server    │─────▶│  AgentDomainService.com │
│  Desktop    │◀─────│  (this package) │◀─────│      (Name.com API)     │
└─────────────┘      └─────────────────┘      └─────────────────────────┘
```

1. You ask Claude about a domain
2. Claude calls this MCP server
3. The server queries [AgentDomainService.com](https://agentdomainservice.com)
4. Results are returned to Claude
5. Claude presents the information to you

## API Endpoints Used

This MCP server uses the [AgentDomainService API](https://agentdomainservice.com/docs/domain-availability-api):

- `GET /api/v1/lookup/{domain}` - Check a single domain
- `GET /api/v1/explore/{name}` - Explore a name across TLDs
- `POST /api/v1/brainstorm` - AI-powered domain name generation
- `POST /api/v1/analyze-domain` - AI-powered domain analysis

Full API documentation: [agentdomainservice.com/docs/domain-availability-api](https://agentdomainservice.com/docs/domain-availability-api)

## Related Resources

- **Main Website:** [agentdomainservice.com](https://agentdomainservice.com)
- **API Documentation:** [agentdomainservice.com/docs/domain-availability-api](https://agentdomainservice.com/docs/domain-availability-api)
- **LLM Instructions:** [agentdomainservice.com/llms.txt](https://agentdomainservice.com/llms.txt)
- **OpenAPI Spec:** [agentdomainservice.com/openapi.json](https://agentdomainservice.com/openapi.json)
- **Blog:** [agentdomainservice.com/blog](https://agentdomainservice.com/blog)

## Use Cases

- **Startup founders** brainstorming names for their next venture
- **Developers** automating domain availability checks
- **Brand managers** monitoring domain availability
- **Domain investors** researching opportunities
- **Anyone** who wants to check domains without CAPTCHAs

## Troubleshooting

### "Tool not found" error

Make sure Claude Desktop is restarted after adding the config.

### Slow responses

[AgentDomainService](https://agentdomainservice.com) caches results. First queries may take 1-2 seconds; subsequent queries for the same domain are faster.

### Rate limiting

The service is free and doesn't require authentication. We ask for reasonable use. If you hit rate limits, results will show `status: unknown`.

## Contributing

Issues and PRs welcome! This project is open source.

## License

MIT

---

Built with [AgentDomainService.com](https://agentdomainservice.com) - Domain availability checking for AI agents.
