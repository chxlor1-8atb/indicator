import * as fs from "fs";
import * as path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const l of lines) {
      const [k, ...v] = l.trim().split("=");
      if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
} catch {}

async function testAdaptive() {
  const { sql, getAdaptiveWeights } = await import("../lib/db");
  if (sql) {
    await sql.query(`DELETE FROM market_adaptive_params WHERE symbol IN ('XAUUSD', 'USOIL');`);
  }

  console.log("\n--- Testing Self-Evolved Adaptive Weights for XAUUSD ---");
  const goldWeights = await getAdaptiveWeights("XAUUSD");
  console.log("XAUUSD Self-Evolved Config:", goldWeights);

  console.log("\n--- Testing Self-Evolved Adaptive Weights for USOIL ---");
  const oilWeights = await getAdaptiveWeights("USOIL");
  console.log("USOIL Self-Evolved Config:", oilWeights);
}

testAdaptive().catch(console.error);
