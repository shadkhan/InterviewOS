import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createInterviewPrepWorker } from "@interviewos/agents";
import { buildServer } from "./server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(repoRoot, ".env") });

if (!process.env.CALL_LOG_DIR) {
  process.env.CALL_LOG_DIR = path.resolve(repoRoot, "logs");
}

const worker = createInterviewPrepWorker();
worker.on("error", (err) => console.error("[worker] error", err));

const app = await buildServer();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
