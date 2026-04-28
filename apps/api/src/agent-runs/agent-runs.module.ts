import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerAgentRunsController, type RegisterAgentRunsControllerOptions } from "./agent-runs.controller";

export const createAgentRunsModule = (
  options: RegisterAgentRunsControllerOptions = {},
): FastifyPluginAsync => {
  return async (app: FastifyInstance): Promise<void> => {
    await registerAgentRunsController(app, options);
  };
};

export const registerAgentRunsModule = async (
  app: FastifyInstance,
  options: RegisterAgentRunsControllerOptions = {},
): Promise<void> => {
  await app.register(createAgentRunsModule(options));
};
