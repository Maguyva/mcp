# Installing Maguyva (for AI agents)

Maguyva is a hosted MCP server that gives coding agents grounded codebase context:
semantic, structural (AST), graph, and full-text search, symbol lookup, dependency
analysis, and one-call task context across 279+ languages.

## Prerequisite: API key

Create a free account at https://maguyva.ai, connect a GitHub repo, and create an
API key (the API Keys page in the dashboard). The free tier includes 3 repos /
50K indexed lines.

## Option A — Claude Code / OpenAI Codex: the plugin

Do not configure the MCP server by hand — install the plugin from
[maguyva/agent-plugins](https://github.com/maguyva/agent-plugins). It bundles the
HTTP connection, the usage skill, and session-start guidance.

Claude Code:

```
/plugin marketplace add maguyva/agent-plugins
/plugin install maguyva@maguyva
export MAGUYVA_API_KEY='your-api-key'
```

Codex: `codex plugin marketplace add maguyva/agent-plugins`, then install
"maguyva" from `/plugins`.

## Option B — remote server (Streamable HTTP, no local process)

Preferred for every client that supports remote MCP servers with a custom auth
header (Cursor, VS Code, Windsurf, Zed, OpenCode, Gemini CLI, Roo Code, …):

- URL: `https://maguyva.tools/mcp`
- Header: `Authorization: Bearer <your-api-key>` (or `X-API-Key: <your-api-key>`)

Config shape varies by client — see https://maguyva.ai/docs/installation for a
verified copy-pasteable snippet per client.

## Option C — npm package (stdio bridge)

For clients that speak stdio but cannot connect to a remote HTTP server directly
(Cline, Claude Desktop, Goose, …). Requires Node.js. Add to your client's MCP
config (Cline `cline_mcp_settings.json`, project `.mcp.json`, etc.):

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

## Install the skill

Whatever the transport, install the Maguyva usage skill so the agent knows when
and how to reach for the tools (Claude Code and Codex plugin users already have
it — the plugin bundles it):

```
curl -fsSL https://maguyva.tools/install-skill.sh | sh -s -- --client <client>
```

`--client` accepts `claude`, `opencode`, `codex`, `cursor`, `vscode`, `gemini`,
`cline`, or `agents`. See [maguyva/agent-plugins](https://github.com/maguyva/agent-plugins)
for a no-pipe manual install.

## Verify

After connecting, the client should list Maguyva's 11 tools (intelligent_search,
semantic_search, structural_search, text_pattern_search, dependency_search,
analyze_dependencies, find_symbol, get_task_context, get_file,
repository_context, ask_maguyva). Ask a question about an indexed repo — answers
come back grounded with file paths and line numbers.
