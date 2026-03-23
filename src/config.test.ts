import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalArgv = process.argv;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.argv = ["node", "maguyva-mcp"];
    delete process.env.MAGUYVA_API_KEY;
    delete process.env.MAGUYVA_SERVER_URL;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it("reads API key from environment variable", () => {
    process.env.MAGUYVA_API_KEY = "test-key";
    const config = loadConfig();
    assert.equal(config.apiKey, "test-key");
  });

  it("reads API key from CLI argument", () => {
    process.argv.push("--api-key=cli-key");
    const config = loadConfig();
    assert.equal(config.apiKey, "cli-key");
  });

  it("CLI argument overrides environment variable", () => {
    process.env.MAGUYVA_API_KEY = "env-key";
    process.argv.push("--api-key=cli-key");
    const config = loadConfig();
    assert.equal(config.apiKey, "cli-key");
  });

  it("uses default server URL", () => {
    process.env.MAGUYVA_API_KEY = "test-key";
    const config = loadConfig();
    assert.equal(config.serverUrl, "https://maguyva.tools/mcp");
  });

  it("reads server URL from environment variable", () => {
    process.env.MAGUYVA_API_KEY = "test-key";
    process.env.MAGUYVA_SERVER_URL = "https://custom.example.com/mcp";
    const config = loadConfig();
    assert.equal(config.serverUrl, "https://custom.example.com/mcp");
  });

  it("reads server URL from CLI argument", () => {
    process.env.MAGUYVA_API_KEY = "test-key";
    process.argv.push("--server=https://cli.example.com/mcp");
    const config = loadConfig();
    assert.equal(config.serverUrl, "https://cli.example.com/mcp");
  });

  it("strips trailing slashes from server URL", () => {
    process.env.MAGUYVA_API_KEY = "test-key";
    process.env.MAGUYVA_SERVER_URL = "https://example.com/mcp///";
    const config = loadConfig();
    assert.equal(config.serverUrl, "https://example.com/mcp");
  });

  it("exits when API key is missing", () => {
    const writes: string[] = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = ((msg: string) => {
      writes.push(msg);
      return true;
    }) as typeof process.stderr.write;

    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as typeof process.exit;

    try {
      loadConfig();
    } catch {
      // Expected
    }

    process.stderr.write = originalWrite;
    process.exit = originalExit;

    assert.equal(exitCode, 1);
    assert.ok(writes.some((w) => w.includes("MAGUYVA_API_KEY")));
  });
});
