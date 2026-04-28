import type { FastifyInstance } from "fastify";
import { getRequestUser } from "../auth/auth.types";
import { AgentRunsService } from "./agent-runs.service";

export interface RegisterAgentRunsControllerOptions {
  agentRunsService?: AgentRunsService;
}

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
};
