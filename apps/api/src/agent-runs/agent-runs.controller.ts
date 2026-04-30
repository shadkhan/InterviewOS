import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRequestUser } from "../auth/auth.types";
import { AgentRunsService } from "./agent-runs.service";

export interface RegisterAgentRunsControllerOptions {
  agentRunsService?: AgentRunsService;
}

const RetryNodeSchema = z.object({
  node: z.enum([
    "resumeParser",
    "jdAnalysisStep",
    "companyResearchStep",
    "salaryResearch",
    "painPoint",
    "interviewQuestion",
    "answerCoach",
    "prepPlanStep",
  ]),
  provider: z.enum(["gemini", "groq", "anthropic", "openai"]).optional(),
});

export const registerAgentRunsController = async (
  app: FastifyInstance,
  options: RegisterAgentRunsControllerOptions = {},
): Promise<void> => {
  const agentRunsService = options.agentRunsService ?? new AgentRunsService();

  app.get<{ Params: { id: string } }>("/agent-runs/:id", async (request) => {
    const user = getRequestUser(request);

    return agentRunsService.getRunForUser(user.userId, request.params.id);
  });

  app.get<{ Params: { id: string } }>("/agent-runs/:id/errors", async (request) => {
    const user = getRequestUser(request);

    return agentRunsService.getErrorsForUser(user.userId, request.params.id);
  });

  app.post<{ Params: { id: string } }>("/agent-runs/:id/retry-node", async (request, reply) => {
    const user = getRequestUser(request);
    const body = RetryNodeSchema.parse(request.body);
    const result = await agentRunsService.retryNode(user.userId, request.params.id, body.node, body.provider);
    return reply.status(200).send(result);
  });
};
