/**
 * Configuration from environment variables and CLI arguments.
 */

export interface Config {
  apiKey: string;
  serverUrl: string;
}

export function loadConfig(): Config {
  const args = process.argv.slice(2);

  let serverUrl = process.env.MAGUYVA_SERVER_URL ?? "https://maguyva.tools/mcp";
  let apiKey = process.env.MAGUYVA_API_KEY ?? "";

  for (const arg of args) {
    if (arg.startsWith("--server=")) {
      serverUrl = arg.slice("--server=".length);
    } else if (arg.startsWith("--api-key=")) {
      apiKey = arg.slice("--api-key=".length);
    }
  }

  if (!apiKey) {
    process.stderr.write(
      "[maguyva-mcp] MAGUYVA_API_KEY is required. Set it as an environment variable or pass --api-key=KEY\n",
    );
    process.exit(1);
  }

  // Ensure URL doesn't have trailing slash
  serverUrl = serverUrl.replace(/\/+$/, "");

  return { apiKey, serverUrl };
}
