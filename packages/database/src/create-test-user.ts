import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// __dirname = packages/database/src  →  ../../../ = repo root
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../../.env");
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_]+)="?([^"]*)"?\s*$/);
  if (m?.[1] && m[2]) process.env[m[1]] = m[2];
}

const prisma = new PrismaClient();

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", name: "Test User" },
  });
  await prisma.$disconnect();

  const now = Math.floor(Date.now() / 1000);
  const payload = { userId: user.id, email: user.email, tokenKind: "access", iat: now, exp: now + 86400 * 30 };
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const h = enc({ alg: "HS256", typ: "JWT" });
  const b = enc(payload);
  const sig = createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url");
  const token = `${h}.${b}.${sig}`;

  console.log("\n✅ Test user:");
  console.log("   Email  :", user.email);
  console.log("   ID     :", user.id);
  console.log("\n🔑 Token (30 days):");
  console.log(token);
  console.log("\nTest it:");
  console.log(`  curl http://localhost:3001/health`);
  console.log(`  curl -H "Authorization: Bearer ${token}" http://localhost:3001/job-targets/nonexistent\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
