import "dotenv/config";
import { createInterviewPrepWorker } from "@interviewos/agents";
import { buildServer } from "./server";

const worker = createInterviewPrepWorker();
worker.on("error", (err) => console.error("[worker] error", err));

const app = await buildServer();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
