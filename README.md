# @maguyva/mcp

[Maguyva](https://maguyva.ai) is a code-intelligence MCP server: semantic, structural, graph, and text search across your indexed repositories, so your agent finds exactly what it needs, fast.

Maguyva is a **remote streamable-HTTP MCP server** at `https://maguyva.tools/mcp`. Most modern clients connect to it directly — no local process needed. This package is a stdio bridge for the clients that can't.

**Pick your path:**

| Your client | Use |
|---|---|
| Claude Code or OpenAI Codex | The [maguyva/agent-plugins](https://github.com/maguyva/agent-plugins) plugin — bundles the connection, the usage skill, and session-start guidance |
| Supports remote MCP with an `Authorization` header (Cursor, VS Code, Windsurf, Zed, OpenCode, Gemini CLI, …) | Direct HTTP config — see below |
| stdio-only MCP client | This package |

Whichever path you take, get your API key from the [maguyva.ai](https://maguyva.ai) dashboard, and install the usage skill (see [Install the skill](#install-the-skill)) — the skill is what teaches your agent when and how to reach for Maguyva's tools.

## Claude Code / Codex

Install the plugin from [maguyva/agent-plugins](https://github.com/maguyva/agent-plugins):

```
/plugin marketplace add maguyva/agent-plugins
/plugin install maguyva@maguyva
export MAGUYVA_API_KEY='<your key>'
```

The plugin connects over HTTP directly and includes the skill and hooks — nothing else to set up.

## Direct HTTP (preferred for everything else)

If your client supports remote MCP servers with a custom `Authorization` header, connect directly:

```json
{
  "mcpServers": {
    "maguyva": {
      "url": "https://maguyva.tools/mcp",
      "headers": {
        "Authorization": "Bearer ${MAGUYVA_API_KEY}"
      }
    }
  }
}
```

Exact config shape varies by client (VS Code uses `servers` + `type: "http"`, Gemini CLI uses `httpUrl`, Codex uses TOML, …). The [installation docs](https://maguyva.ai/docs/installation) have a verified copy-pasteable snippet for each client.

## This package: the stdio bridge

Only needed when your client speaks stdio but cannot connect to a remote HTTP server directly. It runs locally and forwards between your client's stdio transport and `https://maguyva.tools/mcp`, reconnecting to the remote without dropping the local pipe.

Requires Node.js. Add to your client's MCP config:

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

Options: pass `--api-key=KEY` instead of the env var, and `--server=URL` (or `MAGUYVA_SERVER_URL`) to override the endpoint.

## Install the skill

Whatever the transport, install the Maguyva skill so your agent knows how to use the tools well — tool selection, when local grep beats indexed search, and troubleshooting:

```
curl -fsSL https://maguyva.tools/install-skill.sh | sh -s -- --client <client>
```

`--client` accepts `claude`, `opencode`, `codex`, `cursor`, `vscode`, `gemini`, `cline`, or `agents` (the generic `~/.agents/skills` path). The skill is authored to the open [Agent Skills standard](https://agentskills.io) and lives in [maguyva/agent-plugins](https://github.com/maguyva/agent-plugins). Claude Code and Codex plugin users already have it — the plugin bundles it.

## License

MIT
