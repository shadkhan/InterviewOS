import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

// Load .env from repo root
const envPath = resolve(import.meta.dirname ?? __dirname, "../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (match && match[1] && match[2]) process.env[match[1]] = match[2];
}

const prisma = new PrismaClient();

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not found in .env");

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", name: "Test User" },
  });

  await prisma.$disconnect();

  const now = Math.floor(Date.now() / 1000);
  const payload = { userId: user.id, email: user.email, tokenKind: "access", iat: now, exp: now + 86400 * 30 };

  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  const token = `${header}.${body}.${sig}`;

  console.log("\n✅ Test user ready:");
  console.log("   Email   :", user.email);
  console.log("   User ID :", user.id);
  console.log("\n🔑 Bearer token (valid 30 days):");
  console.log(token);
  console.log("\nExample curl:");
  console.log(`  curl -H "Authorization: Bearer ${token}" http://localhost:3001/health\n`);
}

main().catch(console.error);
