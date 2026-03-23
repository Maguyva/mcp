# @maguyva/mcp

Give your AI coding agent deep understanding of your codebase. [Maguyva](https://maguyva.ai) provides semantic, structural, and text search across your entire codebase -- so your agent finds exactly what it needs, fast.

This package connects Claude Code (or any MCP-compatible client) to the Maguyva platform.

## Setup

Get your API key at [maguyva.ai](https://maguyva.ai).

### CLI (recommended)

```bash
claude mcp add maguyva -e MAGUYVA_API_KEY=your-api-key -- npx -y @maguyva/mcp
```

### Manual

Add to your project's `.mcp.json` (or `~/.claude.json` for global access):

```json
{
  "mcpServers": {
    "maguyva": {
      "command": "npx",
      "args": ["-y", "@maguyva/mcp"],
      "env": {
        "MAGUYVA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## License

MIT
